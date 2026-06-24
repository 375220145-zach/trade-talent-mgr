// ============================================================
// 模拟数据生成器 — 30 候选人 + 20 在岗员工
// ============================================================

import type { Talent } from './schema';
import { db } from './index';

const SURNAMES = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '林', '罗', '郑', '梁', '谢', '宋', '唐', '韩', '曹', '许', '邓', '冯', '萧'];
const GIVEN_NAMES = ['明', '华', '强', '伟', '芳', '敏', '静', '丽', '洋', '涛', '军', '勇', '磊', '雪', '琳', '超', '鑫', '宁', '文', '鹏', '婷', '浩', '然', '博', '宇', '晨', '曦', '睿', '萱', '怡'];
const CITIES = ['广州', '深圳', '东莞', '佛山', '中山', '珠海', '惠州', '汕头', '厦门', '福州', '泉州', '杭州', '宁波', '温州', '义乌', '上海', '苏州', '南京', '青岛', '天津'];
const SKILLS_POOL = [
  '英语谈判', 'LC单证', 'HS编码归类', '客户开发', '供应商管理', '外贸跟单',
  '国际物流', '报关报检', '外汇风险管理', '跨境电商运营', '阿里巴巴国际站',
  '展会参展', '大客户维护', '供应链管理', '成本核算', '合同审核',
  '西语商务', '俄语商务', '日语商务', '阿拉伯语商务', '数据分析', '团队管理',
];
const LANGUAGES = [
  { language: '英语', level: 'fluent' as const },
  { language: '英语', level: 'business' as const },
  { language: '英语', level: 'basic' as const },
  { language: '日语', level: 'business' as const },
  { language: '俄语', level: 'basic' as const },
  { language: '西班牙语', level: 'business' as const },
  { language: '阿拉伯语', level: 'basic' as const },
];
const TRADE_CATEGORIES = ['纺织', '电子', '机械', '化工', '农产品', '建材', '五金', '家居', '服装', '玩具'];
const MARKETS = ['东南亚', '中东', '欧盟', '北美', '南美', '非洲', '日韩', '俄罗斯', '澳大利亚', '南亚'];
const POSITIONS = ['外贸销售', '单证员', '采购经理', '跟单员', '外贸主管', '跨境电商运营', '大客户经理', '供应链专员', '报关员', '海外市场经理'];
const DEPARTMENTS = ['业务部', '人力资源部', '渠道拓展部', '项目部'] as const;
const EDUCATIONS = ['高中', '大专', '本科', '硕士', '博士'] as const;
const HIGHLIGHTS = [
  '独立开发东南亚市场，年销售额提升40%',
  '英语流利，有海外参展经验',
  '精通信用证操作，零差错率',
  '带过5人外贸团队',
  '熟悉RCEP原产地规则',
  '有跨境电商从0到1经验',
  '中东市场深耕8年',
  '持有报关员资格证书',
  '日语N1，服务过丰田供应商',
  '擅长供应链成本优化',
];
const RISKS = [
  '期望薪资偏高',
  '行业经验集中单一品类',
  '频繁跳槽（3年4家）',
  '无团队管理经验',
  '英语口语偏弱',
  '无外贸实务经验（纯内贸转）',
  '年龄偏大，学习曲线可能陡',
  '异地求职，到岗时间不确定',
  '上一份工作不足半年',
  '学历偏低，晋升空间有限',
];

function scoreToGrid(score: number): 1 | 2 | 3 {
  if (score <= 3) return 1;
  if (score <= 6) return 2;
  return 3;
}

function pick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysBack));
  return d.toISOString();
}

function generateTalent(overrides: Partial<Talent> = {}): Talent {
  const surname = pick(SURNAMES, 1)[0];
  const given = pick(GIVEN_NAMES, randomInt(1, 2)).join('');
  const gender = Math.random() > 0.45 ? '男' : '女';
  const age = randomInt(22, 48);
  const education = pick([...EDUCATIONS], 1)[0];
  const tradeYears = randomInt(0, 15);
  const workYears = Math.max(tradeYears + randomInt(0, 5), randomInt(1, 20));
  const skills = pick(SKILLS_POOL, randomInt(3, 8));
  const langs = pick(LANGUAGES, randomInt(1, 2));
  const dept = pick([...DEPARTMENTS], 1)[0];
  const perf = randomInt(3, 10);
  const pot = randomInt(3, 10);

  const base: Talent = {
    name: surname + given,
    phone: `1${randomInt(30, 99)}${String(randomInt(10000000, 99999999))}`,
    email: `candidate${randomInt(100, 999)}@example.com`,
    gender,
    age,
    education: education as typeof EDUCATIONS[number],
    current_location: pick(CITIES, 1)[0],
    work_years: workYears,

    skills,
    languages: langs,
    trade_experience_years: tradeYears,
    trade_categories: pick(TRADE_CATEGORIES, randomInt(1, 3)),
    target_markets: pick(MARKETS, randomInt(1, 3)),

    position_applied: pick(POSITIONS, 1)[0],
    position_intended: pick(POSITIONS, 1)[0],
    department: dept as typeof DEPARTMENTS[number],

    source: Math.random() > 0.5 ? 'hr_upload' : 'public_link',
    resume_file_name: `简历_${surname}${given}_${pick(POSITIONS, 1)[0]}.pdf`,
    resume_text: null,

    status: 'reviewing',
    pool_type: 'reserve',
    reserve_level: null,

    hr_review: { decision: null, notes: '', reviewed_at: null },
    hr_interview: { scheduled_at: null, interviewer: '', score: null, notes: '', passed: null, interviewed_at: null },
    business_interview: { scheduled_at: null, interviewer: '', score: null, notes: '', passed: null, interviewed_at: null },

    offer_status: null,
    grid_position: null,

    performance_score: perf,
    potential_score: pot,
    highlights: pick(HIGHLIGHTS, 1)[0],
    risks: Math.random() > 0.4 ? pick(RISKS, 1)[0] : '',
    general_notes: '',

    is_deleted: false,
    deleted_reason: null,
    deleted_at: null,

    created_at: randomDate(30),
    updated_at: new Date().toISOString(),
  };

  return { ...base, ...overrides };
}

// 生成指定状态的人才
function genWithStatus(status: Talent['status'], count: number, overrides: Partial<Talent> = {}): Talent[] {
  const talents: Talent[] = [];
  for (let i = 0; i < count; i++) {
    const t = generateTalent(overrides);
    t.status = status;

    // 按状态填充合理数据
    if (status === 'suitable') {
      t.hr_review = { decision: 'suitable', notes: '沟通表达好，经验匹配', reviewed_at: randomDate(10) };
    } else if (status === 'unsuitable') {
      t.hr_review = { decision: 'unsuitable', notes: '英语水平不达标', reviewed_at: randomDate(10) };
      t.is_deleted = true;
      t.deleted_reason = '简历筛选不合适';
      t.deleted_at = randomDate(5);
    } else if (status === 'reserve') {
      t.hr_review = { decision: 'reserve', notes: '能力不错但当前岗位已满', reviewed_at: randomDate(15) };
      t.pool_type = 'reserve';
      t.reserve_level = pick(['A', 'B', 'C'] as const, 1)[0];
    } else if (status === 'hr_interview_scheduled') {
      t.hr_review = { decision: 'suitable', notes: '经验匹配', reviewed_at: randomDate(12) };
      t.hr_interview = { scheduled_at: randomDate(3), interviewer: '张HR', score: null, notes: '', passed: null, interviewed_at: null };
    } else if (status === 'hr_interview_passed') {
      t.hr_review = { decision: 'suitable', notes: '经验匹配', reviewed_at: randomDate(12) };
      t.hr_interview = { scheduled_at: randomDate(7), interviewer: '张HR', score: randomInt(7, 9), notes: '口语流利，逻辑清晰', passed: true, interviewed_at: randomDate(5) };
    } else if (status === 'hr_interview_failed') {
      t.hr_review = { decision: 'suitable', notes: '经验匹配', reviewed_at: randomDate(14) };
      t.hr_interview = { scheduled_at: randomDate(10), interviewer: '张HR', score: randomInt(3, 5), notes: '沟通能力弱，性格不合适', passed: false, interviewed_at: randomDate(8) };
      t.is_deleted = true;
      t.deleted_reason = 'HR面试不通过';
      t.deleted_at = randomDate(5);
    } else if (status === 'business_interview_scheduled') {
      t.hr_review = { decision: 'suitable', notes: '经验匹配', reviewed_at: randomDate(15) };
      t.hr_interview = { scheduled_at: randomDate(10), interviewer: '张HR', score: 8, notes: '口语流利', passed: true, interviewed_at: randomDate(7) };
      t.business_interview = { scheduled_at: randomDate(3), interviewer: '王总', score: null, notes: '', passed: null, interviewed_at: null };
    } else if (status === 'business_interview_passed') {
      t.hr_review = { decision: 'suitable', notes: '经验匹配', reviewed_at: randomDate(20) };
      t.hr_interview = { scheduled_at: randomDate(15), interviewer: '张HR', score: 8, notes: '口语流利', passed: true, interviewed_at: randomDate(12) };
      t.business_interview = { scheduled_at: randomDate(8), interviewer: '王总', score: randomInt(7, 9), notes: '业务能力强，有客户资源', passed: true, interviewed_at: randomDate(5) };
    } else if (status === 'business_interview_failed') {
      t.hr_review = { decision: 'suitable', notes: '经验匹配', reviewed_at: randomDate(18) };
      t.hr_interview = { scheduled_at: randomDate(14), interviewer: '张HR', score: 7, notes: '尚可', passed: true, interviewed_at: randomDate(11) };
      t.business_interview = { scheduled_at: randomDate(8), interviewer: '王总', score: randomInt(3, 5), notes: '行业知识不足', passed: false, interviewed_at: randomDate(6) };
      t.is_deleted = true;
      t.deleted_reason = '业务面试不通过';
      t.deleted_at = randomDate(3);
    } else if (status === 'offer_stage') {
      t.hr_review = { decision: 'suitable', notes: '经验匹配', reviewed_at: randomDate(25) };
      t.hr_interview = { scheduled_at: randomDate(20), interviewer: '张HR', score: 8, notes: '优秀', passed: true, interviewed_at: randomDate(17) };
      t.business_interview = { scheduled_at: randomDate(12), interviewer: '王总', score: 8, notes: '综合素质高', passed: true, interviewed_at: randomDate(9) };
      t.offer_status = 'pending';
    } else if (status === 'hired') {
      t.hr_review = { decision: 'suitable', notes: '经验匹配', reviewed_at: randomDate(30) };
      t.hr_interview = { scheduled_at: randomDate(25), interviewer: '张HR', score: 9, notes: '优秀', passed: true, interviewed_at: randomDate(22) };
      t.business_interview = { scheduled_at: randomDate(17), interviewer: '王总', score: 9, notes: '综合能力突出', passed: true, interviewed_at: randomDate(14) };
      t.offer_status = 'accepted';
      t.pool_type = 'active';
      t.grid_position = {
        x: scoreToGrid(t.performance_score ?? 5),
        y: scoreToGrid(t.potential_score ?? 5),
      };
    } else if (status === 'offer_rejected') {
      t.hr_review = { decision: 'suitable', notes: '经验匹配', reviewed_at: randomDate(28) };
      t.hr_interview = { scheduled_at: randomDate(23), interviewer: '张HR', score: 8, notes: '优秀', passed: true, interviewed_at: randomDate(20) };
      t.business_interview = { scheduled_at: randomDate(15), interviewer: '王总', score: 7, notes: '尚可', passed: true, interviewed_at: randomDate(12) };
      t.offer_status = 'rejected';
    }

    talents.push(t);
  }
  return talents;
}

// 生成在岗员工（内部人才）
function genActiveEmployee(overrides: Partial<Talent> = {}): Talent {
  const t = generateTalent({
    status: 'hired',
    pool_type: 'active',
    source: 'internal',
    ...overrides,
  });
  t.hr_review = { decision: 'suitable', notes: '', reviewed_at: randomDate(365) };
  t.hr_interview = { scheduled_at: null, interviewer: '', score: null, notes: '', passed: null, interviewed_at: null };
  t.business_interview = { scheduled_at: null, interviewer: '', score: null, notes: '', passed: null, interviewed_at: null };
  t.offer_status = 'accepted';
  // 先随机出分数，再按分数映射九宫格位置
  t.performance_score = randomInt(4, 10);
  t.potential_score = randomInt(4, 10);
  t.grid_position = {
    x: scoreToGrid(t.performance_score),
    y: scoreToGrid(t.potential_score),
  };
  return t;
}

export async function seedMockData() {
  const count = await db.talents.count();
  if (count > 0) return; // already seeded

  const talents: Talent[] = [];

  // ---- 招聘管道中的候选人 ----
  talents.push(...genWithStatus('reviewing', 7));
  talents.push(...genWithStatus('suitable', 2));
  talents.push(...genWithStatus('unsuitable', 3));
  talents.push(...genWithStatus('reserve', 4));
  talents.push(...genWithStatus('hr_interview_scheduled', 2));
  talents.push(...genWithStatus('hr_interview_passed', 2));
  talents.push(...genWithStatus('hr_interview_failed', 2));
  talents.push(...genWithStatus('business_interview_scheduled', 2));
  talents.push(...genWithStatus('business_interview_passed', 2));
  talents.push(...genWithStatus('business_interview_failed', 1));
  talents.push(...genWithStatus('offer_stage', 1));
  talents.push(...genWithStatus('hired', 2));
  talents.push(...genWithStatus('offer_rejected', 1));

  // ---- 在岗员工 ----
  talents.push(genActiveEmployee({ department: '业务部', position_applied: '外贸销售', position_intended: '外贸主管', pool_type: 'active' }));
  talents.push(genActiveEmployee({ department: '业务部', position_applied: '外贸销售', position_intended: '外贸销售', pool_type: 'active' }));
  talents.push(genActiveEmployee({ department: '业务部', position_applied: '大客户经理', position_intended: '大客户经理', pool_type: 'active' }));
  talents.push(genActiveEmployee({ department: '业务部', position_applied: '跟单员', position_intended: '跟单员', pool_type: 'active' }));
  talents.push(genActiveEmployee({ department: '业务部', position_applied: '外贸主管', position_intended: '外贸经理', pool_type: 'active' }));
  talents.push(genActiveEmployee({ department: '业务部', position_applied: '单证员', position_intended: '单证员', pool_type: 'pre_eliminated' }));
  talents.push(genActiveEmployee({ department: '人力资源部', position_applied: 'HR专员', position_intended: 'HR主管', pool_type: 'active' }));
  talents.push(genActiveEmployee({ department: '人力资源部', position_applied: 'HR主管', position_intended: 'HR主管', pool_type: 'key_position' }));
  talents.push(genActiveEmployee({ department: '渠道拓展部', position_applied: '渠道经理', position_intended: '渠道总监', pool_type: 'active' }));
  talents.push(genActiveEmployee({ department: '渠道拓展部', position_applied: '跨境电商运营', position_intended: '跨境电商运营', pool_type: 'active' }));
  talents.push(genActiveEmployee({ department: '渠道拓展部', position_applied: '海外市场经理', position_intended: '海外市场经理', pool_type: 'key_position' }));
  talents.push(genActiveEmployee({ department: '项目部', position_applied: '项目专员', position_intended: '项目经理', pool_type: 'active' }));
  talents.push(genActiveEmployee({ department: '项目部', position_applied: '供应链专员', position_intended: '供应链专员', pool_type: 'active' }));
  talents.push(genActiveEmployee({ department: '项目部', position_applied: '采购经理', position_intended: '采购经理', pool_type: 'active' }));

  // 几个有代表性的
  talents.push(genActiveEmployee({
    name: '陈浩然',
    gender: '男',
    age: 35,
    education: '硕士',
    department: '业务部',
    position_applied: '外贸总监',
    position_intended: '外贸总监',
    pool_type: 'key_position',
    skills: ['英语谈判', '团队管理', '大客户维护', '供应链管理', '数据分析'],
    languages: [{ language: '英语', level: 'fluent' }],
    work_years: 13,
    trade_experience_years: 10,
    performance_score: 9,
    potential_score: 8,
    grid_position: { x: 3, y: 3 },
    highlights: '行业头部企业10年经验，年销售额破亿',
    risks: '薪资要求高，可能被竞争对手挖角',
  }));
  talents.push(genActiveEmployee({
    name: '林晓琳',
    gender: '女',
    age: 28,
    education: '本科',
    department: '渠道拓展部',
    position_applied: '跨境电商运营',
    position_intended: '渠道经理',
    pool_type: 'active',
    skills: ['跨境电商运营', '数据分析', '阿里巴巴国际站', '英语谈判'],
    languages: [{ language: '英语', level: 'business' }],
    work_years: 6,
    trade_experience_years: 4,
    performance_score: 8,
    potential_score: 9,
    grid_position: { x: 3, y: 3 },
    highlights: '从0到1搭建跨境店铺，6个月做到类目TOP10',
    risks: '',
  }));
  talents.push(genActiveEmployee({
    name: '赵明',
    gender: '男',
    age: 42,
    education: '大专',
    department: '项目部',
    position_applied: '采购经理',
    position_intended: '采购经理',
    pool_type: 'pre_eliminated',
    skills: ['供应商管理', '成本核算', '合同审核'],
    work_years: 20,
    trade_experience_years: 15,
    performance_score: 4,
    potential_score: 3,
    grid_position: { x: 2, y: 1 },
    highlights: '',
    risks: '适应不了新系统，学习意愿低，近两年绩效持续下滑',
  }));

  await db.talents.bulkPut(talents);
}
