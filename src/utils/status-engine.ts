// ============================================================
// 状态流转引擎 — 校验和控制
// ============================================================

import type { CandidateStatus, Talent } from '../db/schema';
import { STATUS_TRANSITIONS, DELETE_ON_FAIL_STATUSES, TERMINAL_STATUSES } from '../db/schema';
import { db } from '../db';

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

  // 处理面试失败 → 软删除
  if (DELETE_ON_FAIL_STATUSES.includes(toStatus)) {
    update.is_deleted = true;
    update.deleted_at = new Date().toISOString();
    update.deleted_reason = toStatus === 'hr_interview_failed'
      ? 'HR面试不通过'
      : '业务面试不通过';
  }

  // 处理入职
  if (toStatus === 'hired') {
    update.pool_type = 'active';
    update.source = 'internal';  // 入职后标记为内部员工
  }

  Object.assign(update, extra || {});

  await db.talents.update(talent.id!, update);
}
