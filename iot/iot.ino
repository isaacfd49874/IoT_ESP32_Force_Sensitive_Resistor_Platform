#include <WiFi.h> // Use <ESP8266WiFi.h> for ESP8266
#include <WebServer.h> // Use <ESP8266WebServer.h> for ESP8266
#include <time.h> // For time functions

const char* ssid = "IoT";
const char* password = "eduhk+IoT+2018";

WebServer server(80); // Create a web server on port 80

// Function to get the current time as a string
String getCurrentTime() {
    String timeStr = "";
    time_t now = time(nullptr);
    struct tm *timeinfo = localtime(&now);
    char buffer[30];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", timeinfo);
    timeStr = String(buffer);
    return timeStr;
}

void connectToWiFi() {
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }
    Serial.println("Connected to WiFi");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
}

void setup() {
    Serial.begin(115200);
    connectToWiFi();

    // Initialize NTP for timezone
    configTime(28800, 0, "pool.ntp.org", "time.nist.gov"); // Set timezone offset and NTP servers

    server.on("/", handleRoot); // Define the root page
    server.on("/pressure", handlePressure); // Define the pressure endpoint
    server.begin(); // Start the server
    Serial.println("HTTP server started");
}

void handleRoot() {
    String html = "<html><head><title>ESP Pressure</title>";
    html += "<script>function fetchPressure() {"
            "fetch('/pressure').then(response => response.json()).then(data => {"
            "if (data.pressure !== null) {"
            "document.getElementById('pressure').innerHTML = data.pressure;"
            "document.getElementById('timestamp').innerHTML = data.timestamp;"
            "var row = document.createElement('tr');"
            "var cell1 = document.createElement('td');"
            "var cell2 = document.createElement('td');"
            "cell1.innerHTML = data.timestamp;"
            "cell2.innerHTML = data.pressure;"
            "row.appendChild(cell1);"
            "row.appendChild(cell2);"
            "document.getElementById('data').appendChild(row);"
            "}});"
            "}"
            "setInterval(fetchPressure, 1000);</script></head><body>";
    html += "<h1>Hello from ESP!</h1>";
    html += "<p>Pressure: <span id='pressure'>Fetching...</span></p>";
    html += "<p>Last Updated: <span id='timestamp'>Fetching...</span></p>";
    html += "<table border='1'><tr><th>Timestamp</th><th>Pressure</th></tr><tbody id='data'></tbody></table>";
    html += "</body></html>";
    server.send(200, "text/html", html); // Send the HTML response
}

void handlePressure() {
    int pressure = analogRead(A0); // Read the analog value from A0
    String timestamp = getCurrentTime(); // Get the current time

    // Create a JSON response
    String jsonResponse = "{\"pressure\":" + String(pressure) + ",\"timestamp\":\"" + timestamp + "\"}";
    server.send(200, "application/json", jsonResponse); // Send as JSON
}

void loop() {
    server.handleClient(); // Handle incoming client requests
}