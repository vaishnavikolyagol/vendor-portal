document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    checkVendorAuth();
    fetchOrders();
    fetchMenu();
});

const API_URL = '/api';

// Fetch Config for Twilio
async function loadConfig() {
    try {
        const response = await fetch(`${API_URL}/config`);
        const data = await response.json();
        const display = document.getElementById('twilioPhoneNumberDisplay');
        if (display && data.twilioPhoneNumber) {
            display.textContent = data.twilioPhoneNumber;
            document.getElementById('twilioSandboxBanner').style.display = 'block';
        }
    } catch(err) {
        console.warn('Failed to load config', err);
    }
}

function checkVendorAuth() {
    const token = localStorage.getItem('vendorToken');
    const vendorInfo = localStorage.getItem('vendorInfo');

    if (!token || !vendorInfo) {
        window.location.href = 'index.html'; // Redirect to home if not logged in
        return;
    }

    try {
        const vendor = JSON.parse(vendorInfo);
        document.getElementById('vendorName').textContent = `Store: ${vendor.storeName}`;
    } catch (e) {
        console.error('Error parsing vendor info', e);
    }
}

async function fetchOrders() {
    const tbody = document.getElementById('ordersBody');
    const token = localStorage.getItem('vendorToken');

    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/orders/vendor`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }

        const data = await response.json();

        if (response.ok) {
            tbody.innerHTML = ''; // Clear loading

            // Analytics logic
            let rev = 0; let total = 0; let pend = 0;
            if (data && data.length > 0) {
                total = data.length;
                data.forEach(o => {
                    if (o.status === 'Completed') rev += o.totalAmount;
                    if (o.status === 'Pending') pend++;
                });
            }
            document.getElementById('stat-revenue').textContent = `₹${rev}`;
            document.getElementById('stat-orders').textContent = total;
            document.getElementById('stat-pending').textContent = pend;

            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center">No orders found.</td></tr>`;
                return;
            }

            data.forEach(order => {
                const date = new Date(order.createdAt).toLocaleString();
                let statusClass = 'status-pending';
                if (order.status === 'Completed') statusClass = 'status-completed';
                if (order.status === 'Cancelled') statusClass = 'status-cancelled';

                let actionHtml = `<span class="status-badge ${statusClass}">${order.status}</span>`;

                // Show a dropdown to mark as completed if currently pending
                if (order.status === 'Pending') {
                    actionHtml += `
                        <select class="status-select" onchange="updateOrderStatus('${order._id}', this.value)">
                            <option value="" disabled selected>Mark as...</option>
                            <option value="Completed">Completed ✔</option>
                            <option value="Cancelled">Cancelled ✖</option>
                        </select>
                    `;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${order.customerName}</td>
                    <td>${order.customerPhone}</td>
                    <td>${order.productName}</td>
                    <td>${order.quantity}</td>
                    <td>₹${order.totalAmount}</td>
                    <td style="display: flex; align-items: center; gap: 10px;">${actionHtml}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center msg-error">Failed to load orders: ${data.error}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center msg-error">Network error. Failed to load orders.</td></tr>`;
    }
}

function logout() {
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorInfo');
    window.location.href = 'index.html';
}

async function updateOrderStatus(orderId, newStatus) {
    if (!newStatus) return;

    if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) {
        fetchOrders(); // reset the UI if cancelled
        return;
    }

    const token = localStorage.getItem('vendorToken');
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            fetchOrders(); // Refresh table on success
        } else {
            const data = await response.json();
            alert(`Failed to update status: ${data.error}`);
            fetchOrders();
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Network error while updating status.');
        fetchOrders();
    }
}

// --- Menu Management & Tabs ---
function switchVendorTab(tabName) {
    document.getElementById('vtab-orders').classList.remove('active');
    document.getElementById('vtab-menu').classList.remove('active');
    document.getElementById('vendorOrdersView').style.display = 'none';
    document.getElementById('vendorMenuView').style.display = 'none';

    if (tabName === 'orders') {
        document.getElementById('vtab-orders').classList.add('active');
        document.getElementById('vendorOrdersView').style.display = 'block';
        fetchOrders();
    } else if (tabName === 'menu') {
        document.getElementById('vtab-menu').classList.add('active');
        document.getElementById('vendorMenuView').style.display = 'block';
        fetchMenu();
    }
}

async function fetchMenu() {
    try {
        const response = await fetch(`${API_URL}/vendors`);
        const vendors = await response.json();
        const vendorInfo = JSON.parse(localStorage.getItem('vendorInfo'));
        const currentVendor = vendors.find(v => v._id === vendorInfo.id);

        const tbody = document.getElementById('menuBody');
        tbody.innerHTML = '';

        if (!currentVendor || !currentVendor.menu || currentVendor.menu.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center">Your menu is empty. Add products above.</td></tr>`;
            return;
        }

        currentVendor.menu.forEach(item => {
            const tr = document.createElement('tr');
            const imgHtml = item.image
                ? `<img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">`
                : '<span style="color: #666; font-size: 0.9rem;">No Image</span>';

            tr.innerHTML = `
                <td>${imgHtml}</td>
                <td>${item.name}</td>
                <td>₹${item.price}</td>
                <td><button class="btn btn-outline" style="border-color: #e74c3c; color: #e74c3c; padding: 0.2rem 0.5rem;" onclick="deleteMenuItem('${item._id}')">Delete</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Menu load error:', err);
    }
}

document.getElementById('addMenuForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Adding...';

    const name = document.getElementById('menuItemName').value;
    const price = document.getElementById('menuItemPrice').value;
    const imageInput = document.getElementById('menuItemImage');
    const token = localStorage.getItem('vendorToken');

    let base64Image = null;

    // Convert file to base64 if it exists
    if (imageInput.files && imageInput.files[0]) {
        const file = imageInput.files[0];

        // Ensure it's not too big (e.g. max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('File is too large! Please upload an image under 2MB.');
            btn.disabled = false;
            btn.textContent = 'Add Product';
            return;
        }

        const reader = new FileReader();
        base64Image = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    try {
        const response = await fetch(`${API_URL}/vendors/menu`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, price: Number(price), image: base64Image })
        });

        if (response.ok) {
            document.getElementById('addMenuForm').reset();
            fetchMenu();
        } else {
            alert('Failed to add item');
        }
    } catch (err) {
        console.error('Add menu err:', err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Product';
    }
});

async function deleteMenuItem(itemId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const token = localStorage.getItem('vendorToken');

    try {
        const response = await fetch(`${API_URL}/vendors/menu/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            fetchMenu();
        } else {
            alert('Failed to delete item');
        }
    } catch (err) {
        console.error('Delete menu err:', err);
    }
}
