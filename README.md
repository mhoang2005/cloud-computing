CloudBook - Mini Social Network on Microsoft Azure

CloudBook là một ứng dụng mạng xã hội thu nhỏ được xây dựng trên nền tảng Node.js và triển khai hoàn toàn trên hệ sinh thái đám mây Microsoft Azure. Dự án tập trung vào việc tối ưu hóa hiệu năng và khả năng mở rộng thông qua mô hình Platform as a Service (PaaS) và kiến trúc lưu trữ lai.

1. Tính năng cốt lõi
- Xác thực người dùng: Đăng ký, đăng nhập an toàn với mật khẩu được băm bằng bcrypt và quản lý phiên bằng JWT.
- Quản lý bài đăng: Đăng tải trạng thái văn bản kèm theo hình ảnh hoặc video.
- Tương tác: Tính năng "Thích" (Like) và bình luận (Comment) bài viết theo thời gian thực.
- Trang cá nhân: Cập nhật thông tin chi tiết người dùng và ảnh đại diện.
- Tin nhắn (Chat): Cho phép người dùng trò chuyện trực tiếp với nhau.

2. Công nghệ sử dụng
- Backend & Tools
+ Runtime: Node.js (Express.js framework).
+ Database & Storage: Azure SQL Database (Dữ liệu có cấu trúc), Azure Blob Storage (Dữ liệu phi cấu trúc/Media).
+ DevOps: GitHub Actions & VS Code Azure Tools.
  
- Hạ tầng Azure (PaaS)
+ Azure App Service: Hosting backend Node.js với khả năng Auto-scaling.
+ Azure SQL Database: Hệ quản trị CSDL quan hệ đảm bảo tính nhất quán ACID.
+ Azure Blob Storage: Lưu trữ đối tượng giúp tách biệt media và tối ưu chi phí.

3. Kiến trúc hệ thống
Dự án áp dụng mô hình Lưu trữ lai (Hybrid Storage):
- Dữ liệu có cấu trúc (Users, Posts, Metadata): Được lưu trữ trong Azure SQL Database.
- Dữ liệu phi cấu trúc (Images, Videos): Được đẩy trực tiếp lên Azure Blob Storage.
- Tối ưu truy xuất: Trình duyệt phía Client tải media trực tiếp từ Blob Storage qua URL công khai, giúp giảm tải cho server trung tâm.

4. Hướng dẫn triển khai (Local)
a. Cài đặt môi trường: Yêu cầu Node.js bản LTS.
b. Cài đặt thư viện: npm install

c. Cấu hình biến môi trường: Tạo tệp .env tại thư mục gốc với các thông số sau:
DB_SERVER=your-sql-server.database.windows.net
DB_DATABASE=HungSocialNetworkDB
DB_USER=webapp_user
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
AZURE_STORAGE_CONNECTION_STRING="your_blob_connection_string"

Chạy ứng dụng: npm start

👥 Thành viên thực hiện (Nhóm 2.1 - PTIT)
Đỗ Minh Hoàng (B23DCKD024) 
Mai Quốc Hưng (B23DCKD030) 
Bùi Việt Thái (B23DCKD060) 

Giảng viên hướng dẫn: ThS. Nguyễn Đình Long
