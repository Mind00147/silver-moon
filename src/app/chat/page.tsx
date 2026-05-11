"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@/hooks/useChat";
import { useProjects } from "@/hooks/useProjects";
import { useSessions } from "@/hooks/useSessions";
import { useMemories } from "@/hooks/useMemories";
import { useKnowledge } from "@/hooks/useKnowledge";
import { useSummary } from "@/hooks/useSummary";
import { useInsight } from "@/hooks/useInsight";
import { useSearch } from "@/hooks/useSearch";
import MessageBubble from "./_components/MessageBubble";
import InputBox from "./_components/InputBox";
import WorkPanel from "./_components/WorkPanel";
import SearchBar from "./_components/SearchBar";
import PictureAnalysis from "./_components/PictureAnalysis";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import MobileHeader from "./_components/MobileHeader";
import MobileWorkPanel from "./_components/MobileWorkPanel";
import type { Message, Session } from "@/lib/types";

export default function ChatPage() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileShowSearch, setMobileShowSearch] = useState(false);
  const [mobileShowWorkPanel, setMobileShowWorkPanel] = useState(false);

  // ========== 多项目 ==========
  const {
    currentProject,
    projectList,
    loaded: projectLoaded,
    switchProject,
    addProject,
    deleteProject,
  } = useProjects();

  // ========== 会话管理 ==========
  const {
    sessions,
    currentSessionId,
    currentSession,
    createNewSession,
    switchSession,
    deleteSession,
    updateCurrentSessionMessages,
  } = useSessions(currentProject, projectLoaded);

  // ========== 分层记忆 ==========
  const { memories, addMemory, updateMemory, deleteMemory, getMemoryContext } = useMemories(currentProject);
  const { knowledgeEntries, addKnowledge, updateKnowledge, deleteKnowledge, searchKnowledge } = useKnowledge(currentProject);

  // ========== 摘要存档 ==========
  const {
    currentSummary,
    summaryVersion,
    loadSummary,
    generateSummary,
    refreshSummary,
    setSummary,
    deleteSummary,
    getSummaryContext,
  } = useSummary(currentProject);

  // ========== 项目脉络 ==========
  const { projectInsight, isGenerating: insightGenerating, generateInsight, setInsight } = useInsight(currentProject);

  // ========== 对话内查找 ==========
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    currentIndex: searchIndex,
    next: searchNext,
    prev: searchPrev,
    clear: searchClear,
    search: doSearch,
  } = useSearch();

  // ========== 聊天引擎 ==========
  const {
    loading,
    setLoading,
    streamingReply,
    setStreamingReply,
    streamingThinking,
    sendMessage,
  } = useChat();

  // ========== 本地 UI 状态 ==========
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [visionResult, setVisionResult] = useState<string>('');
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showWorkPanel, setShowWorkPanel] = useState(false);
  const [showSystemCardUpdated, setShowSystemCardUpdated] = useState(false);
  const systemCardBeforeEdit = useRef('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserAtBottom = useRef(true);

  const messages = useMemo(
    () => currentSession?.messages || [],
    [currentSession?.messages]
  );

  const turnNumber = useMemo(
    () => messages.filter((m) => m.role === 'user').length,
    [messages]
  );

  // 智能滚动
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      isUserAtBottom.current = scrollHeight - scrollTop - clientHeight < 80;
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isUserAtBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingReply]);

  // 搜索跳转：滚动到对应消息气泡并临时高亮
  useEffect(() => {
    if (searchResults.length === 0 || !chatContainerRef.current) return;
    const targetIndex = searchResults[searchIndex]?.messageIndex;
    if (targetIndex === undefined) return;

    // 简单滚动到目标消息（通过索引定位 DOM）
    const messages = chatContainerRef.current.querySelectorAll('[data-message-index]');
    const targetEl = messages[targetIndex] as HTMLElement;
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 临时高亮
      targetEl.style.transition = 'background-color 0.3s';
      targetEl.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
      setTimeout(() => {
        targetEl.style.backgroundColor = '';
      }, 2000);
    }
  }, [searchIndex, searchResults]);

  // ========== 发送消息 ==========
  const handleSend = async (userMessage: string, image: string | null) => {
    // ========== 调试：检查工作台（强制调取全部五个模块） ==========
    const isDebugCheck = userMessage.includes('调试：检查工作台');
    
    let finalUserMessage = userMessage;
    let forceKnowledge = '';
    let forceSummary = '';
    let forceInsight = '';

    if (isDebugCheck) {
      // 强制加载知识图谱全部条目（绕开按需检索）
      if (knowledgeEntries.length > 0) {
        forceKnowledge = knowledgeEntries.map(
          (e: { title: string; content: string }) => `- ${e.title}: ${e.content}`
        ).join('\n');
      } else {
        forceKnowledge = '（知识图谱为空）';
      }

      // 强制获取摘要（即使未到自动生成轮数）
      forceSummary = currentSummary || '（摘要存档为空）';

      // 强制获取项目脉络
      forceInsight = projectInsight || '（项目脉络为空）';

      // 构造强制检视指令
      finalUserMessage = `[调试指令：检查工作台]
请根据你当前接收到的全部上下文，生成一份完整的工作面板状态报告。必须覆盖以下全部五个模块：

1. **System 卡**：复述你收到的核心行为规则
2. **知识图谱**：列出所有条目标题和完整内容（已强制加载）
3. **摘要存档**：概述当前会话的摘要内容（已强制获取）
4. **长期记忆**：列出所有已记录的规则
5. **项目脉络**：概述你收到的项目架构理解（已强制获取）

强制加载内容如下：

[知识图谱全部条目]
${forceKnowledge}

[摘要存档]
${forceSummary}

[项目脉络]
${forceInsight}

请用清晰的列表输出，确保覆盖以上全部内容。`;
    }

    const userMsg: Message = {
      role: "user",
      content: finalUserMessage || "[图片]",
      image: image ? `data:image/png;base64,${image}` : undefined,
    };
    const newMessages = [...messages, userMsg];
    updateCurrentSessionMessages(newMessages);
    setStreamingReply("");
    setLoading(true);

    // 获取记忆上下文
    const memoryContext = await getMemoryContext();
    const knowledgeContext = await searchKnowledge(userMessage);

    // 注入摘要上下文
    const summaryContext = await getSummaryContext(currentSessionId || '');

    // 生成项目脉络上下文，自动附加时效提示
    let insightContext = '';
    if (projectInsight) {
      const match = projectInsight.match(/\[生成于第 (\d+) 轮\]/);
      if (match) {
        const generatedAt = parseInt(match[1]);
        const roundsBehind = turnNumber - generatedAt;
        if (roundsBehind > 20) {
          insightContext = `${projectInsight}\n\n[⚠️ 注意：此脉络已生成 ${roundsBehind} 轮，可能已过时。请结合最近的对话和摘要判断当前架构是否有变化。]`;
        } else {
          insightContext = projectInsight;
        }
      } else {
        // 没有轮数标签（手动编辑过的脉络），直接使用
        insightContext = projectInsight;
      }
    }

    // 如果有图片，显示分析状态
    if (image) {
      setAnalyzingImage(true);
      setVisionResult('');
    }

    const result = await sendMessage(finalUserMessage, {
      messages: newMessages,
      image,
      customInstruction: systemCard, // 传入 System 卡
      memoryContext,
      knowledgeContext,
      summaryContext,
      insightContext,
    });

    // 分析完成，清除状态
    setAnalyzingImage(false);
    setVisionResult('');

    // 自动生成摘要（对话满 20 轮时）
    const turnCount = newMessages.filter((m: Message) => m.role === 'user').length;
    if (currentSessionId) {
      await generateSummary(currentSessionId, newMessages, turnCount);
    }

    const assistantMsg: Message = {
      role: "assistant",
      content: result.reply,
      thinking: result.thinking,
    };
    updateCurrentSessionMessages([...newMessages, assistantMsg]);
  };

  // ========== 记下消息 ==========
  const handleRemember = async (content: string, isUser: boolean) => {
    await addMemory(content, isUser);
  };

  // ========== System 卡 ==========
  const [systemCard, setSystemCard] = useState('');
  const [systemCardLoaded, setSystemCardLoaded] = useState(false);

  // 切换项目时重置 System 卡状态
  useEffect(() => {
    setSystemCard('');
    setSystemCardLoaded(false);
  }, [currentProject]);

  useEffect(() => {
    if (!projectLoaded) return;
    import('@/lib/storage').then(({ StorageAdapter }) => {
      StorageAdapter.get<string>(`${currentProject}_system_card`).then((val) => {
        if (val) setSystemCard(val);
        setSystemCardLoaded(true);
      });
    });
  }, [currentProject, projectLoaded]);

  useEffect(() => {
    if (!systemCardLoaded) return;
    import('@/lib/storage').then(({ StorageAdapter }) => {
      StorageAdapter.set(`${currentProject}_system_card`, systemCard);
    });
  }, [systemCard, systemCardLoaded, currentProject]);

  useEffect(() => {
    if (currentSessionId) {
      loadSummary(currentSessionId);
    }
  }, [currentSessionId, loadSummary]);

  // ========== 手机端布局 ==========
  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh bg-gray-950 text-gray-100">
        {/* 聊天主界面 */}
        {!mobileShowWorkPanel ? (
          <>
            <MobileHeader
              title={currentSession?.title || "新对话"}
              onMenuClick={() => setMobileDrawerOpen(true)}
              onSearchClick={() => setMobileShowSearch(!mobileShowSearch)}
            />

            {/* 搜索栏 */}
            {mobileShowSearch && (
              <SearchBar
                query={searchQuery}
                onQueryChange={(value) => {
                  setSearchQuery(value);
                  doSearch(messages, value);
                }}
                resultCount={searchResults.length}
                currentIndex={searchIndex}
                onPrev={searchPrev}
                onNext={searchNext}
                onClear={() => {
                  searchClear();
                  setMobileShowSearch(false);
                }}
              />
            )}

            {/* System 卡更新通知 */}
            {showSystemCardUpdated && (
              <div className="bg-green-900/40 border border-green-700 text-green-300 text-xs text-center py-1.5">
                ✅ System 卡已更新
              </div>
            )}

            {/* 消息列表 */}
            <main
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-3 space-y-3"
            >
              {messages.length === 0 && !loading && (
                <p className="text-gray-500 text-xs text-center mt-20">
                  在下方输入消息，开始与银月对话
                </p>
              )}

              {messages.map((msg: Message, i: number) => (
                <div key={i} data-message-index={i}>
                  {msg.role === 'assistant' && msg.thinking && (
                    <details className="ml-2 mb-1 cursor-pointer group">
                      <summary className="text-xs text-gray-500 hover:text-gray-300 transition select-none">
                        💭 思考过程
                      </summary>
                      <div className="mt-1 p-2 bg-gray-900/40 border-l-2 border-gray-600 text-xs text-gray-400 whitespace-pre-wrap rounded">
                        {msg.thinking}
                      </div>
                    </details>
                  )}
                  <MessageBubble
                    message={msg}
                    onCopy={(content) => navigator.clipboard.writeText(content)}
                    onRemember={(content, isUser) => handleRemember(content, isUser)}
                  />
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    {streamingThinking && (
                      <div className="bg-gray-900/40 border-l-2 border-blue-500 rounded px-3 py-1.5 text-xs text-gray-400 whitespace-pre-wrap">
                        💭 {streamingThinking}
                      </div>
                    )}
                    {streamingReply && (
                      <div className="bg-gray-800 text-gray-200 rounded-lg px-3 py-1.5 text-sm whitespace-pre-wrap break-words">
                        {streamingReply}
                      </div>
                    )}
                    {!streamingReply && !streamingThinking && (
                      <div className="bg-gray-800 text-gray-400 rounded-lg px-3 py-1.5 text-sm italic">
                        银月正在思考... 灵力运转中
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </main>

            <InputBox onSend={handleSend} disabled={loading} />
          </>
        ) : (
          /* 工作面板全屏页 */
          <MobileWorkPanel
            onBack={() => setMobileShowWorkPanel(false)}
            systemCard={systemCard}
            onSystemCardChange={setSystemCard}
            memories={memories}
            onUpdateMemory={(id, content, title) => updateMemory(id, content, title)}
            onDeleteMemory={(id) => deleteMemory(id)}
            knowledgeEntries={knowledgeEntries}
            onAddKnowledge={(title, content) => addKnowledge(title, content)}
            onUpdateKnowledge={(id, title, content) => updateKnowledge(id, title, content)}
            onDeleteKnowledge={(id) => deleteKnowledge(id)}
            currentSummary={currentSummary}
            summaryVersion={summaryVersion}
            turnNumber={turnNumber}
            onRefreshSummary={async () => {
              if (currentSessionId) {
                await refreshSummary(currentSessionId, messages);
              }
            }}
            onSetSummary={(content: string) => {
              if (currentSessionId) setSummary(currentSessionId, content);
            }}
            onDeleteSummary={async () => {
              if (currentSessionId) deleteSummary(currentSessionId);
            }}
            projectInsight={projectInsight}
            isGeneratingInsight={insightGenerating}
            onGenerateInsight={async () => {
              await generateInsight(turnNumber);
            }}
            onSetInsight={(content: string) => setInsight(content)}
          />
        )}

        {/* 侧边抽屉（覆盖在聊天页上方） */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* 遮罩层 */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileDrawerOpen(false)}
            />
            {/* 抽屉内容 */}
            <div className="relative w-80 max-w-[85%] bg-gray-900 h-full flex flex-col shadow-2xl">
              {/* 项目选择 */}
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">当前项目</span>
                  <button
                    onClick={() => {
                      setShowProjectManager(true);
                      setMobileDrawerOpen(false);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    管理项目
                  </button>
                </div>
                <select
                  value={currentProject}
                  onChange={(e) => {
                    switchProject(e.target.value);
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  {projectList.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* 新建会话 */}
              <div className="p-3">
                <button
                  onClick={() => {
                    createNewSession();
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium transition"
                >
                  ＋ 新对话
                </button>
              </div>

              {/* 会话列表 */}
              <div className="flex-1 overflow-y-auto px-3 space-y-1">
                <p className="text-xs text-gray-600 px-2 py-1">对话历史</p>
                {sessions.map((session: Session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      switchSession(session.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition ${
                      session.id === currentSessionId
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                    }`}
                  >
                    <span className="truncate flex-1">{session.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(session.id);
                      }}
                      className="text-gray-600 hover:text-red-400 ml-2 text-xs"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>

              {/* 工作面板入口 */}
              <div className="border-t border-gray-800 p-3">
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setMobileShowWorkPanel(true);
                  }}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm font-medium transition"
                >
                  ⚙️ 工作面板
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== 桌面端布局（完全保持原样） ==========
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* ===== 确认删除弹窗 ===== */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-sm text-gray-300 mb-2">主人，确认要删除这个会话？</p>
            <p className="text-xs text-gray-500 mb-6">
              「{sessions.find((s: Session) => s.id === confirmDeleteId)?.title || "未命名"}」
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId("")}
                className="px-4 py-2 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                再想想
              </button>
              <button
                onClick={() => {
                  deleteSession(confirmDeleteId);
                  setConfirmDeleteId("");
                }}
                className="px-4 py-2 text-xs text-white bg-red-600 hover:bg-red-500 rounded-lg transition"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 侧边栏 ===== */}
      <aside
        className={`w-full md:w-64 border-r border-gray-800 flex flex-col bg-gray-900 shrink-0 ${
          sidebarOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
          {/* 项目选择 */}
          <div className="p-3 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">当前项目</span>
              <button
                onClick={() => setShowProjectManager(true)}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                管理项目
              </button>
            </div>
            <select
              value={currentProject}
              onChange={(e) => switchProject(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {projectList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* 新建会话按钮 */}
          <div className="p-3">
            <button
              onClick={createNewSession}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              ＋ 新对话
            </button>
          </div>

          {/* 会话列表 */}
          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            <p className="text-xs text-gray-600 px-2 py-1">对话历史</p>
            {sessions.map((session: Session) => (
              <div
                key={session.id}
                onClick={() => switchSession(session.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition ${
                  session.id === currentSessionId
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                }`}
              >
                <span className="truncate flex-1" title={session.title}>
                  {session.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(session.id);
                  }}
                  className="text-gray-600 hover:text-red-400 ml-2 text-xs transition"
                  title="删除会话"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>

          {/* 手机端：工作面板内嵌在侧边栏 */}
          <div className="md:hidden">
            {showWorkPanel && (
              <WorkPanel
                onClose={() => {
                  if (systemCard !== systemCardBeforeEdit.current) {
                    setShowSystemCardUpdated(true);
                    setTimeout(() => setShowSystemCardUpdated(false), 3000);
                  }
                  setShowWorkPanel(false);
                }}
                systemCard={systemCard}
                onSystemCardChange={setSystemCard}
                memories={memories}
                onUpdateMemory={updateMemory}
                onDeleteMemory={deleteMemory}
                knowledgeEntries={knowledgeEntries}
                onAddKnowledge={addKnowledge}
                onUpdateKnowledge={updateKnowledge}
                onDeleteKnowledge={deleteKnowledge}
                currentSummary={currentSummary}
                summaryVersion={summaryVersion}
                turnNumber={turnNumber}
                onRefreshSummary={async () => {
                  if (currentSessionId) await refreshSummary(currentSessionId, messages);
                }}
                onSetSummary={(content: string) => {
                  if (currentSessionId) setSummary(currentSessionId, content);
                }}
                onDeleteSummary={() => {
                  if (currentSessionId) deleteSummary(currentSessionId);
                }}
                projectInsight={projectInsight}
                isGeneratingInsight={insightGenerating}
                onGenerateInsight={async () => { await generateInsight(turnNumber); }}
                onSetInsight={setInsight}
              />
            )}
          </div>

          {/* 工作面板按钮 */}
          <div className="border-t border-gray-800 p-3">
            <button
              onClick={() => {
                if (!showWorkPanel) {
                  systemCardBeforeEdit.current = systemCard;
                }
                setShowWorkPanel(!showWorkPanel);
              }}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm font-medium transition"
            >
              🛠 工作面板
            </button>
          </div>
        </aside>

      {/* ===== 主聊天区 ===== */}
      <div
        className={`relative flex-1 flex flex-col min-w-0 ${
          sidebarOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* 顶部栏 */}
        <header className="border-b border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-300 text-sm"
              >
                ☰
              </button>
            )}
            <div>
              <h1 className="text-sm font-semibold">银月助手</h1>
              <p className="text-xs text-gray-600">
                {currentSession?.title || "新对话"}
                {turnNumber > 0 && ` · 第 ${turnNumber} 轮`}
              </p>
            </div>
          </div>
        </header>

        {showSystemCardUpdated && (
          <div className="bg-green-900/40 border border-green-700 text-green-300 text-xs text-center py-1.5 transition-opacity duration-300">
            ✅ System 卡已更新
          </div>
        )}

        { /* 搜索栏 */ }
        <SearchBar
          query={searchQuery}
          onQueryChange={(value) => {
            setSearchQuery(value);
            doSearch(messages, value);
          }}
          resultCount={searchResults.length}
          currentIndex={searchIndex}
          onPrev={searchPrev}
          onNext={searchNext}
          onClear={searchClear}
        />

        {/* 消息列表 */}
        <main
          ref={chatContainerRef}
          className={`flex-1 overflow-y-auto p-4 space-y-4 ${
            showWorkPanel ? "pr-96" : ""
          }`}
        >
          {messages.length === 0 && !loading && (
            <p className="text-gray-500 text-sm text-center mt-20">
              在下方输入消息，开始与银月对话
            </p>
          )}

          {/* 历史消息 */}
          {messages.map((msg: Message, i: number) => (
            <div key={i} data-message-index={i}>
              {/* 思考过程（历史消息可折叠） */}
              {msg.role === "assistant" && msg.thinking && (
                <details className="ml-2 mb-2 cursor-pointer group">
                  <summary className="text-xs text-gray-500 hover:text-gray-300 transition select-none">
                    💭 思考过程
                  </summary>
                  <div className="mt-1 p-3 bg-gray-900/40 border-l-2 border-gray-600 text-xs text-gray-400 whitespace-pre-wrap rounded">
                    {msg.thinking}
                  </div>
                </details>
              )}
              <MessageBubble
                message={msg}
                onCopy={(content) => navigator.clipboard.writeText(content)}
                onRemember={(content, isUser) => handleRemember(content, isUser)}
              />
            </div>
          ))}

          { /* 图片分析状态 */ }
          <PictureAnalysis isAnalyzing={analyzingImage} result={visionResult} />

          {/* 流式输出中 */}
          {loading && (
            <div className="flex justify-start">
              <div className="flex flex-col gap-1 max-w-[80%]">
                {streamingThinking && (
                  <div className="bg-gray-900/40 border-l-2 border-blue-500 rounded px-4 py-2 text-xs text-gray-400 whitespace-pre-wrap">
                    💭 {streamingThinking}
                  </div>
                )}
                {streamingReply && (
                  <div className="bg-gray-800 text-gray-200 rounded-lg px-4 py-2 text-sm whitespace-pre-wrap break-words">
                    {streamingReply}
                  </div>
                )}
                {!streamingReply && !streamingThinking && (
                  <div className="bg-gray-800 text-gray-400 rounded-lg px-4 py-2 text-sm italic">
                    银月正在思考... 灵力运转中
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* 输入框 */}
        <InputBox onSend={handleSend} disabled={loading} />
      </div>

      {/* ===== 项目管理弹窗 ===== */}
      {showProjectManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-sm font-semibold text-gray-200 mb-4">管理项目</p>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {projectList.map((project) => (
                <div
                  key={project}
                  className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
                >
                  <span className="text-xs text-gray-300">{project}</span>
                  {projectList.length > 1 && (
                    <button
                      onClick={() => deleteProject(project)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="新项目名称"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newProjectName.trim()) {
                    addProject(newProjectName.trim());
                    setNewProjectName("");
                  }
                }}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => {
                  if (newProjectName.trim()) {
                    addProject(newProjectName.trim());
                    setNewProjectName("");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs transition"
              >
                添加
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowProjectManager(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      { /* ===== 工作面板 ===== */ }
      {/* ===== 桌面端工作面板（绝对定位，保持原样） ===== */}
      <div className="hidden md:flex">
        {showWorkPanel && (
          <WorkPanel
            onClose={() => {
              if (systemCard !== systemCardBeforeEdit.current) {
                setShowSystemCardUpdated(true);
                setTimeout(() => setShowSystemCardUpdated(false), 3000);
              }
              setShowWorkPanel(false);
            }}
            systemCard={systemCard}
            onSystemCardChange={setSystemCard}
            memories={memories}
            onUpdateMemory={updateMemory}
            onDeleteMemory={deleteMemory}
            knowledgeEntries={knowledgeEntries}
            onAddKnowledge={addKnowledge}
            onUpdateKnowledge={updateKnowledge}
            onDeleteKnowledge={deleteKnowledge}
            currentSummary={currentSummary}
            summaryVersion={summaryVersion}
            onRefreshSummary={async () => {
              if (currentSessionId) {
                await refreshSummary(currentSessionId, messages);
              }
            }}
            onSetSummary={(content: string) => {
              if (currentSessionId) setSummary(currentSessionId, content);
            }}
            onDeleteSummary={() => {
              if (currentSessionId) deleteSummary(currentSessionId);
            }}
            turnNumber={turnNumber}
            projectInsight={projectInsight}
            isGeneratingInsight={insightGenerating}
            onGenerateInsight={async () => { await generateInsight(turnNumber); }}
            onSetInsight={setInsight}
          />
        )}
      </div>
    </div>
  );
}