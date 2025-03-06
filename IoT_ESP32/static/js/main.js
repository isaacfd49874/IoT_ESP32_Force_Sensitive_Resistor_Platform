// Add your JavaScript code here
console.log('Website loaded successfully!');

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('ipModal');
    const addIpBtn = document.getElementById('addIpBtn');
    const closeBtn = document.getElementsByClassName('close')[0];
    const submitIpBtn = document.getElementById('submitIp');
    const ipInput = document.getElementById('ipInput');
    const dashboards = document.querySelectorAll('.dashboard-item');
    let activeIpCount = 0;

    // Load existing dashboard data
    fetch('/api/dashboard/data')
        .then(response => response.json())
        .then(data => {
            updateActiveIpCount(Object.keys(data.dashboards).length);
        });

    // Modal controls
    addIpBtn.onclick = () => modal.style.display = "block";
    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }

    // Submit IP
    submitIpBtn.onclick = function() {
        const ip = document.getElementById('ipInput').value.trim();
        const emptyDashboard = Array.from(dashboards).find(
            dashboard => dashboard.querySelector('.ip-display').textContent === 'Empty'
        );
        
        if (!emptyDashboard) {
            alert('No empty dashboards available!');
            return;
        }

        const dashboardId = emptyDashboard.dataset.id;
        const ipDisplay = emptyDashboard.querySelector('.ip-display');
        ipDisplay.textContent = 'Connecting...';
        
        fetch(`/api/dashboard/${dashboardId}/${ip}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                modal.style.display = 'none';
                document.getElementById('ipInput').value = '';
                alert('IP added successfully! Please wait while connecting to the device...');
                window.location.href = `/view/${ip}/${dashboardId}`;
            } else {
                ipDisplay.textContent = 'Empty';
                alert(data.message || 'This IP is already in use. Please try another IP.');
            }
        })
        .catch(() => {
            ipDisplay.textContent = 'Empty';
            alert('Please wait, now handling the IP connection...');
        });
    }

    // Dashboard click handler
    dashboards.forEach(dashboard => {
        dashboard.addEventListener('click', function() {
            const ip = this.querySelector('.ip-display').textContent;
            const id = this.dataset.id;
            if (ip !== 'Empty') {
                window.location.href = `/view/${ip}/${id}`;
            }
        });
    });

    // Delete button handler
    document.querySelectorAll('.delete-ip-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const dashboard = this.closest('.dashboard-item');
            const dashboardId = dashboard.dataset.id;
            
            if (confirm('Are you sure you want to delete this IP?')) {
                const ipDisplay = dashboard.querySelector('.ip-display');
                ipDisplay.textContent = 'Deleting...';
                this.style.display = 'none';

                fetch(`/api/dashboard/${dashboardId}`, {
                    method: 'DELETE'
                })
                .then(() => {
                    ipDisplay.textContent = 'Empty';
                    alert('IP deleted successfully!');
                })
                .catch(() => {
                    ipDisplay.textContent = 'Empty';
                    alert('Please wait, deleting the IP...');
                });
            }
        });
    });

    function isValidIP(ip) {
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipPattern.test(ip)) return false;
        const parts = ip.split('.');
        return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
    }

    function findEmptyDashboard() {
        return Array.from(dashboards).find(
            dashboard => dashboard.querySelector('.ip-display').textContent === 'Empty'
        );
    }

    function updateDashboard(dashboard, ip) {
        dashboard.querySelector('.ip-display').textContent = ip;
        dashboard.querySelector('.delete-ip-btn').style.display = 'inline';
    }

    function updateActiveIpCount(count) {
        document.getElementById('activeIpCount').textContent = count;
    }

    // Add simple fade-in animation
    dashboards.forEach((dashboard, index) => {
        dashboard.style.animation = `fadeIn 0.5s ease-out ${index * 0.1}s`;
    });
});

// Simple fade-in animation
document.head.insertAdjacentHTML('beforeend', `
    <style>
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    </style>
`);

// Empty file to prevent 404 error
// We can add functionality here later if needed 