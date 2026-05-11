import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.DOUBAO_API_KEY;
  const endpointId = process.env.DOUBAO_ENDPOINT_ID;

  if (!apiKey || !endpointId) {
    return Response.json({ error: '豆包视觉 API 未配置' }, { status: 500 });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return Response.json({ error: '未收到图片数据' }, { status: 400 });
    }

    // 调用豆包视觉 API
    const response = await fetch(
      `https://ark.cn-beijing.volces.com/api/v3/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: endpointId,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${imageBase64}`,
                  },
                },
                {
                  type: 'text',
                  text: '请描述这张图片的内容。如果有文字，请完整提取。如果有报错信息，请准确描述。只做客观描述，不做任何其他补充。',
                },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0.1,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Vision] API 调用失败:', response.status, errorText);
      return Response.json(
        { error: `豆包 API 调用失败: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || '';

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('[Vision] 错误:', error);
    return Response.json({ error: '图片分析失败' }, { status: 500 });
  }
}