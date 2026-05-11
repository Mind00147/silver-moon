"use client";

import { useState } from "react";
import type { Message, SSEEvent } from "@/lib/types";

export function useChat() {
  const [loading, setLoading] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");
  const [thinkingComplete, setThinkingComplete] = useState(true);

  /**
   * 发送消息
   * 返回银月的完整回复文本
   */
  async function sendMessage(
    userMessage: string,
    options: {
      messages: Message[];
      image?: string | null;
      customInstruction?: string;
      memoryContext?: string;
      knowledgeContext?: string;
      summaryContext?: string;
      insightContext?: string;
    }
  ): Promise<{ success: boolean; reply: string; thinking?: string }> {
    const {
      messages,
      image,
      customInstruction,
      memoryContext,
      knowledgeContext,
      summaryContext,
      insightContext,
    } = options;

    // 如果有图片，先调用视觉分析，用分析结果替换原始消息内容
    let hasVisionResult = false;
    let visionResult = '';
    if (image) {
      try {
        const visionRes = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: image }),
        });
        const visionData = await visionRes.json();
        if (visionData.success) {
          visionResult = visionData.result;
          hasVisionResult = true;
        }
      } catch {}
    }

    // 计算最近 20 轮对话历史
    const recentHistory = messages.slice(-20).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // 如果图片分析成功，用分析结果替换最后一条用户消息的内容
    if (hasVisionResult && recentHistory.length > 0) {
      const lastMsg = recentHistory[recentHistory.length - 1];
      if (lastMsg.role === 'user') {
        lastMsg.content = `[截图分析结果]\n${visionResult}\n\n[用户指令]\n${userMessage || "请根据截图分析给出解决方案"}`;
      }
    }

    // 计算轮数
    const turnNumber = messages.filter((m) => m.role === "user").length + 1;

    let assistantReply = "";
    let thinkingText = "";

    try {
      // 调用聊天引擎（带 35 秒超时）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const engineRes = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: recentHistory,
          customInstruction,
          memoryContext,
          knowledgeContext,
          summaryContext,
          insightContext,
          turnNumber,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!engineRes.ok) {
        return {
          success: false,
          reply: `❌ 服务器返回错误 (${engineRes.status})，请稍后重试。`,
        };
      }

      // 读取 SSE 流
      const reader = engineRes.body?.getReader();
      if (!reader) {
        return { success: false, reply: "❌ 无法读取响应流。" };
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          if (!event.trim()) continue;

          const lines = event.split("\n");
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              eventData = line.slice(6);
            }
          }

          if (!eventData) continue;

          try {
            const parsed = JSON.parse(eventData) as SSEEvent;

            if (parsed.type === "thinking") {
              thinkingText += parsed.content;
              const newThinking = thinkingText;
              setStreamingThinking(newThinking);
              setThinkingContent(newThinking);
              setThinkingComplete(false);
            } else if (parsed.type === "content") {
              assistantReply += parsed.content;
              setStreamingReply(assistantReply);
            }
          } catch {}
        }
      }

      setThinkingComplete(true);
      setStreamingReply(assistantReply);
      return {
        success: true,
        reply: assistantReply,
        thinking: thinkingText || undefined,
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return {
          success: false,
          reply: "⏳ 主人，服务器响应超时（35秒），可能 DeepSeek 正在繁忙。建议稍等片刻再试。",
        };
      }
      return {
        success: false,
        reply: "❌ 网络请求失败，请检查网络连接或服务器状态。",
      };
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    setLoading,
    thinkingContent,
    setThinkingContent,
    thinkingComplete,
    setThinkingComplete,
    streamingReply,
    setStreamingReply,
    streamingThinking,
    setStreamingThinking,
    sendMessage,
  };
}