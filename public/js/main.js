document.addEventListener('DOMContentLoaded', () => {
    loadVendors();
    checkAuth();
});

// API Config
const API_URL = '/api';

let globalVendors = [];

// --- Vendor Loading (Customer Side) ---
async function loadVendors() {
    try {
        const response = await fetch(`${API_URL}/vendors`);
        const vendors = await response.json();
        globalVendors = vendors; // Store for menu lookups

        const select = document.getElementById('vendorSelect');
        select.innerHTML = '<option value="" disabled selected>Select a vendor...</option>';

        vendors.forEach(v => {
            const option = document.createElement('option');
            option.value = v._id;
            option.textContent = `${v.storeName} (${v.name})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading vendors:', error);
        document.getElementById('vendorSelect').innerHTML = '<option value="" disabled>Failed to load vendors</option>';
    }
}

// Populate Products when Vendor is selected
document.getElementById('vendorSelect')?.addEventListener('change', (e) => {
    const vendorId = e.target.value;
    const vendor = globalVendors.find(v => v._id === vendorId);
    const prodSelect = document.getElementById('productSelect');

    prodSelect.innerHTML = '<option value="" disabled selected>Select a product...</option>';

    if (vendor && vendor.menu && vendor.menu.length > 0) {
        prodSelect.disabled = false;
        vendor.menu.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.name;
            opt.dataset.price = item.price;
            opt.textContent = `${item.name} - ₹${item.price}`;
            prodSelect.appendChild(opt);
        });
    } else {
        prodSelect.innerHTML = '<option value="" disabled selected>No products available</option>';
        prodSelect.disabled = true;
    }
    calculateTotal();
});

// Calculate Total based on product and quantity
function calculateTotal() {
    const prodSelect = document.getElementById('productSelect');
    const qtyInput = document.getElementById('quantity');
    const amountInput = document.getElementById('amount');

    if (prodSelect.selectedIndex > 0) {
        const selectedOption = prodSelect.options[prodSelect.selectedIndex];
        const price = parseFloat(selectedOption.dataset.price);
        const qty = parseInt(qtyInput.value) || 1;
        amountInput.value = (price * qty).toFixed(0);
    } else {
        amountInput.value = '';
    }
}

document.getElementById('productSelect')?.addEventListener('change', calculateTotal);
document.getElementById('quantity')?.addEventListener('input', calculateTotal);

// --- Order Placement ---
document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('placeOrderBtn');
    const msg = document.getElementById('orderMessage');

    btn.disabled = true;
    btn.textContent = 'Processing...';
    msg.textContent = '';
    msg.className = 'message';

    const orderData = {
        vendorId: document.getElementById('vendorSelect').value,
        customerName: document.getElementById('cName').value,
        customerPhone: document.getElementById('cPhone').value,
        productName: document.getElementById('productSelect').value,
        quantity: parseInt(document.getElementById('quantity').value),
        totalAmount: parseInt(document.getElementById('amount').value)
    };

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (response.ok) {
            msg.textContent = 'Order Placed Successfully!';
            msg.classList.add('msg-success');
            document.getElementById('orderForm').reset();
        } else {
            msg.textContent = data.error || 'Failed to place order.';
            msg.classList.add('msg-error');
        }
    } catch (error) {
        console.error('Order error:', error);
        msg.textContent = 'Network error. Please try again.';
        msg.classList.add('msg-error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Place Order';
    }
});

// --- Customer Tabs & Tracking ---
function switchCustomerTab(tab) {
    document.getElementById('ctab-place').classList.remove('active');
    document.getElementById('ctab-track').classList.remove('active');
    document.getElementById('customerPlaceView').style.display = 'none';
    document.getElementById('customerTrackView').style.display = 'none';

    if (tab === 'place') {
        document.getElementById('ctab-place').classList.add('active');
        document.getElementById('customerPlaceView').style.display = 'block';
    } else {
        document.getElementById('ctab-track').classList.add('active');
        document.getElementById('customerTrackView').style.display = 'block';
    }
}

document.getElementById('trackForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phoneInput = document.getElementById('trackPhone').value;
    const msg = document.getElementById('trackMessage');
    const container = document.getElementById('trackResultsContainer');
    const tbody = document.getElementById('trackOrdersBody');
    const btn = document.getElementById('trackOrderBtn');

    btn.disabled = true;
    btn.textContent = 'Searching...';
    msg.textContent = '';

    // Sanitize phone number (remove spaces, hyphens) to match DB storage 
    // Wait, the DB stores exactly what they type unless we sanitize before saving.
    // In orders.js we just save req.body.customerPhone.
    // We updated notificationService to replace spaces when sending, but let's query exactly what they type.
    const sanitizedPhone = phoneInput.trim();

    try {
        const response = await fetch(`${API_URL}/orders/track/${encodeURIComponent(sanitizedPhone)}`);
        const data = await response.json();

        if (response.ok) {
            tbody.innerHTML = '';
            if (data.length === 0) {
                container.style.display = 'none';
                msg.textContent = 'No recent orders found for this phone number.';
                msg.className = 'message msg-error';
            } else {
                container.style.display = 'block';
                msg.textContent = '';
                data.forEach(order => {
                    const date = new Date(order.createdAt).toLocaleDateString() + ' ' + new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    let badgeClass = 'badge-pending';
                    if (order.status === 'Completed') badgeClass = 'badge-completed';
                    if (order.status === 'Cancelled') badgeClass = 'badge-cancelled';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${date}</td>
                        <td style="color: #4facfe;">${order.vendorId ? order.vendorId.storeName : 'Unknown Vendor'}</td>
                        <td style="font-weight: 500;">${order.productName} (x${order.quantity})</td>
                        <td>₹${order.totalAmount}</td>
                        <td><span class="status-badge ${badgeClass}">${order.status}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } else {
            msg.textContent = data.error || 'Failed to track orders.';
            msg.className = 'message msg-error';
        }
    } catch (error) {
        msg.textContent = 'Network error.';
        msg.className = 'message msg-error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Track';
    }
});

// --- Modal Logic ---
const modal = document.getElementById('authModal');

function toggleAuthModal() {
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
        // Let CSS animation finish potentially
        setTimeout(() => modal.style.display = 'none', 300);
    } else {
        modal.style.display = 'flex';
        // Add minimal delay for display flex to apply before opacity transition
        setTimeout(() => modal.classList.add('active'), 10);
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => {
        f.style.display = 'none';
        f.classList.remove('active');
    });

    if (tab === 'login') {
        document.querySelector('.tab-buttons .tab-btn:nth-child(1)').classList.add('active');
        const f = document.getElementById('loginForm');
        f.style.display = 'block';
        setTimeout(() => f.classList.add('active'), 50);
    } else {
        document.querySelector('.tab-buttons .tab-btn:nth-child(2)').classList.add('active');
        const f = document.getElementById('registerForm');
        f.style.display = 'block';
        setTimeout(() => f.classList.add('active'), 50);
    }
}

// --- Auth Logic ---
function checkAuth() {
    const token = localStorage.getItem('vendorToken');
    if (token) {
        document.getElementById('navVendorBtn').textContent = 'Dashboard';
        document.getElementById('navVendorBtn').onclick = () => {
            window.location.href = 'vendor-dashboard.html';
        };
    }
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const msg = document.getElementById('loginMessage');

    btn.disabled = true;
    msg.textContent = '';

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('vendorToken', data.token);
            localStorage.setItem('vendorInfo', JSON.stringify(data.vendor));
            window.location.href = 'vendor-dashboard.html';
        } else {
            msg.textContent = data.error;
            msg.className = 'message msg-error';
            btn.disabled = false;
        }
    } catch (error) {
        msg.textContent = 'Network error.';
        msg.className = 'message msg-error';
        btn.disabled = false;
    }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const msg = document.getElementById('regMessage');

    btn.disabled = true;
    msg.textContent = '';

    const payload = {
        name: document.getElementById('regName').value,
        storeName: document.getElementById('regStore').value,
        phoneNumber: document.getElementById('regPhone').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value
    };

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            msg.textContent = 'Registration successful! Please login.';
            msg.className = 'message msg-success';
            document.getElementById('registerForm').reset();
            setTimeout(() => switchTab('login'), 2000);
        } else {
            msg.textContent = data.error;
            msg.className = 'message msg-error';
        }
    } catch (error) {
        msg.textContent = 'Network error.';
        msg.className = 'message msg-error';
    } finally {
        btn.disabled = false;
    }
});

// Admin Login Logic
async function promptAdminLogin() {
    const email = prompt("Enter Admin Email:");
    if (!email) return;
    const password = prompt("Enter Admin Password:");
    if (!password) return;

    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('adminToken', data.token);
            window.location.href = 'admin-dashboard.html';
        } else {
            alert(data.error || 'Invalid credentials');
        }
    } catch (error) {
        alert('Network error');
    }
}

// Secret Keyboard Shortcut for Admin Login (Ctrl+Shift+A)
document.addEventListener('keydown', (e) => {
    // Check if Ctrl (or Cmd on Mac), Shift, and 'A' are pressed simultaneously
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault(); // Prevent default browser action just in case
        promptAdminLogin();
    }
});
