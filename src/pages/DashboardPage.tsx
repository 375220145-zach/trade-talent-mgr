// ============================================================
// Dashboard — 5 张图表 + 部门/库类型筛选
// ============================================================

import { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Row, Col, Card, Select, Space, Typography, Statistic } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import type { Department, PoolType } from '../db/schema';
import { db } from '../db';
import { seedMockData } from '../db/mock-data';

/** 原生 ECharts 轻量包装组件，避免 echarts-for-react 的 ESM/CJS 兼容问题 */
function ReactEChart({ option, style }: { option: any; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current);
    }
    chartRef.current.setOption(option, true);
  }, [option]);

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
    };
  }, []);

  return <div ref={ref} style={style} />;
}

const DEPARTMENTS: Department[] = ['业务部', '人力资源部', '渠道拓展部', '项目部'];

export default function DashboardPage() {
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>('all');
  const [poolFilter, setPoolFilter] = useState<PoolType | 'all'>('all');

  const talents = useLiveQuery(() => db.talents.toArray(), []) || [];
  useState(() => { seedMockData(); });

  // 过滤：非删除 + 部门 + 库类型
  const filtered = useMemo(() => {
    let list = talents.filter(t => !t.is_deleted);
    if (deptFilter !== 'all') list = list.filter(t => t.department === deptFilter);
    if (poolFilter !== 'all') {
      if (poolFilter === 'active') {
        list = list.filter(t => t.pool_type === 'active' || t.pool_type === 'key_position');
      } else {
        list = list.filter(t => t.pool_type === poolFilter);
      }
    }
    return list;
  }, [talents, deptFilter, poolFilter]);

  const total = filtered.length;
  const maleCount = filtered.filter(t => t.gender === '男').length;
  const femaleCount = filtered.filter(t => t.gender === '女').length;

  // ---- 图表 1: 性别环形图 ----
  const genderOption = {
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '45%'],
      label: { show: true, formatter: '{b}\n{d}%' },
      data: [
        { value: maleCount, name: '男', itemStyle: { color: '#1677ff' } },
        { value: femaleCount, name: '女', itemStyle: { color: '#ff85c0' } },
      ],
    }],
  };

  // ---- 图表 2: 各部门员工人数柱状图 ----
  const deptCounts = DEPARTMENTS.map(d => ({
    name: d,
    value: filtered.filter(t => t.department === d).length,
  }));
  const deptOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: deptCounts.map(d => d.name) },
    yAxis: { type: 'value' as const, name: '人数' },
    series: [{
      type: 'bar',
      data: deptCounts.map(d => d.value),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#1677ff' },
          { offset: 1, color: '#69b1ff' },
        ]),
        borderRadius: [4, 4, 0, 0],
      },
      barWidth: '50%',
    }],
    grid: { top: 10, right: 10, bottom: 30, left: 40 },
  };

  // ---- 图表 3: 学历饼状图 ----
  const eduOrder = ['高中', '大专', '本科', '硕士', '博士'];
  const eduCounts = eduOrder.map(e => ({
    name: e, value: filtered.filter(t => t.education === e).length,
  }));
  const eduOption = {
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: '70%',
      center: ['50%', '45%'],
      label: { formatter: '{b}: {d}%' },
      data: eduCounts.filter(d => d.value > 0),
      color: ['#bfbfbf', '#69b1ff', '#1677ff', '#0958d9', '#002c8c'],
    }],
  };

  // ---- 图表 4: 年龄横向柱状图 ----
  const ageBrackets = [
    { label: '20-25岁', min: 20, max: 25 },
    { label: '26-30岁', min: 26, max: 30 },
    { label: '31-35岁', min: 31, max: 35 },
    { label: '36-40岁', min: 36, max: 40 },
    { label: '40岁以上', min: 41, max: 99 },
  ];
  const ageData = ageBrackets.map(b => ({
    name: b.label,
    value: filtered.filter(t => t.age >= b.min && t.age <= b.max).length,
  }));
  const ageOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'value' as const, name: '人数' },
    yAxis: { type: 'category' as const, data: ageData.map(d => d.name).reverse() },
    series: [{
      type: 'bar',
      data: ageData.map(d => d.value).reverse(),
      itemStyle: { color: '#52c41a', borderRadius: [0, 4, 4, 0] },
      barWidth: '55%',
      label: { show: true, position: 'right' as const },
    }],
    grid: { top: 10, right: 30, bottom: 10, left: 80 },
  };

  // ---- 图表 5: 工龄横向柱状图（社会工龄） ----
  const tenureBrackets = [
    { label: '0-2年', min: 0, max: 2 },
    { label: '3-5年', min: 3, max: 5 },
    { label: '6-10年', min: 6, max: 10 },
    { label: '11-15年', min: 11, max: 15 },
    { label: '15年以上', min: 16, max: 99 },
  ];
  const tenureData = tenureBrackets.map(b => ({
    name: b.label,
    value: filtered.filter(t => t.work_years >= b.min && t.work_years <= b.max).length,
  }));
  const tenureOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'value' as const, name: '人数' },
    yAxis: { type: 'category' as const, data: tenureData.map(d => d.name).reverse() },
    series: [{
      type: 'bar',
      data: tenureData.map(d => d.value).reverse(),
      itemStyle: { color: '#faad14', borderRadius: [0, 4, 4, 0] },
      barWidth: '55%',
      label: { show: true, position: 'right' as const },
    }],
    grid: { top: 10, right: 30, bottom: 10, left: 80 },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Dashboard</Typography.Title>
        <Space>
          <Select
            value={deptFilter}
            onChange={setDeptFilter}
            style={{ width: 140 }}
            options={[
              { label: '全部部门', value: 'all' },
              ...DEPARTMENTS.map(d => ({ label: d, value: d })),
            ]}
          />
          <Select
            value={poolFilter}
            onChange={setPoolFilter}
            style={{ width: 130 }}
            options={[
              { label: '全部库类型', value: 'all' },
              { label: '在岗', value: 'active' },
              { label: '储备', value: 'reserve' },
              { label: '淘汰', value: 'eliminated' },
              { label: '预淘汰', value: 'pre_eliminated' },
              { label: '关键岗', value: 'key_position' },
            ]}
          />
        </Space>
      </div>

      {/* 概览卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="总人数" value={total} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="男性" value={maleCount} styles={{ content: { color: '#1677ff' } }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="女性" value={femaleCount} styles={{ content: { color: '#ff85c0' } }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="部门数" value={new Set(filtered.map(t => t.department)).size} />
          </Card>
        </Col>
      </Row>

      {/* 图表区 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="员工性别分析" size="small">
            <ReactEChart option={genderOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="各部门员工人数分析" size="small">
            <ReactEChart option={deptOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="员工学历分析" size="small">
            <ReactEChart option={eduOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="员工年龄分析" size="small">
            <ReactEChart option={ageOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="员工工龄分析（社会工龄）" size="small">
            <ReactEChart option={tenureOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={6} />
      </Row>
    </div>
  );
}
