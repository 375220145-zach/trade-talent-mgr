// ============================================================
// 设置页面 — 数据管理 + 系统信息
// ============================================================

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, Button, Space, Typography, Divider, Popconfirm, message, Statistic, Row, Col } from 'antd';
import { ReloadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { db } from '../db';
import { seedMockData } from '../db/mock-data';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const talents = useLiveQuery(() => db.talents.toArray(), []) || [];

  const totalCount = talents.length;
  const activeCount = talents.filter(t => !t.is_deleted).length;
  const deletedCount = talents.filter(t => t.is_deleted).length;

  async function handleReset() {
    setLoading(true);
    await db.talents.clear();
    await seedMockData();
    message.success('数据已重置为模拟数据');
    setLoading(false);
  }

  async function handleClearAll() {
    setLoading(true);
    await db.talents.clear();
    message.success('所有数据已清空');
    setLoading(false);
  }

  function handleExport() {
    const data = JSON.stringify(talents, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `talent-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('数据已导出');
  }

  return (
    <div>
      <Typography.Title level={3}>设置</Typography.Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="总记录数" value={totalCount} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="活跃记录" value={activeCount} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="已删除" value={deletedCount} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      <Card title="数据管理" style={{ maxWidth: 500 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Button icon={<ReloadOutlined />} onClick={handleReset} loading={loading} block>
            重置为模拟数据（30候选人 + 20在岗员工）
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport} block>
            导出数据 (JSON)
          </Button>
          <Divider />
          <Popconfirm
            title="确定清空所有数据？此操作不可恢复"
            onConfirm={handleClearAll}
          >
            <Button icon={<DeleteOutlined />} danger block loading={loading}>
              清空所有数据
            </Button>
          </Popconfirm>
        </Space>
      </Card>

      <Card title="系统信息" style={{ maxWidth: 500, marginTop: 16 }}>
        <Typography.Paragraph>
          人才管理系统 Demo v1.0<br />
          数据存储：浏览器 IndexedDB（本地存储，不会上传到任何服务器）<br />
          技术栈：React + Ant Design + ECharts + Dexie.js<br />
          部署平台：GitHub Pages
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
