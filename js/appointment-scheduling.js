// Appointment Scheduling JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Check user role and set up appropriate interface
    setupRoleBasedInterface();
    
    // Load health facilities for the reschedule modal
    loadHealthFacilities();
    
    // Set default date range for filters (last month to next 6 months)
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    const sixMonthsLater = new Date(today);
    sixMonthsLater.setMonth(today.getMonth() + 6);
    
    document.getElementById('dateFromFilter').valueAsDate = lastMonth;
    document.getElementById('dateToFilter').valueAsDate = sixMonthsLater;
    
    // Set minimum date for appointment scheduling to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('appointment_date').min = tomorrow.toISOString().split('T')[0];
    
    // Initialize filter form handling
    initializeFilters();
    
    // Load appointments
    loadAppointments();
    
    // Initialize modal functionality
    initializeRescheduleModal();
    
    // Initialize cancellation confirmation modal
    initializeCancellationModal();
});

// Setup role-based interface elements
function setupRoleBasedInterface() {
    const token = localStorage.getItem('prs_token');
    const currentUserId = getUserIdFromToken(token);
    
    if (!currentUserId) {
        console.error('Invalid token or user ID not found');
        return;
    }
    
    fetch(`api.php/users/${currentUserId}`, {
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
    .then(currentUser => {
        // Store user role globally to use in other functions
        window.currentUserRole = currentUser.role_name;
        window.currentUserId = currentUserId;
        window.currentUserRoleId = currentUser.role_id;
        
        console.log(`User: ${currentUser.full_name}, Role: ${currentUser.role_name}, Role ID: ${currentUser.role_id}`);
        
        // Update user name in the header if present
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = currentUser.full_name;
        }
        
        // Show admin controls for Government Officials (role_id=1) and Healthcare Providers (role_id=2)
        // Hide them for Public Members (role_id=3)
        if (currentUser.role_id === 1 || currentUser.role_id === 2) {
            console.log('Administrative user detected - showing admin controls');
            
            // Make admin/doctor only elements visible
            document.querySelectorAll('.admin-doctor-only').forEach(el => {
                el.classList.remove('d-none');
            });
            
            // Load users for the user filter dropdown
            loadUsersList();
            
            // Update page title for admin users
            const pageTitle = document.querySelector('.card-title');
            if (pageTitle && pageTitle.textContent === 'Your Appointments') {
                pageTitle.textContent = 'All Appointments';
            }
            
        } else {
            console.log('Public member detected - hiding admin controls');
            
            // Ensure admin/doctor only elements are hidden
            document.querySelectorAll('.admin-doctor-only').forEach(el => {
                el.classList.add('d-none');
            });
            
            // No need to load users list for public members
        }
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error checking user role:', error);
            showAlert('Error loading user data. Please refresh the page.', 'danger');
        }
    });
}

// Load users list for admin filter
function loadUsersList() {
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
        const userFilter = document.getElementById('userFilter');
        
        // Clear existing options except the first one
        while (userFilter.options.length > 1) {
            userFilter.remove(1);
        }
        
        // Sort users alphabetically by name
        users.sort((a, b) => a.full_name.localeCompare(b.full_name));
        
        // Add options for each user
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.user_id;
            option.textContent = `${user.full_name} (${user.role_name})`;
            
            // If this is the current user, add "(You)" to the name
            if (user.user_id == window.currentUserId) {
                option.textContent += ' (You)';
            }
            
            userFilter.appendChild(option);
        });
        
        console.log(`Loaded ${users.length} users for filter dropdown`);
        
        // Add change event listener to user filter
        userFilter.addEventListener('change', function() {
            console.log(`User filter changed to: ${this.value}`);
            loadAppointments();
        });
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading users:', error);
            showAlert('Error loading users list: ' + error.message, 'danger');
        }
    });
}

// Load health facilities for dropdown
function loadHealthFacilities() {
    const token = localStorage.getItem('prs_token');
    const facilitySelect = document.getElementById('facility_id');
    
    if (facilitySelect) {
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
            // Clear existing options
            facilitySelect.innerHTML = '<option value="">Select facility</option>';
            
            // Add active facilities
            facilities.forEach(facility => {
                if (facility.status === 'active') {
                    const option = document.createElement('option');
                    option.value = facility.facility_id;
                    option.textContent = facility.facility_name;
                    facilitySelect.appendChild(option);
                }
            });
        })
        .catch(error => {
            if (error.message !== 'Unauthorized') {
                console.error('Error loading facilities:', error);
                facilitySelect.innerHTML = '<option value="">Error loading facilities</option>';
            }
        });
    }
}

// Initialize filter functionality
function initializeFilters() {
    const filterForm = document.getElementById('filterForm');
    
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            loadAppointments();
        });
    }
}

// Load appointments based on filters
function loadAppointments() {
    const token = localStorage.getItem('prs_token');
    const isAdmin = window.currentUserRole === 'Government Official' || window.currentUserRole === 'Doctor';
    
    // Get filter values
    const userId = isAdmin ? document.getElementById('userFilter').value : window.currentUserId;
    const dateFrom = document.getElementById('dateFromFilter').value;
    const dateTo = document.getElementById('dateToFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    // Show loading state
    document.getElementById('appointmentsTable').innerHTML = 
        '<tr><td colspan="8" class="text-center">Loading appointments...</td></tr>';
    
    // Determine which data fetching method to use based on user role
    let appointmentsPromise;
    
    if (isAdmin) {
        console.log('Admin user detected, fetching all appointments');
        appointmentsPromise = fetchAllAppointments();
    } else {
        console.log('Regular user detected, fetching only their appointments');
        appointmentsPromise = fetch('api.php/appointments', {
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
            
            if (!response.ok) {
                const errorMsg = `Server returned ${response.status}: ${response.statusText}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
            
            return response.json();
        })
        .then(data => {
            console.log(`Fetched ${data.length} user appointments successfully`);
            
            // Sort appointments by date (newest first) 
            data.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
            
            return data;
        })
        .catch(error => {
            if (error.message !== 'Unauthorized') {
                console.error('Error fetching user appointments:', error);
                showAlert('Error loading your appointments: ' + error.message, 'danger');
            }
            return [];
        });
    }
    
    appointmentsPromise.then(appointments => {
        console.log(`Loaded ${appointments.length} appointments`);
        
        // Apply filters client-side
        let filteredAppointments = appointments;
        
        // Filter by date range if specified
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            filteredAppointments = filteredAppointments.filter(appointment => 
                new Date(appointment.appointment_date) >= fromDate
            );
        }
        
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setDate(toDate.getDate() + 1); // Include the entire end date
            filteredAppointments = filteredAppointments.filter(appointment => 
                new Date(appointment.appointment_date) < toDate
            );
        }
        
        // Filter by status if specified
        if (status) {
            filteredAppointments = filteredAppointments.filter(appointment => 
                appointment.status === status
            );
        }
        
        // Filter by user if admin and user is selected
        if (isAdmin && userId) {
            filteredAppointments = filteredAppointments.filter(appointment => 
                appointment.user_id.toString() === userId.toString()
            );
        }
        
        displayAppointments(filteredAppointments);
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading appointments:', error);
            
            // Show a more detailed error in the table
            const colSpan = isAdmin ? 8 : 7; // One less column for non-admin users since user column is hidden
            document.getElementById('appointmentsTable').innerHTML = `
                <tr>
                    <td colspan="${colSpan}" class="text-center">
                        <div class="alert alert-danger mb-0">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error loading appointments: ${error.message}
                            <button class="btn btn-sm btn-outline-danger ms-3" onclick="loadAppointments()">
                                <i class="bi bi-arrow-clockwise me-1"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>`;
                
            showAlert('Error loading appointments: ' + error.message, 'danger');
        }
    });
}

// Fetch all appointments (for admin/doctor users)
function fetchAllAppointments() {
    const token = localStorage.getItem('prs_token');
    
    console.log('Fetching all appointments for admin/doctor user');
    
    // Create a custom endpoint to get all appointments with user information
    return fetch('api.php/get-all-appointments', {
        headers: {
            'Authorization': token
        }
    })
    .then(response => {
        if (!response.ok) {
            const errorMsg = `Failed to fetch all appointments. Server returned: ${response.status} (${response.statusText})`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        return response.json();
    })
    .then(data => {
        console.log(`Fetched ${data.length} appointments successfully`);
        
        // Sort appointments by date (newest first)
        data.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
        
        return data;
    })
    .catch(error => {
        console.error('Error fetching all appointments:', error);
        showAlert('Error loading all appointments: ' + error.message, 'danger');
        return []; // Return empty array on error to prevent further errors
    });
}

// Display appointments in the table
function displayAppointments(appointments) {
    const appointmentsTable = document.getElementById('appointmentsTable');
    const noAppointmentsMessage = document.getElementById('noAppointmentsMessage');
    const isAdmin = window.currentUserRole === 'Government Official' || window.currentUserRole === 'Doctor';
    
    // Log the number of appointments being displayed
    console.log(`Displaying ${appointments.length} appointments, isAdmin: ${isAdmin}`);
    
    if (appointments.length === 0) {
        appointmentsTable.innerHTML = '';
        noAppointmentsMessage.classList.remove('d-none');
        
        if (isAdmin) {
            // Update message for admin users
            noAppointmentsMessage.innerHTML = 'No appointments found with the current filters. <a href="index.html">Book a new appointment</a> on the dashboard.';
        }
    } else {
        noAppointmentsMessage.classList.add('d-none');
        
        let html = '';
        appointments.forEach(appointment => {
            // Format date for display
            const appointmentDate = new Date(appointment.appointment_date);
            const formattedDate = appointmentDate.toLocaleDateString();
            
            // Format time slot for display
            let timeDisplay = '';
            switch(appointment.appointment_time) {
                case 'morning':
                    timeDisplay = 'Morning (9AM-12PM)';
                    break;
                case 'afternoon':
                    timeDisplay = 'Afternoon (1PM-5PM)';
                    break;
                case 'evening':
                    timeDisplay = 'Evening (6PM-8PM)';
                    break;
                default:
                    timeDisplay = appointment.appointment_time;
            }
            
            // Format status with badge color
            let statusBadgeClass = '';
            switch(appointment.status) {
                case 'scheduled':
                    statusBadgeClass = 'bg-success';
                    break;
                case 'completed':
                    statusBadgeClass = 'bg-info';
                    break;
                case 'canceled':
                    statusBadgeClass = 'bg-danger';
                    break;
                default:
                    statusBadgeClass = 'bg-secondary';
            }
            
            // Determine if actions are allowed based on status and date
            const isScheduled = appointment.status === 'scheduled';
            const appointmentInFuture = new Date(appointment.appointment_date) > new Date();
            const canModify = isScheduled && appointmentInFuture;
            
            // Determine if the current user can modify this appointment
            // Admin users can modify any appointment, regular users only their own
            const isCurrentUserAppointment = parseInt(appointment.user_id) === parseInt(window.currentUserId);
            // Always allow admins to modify, or the appointment owner if it's their own
            const canUserModify = isAdmin || isCurrentUserAppointment;
            
            // Create table row
            html += `
            <tr data-id="${appointment.appointment_id}" ${isCurrentUserAppointment ? 'class="table-primary"' : ''}>
                <td>${appointment.appointment_id}</td>
                <td>${appointment.vaccine_type}</td>
                <td>${formattedDate}</td>
                <td>${timeDisplay}</td>
                <td>${appointment.facility_name}</td>
                <td><span class="badge ${statusBadgeClass}">${appointment.status}</span></td>`;
            
            // Add user column for admin/doctor
            if (isAdmin) {
                html += `<td>${appointment.full_name || 'User #' + appointment.user_id}</td>`;
            } else {
                // For public members, the user column is hidden in the HTML
            }
            
            // Add action buttons
            html += `<td>`;
            
            if (canModify && canUserModify) {
                html += `
                <button class="btn btn-sm btn-outline-primary reschedule-btn" data-id="${appointment.appointment_id}">
                    Reschedule
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1 cancel-btn" data-id="${appointment.appointment_id}">
                    Cancel
                </button>`;
            } else {
                if (!canModify) {
                    html += `<span class="text-muted">No actions available</span>`;
                } else {
                    html += `<span class="text-muted">Cannot modify</span>`;
                }
            }
            
            html += `</td></tr>`;
        });
        
        appointmentsTable.innerHTML = html;
        
        // Attach event listeners to the action buttons
        document.querySelectorAll('.reschedule-btn').forEach(button => {
            button.addEventListener('click', function() {
                const appointmentId = this.getAttribute('data-id');
                openRescheduleModal(appointmentId);
            });
        });
        
        document.querySelectorAll('.cancel-btn').forEach(button => {
            button.addEventListener('click', function() {
                const appointmentId = this.getAttribute('data-id');
                openCancellationModal(appointmentId);
            });
        });
    }
}

// Initialize the reschedule modal functionality
function initializeRescheduleModal() {
    const saveButton = document.getElementById('saveReschedule');
    
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            rescheduleAppointment();
        });
    }
}

// Open the reschedule modal and populate with appointment data
function openRescheduleModal(appointmentId) {
    const token = localStorage.getItem('prs_token');
    const isAdmin = window.currentUserRole === 'Government Official' || window.currentUserRole === 'Doctor';
    
    // Reset form
    document.getElementById('rescheduleForm').reset();
    
    // Set the appointment ID
    document.getElementById('appointment_id').value = appointmentId;
    
    // Check if user has permission to modify this appointment
    checkAppointmentPermission(appointmentId, () => {
        // Fetch the appointment details to pre-populate the form
        fetch(`api.php/appointments/${appointmentId}`, {
            headers: {
                'Authorization': token
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch appointment details');
            }
            return response.json();
        })
        .then(appointment => {
            // Populate form fields
            document.getElementById('vaccine_type').value = appointment.vaccine_type;
            document.getElementById('appointment_date').value = appointment.appointment_date;
            document.getElementById('appointment_time').value = appointment.appointment_time;
            
            // Wait for facilities to load before setting the value
            const facilitySelect = document.getElementById('facility_id');
            const checkFacilityInterval = setInterval(() => {
                if (facilitySelect.options.length > 1) {
                    facilitySelect.value = appointment.facility_id;
                    clearInterval(checkFacilityInterval);
                }
            }, 100);
            
            // Update modal title for admin users to show whose appointment it is
            if (isAdmin && appointment.full_name) {
                const modalTitle = document.getElementById('rescheduleModalLabel');
                modalTitle.textContent = `Reschedule Appointment for ${appointment.full_name}`;
            }
            
            // Show the modal
            const rescheduleModal = new bootstrap.Modal(document.getElementById('rescheduleModal'));
            rescheduleModal.show();
        })
        .catch(error => {
            console.error('Error fetching appointment details:', error);
            showAlert('Error loading appointment details: ' + error.message, 'danger');
        });
    });
}

// Reschedule appointment
function rescheduleAppointment() {
    const token = localStorage.getItem('prs_token');
    const appointmentId = document.getElementById('appointment_id').value;
    const saveButton = document.getElementById('saveReschedule');
    
    // Disable button and show loading state
    saveButton.disabled = true;
    const originalButtonText = saveButton.textContent;
    saveButton.textContent = 'Saving...';
    
    // Get form data
    const vaccineType = document.getElementById('vaccine_type').value;
    const appointmentDate = document.getElementById('appointment_date').value;
    const appointmentTime = document.getElementById('appointment_time').value;
    const facilityId = document.getElementById('facility_id').value;
    
    // Validate form inputs
    if (!vaccineType || !appointmentDate || !appointmentTime || !facilityId) {
        showAlert('Please fill in all required fields.', 'danger');
        // Re-enable button
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
        return;
    }
    
    // Check if appointment date is in the future
    const selectedDate = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
        showAlert('Appointment date must be in the future.', 'danger');
        // Re-enable button
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
        return;
    }
    
    // Prepare data
    const appointmentData = {
        vaccine_type: vaccineType,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        facility_id: parseInt(facilityId),
        status: 'scheduled'
    };
    
    console.log(`Attempting to reschedule appointment ${appointmentId}`, appointmentData);
    
    // First, check if the current user has permission to reschedule this appointment
    checkAppointmentPermission(appointmentId, () => {
        // Update appointment via API
        fetch(`api.php/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(appointmentData)
        })
        .then(response => {
            if (!response.ok) {
                const errorMsg = `Server returned ${response.status}: ${response.statusText}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
            return response.json();
        })
        .then(result => {
            if (result.status === 'success') {
                // Hide modal
                const rescheduleModal = bootstrap.Modal.getInstance(document.getElementById('rescheduleModal'));
                rescheduleModal.hide();
                
                // Show success message
                showAlert('Appointment rescheduled successfully!', 'success');
                
                // Reload appointments
                loadAppointments();
                
                console.log(`Successfully rescheduled appointment ${appointmentId}`);
            } else {
                const errorMsg = result.error || 'Failed to reschedule appointment';
                console.error(errorMsg);
                showAlert(errorMsg, 'danger');
                
                // Re-enable button
                saveButton.disabled = false;
                saveButton.textContent = originalButtonText;
            }
        })
        .catch(error => {
            console.error('Error rescheduling appointment:', error);
            showAlert('Error: ' + error.message, 'danger');
            
            // Re-enable button
            saveButton.disabled = false;
            saveButton.textContent = originalButtonText;
        });
    });
}

// Initialize cancellation modal
function initializeCancellationModal() {
    const confirmButton = document.getElementById('confirmAction');
    
    if (confirmButton) {
        confirmButton.addEventListener('click', function() {
            cancelAppointment();
        });
    }
}

// Open cancellation confirmation modal
function openCancellationModal(appointmentId) {
    const token = localStorage.getItem('prs_token');
    const isAdmin = window.currentUserRole === 'Government Official' || window.currentUserRole === 'Doctor';
    
    // Set appointment ID in a data attribute
    document.getElementById('confirmAction').setAttribute('data-id', appointmentId);
    
    // For admin users, get and show appointment owner info
    if (isAdmin) {
        fetch(`api.php/appointments/${appointmentId}`, {
            headers: {
                'Authorization': token
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch appointment details');
            }
            return response.json();
        })
        .then(appointment => {
            // Update confirmation message with user information
            const confirmationMessage = document.getElementById('confirmationMessage');
            if (appointment.full_name) {
                confirmationMessage.textContent = `Are you sure you want to cancel this appointment for ${appointment.full_name}?`;
            } else {
                confirmationMessage.textContent = `Are you sure you want to cancel this appointment for User #${appointment.user_id}?`;
            }
            
            // Update title
            const confirmationTitle = document.getElementById('confirmationModalLabel');
            confirmationTitle.textContent = 'Confirm Appointment Cancellation';
            
            // Show the modal
            const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
            confirmationModal.show();
        })
        .catch(error => {
            console.error('Error fetching appointment details:', error);
            showAlert('Error: ' + error.message, 'danger');
        });
    } else {
        // For regular users, just show the standard confirmation
        document.getElementById('confirmationMessage').textContent = 'Are you sure you want to cancel this appointment?';
        
        // Show confirmation modal
        const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        confirmationModal.show();
    }
}

// Cancel appointment
function cancelAppointment() {
    const token = localStorage.getItem('prs_token');
    const appointmentId = document.getElementById('confirmAction').getAttribute('data-id');
    const confirmButton = document.getElementById('confirmAction');
    
    // Disable the button and show loading state
    confirmButton.disabled = true;
    const originalText = confirmButton.textContent;
    confirmButton.textContent = 'Cancelling...';
    
    console.log(`Attempting to cancel appointment ${appointmentId}`);
    
    // First, check if the current user has permission to cancel this appointment
    checkAppointmentPermission(appointmentId, () => {
        // Proceed with cancellation if permission check passes
        fetch(`api.php/appointments/${appointmentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        })
        .then(response => {
            if (!response.ok) {
                const errorMsg = `Server returned ${response.status}: ${response.statusText}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
            return response.json();
        })
        .then(result => {
            if (result.status === 'success') {
                // Hide modal
                const confirmationModal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
                confirmationModal.hide();
                
                // Show success message
                showAlert('Appointment canceled successfully.', 'success');
                
                // Reload appointments
                loadAppointments();
                
                console.log(`Successfully cancelled appointment ${appointmentId}`);
            } else {
                const errorMsg = result.error || 'Failed to cancel appointment';
                console.error(errorMsg);
                showAlert(errorMsg, 'danger');
                
                // Reset button state
                confirmButton.disabled = false;
                confirmButton.textContent = originalText;
            }
        })
        .catch(error => {
            console.error('Error canceling appointment:', error);
            showAlert('Error: ' + error.message, 'danger');
            
            // Reset button state
            confirmButton.disabled = false;
            confirmButton.textContent = originalText;
        });
    });
}

// Check if user has permission to modify an appointment
function checkAppointmentPermission(appointmentId, callback) {
    const token = localStorage.getItem('prs_token');
    const isAdmin = window.currentUserRole === 'Government Official' || window.currentUserRole === 'Doctor';
    
    console.log(`Checking permission for appointment ${appointmentId}, isAdmin: ${isAdmin}`);
    
    // Admin users can modify any appointment
    if (isAdmin) {
        console.log('Admin user - granting permission');
        callback();
        return;
    }
    
    // For regular users, check if they own the appointment
    fetch(`api.php/appointments/${appointmentId}`, {
        headers: {
            'Authorization': token
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch appointment details');
        }
        return response.json();
    })
    .then(appointment => {
        // Check if the current user is the owner of this appointment
        if (appointment.user_id == window.currentUserId) {
            console.log(`Permission granted - user owns appointment ${appointmentId}`);
            callback();
        } else {
            console.log(`Permission denied - user does not own appointment ${appointmentId}`);
            showAlert('You do not have permission to modify this appointment.', 'danger');
            // Close any open modals
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modalEl => {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            });
        }
    })
    .catch(error => {
        console.error('Error checking appointment permission:', error);
        showAlert('Error: ' + error.message, 'danger');
    });
}

// Helper function to show alerts
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    
    if (alertContainer) {
        // Clear any existing alerts first
        alertContainer.innerHTML = '';
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.setAttribute('role', 'alert');
        
        // Add icon based on alert type
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="bi bi-check-circle-fill me-2"></i>';
                break;
            case 'danger':
                icon = '<i class="bi bi-exclamation-triangle-fill me-2"></i>';
                break;
            case 'warning':
                icon = '<i class="bi bi-exclamation-circle-fill me-2"></i>';
                break;
            case 'info':
                icon = '<i class="bi bi-info-circle-fill me-2"></i>';
                break;
        }
        
        alert.innerHTML = `
            ${icon}${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Add alert to container
        alertContainer.appendChild(alert);
        
        // Scroll to the alert if it's not in view
        alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto-dismiss after 5 seconds for success messages
        // but keep error messages until dismissed by user
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                try {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                } catch (e) {
                    // In case the alert is already gone
                    console.log('Alert already closed');
                }
            }, 5000);
        }
        
        // Log to console as well
        const logMethod = type === 'danger' ? console.error : console.log;
        logMethod(`Alert (${type}): ${message}`);
    }
}