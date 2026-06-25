// ============================================================
// CSV 导出工具
// ============================================================

import type { Talent } from '../db/schema';
import { STATUS_LABELS, POOL_TYPE_LABELS } from '../db/schema';

/** 将人才数组导出为 CSV 并触发下载 */
export function exportTalentCSV(talents: Talent[], filename: string) {
  const headers = [
    '姓名', '性别', '年龄', '学历', '所在地', '手机', '邮箱',
    '应聘/现任岗位', '意向岗位', '部门', '外贸经验(年)', '工龄(年)',
    '状态', '库类型', '储备等级',
    '绩效评分', '潜力评分', '九宫格',
    '技能', '亮点', '风险', '淘汰原因',
    '录入时间', '更新时间',
  ];

  const rows = talents.map(t => [
    t.name,
    t.gender,
    t.age,
    t.education,
    t.current_location,
    t.phone,
    t.email,
    t.position_applied,
    t.position_intended,
    t.department,
    t.trade_experience_years,
    t.work_years,
    STATUS_LABELS[t.status] || t.status,
    POOL_TYPE_LABELS[t.pool_type] || t.pool_type,
    t.reserve_level || '',
    t.performance_score ?? '',
    t.potential_score ?? '',
    t.grid_position ? `${t.grid_position.x},${t.grid_position.y}` : '',
    t.skills?.join('; ') || '',
    t.highlights || '',
    t.risks || '',
    t.elimination_reason || '',
    t.created_at?.slice(0, 10) || '',
    t.updated_at?.slice(0, 10) || '',
  ]);

  const BOM = '﻿';
  const csvContent = BOM + [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
