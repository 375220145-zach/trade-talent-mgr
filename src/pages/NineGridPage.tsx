// ============================================================
// 人才九宫格 — 绩效×潜力 3×3 矩阵
// ============================================================

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Typography, Modal, List, Tag, Button, Space, message, Empty,
} from 'antd';
import type { Talent } from '../db/schema';
import { GRID_LABELS } from '../db/schema';
import { db } from '../db';
import { seedMockData } from '../db/mock-data';

// 九宫格颜色：从红到绿
const CELL_COLORS: Record<string, string> = {
  '1,1': '#fff1f0',  // 淘汰对象 — 浅红
  '1,2': '#fff7e6',  // 一般人员 — 浅橙
  '1,3': '#fffbe6',  // 熟练工 — 浅黄
  '2,1': '#fff7e6',  // 待改进者
  '2,2': '#f6ffed',  // 中坚人员 — 浅绿
  '2,3': '#e6fffb',  // 绩效之星 — 浅青
  '3,1': '#fffbe6',  // 待提升者
  '3,2': '#e6fffb',  // 潜力之星
  '3,3': '#f6ffed',  // 明星 — 绿
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
  const [placingTalent, setPlacingTalent] = useState<Talent | null>(null);

  const talents = useLiveQuery(() => db.talents.toArray(), []) || [];
  useState(() => { seedMockData(); });

  // 有九宫格位置的人才（非删除）
  const placedTalents = useMemo(() =>
    talents.filter(t => t.grid_position && !t.is_deleted),
  [talents]);

  // 按格子分组
  const gridData = useMemo(() => {
    const map: Record<string, Talent[]> = {};
    for (let y = 3; y >= 1; y--) {
      for (let x = 1; x <= 3; x++) {
        map[`${x},${y}`] = [];
      }
    }
    for (const t of placedTalents) {
      const key = `${t.grid_position!.x},${t.grid_position!.y}`;
      if (map[key]) map[key].push(t);
    }
    return map;
  }, [placedTalents]);

  const cellTalents = selectedCell ? (gridData[selectedCell] || []) : [];

  // 未落位的人才
  const unplacedTalents = useMemo(() =>
    talents.filter(t => !t.grid_position && !t.is_deleted && t.pool_type !== 'eliminated'),
  [talents]);

  async function handlePlace(talent: Talent, pos: string) {
    const [x, y] = pos.split(',').map(Number) as [1|2|3, 1|2|3];
    await db.talents.update(talent.id!, {
      grid_position: { x, y },
      updated_at: new Date().toISOString(),
    });
    message.success(`${talent.name} 已落位到 ${GRID_LABELS[pos]}`);
    setPlacingTalent(null);
  }

  async function handleRemoveFromGrid(talent: Talent) {
    await db.talents.update(talent.id!, {
      grid_position: null,
      updated_at: new Date().toISOString(),
    });
    message.success(`${talent.name} 已移出九宫格`);
    setSelectedTalent(null);
  }

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>人才九宫格</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Y轴（纵）= 潜力 · X轴（横）= 绩效 · 点击格子查看人才列表
      </Typography.Paragraph>

      {/* 3×3 矩阵 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr 1fr',
        gap: 12,
        maxWidth: 900,
        marginBottom: 24,
      }}>
        {/* Y 轴标签 */}
        {[3, 2, 1].map(y => (
          [1, 2, 3].map(x => {
            const key = `${x},${y}`;
            const count = gridData[key]?.length || 0;
            return (
              <div
                key={key}
                className="grid-cell"
                style={{
                  backgroundColor: CELL_COLORS[key],
                  borderColor: CELL_BORDER_COLORS[key],
                  opacity: count > 0 ? 1 : 0.5,
                }}
                onClick={() => setSelectedCell(key)}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
                  {GRID_LABELS[key]}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff', marginTop: 4 }}>
                  {count}
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>人</div>
              </div>
            );
          })
        ))}
      </div>

      {/* 轴标签 */}
      <div style={{ display: 'flex', gap: 12, maxWidth: 900, marginBottom: 8 }}>
        <div style={{ width: 60, fontSize: 12, color: '#999', textAlign: 'right', paddingRight: 8 }}>
          潜力↑
        </div>
        <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around', fontSize: 12, color: '#999' }}>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: '#999', marginBottom: 24 }}>
        绩效 →
      </div>

      {/* 未落位人才 */}
      {unplacedTalents.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={5}>待落位人才 ({unplacedTalents.length})</Typography.Title>
          <Space wrap>
            {unplacedTalents.map(t => (
              <Button
                key={t.id}
                size="small"
                onClick={() => setPlacingTalent(t)}
              >
                {t.name} — {t.position_applied}
              </Button>
            ))}
          </Space>
        </div>
      )}

      {/* 格子人才列表 */}
      <Modal
        title={selectedCell ? `${GRID_LABELS[selectedCell]} — ${cellTalents.length}人` : ''}
        open={!!selectedCell}
        onCancel={() => setSelectedCell(null)}
        footer={null}
        width={600}
      >
        {cellTalents.length === 0 ? (
          <Empty description="该格子暂无人才" />
        ) : (
          <List
            dataSource={cellTalents}
            renderItem={t => (
              <List.Item
                actions={[
                  <Button size="small" onClick={() => setSelectedTalent(t)}>详情</Button>,
                  <Button size="small" danger onClick={() => handleRemoveFromGrid(t)}>移出</Button>,
                ]}
              >
                <List.Item.Meta
                  title={`${t.name} — ${t.position_applied}`}
                  description={
                    <Space>
                      <Tag>{t.department}</Tag>
                      <span>绩效: {t.performance_score}/10</span>
                      <span>潜力: {t.potential_score}/10</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>

      {/* 落位选择 */}
      <Modal
        title={`落位: ${placingTalent?.name}`}
        open={!!placingTalent}
        onCancel={() => setPlacingTalent(null)}
        footer={null}
      >
        <Typography.Paragraph type="secondary">
          选择九宫格位置（当前: {
            placingTalent?.grid_position
              ? GRID_LABELS[`${placingTalent.grid_position.x},${placingTalent.grid_position.y}`]
              : '未落位'
          }）
        </Typography.Paragraph>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
        }}>
          {[3, 2, 1].map(y =>
            [1, 2, 3].map(x => {
              const key = `${x},${y}`;
              return (
                <Button
                  key={key}
                  style={{
                    height: 60,
                    backgroundColor: CELL_COLORS[key],
                    borderColor: CELL_BORDER_COLORS[key],
                  }}
                  onClick={() => handlePlace(placingTalent!, key)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{GRID_LABELS[key]}</div>
                    <div style={{ fontSize: 11 }}>绩效{x} · 潜力{y}</div>
                  </div>
                </Button>
              );
            })
          )}
        </div>
      </Modal>

      {/* 人才详情 */}
      <Modal
        title={selectedTalent?.name}
        open={!!selectedTalent}
        onCancel={() => setSelectedTalent(null)}
        footer={null}
      >
        {selectedTalent && (
          <div>
            <p>岗位: {selectedTalent.position_applied}</p>
            <p>部门: {selectedTalent.department}</p>
            <p>绩效评分: {selectedTalent.performance_score}/10</p>
            <p>潜力评分: {selectedTalent.potential_score}/10</p>
            <p>九宫格: {selectedTalent.grid_position
              ? GRID_LABELS[`${selectedTalent.grid_position.x},${selectedTalent.grid_position.y}`]
              : '未落位'}</p>
            <p>技能: {selectedTalent.skills?.map(s => <Tag key={s} color="green">{s}</Tag>)}</p>
            {selectedTalent.highlights && <p>🌟 {selectedTalent.highlights}</p>}
            {selectedTalent.risks && <p style={{ color: '#ff4d4f' }}>⚠️ {selectedTalent.risks}</p>}
            <Button danger onClick={() => handleRemoveFromGrid(selectedTalent)} style={{ marginTop: 12 }}>
              移出九宫格
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
