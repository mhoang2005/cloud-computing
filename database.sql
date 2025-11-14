/* XÓA BẢNG CŨ NẾU TỒN TẠI (ĐỂ CHẠY LẠI TỪ ĐẦU) */
DROP TABLE IF EXISTS Messages;
DROP TABLE IF EXISTS Comments;
DROP TABLE IF EXISTS Likes;
DROP TABLE IF EXISTS Posts;
DROP TABLE IF EXISTS Advertisements;
DROP TABLE IF EXISTS Users;
GO

/* Bảng 1: Người dùng */
CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    avatar_url NVARCHAR(500) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    /* Thông tin profile */
    dob DATE NULL,
    workplace NVARCHAR(255) NULL,
    hometown NVARCHAR(255) NULL,
    current_city NVARCHAR(255) NULL,
    interests NVARCHAR(MAX) NULL,
    relationship_status NVARCHAR(100) NULL,

    /* Admin */
    isAdmin BIT DEFAULT 0
);
GO

/* Bảng 2: Bài viết */
CREATE TABLE Posts (
    post_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    content NVARCHAR(MAX) NULL,
    image_url NVARCHAR(500) NULL, /* Sẽ lưu cả link ảnh và video */
    created_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO

/* Bảng 3: Tin nhắn */
CREATE TABLE Messages (
    message_id INT PRIMARY KEY IDENTITY(1,1),
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    is_read BIT DEFAULT 0
);
GO

/* Bảng 4: Lượt thích (QUAN TRỌNG CHO TAB "ĐÃ THÍCH") */
CREATE TABLE Likes (
    like_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT UQ_User_Post_Like UNIQUE (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE NO ACTION,
    FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE
);
GO

/* Bảng 5: Bình luận */
CREATE TABLE Comments (
    comment_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE NO ACTION,
    FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE
);
GO

/* Bảng 6: Quảng cáo (CHO TRANG ADMIN) */
CREATE TABLE Advertisements (
    ad_id INT PRIMARY KEY IDENTITY(1,1),
    title NVARCHAR(255) NOT NULL,
    company NVARCHAR(100),
    image_url NVARCHAR(500) NOT NULL,
    link_url NVARCHAR(500) NOT NULL,
    is_active BIT DEFAULT 1
);
GO

/* --- CHÈN DỮ LIỆU MẪU --- */

/* 1. User Mẫu (Admin) */
INSERT INTO Users (username, email, password_hash, isAdmin) 
VALUES ('hung', 'hung.mq@example.com', '$2b$10$f6B..d/u.g5.e.1/b.o/Z.1lVqKm6c.gH/W.f.H/x.g..e/j.k.O.', 1); -- Mật khẩu: 123456

/* 2. User Mẫu (Thường) */
INSERT INTO Users (username, email, password_hash, isAdmin) 
VALUES ('mhoang', 'mhoang@example.com', '$2b$10$f6B..d/u.g5.e.1/b.o/Z.1lVqKm6c.gH/W.f.H/x.g..e/j.k.O.', 0); -- Mật khẩu: 123456

/* 3. Quảng cáo Mẫu */
INSERT INTO Advertisements (title, company, image_url, link_url, is_active)
VALUES ('Học Azure Cloud ngay!', 'PTIT', 'https://placehold.co/300x200/2563EB/FFFFFF?text=Quang+Cao', '#', 1);
GO
