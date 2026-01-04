const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();

// ==================== FIX QUAN TRỌNG: SERVE STATIC FILES ====================
const PUBLIC_DIR = path.join(__dirname, '../public');

// Kiểm tra thư mục public tồn tại
(async () => {
    try {
        await fs.access(PUBLIC_DIR);
        console.log('✅ Public directory exists:', PUBLIC_DIR);
    } catch (error) {
        console.log('⚠️ Public directory not found, creating...');
        await fs.mkdir(PUBLIC_DIR, { recursive: true });
        
        // Tạo file index.html mặc định nếu chưa có
        const defaultHTML = `<!DOCTYPE html>
        <html>
        <head><title>InfinityBodyGuard Dashboard</title></head>
        <body style="background:#0f0f23;color:white;text-align:center;padding:50px;">
            <h1>InfinityBodyGuard Dashboard</h1>
            <p>Loading dashboard files...</p>
            <script>window.location.href = '/dashboard.html';</script>
        </body>
        </html>`;
        
        await fs.writeFile(path.join(PUBLIC_DIR, 'index.html'), defaultHTML);
    }
})();

// ==================== CẤU HÌNH ====================
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'infinity_dashboard_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000, httpOnly: true }
}));

// ==================== ROUTE ĐẦU TIÊN: STATIC FILES ====================
// Serve static files TRƯỚC API routes
app.use(express.static(PUBLIC_DIR));

// Route cụ thể cho các file HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'dashboard.html'));
});

// ==================== API ROUTES ====================

// 1. TEST ENDPOINT
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true,
        message: 'Dashboard API is working!',
        publicDir: PUBLIC_DIR,
        files: ['index.html', 'dashboard.html', 'style.css', 'script.js']
    });
});

// 2. LOGIN
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'phong123';
    
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isLoggedIn = true;
        req.session.username = username;
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

// 3. CHECK AUTH
app.get('/api/check-auth', (req, res) => {
    res.json({ 
        isLoggedIn: !!req.session.isLoggedIn,
        username: req.session.username 
    });
});

// ==================== 404 HANDLER ====================
// Nếu không match bất kỳ route nào trên
app.use((req, res) => {
    // Kiểm tra nếu request là API
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ 
            error: `API endpoint ${req.path} not found`,
            available: ['/api/test', '/api/login', '/api/check-auth']
        });
    }
    
    // Nếu là file không tồn tại, trả về index.html
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║   🚀 InfinityBodyGuard Dashboard    ║
╠══════════════════════════════════════╣
║  Port: ${PORT}                         
║  Public Dir: ${PUBLIC_DIR}           
║  Test: http://localhost:${PORT}/api/test
║  Login: admin / phong123            
╚══════════════════════════════════════╝
    `);
});
