'use client';

import { useState, useCallback } from 'react';
import type { Message, SearchResult } from '@/lib/types';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const search = useCallback((messages: Message[], searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setCurrentIndex(0);
      return;
    }

    const newResults: SearchResult[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    for (let i = 0; i < messages.length; i++) {
      let offset = messages[i].content.toLowerCase().indexOf(lowerQuery);
      // 一个消息内可能有多处匹配
      while (offset !== -1) {
        newResults.push({ messageIndex: i, charOffset: offset });
        offset = messages[i].content.toLowerCase().indexOf(lowerQuery, offset + 1);
      }
    }

    setResults(newResults);
    setCurrentIndex(0);
  }, []);

  const next = useCallback(() => {
    if (results.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % results.length);
  }, [results.length]);

  const prev = useCallback(() => {
    if (results.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + results.length) % results.length);
  }, [results.length]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setCurrentIndex(0);
  }, []);

  return {
    query,
    setQuery,
    results,
    currentIndex,
    setCurrentIndex,
    search,
    next,
    prev,
    clear,
  };
}