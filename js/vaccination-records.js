// Vaccination Records JavaScript

// Global variables for pagination and sorting
let currentPage = 1;
let recordsPerPage = 10;
let totalRecords = 0;
let allVaccinationRecords = [];
let filteredRecords = [];
let currentSortField = 'date_administered';
let currentSortDirection = 'desc';

// Store user role info
let currentUserRole = '';
let currentUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Set up role-based interface
    setupRoleBasedInterface();
    
    // Initialize filters
    initializeFilters();
    
    // Set default date range filter (last 6 months to today)
    setDefaultDateRange();
    
    // Initialize sorting
    initializeSorting();
    
    // Initialize pagination
    initializePagination();
});

// Set up role-based interface elements
function setupRoleBasedInterface() {
    const token = localStorage.getItem('prs_token');
    currentUserId = getUserIdFromToken(token);
    
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
        currentUserRole = currentUser.role_name;
        console.log('Authenticated user:', currentUser.full_name, 'Role:', currentUserRole);
        
        // Update user name in the header if present
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = currentUser.full_name;
        }
        
        // Show admin controls for Government Officials and Healthcare Providers
        if (currentUser.role_name === 'Government Official' || currentUser.role_name === 'Doctor') {
            // Make admin/doctor only elements visible
            document.querySelectorAll('.admin-doctor-only').forEach(el => {
                el.classList.remove('d-none');
            });
            
            // Load users for the user filter dropdown if admin
            loadUsersList();
        }
        
        // Load vaccination records
        loadVaccinationRecords();
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
            if (user.user_id == currentUserId) {
                option.textContent += ' (You)';
            }
            
            userFilter.appendChild(option);
        });
        
        console.log(`Loaded ${users.length} users for filter dropdown`);
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading users:', error);
            showAlert('Error loading users list: ' + error.message, 'danger');
        }
    });
}

// Initialize filter functionality
function initializeFilters() {
    const filterForm = document.getElementById('filterForm');
    
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            applyFilters();
        });
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            clearFilters();
        });
    }
}

// Set default date range (last 6 months to today)
function setDefaultDateRange() {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    const dateFromFilter = document.getElementById('dateFromFilter');
    const dateToFilter = document.getElementById('dateToFilter');
    
    if (dateFromFilter) {
        dateFromFilter.valueAsDate = sixMonthsAgo;
    }
    
    if (dateToFilter) {
        dateToFilter.valueAsDate = today;
    }
}

// Initialize sorting functionality
function initializeSorting() {
    const sortableHeaders = document.querySelectorAll('th.sortable');
    
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sortField = this.dataset.sort;
            
            // Toggle sort direction if clicking on current sort field
            if (sortField === currentSortField) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortField = sortField;
                currentSortDirection = 'asc'; // Default to ascending for new field
            }
            
            // Update headers to show current sort field and direction
            updateSortHeaders();
            
            // Resort and display records
            sortRecords();
            displayRecords();
        });
    });
}

// Update sort headers to show current sort field and direction
function updateSortHeaders() {
    document.querySelectorAll('th.sortable').forEach(header => {
        // Remove existing sort icons
        header.querySelectorAll('.bi-arrow-down, .bi-arrow-up').forEach(icon => {
            icon.classList.remove('bi-arrow-down', 'bi-arrow-up');
            icon.classList.add('bi-arrow-down-up');
        });
        
        // Add sort direction icon to current sort field
        if (header.dataset.sort === currentSortField) {
            const icon = header.querySelector('.bi');
            icon.classList.remove('bi-arrow-down-up');
            icon.classList.add(currentSortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down');
        }
    });
}

// Initialize pagination controls
function initializePagination() {
    // Attach event listeners to pagination buttons
    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayRecords();
            updatePaginationControls();
        }
    });
    
    document.getElementById('nextPageBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayRecords();
            updatePaginationControls();
        }
    });
    
    // Same for bottom pagination buttons
    document.getElementById('prevPageBtnBottom').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayRecords();
            updatePaginationControls();
        }
    });
    
    document.getElementById('nextPageBtnBottom').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayRecords();
            updatePaginationControls();
        }
    });
}

// Update pagination controls based on current page and total pages
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    
    if (filteredRecords.length === 0) {
        pageInfo.textContent = '0-0 of 0';
    } else {
        const start = (currentPage - 1) * recordsPerPage + 1;
        const end = Math.min(currentPage * recordsPerPage, filteredRecords.length);
        pageInfo.textContent = `${start}-${end} of ${filteredRecords.length}`;
    }
    
    // Update record count badge
    document.getElementById('recordCount').textContent = filteredRecords.length;
    
    // Enable/disable previous buttons
    const prevButtons = [document.getElementById('prevPageBtn'), document.getElementById('prevPageBtnBottom')];
    prevButtons.forEach(btn => {
        if (btn) btn.disabled = currentPage <= 1;
    });
    
    // Enable/disable next buttons
    const nextButtons = [document.getElementById('nextPageBtn'), document.getElementById('nextPageBtnBottom')];
    nextButtons.forEach(btn => {
        if (btn) btn.disabled = currentPage >= totalPages;
    });
}

// Load vaccination records from API
function loadVaccinationRecords() {
    const token = localStorage.getItem('prs_token');
    const isAdmin = currentUserRole === 'Government Official' || currentUserRole === 'Doctor';
    
    // Show loading state
    document.getElementById('vaccinationRecordsTable').innerHTML = 
        '<tr><td colspan="7" class="text-center">Loading vaccination records...</td></tr>';
    
    // Use different endpoints based on user role
    let apiUrl = 'api.php/vaccination-records';
    
    fetch(apiUrl, {
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
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    })
    .then(records => {
        console.log(`Loaded ${records.length} vaccination records`);
        
        // Store all records
        allVaccinationRecords = records;
        
        // If user is a Public Member, filter to only show their records
        if (!isAdmin) {
            allVaccinationRecords = allVaccinationRecords.filter(record => 
                record.user_id == currentUserId
            );
            console.log(`Filtered to ${allVaccinationRecords.length} records for current user`);
        }
        
        // Apply initial filters
        applyFilters();
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading vaccination records:', error);
            
            // Show error in table
            const colSpan = isAdmin ? 7 : 6; // One less column for non-admin users since user column is hidden
            document.getElementById('vaccinationRecordsTable').innerHTML = `
                <tr>
                    <td colspan="${colSpan}" class="text-center">
                        <div class="alert alert-danger mb-0">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error loading vaccination records: ${error.message}
                            <button class="btn btn-sm btn-outline-danger ms-3" onclick="loadVaccinationRecords()">
                                <i class="bi bi-arrow-clockwise me-1"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>`;
                
            showAlert('Error loading vaccination records: ' + error.message, 'danger');
        }
    });
}

// Apply filters to vaccination records
function applyFilters() {
    const isAdmin = currentUserRole === 'Government Official' || currentUserRole === 'Doctor';
    
    // Get filter values
    const userId = isAdmin ? document.getElementById('userFilter').value : currentUserId;
    const vaccineType = document.getElementById('vaccineTypeFilter').value;
    const dateFrom = document.getElementById('dateFromFilter').value;
    const dateTo = document.getElementById('dateToFilter').value;
    
    // Start with all records
    filteredRecords = [...allVaccinationRecords];
    
    // Apply filters
    // Filter by user if admin and user is selected
    if (isAdmin && userId) {
        filteredRecords = filteredRecords.filter(record => 
            record.user_id.toString() === userId.toString()
        );
    }
    
    // Filter by vaccine type
    if (vaccineType) {
        filteredRecords = filteredRecords.filter(record => 
            record.vaccine_name === vaccineType || 
            record.vaccine_name.includes(vaccineType)
        );
    }
    
    // Filter by date range
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filteredRecords = filteredRecords.filter(record => 
            new Date(record.date_administered) >= fromDate
        );
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire end date
        filteredRecords = filteredRecords.filter(record => 
            new Date(record.date_administered) <= toDate
        );
    }
    
    // Sort records
    sortRecords();
    
    // Reset to first page and display
    currentPage = 1;
    displayRecords();
    updatePaginationControls();
}

// Clear all filters and reset to defaults
function clearFilters() {
    // Reset filter form elements
    document.getElementById('vaccineTypeFilter').value = '';
    
    if (currentUserRole === 'Government Official' || currentUserRole === 'Doctor') {
        document.getElementById('userFilter').value = '';
    }
    
    // Reset date range to default
    setDefaultDateRange();
    
    // Apply reset filters
    applyFilters();
    
    showAlert('Filters have been cleared', 'info');
}

// Sort records based on current sort field and direction
function sortRecords() {
    filteredRecords.sort((a, b) => {
        let valueA, valueB;
        
        // Handle special cases for sorting
        switch (currentSortField) {
            case 'date_administered':
                valueA = new Date(a.date_administered);
                valueB = new Date(b.date_administered);
                break;
            case 'dose_number':
                valueA = parseInt(a.dose_number);
                valueB = parseInt(b.dose_number);
                break;
            case 'record_id':
                valueA = parseInt(a.record_id);
                valueB = parseInt(b.record_id);
                break;
            default:
                valueA = a[currentSortField] || '';
                valueB = b[currentSortField] || '';
                // For string values, do case-insensitive comparison
                if (typeof valueA === 'string') valueA = valueA.toLowerCase();
                if (typeof valueB === 'string') valueB = valueB.toLowerCase();
        }
        
        // Handle null values in sorting
        if (valueA === null || valueA === undefined) return 1;
        if (valueB === null || valueB === undefined) return -1;
        
        // Compare based on current sort direction
        if (currentSortDirection === 'asc') {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
    });
}

// Display vaccination records with pagination
function displayRecords() {
    const recordsTable = document.getElementById('vaccinationRecordsTable');
    const noRecordsMessage = document.getElementById('noRecordsMessage');
    const isAdmin = currentUserRole === 'Government Official' || currentUserRole === 'Doctor';
    
    if (filteredRecords.length === 0) {
        recordsTable.innerHTML = '';
        noRecordsMessage.classList.remove('d-none');
    } else {
        noRecordsMessage.classList.add('d-none');
        
        // Calculate pagination indices
        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = Math.min(startIndex + recordsPerPage, filteredRecords.length);
        const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
        
        let html = '';
        paginatedRecords.forEach(record => {
            // Format date for display
            const administeredDate = new Date(record.date_administered);
            const formattedDate = administeredDate.toLocaleDateString();
            
            // Create table row
            html += `
            <tr data-id="${record.record_id}">
                <td>${record.record_id}</td>
                <td>${record.vaccine_name}</td>
                <td>${formattedDate}</td>
                <td>${record.dose_number}</td>
                <td>${record.provider || '-'}</td>`;
            
            // Add user column for admin/doctor
            if (isAdmin) {
                html += `<td>${record.full_name || 'User #' + record.user_id}</td>`;
            }
            
            // Add action buttons
            html += `
                <td>
                    <button class="btn btn-sm btn-outline-primary view-record-btn" data-id="${record.record_id}">
                        <i class="bi bi-eye"></i> View
                    </button>
                </td>
            </tr>`;
        });
        
        recordsTable.innerHTML = html;
        
        // Attach event listeners to view buttons
        document.querySelectorAll('.view-record-btn').forEach(button => {
            button.addEventListener('click', function() {
                const recordId = this.getAttribute('data-id');
                openRecordDetailsModal(recordId);
            });
        });
    }
}

// Open record details modal
function openRecordDetailsModal(recordId) {
    const token = localStorage.getItem('prs_token');
    const isAdmin = currentUserRole === 'Government Official' || currentUserRole === 'Doctor';
    
    // Find the record in the filtered records
    const record = filteredRecords.find(r => r.record_id == recordId);
    
    if (record) {
        // Format dates
        const administeredDate = new Date(record.date_administered);
        const formattedAdministeredDate = administeredDate.toLocaleDateString();
        
        let formattedExpirationDate = '-';
        if (record.expiration_date) {
            const expirationDate = new Date(record.expiration_date);
            formattedExpirationDate = expirationDate.toLocaleDateString();
        }
        
        // Populate modal fields
        document.getElementById('detail_record_id').textContent = record.record_id;
        document.getElementById('detail_vaccine_name').textContent = record.vaccine_name;
        document.getElementById('detail_date_administered').textContent = formattedAdministeredDate;
        document.getElementById('detail_dose_number').textContent = record.dose_number;
        document.getElementById('detail_provider').textContent = record.provider || '-';
        document.getElementById('detail_lot_number').textContent = record.lot_number || '-';
        document.getElementById('detail_expiration_date').textContent = formattedExpirationDate;
        
        // Admin-only fields
        if (isAdmin) {
            document.getElementById('detail_user').textContent = record.full_name || 'User #' + record.user_id;
            
            // We don't have created_by info in the current API response,
            // but this could be populated if that information becomes available
            document.getElementById('detail_created_by').textContent = 'System';
        }
        
        // Update modal title
        const modalTitle = document.getElementById('recordDetailsModalLabel');
        if (isAdmin && record.full_name) {
            modalTitle.textContent = `Vaccination Record for ${record.full_name}`;
        } else {
            modalTitle.textContent = 'Vaccination Record Details';
        }
        
        // Show the modal
        const recordDetailsModal = new bootstrap.Modal(document.getElementById('recordDetailsModal'));
        recordDetailsModal.show();
    } else {
        showAlert('Record not found. Please refresh the page.', 'danger');
    }
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