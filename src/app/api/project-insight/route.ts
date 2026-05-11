import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: '大脑燃料未配置' }, { status: 500 });
  }

  try {
    // 从请求中获取分身名称（默认 'silver-moon-fenshen'）
    const { target } = await req.json().catch(() => ({}));
    const fenshenName = target || 'silver-moon-fenshen';
    const fenshenRoot = path.join(process.cwd(), '..', fenshenName);
    
    // 【关键修复】采用 V1 的“白名单”策略，直接读取核心文件
    const coreFiles = [
      'src/app/chat/page.tsx',
      'src/app/layout.tsx',
      'src/app/api/engine/route.ts',
      'src/app/api/summarize/route.ts',
      'src/app/api/project-insight/route.ts',
      'src/lib/types.ts',
      'src/lib/storage.ts',
      'src/lib/memory-engine.ts',
      'src/lib/system-prompt.ts',
      'src/lib/utils.ts',
      'src/hooks/useChat.ts',
    ];

    let codeSnapshot = '';
    let filesFound = false;
    
    for (const filePath of coreFiles) {
      const fullPath = path.join(fenshenRoot, filePath);
      if (fs.existsSync(fullPath)) {
        filesFound = true;
        const content = fs.readFileSync(fullPath, 'utf-8');
        codeSnapshot += `\n\n=== ${filePath} ===\n${content.substring(0, 3000)}`;
      }
    }

    // 如果一个文件都没找到，明确报错
    if (!filesFound) {
      return NextResponse.json({ 
        success: false, 
        error: `在路径 ${fenshenRoot} 下未找到任何核心文件，请检查分身是否存在。` 
      });
    }

    // 调用大脑生成项目脉络摘要
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages: [
          {
            role: 'system',
            content: `你是银月的项目分析师。请根据以下分身项目的完整代码片段，生成一份**项目脉络摘要**。

摘要必须包含以下内容：
1. **项目架构**：分层结构、路由设计、数据流向
2. **模块功能**：每个文件的用途和职责
3. **关键函数/类型**：列出名称、所在文件、用途
4. **函数调用链**：核心逻辑链条
5. **设计约束**：必须遵循的规则、常见坑点、技术债务

请用最精炼的语言描述，不要照搬代码，而是提取核心逻辑和它们之间的关系。`,
          },
          {
            role: 'user',
            content: `请分析以下分身项目的代码，生成项目脉络摘要：${codeSnapshot}`,
          },
        ],
        max_tokens: 4096,
        temperature: 0.3,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`大脑调用失败: ${response.status}`);
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({ success: true, insight });
    
  } catch (error) {
    // 提供更具体的错误信息
    let errorMessage = '生成失败';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('生成项目脉络失败:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}