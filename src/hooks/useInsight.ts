'use client';

import { useState, useEffect, useCallback } from 'react';
import { MemoryEngine } from '@/lib/memory-engine';

export function useInsight(project: string) {
  const [projectInsight, setProjectInsight] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [engine, setEngine] = useState<MemoryEngine | null>(null);

  useEffect(() => {
    setProjectInsight('');        // ← 新增：清空旧脉络
    setEngine(new MemoryEngine(project));
  }, [project]);

  // 加载已有脉络
  useEffect(() => {
    if (!engine) return;
    engine.getSummary(project + '_insight').then((val) => {
      if (val) setProjectInsight(val);
    });
  }, [engine, project]);

  // 生成/刷新脉络
  const generateInsight = useCallback(async (turnNumber: number): Promise<boolean> => {
    // 添加明确的空值检查和提示
    if (!engine) {
      window.alert('记忆引擎未就绪，请稍后重试');
      setIsGenerating(false);
      return false;
    }
    if (isGenerating) return false;
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/project-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'fenshen' }),
      });
      const data = await res.json();
      if (data.success && data.insight) {
        const taggedInsight = `[生成于第 ${turnNumber} 轮]\n${data.insight}`;
        setProjectInsight(taggedInsight);
        await engine.saveSummary(project + '_insight', taggedInsight, 1);
        return true;
      } else {
        // 如果API返回失败，弹窗告诉主人原因
        window.alert(`脉络生成失败: ${data.error || '未知错误'}`);
        return false;
      }
    } catch (err: unknown) {
      // 如果网络请求或解析出错，也明确提示
      const message = err instanceof Error ? err.message : '未知错误';
      window.alert(`网络或解析错误: ${message}`);
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [engine, project, isGenerating]);

  // 直接设置脉络（编辑用）
  const setInsight = useCallback(
    async (content: string) => {
      if (!engine) return;
      setProjectInsight(content);
      await engine.saveSummary(project + '_insight', content, 1);
    },
    [engine, project]
  );

  return { projectInsight, isGenerating, generateInsight, setInsight };
}