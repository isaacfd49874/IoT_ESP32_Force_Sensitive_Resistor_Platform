from flask import Flask, render_template, jsonify
import json
import os
import threading
import urllib.request
import time

app = Flask(__name__)

DATA_FILE = 'static/data/dashboard_data.json'
DATA_FOLDER = 'static/data'

data_collections = {}  # Dictionary to store data lists for each IP
data_threads = {}     # Dictionary to store threads for each IP
data_locks = {}       # Dictionary to store locks for each IP

def load_dashboard_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {"dashboards": {}}

def save_dashboard_data(data):
    # Ensure directory exists
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def save_ip_data(ip, data_list):
    filename = os.path.join(DATA_FOLDER, f'{ip.replace(".", "_")}_data.json')
    with open(filename, 'w') as f:
        json.dump(data_list, f, indent=4)

def load_ip_data(ip):
    filename = os.path.join(DATA_FOLDER, f'{ip.replace(".", "_")}_data.json')
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            return json.load(f)
    return []

def collect_data(ip_address):
    esp_url = f"http://{ip_address}/pressure"
    data_list = data_collections.get(ip_address, [])
    data_lock = data_locks.get(ip_address)

    try:
        while True:
            try:
                with urllib.request.urlopen(esp_url) as response:
                    data = response.read()
                    json_data = json.loads(data)

                    if json_data.get("pressure") is not None:
                        with data_lock:
                            data_list.append({
                                "timestamp": json_data["timestamp"],
                                "pressure": json_data["pressure"]
                            })
                            if len(data_list) > 100:
                                data_list.pop(0)
                            # Save data to file
                            save_ip_data(ip_address, data_list)
                            # Update the global data_collections dictionary
                            data_collections[ip_address] = data_list
                        print(f"Fetched data from {ip_address}: {json_data}")

                    time.sleep(1)
            except Exception as e:
                print(f"Error fetching data from {ip_address}: {e}")
                time.sleep(5)

    except Exception as e:
        print(f"Fatal error in data collection for {ip_address}: {e}")

@app.route('/')
def home():
    dashboard_data = load_dashboard_data()
    return render_template('home.html', dashboard_data=dashboard_data['dashboards'])

@app.route('/view/<ip>/<dashboard_id>')
def view_dashboard(ip, dashboard_id):
    ip_data = load_ip_data(ip)
    return render_template('dashboard_view.html', ip=ip, dashboard_id=dashboard_id, data=ip_data)

@app.route('/api/dashboard/data', methods=['GET'])
def get_dashboard_data():
    return jsonify(load_dashboard_data())

@app.route('/api/dashboard/<dashboard_id>/<ip>', methods=['POST'])
def update_dashboard(dashboard_id, ip):
    dashboard_data = load_dashboard_data()
    
    # Check if IP already exists
    for dash_id, dash_ip in dashboard_data['dashboards'].items():
        if dash_ip == ip:
            return jsonify({"success": False, "message": "IP already exists"}), 400
    
    # Start data collection for new IP immediately
    if ip not in data_collections:
        data_collections[ip] = []
        data_locks[ip] = threading.Lock()
        data_thread = threading.Thread(target=collect_data, args=(ip,), daemon=True)
        data_threads[ip] = data_thread
        data_thread.start()
        # Wait a short moment to ensure first data collection
        time.sleep(1)
    
    dashboard_data['dashboards'][dashboard_id] = ip
    save_dashboard_data(dashboard_data)
    return jsonify({"success": True})

@app.route('/api/dashboard/<dashboard_id>', methods=['DELETE'])
def delete_dashboard(dashboard_id):
    dashboard_data = load_dashboard_data()
    
    if dashboard_id in dashboard_data['dashboards']:
        del dashboard_data['dashboards'][dashboard_id]
        save_dashboard_data(dashboard_data)
        return jsonify({"success": True})
    
    return jsonify({"success": False, "message": "Dashboard not found"}), 404

@app.route('/api/data/<ip>', methods=['GET'])
def get_ip_data(ip):
    try:
        # Convert IP to filename format (replace dots with underscores)
        filename = f'static/data/{ip.replace(".", "_")}_data.json'
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                return jsonify(json.load(f))
        return jsonify([])
    except Exception as e:
        print(f"Error reading data file: {e}")
        return jsonify([])

@app.route('/api/historical-data/<ip>', methods=['GET'])
def get_historical_data(ip):
    try:
        # Convert IP to filename format (replace dots with underscores)
        filename = f'static/data/{ip.replace(".", "_")}_data.json'
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                data = json.load(f)
                # Sort data by timestamp if needed
                data.sort(key=lambda x: x['timestamp'])
                return jsonify(data)
        return jsonify([])
    except Exception as e:
        print(f"Error reading historical data file: {e}")
        return jsonify([])

if __name__ == '__main__':
    # Create data directory if it doesn't exist
    os.makedirs(DATA_FOLDER, exist_ok=True)
    
    # Load existing dashboards and start data collection
    dashboard_data = load_dashboard_data()
    for dashboard_id, ip in dashboard_data['dashboards'].items():
        if ip not in data_collections:
            data_collections[ip] = load_ip_data(ip)  # Load existing data
            data_locks[ip] = threading.Lock()
            data_thread = threading.Thread(target=collect_data, args=(ip,), daemon=True)
            data_threads[ip] = data_thread
            data_thread.start()
    
    app.run(debug=True, use_reloader=False) 