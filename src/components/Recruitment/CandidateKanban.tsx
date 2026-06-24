// ============================================================
// 招聘管道 Kanban 视图 — 按状态分列
// ============================================================

import { Card, Tag, Typography } from 'antd';
import type { Talent, CandidateStatus } from '../../db/schema';
import { STATUS_COLORS } from '../../db/schema';

const KANBAN_COLUMNS: { status: CandidateStatus; title: string }[] = [
  { status: 'reviewing', title: '待审核' },
  { status: 'hr_interview_scheduled', title: 'HR面试' },
  { status: 'hr_interview_passed', title: 'HR通过' },
  { status: 'business_interview_scheduled', title: '业务面试' },
  { status: 'business_interview_passed', title: '业务通过' },
  { status: 'offer_stage', title: 'Offer' },
  { status: 'hired', title: '已入职' },
];

interface Props {
  talents: Talent[];
  onSelect: (t: Talent) => void;
}

export default function CandidateKanban({ talents, onSelect }: Props) {
  const grouped = new Map<CandidateStatus, Talent[]>();
  for (const col of KANBAN_COLUMNS) grouped.set(col.status, []);
  for (const t of talents) {
    if (!t.is_deleted && grouped.has(t.status)) {
      grouped.get(t.status)!.push(t);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, overflow: 'auto', paddingBottom: 12 }}>
      {KANBAN_COLUMNS.map(col => {
        const items = grouped.get(col.status) || [];
        return (
          <div key={col.status} className="kanban-column" style={{ flex: 1 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 12, fontWeight: 600, fontSize: 14,
            }}>
              <span>{col.title}</span>
              <Tag color={STATUS_COLORS[col.status]}>{items.length}</Tag>
            </div>
            {items.map(t => (
              <Card
                key={t.id}
                className="kanban-card"
                size="small"
                hoverable
                onClick={() => onSelect(t)}
                style={{ cursor: 'pointer' }}
              >
                <Typography.Text strong style={{ fontSize: 13 }}>{t.name}</Typography.Text>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  {t.position_applied} · {t.trade_experience_years}年外贸
                </div>
                {t.skills?.slice(0, 3).map(s => (
                  <Tag key={s} color="green" style={{ fontSize: 11, marginTop: 4 }}>{s}</Tag>
                ))}
              </Card>
            ))}
            {items.length === 0 && (
              <div style={{ textAlign: 'center', color: '#ccc', padding: 24, fontSize: 13 }}>暂无</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
