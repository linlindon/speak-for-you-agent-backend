import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { toolDefinitions, executeTool } from '../tools/index.js';

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
const model = genAI.getGenerativeModel({ 
  model: 'gemini-flash-latest',
  tools: [toolDefinitions],
});

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
    let result = await chat.sendMessage(lastMessage);
    let response = await result.response;
    
    // agent loop: 有可能會需要多次使用同一個工具，比如說同時問台北和東京的天氣
    while (true) {
        // 如果不需要繼續使用工具，response.functionCalls() 會回傳 undefined
        const calls = response.functionCalls?.() ?? [];
        if (calls.length === 0) break;

        const functionResponses = await Promise.all(
            calls.map(async(call) => {
                try {
                    const output = await executeTool(call.name, call.args);
                    return {
                        functionResponse: {
                            name: call.name,
                            response: {success: true, data: output}
                        }
                    };
                } catch(error) {
                    return {
                        functionResponse: {
                            name: call.name,
                            response: { success: false, error: error.message },
                        },
                    };
                }
            })
        );
        result = await chat.sendMessage(functionResponses);
        response = result.response;
    }
    

    // 回傳結果給前端
    res.json({
      reply: response.text(),
      model: 'gemini-flash-latest'
    });

  } catch (error) {
    console.error('Gemini API Error:', error);

    if (error.status === 429) {
        return res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        message: 'API quota exceeded. Please try again later.',
      });
    }

    if (error.status === 401 || error.status === 403) {
      // API Key 問題
      return res.status(401).json({
        error: 'AUTH_ERROR',
        message: 'Authentication failed. Please check API key.',
      });
    }

    if (error.status === 404) {
      // 模型不存在
      return res.status(404).json({
        error: 'MODEL_NOT_FOUND',
        message: 'The requested AI model is not available.',
      });
    }

    // 503 服務暫時無法使用
    if (error.status === 503) {
        return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'AI service is temporarily overloaded. Please try again in a moment.',
        });
    }

    res.status(500).json({ 
      error: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred.',
    });
  }
});

export default router;