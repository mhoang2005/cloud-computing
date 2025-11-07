const express = require('express');
const sql = require('mssql');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// --- CẤU HÌNH ---
app.use(express.static('public'));
app.use(express.json());

const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    console.error('--- !!! LỖI KHỞI ĐỘNG !!! ---');
    console.error('Biến môi trường AZURE_STORAGE_CONNECTION_STRING chưa được thiết lập!');
    process.exit(1);
}
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient('images'); // 'images' là tên container
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// --- MIDDLEWARE XÁC THỰC ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    if (!process.env.JWT_SECRET) {
         console.error('Lỗi nghiêm trọng: JWT_SECRET chưa được cấu hình!');
        return res.sendStatus(500);
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('JWT Error:', err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// --- API XÁC THỰC ---
app.post('/api/register', async (req, res) => {
    console.log('Nhận được yêu cầu POST /api/register');
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).send('Vui lòng điền đầy đủ thông tin.');
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await sql.connect(dbConfig);
        await sql.query`INSERT INTO Users (username, email, password_hash) VALUES (${username}, ${email}, ${hashedPassword})`;
        console.log('Đăng ký thành công cho:', email);
        res.status(201).send('Tạo tài khoản thành công!');
    } catch (err) {
        console.error('Lỗi khi đăng ký:', err.message);
        res.status(500).send('Lỗi máy chủ: Email hoặc Username có thể đã tồn tại.');
    }
});

app.post('/api/login', async (req, res) => {
    console.log('Nhận được yêu cầu POST /api/login');
    const { email, password } = req.body;
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT * FROM Users WHERE email = ${email}`;
        const user = result.recordset[0];
        if (!user) {
            console.log('Đăng nhập thất bại: Không tìm thấy email', email);
            return res.status(400).send('Email hoặc mật khẩu không chính xác.');
        }
        if (await bcrypt.compare(password, user.password_hash)) {
            console.log('Đăng nhập thành công cho:', email);
            const accessToken = jwt.sign(
                { 
                    userId: user.user_id, 
                    username: user.username,
                    avatar_url: user.avatar_url // Thêm avatar vào token
                }, 
                process.env.JWT_SECRET, 
                { expiresIn: '24h' }
            );
            res.json({ accessToken: accessToken });
        } else {
            console.log('Đăng nhập thất bại: Sai mật khẩu cho', email);
            res.status(400).send('Email hoặc mật khẩu không chính xác.');
        }
    } catch (err) {
        console.error('Lỗi máy chủ khi đăng nhập:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ.');
    }
});


// --- API BÀI VIẾT ---
app.get('/api/posts', authenticateToken, async (req, res) => {
    console.log('Nhận được yêu cầu GET /api/posts');
    const currentUserId = req.user.userId;
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`
            SELECT 
                p.*, 
                u.username, 
                u.avatar_url,
                (SELECT COUNT(*) FROM Likes l WHERE l.post_id = p.post_id) AS like_count,
                (SELECT COUNT(*) FROM Comments c WHERE c.post_id = p.post_id) AS comment_count,
                CASE WHEN EXISTS (
                    SELECT 1 FROM Likes l_user 
                    WHERE l_user.post_id = p.post_id AND l_user.user_id = ${currentUserId}
                ) THEN 1 ELSE 0 END AS has_liked
            FROM 
                Posts p 
                JOIN Users u ON p.user_id = u.user_id
            ORDER BY 
                p.created_at DESC
        `;
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi GET /api/posts:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

app.post('/api/posts', authenticateToken, upload.single('media'), async (req, res) => {
    console.log('Nhận được yêu cầu POST /api/posts');
    const { content } = req.body;
    const file = req.file;
    let mediaUrl = null;
    let blobName = null;
    if (!content && !file) return res.status(400).send('Nội dung bài viết hoặc media không được để trống.');

    if (file) {
        try {
            blobName = `${Date.now()}-${file.originalname}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.upload(file.buffer, file.size, { blobHTTPHeaders: { blobContentType: file.mimetype } });
            
            // --- LOGIC CDN ---
            const cdnHost = process.env.CDN_HOSTNAME;
            if (cdnHost) {
                // Xây dựng URL CDN
                mediaUrl = `https://${cdnHost}/${containerClient.containerName}/${blobName}`;
            } else {
                // Fallback về URL Blob gốc (nếu không set env)
                mediaUrl = blockBlobClient.url;
            }
            // --- KẾT THÚC CDN ---

        } catch (err) {
            console.error('Lỗi upload media:', err.message);
            if (err.code === 'LIMIT_FILE_SIZE') {
                 return res.status(400).send('Lỗi: Tệp quá lớn, chỉ cho phép dưới 50MB.');
            }
            return res.status(500).send('Lỗi khi upload media.');
        }
    }

    try {
        await sql.connect(dbConfig);
        const userId = req.user.userId;
        const result = await sql.query`INSERT INTO Posts (user_id, content, image_url) OUTPUT INSERTED.* VALUES (${userId}, ${content}, ${mediaUrl})`;
        const newPost = result.recordset[0];
        
        const userResult = await sql.query`SELECT username, avatar_url FROM Users WHERE user_id = ${userId}`;
        const finalPost = { 
            ...newPost, 
            ...userResult.recordset[0],
            like_count: 0,
            comment_count: 0,
            has_liked: 0
        };
        res.status(201).json(finalPost);
    } catch (err) {
        console.error('Lỗi POST /api/posts:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

app.delete('/api/posts/:postId', authenticateToken, async (req, res) => {
    console.log(`Nhận được yêu cầu DELETE /api/posts/${req.params.postId}`);
    try {
        const postId = req.params.postId;
        const userId = req.user.userId;
        await sql.connect(dbConfig);
        const result = await sql.query`DELETE FROM Posts WHERE post_id = ${postId} AND user_id = ${userId}`;
        if (result.rowsAffected[0] > 0) {
            res.status(200).send('Xóa bài viết thành công.');
        } else {
            res.status(403).send('Không có quyền xóa bài viết này.');
        }
    } catch (err) {
        console.error('Lỗi DELETE /api/posts:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

app.put('/api/posts/:postId', authenticateToken, async (req, res) => {
    console.log(`Nhận được yêu cầu PUT /api/posts/${req.params.postId}`);
    try {
        const postId = req.params.postId;
        const userId = req.user.userId;
        const { content } = req.body;
        if (!content) return res.status(400).send('Nội dung không được để trống.');

        await sql.connect(dbConfig);
        const result = await sql.query`UPDATE Posts SET content = ${content} OUTPUT INSERTED.* WHERE post_id = ${postId} AND user_id = ${userId}`;

        if (result.recordset.length > 0) {
            res.status(200).json(result.recordset[0]);
        } else {
            res.status(403).send('Không có quyền chỉnh sửa bài viết này.');
        }
    } catch (err) {
        console.error('Lỗi PUT /api/posts:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

// --- API LIKE VÀ COMMENT ---
app.post('/api/posts/:postId/like', authenticateToken, async (req, res) => {
    const postId = req.params.postId;
    const userId = req.user.userId;
    console.log(`Nhận được yêu cầu POST /api/posts/${postId}/like từ user ${userId}`);

    try {
        await sql.connect(dbConfig);
        try {
            await sql.query`INSERT INTO Likes (user_id, post_id) VALUES (${userId}, ${postId})`;
            res.status(201).json({ liked: true });
        } catch (err) {
            if (err.number === 2627 || err.number === 2601) { 
                await sql.query`DELETE FROM Likes WHERE user_id = ${userId} AND post_id = ${postId}`;
                res.status(200).json({ liked: false });
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error('Lỗi POST /api/posts/like:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

app.get('/api/posts/:postId/comments', authenticateToken, async (req, res) => {
    const postId = req.params.postId;
    console.log(`Nhận được yêu cầu GET /api/posts/${postId}/comments`);
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`
            SELECT c.*, u.username, u.avatar_url 
            FROM Comments c
            JOIN Users u ON c.user_id = u.user_id
            WHERE c.post_id = ${postId}
            ORDER BY c.created_at ASC
        `;
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi GET /api/posts/comments:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

app.post('/api/posts/:postId/comment', authenticateToken, async (req, res) => {
    const postId = req.params.postId;
    const userId = req.user.userId;
    const { content } = req.body;
    console.log(`Nhận được yêu cầu POST /api/posts/${postId}/comment`);

    if (!content) return res.status(400).send('Nội dung bình luận không được để trống.');

    try {
        await sql.connect(dbConfig);
        const result = await sql.query`
            INSERT INTO Comments (user_id, post_id, content) 
            OUTPUT INSERTED.* VALUES (${userId}, ${postId}, ${content})
        `;
        const newComment = result.recordset[0];
        const userResult = await sql.query`SELECT username, avatar_url FROM Users WHERE user_id = ${userId}`;
        const finalComment = { ...newComment, ...userResult.recordset[0] };
        res.status(201).json(finalComment);
    } catch (err) {
        console.error('Lỗi POST /api/posts/comment:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});


// --- API PROFILE ---
app.get('/api/profile/:userId', authenticateToken, async (req, res) => {
    console.log(`Nhận được yêu cầu GET /api/profile/${req.params.userId}`);
    try {
        const userId = req.params.userId;
        await sql.connect(dbConfig);
        const result = await sql.query`
            SELECT 
                user_id, username, email, avatar_url, 
                dob, workplace, hometown, current_city, 
                interests, relationship_status 
            FROM Users 
            WHERE user_id = ${userId}
        `;
        if (result.recordset.length === 0) {
            return res.status(404).send('Không tìm thấy người dùng.');
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Lỗi GET /api/profile:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

app.put('/api/profile/me', authenticateToken, async (req, res) => {
    console.log('Nhận được yêu cầu PUT /api/profile/me');
    const currentUserId = req.user.userId;
    const {
        username, dob, workplace, hometown,
        current_city, interests, relationship_status
    } = req.body;
    try {
        await sql.connect(dbConfig);
        await sql.query`
            UPDATE Users 
            SET 
                username = ${username}, dob = ${dob}, workplace = ${workplace},
                hometown = ${hometown}, current_city = ${current_city},
                interests = ${interests}, relationship_status = ${relationship_status}
            WHERE 
                user_id = ${currentUserId}
        `;
        res.status(200).send('Cập nhật thông tin thành công!');
    } catch (err) {
        console.error('Lỗi PUT /api/profile/me:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

app.put('/api/profile/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    console.log('Nhận được yêu cầu PUT /api/profile/avatar');
    const currentUserId = req.user.userId;
    const file = req.file;
    if (!file) {
        return res.status(400).send('Không tìm thấy tệp ảnh nào.');
    }
    let imageUrl = null;
    let blobName = null;
    try {
        blobName = `avatar-${currentUserId}-${Date.now()}-${file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(file.buffer, file.size, {
            blobHTTPHeaders: { blobContentType: file.mimetype }
        });

        // --- LOGIC CDN ---
        const cdnHost = process.env.CDN_HOSTNAME;
        if (cdnHost) {
            imageUrl = `https://${cdnHost}/${containerClient.containerName}/${blobName}`;
        } else {
            imageUrl = blockBlobClient.url;
        }
        // --- KẾT THÚC CDN ---

    } catch (err) {
        console.error('Lỗi upload ảnh avatar:', err.message);
        return res.status(500).send('Lỗi khi upload ảnh.');
    }
    try {
        await sql.connect(dbConfig);
        await sql.query`
            UPDATE Users 
            SET avatar_url = ${imageUrl} 
            WHERE user_id = ${currentUserId}
        `;
        res.status(200).json({ message: 'Cập nhật ảnh đại diện thành công!', avatar_url: imageUrl });
    } catch (err) {
        console.error('Lỗi PUT /api/profile/avatar (SQL):', err.message);
        res.status(500).send('Lỗi khi cập nhật CSDL.');
    }
});

// --- API BẠN BÈ VÀ TIN NHẮN ---
app.get('/api/users', authenticateToken, async (req, res) => {
    console.log('Nhận được yêu cầu GET /api/users');
    try {
        await sql.connect(dbConfig);
        const currentUserId = req.user.userId;
        const result = await sql.query`SELECT user_id, username, avatar_url FROM Users WHERE user_id != ${currentUserId}`;
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi GET /api/users:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
    console.log(`Nhận được yêu cầu GET /api/messages/${req.params.otherUserId}`);
    try {
        const currentUserId = req.user.userId;
        const otherUserId = req.params.otherUserId;
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT * FROM Messages WHERE (sender_id = ${currentUserId} AND receiver_id = ${otherUserId}) OR (sender_id = ${otherUserId} AND receiver_id = ${currentUserId}) ORDER BY created_at ASC`;
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi GET /api/messages:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
    console.log('Nhận được yêu cầu POST /api/messages');
    const { receiver_id, content } = req.body;
    const sender_id = req.user.userId;
    if (!receiver_id || !content) return res.status(400).send('Thiếu thông tin.');
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`INSERT INTO Messages (sender_id, receiver_id, content) OUTPUT INSERTED.* VALUES (${sender_id}, ${receiver_id}, ${content})`;
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Lỗi POST /api/messages:', err.message);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
});

// --- KHỞI ĐỘNG SERVER ---
const startServer = async () => {
    try {
        console.log('--- Bắt đầu khởi động server ---');
        console.log('Đang kiểm tra biến môi trường...');
        if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) throw new Error('Thiếu biến môi trường CSDL.');
        if (!process.env.AZURE_STORAGE_CONNECTION_STRING) throw new Error('Thiếu biến môi trường AZURE_STORAGE_CONNECTION_STRING.');
        if (!process.env.JWT_SECRET) throw new Error('Thiếu biến môi trường JWT_SECRET.');
        console.log('>>> Biến môi trường OK.');

        console.log('Đang kiểm tra kết nối đến Cơ sở dữ liệu...');
        await sql.connect(dbConfig);
        console.log('>>> Kết nối Cơ sở dữ liệu THÀNH CÔNG!');

        app.listen(port, () => {
            console.log(`>>> Server CloudBook đã khởi động và đang lắng nghe trên cổng ${port}`);
        });
    } catch (err) {
        console.error('--- !!! LỖI KHỞI ĐỘNG NGHIÊM TRỌNG !!! ---');
        console.error('Chi tiết lỗi:', err.message);
        process.exit(1);
    }
};

startServer();
