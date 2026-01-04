// ===== DASHBOARD GLOBAL STATE =====
let dashboardState = {
    scripts: [],
    currentTab: 'dashboard',
    user: null
};

// ===== AUTHENTICATION =====
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        const data = await response.json();
        
        if (data.isLoggedIn) {
            dashboardState.user = data;
            updateUserInfo(data);
            return true;
        } else {
            window.location.href = '/';
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/';
        return false;
    }
}

function updateUserInfo(userData) {
    const usernameEl = document.getElementById('userUsername');
    const loginTimeEl = document.getElementById('userLoginTime');
    
    if (usernameEl) {
        usernameEl.textContent = userData.username;
    }
    
    if (loginTimeEl) {
        const loginTime = new Date(userData.loginTime);
        loginTimeEl.textContent = loginTime.toLocaleString();
    }
}

async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}

// ===== NAVIGATION & TABS =====
function switchTab(tabName) {
    dashboardState.currentTab = tabName;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Show active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        }
    });
    
    // Update sidebar active item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        }
    });
    
    // Load data for specific tabs
    if (tabName === 'scripts') {
        loadScripts();
    } else if (tabName === 'history') {
        loadHistory();
    } else if (tabName === 'dashboard') {
        loadDashboardStats();
    }
}

// ===== DASHBOARD STATS =====
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/scripts');
        const data = await response.json();
        
        if (data.success) {
            dashboardState.scripts = data.scripts || [];
            
            // Update stats
            const totalScriptsEl = document.getElementById('totalScripts');
            const totalViewsEl = document.getElementById('totalViews');
            const totalSizeEl = document.getElementById('totalSize');
            
            if (totalScriptsEl) {
                totalScriptsEl.textContent = data.count || 0;
            }
            
            if (totalViewsEl) {
                const totalViews = dashboardState.scripts.reduce((sum, script) => sum + (script.views || 0), 0);
                totalViewsEl.textContent = totalViews.toLocaleString();
            }
            
            if (totalSizeEl) {
                const totalSize = dashboardState.scripts.reduce((sum, script) => sum + (script.size || 0), 0);
                totalSizeEl.textContent = formatBytes(totalSize);
            }
            
            // Show recent scripts
            showRecentScripts();
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function showRecentScripts() {
    const container = document.getElementById('recentScripts');
    if (!container) return;
    
    const recentScripts = dashboardState.scripts.slice(0, 5);
    
    if (recentScripts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-code"></i>
                <p>No scripts yet. Create your first script!</p>
            </div>
        `;
        return;
    }
    
    const html = recentScripts.map(script => `
        <div class="script-item">
            <div class="script-header">
                <div class="script-name">${script.name}</div>
                <div class="script-id">${script.id || script.name.substring(0, 8)}</div>
            </div>
            <div class="script-meta">
                <span><i class="fas fa-eye"></i> ${script.views || 0} views</span>
                <span><i class="fas fa-file-code"></i> ${formatBytes(script.size || 0)}</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(script.createdAt)}</span>
            </div>
            <div class="script-actions">
                <button class="btn btn-sm btn-secondary" onclick="copyToClipboard('${script.loadstring}')">
                    <i class="fas fa-copy"></i> Copy Loadstring
                </button>
                <button class="btn btn-sm btn-secondary" onclick="editScript('${script.name}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteScript('${script.name}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// ===== SCRIPT MANAGEMENT =====
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
        const response = await fetch('/api/scripts');
        const data = await response.json();
        
        if (data.success) {
            dashboardState.scripts = data.scripts || [];
            renderScriptsList(dashboardState.scripts);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load scripts: ${data.error || 'Unknown error'}</p>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Network error: ${error.message}</p>
            </div>
        `;
    }
}

function renderScriptsList(scripts) {
    const container = document.getElementById('scriptsList');
    if (!container) return;
    
    if (scripts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-code"></i>
                <p>No scripts found. Create your first script!</p>
                <button class="btn btn-primary mt-3" onclick="switchTab('create')">
                    <i class="fas fa-plus"></i> Create Script
                </button>
            </div>
        `;
        return;
    }
    
    const html = scripts.map((script, index) => `
        <div class="script-item">
            <div class="script-header">
                <div class="script-name">${script.name}</div>
                <div class="script-id">#${index + 1}</div>
            </div>
            <div class="script-meta">
                <span><i class="fas fa-eye"></i> ${script.views || 0} views</span>
                <span><i class="fas fa-file-code"></i> ${formatBytes(script.size || 0)}</span>
                <span><i class="fas fa-hashtag"></i> ${script.lines || 0} lines</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(script.createdAt)}</span>
            </div>
            <div class="script-url">
                ${script.rawUrl}
            </div>
            <div class="script-actions">
                <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${script.loadstring}')">
                    <i class="fas fa-copy"></i> Copy Loadstring
                </button>
                <button class="btn btn-sm btn-secondary" onclick="copyToClipboard('${script.rawUrl}')">
                    <i class="fas fa-link"></i> Copy Raw URL
                </button>
                <button class="btn btn-sm btn-secondary" onclick="editScript('${script.name}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteScript('${script.name}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
                <button class="btn btn-sm btn-secondary" onclick="testScript('${script.name}')">
                    <i class="fas fa-play"></i> Test
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

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
        const response = await fetch('/api/create-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, code })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Script created successfully!', 'success');
            
            // Clear form
            if (document.getElementById('newScriptName')) {
                document.getElementById('newScriptName').value = '';
            }
            if (document.getElementById('newScriptCode')) {
                document.getElementById('newScriptCode').value = '';
            }
            
            // Show result
            const resultContainer = document.getElementById('createResult');
            if (resultContainer) {
                resultContainer.style.display = 'block';
                resultContainer.innerHTML = `
                    <h4><i class="fas fa-check-circle text-success"></i> Script Created</h4>
                    <div class="mt-3">
                        <p><strong>Script Name:</strong> ${data.data?.scriptName || name}</p>
                        <p><strong>Raw URL:</strong> <code>${data.data?.rawUrl || ''}</code></p>
                        <p><strong>Loadstring:</strong></p>
                        <div class="script-url">${data.data?.loadstring || ''}</div>
                        <div class="script-actions mt-3">
                            <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${data.data?.loadstring || ''}')">
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
            setTimeout(loadScripts, 1000);
            setTimeout(() => switchTab('scripts'), 1500);
            
        } else {
            showAlert(data.error || 'Failed to create script', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteScript(scriptName) {
    if (!confirm(`Are you sure you want to delete script "${scriptName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/script/${scriptName}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`Script "${scriptName}" deleted successfully`, 'success');
            loadScripts();
            loadDashboardStats();
        } else {
            showAlert(data.error || 'Failed to delete script', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    }
}

async function editScript(scriptName) {
    // Find script in current list
    const script = dashboardState.scripts.find(s => s.name === scriptName);
    if (!script) {
        showAlert('Script not found in current list', 'error');
        return;
    }
    
    // Switch to edit tab (you might need to create this)
    showAlert('Edit feature coming soon!', 'warning');
    // In practice, you'd load the script content into an editor
}

// ===== FILE UPLOAD =====
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.name.endsWith('.lua')) {
        showAlert('Only .lua files are allowed', 'error');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showAlert('File size must be less than 5MB', 'error');
        return;
    }
    
    // Read file content
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        
        // Set script name (remove .lua extension)
        const scriptName = file.name.replace('.lua', '');
        if (document.getElementById('uploadScriptName')) {
            document.getElementById('uploadScriptName').value = scriptName;
        }
        
        // Show preview
        if (document.getElementById('filePreview')) {
            document.getElementById('filePreview').textContent = content.substring(0, 500) + 
                (content.length > 500 ? '\n... (truncated)' : '');
        }
        
        // Store for later upload
        window.uploadFileData = {
            name: scriptName,
            content: content
        };
    };
    
    reader.readAsText(file);
}

async function uploadFile() {
    if (!window.uploadFileData) {
        showAlert('Please select a file first', 'error');
        return;
    }
    
    const { name, content } = window.uploadFileData;
    
    const btn = document.getElementById('uploadFileBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    try {
        const response = await fetch('/api/upload-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: name + '.lua',
                fileContent: content
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('File uploaded and script created successfully!', 'success');
            
            // Clear form
            document.getElementById('fileInput').value = '';
            if (document.getElementById('uploadScriptName')) {
                document.getElementById('uploadScriptName').value = '';
            }
            if (document.getElementById('filePreview')) {
                document.getElementById('filePreview').textContent = '';
            }
            
            delete window.uploadFileData;
            
            // Refresh scripts list
            setTimeout(loadScripts, 1000);
            
        } else {
            showAlert(data.error || 'Failed to upload file', 'error');
        }
    } catch (error) {
        showAlert('Upload error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ===== HISTORY =====
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
        const response = await fetch('/api/history');
        const data = await response.json();
        
        if (data.success) {
            renderHistoryList(data.history || []);
        }
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load history: ${error.message}</p>
            </div>
        `;
    }
}

function renderHistoryList(history) {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No history available yet</p>
            </div>
        `;
        return;
    }
    
    const html = history.map(item => `
        <div class="script-item">
            <div class="script-header">
                <div class="script-name">
                    <span class="badge ${getActionBadgeClass(item.action)}">${item.action}</span>
                    ${item.scriptName || 'N/A'}
                </div>
                <div class="script-id">${formatDateTime(item.timestamp)}</div>
            </div>
            <div class="script-meta">
                <span><i class="fas fa-user"></i> ${item.user || 'System'}</span>
                <span><i class="fas fa-clock"></i> ${formatTimeAgo(item.timestamp)}</span>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// ===== UTILITY FUNCTIONS =====
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.global-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alert = document.createElement('div');
    alert.className = `global-alert alert alert-${type}`;
    alert.innerHTML = `
        <div>${message}</div>
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add styles if not already present
    if (!document.querySelector('#alert-styles')) {
        const style = document.createElement('style');
        style.id = 'alert-styles';
        style.textContent = `
            .global-alert {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                min-width: 300px;
                max-width: 500px;
                animation: slideIn 0.3s ease;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .alert-close {
                background: none;
                border: none;
                color: inherit;
                font-size: 1.5rem;
                cursor: pointer;
                margin-left: 15px;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Copied to clipboard!', 'success');
    }).catch(err => {
        showAlert('Failed to copy
