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
            
            // Clear previous error message
            const errorDiv = document.getElementById('login-error');
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.classList.add('d-none');
            }
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Show a loading indicator or disable the button
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
            
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
            .then(response => {
                // Check if response is OK
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                // Check the content type
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Expected JSON response but got ${contentType}`);
                }
                
                return response.json();
            })
            .then(data => {
                if (data.token) {
                    localStorage.setItem('prs_token', data.token);
                    window.location.href = 'index.html';
                } else {
                    errorDiv.textContent = data.error || 'Login failed. Please try again.';
                    errorDiv.classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                errorDiv.textContent = 'An error occurred: ' + error.message;
                errorDiv.classList.remove('d-none');
            })
            .finally(() => {
                // Re-enable the button
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
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

// Check user role and restrict access if needed
function checkUserRole() {
    const token = localStorage.getItem('prs_token');
    
    fetch('api.php/users', {
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
    .then(users => {
        // Find the current user (based on the token)
        const currentUser = users.find(user => {
            // This is a simplified version. In a real app, you'd need to decode the JWT
            // For now, we'll just check if this is the first user returned
            return user.user_id === 1; // Assuming the first user is the authenticated one
        });
        
        // For supply management, only Government Officials and Merchants have access
        if (window.location.href.includes('supply-management.html') && 
            !(currentUser.role_name === 'Government Official' || currentUser.role_name === 'Merchant')) {
            alert('You do not have permission to access Supply Management.');
            window.location.href = 'index.html';
        }
        
        // For health facilities, only Government Officials have full access
        if (window.location.href.includes('health-facilities.html') && 
            !(currentUser.role_name === 'Government Official')) {
            // For non-Government Officials, hide add/edit/delete buttons
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error checking user role:', error);
        }
    });
}

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
            
            // Get current user's name
            const userNameElement = document.getElementById('userName');
            if (userNameElement && userData.length > 0) {
                // Using the first user for demo purposes
                userNameElement.textContent = userData[0].full_name;
            }
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
    
    // Fetch health facilities data
    fetch('api.php/health-facilities', {
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
    .then(facilitiesData => {
        // Update facility count
        document.getElementById('facilityCount').textContent = facilitiesData.length;
        
        // Prepare data for facility type chart
        const facilityTypes = {};
        
        facilitiesData.forEach(facility => {
            if (facilityTypes[facility.facility_type]) {
                facilityTypes[facility.facility_type]++;
            } else {
                facilityTypes[facility.facility_type] = 1;
            }
        });
        
        // Create Pie Chart - Facility Types
        const facilityTypeLabels = Object.keys(facilityTypes);
        const facilityTypeCounts = Object.values(facilityTypes);
        
        new Chart(document.getElementById('facilityTypeChart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: facilityTypeLabels,
                datasets: [{
                    label: 'Facility Types',
                    data: facilityTypeCounts,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading facilities data:', error);
        }
    });
    
    // Fetch supply inventory data
    fetch('api.php/supply-inventory', {
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
    .then(supplyData => {
        // Update supply count
        document.getElementById('supplyCount').textContent = supplyData.length;
        
        // Prepare data for supply type chart
        const supplyTypes = {};
        let totalQuantity = 0;
        
        supplyData.forEach(item => {
            if (supplyTypes[item.item_type]) {
                supplyTypes[item.item_type] += item.quantity;
            } else {
                supplyTypes[item.item_type] = item.quantity;
            }
            totalQuantity += item.quantity;
        });
        
        // Create Bar Chart - Supply Types
        const supplyTypeLabels = Object.keys(supplyTypes).map(type => {
            switch(type) {
                case 'vaccine': return 'Vaccines';
                case 'medical_supply': return 'Medical Supplies';
                case 'ppe': return 'PPE';
                case 'equipment': return 'Equipment';
                default: return type;
            }
        });
        const supplyTypeCounts = Object.values(supplyTypes);
        
        new Chart(document.getElementById('supplyTypeChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: supplyTypeLabels,
                datasets: [{
                    label: 'Quantity in Stock',
                    data: supplyTypeCounts,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading supply data:', error);
        }
    });
}