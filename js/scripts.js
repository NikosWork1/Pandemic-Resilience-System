// Main JavaScript file for Pandemic Resilience System

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('prs_token');
    if (!token && !window.location.href.includes('login.html') && !window.location.href.includes('register.html')) {
        window.location.href = 'login.html';
    } else if (token && (window.location.href.includes('login.html') || window.location.href.includes('register.html'))) {
        window.location.href = 'index.html';
    }
}

// Run auth check when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();

    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            fetch('api.php/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.token) {
                    localStorage.setItem('prs_token', data.token);
                    window.location.href = 'index.html';
                } else {
                    const errorDiv = document.getElementById('login-error');
                    errorDiv.textContent = data.error || 'Login failed. Please try again.';
                    errorDiv.classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                const errorDiv = document.getElementById('login-error');
                errorDiv.textContent = 'An error occurred. Please try again.';
                errorDiv.classList.remove('d-none');
            });
        });
    }

    // Handle registration form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const full_name = document.getElementById('full_name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const role_id = document.getElementById('role_id').value;
            
            fetch('api.php/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    full_name: full_name,
                    email: email,
                    phone: phone,
                    password: password,
                    role_id: parseInt(role_id)
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    const successDiv = document.getElementById('register-success');
                    successDiv.textContent = 'Registration successful! Redirecting to login...';
                    successDiv.classList.remove('d-none');
                    
                    // Hide any previous error
                    const errorDiv = document.getElementById('register-error');
                    errorDiv.classList.add('d-none');
                    
                    // Redirect to login after 2 seconds
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    const errorDiv = document.getElementById('register-error');
                    errorDiv.textContent = data.error || 'Registration failed. Please try again.';
                    errorDiv.classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                const errorDiv = document.getElementById('register-error');
                errorDiv.textContent = 'An error occurred. Please try again.';
                errorDiv.classList.remove('d-none');
            });
        });
    }

    // Handle dashboard page
    if (window.location.href.includes('index.html') || window.location.pathname === '/prs/' || window.location.pathname === '/prs') {
        loadDashboardData();
    }

    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('prs_token');
            window.location.href = 'login.html';
        });
    }
});

// Load dashboard data and charts
function loadDashboardData() {
    const token = localStorage.getItem('prs_token');
    
    // Fetch vaccination data for charts
    fetch('api.php/get-vaccination-data', {
        headers: {
            'Authorization': token
        }
    })
    .then(response => {
        if (response.status === 401) {
            localStorage.removeItem('prs_token');
            window.location.href = 'login.html';
            throw new Error('Unauthorized');
        }
        return response.json();
    })
    .then(data => {
        // Update dashboard metrics
        document.getElementById('vaccinationCount').textContent = data.length;
        
        // Prepare data for charts
        const users = {};
        const vaccineTypes = {};
        const dateMap = {};
        
        data.forEach(record => {
            // Count by user
            if (users[record.full_name]) {
                users[record.full_name]++;
            } else {
                users[record.full_name] = 1;
            }
            
            // Count by vaccine type
            if (vaccineTypes[record.vaccine_name]) {
                vaccineTypes[record.vaccine_name]++;
            } else {
                vaccineTypes[record.vaccine_name] = 1;
            }
            
            // Group by date
            const date = new Date(record.date_administered).toLocaleDateString();
            if (dateMap[date]) {
                dateMap[date]++;
            } else {
                dateMap[date] = 1;
            }
        });
        
        // Create Bar Chart - Vaccination by User
        const userLabels = Object.keys(users);
        const userCounts = Object.values(users);
        
        new Chart(document.getElementById('barChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: userLabels,
                datasets: [{
                    label: 'Vaccinations per User',
                    data: userCounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        
        // Create Pie Chart - Vaccine Types
        const vaccineLabels = Object.keys(vaccineTypes);
        const vaccineCounts = Object.values(vaccineTypes);
        
        new Chart(document.getElementById('pieChart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: vaccineLabels,
                datasets: [{
                    label: 'Vaccine Types',
                    data: vaccineCounts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });
        
        // Create Line Chart - Vaccinations Over Time
        const dateLabels = Object.keys(dateMap).sort((a, b) => new Date(a) - new Date(b));
        const dateCounts = dateLabels.map(date => dateMap[date]);
        
        new Chart(document.getElementById('lineChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: dateLabels,
                datasets: [{
                    label: 'Vaccinations Over Time',
                    data: dateCounts,
                    fill: false,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        
        // Fetch user data
        fetch('api.php/users', {
            headers: {
                'Authorization': token
            }
        })
        .then(response => response.json())
        .then(userData => {
            // Update user count
            document.getElementById('userCount').textContent = userData.length;
        })
        .catch(error => console.error('Error fetching user data:', error));
        
        // For document count, we're just showing a sample count here
        // In a real system, you'd fetch from the documents API endpoint
        document.getElementById('documentCount').textContent = Math.floor(Math.random() * 10);
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading dashboard data:', error);
        }
    });
}