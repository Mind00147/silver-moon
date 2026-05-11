"use client";

import { useState } from "react";
import type { Message } from "@/lib/types";

interface Props {
  message: Message;
  onCopy: (content: string) => void;
  onRemember: (content: string, isUser: boolean) => void;
}

export default function MessageBubble({ message, onCopy, onRemember }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [remembering, setRemembering] = useState(false);

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemember = () => {
    setRemembering(true);
    onRemember(message.content, isUser);
    // 记下完成后恢复（异步操作在父组件中执行，此处仅给反馈）
    setTimeout(() => setRemembering(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex flex-col gap-1 max-w-[80%]">
        {/* 消息气泡 */}
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            isUser ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"
          }`}
        >
          {/* 图片（如有） */}
          {message.image && (
            <img
              src={message.image}
              alt="截图"
              className="max-w-full rounded mb-2"
            />
          )}
          {/* Markdown 渲染内容 */}
          <div className="whitespace-pre-wrap break-words">
            {renderMessageContent(message.content)}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
          {/* 复制按钮 */}
          <button
            onClick={handleCopy}
            className={`text-xs transition select-none ${
              copied
                ? "text-green-400"
                : "text-gray-600 hover:text-blue-400"
            }`}
          >
            {copied ? "✓ 已复制" : "🗐 复制"}
          </button>

          {/* 记下按钮 */}
          <button
            onClick={handleRemember}
            disabled={remembering}
            className={`text-xs transition select-none ${
              remembering
                ? "text-yellow-400"
                : "text-gray-600 hover:text-blue-400"
            }`}
          >
            {remembering ? "正在记..." : "✎ 记下"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 代码块复制按钮（带状态反馈）
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`hover:text-blue-400 transition select-none ${
        copied ? 'text-green-400' : 'text-gray-500'
      }`}
    >
      {copied ? '✓ 已复制' : '🗐 复制'}
    </button>
  );
}

// ========== 内联 Markdown 渲染（极简版，处理常用语法） ==========
function renderMessageContent(content: string) {
  // 第一步：保护代码块（三反引号）
  const codeBlocks: string[] = [];
  const protectedContent = content.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_, lang, code) => {
      codeBlocks.push(code.replace(/\n$/, ""));
      return `%%CODEBLOCK_${codeBlocks.length - 1}_${lang || ""}%%`;
    }
  );

  // 第二步：内联 Markdown 转 HTML
  const parseInline = (text: string) =>
    text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`\n]+)`/g,
        '<code class="bg-gray-800 text-blue-300 px-1 rounded text-xs font-mono">$1</code>'
      )
      .replace(/\n/g, "<br/>");

  // 第三步：分割并渲染
  const parts = protectedContent.split(/(%%CODEBLOCK_\d+_\w*%%)/);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^%%CODEBLOCK_(\d+)_(\w*)%%$/);
        if (match) {
          const code = codeBlocks[parseInt(match[1])];
          const lang = match[2];
          return (
            <div key={i} className="my-2 rounded overflow-hidden border border-gray-700 max-w-full">
              <div className="flex items-center justify-between bg-black/50 px-3 py-1 text-xs text-gray-500">
                <span>{lang || "code"}</span>
                <CopyButton code={code} />
              </div>
              <pre className="bg-gray-950 text-gray-200 p-3 text-xs overflow-x-auto">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        return (
          <span key={i} dangerouslySetInnerHTML={{ __html: parseInline(part) }} />
        );
      })}
    </>
  );
}