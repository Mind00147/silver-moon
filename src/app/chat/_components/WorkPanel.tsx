'use client';

import { useState } from 'react';
import type { Memory, KnowledgeEntry } from '@/lib/types';

interface Props {
  onClose: () => void;

  // System 卡
  systemCard: string;
  onSystemCardChange: (value: string) => void;

  // 长期记忆
  memories: Memory[];
  onUpdateMemory: (id: string, content: string, title: string) => void;
  onDeleteMemory: (id: string) => void;

  // 知识图谱
  knowledgeEntries: KnowledgeEntry[];
  onAddKnowledge: (title: string, content: string) => void;
  onUpdateKnowledge: (id: string, title: string, content: string) => void;
  onDeleteKnowledge: (id: string) => void;

  // 摘要存档
  currentSummary: string;
  summaryVersion: number;
  onRefreshSummary: () => Promise<void>;
  onSetSummary: (content: string) => void;
  onDeleteSummary: () => void;

  // 当前轮数
  turnNumber: number;

  // 项目脉络
  projectInsight: string;
  isGeneratingInsight: boolean;
  onGenerateInsight: () => Promise<void>;
  onSetInsight: (content: string) => void;
}

type TabKey = 'system' | 'memory' | 'knowledge' | 'summary' | 'insight';

export default function WorkPanel({
  onClose,
  systemCard,
  onSystemCardChange,
  memories,
  onUpdateMemory,
  onDeleteMemory,
  knowledgeEntries,
  onAddKnowledge,
  onUpdateKnowledge,
  onDeleteKnowledge,
  currentSummary,
  summaryVersion,
  onRefreshSummary,
  onSetSummary,
  onDeleteSummary,
  turnNumber,
  projectInsight,
  isGeneratingInsight,
  onGenerateInsight,
  onSetInsight,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('system');

  // 知识图谱新增表单
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // 编辑状态
  const [editingMemoryId, setEditingMemoryId] = useState<string>('');
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'system', label: 'System 卡' },
    { key: 'knowledge', label: '知识图谱' },
    { key: 'summary', label: '摘要存档' },
    { key: 'memory', label: '长期记忆' },
    { key: 'insight', label: '项目脉络' },
  ];

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-40 flex flex-col">
      {/* 头部 */}
      <div className="border-b border-gray-700">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm font-semibold text-gray-200">工作面板</span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xs"
          >
            ✕
          </button>
        </div>
        {/* 标签栏 */}
        <div className="flex flex-col md:flex-row px-4 gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs rounded-md md:rounded-t-lg transition whitespace-nowrap w-full md:w-auto ${
                activeTab === tab.key
                  ? 'bg-gray-800 text-blue-400 border-t border-l border-r border-gray-700'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ===== System 卡 ===== */}
        {activeTab === 'system' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              System 卡 — 定义当前项目下银月的行为规则与风格
            </p>
            <textarea
              value={systemCard}
              onChange={(e) => onSystemCardChange(e.target.value)}
              placeholder="在此输入银月的行为规则..."
              rows={12}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none"
            />
            <p className="text-xs text-gray-600">修改后自动保存</p>
          </div>
        )}

        {/* ===== 知识图谱 ===== */}
        {activeTab === 'knowledge' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              知识图谱 — 存储项目架构、参考文档等外部素材
            </p>
            {/* 添加条目 */}
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="条目标题"
                className="w-full bg-gray-700 text-white px-2 py-1.5 rounded text-xs focus:outline-none"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="条目内容"
                rows={3}
                className="w-full bg-gray-700 text-white px-2 py-1.5 rounded text-xs focus:outline-none resize-none"
              />
              <button
                onClick={() => {
                  if (newTitle.trim() && newContent.trim()) {
                    onAddKnowledge(newTitle.trim(), newContent.trim());
                    setNewTitle('');
                    setNewContent('');
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded text-xs font-medium transition"
              >
                添加条目
              </button>
            </div>
            {/* 已有条目 */}
            {knowledgeEntries.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-600">
                  已有条目 ({knowledgeEntries.length})
                </p>
                {knowledgeEntries.map((entry) => (
                  <div key={entry.id} className="bg-gray-800/50 rounded-lg p-3">
                    {editingKnowledgeId === entry.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={entry.title}
                          onChange={(e) =>
                            onUpdateKnowledge(entry.id, e.target.value, entry.content)
                          }
                          className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs focus:outline-none"
                        />
                        <textarea
                          value={entry.content}
                          onChange={(e) =>
                            onUpdateKnowledge(entry.id, entry.title, e.target.value)
                          }
                          rows={4}
                          className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs focus:outline-none resize-none"
                        />
                        <button
                          onClick={() => setEditingKnowledgeId('')}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          完成编辑
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-xs text-blue-400 font-semibold cursor-pointer hover:underline"
                            onClick={() => setEditingKnowledgeId(entry.id)}
                          >
                            {entry.title}
                          </span>
                          <button
                            onClick={() => onDeleteKnowledge(entry.id)}
                            className="text-gray-600 hover:text-red-400 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-3">{entry.content}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        { /* ===== 摘要存档 ===== */ }
        {activeTab === 'summary' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              第 {turnNumber} 轮 · 摘要 v{summaryVersion || '—'}
              {currentSummary ? ' · ✎ 已编辑' : ''}
            </p>
            <div className="bg-gray-800/50 rounded-lg p-3">
              {currentSummary ? (
                <p className="text-xs text-gray-400 whitespace-pre-wrap">{currentSummary}</p>
              ) : (
                <p className="text-xs text-gray-600 italic">暂无摘要，点击下方按钮生成</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setIsGeneratingSummary(true);
                  try {
                    await onRefreshSummary();
                  } finally {
                    setIsGeneratingSummary(false);
                  }
                }}
                disabled={isGeneratingSummary}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                  isGeneratingSummary
                    ? 'bg-blue-600/50 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isGeneratingSummary ? '正在生成...' : '生成/刷新摘要'}
              </button>
              {currentSummary && (
                <>
                  <button
                    onClick={() => {
                      const newContent = prompt('编辑摘要：', currentSummary);
                      if (newContent !== null) onSetSummary(newContent);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded-lg text-xs font-medium transition"
                  >
                    编辑
                  </button>
                  <button
                    onClick={onDeleteSummary}
                    className="flex-1 bg-red-600/50 hover:bg-red-500 text-red-200 py-2 rounded-lg text-xs font-medium transition"
                  >
                    删除
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ===== 长期记忆 ===== */}
        {activeTab === 'memory' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-2">长期记忆 ({memories.length})</p>
            {memories.length === 0 && (
              <p className="text-xs text-gray-600 italic">暂无记忆。点击消息下方的「✎ 记下」来添加。</p>
            )}
            {memories.map((mem) => (
              <div key={mem.id} className="text-xs text-gray-400 bg-gray-800/50 rounded">
                {editingMemoryId === mem.id ? (
                  <div className="p-2 space-y-2">
                    <input
                      type="text"
                      value={mem.title}
                      onChange={(e) =>
                        onUpdateMemory(mem.id, mem.content, e.target.value)
                      }
                      className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs focus:outline-none"
                    />
                    <textarea
                      value={mem.content}
                      onChange={(e) =>
                        onUpdateMemory(mem.id, e.target.value, mem.title)
                      }
                      rows={4}
                      className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs focus:outline-none resize-none"
                    />
                    <button
                      onClick={() => setEditingMemoryId('')}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      完成编辑
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2">
                    <span
                      className="flex-1 cursor-pointer hover:text-blue-400 truncate"
                      onClick={() => setEditingMemoryId(mem.id)}
                    >
                      {mem.title}
                    </span>
                    <button
                      onClick={() => onDeleteMemory(mem.id)}
                      className="text-gray-600 hover:text-red-400 ml-2 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        { /* ===== 项目脉络 ===== */ }
        {activeTab === 'insight' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              项目脉络 — 银月对分身代码的架构理解
            </p>
            {projectInsight ? (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                  {projectInsight}
                </pre>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={onGenerateInsight}
                    disabled={isGeneratingInsight}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                      isGeneratingInsight
                        ? 'bg-blue-600/50 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isGeneratingInsight ? '生成中...' : '生成/刷新'}
                  </button>
                  <button
                    onClick={() => {
                      const newContent = prompt('编辑项目脉络：', projectInsight);
                      if (newContent !== null) onSetInsight(newContent);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded-lg text-xs font-medium transition"
                  >
                    编辑
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 italic">
                  暂无脉络，点击下方按钮让银月分析分身代码
                </p>
                <button
                  onClick={onGenerateInsight}
                  disabled={isGeneratingInsight}
                  className={`w-full py-2 rounded-lg text-xs font-medium transition ${
                    isGeneratingInsight
                      ? 'bg-blue-600/50 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {isGeneratingInsight ? '生成中...' : '生成/刷新'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}