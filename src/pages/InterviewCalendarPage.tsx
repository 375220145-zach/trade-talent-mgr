// ============================================================
// 面试日历页面 — 已安排面试列表 + 筛选 + 详情
// ============================================================

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Table, Tag, Typography, Space, Button, Select, Modal,
  Descriptions, Switch,
} from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Talent, CandidateStatus } from '../db/schema';
import { STATUS_LABELS, STATUS_COLORS } from '../db/schema';
import { db } from '../db';
import { seedMockData } from '../db/mock-data';

// ---- 面试类型 ----

type InterviewType = 'hr' | 'business';

function getInterviewType(t: Talent): InterviewType | null {
  if (t.status === 'hr_interview_scheduled') return 'hr';
  if (t.status === 'business_interview_scheduled') return 'business';
  return null;
}

function getInterviewScheduledAt(t: Talent): string | null {
  const type = getInterviewType(t);
  if (type === 'hr') return t.hr_interview?.scheduled_at ?? null;
  if (type === 'business') return t.business_interview?.scheduled_at ?? null;
  return null;
}

function getInterviewer(t: Talent): string {
  const type = getInterviewType(t);
  if (type === 'hr') return t.hr_interview?.interviewer || '-';
  if (type === 'business') return t.business_interview?.interviewer || '-';
  return '-';
}

function getInterviewTypeLabel(t: Talent): string {
  const type = getInterviewType(t);
  if (type === 'hr') return 'HR面试';
  if (type === 'business') return '业务面试';
  return '-';
}

// ---- 页面组件 ----

export default function InterviewCalendarPage() {
  const [typeFilter, setTypeFilter] = useState<InterviewType | 'all'>('all');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [detailTalent, setDetailTalent] = useState<Talent | null>(null);

  const talents = useLiveQuery(() => db.talents.toArray(), []) || [];

  // 自动 seed mock data
  useState(() => { seedMockData(); });

  const filtered = useMemo(() => {
    const interviewStatuses: CandidateStatus[] = [
      'hr_interview_scheduled',
      'business_interview_scheduled',
    ];
    let list = talents.filter(t =>
      !t.is_deleted &&
      interviewStatuses.includes(t.status)
    );

    // 面试类型筛选
    if (typeFilter !== 'all') {
      list = list.filter(t => getInterviewType(t) === typeFilter);
    }

    // 仅看即将进行（scheduled_at 在未来）
    if (upcomingOnly) {
      const now = new Date().toISOString();
      list = list.filter(t => {
        const at = getInterviewScheduledAt(t);
        return at && at > now;
      });
    }

    // 按面试日期降序（最近的在前）
    return list.sort((a, b) => {
      const da = getInterviewScheduledAt(a) || '';
      const db2 = getInterviewScheduledAt(b) || '';
      return da.localeCompare(db2);
    });
  }, [talents, typeFilter, upcomingOnly]);

  const columns: ColumnsType<Talent> = [
    {
      title: '姓名', dataIndex: 'name', width: 100,
      render: (name: string, r) => (
        <a onClick={() => setDetailTalent(r)}>{name}</a>
      ),
    },
    { title: '应聘岗位', dataIndex: 'position_applied', width: 140 },
    {
      title: '面试类型', width: 100,
      render: (_: any, r: Talent) => {
        const type = getInterviewType(r);
        if (!type) return <span>-</span>;
        return (
          <Tag color={type === 'hr' ? 'blue' : 'green'}>
            {getInterviewTypeLabel(r)}
          </Tag>
        );
      },
    },
    {
      title: '面试官', width: 100,
      render: (_: any, r: Talent) => <span>{getInterviewer(r)}</span>,
    },
    {
      title: '面试日期', width: 120,
      render: (_: any, r: Talent) => {
        const at = getInterviewScheduledAt(r);
        return at ? at.slice(0, 10) : <span style={{ color: '#999' }}>未设置</span>;
      },
    },
    {
      title: '当前状态', dataIndex: 'status', width: 120,
      render: (s: CandidateStatus) => (
        <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>
      ),
    },
  ];

  // 空状态
  const emptyContent = (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
      <CalendarOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
      <div style={{ fontSize: 16, marginBottom: 8 }}>暂无已安排的面试</div>
      <div style={{ fontSize: 13 }}>在招聘管道中将候选人状态推进到"HR面试已安排"或"业务面试已安排"后，这里会出现面试日程</div>
    </div>
  );

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>面试日历</Typography.Title>

      {/* 筛选栏 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap', gap: 8,
      }}>
        <Space wrap>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 140 }}
            options={[
              { label: '全部类型', value: 'all' },
              { label: 'HR面试', value: 'hr' },
              { label: '业务面试', value: 'business' },
            ]}
          />
          <span>
            <Switch checked={upcomingOnly} onChange={setUpcomingOnly} size="small" />
            <span style={{ marginLeft: 4, fontSize: 13, color: '#888' }}>仅看即将进行</span>
          </span>
        </Space>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          共 {filtered.length} 场面试
        </Typography.Text>
      </div>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 场` }}
        locale={{ emptyText: emptyContent }}
        onRow={(r) => ({
          onClick: () => setDetailTalent(r),
          style: { cursor: 'pointer' },
        })}
        scroll={{ x: 800 }}
      />

      {/* 面试详情 Modal */}
      <Modal
        title={`${detailTalent?.name || ''} — 面试详情`}
        open={!!detailTalent}
        onCancel={() => setDetailTalent(null)}
        footer={<Button onClick={() => setDetailTalent(null)}>关闭</Button>}
        width={560}
      >
        {detailTalent && (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="姓名">{detailTalent.name}</Descriptions.Item>
            <Descriptions.Item label="性别">{detailTalent.gender} · {detailTalent.age}岁</Descriptions.Item>
            <Descriptions.Item label="应聘岗位">{detailTalent.position_applied}</Descriptions.Item>
            <Descriptions.Item label="部门">{detailTalent.department}</Descriptions.Item>
            <Descriptions.Item label="面试类型">
              <Tag color={getInterviewType(detailTalent) === 'hr' ? 'blue' : 'green'}>
                {getInterviewTypeLabel(detailTalent)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="面试官">{getInterviewer(detailTalent)}</Descriptions.Item>
            <Descriptions.Item label="面试日期" span={2}>
              {getInterviewScheduledAt(detailTalent)?.slice(0, 10) || '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="当前状态" span={2}>
              <Tag color={STATUS_COLORS[detailTalent.status]}>
                {STATUS_LABELS[detailTalent.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="联系电话" span={2}>{detailTalent.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="邮箱" span={2}>{detailTalent.email || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
