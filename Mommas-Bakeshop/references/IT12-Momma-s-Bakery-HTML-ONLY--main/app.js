/**
 * app.js - Momma's Bakeshop Application Logic
 */

// ==========================================
// DATA STORE (Hardcoded Sample Data)
// ==========================================
const DB = {
    users: [
        { id: 1, name: "Admin (Owner)", username: "admin", password: "admin123", role: "admin", status: "active" },
        { id: 2, name: "Maria", username: "cashier", password: "cashier123", role: "cashier", status: "active" },
        { id: 3, name: "Lorna", username: "clerk", password: "clerk123", role: "clerk", status: "active" }
    ],
    products: [
        { id: "P001", name: "Pandesal", price: 5, icon: "🥖" },
        { id: "P002", name: "Coco Bread", price: 8, icon: "🍞" },
        { id: "P003", name: "Monggo Bread", price: 8, icon: "🍘" },
        { id: "P004", name: "Spanish Bread", price: 10, icon: "🥐" },
        { id: "P005", name: "Empanada", price: 15, icon: "🥟" },
        { id: "P006", name: "Siopao", price: 20, icon: "🥟" },
        { id: "P007", name: "Crinkles", price: 12, icon: "🍪" }
    ],
    rawMaterials: [
        { id: "RM001", name: "All-Purpose Flour", category: "Dry Goods", stock: 15, unit: "sacks", threshold: 10 },
        { id: "RM002", name: "Eggs", category: "Dairy", stock: 8, unit: "trays", threshold: 5 },
        { id: "RM003", name: "Sugar", category: "Dry Goods", stock: 2, unit: "kg", threshold: 5 }, // Low stock!
        { id: "RM004", name: "Butter", category: "Dairy", stock: 12, unit: "kg", threshold: 5 },
        { id: "RM005", name: "Yeast", category: "Baking", stock: 4, unit: "packs", threshold: 10 } // Low stock!
    ],
    clients: [
        { id: "C001", name: "Alorica Davao", contact: "0917-123-4567" },
        { id: "C002", name: "Brokenshire Canteen", contact: "0918-987-6543" }
    ]
};

// ==========================================
// APPLICATION STATE
// ==========================================
const AppState = {
    currentUser: null,
    currentView: 'dashboard',
    cart: [],

    // NAVIGATION STRUCTURE based on Roles
    navStructure: [
        {
            section: "Dashboard",
            roles: ['admin', 'cashier', 'clerk'],
            items: [
                { id: 'dashboard', label: "Overview", icon: "📊" }
            ]
        },
        {
            section: "Point of Sale",
            roles: ['admin', 'cashier'],
            items: [
                { id: 'pos-cash', label: "Cash Sale", icon: "🛒" },
                { id: 'pos-b2b', label: "B2B Consignment", icon: "📦" },
                { id: 'pos-spoilage', label: "Record Spoilage", icon: "🗑️" }
            ]
        },
        {
            section: "Inventory",
            roles: ['admin', 'clerk'],
            items: [
                { id: 'inv-levels', label: "Inventory Levels", icon: "📋" },
                { id: 'inv-stockin', label: "Stock-In (Raw)", icon: "📥" },
                { id: 'inv-stockout', label: "Stock-Out (Kitchen)", icon: "📤" },
                { id: 'inv-production', label: "Production Batch", icon: "🧑‍🍳" }
            ]
        },
        {
            section: "Administration",
            roles: ['admin'],
            items: [
                { id: 'reports', label: "Reports", icon: "📈" },
                { id: 'users', label: "User Management", icon: "👥" }
            ]
        }
    ]
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Setup login event listener
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Setup logout event listener
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Set current date
    updateDateDisplay();

    // Check if session exists (simulated)
    const storedUser = sessionStorage.getItem('mb_user');
    if (storedUser) {
        AppState.currentUser = JSON.parse(storedUser);
        initializeDashboard();
    }

    // Setup Forms
    document.getElementById('form-pos-b2b')?.addEventListener('submit', handleB2BSubmit);
    document.getElementById('form-pos-spoilage')?.addEventListener('submit', handleSpoilageSubmit);
    document.getElementById('form-inv-stockin')?.addEventListener('submit', handleInvSubmit);
    document.getElementById('form-inv-stockout')?.addEventListener('submit', handleInvSubmit);
    document.getElementById('form-inv-production')?.addEventListener('submit', handleInvSubmit);

    document.getElementById('create-user-form')?.addEventListener('submit', handleCreateUserSubmit);

    // Setup Create User Button
    document.getElementById('btn-show-create-user')?.addEventListener('click', () => {
        navigateTo('users-create', 'Create New User');
    });

    // Setup Cash Sale Inputs
    document.getElementById('pos-tendered')?.addEventListener('input', calculatePosChange);
    document.getElementById('btn-process-sale')?.addEventListener('click', processPosSale);

    document.getElementById('b2b-product')?.addEventListener('change', calculateB2BTotal);
    document.getElementById('b2b-qty')?.addEventListener('input', calculateB2BTotal);
});

function updateDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-display').textContent = new Date().toLocaleDateString('en-US', options);
}

// ==========================================
// AUTHENTICATION
// ==========================================
function handleLogin(e) {
    e.preventDefault();
    const userIn = document.getElementById('username').value.trim();
    const passIn = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    const user = DB.users.find(u => u.username === userIn && u.password === passIn);

    if (user) {
        if (user.status !== 'active') {
            errorEl.textContent = "Account deactivated.";
            errorEl.classList.remove('hidden');
            return;
        }

        // Success
        errorEl.classList.add('hidden');
        AppState.currentUser = user;
        sessionStorage.setItem('mb_user', JSON.stringify(user));

        initializeDashboard();
    } else {
        errorEl.textContent = "Invalid username or password";
        errorEl.classList.remove('hidden');
    }
}

function handleLogout() {
    AppState.currentUser = null;
    sessionStorage.removeItem('mb_user');

    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('login-view').classList.add('flex-center');

    document.getElementById('login-form').reset();
}

// ==========================================
// DASHBOARD & NAVIGATION
// ==========================================
function initializeDashboard() {
    // 1. Switch Views
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('flex-center');
    document.getElementById('app-view').classList.remove('hidden');

    // 2. Setup User Info
    const user = AppState.currentUser;
    document.getElementById('current-user-name').textContent = user.name;
    document.getElementById('welcome-name').textContent = user.name.split(' ')[0];

    let roleLabel = "Administrator";
    let badgeClass = "admin";
    if (user.role === 'cashier') { roleLabel = "Cashier"; badgeClass = "cashier"; }
    if (user.role === 'clerk') { roleLabel = "Inventory Clerk"; badgeClass = "clerk"; }

    const roleEl = document.getElementById('current-user-role');
    roleEl.textContent = roleLabel;
    roleEl.className = `user-role badge ${badgeClass}`;

    document.getElementById('current-user-avatar').textContent = user.name.substring(0, 2).toUpperCase();

    // 3. Render Sidebar
    renderSidebarNav();

    // 4. Populate Dashboard Widgets
    populateDashboardStats();

    // 5. Navigate to default view
    navigateTo('dashboard');
}

function renderSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav');
    navContainer.innerHTML = '';
    const userRole = AppState.currentUser.role;

    AppState.navStructure.forEach(section => {
        // Check section role permissions
        if (section.roles.includes(userRole)) {

            // Render section Header
            const secTitle = document.createElement('div');
            secTitle.className = 'nav-section-title';
            secTitle.textContent = section.section;
            navContainer.appendChild(secTitle);

            // Render Items
            const itemsGroup = document.createElement('div');
            itemsGroup.className = 'nav-section';

            section.items.forEach(item => {
                const link = document.createElement('a');
                link.className = `nav-item ${AppState.currentView === item.id ? 'active' : ''}`;
                link.id = `nav-${item.id}`;
                link.innerHTML = `<span class="nav-icon">${item.icon}</span> <span>${item.label}</span>`;
                link.onclick = (e) => {
                    e.preventDefault();
                    navigateTo(item.id, item.label);
                };
                itemsGroup.appendChild(link);
            });

            navContainer.appendChild(itemsGroup);
        }
    });
}

function navigateTo(viewId, title) {
    // Update active state in nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navItem = document.getElementById(`nav-${viewId}`);
    if (navItem) navItem.classList.add('active');

    // Update Page Title
    if (title) document.getElementById('page-title').textContent = title;

    // Hide all views
    document.querySelectorAll('.module-view').forEach(el => el.classList.add('hidden'));

    // Show target view
    const viewEl = document.getElementById(`module-${viewId}`);
    if (viewEl) {
        viewEl.classList.remove('hidden');
        AppState.currentView = viewId;

        // Trigger specific initializations
        if (viewId === 'pos-cash') initPosCash();
        if (viewId === 'pos-b2b') initPosB2B();
        if (viewId === 'pos-spoilage') initPosSpoilage();

        if (viewId === 'inv-levels') initInvLevels();
        if (viewId === 'inv-stockin') populateMaterialDropdown('stockin-material');
        if (viewId === 'inv-stockout') populateMaterialDropdown('stockout-material');
        if (viewId === 'inv-production') populateProductDropdown('prod-product');

        if (viewId === 'reports') initReports();
        if (viewId === 'users') initUsers();
    } else {
        console.warn(`View ID ${viewId} not found.`);
    }
}

// ==========================================
// MODULE INITIALIZERS (Stubs for now)
// ==========================================
function populateDashboardStats() {
    const statsContainer = document.getElementById('dashboard-stats');
    statsContainer.innerHTML = '';
    const role = AppState.currentUser.role;

    const stats = [];
    if (role === 'admin' || role === 'cashier') {
        stats.push({ icon: '🛒', class: 'primary', value: '₱4,250.00', label: 'Today\'s Sales' });
        stats.push({ icon: '🧾', class: 'success', value: '32', label: 'Transactions' });
    }
    if (role === 'admin' || role === 'clerk') {
        // Count low stock
        const lowStock = DB.rawMaterials.filter(rm => rm.stock <= rm.threshold).length;
        stats.push({ icon: '⚠️', class: lowStock > 0 ? 'warning' : 'success', value: lowStock.toString(), label: 'Low Stock Items' });
        stats.push({ icon: '📦', class: 'primary', value: '5', label: 'Batches Milled Today' });
    }

    stats.forEach(s => {
        statsContainer.innerHTML += `
            <div class="stat-card">
                <div class="stat-icon ${s.class}">${s.icon}</div>
                <div class="stat-info">
                    <div class="stat-value">${s.value}</div>
                    <div class="stat-label">${s.label}</div>
                </div>
            </div>
        `;
    });
}

function initPosCash() {
    console.log("POS Initialized");
    const grid = document.getElementById('pos-product-list');
    grid.innerHTML = '';

    DB.products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `
            <div class="product-icon">${p.icon}</div>
            <div class="product-name">${p.name}</div>
            <div class="product-price">₱${p.price.toFixed(2)}</div>
        `;
        div.onclick = () => addToCart(p);
        grid.appendChild(div);
    });

    renderCart();
}

function addToCart(product) {
    const existing = AppState.cart.find(item => item.id === product.id);
    if (existing) {
        existing.qty++;
    } else {
        AppState.cart.push({ ...product, qty: 1 });
    }
    renderCart();
}

function updateCartQty(id, delta) {
    const item = AppState.cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            AppState.cart = AppState.cart.filter(i => i.id !== id);
        }
    }
    renderCart();
}

function renderCart() {
    const cartContainer = document.getElementById('pos-cart-items');

    if (AppState.cart.length === 0) {
        cartContainer.innerHTML = '<div class="empty-state" style="padding:2rem;text-align:center;color:#6b7280;">No items added yet</div>';
        document.getElementById('pos-subtotal').textContent = '₱0.00';
        document.getElementById('pos-total').textContent = '₱0.00';
        document.getElementById('pos-change').textContent = '₱0.00';
        document.getElementById('btn-process-sale').disabled = true;
        return;
    }

    cartContainer.innerHTML = '';
    let total = 0;

    AppState.cart.forEach(item => {
        const itemTotal = item.qty * item.price;
        total += itemTotal;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₱${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
            </div>
            <div class="cart-item-total">₱${itemTotal.toFixed(2)}</div>
        `;
        cartContainer.appendChild(div);
    });

    document.getElementById('pos-subtotal').textContent = `₱${total.toFixed(2)}`;
    document.getElementById('pos-total').textContent = `₱${total.toFixed(2)}`;

    calculatePosChange();
    document.getElementById('btn-process-sale').disabled = false;
}

function calculatePosChange() {
    if (AppState.cart.length === 0) return;

    const total = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tendered = parseFloat(document.getElementById('pos-tendered').value) || 0;

    const change = tendered - total;
    const changeEl = document.getElementById('pos-change');
    const btn = document.getElementById('btn-process-sale');

    changeEl.textContent = `₱${change >= 0 ? change.toFixed(2) : '0.00'}`;

    if (tendered >= total) {
        changeEl.style.color = 'var(--color-success)';
        btn.disabled = false;
    } else {
        changeEl.style.color = 'var(--color-danger)';
        btn.disabled = true;
    }
}

function processPosSale() {
    const total = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tendered = parseFloat(document.getElementById('pos-tendered').value) || 0;
    const change = tendered - total;

    let itemsHtml = '';
    AppState.cart.forEach(item => {
        itemsHtml += `<div class="receipt-item"><span>${item.qty}x ${item.name}</span><span>₱${(item.qty * item.price).toFixed(2)}</span></div>`;
    });

    const d = new Date();

    const receiptHtml = `
        <div class="receipt-modal">
            <div class="receipt-header">
                <h2>🥐 Momma's Bakeshop</h2>
                <p>Date: ${d.toLocaleDateString()} ${d.toLocaleTimeString()}</p>
                <p>Cashier: ${AppState.currentUser.name}</p>
            </div>
            <div class="receipt-items">
                ${itemsHtml}
            </div>
            <div class="receipt-total">
                <span>Total</span>
                <span>₱${total.toFixed(2)}</span>
            </div>
            <div class="receipt-item mt-3"><span>Tendered</span><span>₱${tendered.toFixed(2)}</span></div>
            <div class="receipt-item"><span>Change</span><span>₱${change.toFixed(2)}</span></div>
            
            <button class="btn btn-primary w-full mt-4" onclick="closeModal()">Print & Close</button>
        </div>
    `;

    showModal(receiptHtml);
    showToast("Sale completed successfully!");

    // Reset cart
    AppState.cart = [];
    document.getElementById('pos-tendered').value = '';
    renderCart();
}

function initPosB2B() {
    const clientSelect = document.getElementById('b2b-client');
    const productSelect = document.getElementById('b2b-product');

    clientSelect.innerHTML = '<option value="" disabled selected>Select a client...</option>';
    DB.clients.forEach(c => {
        clientSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    productSelect.innerHTML = '<option value="" disabled selected>Select a product...</option>';
    DB.products.forEach(p => {
        productSelect.innerHTML += `<option value="${p.id}" data-price="${p.price}">${p.name} - ₱${p.price}</option>`;
    });

    document.getElementById('b2b-qty').value = "1";
    document.getElementById('b2b-total').textContent = "₱0.00";
}

function calculateB2BTotal() {
    const productSelect = document.getElementById('b2b-product');
    const qty = parseFloat(document.getElementById('b2b-qty').value) || 0;

    if (productSelect.value) {
        const option = productSelect.options[productSelect.selectedIndex];
        const price = parseFloat(option.getAttribute('data-price'));
        const total = price * qty;
        document.getElementById('b2b-total').textContent = `₱${total.toFixed(2)}`;
    }
}

function handleB2BSubmit(e) {
    e.preventDefault();
    const clientSelect = document.getElementById('b2b-client');
    const productSelect = document.getElementById('b2b-product');

    const clientName = clientSelect.options[clientSelect.selectedIndex].text;
    const productName = productSelect.options[productSelect.selectedIndex].text.split(' - ')[0];
    const itemTotal = document.getElementById('b2b-total').textContent;

    const d = new Date();

    const invoiceHtml = `
        <div class="receipt-modal">
            <div class="receipt-header">
                <h2>Invoice / Consignment</h2>
                <p>Status: <span class="badge status-low" style="background:var(--color-warning-light);color:var(--color-warning);">PENDING</span></p>
                <p>Date: ${d.toLocaleDateString()}</p>
                <p>Billed to: <strong>${clientName}</strong></p>
            </div>
            <div class="receipt-items">
                <div class="receipt-item"><span>${document.getElementById('b2b-qty').value}x ${productName}</span></div>
            </div>
            <div class="receipt-total">
                <span>Total Due</span>
                <span>${itemTotal}</span>
            </div>
            <button class="btn btn-primary w-full mt-4" onclick="closeModal()">Close</button>
        </div>
    `;

    showModal(invoiceHtml);
    document.getElementById('form-pos-b2b').reset();
    document.getElementById('b2b-total').textContent = "₱0.00";
}

function initPosSpoilage() {
    const fgOptions = document.getElementById('spoilage-fg-options');
    const rmOptions = document.getElementById('spoilage-rm-options');

    fgOptions.innerHTML = '';
    DB.products.forEach(p => {
        fgOptions.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });

    rmOptions.innerHTML = '';
    DB.rawMaterials.forEach(rm => {
        rmOptions.innerHTML += `<option value="${rm.id}">${rm.name} (${rm.unit})</option>`;
    });
}

function handleSpoilageSubmit(e) {
    e.preventDefault();
    showToast("Spoilage record saved successfully!", "success");
    document.getElementById('form-pos-spoilage').reset();
}

function initInvLevels() {
    const tbody = document.getElementById('inv-levels-table-body');
    tbody.innerHTML = '';

    // Render Raw Materials
    DB.rawMaterials.forEach(rm => {
        const isLow = rm.stock <= rm.threshold;
        const statusBadge = isLow
            ? `<span class="status-badge status-low">Low Stock</span>`
            : `<span class="status-badge status-good">Healthy</span>`;

        tbody.innerHTML += `
            <tr style="${isLow ? 'background-color: var(--color-warning-light);' : ''}">
                <td><strong>${rm.name}</strong></td>
                <td><span class="badge" style="background:#e5e7eb;color:#374151;">${rm.category}</span></td>
                <td><strong style="${isLow ? 'color: var(--color-danger);' : ''}">${rm.stock}</strong></td>
                <td>${rm.unit}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });

    // Spacer
    tbody.innerHTML += `<tr><td colspan="5" style="background:#f3f4f6;text-align:center;font-size:0.8rem;color:#6b7280;">FINISHED GOODS</td></tr>`;

    // Render Finished Goods (Mock stock values for demo)
    DB.products.forEach((p, idx) => {
        const mockStock = (idx * 15) + 5; // Fake numbers
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.icon} ${p.name}</strong></td>
                <td><span class="badge" style="background:#fde68a;color:#92400e;">Baked Good</span></td>
                <td><strong>${mockStock}</strong></td>
                <td>pcs</td>
                <td><span class="status-badge status-good">Healthy</span></td>
            </tr>
        `;
    });
}

function populateMaterialDropdown(elementId) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="" disabled selected>Select material...</option>';
    DB.rawMaterials.forEach(rm => {
        select.innerHTML += `<option value="${rm.id}">${rm.name} (Current: ${rm.stock} ${rm.unit})</option>`;
    });
}

function populateProductDropdown(elementId) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="" disabled selected>Select product...</option>';
    DB.products.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });

    // Set default datetime to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('prod-datetime').value = now.toISOString().slice(0, 16);
}

function handleInvSubmit(e) {
    e.preventDefault();
    showToast("Transaction recorded successfully!", "success");
    e.target.reset();
}

function initUsers() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    DB.users.forEach(u => {
        const badgeClass = u.status === 'active' ? 'status-active' : 'status-inactive';
        const roleLabel = u.role.charAt(0).toUpperCase() + u.role.slice(1);

        tbody.innerHTML += `
            <tr>
                <td><strong>${u.name}</strong></td>
                <td>@${u.username}</td>
                <td><span class="badge ${u.role}">${roleLabel}</span></td>
                <td><span class="status-badge ${badgeClass}">${u.status.toUpperCase()}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="showToast('Edit mode opened')">Edit</button>
                    ${u.username !== 'admin' ? `<button class="btn btn-outline btn-sm text-danger" onclick="toggleUserStatus(${u.id})">${u.status === 'active' ? 'Deactivate' : 'Activate'}</button>` : ''}
                </td>
            </tr>
        `;
    });
}

function toggleUserStatus(id) {
    const user = DB.users.find(u => u.id === id);
    if (user) {
        user.status = user.status === 'active' ? 'inactive' : 'active';
        showToast(`User ${user.username} is now ${user.status}`);
        initUsers();
    }
}

function handleCreateUserSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-user-name').value;
    const username = document.getElementById('new-user-username').value;
    const role = document.getElementById('new-user-role').value;

    DB.users.push({
        id: Date.now(),
        name, username, password: 'password123', role, status: 'active'
    });

    showToast(`User ${name} created successfully!`, 'success');
    e.target.reset();
    navigateTo('users');
}

function initReports() {
    const nav = document.getElementById('reports-nav');
    const content = document.getElementById('reports-content-area');

    const reports = [
        { id: 'rpt-sales', label: 'Daily Sales', render: renderSalesRpt },
        { id: 'rpt-inv', label: 'Inventory Status', render: renderInvRpt },
        { id: 'rpt-batch', label: 'Batch Recon', render: renderBatchRpt },
        { id: 'rpt-spoil', label: 'Spoilage Summary', render: renderSpoilageRpt },
        { id: 'rpt-b2b', label: 'B2B Payments', render: renderB2BRpt },
        { id: 'rpt-audit', label: 'System Audit Log', render: renderAuditRpt }
    ];

    nav.innerHTML = '';
    content.innerHTML = '';

    reports.forEach((rpt, idx) => {
        // Tab Button
        const btn = document.createElement('button');
        btn.className = `tab-btn ${idx === 0 ? 'active' : ''}`;
        btn.textContent = rpt.label;
        btn.onclick = () => switchReportTab(rpt.id);
        nav.appendChild(btn);

        // Tab Content
        const pane = document.createElement('div');
        pane.className = `tab-pane ${idx === 0 ? 'active' : ''}`;
        pane.id = `pane-${rpt.id}`;
        pane.innerHTML = rpt.render();
        content.appendChild(pane);
    });
}

function switchReportTab(id) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`pane-${id}`).classList.add('active');
}

// Mock renderers for reports
function renderSalesRpt() {
    return `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Time</th><th>Receipt No</h3><th>Cashier</th><th>Amount</th><th>Method</th></tr></thead>
                <tbody>
                    <tr><td>08:15 AM</td><td>RC-1001</td><td>Maria</td><td>₱45.00</td><td>Cash</td></tr>
                    <tr><td>08:30 AM</td><td>RC-1002</td><td>Maria</td><td>₱120.00</td><td>Cash</td></tr>
                    <tr><td>09:05 AM</td><td>RC-1003</td><td>Maria</td><td>₱30.00</td><td>Cash</td></tr>
                </tbody>
            </table>
        </div>
        <div class="summary-line total mt-4"><span>Total Daily Revenue</span> <span>₱195.00</span></div>
    `;
}

function renderInvRpt() {
    return `<p>See Inventory Levels module for live tracking.</p>`;
}

function renderBatchRpt() {
    return `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Batch ID</th><th>Product</th><th>Produced</th><th>Sold</th><th>Spoiled</th><th>Variance</th></tr></thead>
                <tbody>
                    <tr><td>B-001</td><td>Pandesal</td><td>500</td><td>480</td><td>10</td><td style="color:var(--color-danger)">-10</td></tr>
                    <tr><td>B-002</td><td>Spanish Bread</td><td>100</td><td>90</td><td>5</td><td style="color:var(--color-danger)">-5</td></tr>
                </tbody>
            </table>
        </div>
    `;
}

function renderSpoilageRpt() {
    return `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Date</th><th>Item</th><th>Quantity</th><th>Reason</th><th>Logged By</th></tr></thead>
                <tbody>
                    <tr><td>Today</td><td>Spanish Bread</td><td>5 pcs</td><td>Burnt</td><td>Lorna</td></tr>
                    <tr><td>Yesterday</td><td>Eggs</td><td>1 tray</td><td>Dropped</td><td>Lorna</td></tr>
                </tbody>
            </table>
        </div>
    `;
}

function renderB2BRpt() {
    return `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Invoice #</th><th>Client</th><th>Amount Due</th><th>Aging</th><th>Status</th></tr></thead>
                <tbody>
                    <tr><td>INV-100</td><td>Alorica Davao</td><td>₱4,500.00</td><td>15 Days</td><td><span class="badge" style="background:var(--color-warning-light);color:var(--color-warning);">PENDING</span></td></tr>
                    <tr><td>INV-101</td><td>Brokenshire</td><td>₱1,200.00</td><td>3 Days</td><td><span class="badge" style="background:var(--color-warning-light);color:var(--color-warning);">PENDING</span></td></tr>
                </tbody>
            </table>
        </div>
    `;
}

function renderAuditRpt() {
    return `
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Timestamp</th><th>User</th><th>Action</th</tr></thead>
                <tbody>
                    <tr><td>${new Date().toLocaleTimeString()}</td><td>Admin</td><td>Generated system reports</td></tr>
                    <tr><td>09:15 AM</td><td>Maria</td><td>Processed Cash Sale (RC-1003)</td></tr>
                    <tr><td>08:00 AM</td><td>Lorna</td><td>Logged stock-in: All-Purpose Flour</td></tr>
                    <tr><td>07:30 AM</td><td>Admin</td><td>System Login</td></tr>
                </tbody>
            </table>
        </div>
    `;
}

// ==========================================
// UTILITIES (Modals, Toasts)
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    // Remove after animation completes
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showModal(contentHtml) {
    const modal = document.getElementById('modal-container');
    const contentArea = document.getElementById('modal-content-area');

    contentArea.innerHTML = `
        <button class="modal-close" onclick="closeModal()">×</button>
        ${contentHtml}
    `;

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
}
