// ========== 记忆系统 ==========

/** L3 长期记忆条目 */
export interface Memory {
  id: string;
  type: 'rule' | 'preference' | 'decision';
  content: string;
  title: string;
  createdAt: string;
}

/** L4 知识图谱条目 */
export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
}

/** L2 摘要存档（含版本信息） */
export interface SummaryRecord {
  content: string;
  version: number;
  sessionId: string;
  updatedAt: string;
}

// ========== 消息与会话 ==========

/** 单条消息 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;           // base64 图片数据
  thinking?: string;        // 思考过程（仅 assistant）
}

/** 会话 */
export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

// ========== 项目 ==========

/** 项目 */
export interface Project {
  name: string;
  createdAt: string;
}

// ========== SSE 事件 ==========

/** SSE 事件类型 */
export type SSEEvent =
  | { type: 'thinking'; content: string }
  | { type: 'content'; content: string }
  | { type: 'done' };

// ========== 对话内查找 ==========

/** 搜索结果 */
export interface SearchResult {
  messageIndex: number;
  charOffset: number;
}

// ========== 代码库索引 ==========

/** 代码索引条目 */
export interface CodeIndexEntry {
  id: string;
  fileName: string;
  content: string;
}