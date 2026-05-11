'use client';

import { useState, useEffect, useCallback } from 'react';
import { MemoryEngine } from '@/lib/memory-engine';
import type { KnowledgeEntry } from '@/lib/types';

export function useKnowledge(project: string) {
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [engine, setEngine] = useState<MemoryEngine | null>(null);

  // 初始化引擎
  useEffect(() => {
    setEngine(new MemoryEngine(project));
  }, [project]);

  // 加载条目
  useEffect(() => {
    if (!engine) return;
    engine.getAllKnowledge().then(setKnowledgeEntries).then(() => setLoaded(true));
  }, [engine]);

  // 添加条目
  const addKnowledge = useCallback(async (title: string, content: string) => {
    if (!engine || !title.trim() || !content.trim()) return;
    const entry: KnowledgeEntry = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
    };
    await engine.addKnowledge(entry);
    setKnowledgeEntries(prev => [...prev, entry]);
  }, [engine]);

  // 更新条目
  const updateKnowledge = useCallback(async (id: string, title: string, content: string) => {
    if (!engine) return;
    await engine.updateKnowledge(id, title, content);
    setKnowledgeEntries(prev => prev.map(e => e.id === id ? { ...e, title, content } : e));
  }, [engine]);

  // 删除条目
  const deleteKnowledge = useCallback(async (id: string) => {
    if (!engine) return;
    await engine.deleteKnowledge(id);
    setKnowledgeEntries(prev => prev.filter(e => e.id !== id));
  }, [engine]);

  // 关键字检索
  const searchKnowledge = useCallback(async (query: string): Promise<string> => {
    if (!engine || !query.trim()) return '';
    return await engine.searchKnowledge(query);
  }, [engine]);

  return {
    knowledgeEntries,
    loaded,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge,
    searchKnowledge,
  };
}