// ============================================================
// 招聘管道页面 — 表格/Kanban 双视图 + 搜索 + 录入
// ============================================================

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Table, Button, Space, Input, Select, Tag, Typography, Segmented,
  Switch, Popconfirm, message,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, ClearOutlined, DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Talent, CandidateStatus } from '../db/schema';
import { STATUS_LABELS, STATUS_COLORS, RESERVE_LEVEL_LABELS } from '../db/schema';
import { db } from '../db';
import { seedMockData } from '../db/mock-data';
import { exportTalentCSV } from '../utils/export-csv';
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const talents = useLiveQuery(() => db.talents.toArray(), []) || [];

  // 批量操作
  async function batchSuitable() {
    const now = new Date().toISOString();
    let count = 0;
    for (const id of selectedRowKeys) {
      const t = talents.find(t2 => t2.id === Number(id));
      if (t && t.status === 'reviewing') {
        await db.talents.update(Number(id), {
          status: 'suitable',
          hr_review: { decision: 'suitable', notes: '批量标记', reviewed_at: now },
          updated_at: now,
        });
        count++;
      }
    }
    message.success(`已标记 ${count} 人为合适`);
    setSelectedRowKeys([]);
  }

  async function batchEliminate() {
    const now = new Date().toISOString();
    let count = 0;
    for (const id of selectedRowKeys) {
      await db.talents.update(Number(id), {
        status: 'unsuitable',
        pool_type: 'eliminated',
        elimination_reason: '批量淘汰',
        updated_at: now,
      });
      count++;
    }
    message.success(`已淘汰 ${count} 人`);
    setSelectedRowKeys([]);
  }

  const hasSelected = selectedRowKeys.length > 0;
  useState(() => { seedMockData(); });

  const filtered = useMemo(() => {
    let list = talents;
    // 招聘管道：只显示外部候选人，排除已入职和已淘汰
    if (!showDeleted) list = list.filter(t => !t.is_deleted);
    list = list.filter(t => t.source !== 'internal' && t.pool_type !== 'eliminated');
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
              { label: '待审核', value: 'reviewing' },
              { label: 'HR面试已安排', value: 'hr_interview_scheduled' },
              { label: 'HR面试通过', value: 'hr_interview_passed' },
              { label: '业务面试已安排', value: 'business_interview_scheduled' },
              { label: '业务面试通过', value: 'business_interview_passed' },
              { label: 'Offer阶段', value: 'offer_stage' },
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
          <Button icon={<DownloadOutlined />} onClick={() => exportTalentCSV(filtered, '招聘管道.csv')}>
            导出
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditTalent(null); setFormOpen(true); }}>
            录入候选人
          </Button>
        </Space>
      </div>

      {/* 批量操作栏 */}
      {hasSelected && viewMode === 'table' && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#e6f7ff', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>已选 <strong>{selectedRowKeys.length}</strong> 人</span>
          <Popconfirm title="标记选中候选人为合适？" onConfirm={batchSuitable}>
            <Button size="small" type="primary" ghost>批量标记合适</Button>
          </Popconfirm>
          <Popconfirm title="淘汰所有选中候选人？" onConfirm={batchEliminate}>
            <Button size="small" danger ghost>批量淘汰</Button>
          </Popconfirm>
          <Button size="small" onClick={() => setSelectedRowKeys([])}>取消选择</Button>
        </div>
      )}

      {/* 内容区 */}
      {viewMode === 'table' ? (
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
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
