const express = require('express');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'dashboard_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'strict'
    }
}));

// Biến môi trường
const INFINITYBODYGUARD_URL = 'https://infinitybodyguard.vercel.app';
const BODYGUARD_SECRET = process.env.BODYGUARD_SECRET;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'phong123';

// 🔐 Middleware kiểm tra đăng nhập
const requireLogin = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/?error=not_logged_in');
    }
    next();
};

// Trang login
app.get('/', (req, res) => {
    if (req.session.isLoggedIn) {
        return res.redirect('/dashboard.html');
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API đăng nhập
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isLoggedIn = true;
        req.session.username = username;
        req.session.loginTime = new Date();
        
        res.json({ 
            success: true, 
            message: 'Login successful',
            user: { username, loginTime: req.session.loginTime }
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Invalid username or password' 
        });
    }
});

// API đăng xuất
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

// 📤 API upload script lên InfinityBodyGuard
app.post('/api/upload-script', requireLogin, async (req, res) => {
    try {
        const { scriptName, scriptCode } = req.body;
        
        if (!scriptName || !scriptCode) {
            return res.status(400).json({ 
                success: false, 
                error: 'Script name and code required' 
            });
        }
        
        // Gửi script lên InfinityBodyGuard
        const response = await axios.post(`${INFINITYBODYGUARD_URL}/api/upload`, {
            scriptName: scriptName,
            scriptCode: scriptCode,
            secret: BODYGUARD_SECRET
        });
        
        res.json(response.data);
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response?.data 
        });
    }
});

// 📋 API lấy danh sách script từ InfinityBodyGuard
app.get('/api/scripts', requireLogin, async (req, res) => {
    try {
        const response = await axios.get(`${INFINITYBODYGUARD_URL}/api/scripts`, {
            params: { secret: BODYGUARD_SECRET }
        });
        
        res.json(response.data);
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 🗑️ API xóa script từ InfinityBodyGuard
app.delete('/api/script/:name', requireLogin, async (req, res) => {
    try {
        const scriptName = req.params.name;
        
        const response = await axios.delete(`${INFINITYBODYGUARD_URL}/api/script/${scriptName}`, {
            params: { secret: BODYGUARD_SECRET }
        });
        
        res.json(response.data);
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 📁 API upload file
app.post('/api/upload-file', requireLogin, async (req, res) => {
    try {
        // Code xử lý upload file (có thể dùng multer)
        // ...
        
        res.json({ 
            success: true, 
            message: 'File uploaded - implement file handling' 
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Phục vụ file tĩnh
app.use(express.static(path.join(__dirname, '../public')));

// Chặn truy cập trực tiếp vào dashboard nếu chưa login
app.get('/dashboard.html', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Redirect tất cả route khác
app.get('*', (req, res) => {
    res.redirect('/');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`📊 INFINITYBODYGUARD DASHBOARD running on port ${PORT}`);
    console.log(`👤 Admin: ${ADMIN_USER}`);
    console.log(`🔗 InfinityBodyGuard: ${INFINITYBODYGUARD_URL}`);
});
