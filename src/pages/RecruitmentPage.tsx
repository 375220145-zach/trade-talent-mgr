// ============================================================
// 招聘管道页面 — 表格/Kanban 双视图 + 搜索 + 录入
// ============================================================

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Table, Button, Space, Input, Select, Tag, Typography, Segmented,
  Switch,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, ClearOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Talent, CandidateStatus } from '../db/schema';
import { STATUS_LABELS, STATUS_COLORS, RESERVE_LEVEL_LABELS } from '../db/schema';
import { db } from '../db';
import { seedMockData } from '../db/mock-data';
import CandidateForm from '../components/Recruitment/CandidateForm';
import CandidateDetail from '../components/Recruitment/CandidateDetail';
import CandidateKanban from '../components/Recruitment/CandidateKanban';

export default function RecruitmentPage() {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | 'all'>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTalent, setEditTalent] = useState<Talent | null>(null);
  const [detailTalent, setDetailTalent] = useState<Talent | null>(null);

  const talents = useLiveQuery(() => db.talents.toArray(), []) || [];

  // 自动 seed mock data
  useState(() => { seedMockData(); });

  const filtered = useMemo(() => {
    let list = talents;
    if (!showDeleted) list = list.filter(t => !t.is_deleted);
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    if (searchText) {
      const kw = searchText.toLowerCase();
      list = list.filter(t =>
        t.name.includes(kw) ||
        t.position_applied?.includes(kw) ||
        t.skills?.some(s => s.includes(kw)) ||
        t.phone?.includes(kw) ||
        t.email?.includes(kw)
      );
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [talents, searchText, statusFilter, showDeleted]);

  const columns: ColumnsType<Talent> = [
    {
      title: '姓名', dataIndex: 'name', width: 100,
      render: (name: string, r) => (
        <a onClick={() => setDetailTalent(r)}>{name}</a>
      ),
    },
    { title: '应聘岗位', dataIndex: 'position_applied', width: 130 },
    {
      title: '状态', dataIndex: 'status', width: 110,
      render: (s: CandidateStatus) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: '储备等级', dataIndex: 'reserve_level', width: 100,
      render: (l: string | null) => l ? <Tag color="gold">{RESERVE_LEVEL_LABELS[l]}</Tag> : '-',
    },
    { title: '外贸经验', dataIndex: 'trade_experience_years', width: 80, render: (v: number) => `${v}年` },
    { title: '部门', dataIndex: 'department', width: 100 },
    {
      title: '技能', dataIndex: 'skills', width: 250,
      render: (skills: string[]) => skills?.slice(0, 4).map((s: string) => (
        <Tag key={s} color="green" style={{ fontSize: 12 }}>{s}</Tag>
      )),
    },
    { title: '所在地', dataIndex: 'current_location', width: 80 },
    {
      title: '录入时间', dataIndex: 'created_at', width: 100,
      render: (v: string) => v?.slice(0, 10),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>招聘管道</Typography.Title>

      {/* 操作栏 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap', gap: 8,
      }}>
        <Space wrap>
          <Input
            placeholder="搜索姓名/岗位/技能..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            options={[
              { label: '全部状态', value: 'all' },
              ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ label: v, value: k })),
            ]}
          />
          <span>
            <Switch checked={showDeleted} onChange={setShowDeleted} size="small" />
            <span style={{ marginLeft: 4, fontSize: 13, color: '#888' }}>含已删除</span>
          </span>
          {searchText || statusFilter !== 'all' ? (
            <Button icon={<ClearOutlined />} size="small" onClick={() => { setSearchText(''); setStatusFilter('all'); }}>
              清除筛选
            </Button>
          ) : null}
        </Space>
        <Space>
          <Segmented
            options={[
              { label: '表格', value: 'table' },
              { label: '看板', value: 'kanban' },
            ]}
            value={viewMode}
            onChange={v => setViewMode(v as 'table' | 'kanban')}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditTalent(null); setFormOpen(true); }}>
            录入候选人
          </Button>
        </Space>
      </div>

      {/* 内容区 */}
      {viewMode === 'table' ? (
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 人` }}
          onRow={(record) => ({
            onClick: () => setDetailTalent(record),
            style: { cursor: 'pointer' },
          })}
          scroll={{ x: 1000 }}
        />
      ) : (
        <CandidateKanban talents={filtered} onSelect={setDetailTalent} />
      )}

      {/* 录入/编辑弹窗 */}
      <CandidateForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        talent={editTalent}
      />

      {/* 详情抽屉 */}
      <CandidateDetail
        talent={detailTalent}
        open={!!detailTalent}
        onClose={() => setDetailTalent(null)}
      />
    </div>
  );
}
