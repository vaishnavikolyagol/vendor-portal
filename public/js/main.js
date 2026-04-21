document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadVendors();
    checkAuth();
});

// API Config
const API_URL = '/api';

// Fetch Config
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

let globalVendors = [];
let cartItems = [];

// --- Vendor Loading (Customer Side) ---
async function loadVendors() {
    try {
        const response = await fetch(`${API_URL}/vendors`);
        const vendors = await response.json();
        globalVendors = vendors; // Store for menu lookups

        const select = document.getElementById('vendorSelect');
        const reviewSelect = document.getElementById('reviewVendorSelect');
        const vendorAppList = document.getElementById('vendorAppList');

        select.innerHTML = '<option value="" disabled selected>Select a vendor...</option>';
        if(reviewSelect) reviewSelect.innerHTML = '<option value="" disabled selected>Select a vendor...</option>';
        if(vendorAppList) vendorAppList.innerHTML = '';

        vendors.forEach(v => {
            const option = document.createElement('option');
            option.value = v._id;
            option.textContent = `${v.storeName} (${v.name})`;
            select.appendChild(option);
            
            if(reviewSelect) {
                const opt2 = document.createElement('option');
                opt2.value = v._id;
                opt2.textContent = `${v.storeName} (${v.name})`;
                reviewSelect.appendChild(opt2);
            }

            if(vendorAppList) {
                const card = document.createElement('div');
                card.className = 'vendor-app-card';
                // Pick a random emoji to mimic realistic store icons based on index
                const emojis = ['🏬', '🍎', '🥩', '🏪', '🥐', '🥦'];
                const emoji = emojis[v._id.charCodeAt(v._id.length-1) % emojis.length] || '🏬';

                card.innerHTML = `
                    <div class="vendor-app-icon">${emoji}</div>
                    <div class="vendor-app-name">${v.storeName}</div>
                    <div class="vendor-app-owner">${v.name}</div>
                `;
                card.onclick = () => {
                    document.querySelectorAll('.vendor-app-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    select.value = v._id;
                    select.dispatchEvent(new Event('change'));
                };
                vendorAppList.appendChild(card);
            }
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
    const grid = document.getElementById('productGrid');
    
    // Clear cart if vendor changes
    cartItems = [];
    renderCart();

    if (vendor && vendor.menu && vendor.menu.length > 0) {
        grid.style.display = 'grid';
        grid.innerHTML = '';
        vendor.menu.forEach((item, index) => {
            const imgHtml = item.image ? `<img src="${item.image}" class="product-img" alt="${item.name}">` : `<div class="product-img" style="display:flex; align-items:center; justify-content:center; background:#f5f5f5; color:#999; font-size:2rem;">🛒</div>`;
            
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                ${imgHtml}
                <div class="product-info">
                    <div class="product-title">${item.name}</div>
                    <div class="product-price">₹${item.price}</div>
                    <button type="button" class="product-add-btn" onclick="addToCart('${item.name.replace(/'/g, "\\'")}', ${item.price})">Add to Cart</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } else {
        grid.style.display = 'block';
        grid.innerHTML = '<p style="text-align:center; padding: 2rem;">No products available</p>';
    }
});

// --- Cart Logic ---
window.addToCart = function(name, price) {
    // Check if it already exists in cart to increment qty instead
    const existing = cartItems.find(i => i.name === name);
    if (existing) {
        existing.qty += 1;
        existing.amount = existing.qty * price;
    } else {
        cartItems.push({ name, qty: 1, amount: price, unitPrice: price });
    }
    
    renderCart();
    
    // Create a mini toast effect or alert
    const grid = document.getElementById('productGrid');
    grid.style.opacity = '0.5';
    setTimeout(() => grid.style.opacity = '1', 150);
};

window.decreaseCartQty = function(index) {
    const item = cartItems[index];
    if (item.qty > 1) {
        item.qty -= 1;
        item.amount = item.qty * item.unitPrice;
    } else {
        cartItems.splice(index, 1);
    }
    renderCart();
};

function renderCart() {
    const container = document.getElementById('cartContainer');
    const list = document.getElementById('cartList');
    const grandTotal = document.getElementById('cartGrandTotal');
    const placeBtn = document.getElementById('placeOrderBtn');
    
    if (cartItems.length === 0) {
        container.style.display = 'none';
        placeBtn.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    placeBtn.style.display = 'block';
    
    list.innerHTML = '';
    let total = 0;
    
    cartItems.forEach((item, index) => {
        total += item.amount;
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        li.style.padding = '0.5rem 0';
        li.innerHTML = `
            <div style="display:flex; flex-direction:column; width:100%;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-weight:500;">
                    <span>${item.name}</span>
                    <span>₹${item.amount}</span>
                </div>
                <div style="display:flex; align-items:center;">
                    <button type="button" class="btn btn-outline" style="padding:0.1rem 0.5rem; border-color:#ccc; color:#333;" onclick="decreaseCartQty(${index})">-</button>
                    <span style="margin:0 0.8rem; color:#333;">${item.qty}</span>
                    <button type="button" class="btn btn-outline" style="padding:0.1rem 0.5rem; border-color:#ccc; color:#333;" onclick="addToCart('${item.name.replace(/'/g, "\\'")}', ${item.unitPrice})">+</button>
                    <button type="button" class="btn btn-outline" style="padding:0.1rem 0.4rem; margin-left:auto; border-color:#e74c3c; color:#e74c3c;" onclick="removeCartItem(${index})">Remove</button>
                </div>
            </div>
        `;
        list.appendChild(li);
    });
    
    grandTotal.textContent = total;
}

window.removeCartItem = function(index) {
    cartItems.splice(index, 1);
    renderCart();
};

// --- Order Placement ---
document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('placeOrderBtn');
    const msg = document.getElementById('orderMessage');

    btn.disabled = true;
    btn.textContent = 'Processing...';
    msg.textContent = '';
    msg.className = 'message';

    if (cartItems.length === 0) {
        msg.textContent = 'Please add products to your order first.';
        msg.classList.add('msg-error');
        btn.disabled = false;
        btn.textContent = 'Place Order';
        return;
    }

    const orderData = {
        vendorId: document.getElementById('vendorSelect').value,
        customerName: document.getElementById('cName').value,
        customerPhone: document.getElementById('cPhone').value,
        productName: cartItems.map(i => `${i.name} (x${i.qty})`).join(', '),
        quantity: cartItems.reduce((acc, curr) => acc + curr.qty, 0),
        totalAmount: cartItems.reduce((acc, curr) => acc + curr.amount, 0)
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
            cartItems = [];
            renderCart();
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
    // Top Tabs
    document.getElementById('ctab-place').classList.remove('active');
    document.getElementById('ctab-track').classList.remove('active');
    if(document.getElementById('ctab-reviews')) document.getElementById('ctab-reviews').classList.remove('active');
    
    // Bottom Nav Tabs
    if(document.getElementById('bnav-place')) document.getElementById('bnav-place').classList.remove('active');
    if(document.getElementById('bnav-track')) document.getElementById('bnav-track').classList.remove('active');
    if(document.getElementById('bnav-reviews')) document.getElementById('bnav-reviews').classList.remove('active');
    
    document.getElementById('customerPlaceView').style.display = 'none';
    document.getElementById('customerTrackView').style.display = 'none';
    if(document.getElementById('customerReviewsView')) document.getElementById('customerReviewsView').style.display = 'none';

    if (tab === 'place') {
        document.getElementById('ctab-place').classList.add('active');
        if(document.getElementById('bnav-place')) document.getElementById('bnav-place').classList.add('active');
        document.getElementById('customerPlaceView').style.display = 'block';
    } else if (tab === 'track') {
        document.getElementById('ctab-track').classList.add('active');
        if(document.getElementById('bnav-track')) document.getElementById('bnav-track').classList.add('active');
        document.getElementById('customerTrackView').style.display = 'block';
    } else if (tab === 'reviews') {
        document.getElementById('ctab-reviews').classList.add('active');
        if(document.getElementById('bnav-reviews')) document.getElementById('bnav-reviews').classList.add('active');
        document.getElementById('customerReviewsView').style.display = 'block';
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

// --- Reviews Logic ---
function renderVendorReviews(vendorId) {
    const list = document.getElementById('reviewsList');
    list.innerHTML = '';
    const vendor = globalVendors.find(v => v._id === vendorId);
    
    if (!vendor || !vendor.reviews || vendor.reviews.length === 0) {
        list.innerHTML = '<p style="color: #bbb;">No reviews yet for this vendor. Be the first!</p>';
        return;
    }
    
    vendor.reviews.slice().reverse().forEach(r => {
        const div = document.createElement('div');
        div.style.background = 'rgba(255,255,255,0.05)';
        div.style.padding = '1rem';
        div.style.borderRadius = '8px';
        div.style.marginBottom = '1rem';
        
        let stars = '';
        for(let i=0; i<5; i++) stars += (i < r.rating) ? '⭐' : '☆';
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>${r.customerName}</strong>
                <span>${stars}</span>
            </div>
            <p style="margin: 0; color: #ddd; font-size: 0.95rem;">${r.comment || ''}</p>
        `;
        list.appendChild(div);
    });
}

document.getElementById('reviewVendorSelect')?.addEventListener('change', (e) => {
    const vendorId = e.target.value;
    document.getElementById('vendorReviewsDisplay').style.display = 'block';
    renderVendorReviews(vendorId);
});

document.getElementById('writeReviewForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const vendorId = document.getElementById('reviewVendorSelect').value;
    const btn = document.getElementById('submitReviewBtn');
    const msg = document.getElementById('reviewMessage');
    
    btn.disabled = true;
    msg.textContent = 'Submitting...';
    
    const payload = {
        customerName: document.getElementById('reviewName').value,
        rating: parseInt(document.getElementById('reviewRating').value),
        comment: document.getElementById('reviewComment').value
    };
    
    try {
        const response = await fetch(`${API_URL}/vendors/${vendorId}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update global record
            const vendor = globalVendors.find(v => v._id === vendorId);
            if (vendor) vendor.reviews = data.reviews;
            
            msg.textContent = 'Review submitted successfully!';
            msg.className = 'message msg-success';
            document.getElementById('writeReviewForm').reset();
            renderVendorReviews(vendorId);
        } else {
            const errData = await response.json();
            msg.textContent = errData.error || 'Failed to submit review.';
            msg.className = 'message msg-error';
        }
    } catch(err) {
        msg.textContent = 'Network error.';
        msg.className = 'message msg-error';
    } finally {
        btn.disabled = false;
        setTimeout(() => msg.textContent = '', 3000);
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

// --- Share App Logic ---
async function shareApp() {
    const shareData = {
        title: 'VendorPortal',
        text: 'Order fresh products directly from local stores on VendorPortal!',
        url: window.location.href
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback for desktop browsers without Web Share API
            await navigator.clipboard.writeText(window.location.href);
            alert('App Link copied to clipboard!');
        }
    } catch (err) {
        console.error('Error sharing app:', err);
    }
}
