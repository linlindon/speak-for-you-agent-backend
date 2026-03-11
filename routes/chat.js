import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolDefinitions, executeTool } from "../tools/index.js";

const router = express.Router();

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/chat - 處理聊天請求
router.post("/", async (req, res) => {
  // 定義 SSE event
  const sendSSE = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { messages } = req.body;

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // 先把 header 傳給前端
    res.flushHeaders?.();

    // 驗證請求
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      sendSSE("error", {
        message: "Invalid request: messages array is required",
      });
      return res.end();
    }

    // 取得 Gemini 模型
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      tools: [toolDefinitions],
    });

    // 將訊息格式轉換成 Gemini 的格式
    const chatHistory = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
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

    let nextInput = lastMessage;

    while (true) {
      const streamResult = await chat.sendMessageStream(nextInput);

      // 逐 chunk 推給前端
      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text?.() || "";
        if (chunkText) {
          sendSSE("delta", { text: chunkText });
        }
      }

      // 這輪完整結果，判斷是否要呼叫工具
      const response = await streamResult.response;
      const calls = response.functionCalls?.() ?? [];

      if (calls.length === 0) {
        sendSSE("done", { model: "gemini-flash-latest" });
        return res.end();
      }

      // agent loop: 有可能會需要多次使用同一個工具，比如說同時問台北和東京的天氣
      const functionResponses = await Promise.all(
        calls.map(async (call) => {
          try {
            const output = await executeTool(call.name, call.args);
            return {
              functionResponse: {
                name: call.name,
                response: { success: true, data: output },
              },
            };
          } catch (error) {
            return {
              functionResponse: {
                name: call.name,
                response: { success: false, error: error.message },
              },
            };
          }
        }),
      );

      nextInput = functionResponses;
    }
  } catch (error) {
    console.error("Gemini API Error:", error);

    if (res.writableEnded) return;

    if (error?.status === 429) {
      sendSSE("error", {
        code: "QUOTA_EXCEEDED",
        message: "API quota exceeded. Please try again later.",
      });
    } else if (error?.status === 401 || error?.status === 403) {
      sendSSE("error", {
        code: "AUTH_ERROR",
        message: "Authentication failed. Please check API key.",
      });
    } else if (error?.status === 404) {
      sendSSE("error", {
        code: "MODEL_NOT_FOUND",
        message: "The requested AI model is not available.",
      });
    } else if (error?.status === 503) {
      sendSSE("error", {
        code: "SERVICE_UNAVAILABLE",
        message:
          "AI service is temporarily overloaded. Please try again in a moment.",
      });
    } else {
      sendSSE("error", {
        code: "UNKNOWN_ERROR",
        message: error?.message || "An unexpected error occurred.",
      });
    }

    res.end();
  }
});

export default router;
