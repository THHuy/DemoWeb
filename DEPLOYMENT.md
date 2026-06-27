# HƯỚNG DẪN DEPLOY DỰ ÁN LÊN SERVER UBUNTU + GITHUB

Tài liệu này hướng dẫn chi tiết từ A-Z cách thiết lập máy chủ Ubuntu, cấu hình cơ sở dữ liệu PostgreSQL, kéo mã nguồn từ GitHub, build ứng dụng và cấu hình Nginx làm Reverse Proxy kết hợp với PM2 để chạy ngầm và SSL Let's Encrypt.

---

## 1. Sơ đồ Kiến trúc Vận hành (Architecture)

```mermaid
graph TD
    User([Người dùng / Trình duyệt]) -->|HTTP/HTTPS| Nginx[Nginx Reverse Proxy]
    Nginx -->|Proxy tới /api| Express[Express API Server - Port 3001]
    Nginx -->|Proxy tới các route khác| NextJS[Next.js App - Port 3000]
    Express -->|Kết nối| PostgreSQL[(PostgreSQL - Port 5432)]
```

---

## 2. Chuẩn bị trên Server Ubuntu

Đăng nhập vào server Ubuntu của bạn qua SSH:
```bash
ssh user@your_server_ip
```

### Bước 2.1: Cập nhật hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

### Bước 2.2: Cài đặt Node.js (Phiên bản v20 LTS)
Sử dụng NodeSource để cài đặt phiên bản Node.js phù hợp:
```bash
sudo apt install -y curl dirmngr apt-transport-https lsb-release ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```
Kiểm tra cài đặt thành công:
```bash
node -v
npm -v
```

### Bước 2.3: Cài đặt PostgreSQL
Cài đặt PostgreSQL và các công cụ đi kèm:
```bash
sudo apt install -y postgresql postgresql-contrib
```
Kiểm tra dịch vụ PostgreSQL đang chạy:
```bash
sudo systemctl status postgresql
```

### Bước 2.4: Cấu hình Database PostgreSQL
1. Truy cập vào tài khoản quản trị postgres:
   ```bash
   sudo -i -u postgres psql
   ```
2. Tạo cơ sở dữ liệu mới (ví dụ đặt tên là `lambiance`):
   ```sql
   CREATE DATABASE lambiance;
   ```
3. Tạo người dùng mới và đặt mật khẩu bảo mật:
   ```sql
   CREATE USER db_user WITH PASSWORD 'MatKhauBaoMatCuaBan';
   ```
4. Cấp toàn quyền cho người dùng trên cơ sở dữ liệu mới:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE lambiance TO db_user;
   -- Trên PostgreSQL 15+, bạn có thể cần cấp thêm quyền schema public:
   \c lambiance
   GRANT ALL ON SCHEMA public TO db_user;
   ```
5. Thoát psql:
   ```sql
   \q
   exit
   ```

### Bước 2.5: Cài đặt Git, PM2 & Nginx
```bash
sudo apt install -y git nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

---

## 3. Cấu hình SSH & Clone Source Code từ GitHub

Để server có quyền kéo code từ repository riêng tư (Private Repo) trên GitHub:

### Bước 3.1: Tạo SSH Key trên server
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```
*Nhấn Enter liên tiếp để đồng ý các giá trị mặc định.*

Hiển thị SSH Key công khai và copy nó:
```bash
cat ~/.ssh/id_ed25519.pub
```

### Bước 3.2: Thêm SSH Key vào GitHub
1. Vào trang GitHub của bạn -> **Settings** -> **SSH and GPG keys**.
2. Chọn **New SSH key**, đặt tên (ví dụ: `My Ubuntu Server`) và dán nội dung key đã copy vào ô **Key**.

### Bước 3.3: Clone dự án về Server
Chúng ta sẽ tạo thư mục deploy trong `/var/www/`:
```bash
sudo mkdir -p /var/www/demoweb
sudo chown -R $USER:$USER /var/www/demoweb
cd /var/www/demoweb
```

Clone mã nguồn (thay thế bằng link SSH của repo của bạn):
```bash
git clone git@github.com:THHuy/DemoWeb.git .
```

---

## 4. Thiết lập File Cấu hình Môi trường (`.env.local`)

Tạo file `.env.local` ở thư mục gốc dự án trên server:
```bash
nano .env.local
```

Sao chép nội dung dưới đây và chỉnh sửa các giá trị thực tế của server:
```env
# URL kết nối cơ sở dữ liệu PostgreSQL
DATABASE_URL=postgresql://db_user:MatKhauBaoMatCuaBan@localhost:5432/lambiance

# Cổng chạy backend Express API
API_PORT=3001

# URL của API phía client Next.js gọi đến (Khi deploy sản phẩm thực tế, có thể sử dụng tên miền của bạn)
NEXT_PUBLIC_API_URL=https://demoweb.domain.com
```
*Nhấn `Ctrl + O` để lưu, `Enter`, sau đó `Ctrl + X` để thoát nano.*

---

## 5. Cài đặt Thư viện và Build Ứng dụng

### Bước 5.1: Cài đặt các Package
```bash
npm install
```

### Bước 5.2: Khởi tạo Cơ sở dữ liệu ban đầu
Bạn có thể import schema trực tiếp từ file SQL có sẵn trong dự án:
```bash
PGPASSWORD='MatKhauBaoMatCuaBan' psql -h localhost -U db_user -d lambiance -f lib/db-schema.sql
```

Hoặc, khởi chạy Server Express trước rồi gửi request POST để tạo database + dữ liệu mẫu (seed) tự động:
*(Chúng ta sẽ làm việc này ở bước chạy PM2 bên dưới)*

### Bước 5.3: Build Production cho Next.js Frontend
```bash
npm run build
```

---

## 6. Quản lý Tiến trình Chạy ngầm với PM2

Để các ứng dụng chạy ngầm liên tục và tự khởi động lại khi server bị reboot hoặc crash.

### Bước 6.1: Tạo file cấu hình PM2
Tạo file `ecosystem.config.js` ở thư mục gốc của dự án:
```bash
nano ecosystem.config.js
```

Thêm cấu hình chạy song song cả Next.js và Express API:
```javascript
module.exports = {
  apps: [
    {
      name: "demoweb-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      }
    },
    {
      name: "demoweb-backend",
      script: "node_modules/tsx/dist/cli.js",
      args: "server/index.ts",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
}
```

### Bước 6.2: Khởi động các dịch vụ qua PM2
```bash
pm2 start ecosystem.config.js
```

### Bước 6.3: Kiểm tra trạng thái hoạt động
```bash
pm2 status
pm2 logs
```

### Bước 6.4: Cấu hình PM2 tự động khởi chạy cùng Hệ thống
Để khi Ubuntu Server khởi động lại, các ứng dụng tự động chạy lại:
```bash
pm2 startup
```
*Lệnh này sẽ hiển thị một dòng lệnh khác bắt đầu bằng `sudo env PATH=...`. Hãy copy dòng lệnh đó và chạy nó.*

Sau đó, lưu trạng thái hiện tại của PM2:
```bash
pm2 save
```

### Bước 6.5 (Tùy chọn): Khởi tạo seed data qua Endpoint API
Nếu bạn chưa import schema ở bước 5.2, bây giờ server đang chạy, bạn có thể chạy lệnh curl này để tự động thiết lập bảng và chèn dữ liệu mẫu:
```bash
curl -X POST http://localhost:3001/api/db-init
```

---

## 7. Cấu hình Nginx và SSL Let's Encrypt

Nginx đóng vai trò tiếp nhận truy cập từ tên miền bên ngoài (qua cổng 80 và 443) rồi chuyển hướng (proxy) về đúng các port của ứng dụng chạy trên localhost.

### Bước 7.1: Tạo cấu hình Server Block Nginx
Tạo file cấu hình mới:
```bash
sudo nano /etc/nginx/sites-available/demoweb
```

Dán cấu hình sau (Thay đổi tên miền `demoweb.domain.com` thành tên miền thực tế của bạn đã trỏ IP về server):
```nginx
server {
    listen 80;
    server_name demoweb.domain.com;

    # Định tuyến API trực tiếp tới Express Server
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Định tuyến các request khác tới Next.js Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Bước 7.2: Kích hoạt cấu hình mới và Restart Nginx
Tạo link liên kết sang thư mục `sites-enabled`:
```bash
sudo ln -s /etc/nginx/sites-available/demoweb /etc/nginx/sites-enabled/
```

Kiểm tra cú pháp cấu hình Nginx xem có lỗi không:
```bash
sudo nginx -t
```

Nếu thành công (`syntax is ok`, `test is successful`), hãy reload lại Nginx:
```bash
sudo systemctl restart nginx
```

### Bước 7.3: Cài đặt SSL Let's Encrypt miễn phí
Chạy Certbot để tự động đăng ký và cài đặt chứng chỉ SSL HTTPS cho tên miền của bạn:
```bash
sudo certbot --nginx -d demoweb.domain.com
```
*Nhập email và chọn `Y` để đồng ý các điều khoản. Certbot sẽ tự động cấu hình lại Nginx để tự chuyển hướng từ HTTP sang HTTPS.*

---

## 8. Quy trình Cập nhật Phiên bản mới (CI/CD cơ bản)

Khi bạn đẩy code mới lên GitHub, bạn chỉ cần lên server và chạy các lệnh sau để cập nhật ứng dụng:

### Cách 1: Chạy thủ công bằng File Script `deploy.sh`
Tạo một file script trong thư mục dự án:
```bash
nano deploy.sh
```

Dán nội dung sau:
```bash
#!/bin/bash
echo "🚀 Đang bắt đầu cập nhật ứng dụng..."

# Kéo code mới nhất từ nhánh main
git pull origin main

# Cài đặt các package mới (nếu có)
npm install

# Build lại ứng dụng Next.js
npm run build

# Restart lại ứng dụng trên PM2 để áp dụng thay đổi
pm2 restart demoweb-frontend
pm2 restart demoweb-backend

echo "✅ Đã cập nhật xong!"
```

Cấp quyền thực thi cho file script:
```bash
chmod +x deploy.sh
```

Mỗi lần cập nhật ứng dụng chỉ cần chạy:
```bash
./deploy.sh
```

---

### Cách 2: Tự động hóa hoàn toàn với GitHub Actions
Bạn có thể thiết lập để mỗi khi push code lên nhánh `main` trên GitHub, server sẽ tự động cập nhật.

1. Tạo thư mục `.github/workflows/` và file `deploy.yml`:
   ```bash
   mkdir -p .github/workflows
   nano .github/workflows/deploy.yml
   ```
2. Thêm nội dung sau:
   ```yaml
   name: Deploy to Server

   on:
     push:
       branches: [ main ]

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout code
           uses: actions/checkout@v4

         - name: SSH and Deploy to Server
           uses: appleboy/ssh-action@master
           with:
             host: ${{ secrets.SERVER_HOST }}
             username: ${{ secrets.SERVER_USER }}
             key: ${{ secrets.SERVER_SSH_KEY }}
             script: |
               cd /var/www/demoweb
               ./deploy.sh
   ```
3. Lên dự án GitHub -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:
   - `SERVER_HOST`: IP của server Ubuntu của bạn.
   - `SERVER_USER`: Tên tài khoản login (vd: `ubuntu`, `root`).
   - `SERVER_SSH_KEY`: Nội dung key private của server của bạn (`cat ~/.ssh/id_ed25519`).
