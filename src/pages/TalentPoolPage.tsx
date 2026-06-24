// ============================================================
// 人才库页面 — 内部人才分类管理 + 储备池分级
// ============================================================

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Table, Tag, Select, Input, Space, Typography, Button, Modal,
  Descriptions, message,
} from 'antd';
import { SearchOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Talent, PoolType, ReserveLevel } from '../db/schema';
import { POOL_TYPE_LABELS, RESERVE_LEVEL_LABELS, GRID_LABELS } from '../db/schema';
import { db } from '../db';
import { seedMockData } from '../db/mock-data';

export default function TalentPoolPage() {
  const [searchText, setSearchText] = useState('');
  const [poolFilter, setPoolFilter] = useState<PoolType | 'all'>('all');
  const [reserveFilter, setReserveFilter] = useState<ReserveLevel | 'all'>('all');
  const [detailTalent, setDetailTalent] = useState<Talent | null>(null);
  const [editingLevel, setEditingLevel] = useState(false);
  const [levelValue, setLevelValue] = useState<ReserveLevel>(null);

  async function handleSaveLevel() {
    if (!detailTalent?.id) return;
    await db.talents.update(detailTalent.id, {
      reserve_level: levelValue,
      updated_at: new Date().toISOString(),
    });
    message.success(`储备等级已更新为: ${levelValue ? RESERVE_LEVEL_LABELS[levelValue] : '无'}`);
    setEditingLevel(false);
    // refresh detail
    const updated = await db.talents.get(detailTalent.id);
    if (updated) setDetailTalent(updated);
  }

  const talents = useLiveQuery(() => db.talents.toArray(), []) || [];
  useState(() => { seedMockData(); });

  const filtered = useMemo(() => {
    // 人才库只显示内部员工（排除储备池候选人，他们在招聘管道）
    let list = talents.filter(t =>
      !t.is_deleted &&
      t.pool_type !== 'reserve'
    );
    if (poolFilter !== 'all') {
      if (poolFilter === 'active') {
        // "在岗"包含 active + key_position + pre_eliminated
        list = list.filter(t =>
          t.pool_type === 'active' || t.pool_type === 'key_position' || t.pool_type === 'pre_eliminated'
        );
      } else {
        list = list.filter(t => t.pool_type === poolFilter);
      }
    }
    if (reserveFilter !== 'all') list = list.filter(t => t.reserve_level === reserveFilter);
    if (searchText) {
      const kw = searchText.toLowerCase();
      list = list.filter(t =>
        t.name.includes(kw) ||
        t.position_applied?.includes(kw) ||
        t.position_intended?.includes(kw) ||
        t.skills?.some(s => s.includes(kw))
      );
    }
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [talents, searchText, poolFilter, reserveFilter]);

  const columns: ColumnsType<Talent> = [
    {
      title: '姓名', dataIndex: 'name', width: 90,
      render: (n: string, r) => <a onClick={() => setDetailTalent(r)}>{n}</a>,
    },
    {
      title: '库类型', dataIndex: 'pool_type', width: 90,
      render: (t: PoolType) => {
        const colors: Record<PoolType, string> = { active: 'green', reserve: 'gold', eliminated: 'red', pre_eliminated: 'orange', key_position: 'purple' };
        return <Tag color={colors[t]}>{POOL_TYPE_LABELS[t]}</Tag>;
      },
    },
    {
      title: '储备等级', dataIndex: 'reserve_level', width: 100,
      render: (l: ReserveLevel) => l ? <Tag color="gold">{RESERVE_LEVEL_LABELS[l]}</Tag> : '-',
    },
    { title: '现任/应聘岗位', dataIndex: 'position_applied', width: 130 },
    { title: '意向岗位', dataIndex: 'position_intended', width: 120 },
    { title: '部门', dataIndex: 'department', width: 90 },
    {
      title: '核心技能', dataIndex: 'skills', width: 240,
      render: (s: string[]) => s?.slice(0, 4).map((sk: string) => <Tag key={sk} color="green">{sk}</Tag>),
    },
    {
      title: '绩效', dataIndex: 'performance_score', width: 70,
      render: (v: number | null) => v ? `${v}/10` : '-',
    },
    {
      title: '潜力', dataIndex: 'potential_score', width: 70,
      render: (v: number | null) => v ? `${v}/10` : '-',
    },
    {
      title: '九宫格', dataIndex: 'grid_position', width: 90,
      render: (g: { x: number; y: number } | null) => g
        ? <Tag>{GRID_LABELS[`${g.x},${g.y}`] || `${g.x},${g.y}`}</Tag>
        : '-',
    },
    {
      title: '备注', width: 180,
      render: (_: any, r: Talent) => (
        <div style={{ fontSize: 12 }}>
          {r.highlights && <div>🌟 {r.highlights.slice(0, 30)}</div>}
          {r.risks && <div style={{ color: '#ff4d4f' }}>⚠️ {r.risks.slice(0, 30)}</div>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>人才库</Typography.Title>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
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
            value={poolFilter}
            onChange={setPoolFilter}
            style={{ width: 120 }}
            options={[
              { label: '全部', value: 'all' },
              { label: '在岗', value: 'active' },
              { label: '关键岗', value: 'key_position' },
              { label: '预淘汰', value: 'pre_eliminated' },
              { label: '淘汰', value: 'eliminated' },
            ]}
          />
          <Select
            value={reserveFilter}
            onChange={setReserveFilter}
            style={{ width: 130 }}
            options={[
              { label: '全部等级', value: 'all' },
              { label: 'A库·随时', value: 'A' },
              { label: 'B库·近期', value: 'B' },
              { label: 'C库·远期', value: 'C' },
            ]}
          />
        </Space>
        <Button icon={<EditOutlined />} onClick={() => message.info('批量管理功能开发中')}>批量管理</Button>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 人` }}
        onRow={(r) => ({ onClick: () => setDetailTalent(r), style: { cursor: 'pointer' } })}
        scroll={{ x: 1200 }}
      />

      {/* 人才详情 */}
      <Modal
        title={`${detailTalent?.name || ''} — 人才详情`}
        open={!!detailTalent}
        onCancel={() => setDetailTalent(null)}
        footer={null}
        width={600}
      >
        {detailTalent && (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="姓名">{detailTalent.name}</Descriptions.Item>
            <Descriptions.Item label="性别">{detailTalent.gender} · {detailTalent.age}岁</Descriptions.Item>
            <Descriptions.Item label="学历">{detailTalent.education}</Descriptions.Item>
            <Descriptions.Item label="工龄">{detailTalent.work_years}年（外贸{detailTalent.trade_experience_years}年）</Descriptions.Item>
            <Descriptions.Item label="库类型">
              <Tag color={detailTalent.pool_type === 'active' ? 'green' : detailTalent.pool_type === 'key_position' ? 'purple' : 'gold'}>
                {POOL_TYPE_LABELS[detailTalent.pool_type]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="来源">
              <Tag color={detailTalent.source === 'internal' ? 'purple' : 'blue'}>
                {detailTalent.source === 'internal' ? '内部员工' : '外部候选人'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="储备等级">
              {editingLevel ? (
                <Space>
                  <Select
                    size="small"
                    value={levelValue}
                    onChange={setLevelValue}
                    style={{ width: 140 }}
                    options={[
                      { label: '无', value: null },
                      { label: 'A库·随时', value: 'A' },
                      { label: 'B库·近期', value: 'B' },
                      { label: 'C库·远期', value: 'C' },
                    ]}
                  />
                  <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveLevel}>保存</Button>
                  <Button size="small" onClick={() => setEditingLevel(false)}>取消</Button>
                </Space>
              ) : (
                <Space>
                  <span>{detailTalent.reserve_level ? RESERVE_LEVEL_LABELS[detailTalent.reserve_level] : '-'}</span>
                  <Button
                    size="small"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setLevelValue(detailTalent.reserve_level);
                      setEditingLevel(true);
                    }}
                  >
                    修改
                  </Button>
                </Space>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="现任岗位">{detailTalent.position_applied}</Descriptions.Item>
            <Descriptions.Item label="意向岗位">{detailTalent.position_intended}</Descriptions.Item>
            <Descriptions.Item label="部门">{detailTalent.department}</Descriptions.Item>
            <Descriptions.Item label="所在地">{detailTalent.current_location}</Descriptions.Item>
            <Descriptions.Item label="绩效评分" span={2}>
              {detailTalent.performance_score}/10 · 潜力: {detailTalent.potential_score}/10
            </Descriptions.Item>
            <Descriptions.Item label="九宫格" span={2}>
              {detailTalent.grid_position
                ? GRID_LABELS[`${detailTalent.grid_position.x},${detailTalent.grid_position.y}`]
                : '未落位'}
            </Descriptions.Item>
            <Descriptions.Item label="核心技能" span={2}>
              {detailTalent.skills?.map(s => <Tag key={s} color="green">{s}</Tag>)}
            </Descriptions.Item>
            <Descriptions.Item label="语言" span={2}>
              {detailTalent.languages?.map(l => <Tag key={l.language} color="purple">{l.language} ({l.level})</Tag>)}
            </Descriptions.Item>
            <Descriptions.Item label="亮点" span={2}>{detailTalent.highlights || '-'}</Descriptions.Item>
            <Descriptions.Item label="风险" span={2}><span style={{ color: '#ff4d4f' }}>{detailTalent.risks || '-'}</span></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
