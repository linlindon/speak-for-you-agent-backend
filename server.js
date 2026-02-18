import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',                // 本地開發
    'https://ai-agent-pi-nine.vercel.app',  // 生產環境
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/chat', chatRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Agent Backend is running' });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Accepting requests from http://localhost:5173`);
});