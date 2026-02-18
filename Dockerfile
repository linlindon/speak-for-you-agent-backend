# 使用官方 Node.js 20 Alpine 映像（小巧、安全）
FROM node:20-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝生產環境依賴（不裝 nodemon 等開發工具）
RUN npm ci --only=production

# 複製所有程式碼
COPY . .

# 暴露後端 port
EXPOSE 3001

# 健康檢查（選配，讓 Fly.io 知道服務是否正常）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 啟動應用
CMD ["node", "server.js"]
