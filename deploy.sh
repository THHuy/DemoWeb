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
