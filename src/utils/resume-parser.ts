// ============================================================
// 简历解析器 — 从 PDF 文本提取结构化字段
// 纯前端实现，基于规则匹配 + 正则
// ============================================================

import * as pdfjsLib from 'pdfjs-dist';

// 设置 pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedResume {
  name: string;
  phone: string;
  email: string;
  education: string;
  current_location: string;
  skills: string[];
  position_applied: string;
  raw_text: string;
  confidence: 'high' | 'medium' | 'low';
}

/** 从 PDF 文件提取纯文本 */
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const texts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    texts.push(pageText);
  }

  return texts.join('\n');
}

/** 从文本中提取结构化字段 */
function parseFields(text: string): Omit<ParsedResume, 'raw_text' | 'confidence'> {
  // 中文简历常见模式
  const nameMatch = text.match(/(?:姓名|名字)[：:\s]*([^\s，。,.\n]{2,4})/);
  const phoneMatch = text.match(/(?:电话|手机|联系方式|联系电话)[：:\s]*(1[3-9]\d{9})/);
  const emailMatch = text.match(/(?:邮箱|电子邮件|E-?mail)[：:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  const eduMatch = text.match(/(?:学历|教育程度|最高学历)[：:\s]*(高中|大专|本科|硕士|博士|研究生)/);
  const locationMatch = text.match(/(?:所在地|现居|居住地|城市)[：:\s]*([^\s，。,.\n]{2,6})/);
  const positionMatch = text.match(/(?:应聘岗位|求职意向|意向岗位|期望职位|应聘职位)[：:\s]*([^\s，。,.\n]{2,15})/);

  // 技能提取
  const skills: string[] = [];
  const skillKeywords = [
    '英语谈判', 'LC单证', 'HS编码', '客户开发', '供应商管理', '外贸跟单',
    '国际物流', '报关报检', '跨境电商', '阿里巴巴国际站', '数据分析',
    '团队管理', '日语', '俄语', '西班牙语', '阿拉伯语',
  ];
  for (const kw of skillKeywords) {
    if (text.includes(kw)) skills.push(kw);
  }

  return {
    name: nameMatch?.[1] || '',
    phone: phoneMatch?.[1] || '',
    email: emailMatch?.[1] || '',
    education: eduMatch?.[1] || '',
    current_location: locationMatch?.[1] || '',
    skills,
    position_applied: positionMatch?.[1] || '',
  };
}

/** 主解析函数 */
export async function parseResume(file: File): Promise<ParsedResume> {
  try {
    const text = await extractTextFromPDF(file);
    const fields = parseFields(text);

    // 计算置信度
    const filled = [fields.name, fields.phone, fields.email].filter(Boolean).length;
    const confidence = filled >= 3 ? 'high' : filled >= 2 ? 'medium' : 'low';

    return { ...fields, raw_text: text, confidence };
  } catch (err) {
    console.error('PDF 解析失败:', err);
    return {
      name: '', phone: '', email: '', education: '', current_location: '',
      skills: [], position_applied: '',
      raw_text: '',
      confidence: 'low',
    };
  }
}
