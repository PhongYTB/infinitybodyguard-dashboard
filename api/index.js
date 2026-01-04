const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ==================== CẤU HÌNH CORS ====================
app.use(cors({
    origin: true, // Cho phép tất cả domain
    credentials: true
}));

// ==================== CẤU HÌNH BIẾN MÔI TRƯỜNG ====================
const INFINITYBODYGUARD_URL = process.env.INFINITYBODYGUARD_URL || 'https://infinitybodyguard.vercel.app';
const BODYGUARD_SECRET = process.env.BODYGUARD_SECRET || 'default_secret_key_123';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'phong123';

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'infinity_dashboard_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Đặt true nếu dùng HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 giờ
        httpOnly: true
    }
}));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | Body:`, req.body);
    next();
});

// ==================== AUTH MIDDLEWARE ====================
const requireLogin = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).json({ 
            success: false, 
            error: 'Not authenticated. Please login first.' 
        });
    }
    next();
};

// ==================== API ROUTES ====================

// 1. TEST ENDPOINT - Kiểm tra server hoạt động
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true,
        message: 'InfinityBodyGuard Dashboard API is working!',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: ['/api/login', '/api/logout', '/api/check-auth'],
            scripts: ['/api/scripts', '/api/create-script', '/api/script/:name'],
            test: '/api/test',
            upload: '/api/upload-file',
            history: '/api/history'
        }
    });
});

// 2. LOGIN
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }
        
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            req.session.isLoggedIn = true;
            req.session.username = username;
            req.session.loginTime = new Date();
            
            console.log(`✅ Login successful: ${username}`);
            
            return res.json({
                success: true,
                message: 'Login successful',
                user: {
                    username,
                    loginTime: req.session.loginTime
                }
            });
        }
        
        console.log(`❌ Login failed: ${username}`);
        res.status(401).json({
            success: false,
            error: 'Invalid username or password'
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during login'
        });
    }
});

// 3. CHECK AUTH
app.get('/api/check-auth', (req, res) => {
    try {
        if (req.session.isLoggedIn) {
            res.json({
                isLoggedIn: true,
                username: req.session.username,
                loginTime: req.session.loginTime
            });
        } else {
            res.json({
                isLoggedIn: false
            });
        }
    } catch (error) {
        console.error('Check auth error:', error);
        res.status(500).json({
            isLoggedIn: false,
            error: 'Server error'
        });
    }
});

// 4. LOGOUT
app.post('/api/logout', (req, res) => {
    try {
        req.session.destroy();
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during logout'
        });
    }
});

// 5. GET ALL SCRIPTS (Simulated - sau này kết nối với InfinityBodyGuard)
app.get('/api/scripts', requireLogin, async (req, res) => {
    try {
        console.log('📋 Fetching scripts for user:', req.session.username);
        
        // Mô phỏng dữ liệu - THAY THẾ BẰNG KẾT NỐI THẬT SAU
        const mockScripts = [
            {
                id: 'script_001',
                name: 'AutoFarm',
                size: 2456,
                lines: 89,
                views: 156,
                createdAt: '2024-01-15T10:30:00Z',
                updatedAt: '2024-01-20T14:25:00Z',
                rawUrl: `${INFINITYBODYGUARD_URL}/raw/AutoFarm`,
                loadstring: `loadstring(game:HttpGet('${INFINITYBODYGUARD_URL}/raw/AutoFarm?key=${BODYGUARD_SECRET.substring(0, 10)}'))()`,
                status: 'active'
            },
            {
                id: 'script_002',
                name: 'ESP_Player',
                size: 1876,
                lines: 67,
                views: 89,
                createdAt: '2024-01-18T09:15:00Z',
                updatedAt: '2024-01-19T11:40:00Z',
                rawUrl: `${INFINITYBODYGUARD_URL}/raw/ESP_Player`,
                loadstring: `loadstring(game:HttpGet('${INFINITYBODYGUARD_URL}/raw/ESP_Player?key=${BODYGUARD_SECRET.substring(0, 10)}'))()`,
                status: 'active'
            },
            {
                id: 'script_003',
                name: 'Speed_Hack',
                size: 1234,
                lines: 45,
                views: 203,
                createdAt: '2024-01-10T08:20:00Z',
                updatedAt: '2024-01-12T16:10:00Z',
                rawUrl: `${INFINITYBODYGUARD_URL}/raw/Speed_Hack`,
                loadstring: `loadstring(game:HttpGet('${INFINITYBODYGUARD_URL}/raw/Speed_Hack?key=${BODYGUARD_SECRET.substring(0, 10)}'))()`,
                status: 'inactive'
            }
        ];
        
        // Nếu có kết nối thật với InfinityBodyGuard, dùng đoạn này:
        /*
        try {
            const response = await axios.get(`${INFINITYBODYGUARD_URL}/api/scripts`, {
                params: { secret: BODYGUARD_SECRET }
            });
            
            if (response.data.success) {
                return res.json({
                    success: true,
                    count: response.data.count,
                    scripts: response.data.scripts
                });
            }
        } catch (error) {
            console.warn('Cannot connect to InfinityBodyGuard, using mock data');
        }
        */
        
        // Trả về dữ liệu mô phỏng
        res.json({
            success: true,
            count: mockScripts.length,
            scripts: mockScripts,
            source: 'mock_data' // Đổi thành 'infinitybodyguard' khi kết nối thật
        });
        
    } catch (error) {
        console.error('Get scripts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch scripts',
            details: error.message
        });
    }
});

// 6. CREATE NEW SCRIPT
app.post('/api/create-script', requireLogin, async (req, res) => {
    try {
        const { name, code } = req.body;
        
        if (!name || !code) {
            return res.status(400).json({
                success: false,
                error: 'Script name and code are required'
            });
        }
        
        console.log(`📝 Creating script: ${name} (${code.length} bytes)`);
        
        // Nếu có kết nối thật với InfinityBodyGuard, dùng đoạn này:
        /*
        try {
            const response = await axios.post(`${INFINITYBODYGUARD_URL}/api/upload`, {
                scriptName: name,
                scriptCode: code,
                secret: BODYGUARD_SECRET
            });
            
            return res.json(response.data);
        } catch (error) {
            console.error('InfinityBodyGuard upload error:', error.response?.data || error.message);
        }
        */
        
        // Tạo dữ liệu mô phỏng
        const scriptId = `script_${Date.now()}`;
        const rawUrl = `${INFINITYBODYGUARD_URL}/raw/${name}`;
        const loadstring = `loadstring(game:HttpGet('${rawUrl}?key=${BODYGUARD_SECRET.substring(0, 10)}'))()`;
        
        res.json({
            success: true,
            message: 'Script created successfully (simulated)',
            data: {
                id: scriptId,
                name: name,
                rawUrl: rawUrl,
                loadstring: loadstring,
                uploadTime: new Date().toISOString(),
                size: code.length,
                lines: code.split('\n').length,
                creator: req.session.username
            }
        });
        
    } catch (error) {
        console.error('Create script error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create script',
            details: error.message
        });
    }
});

// 7. DELETE SCRIPT
app.delete('/api/script/:name', requireLogin, async (req, res) => {
    try {
        const scriptName = req.params.name;
        
        console.log(`🗑️ Deleting script: ${scriptName} by ${req.session.username}`);
        
        // Nếu có kết nối thật:
        /*
        try {
            const response = await axios.delete(`${INFINITYBODYGUARD_URL}/api/script/${scriptName}`, {
                params: { secret: BODYGUARD_SECRET }
            });
            
            return res.json(response.data);
        } catch (error) {
            console.error('InfinityBodyGuard delete error:', error);
        }
        */
        
        res.json({
            success: true,
            message: `Script "${scriptName}" deleted successfully (simulated)`,
            deletedBy: req.session.username,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Delete script error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete script',
            details: error.message
        });
    }
});

// 8. EDIT SCRIPT
app.put('/api/script/:name', requireLogin, async (req, res) => {
    try {
        const scriptName = req.params.name;
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Script code is required for editing'
            });
        }
        
        console.log(`✏️ Editing script: ${scriptName} by ${req.session.username}`);
        
        res.json({
            success: true,
            message: `Script "${scriptName}" updated successfully (simulated)`,
            data: {
                name: scriptName,
                updatedAt: new Date().toISOString(),
                size: code.length,
                lines: code.split('\n').length,
                updatedBy: req.session.username
            }
        });
        
    } catch (error) {
        console.error('Edit script error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to edit script',
            details: error.message
        });
    }
});

// 9. UPLOAD FILE
app.post('/api/upload-file', requireLogin, async (req, res) => {
    try {
        const { fileName, fileContent } = req.body;
        
        if (!fileName || !fileContent) {
            return res.status(400).json({
                success: false,
                error: 'File name and content are required'
            });
        }
        
        console.log(`📤 Uploading file: ${fileName} (${fileContent.length} bytes)`);
        
        // Xử lý file .lua
        const scriptName = fileName.replace('.lua', '');
        
        res.json({
            success: true,
            message: 'File uploaded and script created (simulated)',
            data: {
                originalFileName: fileName,
                scriptName: scriptName,
                rawUrl: `${INFINITYBODYGUARD_URL}/raw/${scriptName}`,
                loadstring: `loadstring(game:HttpGet('${INFINITYBODYGUARD_URL}/raw/${scriptName}?key=${BODYGUARD_SECRET.substring(0, 10)}'))()`,
                uploadTime: new Date().toISOString(),
                size: fileContent.length,
                lines: fileContent.split('\n').length,
                uploadedBy: req.session.username
            }
        });
        
    } catch (error) {
        console.error('Upload file error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload file',
            details: error.message
        });
    }
});

// 10. GET HISTORY
app.get('/api/history', requireLogin, (req, res) => {
    try {
        console.log(`📜 Fetching history for: ${req.session.username}`);
        
        // Dữ liệu lịch sử mô phỏng
        const mockHistory = [
            {
                id: 'log_001',
                action: 'CREATE',
                scriptName: 'AutoFarm',
                user: req.session.username,
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                details: 'Script created via dashboard'
            },
            {
                id: 'log_002',
                action: 'EDIT',
                scriptName: 'ESP_Player',
                user: req.session.username,
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                details: 'Updated ESP features'
            },
            {
                id: 'log_003',
                action: 'DELETE',
                scriptName: 'Old_Hack',
                user: req.session.username,
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                details: 'Removed deprecated script'
            },
            {
                id: 'log_004',
                action: 'UPLOAD',
                scriptName: 'Speed_Hack',
                user: req.session.username,
                timestamp: new Date(Date.now() - 172800000).toISOString(),
                details: 'Uploaded via file upload'
            }
        ];
        
        res.json({
            success: true,
            count: mockHistory.length,
            history: mockHistory,
            user: req.session.username
        });
        
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch history',
            details: error.message
        });
    }
});

// 11. GET DASHBOARD STATS
app.get('/api/stats', requireLogin, (req, res) => {
    try {
        const stats = {
            totalScripts: 3,
            totalViews: 448,
            totalSize: '5.57 KB',
            activeScripts: 2,
            inactiveScripts: 1,
            last24hViews: 45,
            avgScriptSize: '1.86 KB',
            protectionStatus: 'ACTIVE',
            lastBackup: new Date(Date.now() - 86400000).toISOString(),
            serverUptime: '99.8%'
        };
        
        res.json({
            success: true,
            stats: stats,
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats',
            details: error.message
        });
    }
});

// ==================== STATIC FILES ====================
// Phục vụ file tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, '../public')));

// Route cho dashboard.html
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Route cho index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ==================== ERROR HANDLING ====================
// 404 handler cho API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `API endpoint ${req.originalUrl} not found`,
        availableEndpoints: [
            '/api/test',
            '/api/login',
            '/api/logout',
            '/api/check-auth',
            '/api/scripts',
            '/api/create-script',
            '/api/script/:name',
            '/api/upload-file',
            '/api/history',
            '/api/stats'
        ]
    });
});

// 404 handler cho frontend routes - luôn phục vụ index.html
app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   🚀 INFINITYBODYGUARD DASHBOARD STARTED                ║
╠══════════════════════════════════════════════════════════╣
║  Port:          ${PORT}                                  
║  Admin:         ${ADMIN_USERNAME}                         
║  Environment:   ${process.env.NODE_ENV || 'development'} 
║  InfinityGuard: ${INFINITYBODYGUARD_URL}                 
╠══════════════════════════════════════════════════════════╣
║  📍 Test URLs:                                          
║     • http://localhost:${PORT}/api/test                 
║     • http://localhost:${PORT}/api/scripts              
║     • http://localhost:${PORT}/                          
║     • http://localhost:${PORT}/dashboard.html           
╠══════════════════════════════════════════════════════════╣
║  🔐 Authentication: ${ADMIN_USERNAME}:${ADMIN_PASSWORD} 
║  🛡️  Protection:    InfinityBodyGuard Connected         
╚══════════════════════════════════════════════════════════╝
    `);
    
    // Test các endpoint khi server start
    console.log('\n🔧 Initializing endpoints...');
    console.log('✅ /api/test - Server status');
    console.log('✅ /api/login - Admin authentication');
    console.log('✅ /api/check-auth - Session check');
    console.log('✅ /api/scripts - Script management');
    console.log('✅ /api/create-script - Create new script');
    console.log('✅ /api/upload-file - File upload');
    console.log('✅ /api/history - Activity logs');
    console.log('✅ Static files - Serving from /public');
    console.log('\n📢 Dashboard is ready! Open http://localhost:' + PORT + ' in your browser.');
});
