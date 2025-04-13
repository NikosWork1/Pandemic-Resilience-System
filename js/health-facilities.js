// Health Facilities Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Check user role
    checkUserRole();
    
    // Load facilities data
    loadFacilitiesData();
    
    // Handle form submission for adding a new facility
    const facilityForm = document.getElementById('facilityForm');
    if (facilityForm) {
        facilityForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const facility_name = document.getElementById('facility_name').value;
            const facility_type = document.getElementById('facility_type').value;
            const address = document.getElementById('address').value;
            const contact_number = document.getElementById('contact_number').value;
            const email = document.getElementById('email').value;
            const capacity = document.getElementById('capacity').value;
            const status = document.getElementById('status').value;
            
            const token = localStorage.getItem('prs_token');
            
            fetch('api.php/health-facilities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    facility_name: facility_name,
                    facility_type: facility_type,
                    address: address,
                    contact_number: contact_number,
                    email: email,
                    capacity: capacity ? parseInt(capacity) : null,
                    status: status
                })
            })
            .then(response => {
                if (response.status === 401) {
                    localStorage.removeItem('prs_token');
                    window.location.href = 'login.html';
                    throw new Error('Unauthorized');
                } else if (response.status === 403) {
                    throw new Error('Permission denied');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    // Reset form
                    facilityForm.reset();
                    
                    // Reload facilities data
                    loadFacilitiesData();
                    
                    // Show success message
                    alert('Health facility added successfully!');
                } else {
                    alert(data.error || 'Failed to add health facility');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                if (error.message === 'Permission denied') {
                    alert('You do not have permission to add health facilities. Only Government Officials can add facilities.');
                } else if (error.message !== 'Unauthorized') {
                    alert('An error occurred. Please try again.');
                }
            });
        });
    }
    
    // Handle filters
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    
    // Handle save changes button in edit modal
    document.getElementById('saveFacilityChanges').addEventListener('click', saveFacilityChanges);
});

// Function to load facilities data
function loadFacilitiesData() {
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
    .then(data => {
        // Save the data to use with filters
        window.facilitiesData = data;
        
        // Display the data
        displayFacilities(data);
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading facilities data:', error);
            const tableBody = document.getElementById('facilitiesTable');
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading facilities data</td></tr>';
        }
    });
}

// Function to display facilities in the table
function displayFacilities(facilities) {
    const tableBody = document.getElementById('facilitiesTable');
    tableBody.innerHTML = '';
    
    if (facilities.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="8" class="text-center">No health facilities found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    facilities.forEach(facility => {
        const row = document.createElement('tr');
        
        // Format status for display
        let statusDisplay = facility.status;
        let statusBadgeClass = '';
        
        switch(facility.status) {
            case 'active':
                statusDisplay = 'Active';
                statusBadgeClass = 'bg-success';
                break;
            case 'inactive':
                statusDisplay = 'Inactive';
                statusBadgeClass = 'bg-secondary';
                break;
            case 'under_maintenance':
                statusDisplay = 'Under Maintenance';
                statusBadgeClass = 'bg-warning';
                break;
        }
        
        row.innerHTML = `
            <td>${facility.facility_id}</td>
            <td>${facility.facility_name}</td>
            <td>${facility.facility_type}</td>
            <td>${facility.address}</td>
            <td>${facility.contact_number || 'N/A'}</td>
            <td>${facility.capacity || 'N/A'}</td>
            <td><span class="badge ${statusBadgeClass}">${statusDisplay}</span></td>
            <td class="admin-actions">
                <button class="btn btn-sm btn-primary edit-btn admin-only" data-id="${facility.facility_id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-btn admin-only" data-id="${facility.facility_id}">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    addActionButtonListeners();
}

// Function to add event listeners to action buttons
function addActionButtonListeners() {
    // Add edit button listeners
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            openEditModal(id);
        });
    });
    
    // Add delete button listeners
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this health facility?')) {
                deleteFacility(id);
            }
        });
    });
}

// Function to open edit modal with facility data
function openEditModal(id) {
    const token = localStorage.getItem('prs_token');
    
    fetch(`api.php/health-facilities/${id}`, {
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
    .then(facility => {
        // Populate form fields
        document.getElementById('edit_facility_id').value = facility.facility_id;
        document.getElementById('edit_facility_name').value = facility.facility_name;
        document.getElementById('edit_facility_type').value = facility.facility_type;
        document.getElementById('edit_address').value = facility.address;
        document.getElementById('edit_contact_number').value = facility.contact_number || '';
        document.getElementById('edit_email').value = facility.email || '';
        document.getElementById('edit_capacity').value = facility.capacity || '';
        document.getElementById('edit_status').value = facility.status;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('editFacilityModal'));
        modal.show();
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading facility details:', error);
            alert('Error loading facility details. Please try again.');
        }
    });
}

// Function to save facility changes
function saveFacilityChanges() {
    const token = localStorage.getItem('prs_token');
    const id = document.getElementById('edit_facility_id').value;
    
    const facility = {
        facility_name: document.getElementById('edit_facility_name').value,
        facility_type: document.getElementById('edit_facility_type').value,
        address: document.getElementById('edit_address').value,
        contact_number: document.getElementById('edit_contact_number').value,
        email: document.getElementById('edit_email').value,
        capacity: document.getElementById('edit_capacity').value || null,
        status: document.getElementById('edit_status').value
    };
    
    fetch(`api.php/health-facilities/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify(facility)
    })
    .then(response => {
        if (response.status === 401) {
            localStorage.removeItem('prs_token');
            window.location.href = 'login.html';
            throw new Error('Unauthorized');
        } else if (response.status === 403) {
            throw new Error('Permission denied');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editFacilityModal'));
            modal.hide();
            
            // Reload facilities data
            loadFacilitiesData();
            
            // Show success message
            alert('Health facility updated successfully!');
        } else {
            alert(data.error || 'Failed to update health facility');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (error.message === 'Permission denied') {
            alert('You do not have permission to update health facilities. Only Government Officials can update facilities.');
        } else if (error.message !== 'Unauthorized') {
            alert('An error occurred. Please try again.');
        }
    });
}

// Function to delete a facility
function deleteFacility(id) {
    const token = localStorage.getItem('prs_token');
    
    fetch(`api.php/health-facilities/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': token
        }
    })
    .then(response => {
        if (response.status === 401) {
            localStorage.removeItem('prs_token');
            window.location.href = 'login.html';
            throw new Error('Unauthorized');
        } else if (response.status === 403) {
            throw new Error('Permission denied');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Reload facilities data
            loadFacilitiesData();
            alert('Health facility deleted successfully!');
        } else {
            alert(data.error || 'Failed to delete health facility');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (error.message === 'Permission denied') {
            alert('You do not have permission to delete health facilities. Only Government Officials can delete facilities.');
        } else if (error.message !== 'Unauthorized') {
            alert('An error occurred. Please try again.');
        }
    });
}

// Function to apply filters to the facilities table
function applyFilters() {
    if (!window.facilitiesData) return;
    
    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    
    // Filter the data
    const filteredData = window.facilitiesData.filter(facility => {
        // Type filter
        if (typeFilter && facility.facility_type !== typeFilter) {
            return false;
        }
        
        // Status filter
        if (statusFilter && facility.status !== statusFilter) {
            return false;
        }
        
        // Search input (check name, address, and contact)
        if (searchInput) {
            const searchFields = [
                facility.facility_name.toLowerCase(),
                facility.address.toLowerCase(),
                facility.contact_number ? facility.contact_number.toLowerCase() : '',
                facility.email ? facility.email.toLowerCase() : ''
            ];
            
            if (!searchFields.some(field => field.includes(searchInput))) {
                return false;
            }
        }
        
        return true;
    });
    
    // Display filtered data
    displayFacilities(filteredData);
}

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
        // For simplicity, we're assuming the first user is the authenticated one
        const currentUser = users[0];
        
        // For health facilities, only Government Officials have full access
        if (currentUser.role_name !== 'Government Official') {
            // Hide the form for adding new facilities
            const addForm = document.querySelector('.facility-form-container');
            if (addForm) {
                addForm.style.display = 'none';
            }
            
            // Hide admin-only elements
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