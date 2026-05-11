import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json({ error: '大脑燃料未配置' }, { status: 500 });
  }

  try {
    const { previousSummary, newMessages, version } = await req.json();

    // 格式化对话历史
    const conversationText = newMessages
      .map((msg: { role: string; content: string }) =>
        `[${msg.role === 'user' ? '主人' : '银月'}]: ${msg.content}`
      )
      .join('\n\n');

    // 构建递归总结提示词
    const systemPrompt = previousSummary
      ? `你是银月的摘要官。以下是此前所有对话的摘要（版本 v${version}）：\n${previousSummary}\n\n以下是最近 20 轮新对话：\n${conversationText}\n\n请将上述旧摘要和新对话合并，生成一份涵盖从第 1 轮至今的完整新摘要（不超过 500 字）。近期对话保留更多细节，早期对话压缩为关键脉络。`
      : `你是银月的摘要官。以下是前 20 轮对话：\n${conversationText}\n\n请生成一份摘要，涵盖核心主题、关键决策、未解决问题（不超过 300 字）。`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '请生成摘要。' },
        ],
        max_tokens: 800,
        temperature: 0.3,
        stream: false,
      }),
    });

    if (!response.ok) {
      return Response.json({ error: `摘要生成失败: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || '';

    return Response.json({
      success: true,
      summary,
      version: (version || 0) + 1,
    });
  } catch (error) {
    console.error('[Summarize] 出错:', error);
    return Response.json({ error: '摘要生成异常' }, { status: 500 });
  }
}