// InfinityBodyGuard Dashboard - Main JavaScript
const API_BASE = '/api';

// ==================== KHỞI TẠO ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('InfinityBodyGuard Dashboard loaded');
    
    // 1. Kiểm tra đăng nhập
    checkAuth();
    
    // 2. Thiết lập sự kiện tab
    setupTabs();
    
    // 3. Thiết lập sự kiện form
    setupForms();
    
    // 4. Tải dữ liệu ban đầu
    loadDashboardStats();
    loadScripts();
    
    // 5. Xử lý file upload preview
    setupFilePreview();
});

// ==================== XÁC THỰC ====================
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/check`);
        const data = await response.json();
        
        if (data.isAdmin) {
            // Cập nhật thông tin user
            document.getElementById('userUsername').textContent = data.username;
            if (data.loginTime) {
                const time = new Date(data.loginTime).toLocaleTimeString('vi-VN');
                document.getElementById('userLoginTime').textContent = `Đăng nhập: ${time}`;
            }
        } else {
            // Chưa đăng nhập, chuyển về trang login
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Lỗi kiểm tra đăng nhập:', error);
        showAlert('Không thể kết nối đến server', 'error');
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
    }
    window.location.href = '/';
}

// ==================== TAB NAVIGATION ====================
function setupTabs() {
    // Tab buttons
    const tabBtns = document.querySelectorAll('.tab-btn');
    const navItems = document.querySelectorAll('.nav-item');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
            
            // Update active state
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-tab') === tabName) {
                    item.classList.add('active');
                }
            });
        });
    });
    
    // Nav items
    navItems.forEach(item => {
        if (item.getAttribute('data-tab')) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const tabName = this.getAttribute('data-tab');
                switchTab(tabName);
                
                // Update active state
                navItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                
                tabBtns.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.getAttribute('data-tab') === tabName) {
                        btn.classList.add('active');
                    }
                });
            });
        }
    });
}

function switchTab(tabName) {
    // Ẩn tất cả tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Hiện tab được chọn
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
        
        // Tải dữ liệu nếu cần
        if (tabName === 'scripts') {
            loadScripts();
        } else if (tabName === 'history') {
            loadHistory();
        }
    }
}

// ==================== DASHBOARD ====================
async function loadDashboardStats() {
    try {
        // Lấy danh sách script để tính toán
        const scripts = await fetchScripts();
        
        // Tính toán thống kê
        const totalScripts = scripts.length;
        const totalViews = scripts.reduce((sum, script) => sum + (script.views || 0), 0);
        const totalSize = scripts.reduce((sum, script) => sum + (script.codeLength || 0), 0);
        
        // Cập nhật UI
        document.getElementById('totalScripts').textContent = totalScripts;
        document.getElementById('totalViews').textContent = totalViews.toLocaleString();
        document.getElementById('totalSize').textContent = formatBytes(totalSize);
        
        // Hiển thị script gần đây
        displayRecentScripts(scripts.slice(0, 5));
        
    } catch (error) {
        console.error('Lỗi tải thống kê:', error);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function displayRecentScripts(scripts) {
    const container = document.getElementById('recentScripts');
    
    if (scripts.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">No scripts created yet.</p>';
        return;
    }
    
    let html = '<div class="scripts-grid">';
    scripts.forEach(script => {
        html += `
        <div class="script-item-small">
            <div class="script-header">
                <i class="fas fa-file-code"></i>
                <strong>${script.name || script.originalName}</strong>
            </div>
            <div class="script-info">
                <span>ID: ${script.id.substring(0, 8)}...</span>
                <span>Views: ${script.views || 0}</span>
            </div>
            <div class="script-actions">
                <button class="btn-small" onclick="copyToClipboard('${script.loadstring}')">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
        </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// ==================== TẠO SCRIPT ====================
function setupForms() {
    // Form tạo script
    const createForm = document.getElementById('createScriptForm');
    if (createForm) {
        createForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createScript();
        });
    }
}

async function createScript() {
    const name = document.getElementById('newScriptName').value.trim();
    const code = document.getElementById('newScriptCode').value.trim();
    const createBtn = document.getElementById('createScriptBtn');
    const resultDiv = document.getElementById('createResult');
    const alertDiv = document.getElementById('createAlert');
    
    // Validate
    if (!name || !code) {
        showAlert('Vui lòng điền đầy đủ tên và mã script', 'warning', alertDiv);
        return;
    }
    
    // Validate name format
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(name)) {
        showAlert('Tên script chỉ được chứa chữ cái, số, gạch dưới và gạch ngang', 'warning', alertDiv);
        return;
    }
    
    // Disable button và hiển thị loading
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
        const response = await fetch(`${API_BASE}/scripts/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                scriptName: name, 
                scriptCode: code 
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Hiển thị kết quả thành công
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="success-card">
                    <h4><i class="fas fa-check-circle"></i> Script Created Successfully!</h4>
                    <div class="result-info">
                        <p><strong>Name:</strong> ${data.script.name}</p>
                        <p><strong>ID:</strong> <code>${data.script.id}</code></p>
                        <p><strong>Created:</strong> ${new Date(data.script.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                    <div class="loadstring-box">
                        <label>Loadstring:</label>
                        <div class="copy-box">
                            <input type="text" readonly value="${data.script.loadstring}">
                            <button class="btn-copy" onclick="copyToClipboard('${data.script.loadstring}')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-row" style="margin-top:20px;">
                        <button class="btn btn-primary" onclick="switchTab('scripts')">
                            <i class="fas fa-list"></i> View All Scripts
                        </button>
                        <button class="btn btn-secondary" onclick="document.getElementById('createScriptForm').reset(); resultDiv.style.display='none';">
                            <i class="fas fa-plus"></i> Create Another
                        </button>
                    </div>
                </div>
            `;
            
            // Reset form
            document.getElementById('createScriptForm').reset();
            
            // Cập nhật thống kê
            loadDashboardStats();
            
            showAlert('Script đã được tạo thành công!', 'success', alertDiv);
            
        } else {
            throw new Error(data.error || 'Tạo script thất bại');
        }
    } catch (error) {
        console.error('Lỗi tạo script:', error);
        showAlert(`Lỗi: ${error.message}`, 'error', alertDiv);
    } finally {
        // Reset button
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-save"></i> Create & Protect Script';
    }
}

// ==================== QUẢN LÝ SCRIPT ====================
async function loadScripts() {
    const container = document.getElementById('scriptsList');
    
    try {
        const scripts = await fetchScripts();
        displayScriptsList(scripts);
    } catch (error) {
        console.error('Lỗi tải scripts:', error);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Không thể tải danh sách script: ${error.message}</p>
                <button class="btn btn-secondary" onclick="loadScripts()">
                    <i class="fas fa-sync-alt"></i> Thử lại
                </button>
            </div>
        `;
    }
}

async function fetchScripts() {
    const response = await fetch(`${API_BASE}/scripts/list`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

function displayScriptsList(scripts) {
    const container = document.getElementById('scriptsList');
    
    if (scripts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-code"></i>
                <h4>No Scripts Found</h4>
                <p>Create your first script to get started</p>
                <button class="btn btn-primary" onclick="switchTab('create')">
                    <i class="fas fa-plus"></i> Create Script
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="scripts-table">';
    
    scripts.forEach(script => {
        const createdDate = new Date(script.createdAt).toLocaleDateString('vi-VN');
        const lastAccessed = script.lastAccessed ? 
            new Date(script.lastAccessed).toLocaleDateString('vi-VN') : 'Never';
        
        html += `
        <div class="script-item" data-id="${script.id}" data-name="${script.name}">
            <div class="script-main">
                <div class="script-icon">
                    <i class="fas fa-file-code"></i>
                </div>
                <div class="script-details">
                    <div class="script-name">
                        <strong>${script.name || script.originalName}</strong>
                        <span class="script-id">ID: ${script.id}</span>
                    </div>
                    <div class="script-meta">
                        <span><i class="fas fa-calendar"></i> ${createdDate}</span>
                        <span><i class="fas fa-eye"></i> ${script.views || 0} views</span>
                        <span><i class="fas fa-file-alt"></i> ${script.lines || 1} lines</span>
                        <span><i class="fas fa-history"></i> Last: ${lastAccessed}</span>
                    </div>
                </div>
            </div>
            <div class="script-actions">
                <button class="btn-action" onclick="copyToClipboard('${script.loadstring}')" title="Copy Loadstring">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <button class="btn-action" onclick="viewScript('${script.id}')" title="View Details">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn-action btn-danger" onclick="deleteScript('${script.id}')" title="Delete Script">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function deleteScript(scriptId) {
    if (!confirm('Are you sure you want to delete this script? This action cannot be undone.')) {
        return;
    }
    
    try {
        // GHI CHÚ: Bạn cần tạo endpoint DELETE /api/scripts/:id ở backend
        const response = await fetch(`${API_BASE}/scripts/${scriptId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Script đã được xóa thành công', 'success');
            loadScripts(); // Reload list
            loadDashboardStats(); // Update stats
        } else {
            throw new Error('Xóa thất bại');
        }
    } catch (error) {
        console.error('Lỗi xóa script:', error);
        showAlert(`Lỗi: ${error.message}`, 'error');
    }
}

function viewScript(scriptId) {
    // Tạm thời hiển thị thông báo
    showAlert(`View script ${scriptId} - Feature coming soon`, 'info');
    // Trong tương lai, có thể mở modal xem chi tiết script
}

// ==================== UPLOAD FILE ====================
function setupFilePreview() {
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('filePreview');
    
    if (fileInput && preview) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Kiểm tra file type
            if (!file.name.endsWith('.lua')) {
                showAlert('Chỉ chấp nhận file .lua', 'error', 'uploadAlert');
                return;
            }
            
            // Kiểm tra kích thước (5MB)
            if (file.size > 5 * 1024 * 1024) {
                showAlert('File quá lớn (>5MB)', 'error', 'uploadAlert');
                return;
            }
            
            // Đọc file và hiển thị preview
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.textContent = e.target.result.substring(0, 1000); // Giới hạn preview
                if (file.size > 1000) {
                    preview.textContent += '\n... (file too large to preview fully)';
                }
                
                // Auto-fill script name nếu để trống
                const nameInput = document.getElementById('uploadScriptName');
                if (!nameInput.value.trim()) {
                    nameInput.value = file.name.replace('.lua', '');
                }
            };
            reader.readAsText(file);
        });
    }
}

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const nameInput = document.getElementById('uploadScriptName');
    const uploadBtn = document.getElementById('uploadFileBtn');
    const alertDiv = document.getElementById('uploadAlert');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        showAlert('Vui lòng chọn file .lua để upload', 'warning', alertDiv);
        return;
    }
    
    const file = fileInput.files[0];
    const scriptName = nameInput.value.trim() || file.name.replace('.lua', '');
    
    // Disable button
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    try {
        // Đọc file content
        const fileContent = await readFileAsText(file);
        
        // Sử dụng API tạo script với nội dung từ file
        const response = await fetch(`${API_BASE}/scripts/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                scriptName: scriptName, 
                scriptCode: fileContent 
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Hiển thị thành công
            showAlert(`File "${file.name}" đã được upload và bảo vệ thành công!`, 'success', alertDiv);
            
            // Reset form
            fileInput.value = '';
            nameInput.value = '';
            document.getElementById('filePreview').textContent = '-- File content will appear here';
            
            // Chuyển sang tab scripts
            setTimeout(() => switchTab('scripts'), 1500);
            
            // Tải lại danh sách
            setTimeout(() => loadScripts(), 1000);
            
        } else {
            throw new Error(data.error || 'Upload thất bại');
        }
    } catch (error) {
        console.error('Lỗi upload:', error);
        showAlert(`Lỗi upload: ${error.message}`, 'error', alertDiv);
    } finally {
        // Reset button
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload & Create Script';
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// ==================== HISTORY ====================
async function loadHistory() {
    const container = document.getElementById('historyList');
    
    try {
        // GHI CHÚ: Bạn cần tạo endpoint /api/history ở backend
        const response = await fetch(`${API_BASE}/history`);
        if (response.ok) {
            const history = await response.json();
            displayHistory(history);
        } else {
            throw new Error('Không thể tải lịch sử');
        }
    } catch (error) {
        console.error('Lỗi tải history:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h4>No History Available</h4>
                <p>Activity history will appear here</p>
            </div>
        `;
    }
}

function displayHistory(history) {
    const container = document.getElementById('historyList');
    
    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h4>No History Available</h4>
                <p>Activity history will appear here</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="history-list">';
    
    history.forEach(item => {
        html += `
        <div class="histo
