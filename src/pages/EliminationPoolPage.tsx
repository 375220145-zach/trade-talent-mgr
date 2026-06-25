// ============================================================
// 淘汰池页面 — 统一管理招聘管道+人才库所有淘汰人选
// ============================================================

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Table, Tag, Select, Input, Space, Typography, Button, Modal,
  Descriptions, message,
} from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Talent, CandidateStatus } from '../db/schema';
import { STATUS_LABELS } from '../db/schema';
import { db } from '../db';
import { seedMockData } from '../db/mock-data';
import { exportTalentCSV } from '../utils/export-csv';

// 淘汰来源
type EliminationSource = 'recruitment' | 'talent_pool';

function getEliminationSource(t: Talent): EliminationSource {
  return t.source === 'internal' ? 'talent_pool' : 'recruitment';
}

function getEliminationStage(t: Talent): string {
  // 人才库淘汰
  if (t.source === 'internal') return '人才库淘汰';
  // 招聘管道各阶段
  const stageMap: Partial<Record<CandidateStatus, string>> = {
    'unsuitable': '简历筛选淘汰',
    'hr_interview_failed': 'HR面试淘汰',
    'business_interview_failed': '业务面试淘汰',
    'offer_rejected': 'Offer被拒',
  };
  return stageMap[t.status] || t.status;
}

export default function EliminationPoolPage() {
  const [searchText, setSearchText] = useState('');
  const [sourceFilter, setSourceFilter] = useState<EliminationSource | 'all'>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [detailTalent, setDetailTalent] = useState<Talent | null>(null);

  const talents = useLiveQuery(() => db.talents.toArray(), []) || [];
  useState(() => { seedMockData(); });

  // 收集所有已有的淘汰原因用于筛选
  const allReasons = useMemo(() => {
    const reasons = new Set<string>();
    talents.filter(t => t.pool_type === 'eliminated' && t.elimination_reason)
      .forEach(t => reasons.add(t.elimination_reason!));
    return Array.from(reasons);
  }, [talents]);

  const filtered = useMemo(() => {
    let list = talents.filter(t => t.pool_type === 'eliminated');
    if (sourceFilter !== 'all') {
      list = list.filter(t => getEliminationSource(t) === sourceFilter);
    }
    if (reasonFilter !== 'all') {
      list = list.filter(t => t.elimination_reason === reasonFilter);
    }
    if (searchText) {
      const kw = searchText.toLowerCase();
      list = list.filter(t =>
        t.name.includes(kw) ||
        t.position_applied?.includes(kw) ||
        t.elimination_reason?.includes(kw)
      );
    }
    return list.sort((a, b) => {
      const da = a.elimination_reason ? new Date(b.updated_at).getTime() : 0;
      const db2 = b.elimination_reason ? new Date(b.updated_at).getTime() : 0;
      return db2 - da;
    });
  }, [talents, searchText, sourceFilter, reasonFilter]);

  // 重新激活人选（回到招聘管道）
  async function handleReactivate(t: Talent) {
    await db.talents.update(t.id!, {
      status: 'reviewing',
      pool_type: 'active',
      elimination_reason: null,
      source: 'hr_upload',
      updated_at: new Date().toISOString(),
      hr_review: { decision: null, notes: '', reviewed_at: null },
      hr_interview: { scheduled_at: null, interviewer: '', score: null, notes: '', feedback: '', passed: null, interviewed_at: null },
      business_interview: { scheduled_at: null, interviewer: '', score: null, notes: '', feedback: '', passed: null, interviewed_at: null },
      offer_status: null,
    });
    message.success(`${t.name} 已重新激活，回到招聘管道`);
    setDetailTalent(null);
  }

  const columns: ColumnsType<Talent> = [
    {
      title: '姓名', dataIndex: 'name', width: 100,
      render: (n: string, r) => <a onClick={() => setDetailTalent(r)}>{n}</a>,
    },
    {
      title: '来源', width: 100,
      render: (_: any, r: Talent) => {
        const src = getEliminationSource(r);
        return <Tag color={src === 'recruitment' ? 'blue' : 'purple'}>
          {src === 'recruitment' ? '招聘管道' : '人才库'}
        </Tag>;
      },
    },
    {
      title: '淘汰阶段', width: 130,
      render: (_: any, r: Talent) => <span>{getEliminationStage(r)}</span>,
    },
    { title: '应聘/现任岗位', dataIndex: 'position_applied', width: 130 },
    {
      title: '淘汰原因', dataIndex: 'elimination_reason', width: 200,
      render: (v: string | null) => v ? (
        <span style={{ color: '#ff4d4f' }}>{v}</span>
      ) : <span style={{ color: '#999' }}>未记录</span>,
    },
    { title: '外贸经验', dataIndex: 'trade_experience_years', width: 80, render: (v: number) => `${v}年` },
    {
      title: '淘汰时间', dataIndex: 'updated_at', width: 110,
      render: (v: string) => v?.slice(0, 10),
    },
    {
      title: '操作', width: 100,
      render: (_: any, r: Talent) => (
        <Button
          size="small"
          type="primary"
          ghost
          onClick={(e) => { e.stopPropagation(); handleReactivate(r); }}
        >
          重新激活
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>淘汰池</Typography.Title>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Input
            placeholder="搜索姓名/岗位/原因..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            value={sourceFilter}
            onChange={setSourceFilter}
            style={{ width: 120 }}
            options={[
              { label: '全部来源', value: 'all' },
              { label: '招聘管道', value: 'recruitment' },
              { label: '人才库', value: 'talent_pool' },
            ]}
          />
          <Select
            value={reasonFilter}
            onChange={setReasonFilter}
            style={{ width: 150 }}
            options={[
              { label: '全部原因', value: 'all' },
              ...allReasons.map(r => ({ label: r, value: r })),
            ]}
          />
        </Space>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => exportTalentCSV(filtered, '淘汰池.csv')}>导出</Button>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            共 {filtered.length} 条淘汰记录
          </Typography.Text>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 条` }}
        onRow={(r) => ({ onClick: () => setDetailTalent(r), style: { cursor: 'pointer' } })}
        scroll={{ x: 1000 }}
      />

      {/* 淘汰人选详情 */}
      <Modal
        title={`${detailTalent?.name || ''} — 淘汰详情`}
        open={!!detailTalent}
        onCancel={() => setDetailTalent(null)}
        footer={
          detailTalent ? (
            <Space>
              <Button onClick={() => setDetailTalent(null)}>关闭</Button>
              <Button
                type="primary"
                onClick={() => handleReactivate(detailTalent)}
              >
                重新激活到招聘管道
              </Button>
            </Space>
          ) : null
        }
        width={560}
      >
        {detailTalent && (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="姓名">{detailTalent.name}</Descriptions.Item>
            <Descriptions.Item label="性别">{detailTalent.gender} · {detailTalent.age}岁</Descriptions.Item>
            <Descriptions.Item label="来源">
              <Tag color={getEliminationSource(detailTalent) === 'recruitment' ? 'blue' : 'purple'}>
                {getEliminationSource(detailTalent) === 'recruitment' ? '招聘管道' : '人才库'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="淘汰阶段">{getEliminationStage(detailTalent)}</Descriptions.Item>
            <Descriptions.Item label="应聘/现任岗位">{detailTalent.position_applied}</Descriptions.Item>
            <Descriptions.Item label="部门">{detailTalent.department}</Descriptions.Item>
            <Descriptions.Item label="外贸经验">{detailTalent.trade_experience_years}年</Descriptions.Item>
            <Descriptions.Item label="学历">{detailTalent.education}</Descriptions.Item>
            <Descriptions.Item label="淘汰原因" span={2}>
              <span style={{ color: '#ff4d4f', fontWeight: 500 }}>
                {detailTalent.elimination_reason || '未记录'}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="最后状态" span={2}>
              <Tag>{STATUS_LABELS[detailTalent.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="淘汰时间" span={2}>
              {detailTalent.updated_at?.slice(0, 10)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
