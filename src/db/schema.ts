// ============================================================
// 人才管理系统 — 数据模型定义
// ============================================================

// ---- 枚举 ----

export type PoolType = 'active' | 'reserve' | 'eliminated' | 'pre_eliminated' | 'key_position';
export type ReserveLevel = 'A' | 'B' | 'C' | null;
export type CandidateStatus =
  | 'reviewing'
  | 'suitable'
  | 'unsuitable'
  | 'reserve'
  | 'hr_interview_scheduled'
  | 'hr_interview_passed'
  | 'hr_interview_failed'
  | 'business_interview_scheduled'
  | 'business_interview_passed'
  | 'business_interview_failed'
  | 'offer_stage'
  | 'hired'
  | 'offer_rejected';
export type Department = '业务部' | '人力资源部' | '渠道拓展部' | '项目部';
export type Education = '高中' | '大专' | '本科' | '硕士' | '博士';
export type Gender = '男' | '女';
export type GridPosition = { x: 1 | 2 | 3; y: 1 | 2 | 3 } | null;

// ---- 面试记录 ----

export interface InterviewRecord {
  scheduled_at: string | null;
  interviewer: string;
  score: number | null;        // 1-10
  notes: string;
  passed: boolean | null;
  interviewed_at: string | null;
}

// ---- 候选人/人才 ----

export interface Talent {
  id?: number;                  // Dexie auto-increment
  // 基本信息
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  age: number;
  education: Education;
  current_location: string;
  work_years: number;           // 社会工龄

  // 专业信息
  skills: string[];             // ["英语谈判", "LC单证", "HS编码"]
  languages: { language: string; level: 'fluent' | 'business' | 'basic' }[];
  trade_experience_years: number;
  trade_categories: string[];   // ["纺织", "电子", "机械"]
  target_markets: string[];     // ["东南亚", "中东", "欧盟"]

  // 岗位信息
  position_applied: string;     // 应聘/现任岗位
  position_intended: string;    // 意向岗位
  department: Department;

  // 来源
  source: 'hr_upload' | 'public_link' | 'internal';
  resume_file_name: string | null;   // 原始简历文件名（Demo用）
  resume_text: string | null;        // 提取的简历文本

  // ---- 招聘管道状态 ----
  status: CandidateStatus;

  // ---- 内部人才库 ----
  pool_type: PoolType;          // 在岗/储备/淘汰/预淘汰/关键岗
  reserve_level: ReserveLevel;  // A/B/C 储备等级

  // ---- 面试 ----
  hr_review: {
    decision: 'suitable' | 'unsuitable' | 'reserve' | null;
    notes: string;
    reviewed_at: string | null;
  };
  hr_interview: InterviewRecord;
  business_interview: InterviewRecord;

  // ---- Offer ----
  offer_status: 'pending' | 'sent' | 'accepted' | 'rejected' | null;

  // ---- 九宫格 ----
  grid_position: GridPosition;  // {x: 1-3, y: 1-3}

  // ---- 评价 ----
  performance_score: number | null;  // 绩效评分 1-10
  potential_score: number | null;    // 潜力评分 1-10
  highlights: string;                // 亮点
  risks: string;                     // 风险
  general_notes: string;             // 综合备注

  // ---- 淘汰追踪 ----
  is_deleted: boolean;
  deleted_reason: string | null;
  deleted_at: string | null;

  // ---- 时间戳 ----
  created_at: string;
  updated_at: string;
}

// ---- 九宫格标签映射 ----

export const GRID_LABELS: Record<string, string> = {
  '1,1': '淘汰对象',
  '1,2': '一般人员',
  '1,3': '熟练工',
  '2,1': '待改进者',
  '2,2': '中坚人员',
  '2,3': '绩效之星',
  '3,1': '待提升者',
  '3,2': '潜力之星',
  '3,3': '明星',
};

// ---- 状态流转规则 ----

export const STATUS_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  'reviewing':                  ['suitable', 'unsuitable', 'reserve'],
  'suitable':                   ['hr_interview_scheduled'],
  'unsuitable':                 [],   // 终态
  'reserve':                    ['suitable'],   // 可重新激活
  'hr_interview_scheduled':     ['hr_interview_passed', 'hr_interview_failed'],
  'hr_interview_passed':        ['business_interview_scheduled'],
  'hr_interview_failed':        [],   // 终态（软删除）
  'business_interview_scheduled': ['business_interview_passed', 'business_interview_failed'],
  'business_interview_passed':  ['offer_stage'],
  'business_interview_failed':  [],   // 终态（软删除）
  'offer_stage':                ['hired', 'offer_rejected'],
  'hired':                      [],   // 终态
  'offer_rejected':             [],   // 终态
};

export const TERMINAL_STATUSES: CandidateStatus[] = [
  'unsuitable', 'hr_interview_failed', 'business_interview_failed',
  'hired', 'offer_rejected',
];

export const DELETE_ON_FAIL_STATUSES: CandidateStatus[] = [
  'hr_interview_failed', 'business_interview_failed',
];

// ---- 状态中文标签 ----

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  'reviewing': '待审核',
  'suitable': '合适',
  'unsuitable': '不合适',
  'reserve': '已入库',
  'hr_interview_scheduled': 'HR面试已安排',
  'hr_interview_passed': 'HR面试通过',
  'hr_interview_failed': 'HR面试未通过',
  'business_interview_scheduled': '业务面试已安排',
  'business_interview_passed': '业务面试通过',
  'business_interview_failed': '业务面试未通过',
  'offer_stage': 'Offer阶段',
  'hired': '已入职',
  'offer_rejected': 'Offer被拒',
};

export const POOL_TYPE_LABELS: Record<PoolType, string> = {
  'active': '在岗',
  'reserve': '储备',
  'eliminated': '淘汰',
  'pre_eliminated': '预淘汰',
  'key_position': '关键岗',
};

export const RESERVE_LEVEL_LABELS: Record<string, string> = {
  'A': 'A库·随时',
  'B': 'B库·近期',
  'C': 'C库·远期',
};

export const STATUS_COLORS: Record<CandidateStatus, string> = {
  'reviewing': '#1890ff',
  'suitable': '#52c41a',
  'unsuitable': '#ff4d4f',
  'reserve': '#faad14',
  'hr_interview_scheduled': '#1677ff',
  'hr_interview_passed': '#52c41a',
  'hr_interview_failed': '#ff4d4f',
  'business_interview_scheduled': '#1677ff',
  'business_interview_passed': '#52c41a',
  'business_interview_failed': '#ff4d4f',
  'offer_stage': '#722ed1',
  'hired': '#52c41a',
  'offer_rejected': '#faad14',
};
