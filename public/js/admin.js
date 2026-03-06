document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'index.html'; // Kick out if no admin token
        return;
    }

    // Automatically load the orders table first
    fetchAdminOrders();
    updateAdminAnalytics();
});

const API_URL = '/api';
let currentTab = 'orders';

function logoutAdmin() {
    localStorage.removeItem('adminToken');
    window.location.href = 'index.html';
}

function switchAdminTab(tabName) {
    currentTab = tabName;
    document.getElementById('tab-orders').classList.remove('active');
    document.getElementById('tab-vendors').classList.remove('active');

    document.getElementById('ordersView').style.display = 'none';
    document.getElementById('vendorsView').style.display = 'none';

    if (tabName === 'orders') {
        document.getElementById('tab-orders').classList.add('active');
        document.getElementById('ordersView').style.display = 'block';
        document.getElementById('sectionTitle').textContent = 'All Platform Orders';
        fetchAdminOrders();
    } else if (tabName === 'vendors') {
        document.getElementById('tab-vendors').classList.add('active');
        document.getElementById('vendorsView').style.display = 'block';
        document.getElementById('sectionTitle').textContent = 'Registered Vendors';
        fetchAdminVendors();
    }
}

function refreshData() {
    updateAdminAnalytics();
    if (currentTab === 'orders') fetchAdminOrders();
    else fetchAdminVendors();
}

async function updateAdminAnalytics() {
    const token = localStorage.getItem('adminToken');
    try {
        const [ordersRes, vendorsRes] = await Promise.all([
            fetch(`${API_URL}/admin/orders`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/admin/vendors`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (ordersRes.ok && vendorsRes.ok) {
            const orders = await ordersRes.json();
            const vendors = await vendorsRes.json();

            let revenue = 0;
            orders.forEach(o => {
                if (o.status === 'Completed') revenue += o.totalAmount;
            });

            document.getElementById('admin-stat-revenue').textContent = `₹${revenue}`;
            document.getElementById('admin-stat-orders').textContent = orders.length;
            document.getElementById('admin-stat-vendors').textContent = vendors.length;
        }
    } catch (e) {
        console.error('Failed to update analytics:', e);
    }
}

async function fetchAdminOrders() {
    const tbody = document.getElementById('adminOrdersBody');
    const token = localStorage.getItem('adminToken');

    try {
        const response = await fetch(`${API_URL}/admin/orders`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            logoutAdmin();
            return;
        }

        const data = await response.json();

        if (response.ok) {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center">No orders across the platform.</td></tr>`;
                return;
            }

            data.forEach(order => {
                const date = new Date(order.createdAt).toLocaleString();
                const statusClass = order.status === 'Completed' ? 'status-completed' : (order.status === 'Cancelled' ? 'status-cancelled' : 'status-pending');
                const vendorName = order.vendorId ? `${order.vendorId.storeName} (${order.vendorId.name})` : 'Unknown Vendor';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${date}</td>
                    <td style="color: #4facfe; font-weight: 500;">${vendorName}</td>
                    <td>
                        <strong>${order.customerName}</strong><br>
                        <small style="color: #a0a5b8">${order.customerPhone}</small>
                    </td>
                    <td>
                        ${order.productName}<br>
                        <small style="color: #a0a5b8">Qty: ${order.quantity}</small>
                    </td>
                    <td>₹${order.totalAmount}</td>
                    <td><span class="status-badge ${statusClass}">${order.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center msg-error">Network error.</td></tr>`;
    }
}

async function fetchAdminVendors() {
    const tbody = document.getElementById('adminVendorsBody');
    const token = localStorage.getItem('adminToken');

    try {
        const response = await fetch(`${API_URL}/admin/vendors`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            logoutAdmin();
            return;
        }

        const data = await response.json();

        if (response.ok) {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center">No vendors registered yet.</td></tr>`;
                return;
            }

            data.forEach(vendor => {
                const date = new Date(vendor.createdAt).toLocaleDateString();

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${vendor.name}</td>
                    <td style="color: #4facfe; font-weight: 500;">${vendor.storeName}</td>
                    <td>${vendor.email}</td>
                    <td>${vendor.phoneNumber}</td>
                    <td>
                        <button class="btn btn-outline" style="border-color: #e74c3c; color: #e74c3c; padding: 0.2rem 0.5rem;" onclick="deleteVendor('${vendor._id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error fetching admin vendors:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center msg-error">Network error.</td></tr>`;
    }
}

// Add New Vendor
document.getElementById('adminAddVendorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('adminAddVendorMsg');
    const token = localStorage.getItem('adminToken');

    const payload = {
        name: document.getElementById('adminVendorName').value,
        storeName: document.getElementById('adminVendorStore').value,
        phoneNumber: document.getElementById('adminVendorPhone').value,
        email: document.getElementById('adminVendorEmail').value,
        password: document.getElementById('adminVendorPassword').value
    };

    try {
        const response = await fetch(`${API_URL}/admin/vendors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok) {
            msg.textContent = 'Vendor added successfully!';
            msg.className = 'message msg-success';
            document.getElementById('adminAddVendorForm').reset();
            fetchAdminVendors();
            updateAdminAnalytics();
        } else {
            msg.textContent = data.error || 'Failed to add vendor';
            msg.className = 'message msg-error';
        }
    } catch (err) {
        msg.textContent = 'Network error.';
        msg.className = 'message msg-error';
    }
});

// Delete Vendor
async function deleteVendor(vendorId) {
    if (!confirm('Are you sure you want to delete this vendor and all their orders?')) return;

    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch(`${API_URL}/admin/vendors/${vendorId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            fetchAdminVendors();
            updateAdminAnalytics();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete vendor');
        }
    } catch (err) {
        console.error('Error deleting vendor:', err);
        alert('Network error while deleting vendor');
    }
}
