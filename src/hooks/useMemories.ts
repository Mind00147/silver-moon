'use client';

import { useState, useEffect, useCallback } from 'react';
import { MemoryEngine } from '@/lib/memory-engine';
import type { Memory } from '@/lib/types';

export function useMemories(project: string) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [engine, setEngine] = useState<MemoryEngine | null>(null);

  // 初始化引擎
  useEffect(() => {
    setEngine(new MemoryEngine(project));
  }, [project]);

  // 加载记忆
  useEffect(() => {
    if (!engine) return;
    engine.getAllMemories().then(setMemories).then(() => setLoaded(true));
  }, [engine]);

  // 添加记忆（银月回复：先精炼；用户消息：直接存）
  const addMemory = useCallback(async (content: string, isUserMessage: boolean) => {
    if (!engine) return;

    let finalContent = content;

    // 用户消息直接存原文，银月回复调用 API 精炼
    if (!isUserMessage) {
      try {
        const res = await fetch('/api/engine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `请将以下内容提炼为一句核心规则（不超过100字）：\n\n${content}`
            }],
            turnNumber: 1,
          }),
        });
        const data = await res.json();
        if (data.reply) {
          finalContent = data.reply;
        }
      } catch {}
    }

    const newMemory: Memory = {
      id: Date.now().toString(),
      type: isUserMessage ? 'preference' : 'rule',
      content: finalContent.substring(0, 200),
      title: finalContent.replace(/[，,。.！!？?\n]/g, ' ').substring(0, 20),
      createdAt: new Date().toISOString(),
    };

    await engine.addMemory(newMemory);
    setMemories(prev => [...prev, newMemory]);
  }, [engine]);

  // 更新记忆
  const updateMemory = useCallback(async (id: string, content: string, title: string) => {
    if (!engine) return;
    await engine.updateMemory(id, content, title);
    setMemories(prev => prev.map(m => m.id === id ? { ...m, content, title } : m));
  }, [engine]);

  // 删除记忆
  const deleteMemory = useCallback(async (id: string) => {
    if (!engine) return;
    await engine.deleteMemory(id);
    setMemories(prev => prev.filter(m => m.id !== id));
  }, [engine]);

  // 获取记忆上下文（用于注入 engine）
  const getMemoryContext = useCallback(async (): Promise<string> => {
    if (!engine) return '';
    return await engine.getMemoryContext();
  }, [engine]);

  return {
    memories,
    loaded,
    addMemory,
    updateMemory,
    deleteMemory,
    getMemoryContext,
  };
}