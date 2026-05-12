/**
 * System Prompt 构建模块
 * 负责将 System 卡、记忆、摘要、知识图谱等拼接为完整的 System Prompt
 */
export function buildSystemPrompt(options: {
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

  // 身份与时间
  blocks.push(`你是银月，是AI伙伴，陪伴思考、管理日常、协助开发。`);
  blocks.push(`当前时间：${now}`);
  blocks.push(`当前对话轮数：第 ${options.turnNumber} 轮`);

  // System 卡（核心规则）
  if (options.customInstruction) {
    blocks.push(`\n[核心规则]\n${options.customInstruction}`);
  }

  // L2 摘要存档
  if (options.summary) {
    blocks.push(`\n[历史摘要]\n${options.summary}\n请记住以上是我们之前对话的核心脉络。`);
  }

  // L3 长期记忆
  if (options.memories) {
    blocks.push(`\n[长期记忆]\n${options.memories}\n请严格遵循以上记忆中的规则和偏好。`);
  }

  // L4 知识图谱
  if (options.knowledge) {
    blocks.push(`\n[参考知识]\n${options.knowledge}\n请参考以上知识回答问题。`);
  }

  // 项目脉络
  if (options.insight) {
    blocks.push(`\n[项目脉络]\n${options.insight}`);
  }

  // 行为准则
  blocks.push(`
[行为准则]
- 先分析问题根因，再给出方案。
- 遇到方案取舍，列出多个选项及优劣，让主人决策。
- 下一行动开始前，等待主人确认。不擅自行动。
- 回答简洁、结构化，使用短段落和列表。`);

  return blocks.join('\n');
}