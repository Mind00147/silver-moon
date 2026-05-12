'use client';

import { useState, useEffect, useCallback } from 'react';
import { StorageAdapter } from '@/lib/storage';
import type { Session, Message } from '@/lib/types';

export function useSessions(currentProject: string, loaded: boolean) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  const storageKey = `${currentProject}_sessions`;

  // 加载会话列表
  useEffect(() => {
    if (!loaded) return;
    
    async function loadSessions() {
      const saved = await StorageAdapter.get<Session[]>(storageKey);
      if (saved && saved.length > 0) {
        setSessions(saved);
        setCurrentSessionId(saved[0].id);
      } else {
        // 无会话时自动创建首个会话
        const newSession = createNewSessionInternal();
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
      }
      setSessionsLoaded(true);
    }
    loadSessions();
  }, [currentProject, loaded]);

  // 持久化会话列表
  useEffect(() => {
    if (sessionsLoaded && sessions.length > 0) {
      StorageAdapter.set(storageKey, sessions);
    }
  }, [sessions, sessionsLoaded, storageKey]);

  // 内部：创建新会话对象
  const createNewSessionInternal = (): Session => ({
    id: Date.now().toString(),
    title: '新对话',
    messages: [{ role: 'assistant', content: '银月在呢，有什么想聊聊的吗？' }],
    createdAt: new Date().toISOString(),
  });

  // 新建会话
  const createNewSession = useCallback(() => {
    const newSession = createNewSessionInternal();
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  }, []);

  // 切换会话
  const switchSession = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  // 删除会话
  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      if (id === currentSessionId && updated.length > 0) {
        setCurrentSessionId(updated[0].id);
      }
      return updated;
    });
  }, [currentSessionId]);

  // 更新会话标题
  const updateSessionTitle = useCallback((id: string, title: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  }, []);

  // 获取当前会话
  const currentSession = sessions.find(s => s.id === currentSessionId);

  // 更新当前会话的消息
  const updateCurrentSessionMessages = useCallback((messages: Message[]) => {
    setSessions(prev => prev.map(s =>
      s.id === currentSessionId
        ? {
            ...s,
            messages,
            title: messages.length > 1 && messages[1]?.role === 'user'
              ? messages[1].content.replace(/[，,。.！!？?\n]/g, ' ').substring(0, 20)
              : s.title,
          }
        : s
    ));
  }, [currentSessionId]);

  return {
    sessions,
    currentSessionId,
    currentSession,
    sessionsLoaded,
    createNewSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
    updateCurrentSessionMessages,
  };
}