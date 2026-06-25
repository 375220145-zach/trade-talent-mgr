// ============================================================
// 状态流转引擎 — 校验和控制 + 操作日志
// ============================================================

import type { CandidateStatus, Talent, ActivityLogEntry } from '../db/schema';
import { STATUS_TRANSITIONS, TERMINAL_STATUSES } from '../db/schema';
import { db } from '../db';

// 拒绝类状态 → 进入淘汰池
const REJECTION_STATUSES: CandidateStatus[] = [
  'unsuitable',
  'hr_interview_failed',
  'business_interview_failed',
  'offer_rejected',
];

/** 检查是否可以从 fromStatus 转到 toStatus */
export function canTransition(from: CandidateStatus, to: CandidateStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** 获取当前状态允许的下一步状态 */
export function allowedNextStatuses(current: CandidateStatus): CandidateStatus[] {
  return STATUS_TRANSITIONS[current] || [];
}

/** 检查是否是终态 */
export function isTerminal(status: CandidateStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** 是否是拒绝类状态 */
export function isRejectionStatus(status: CandidateStatus): boolean {
  return REJECTION_STATUSES.includes(status);
}

/** 追加操作日志 */
export function logActivity(talent: Talent, action: string): ActivityLogEntry[] {
  const entry: ActivityLogEntry = {
    action,
    timestamp: new Date().toISOString(),
  };
  return [...(talent.activity_log || []), entry];
}

/** 执行状态变更并处理副作用 */
export async function executeTransition(
  talent: Talent,
  toStatus: CandidateStatus,
  extra?: Partial<Talent>
): Promise<void> {
  if (!canTransition(talent.status, toStatus)) {
    throw new Error(`不允许从 "${talent.status}" 变更为 "${toStatus}"`);
  }

  const update: Partial<Talent> = {
    status: toStatus,
    updated_at: new Date().toISOString(),
  };

  // 拒绝类状态 → 进入淘汰池
  if (REJECTION_STATUSES.includes(toStatus)) {
    update.pool_type = 'eliminated';
  }

  // 处理入职 → 转内部员工，离开招聘管道
  if (toStatus === 'hired') {
    update.pool_type = 'active';
    update.source = 'internal';
  }

  // 操作日志
  const actionLabel = extra?.elimination_reason
    ? `淘汰 · ${extra.elimination_reason}`
    : `状态变更 → ${toStatus}`;
  update.activity_log = logActivity(talent, actionLabel);

  Object.assign(update, extra || {});

  await db.talents.update(talent.id!, update);
}
