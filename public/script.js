// ===== FIX 1: ĐẢM BẢO API CALLS HOẠT ĐỘNG =====

// Thay thế tất cả fetch calls bằng version có error handling
async function safeFetch(url, options = {}) {
    try {
        console.log(`📡 Fetching: ${url}`, options.method || 'GET');
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include' // Quan trọng: gửi session cookie
        });
        
        console.log(`📡 Response: ${response.status} ${url}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error ${response.status}:`, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const data = await response.json();
        console.log(`✅ API Success:`, data.success !== undefined ? data.success : 'OK');
        return data;
        
    } catch (error) {
        console.error(`🔥 Fetch failed ${url}:`, error.message);
        showAlert(`API Error: ${error.message}`, 'error');
        throw error;
    }
}

// ===== FIX 2: SỬA HÀM CHECK AUTH =====
async function checkAuth() {
    try {
        const data = await safeFetch('/api/check-auth');
        
        if (data.isLoggedIn) {
            dashboardState.user = data;
            updateUserInfo(data);
            
            // Ẩn loading, hiện dashboard
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('dashboardApp').style.display = 'flex';
            
            // Load dữ liệu ban đầu
            loadDashboardStats();
            return true;
        } else {
            // Chưa login, redirect về trang đăng nhập
            window.location.href = '/';
            return false;
        }
    } catch (error) {
        console.error('Auth check failed, showing login page');
        window.location.href = '/';
        return false;
    }
}

// ===== FIX 3: SỬA HÀM LOGIN =====
async function login() {
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const btn = document.getElementById('loginBtn');
    
    if (!username || !password) {
        showAlert('Please enter username and password', 'error');
        return;
    }
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
        const data = await safeFetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (data.success) {
            showAlert('Login successful! Redirecting...', 'success');
            
            // Chuyển hướng sau 1 giây
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showAlert(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        // Error đã được xử lý trong safeFetch
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ===== FIX 4: SỬA HÀM LOAD SCRIPTS =====
async function loadScripts() {
    const container = document.getElementById('scriptsList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading scripts...</p>
        </div>
    `;
    
    try {
        const data = await safeFetch('/api/scripts');
        
        if (data.success) {
            dashboardState.scripts = data.scripts || [];
            renderScriptsList(dashboardState.scripts);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${data.error || 'Failed to load scripts'}</p>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Network error. Please check console.</p>
                <button class="btn btn-primary mt-3" onclick="loadScripts()">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// ===== FIX 5: SỬA HÀM CREATE SCRIPT =====
async function createScript() {
    const name = document.getElementById('newScriptName')?.value.trim();
    const code = document.getElementById('newScriptCode')?.value.trim();
    
    if (!name || !code) {
        showAlert('Please enter script name and code', 'error');
        return;
    }
    
    const btn = document.getElementById('createScriptBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
        const data = await safeFetch('/api/create-script', {
            method: 'POST',
            body: JSON.stringify({ name, code })
        });
        
        if (data.success) {
            showAlert('Script created successfully!', 'success');
            
            // Clear form
            document.getElementById('newScriptName').value = '';
            document.getElementById('newScriptCode').value = '';
            
            // Show result
            const resultContainer = document.getElementById('createResult');
            if (resultContainer && data.data) {
                resultContainer.style.display = 'block';
                resultContainer.innerHTML = `
                    <h4><i class="fas fa-check-circle text-success"></i> Script Created</h4>
                    <div class="mt-3">
                        <p><strong>Name:</strong> ${data.data.name}</p>
                        <p><strong>Raw URL:</strong> <code>${data.data.rawUrl}</code></p>
                        <p><strong>Loadstring:</strong></p>
                        <div class="script-url">${data.data.loadstring}</div>
                        <div class="mt-3">
                            <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${data.data.loadstring}')">
                                <i class="fas fa-copy"></i> Copy Loadstring
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="switchTab('scripts')">
                                View All Scripts
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Refresh after 2 seconds
            setTimeout(() => {
                loadScripts();
                loadDashboardStats();
            }, 2000);
            
        } else {
            showAlert(data.error || 'Failed to create script', 'error');
        }
    } catch (error) {
        // Error đã được xử lý
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ===== FIX 6: THÊM DEBUG BUTTON =====
// Thêm nút debug vào dashboard để test API
function addDebugButton() {
    const debugBtn = document.createElement('button');
    debugBtn.className = 'btn btn-secondary';
    debugBtn.style.position = 'fixed';
    debugBtn.style.bottom = '10px';
    debugBtn.style.left = '10px';
    debugBtn.style.zIndex = '9999';
    debugBtn.innerHTML = '<i class="fas fa-bug"></i> Debug';
    debugBtn.onclick = async () => {
        console.log('=== DEBUG INFO ===');
        console.log('Dashboard State:', dashboardState);
        console.log('Session:', await safeFetch('/api/check-auth'));
        console.log('API Test:', await safeFetch('/api/test'));
        showAlert('Check console for debug info', 'info');
    };
    document.body.appendChild(debugBtn);
}

// ===== FIX 7: SỬA HÀM SHOW ALERT =====
function showAlert(message, type = 'info') {
    // Tạo hoặc tìm alert container
    let alertContainer = document.getElementById('globalAlertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'globalAlertContainer';
        alertContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            max-width: 400px;
        `;
        document.body.appendChild(alertContainer);
    }
    
    const alertId = 'alert-' + Date.now();
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
        margin-bottom: 10px;
        padding: 15px;
        border-radius: 8px;
        background: ${type === 'success' ? '#00ff8820' : type === 'error' ? '#ff475720' : '#3498db20'};
        border: 2px solid ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4757' : '#3498db'};
        color: white;
        animation: slideIn 0.3s ease;
    `;
    
    alert.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${message}</span>
            <button onclick="document.getElementById('${alertId}').remove()" 
                    style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem;">
                &times;
            </button>
        </div>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.getElementById(alertId)) {
            document.getElementById(alertId).remove();
        }
    }, 5000);
}

// ===== FIX 8: INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Dashboard initializing...');
    
    // Thêm debug button
    addDebugButton();
    
    // Kiểm tra xem đang ở trang nào
    const isLoginPage = window.location.pathname === '/' || window.location.pathname === '/index.html';
    const isDashboardPage = window.location.pathname.includes('dashboard');
    
    if (isDashboardPage) {
        // Trang dashboard: check auth
        await checkAuth();
    } else if (isLoginPage) {
        // Trang login: thêm event listener
        document.getElementById('loginBtn')?.addEventListener('click', login);
        document.getElementById('password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
        
        // Ẩn loading screen trên trang login
        document.getElementById('loadingScreen')?.style.display = 'none';
    }
    
    console.log('✅ Dashboard initialized');
});

// ===== THÊM CSS CHO ANIMATIONS =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    .alert-success { background: #00ff8820 !important; border-color: #00ff88 !important; }
    .alert-error { background: #ff475720 !important; border-color: #ff4757 !important; }
    .alert-info { background: #3498db20 !important; border-color: #3498db !important; }
    .alert-warning { background: #f1c40f20 !important; border-color: #f1c40f !important; }
`;
document.head.appendChild(style);
