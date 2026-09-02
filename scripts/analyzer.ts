/**
 * scripts/analyzer.ts
 * 不生成评分，分析策略 + 标签 + 深度洞察 + 品牌介绍
 */
import { prisma } from '../lib/prisma';

const API_KEY = process.env.LLM_API_KEY;
const BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com';

if (!API_KEY) {
  console.error('错误：请设置环境变量 LLM_API_KEY');
  process.exit(1);
}

interface AIAnalysisResult {
  brand_intro: string; // ★ 新增品牌介绍
  strategy_analysis: {
    target_audience: string;
    core_strategy: string;
    communication_highlights: string;
    key_takeaway: string;
  };
  tags: string[];
  deep_insight: string;
}

async function analyzeCase(title: string, brand: string, brief: string, content: string): Promise<AIAnalysisResult> {
  const prompt = `
你是一位资深的营销策略专家，你非常熟悉以下内容：
核心万能框架（五步法）
​​案例背景与目标​​：用一句话交代清楚“谁（品牌），在什么节点，针对什么人群，做了什么活动”。同时明确品牌当时的核心诉求，是为了新品上市拉新、提升品牌口碑，还是促进节日销量转化。
​​策略与洞察拆解​​：这是分析的灵魂。要写出品牌“为什么这么做”，挖掘其背后的消费者洞察。可以结合经典理论如 ​​4P理论​​（产品、价格、渠道、推广）、​​SWOT分析​​或​​PEST分析​​，来论证品牌策略的合理性。
​​执行与传播节奏​​：按时间线梳理活动的具体动作。通常分为预热期（制造悬念）、爆发期（核心事件/KOL投放）和长尾期（UGC发酵/口碑沉淀），并说明各渠道（如小红书、抖音、线下快闪）是如何配合打组合拳的。
​​数据效果与口碑​​：用客观数据说话，包括曝光量、互动量、转化率等硬指标。同时补充软性指标，如网友的真实评论风向、是否引发社会级话题讨论，避免只报喜不报忧。
​​亮点总结与反思​​：提炼案例最值得借鉴的“神来之笔”（如独特的创意钩子、巧妙的跨界联名），同时客观指出其不足之处或可优化空间，并给出你的改进建议。
让分析脱颖而出的加分技巧
​​拒绝流水账​​：不要只写“品牌发了什么”，要写“品牌为什么发这个”。多问几个为什么，挖掘动作背后的策略逻辑。
​​善用可视化图表​​：如果是做PPT或报告，多用时间轴、渠道矩阵图、数据对比柱状图来替代大段文字，让逻辑一目了然。
​​建立对比视角​​：适当引入竞品分析，对比同类品牌在相同节点的不同打法，能瞬间提升你分析的格局和深度。
​​注重复盘思维​​：在结尾处加上“可复刻指数”和“翻车风险提示”，展示你不仅会看热闹，更具备实际落地和避坑的实战思维。
常用分析模型速查
​​4P理论​​：适合分析整体营销策略（产品、价格、渠道、促销）。
​​SWOT分析​​：适合分析品牌内部的优势劣势与外部的机会威胁。
​​STP理论​​：适合分析市场细分、目标人群选择和品牌定位。
​​AIDA模型​​：适合分析用户从注意、兴趣、欲望到行动的消费心理路径。

请参考以上内容分析以下营销案例，并以严格 JSON 格式输出分析结果。

【案例标题】：${title}
【所属品牌】：${brand}
【案例简介】：${brief}
【案例内容】：${content.slice(0, 3000)}（内容较长，截取前3000字）

请输出以下 JSON 结构：
{
  "brand_intro": "阅读原文内容后，介绍文章中相关品牌的基本情况：品牌定位、所属行业、核心产品或服务、市场地位等（80字以内）",
  "strategy_analysis": {
    "target_audience": "目标受众是谁，他们的痛点或者卡点是什么，品牌洞察到了什么用户需求",
    "core_strategy": "核心营销策略是什么",
    "communication_highlights": "传播亮点有哪些",
    "key_takeaway": "其他品牌可以借鉴什么"
  },
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "deep_insight": "用一段话深度解读：这个案例为什么有效？它的底层逻辑是什么？不限字数，要充分解读，条理清晰。"
}

注意：只输出 JSON，不要输出其他内容。
`;

  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一位营销策略专家，擅长分析营销案例并提炼可借鉴的方法论。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 调用失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const contentText = data.choices[0].message.content;

  try {
    const cleanJson = contentText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('JSON 解析失败:', contentText);
    throw new Error('大模型返回的不是有效 JSON');
  }
}

async function main() {
  console.log('AI 分析启动...');

  const cases = await prisma.case.findMany({
    where: { ai_strategy_analysis: null },
    select: { id: true, title: true, brand: true, brief: true, full_content_html: true }, // ★ 增加 brand
  });

  if (cases.length === 0) {
    console.log('所有案例已分析完成，无需处理。');
    await prisma.$disconnect();
    return;
  }

  console.log(`找到 ${cases.length} 个待分析的案例\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    console.log(`[${i + 1}/${cases.length}] 分析: ${c.title.slice(0, 40)}...`);

    const cleanContent = c.full_content_html
      ? c.full_content_html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      : c.brief || '';

    try {
      const result = await analyzeCase(c.title, c.brand || '未知品牌', c.brief || '', cleanContent);

      // ★ 存储时在开头加入品牌介绍
      const analysisText = `【品牌介绍】${result.brand_intro}
【目标受众】${result.strategy_analysis.target_audience}
【核心策略】${result.strategy_analysis.core_strategy}
【传播亮点】${result.strategy_analysis.communication_highlights}
【可借鉴点】${result.strategy_analysis.key_takeaway}`;

      await prisma.case.update({
        where: { id: c.id },
        data: {
          ai_strategy_analysis: analysisText.trim(),
          ai_tags: JSON.stringify(result.tags),
          ai_scores: null, // 不存储评分
          ai_deep_insight: result.deep_insight,
        },
      });

      successCount++;
    } catch (err) {
      failCount++;
      console.error(`  分析失败: ${(err as Error).message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`\n完成！成功: ${successCount}，失败: ${failCount}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('脚本执行异常:', err);
  process.exit(1);
});