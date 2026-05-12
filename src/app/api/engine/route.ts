import { NextRequest } from 'next/server';
import { buildSystemPrompt } from '@/lib/system-prompt';

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