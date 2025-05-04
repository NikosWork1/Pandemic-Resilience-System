// dashboard-forms.js - Handles quick vaccination record and appointment forms

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Initialize the quick vaccination form
    initQuickVaccinationForm();
    
    // Initialize the quick appointment form
    initQuickAppointmentForm();
    
    // Load available health facilities for the appointment form
    loadHealthFacilities();
});

// Initialize Quick Vaccination Form
function initQuickVaccinationForm() {
    const quickVaccinationForm = document.getElementById('quickVaccinationForm');
    
    if (quickVaccinationForm) {
        // Check if user has permission to add vaccination records
        const token = localStorage.getItem('prs_token');
        const userId = getUserIdFromToken(token);
        
        // Fetch user role before initializing form
        fetch(`api.php/users/${userId}`, {
            headers: {
                'Authorization': token
            }
        })
        .then(response => response.json())
        .then(userData => {
            // Only allow Government Officials (role_id=1) and Doctors/Healthcare providers (role_id=2)
            // to add vaccination records
            if (userData.role_id === 3) { // Public Member role_id
                // Hide the vaccination form for Public Members
                quickVaccinationForm.closest('.col-md-6').style.display = 'none';
                
                // Make the appointment form take full width if exists
                const appointmentForm = document.getElementById('quickAppointmentForm');
                if (appointmentForm) {
                    appointmentForm.closest('.col-md-6').classList.remove('col-md-6');
                    appointmentForm.closest('.col').classList.add('col-md-12');
                }
                return;
            }
            
            // Continue with form initialization for authorized roles
            // Set default date to today
            document.getElementById('quick_date_administered').valueAsDate = new Date();
            
            quickVaccinationForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get form data
                const vaccineData = {
                    user_id: userId,
                    vaccine_name: document.getElementById('quick_vaccine_name').value,
                    date_administered: document.getElementById('quick_date_administered').value,
                    dose_number: parseInt(document.getElementById('quick_dose_number').value),
                    provider: document.getElementById('quick_provider').value || null
                };
                
                // Submit the vaccination record
                submitVaccinationRecord(vaccineData);
            });
        })
        .catch(error => {
            console.error('Error fetching user role:', error);
            // Hide form in case of error to prevent unauthorized access
            quickVaccinationForm.closest('.col-md-6').style.display = 'none';
        });
    }
}

// Initialize Quick Appointment Form
function initQuickAppointmentForm() {
    const quickAppointmentForm = document.getElementById('quickAppointmentForm');
    
    if (quickAppointmentForm) {
        // Set minimum date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
        document.getElementById('quick_appointment_date').min = tomorrowFormatted;
        
        // Set default date to tomorrow
        document.getElementById('quick_appointment_date').value = tomorrowFormatted;
        
        quickAppointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const appointmentData = {
                user_id: getUserIdFromToken(localStorage.getItem('prs_token')),
                vaccine_type: document.getElementById('quick_vaccine_type').value,
                appointment_date: document.getElementById('quick_appointment_date').value,
                appointment_time: document.getElementById('quick_appointment_time').value,
                facility_id: parseInt(document.getElementById('quick_facility').value)
            };
            
            // Submit the appointment booking
            submitAppointmentBooking(appointmentData);
        });
    }
}

// Load Health Facilities for Dropdown
function loadHealthFacilities() {
    const facilitySelect = document.getElementById('quick_facility');
    
    if (facilitySelect) {
        const token = localStorage.getItem('prs_token');
        
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
        .then(facilities => {
            // Clear loading option
            facilitySelect.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a facility';
            facilitySelect.appendChild(defaultOption);
            
            // Add active facilities
            facilities.forEach(facility => {
                if (facility.status === 'active') {
                    const option = document.createElement('option');
                    option.value = facility.facility_id;
                    option.textContent = facility.facility_name;
                    facilitySelect.appendChild(option);
                }
            });
            
            // If no facilities found
            if (facilities.length === 0 || !facilitySelect.options.length) {
                const noOption = document.createElement('option');
                noOption.value = '';
                noOption.textContent = 'No facilities available';
                facilitySelect.appendChild(noOption);
                facilitySelect.disabled = true;
            }
        })
        .catch(error => {
            if (error.message !== 'Unauthorized') {
                console.error('Error loading facilities:', error);
                facilitySelect.innerHTML = '<option value="">Error loading facilities</option>';
            }
        });
    }
}

// Submit Vaccination Record
function submitVaccinationRecord(data) {
    const token = localStorage.getItem('prs_token');
    
    // Show loading state
    const submitBtn = document.querySelector('#quickVaccinationForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    fetch('api.php/vaccination-records', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.status === 401) {
            localStorage.removeItem('prs_token');
            window.location.href = 'login.html';
            throw new Error('Unauthorized');
        }
        return response.json();
    })
    .then(result => {
        if (result.status === 'success') {
            // Show success message
            alert('Vaccination record added successfully!');
            
            // Reset form
            document.getElementById('quickVaccinationForm').reset();
            document.getElementById('quick_date_administered').valueAsDate = new Date();
            document.getElementById('quick_dose_number').value = 1;
            
            // Update dashboard stats if needed
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            alert(result.error || 'Failed to add vaccination record');
        }
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    })
    .finally(() => {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}

// Submit Appointment Booking
function submitAppointmentBooking(data) {
    const token = localStorage.getItem('prs_token');
    
    // Show loading state
    const submitBtn = document.querySelector('#quickAppointmentForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking...';
    
    fetch('api.php/appointments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.status === 401) {
            localStorage.removeItem('prs_token');
            window.location.href = 'login.html';
            throw new Error('Unauthorized');
        }
        return response.json();
    })
    .then(result => {
        if (result.status === 'success') {
            // Show success message
            alert('Appointment booked successfully! You will receive a confirmation email shortly.');
            
            // Reset form
            document.getElementById('quickAppointmentForm').reset();
            
            // Set default date to tomorrow again
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('quick_appointment_date').value = tomorrow.toISOString().split('T')[0];
            
            // Update dashboard stats if needed
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            alert(result.error || 'Failed to book appointment');
        }
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    })
    .finally(() => {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}