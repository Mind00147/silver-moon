"use client";

import { useState, useRef } from "react";

interface Props {
  onSend: (message: string, image: string | null) => void;
  disabled: boolean;
}

export default function InputBox({ onSend, disabled }: Props) {
  const [input, setInput] = useState("");
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 发送消息
  const handleSend = () => {
    if ((!input.trim() && !pastedImage) || disabled) return;
    onSend(input.trim(), pastedImage);
    setInput("");
    setPastedImage(null);
    // 重置输入框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // 自动撑高
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 300) + "px";
  };

  // Enter 发送，Shift+Enter 换行
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 粘贴图片
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = (ev.target?.result as string).split(",")[1];
          setPastedImage(base64);
        };
        reader.readAsDataURL(blob);
        e.preventDefault();
        return;
      }
    }
  };

  // 文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      setPastedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      {/* 图片预览 */}
      {pastedImage && (
        <div className="px-4 py-2 border-t border-gray-800 flex items-center gap-3">
          <img
            src={`data:image/png;base64,${pastedImage}`}
            alt="预览"
            className="h-16 rounded border border-gray-700"
          />
          <span className="text-xs text-gray-400">截图已就绪</span>
          <button
            onClick={() => setPastedImage(null)}
            className="text-red-400 hover:text-red-300 text-xs ml-auto"
          >
            移除
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <footer className="border-t border-gray-800 p-4">
        <div className="flex gap-2">
          {/* 上传按钮 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm transition"
            title="上传截图"
          >
            📎
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* 输入框 */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="直接粘贴截图，或输入文字... (Enter 发送，Shift+Enter 换行)"
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none text-gray-200"
            disabled={disabled}
          />

          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={disabled}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
          >
            发送
          </button>
        </div>
      </footer>
    </div>
  );
}