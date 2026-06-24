// ============================================================
// 候选人详情 — 全信息展示 + 状态操作按钮
// ============================================================

import { useState } from 'react';
import {
  Drawer, Descriptions, Tag, Button, Space, Divider, Select, Input, InputNumber,
  DatePicker, message, Popconfirm, Typography, Timeline, Empty,
} from 'antd';
import {
  CheckOutlined, CloseOutlined, ArrowRightOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Talent, CandidateStatus } from '../../db/schema';
import { STATUS_LABELS, STATUS_COLORS } from '../../db/schema';
import { executeTransition, canTransition } from '../../utils/status-engine';
import { db } from '../../db';

interface Props {
  talent: Talent | null;
  open: boolean;
  onClose: () => void;
}

export default function CandidateDetail({ talent, open, onClose }: Props) {
  const [acting, setActing] = useState(false);

  if (!talent) return null;

  const allowed = (talent.status ? [] : []) as CandidateStatus[];
  // 实际计算允许的状态变更
  const nextStatuses: CandidateStatus[] = talent.status ? [
    ...(talent.status === 'reviewing' ? ['suitable' as const, 'unsuitable' as const, 'reserve' as const] : []),
    ...(talent.status === 'new' ? ['reviewing' as const] : []),
    ...(talent.status === 'suitable' ? ['hr_interview_scheduled' as const] : []),
    ...(talent.status === 'reserve' ? ['suitable' as const] : []),
    ...(talent.status === 'hr_interview_scheduled' ? ['hr_interview_passed' as const, 'hr_interview_failed' as const] : []),
    ...(talent.status === 'hr_interview_passed' ? ['business_interview_scheduled' as const] : []),
    ...(talent.status === 'business_interview_scheduled' ? ['business_interview_passed' as const, 'business_interview_failed' as const] : []),
    ...(talent.status === 'business_interview_passed' ? ['offer_stage' as const] : []),
    ...(talent.status === 'offer_stage' ? ['hired' as const, 'offer_rejected' as const] : []),
  ] : [];

  async function handleTransition(to: CandidateStatus, extra?: Partial<Talent>) {
    setActing(true);
    try {
      await executeTransition(talent!, to, extra);
      message.success(`状态已更新为: ${STATUS_LABELS[to]}`);
      onClose();
    } catch (err: any) {
      message.error(err.message || '操作失败');
    }
    setActing(false);
  }

  // ---- action buttons per status ----

  const renderActions = () => {
    if (nextStatuses.length === 0) {
      return <Tag>终态，无可用操作</Tag>;
    }

    return (
      <Space wrap>
        {nextStatuses.map(next => {
          const label = STATUS_LABELS[next];
          if (next === 'suitable' && talent.status === 'reviewing') {
            return (
              <Popconfirm
                key={next}
                title="确认标记为合适？将进入面试安排"
                onConfirm={() => handleTransition(next, {
                  hr_review: { ...talent.hr_review, decision: 'suitable', reviewed_at: new Date().toISOString() }
                })}
              >
                <Button type="primary" icon={<CheckOutlined />} loading={acting}>{label}</Button>
              </Popconfirm>
            );
          }
          if (next === 'unsuitable') {
            return (
              <Popconfirm
                key={next}
                title="确认不合适？简历将在30天后清除"
                onConfirm={() => handleTransition(next, {
                  hr_review: { ...talent.hr_review, decision: 'unsuitable', reviewed_at: new Date().toISOString() }
                })}
              >
                <Button danger icon={<CloseOutlined />} loading={acting}>{label}</Button>
              </Popconfirm>
            );
          }
          if (next === 'reserve') {
            return (
              <Popconfirm
                key={next}
                title="确认放入储备池？"
                onConfirm={() => handleTransition(next, {
                  hr_review: { ...talent.hr_review, decision: 'reserve', reviewed_at: new Date().toISOString() }
                })}
              >
                <Button icon={<ClockCircleOutlined />} loading={acting}>{label}</Button>
              </Popconfirm>
            );
          }
          if (next === 'hr_interview_scheduled') {
            return (
              <Popconfirm
                key={next}
                title="确认安排HR面试？"
                onConfirm={() => handleTransition(next)}
              >
                <Button type="primary" icon={<ArrowRightOutlined />} loading={acting}>{label}</Button>
              </Popconfirm>
            );
          }
          return (
            <Popconfirm
              key={next}
              title={`确认操作: ${label}？`}
              onConfirm={() => handleTransition(next)}
            >
              <Button type="primary" loading={acting}>{label}</Button>
            </Popconfirm>
          );
        })}
      </Space>
    );
  };

  return (
    <Drawer
      title={
        <Space>
          <span>{talent.name}</span>
          <Tag color={STATUS_COLORS[talent.status]}>{STATUS_LABELS[talent.status]}</Tag>
          {talent.is_deleted && <Tag color="red">已删除</Tag>}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={640}
      footer={<div style={{ textAlign: 'right' }}>{renderActions()}</div>}
    >
      <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="性别">{talent.gender}</Descriptions.Item>
        <Descriptions.Item label="年龄">{talent.age}岁</Descriptions.Item>
        <Descriptions.Item label="学历">{talent.education}</Descriptions.Item>
        <Descriptions.Item label="工龄">{talent.work_years}年</Descriptions.Item>
        <Descriptions.Item label="手机">{talent.phone}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{talent.email}</Descriptions.Item>
        <Descriptions.Item label="所在地">{talent.current_location}</Descriptions.Item>
        <Descriptions.Item label="部门">{talent.department}</Descriptions.Item>
      </Descriptions>

      <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="应聘岗位">{talent.position_applied}</Descriptions.Item>
        <Descriptions.Item label="意向岗位">{talent.position_intended}</Descriptions.Item>
        <Descriptions.Item label="外贸经验">{talent.trade_experience_years}年</Descriptions.Item>
        <Descriptions.Item label="贸易品类">
          {talent.trade_categories?.map(c => <Tag key={c}>{c}</Tag>) || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="目标市场">
          {talent.target_markets?.map(m => <Tag key={m} color="blue">{m}</Tag>) || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="技能标签">
          {talent.skills?.map(s => <Tag key={s} color="green">{s}</Tag>) || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="语言">
          {talent.languages?.map(l => (
            <Tag key={l.language} color="purple">{l.language} ({l.level})</Tag>
          )) || '-'}
        </Descriptions.Item>
      </Descriptions>

      {/* 面试记录时间线 */}
      {(talent.hr_interview.interviewed_at || talent.business_interview.interviewed_at) && (
        <>
          <Divider>面试记录</Divider>
          <Timeline
            items={[
              talent.hr_interview.interviewed_at && {
                color: talent.hr_interview.passed ? 'green' : 'red',
                children: (
                  <>
                    <div><strong>HR面试</strong> — {talent.hr_interview.interviewer}</div>
                    <div>评分: {talent.hr_interview.score}/10 · {talent.hr_interview.passed ? '通过' : '未通过'}</div>
                    {talent.hr_interview.notes && <div style={{ color: '#666' }}>{talent.hr_interview.notes}</div>}
                    <div style={{ fontSize: 12, color: '#999' }}>{talent.hr_interview.interviewed_at?.slice(0, 10)}</div>
                  </>
                ),
              },
              talent.business_interview.interviewed_at && {
                color: talent.business_interview.passed ? 'green' : 'red',
                children: (
                  <>
                    <div><strong>业务面试</strong> — {talent.business_interview.interviewer}</div>
                    <div>评分: {talent.business_interview.score}/10 · {talent.business_interview.passed ? '通过' : '未通过'}</div>
                    {talent.business_interview.notes && <div style={{ color: '#666' }}>{talent.business_interview.notes}</div>}
                    <div style={{ fontSize: 12, color: '#999' }}>{talent.business_interview.interviewed_at?.slice(0, 10)}</div>
                  </>
                ),
              },
            ].filter(Boolean)}
          />
        </>
      )}

      {/* 评价信息 */}
      {(talent.highlights || talent.risks || talent.general_notes) && (
        <>
          <Divider>评价</Divider>
          {talent.highlights && <div style={{ marginBottom: 8 }}>🌟 亮点：{talent.highlights}</div>}
          {talent.risks && <div style={{ marginBottom: 8 }}>⚠️ 风险：{talent.risks}</div>}
          {talent.general_notes && <div>📝 备注：{talent.general_notes}</div>}
        </>
      )}
    </Drawer>
  );
}
