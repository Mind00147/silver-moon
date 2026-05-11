'use client';

import { useState, useEffect, useCallback } from 'react';
import { MemoryEngine } from '@/lib/memory-engine';
import type { Message } from '@/lib/types';

export function useSummary(project: string) {
  const [currentSummary, setCurrentSummary] = useState<string>('');
  const [summaryVersion, setSummaryVersion] = useState<number>(0);
  const [engine, setEngine] = useState<MemoryEngine | null>(null);

  // 初始化引擎
  useEffect(() => {
    setEngine(new MemoryEngine(project));
  }, [project]);

  // 加载当前会话摘要
  const loadSummary = useCallback(async (sessionId: string) => {
    if (!engine) return;
    const summary = await engine.getSummary(sessionId);
    const version = await engine.getSummaryVersion(sessionId);
    setCurrentSummary(summary || '');
    setSummaryVersion(version || 0);
  }, [engine]);

  // 生成递归摘要
  const generateSummary = useCallback(async (
    sessionId: string,
    messages: Message[],
    turnNumber: number
  ): Promise<boolean> => {
    if (!engine || turnNumber < 20 || turnNumber % 20 !== 0) return false;

    const previousSummary = await engine.getSummary(sessionId);
    const version = await engine.getSummaryVersion(sessionId);
    const newMessages = messages.slice(-20);

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previousSummary: previousSummary || null,
          newMessages,
          version: version || 0,
        }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        const newVersion = data.version || (version || 0) + 1;
        await engine.saveSummary(sessionId, data.summary, newVersion);
        setCurrentSummary(data.summary);
        setSummaryVersion(newVersion);
        return true;
      }
    } catch {
      // 自动生成失败不阻塞
    }
    return false;
  }, [engine]);

  // 手动生成/刷新摘要
  const refreshSummary = useCallback(async (
    sessionId: string,
    messages: Message[]
  ): Promise<boolean> => {
    if (!engine) return false;

    const previousSummary = await engine.getSummary(sessionId);
    const version = await engine.getSummaryVersion(sessionId);
    const recentMessages = messages.slice(-20);

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previousSummary: previousSummary || null,
          newMessages: recentMessages,
          version: version || 0,
        }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        const newVersion = data.version || (version || 0) + 1;
        await engine.saveSummary(sessionId, data.summary, newVersion);
        setCurrentSummary(data.summary);
        setSummaryVersion(newVersion);
        return true;
      }
    } catch {}
    return false;
  }, [engine]);

  // 直接设置摘要（编辑用）
  const setSummary = useCallback(async (sessionId: string, content: string) => {
    if (!engine) return;
    await engine.saveSummary(sessionId, content, summaryVersion);
    setCurrentSummary(content);
  }, [engine, summaryVersion]);

  // 删除摘要
  const deleteSummary = useCallback(async (sessionId: string) => {
    if (!engine) return;
    await engine.saveSummary(sessionId, '', 0);
    setCurrentSummary('');
    setSummaryVersion(0);
  }, [engine]);

  // 获取摘要上下文（用于注入 engine）
  const getSummaryContext = useCallback(async (sessionId: string): Promise<string> => {
    if (!engine) return '';
    const summary = await engine.getSummary(sessionId);
    return summary || '';
  }, [engine]);

  return {
    currentSummary,
    summaryVersion,
    loadSummary,
    generateSummary,
    refreshSummary,
    setSummary,
    deleteSummary,
    getSummaryContext,
  };
}