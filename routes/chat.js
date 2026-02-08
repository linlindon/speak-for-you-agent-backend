const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/chat - 處理聊天請求
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;

    // 驗證請求
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request: messages array is required' 
      });
    }

    // 取得 Gemini 模型
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 將訊息格式轉換成 Gemini 的格式
    const chatHistory = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // 最後一則訊息（使用者剛輸入的）
    const lastMessage = messages[messages.length - 1].content;

    // 開始對話
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    // 發送訊息並取得回應
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const text = response.text();

    // 回傳結果
    res.json({
      reply: text,
      model: 'gemini-1.5-flash'
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get response from AI',
      details: error.message 
    });
  }
});

module.exports = router;