// ============================================================
// 人才九宫格 — 绩效×潜力 3×3 矩阵，全部按分数自动落位
// 绩效/潜力: 1-3→低, 4-8→中, 9-10→高
// 明星 = 绩效≥9 & 潜力≥9
// (1,1) 淘汰对象 → pool_type='pre_eliminated'
// ============================================================

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Typography, Modal, List, Tag, Button, Space, message, Empty,
  InputNumber, Descriptions,
} from 'antd';
import {
  EditOutlined, EyeOutlined,
} from '@ant-design/icons';
import type { Talent } from '../db/schema';
import { GRID_LABELS } from '../db/schema';
import { db } from '../db';
import { seedMockData } from '../db/mock-data';

// 分数 → 格子坐标
function scoreToGrid(score: number): 1 | 2 | 3 {
  if (score <= 3) return 1;
  if (score <= 8) return 2;
  return 3;
}

// 每个格子的分数范围
const CELL_SCORE_RANGE: Record<string, string> = {
  '1,1': 'P1-3·P1-3',
  '1,2': 'P1-3·P4-8',
  '1,3': 'P1-3·P9-10',
  '2,1': 'P4-8·P1-3',
  '2,2': 'P4-8·P4-8',
  '2,3': 'P4-8·P9-10',
  '3,1': 'P9-10·P1-3',
  '3,2': 'P9-10·P4-8',
  '3,3': 'P9-10·P9-10',
};

// 九宫格颜色
const CELL_COLORS: Record<string, string> = {
  '1,1': '#fff1f0',
  '1,2': '#fff7e6',
  '1,3': '#fffbe6',
  '2,1': '#fff7e6',
  '2,2': '#f6ffed',
  '2,3': '#e6fffb',
  '3,1': '#fffbe6',
  '3,2': '#e6fffb',
  '3,3': '#f6ffed',
};
const CELL_BORDER_COLORS: Record<string, string> = {
  '1,1': '#ffccc7',
  '1,2': '#ffd591',
  '1,3': '#ffe58f',
  '2,1': '#ffd591',
  '2,2': '#b7eb8f',
  '2,3': '#87e8de',
  '3,1': '#ffe58f',
  '3,2': '#87e8de',
  '3,3': '#b7eb8f',
};

export default function NineGridPage() {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [showUnplaced, setShowUnplaced] = useState(false);
  const [editingScores, setEditingScores] = useState(false);
  const [editPerf, setEditPerf] = useState<number | null>(null);
  const [editPot, setEditPot] = useState<number | null>(null);

  const talents = useLiveQuery(() => db.talents.toArray(), []) || [];
  useState(() => { seedMockData(); });

  // 内部员工（非删除、非招聘中候选人）
  const internalTalents = useMemo(() =>
    talents.filter(t =>
      !t.is_deleted &&
      (t.pool_type === 'active' || t.pool_type === 'key_position' || t.pool_type === 'pre_eliminated')
    ),
  [talents]);

  // 自动按分数计算九宫格位置，按格子分组
  const gridData = useMemo(() => {
    const map: Record<string, Talent[]> = {};
    for (let y = 3; y >= 1; y--) {
      for (let x = 1; x <= 3; x++) {
        map[`${x},${y}`] = [];
      }
    }
    for (const t of internalTalents) {
      const gx = scoreToGrid(t.performance_score ?? 0);
      const gy = scoreToGrid(t.potential_score ?? 0);
      if (t.performance_score != null && t.potential_score != null) {
        map[`${gx},${gy}`].push(t);
      }
    }
    return map;
  }, [internalTalents]);

  // 无评分人员
  const unplacedTalents = useMemo(() =>
    internalTalents.filter(t => t.performance_score == null || t.potential_score == null),
  [internalTalents]);

  const cellTalents = selectedCell ? (gridData[selectedCell] || []) : [];

  // 保存评分
  async function handleSaveScores() {
    if (!selectedTalent?.id || editPerf == null || editPot == null) {
      message.warning('请填写绩效和潜力评分');
      return;
    }
    const gx = scoreToGrid(editPerf);
    const gy = scoreToGrid(editPot);
    const update: Partial<Talent> = {
      performance_score: editPerf,
      potential_score: editPot,
      grid_position: { x: gx, y: gy },
      updated_at: new Date().toISOString(),
    };
    // (1,1) 自动标预淘汰
    if (gx === 1 && gy === 1 && selectedTalent.pool_type !== 'key_position') {
      update.pool_type = 'pre_eliminated';
    }
    await db.talents.update(selectedTalent.id, update);
    message.success(`${selectedTalent.name} 评分已更新 → ${GRID_LABELS[`${gx},${gy}`]}`);
    setEditingScores(false);
    setSelectedTalent(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>人才九宫格</Typography.Title>
        {unplacedTalents.length > 0 && (
          <Button icon={<EditOutlined />} onClick={() => setShowUnplaced(true)}>
            待评分 ({unplacedTalents.length})
          </Button>
        )}
      </div>

      {/* 图例 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, color: '#888' }}>
        <span>绩效 1-3=低 · 4-8=中 · 9-10=高</span>
        <span>潜力 1-3=低 · 4-8=中 · 9-10=高</span>
        <span>明星 = 绩效≥9 且 潜力≥9</span>
      </div>

      {/* 3×3 矩阵 + 轴标签 */}
      <div style={{ display: 'flex', maxWidth: 900, marginBottom: 24 }}>
        {/* Y 轴（潜力） */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', width: 48, marginRight: 8,
        }}>
          <div style={{
            writingMode: 'vertical-rl', fontSize: 16, fontWeight: 700,
            color: '#1677ff', letterSpacing: 4,
          }}>
            潜力 ↑
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4, writingMode: 'vertical-rl' }}>
            高 → 低
          </div>
        </div>

        {/* 格子区 */}
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '1fr 1fr 1fr',
            gap: 12,
          }}>
            {[3, 2, 1].map(y =>
              [1, 2, 3].map(x => {
                const key = `${x},${y}`;
                const count = gridData[key]?.length || 0;
                return (
                  <div
                    key={key}
                    style={{
                      backgroundColor: CELL_COLORS[key],
                      border: `2px solid ${CELL_BORDER_COLORS[key]}`,
                      borderRadius: 8,
                      padding: '12px 8px',
                      cursor: 'pointer',
                      opacity: count > 0 ? 1 : 0.45,
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                    onClick={() => setSelectedCell(key)}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>
                      {GRID_LABELS[key]}
                    </div>
                    <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                      {CELL_SCORE_RANGE[key]}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff', marginTop: 6 }}>
                      {count}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>人</div>
                  </div>
                );
              })
            )}
          </div>

          {/* X 轴（绩效） */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            marginTop: 10, gap: 8,
          }}>
            <span style={{ fontSize: 11, color: '#999' }}>低</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1677ff', letterSpacing: 4 }}>
              绩效 →
            </span>
            <span style={{ fontSize: 11, color: '#999' }}>高</span>
          </div>
        </div>
      </div>

      {/* 各类人员统计 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 13, color: '#666' }}>
        <span>内部人才共 {internalTalents.length} 人</span>
        <span>· 已评分 {internalTalents.length - unplacedTalents.length} 人</span>
        {unplacedTalents.length > 0 && (
          <span style={{ color: '#faad14' }}>· 待评分 {unplacedTalents.length} 人</span>
        )}
      </div>

      {/* 格子人才列表 */}
      <Modal
        title={selectedCell ? (
          <Space>
            <span>{GRID_LABELS[selectedCell]}</span>
            <Tag>{CELL_SCORE_RANGE[selectedCell]}</Tag>
            <span style={{ fontWeight: 400, fontSize: 13, color: '#888' }}>{cellTalents.length}人</span>
          </Space>
        ) : ''}
        open={!!selectedCell}
        onCancel={() => setSelectedCell(null)}
        footer={null}
        width={650}
      >
        {cellTalents.length === 0 ? (
          <Empty description="该格子暂无人才" />
        ) : (
          <List
            dataSource={cellTalents}
            renderItem={t => (
              <List.Item
                actions={[
                  <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedTalent(t)}>
                    详情
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={`${t.name} — ${t.position_applied}`}
                  description={
                    <Space wrap size={4}>
                      <Tag>{t.department}</Tag>
                      <Tag color="blue">绩效: {t.performance_score}/10</Tag>
                      <Tag color="purple">潜力: {t.potential_score}/10</Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>

      {/* 待评分人员列表 */}
      <Modal
        title={`待评分人员 (${unplacedTalents.length})`}
        open={showUnplaced}
        onCancel={() => setShowUnplaced(false)}
        footer={null}
        width={550}
      >
        {unplacedTalents.length === 0 ? (
          <Empty description="所有人员已评分" />
        ) : (
          <List
            dataSource={unplacedTalents}
            renderItem={t => (
              <List.Item
                actions={[
                  <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => {
                    setSelectedTalent(t);
                    setEditPerf(t.performance_score);
                    setEditPot(t.potential_score);
                    setEditingScores(true);
                    setShowUnplaced(false);
                  }}>
                    评分
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={`${t.name} — ${t.position_applied}`}
                  description={<Tag>{t.department}</Tag>}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>

      {/* 人才详情 + 评分编辑 */}
      <Modal
        title={selectedTalent?.name}
        open={!!selectedTalent}
        onCancel={() => { setSelectedTalent(null); setEditingScores(false); }}
        footer={editingScores ? (
          <Space>
            <Button onClick={() => setEditingScores(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveScores}>保存评分</Button>
          </Space>
        ) : null}
        width={500}
      >
        {selectedTalent && !editingScores && (
          <div>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="岗位">{selectedTalent.position_applied}</Descriptions.Item>
              <Descriptions.Item label="部门">{selectedTalent.department}</Descriptions.Item>
              <Descriptions.Item label="绩效评分">{selectedTalent.performance_score ?? '-'}/10</Descriptions.Item>
              <Descriptions.Item label="潜力评分">{selectedTalent.potential_score ?? '-'}/10</Descriptions.Item>
              <Descriptions.Item label="九宫格">
                {selectedTalent.performance_score != null && selectedTalent.potential_score != null
                  ? GRID_LABELS[`${scoreToGrid(selectedTalent.performance_score)},${scoreToGrid(selectedTalent.potential_score)}`]
                  : '未评分'}
              </Descriptions.Item>
              <Descriptions.Item label="技能">
                {selectedTalent.skills?.map(s => <Tag key={s} color="green">{s}</Tag>)}
              </Descriptions.Item>
            </Descriptions>
            {selectedTalent.highlights && <p>🌟 {selectedTalent.highlights}</p>}
            {selectedTalent.risks && <p style={{ color: '#ff4d4f' }}>⚠️ {selectedTalent.risks}</p>}
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setEditPerf(selectedTalent.performance_score);
                setEditPot(selectedTalent.potential_score);
                setEditingScores(true);
              }}
              style={{ marginTop: 12 }}
            >
              编辑评分
            </Button>
          </div>
        )}
        {selectedTalent && editingScores && (
          <div>
            <Typography.Paragraph type="secondary">
              修改评分后九宫格位置自动更新。绩效/潜力 1-3=低, 4-8=中, 9-10=高。
            </Typography.Paragraph>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <div style={{ marginBottom: 4, fontWeight: 600 }}>绩效评分 (1-10)</div>
                <InputNumber
                  value={editPerf}
                  onChange={v => setEditPerf(v)}
                  min={1} max={10}
                  style={{ width: '100%' }}
                  placeholder="1-10"
                />
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  当前: {selectedTalent.performance_score}/10 · 等级: {editPerf != null ? (editPerf <= 3 ? '低' : editPerf <= 8 ? '中' : '高') : '-'}
                </div>
              </div>
              <div>
                <div style={{ marginBottom: 4, fontWeight: 600 }}>潜力评分 (1-10)</div>
                <InputNumber
                  value={editPot}
                  onChange={v => setEditPot(v)}
                  min={1} max={10}
                  style={{ width: '100%' }}
                  placeholder="1-10"
                />
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  当前: {selectedTalent.potential_score}/10 · 等级: {editPot != null ? (editPot <= 3 ? '低' : editPot <= 8 ? '中' : '高') : '-'}
                </div>
              </div>
              {editPerf != null && editPot != null && (
                <div style={{
                  padding: 12, background: '#f6ffed', borderRadius: 8,
                  textAlign: 'center', fontWeight: 600, fontSize: 15,
                }}>
                  落位: {GRID_LABELS[`${scoreToGrid(editPerf)},${scoreToGrid(editPot)}`]}
                  {editPerf >= 9 && editPot >= 9 && ' ⭐明星'}
                  {editPerf <= 3 && editPot <= 3 && ' ⚠️预淘汰'}
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}
