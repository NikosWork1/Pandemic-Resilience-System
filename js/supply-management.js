// Supply Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Check user role
    checkUserRole();
    
    // Load inventory data
    loadInventoryData();
    
    // Handle form submission for adding a new inventory item
    const inventoryForm = document.getElementById('inventoryForm');
    if (inventoryForm) {
        inventoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const item_name = document.getElementById('item_name').value;
            const item_type = document.getElementById('item_type').value;
            const quantity = document.getElementById('quantity').value;
            const location = document.getElementById('location').value;
            const batch_number = document.getElementById('batch_number').value;
            const expiration_date = document.getElementById('expiration_date').value;
            
            const token = localStorage.getItem('prs_token');
            
            fetch('api.php/supply-inventory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    item_name: item_name,
                    item_type: item_type,
                    quantity: parseInt(quantity),
                    location: location,
                    batch_number: batch_number,
                    expiration_date: expiration_date || null
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
                    inventoryForm.reset();
                    
                    // Reload inventory data
                    loadInventoryData();
                    
                    // Show success message
                    alert('Inventory item added successfully!');
                } else {
                    alert(data.error || 'Failed to add inventory item');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                if (error.message === 'Permission denied') {
                    alert('You do not have permission to add inventory items. Only Government Officials and Merchants can add items.');
                } else if (error.message !== 'Unauthorized') {
                    alert('An error occurred. Please try again.');
                }
            });
        });
    }
    
    // Handle filters
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('locationFilter').addEventListener('input', applyFilters);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    
    // Handle save changes button in edit modal
    document.getElementById('saveInventoryChanges').addEventListener('click', saveInventoryChanges);
});

// Function to load inventory data
function loadInventoryData() {
    const token = localStorage.getItem('prs_token');
    
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
    .then(data => {
        // Save the data to use with filters
        window.inventoryData = data;
        
        // Display the data
        displayInventory(data);
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading inventory data:', error);
            const tableBody = document.getElementById('inventoryTable');
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error loading inventory data</td></tr>';
        }
    });
}

// Function to display inventory in the table
function displayInventory(items) {
    const tableBody = document.getElementById('inventoryTable');
    tableBody.innerHTML = '';
    
    if (items.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="9" class="text-center">No inventory items found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    items.forEach(item => {
        const row = document.createElement('tr');
        
        // Format dates
        const expDate = item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'N/A';
        const updatedDate = new Date(item.last_updated).toLocaleString();
        
        // Format item type for display
        let itemTypeDisplay = '';
        switch(item.item_type) {
            case 'vaccine':
                itemTypeDisplay = 'Vaccine';
                break;
            case 'medical_supply':
                itemTypeDisplay = 'Medical Supply';
                break;
            case 'ppe':
                itemTypeDisplay = 'PPE';
                break;
            case 'equipment':
                itemTypeDisplay = 'Equipment';
                break;
            default:
                itemTypeDisplay = item.item_type;
        }
        
        row.innerHTML = `
            <td>${item.inventory_id}</td>
            <td>${item.item_name}</td>
            <td>${itemTypeDisplay}</td>
            <td>${item.quantity}</td>
            <td>${item.location || 'N/A'}</td>
            <td>${item.batch_number || 'N/A'}</td>
            <td>${expDate}</td>
            <td>${updatedDate}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-btn admin-only" data-id="${item.inventory_id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-btn admin-only" data-id="${item.inventory_id}">Delete</button>
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
            if (confirm('Are you sure you want to delete this inventory item?')) {
                deleteInventoryItem(id);
            }
        });
    });
}

// Function to open edit modal with inventory data
function openEditModal(id) {
    const token = localStorage.getItem('prs_token');
    
    fetch(`api.php/supply-inventory/${id}`, {
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
    .then(item => {
        // Populate form fields
        document.getElementById('edit_inventory_id').value = item.inventory_id;
        document.getElementById('edit_item_name').value = item.item_name;
        document.getElementById('edit_item_type').value = item.item_type;
        document.getElementById('edit_quantity').value = item.quantity;
        document.getElementById('edit_location').value = item.location || '';
        document.getElementById('edit_batch_number').value = item.batch_number || '';
        
        // Format date for input
        if (item.expiration_date) {
            const expDate = new Date(item.expiration_date);
            const year = expDate.getFullYear();
            const month = String(expDate.getMonth() + 1).padStart(2, '0');
            const day = String(expDate.getDate()).padStart(2, '0');
            document.getElementById('edit_expiration_date').value = `${year}-${month}-${day}`;
        } else {
            document.getElementById('edit_expiration_date').value = '';
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('editInventoryModal'));
        modal.show();
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error loading inventory details:', error);
            alert('Error loading inventory details. Please try again.');
        }
    });
}

// Function to save inventory changes
function saveInventoryChanges() {
    const token = localStorage.getItem('prs_token');
    const id = document.getElementById('edit_inventory_id').value;
    
    const item = {
        item_name: document.getElementById('edit_item_name').value,
        item_type: document.getElementById('edit_item_type').value,
        quantity: parseInt(document.getElementById('edit_quantity').value),
        location: document.getElementById('edit_location').value,
        batch_number: document.getElementById('edit_batch_number').value,
        expiration_date: document.getElementById('edit_expiration_date').value || null
    };
    
    fetch(`api.php/supply-inventory/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify(item)
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
            const modal = bootstrap.Modal.getInstance(document.getElementById('editInventoryModal'));
            modal.hide();
            
            // Reload inventory data
            loadInventoryData();
            
            // Show success message
            alert('Inventory item updated successfully!');
        } else {
            alert(data.error || 'Failed to update inventory item');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (error.message === 'Permission denied') {
            alert('You do not have permission to update inventory items. Only Government Officials and Merchants can update items.');
        } else if (error.message !== 'Unauthorized') {
            alert('An error occurred. Please try again.');
        }
    });
}

// Function to delete an inventory item
function deleteInventoryItem(id) {
    const token = localStorage.getItem('prs_token');
    
    fetch(`api.php/supply-inventory/${id}`, {
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
            // Reload inventory data
            loadInventoryData();
            alert('Inventory item deleted successfully!');
        } else {
            alert(data.error || 'Failed to delete inventory item');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (error.message === 'Permission denied') {
            alert('You do not have permission to delete inventory items. Only Government Officials can delete items.');
        } else if (error.message !== 'Unauthorized') {
            alert('An error occurred. Please try again.');
        }
    });
}

// Function to apply filters to the inventory table
function applyFilters() {
    if (!window.inventoryData) return;
    
    const typeFilter = document.getElementById('typeFilter').value;
    const locationFilter = document.getElementById('locationFilter').value.toLowerCase();
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    
    // Filter the data
    const filteredData = window.inventoryData.filter(item => {
        // Type filter
        if (typeFilter && item.item_type !== typeFilter) {
            return false;
        }
        
        // Location filter
        if (locationFilter && (!item.location || !item.location.toLowerCase().includes(locationFilter))) {
            return false;
        }
        
        // Search input (check name and batch number)
        if (searchInput) {
            const searchFields = [
                item.item_name.toLowerCase(),
                item.batch_number ? item.batch_number.toLowerCase() : ''
            ];
            
            if (!searchFields.some(field => field.includes(searchInput))) {
                return false;
            }
        }
        
        return true;
    });
    
    // Display filtered data
    displayInventory(filteredData);
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
        
        // For supply management, only Government Officials and Merchants have full access
        if (currentUser.role_name !== 'Government Official' && currentUser.role_name !== 'Merchant') {
            // Hide the form for adding new inventory
            const addForm = document.querySelector('.inventory-form-container');
            if (addForm) {
                addForm.style.display = 'none';
            }
            
            // Hide admin-only elements
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
        
        // For Government Officials only - delete button access
        if (currentUser.role_name !== 'Government Official') {
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.style.display = 'none';
            });
        }
    })
    .catch(error => {
        if (error.message !== 'Unauthorized') {
            console.error('Error checking user role:', error);
        }
    });
}