import { StorageAdapter } from '@/lib/storage';
import type { Memory, KnowledgeEntry } from '@/lib/types';

/**
 * 分层记忆引擎
 * 负责 L3 长期记忆、L4 知识图谱的 CRUD
 * L2 摘要的存储由 useSummary 调用此模块
 */
export class MemoryEngine {
  private project: string;

  constructor(project: string) {
    this.project = project;
  }

  // ========== L3 长期记忆 ==========

  private get memoryKey(): string {
    return `${this.project}_memories`;
  }

  async getAllMemories(): Promise<Memory[]> {
    return (await StorageAdapter.get<Memory[]>(this.memoryKey)) || [];
  }

  async addMemory(entry: Memory): Promise<void> {
    const memories = await this.getAllMemories();
    memories.push(entry);
    await StorageAdapter.set(this.memoryKey, memories);
  }

  async updateMemory(id: string, content: string, title: string): Promise<void> {
    const memories = await this.getAllMemories();
    const updated = memories.map(m => (m.id === id ? { ...m, content, title } : m));
    await StorageAdapter.set(this.memoryKey, updated);
  }

  async deleteMemory(id: string): Promise<void> {
    const memories = await this.getAllMemories();
    const filtered = memories.filter(m => m.id !== id);
    await StorageAdapter.set(this.memoryKey, filtered);
  }

  async getMemoryContext(): Promise<string> {
    const memories = await this.getAllMemories();
    if (memories.length === 0) return '';
    return memories.map(m => `- ${m.content}`).join('\n');
  }

  // ========== L4 知识图谱 ==========

  private get knowledgeKey(): string {
    return `${this.project}_knowledge`;
  }

  async getAllKnowledge(): Promise<KnowledgeEntry[]> {
    return (await StorageAdapter.get<KnowledgeEntry[]>(this.knowledgeKey)) || [];
  }

  async addKnowledge(entry: KnowledgeEntry): Promise<void> {
    const entries = await this.getAllKnowledge();
    entries.push(entry);
    await StorageAdapter.set(this.knowledgeKey, entries);
  }

  async updateKnowledge(id: string, title: string, content: string): Promise<void> {
    const entries = await this.getAllKnowledge();
    const updated = entries.map(e => (e.id === id ? { ...e, title, content } : e));
    await StorageAdapter.set(this.knowledgeKey, updated);
  }

  async deleteKnowledge(id: string): Promise<void> {
    const entries = await this.getAllKnowledge();
    const filtered = entries.filter(e => e.id !== id);
    await StorageAdapter.set(this.knowledgeKey, filtered);
  }

  async searchKnowledge(query: string): Promise<string> {
    const entries = await this.getAllKnowledge();
    if (entries.length === 0) return '';

    // 第一部分：标题目录（默认注入）
    const titleList = entries.map(e => `- ${e.title}`).join('\n');

    // 第二部分：语义匹配（按需注入）
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) {
      // 用户消息无有效关键词时，只返回目录
      return `[知识图谱目录]\n${titleList}`;
    }

    // 计算每个条目的相似度
    const scored = entries.map(entry => {
      const entryTokens = tokenize(entry.title + ' ' + entry.content.substring(0, 300));
      const similarity = jaccardSimilarity(queryTokens, entryTokens);
      return { entry, similarity };
    });

    // 过滤：相似度超过阈值 0.15 的条目，按相似度降序排列，取前 3 个
    const relevant = scored
      .filter(s => s.similarity > 0.15)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    let relevantContent = '';
    if (relevant.length > 0) {
      relevantContent = '\n\n[相关知识]\n' + relevant
        .map(s => `- ${s.entry.title}: ${s.entry.content}`)
        .join('\n\n');
    }

    return `[知识图谱目录]\n${titleList}${relevantContent}`;
  }

  // ========== L2 摘要存储（递归基础） ==========

  async getSummary(sessionId: string): Promise<string | null> {
    return await StorageAdapter.get<string>(`${this.project}_summary_${sessionId}`);
  }

  async getSummaryVersion(sessionId: string): Promise<number> {
    return (await StorageAdapter.get<number>(`${this.project}_summary_version_${sessionId}`)) || 0;
  }

  async saveSummary(sessionId: string, summary: string, version: number): Promise<void> {
    await StorageAdapter.set(`${this.project}_summary_${sessionId}`, summary);
    await StorageAdapter.set(`${this.project}_summary_version_${sessionId}`, version);
  }
}

/**
 * 分词：将中文和英文混合文本拆分为 token 数组
 */
function tokenize(text: string): string[] {
  // 去除标点、转小写、按空格和换行分割
  const cleaned = text
    .replace(/[，,。.！!？?：:；;、\n\r\[\]【】《》""''（）()#*\-_]/g, ' ')
    .toLowerCase();
  // 拆分并过滤短于 2 字符的词
  return cleaned
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

/**
 * Jaccard 相似度：两个集合的交集大小 / 并集大小
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}