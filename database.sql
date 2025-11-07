/* XÓA BẢNG CŨ NẾU TỒN TẠI (ĐỂ CHẠY LẠI TỪ ĐẦU) */
DROP TABLE IF EXISTS Messages;
DROP TABLE IF EXISTS Comments;
DROP TABLE IF EXISTS Likes;
DROP TABLE IF EXISTS Posts;
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
    relationship_status NVARCHAR(100) NULL
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

/* Bảng 4: Lượt thích */
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

/* Chèn một tài khoản mẫu (mật khẩu: 123456) */
INSERT INTO Users (username, email, password_hash) 
VALUES ('MaiQuocHung', 'hung.mq@example.com', '$2b$10$f6B..d/u.g5.e.1/b.o/Z.1lVqKm6c.gH/W.f.H/x.g..e/j.k.O.');
GO
