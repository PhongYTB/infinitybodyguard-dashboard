const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'infinity_dashboard_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

// Biến môi trường
const INFINITYBODYGUARD_URL = process.env.INFINITYBODYGUARD_URL || 'https://infinitybodyguard.vercel.app';
const BODYGUARD_SECRET = process.env.BODYGUARD_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'phong123';

// 🔐 Middleware kiểm tra đăng nhập
const requireLogin = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

// ==================== API ROUTES ====================

// 1. Đăng nhập
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isLoggedIn = true;
        req.session.username = username;
        req.session.loginTime = new Date();
        
        res.json({ 
            success: true, 
            message: 'Login successful',
            user: { 
                username, 
                loginTime: req.session.loginTime 
            }
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Invalid username or password' 
        });
    }
});

// 2. Kiểm tra đăng nhập
app.get('/api/check-auth', (req, res) => {
    if (req.session.isLoggedIn) {
        res.json({ 
            isLoggedIn: true, 
            username: req.session.username,
            loginTime: req.session.loginTime 
        });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// 3. Đăng xuất
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

// 4. Tạo script mới (gửi lên InfinityBodyGuard)
app.post('/api/create-script', requireLogin, async (req, res) => {
    try {
        const { name, code } = req.body;
        
        if (!name || !code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Script name and code are required' 
            });
        }
        
        // Gửi script lên InfinityBodyGuard
        const response = await axios.post(`${INFINITYBODYGUARD_URL}/api/upload`, {
            scriptName: name,
            scriptCode: code,
            secret: BODYGUARD_SECRET
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Create script error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create script',
            details: error.response?.data || error.message 
        });
    }
});

// 5. Lấy danh sách script từ InfinityBodyGuard
app.get('/api/scripts', requireLogin, async (req, res) => {
    try {
        const response = await axios.get(`${INFINITYBODYGUARD_URL}/api/scripts`, {
            params: { secret: BODYGUARD_SECRET }
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Get scripts error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch scripts',
            details: error.response?.data || error.message 
        });
    }
});

// 6. Xóa script
app.delete('/api/script/:name', requireLogin, async (req, res) => {
    try {
        const { name } = req.params;
        
        const response = await axios.delete(`${INFINITYBODYGUARD_URL}/api/script/${name}`, {
            params: { secret: BODYGUARD_SECRET }
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Delete script error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete script',
            details: error.response?.data || error.message 
        });
    }
});

// 7. Chỉnh sửa script
app.put('/api/script/:name', requireLogin, async (req, res) => {
    try {
        const { name } = req.params;
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Script code is required' 
            });
        }
        
        // Để edit: xóa script cũ, tạo script mới với cùng tên
        // 1. Xóa script cũ
        await axios.delete(`${INFINITYBODYGUARD_URL}/api/script/${name}`, {
            params: { secret: BODYGUARD_SECRET }
        });
        
        // 2. Tạo script mới
        const response = await axios.post(`${INFINITYBODYGUARD_URL}/api/upload`, {
            scriptName: name,
            scriptCode: code,
            secret: BODYGUARD_SECRET
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Edit script error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to edit script',
            details: error.response?.data || error.message 
        });
    }
});

// 8. Upload file Lua
app.post('/api/upload-file', requireLogin, async (req, res) => {
    try {
        // Lưu ý: Cần cài đặt multer để xử lý file upload
        // Ở đây tôi xử lý base64 từ frontend để đơn giản
        
        const { fileName, fileContent } = req.body;
        
        if (!fileName || !fileContent) {
            return res.status(400).json({ 
                success: false, 
                error: 'File name and content are required' 
            });
        }
        
        // Gửi nội dung file lên InfinityBodyGuard
        const scriptName = fileName.replace('.lua', '');
        const response = await axios.post(`${INFINITYBODYGUARD_URL}/api/upload`, {
            scriptName: scriptName,
            scriptCode: fileContent,
            secret: BODYGUARD_SECRET
        });
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Upload file error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to upload file',
            details: error.response?.data || error.message 
        });
    }
});

// 9. Lấy lịch sử (simulated - có thể mở rộng)
app.get('/api/history', requireLogin, (req, res) => {
    // Trong thực tế, lưu vào database
    const history = [
        {
            id: 1,
            action: 'CREATE',
            scriptName: 'test_script',
            timestamp: new Date().toISOString(),
            user: req.session.username
        },
        {
            id: 2,
            action: 'DELETE',
            scriptName: 'old_script',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            user: req.session.username
        }
    ];
    
    res.json({ success: true, history });
});

// ==================== STATIC FILES ====================

// Phục vụ file tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, '../public')));

// Route mặc định - redirect đến login
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 InfinityBodyGuard Dashboard running on port ${PORT}`);
    console.log(`👤 Admin: ${ADMIN_USERNAME}`);
    console.log(`🔗 Connected to: ${INFINITYBODYGUARD_URL}`);
});
