import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '大脑燃料未配置' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const {
      messages,
      customInstruction,
      summaryContext,
      memoryContext,
      knowledgeContext,
      insightContext,
      turnNumber,
    } = await req.json();

    // 构建 System Prompt
    const systemPrompt = buildSystemPrompt({
      customInstruction,
      summary: summaryContext,
      memories: memoryContext,
      knowledge: knowledgeContext,
      insight: insightContext,
      turnNumber: turnNumber || 1,
    });

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // 调用 DeepSeek API（流式）
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages: apiMessages,
        max_tokens: 8192,
        temperature: 0.8,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Engine] DeepSeek 调用失败:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `DeepSeek 调用失败: ${response.status}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建 SSE 流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let lastChunkTime = Date.now();
        const TIMEOUT = 30000; // 30 秒无新数据则断开

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            lastChunkTime = Date.now();
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                // 思考过程
                if (delta?.reasoning_content) {
                  const event = JSON.stringify({ type: 'thinking', content: delta.reasoning_content });
                  controller.enqueue(encoder.encode(`event: thinking\ndata: ${event}\n\n`));
                }

                // 正式回复
                if (delta?.content) {
                  const event = JSON.stringify({ type: 'content', content: delta.content });
                  controller.enqueue(encoder.encode(`event: content\ndata: ${event}\n\n`));
                }
              } catch {
                // 忽略解析失败的行
              }
            }

            // 超时保护
            if (Date.now() - lastChunkTime > TIMEOUT) {
              controller.enqueue(
                encoder.encode(`event: content\ndata: ${JSON.stringify({ type: 'content', content: '\n\n[⏳ 响应超时，请重新发送消息]' })}\n\n`)
              );
              break;
            }
          }
        } catch (error) {
          console.error('[Engine] 流读取错误:', error);
        } finally {
          controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Engine] 请求处理失败:', error);
    return new Response(JSON.stringify({ error: '大脑暂时无法响应' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * System Prompt 构建（临时内联版本，后续可替换为 src/lib/system-prompt.ts 的引用）
 */
function buildSystemPrompt(options: {
  customInstruction?: string;
  summary?: string;
  memories?: string;
  knowledge?: string;
  insight?: string;
  turnNumber: number;
}): string {
  const now = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const blocks: string[] = [];

  blocks.push(`你是银月，百炼之的专属 AI 开发助手。`);
  blocks.push(`当前时间：${now}`);
  blocks.push(`当前对话轮数：第 ${options.turnNumber} 轮`);

  if (options.customInstruction) {
    blocks.push(`\n[核心规则]\n${options.customInstruction}`);
  }
  if (options.summary) {
    blocks.push(`\n[历史摘要]\n${options.summary}\n请记住以上是我们之前对话的核心脉络。`);
  }
  if (options.memories) {
    blocks.push(`\n[长期记忆]\n${options.memories}\n请严格遵循以上记忆中的规则和偏好。`);
  }
  if (options.knowledge) {
    blocks.push(`\n[参考知识]\n${options.knowledge}\n请参考以上知识回答问题。`);
  }
  if (options.insight) {
    blocks.push(`\n[项目脉络]\n${options.insight}`);
  }

  blocks.push(`
[行为准则]
- 先分析问题根因，再给出方案。
- 遇到方案取舍，列出多个选项及优劣，让主人决策。
- 下一行动开始前，等待主人确认。不擅自行动。
- 回答简洁、结构化，使用短段落和列表。`);

  return blocks.join('\n');
}