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

    // Open modal
    addIpBtn.onclick = function() {
        modal.style.display = "block";
    }

    // Close modal
    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Submit IP
    submitIpBtn.onclick = function() {
        const ip = ipInput.value.trim();
        if (isValidIP(ip)) {
            const emptyDashboard = findEmptyDashboard();
            if (emptyDashboard) {
                const dashboardId = emptyDashboard.dataset.id;
                
                // Send update to server
                fetch(`/api/dashboard/${dashboardId}/${ip}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        updateDashboard(emptyDashboard, ip);
                        modal.style.display = "none";
                        ipInput.value = '';
                        activeIpCount++;
                        updateActiveIpCount(activeIpCount);
                    } else {
                        alert(data.message || 'IP already exists in another dashboard');
                    }
                })
                .catch(error => {
                    alert('Error updating dashboard');
                });
            } else {
                alert('No empty dashboards available!');
            }
        } else {
            alert('Please enter a valid IP address!');
        }
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

    // Add delete button handler
    document.querySelectorAll('.delete-ip-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent dashboard click event
            const dashboard = this.closest('.dashboard-item');
            const dashboardId = dashboard.dataset.id;
            
            if (confirm('Are you sure you want to delete this IP?')) {
                fetch(`/api/dashboard/${dashboardId}`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        dashboard.querySelector('.ip-display').textContent = 'Empty';
                        this.style.display = 'none';
                        activeIpCount--;
                        updateActiveIpCount(activeIpCount);
                    }
                })
                .catch(error => {
                    alert('Error deleting IP');
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

    // Add rolling animation
    function addRollingAnimation() {
        dashboards.forEach((dashboard, index) => {
            dashboard.style.animation = `rollIn 0.5s ease-out ${index * 0.1}s`;
        });
    }

    addRollingAnimation();
});

// Add this CSS animation to your style.css
document.head.insertAdjacentHTML('beforeend', `
    <style>
    @keyframes rollIn {
        from {
            opacity: 0;
            transform: translateY(20px) rotate(-5deg);
        }
        to {
            opacity: 1;
            transform: translateY(0) rotate(0);
        }
    }
    </style>
`);

// Empty file to prevent 404 error
// We can add functionality here later if needed 