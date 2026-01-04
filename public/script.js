// ===== GLOBAL STATE =====
let dashboardState = {
    scripts: [],
    currentTab: 'dashboard',
    user: null,
    isLoading: false
};

// ===== CORE FUNCTIONS =====

// 1. LOGIN FUNCTION
async function login() {
    console.log('🔐 Login function called');
    
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const btn = document.getElementById('loginBtn');
    
    if (!username || !password) {
        showAlert('Login form not found!', 'error');
        return;
    }
    
    const user = username.value.trim();
    const pass = password.value.trim();
    
    if (!user || !pass) {
        showAlert('Please enter username and password', 'error');
        return;
    }
    
    // Show loading
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
        console.log('📤 Sending login request...');
        
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: user,
                password: pass
            }),
            credentials: 'include' // Important for sessions
        });
        
        console.log('📥 Login response:', response.status);
        
        const data = await response.json();
        console.log('📊 Login data:', data);
        
        if (data.success) {
            showAlert('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after 1 second
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            
        } else {
            showAlert(data.error || 'Login failed', 'error');
        }
        
    } catch (error) {
        console.error('🔥 Login error:', error);
        showAlert('Network error: ' + error.message, 'error');
    } finally {
        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// 2. CHECK AUTHENTICATION
async function checkAuth() {
    try {
        console.log('🔍 Checking authentication...');
        
        const response = await fetch('/api/check-auth', {
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('🔐 Auth check result:', data);
        
        if (data.isLoggedIn) {
            dashboardState.user = data;
            
            // Hide loading screen, show dashboard
            const loadingScreen = document.getElementById('loadingScreen');
            const dashboardApp = document.getElementById('dashboardApp');
            
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (dashboardApp) dashboardApp.style.display = 'flex';
            
            // Update user info
            updateUserInfo(data);
            
            // Load initial data
            loadDashboardStats();
            
            return true;
        } else {
            // Not logged in, redirect to login page
            if (!window.location.pathname.includes('index.html') && 
                window.location.pathname !== '/') {
                window.location.href = '/';
            }
            return false;
        }
        
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// 3. UPDATE USER INFO
function updateUserInfo(userData) {
    const usernameEl = document.getElementById('userUsername');
    const loginTimeEl = document.getElementById('userLoginTime');
    
    if (usernameEl && userData.username) {
        usernameEl.textContent = userData.username;
    }
    
    if (loginTimeEl && userData.loginTime) {
        const time = new Date(userData.loginTime);
        loginTimeEl.textContent = time.toLocaleTimeString();
    }
}

// 4. LOGOUT
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
            showAlert('Logout failed', 'error');
        }
    }
}

// 5. SWITCH TAB
function switchTab(tabName) {
    console.log('📂 Switching to tab:', tabName);
    
    dashboardState.currentTab = tabName;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        }
    });
    
    // Show active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        }
    });
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        const icons = {
            'dashboard': 'fa-tachometer-alt',
            'create': 'fa-plus-circle',
            'scripts': 'fa-code',
            'upload': 'fa-upload',
            'history': 'fa-history',
            'settings': 'fa-cog'
        };
        
        const names = {
            'dashboard': 'Dashboard',
            'create': 'Create Script',
            'scripts': 'Manage Scripts',
            'upload': 'Upload File',
            'history': 'Activity History',
            'settings': 'Settings'
        };
        
        pageTitle.innerHTML = `
            <i class="fas ${icons[tabName] || 'fa-cog'}"></i>
            <span>${names[tabName] || 'Dashboard'}</span>
        `;
    }
    
    // Load data for specific tabs
    if (tabName === 'scripts') {
        loadScripts();
    } else if (tabName === 'history') {
        loadHistory();
    } else if (tabName === 'dashboard') {
        loadDashboardStats();
    }
}

// 6. LOAD DASHBOARD STATS
async function loadDashboardStats() {
    try {
        console.log('📊 Loading dashboard stats...');
        
        // Update script count from state
        const totalScriptsEl = document.getElementById('totalScripts');
        if (totalScriptsEl) {
            totalScriptsEl.textContent = dashboardState.scripts.length;
        }
        
        // Try to load actual scripts
        const response = await fetch('/api/scripts', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                dashboardState.scripts = data.scripts || [];
                
                // Update stats
                if (totalScriptsEl) {
                    totalScriptsEl.textContent = data.count || dashboardState.scripts.length;
                }
                
                const totalViewsEl = document.getElementById('totalViews');
                if (totalViewsEl) {
                    const totalViews = dashboardState.scripts.reduce((sum, script) => 
                        sum + (script.views || 0), 0);
                    totalViewsEl.textContent = totalViews.toLocaleString();
                }
                
                const totalSizeEl = document.getElementById('totalSize');
                if (totalSizeEl) {
                    const totalSize = dashboardState.scripts.reduce((sum, script) => 
                        sum + (script.size || 0), 0);
                    totalSizeEl.textContent = formatBytes(totalSize);
                }
                
                // Show recent scripts
                showRecentScripts();
            }
        }
        
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// 7. LOAD SCRIPTS
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
        console.log('📦 Loading scripts...');
        
        const response = await fetch('/api/scripts', {
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('📦 Scripts response:', data);
        
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
        console.error('Load scripts error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Network error: ${error.message}</p>
                <button class="btn btn-primary mt-3" onclick="loadScripts()">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// 8. CREATE SCRIPT
async function createScript() {
    console.log('📝 Create script function called');
    
    const nameInput = document.getElementById('newScriptName');
    const codeInput = document.getElementById('newScriptCode');
    const btn = document.getElementById('createScriptBtn');
    
    if (!nameInput || !codeInput || !btn) {
        showAlert('Create form not found!', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    
    if (!name) {
        showAlert('Please enter script name', 'error');
        nameInput.focus();
        return;
    }
    
    if (!code) {
        showAlert('Please enter script code', 'error');
        codeInput.focus();
        return;
    }
    
    // Show loading
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
        console.log('📤 Creating script:', name);
        
        const response = await fetch('/api/create-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, code }),
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('📥 Create script response:', data);
        
        if (data.success) {
            showAlert('Script created successfully!', 'success');
            
            // Clear form
            nameInput.value = '';
            codeInput.value = '';
            
            // Show result
            const resultContainer = document.getElementById('createResult');
            if (resultContainer && data.data) {
                resultContainer.style.display = 'block';
                resultContainer.innerHTML = `
                    <div class="alert alert-success">
                        <h4><i class="fas fa-check-circle"></i> Script Created!</h4>
                        <p><strong>Name:</strong> ${data.data.name}</p>
                        <p><strong>Raw URL:</strong></p>
                        <div class="script-url">${data.data.rawUrl}</div>
                        <p><strong>Loadstring:</strong></p>
                        <div class="script-url">${data.data.loadstring}</div>
                        <div class="mt-3">
                            <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${data.data.loadstring}')">
                                <i class="fas fa-copy"></i> Copy Loadstring
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="switchTab('scripts')">
                                <i class="fas fa-list"></i> View All Scripts
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Refresh scripts list
            setTimeout(() => {
                loadScripts();
                loadDashboardStats();
            }, 1000);
            
        } else {
            showAlert(data.error || 'Failed to create script', 'error');
        }
        
    } catch (error) {
        console.error('Create script error:', error);
        showAlert('Network error: ' + error.message, 'error');
    } finally {
        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// 9. DELETE SCRIPT
async function deleteScript(scriptName) {
    if (!confirm(`Are you sure you want to delete "${scriptName}"? This cannot be undone.`)) {
        return;
    }
    
    try {
        console.log('🗑️ Deleting script:', scriptName);
        
        const response = await fetch(`/api/script/${encodeURIComponent(scriptName)}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`Script "${scriptName}" deleted`, 'success');
            
            // Refresh lists
            loadScripts();
            loadDashboardStats();
            
        } else {
            showAlert(data.error || 'Delete failed', 'error');
        }
        
    } catch (error) {
        console.error('Delete script error:', error);
        showAlert('Network error: ' + error.message, 'error');
    }
}

// 10. UPLOAD FILE
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.name.endsWith('.lua')) {
        showAlert('Only .lua files are allowed', 'error');
        return;
    }
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showAlert('File size must be less than 5MB', 'error');
        return;
    }
    
    // Read file
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const scriptName = file.name.replace('.lua', '');
        
        // Set script name
        const nameInput = document.getElementById('uploadScriptName');
        if (nameInput) {
            nameInput.value = scriptName;
        }
        
        // Show preview
        const preview = document.getElementById('filePreview');
        if (preview) {
            preview.textContent = content.substring(0, 500) + 
                (content.length > 500 ? '\n... (truncated)' : '');
        }
        
        // Store for upload
        window.uploadFileData = {
            name: scriptName,
            content: content,
            fileName: file.name
        };
    };
    
    reader.readAsText(file);
}

async function uploadFile() {
    if (!window.uploadFileData) {
        showAlert('Please select a file first', 'error');
        return;
    }
    
    const { name, content, fileName } = window.uploadFileData;
    const btn = document.getElementById('uploadFileBtn');
    
    if (!btn) {
        showAlert('Upload button not found', 'error');
        return;
    }
    
    // Show loading
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    try {
        console.log('📤 Uploading file:', fileName);
        
        const response = await fetch('/api/upload-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: fileName,
                fileContent: content
            }),
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('📥 Upload response:', data);
        
        if (data.success) {
            showAlert('File uploaded successfully!', 'success');
            
            // Clear form
            const fileInput = document.getElementById('fileInput');
            const nameInput = document.getElementById('uploadScriptName');
            const preview = document.getElementById('filePreview');
            
            if (fileInput) fileInput.value = '';
            if (nameInput) nameInput.value = '';
            if (preview) preview.textContent = '-- File content will appear here';
            
            delete window.uploadFileData;
            
            // Refresh scripts
            setTimeout(() => {
                loadScripts();
                loadDashboardStats();
            }, 1000);
            
        } else {
            showAlert(data.error || 'Upload failed', 'error');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('Network error: ' + error.message, 'error');
    } finally {
        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// 11. LOAD HISTORY
async function loadHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading history...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/history', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderHistoryList(data.history || []);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>${data.error || 'No history available'}</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Load history error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load history</p>
            </div>
        `;
    }
}

// ===== HELPER FUNCTIONS =====

// Show alert
function showAlert(message, type = 'info') {
    console.log(`📢 Alert [${type}]:`, message);
    
    // Remove existing alerts
    const existing = document.querySelectorAll('.global-alert');
    existing.forEach(alert => alert.remove());
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = `global-alert alert alert-${type}`;
    alert.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: inherit; font-size: 1.2rem; cursor: pointer;">
                &times;
            </button>
        </div>
    `;
    
    // Style
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        min-width: 300px;
        max-width: 500px;
        padding: 15px 20px;
        border-radius: 10px;
        background: ${type === 'success' ? '#00ff8820' : 
                     type === 'error' ? '#ff475720' : 
                     type === 'warning' ? '#ffaa0020' : '#3498db2
