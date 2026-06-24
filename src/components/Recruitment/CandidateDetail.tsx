// ============================================================
// 候选人详情 — 全信息展示 + 状态操作 + 面试记录 + 储备等级
// ============================================================

import { useState, useEffect } from 'react';
import {
  Drawer, Descriptions, Tag, Button, Space, Divider, Input, InputNumber,
  DatePicker, message, Popconfirm, Typography, Timeline,
} from 'antd';
import {
  CheckOutlined, CloseOutlined, ArrowRightOutlined, EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Talent, CandidateStatus } from '../../db/schema';
import { STATUS_LABELS, STATUS_COLORS } from '../../db/schema';
import { executeTransition } from '../../utils/status-engine';
import { db } from '../../db';

interface Props {
  talent: Talent | null;
  open: boolean;
  onClose: () => void;
}

export default function CandidateDetail({ talent, open, onClose }: Props) {
  const [acting, setActing] = useState(false);

  // 面试表单状态
  const [interviewDate, setInterviewDate] = useState<dayjs.Dayjs | null>(null);
  const [interviewer, setInterviewer] = useState('');
  const [interviewScore, setInterviewScore] = useState<number | null>(null);
  const [interviewNotes, setInterviewNotes] = useState('');
  const [editingInterview, setEditingInterview] = useState(false);
  const [editingStage, setEditingStage] = useState<'hr' | 'business' | null>(null);

  // 切换人才时重置表单状态
  useEffect(() => {
    setInterviewDate(null);
    setInterviewer('');
    setInterviewScore(null);
    setInterviewNotes('');
    setEditingInterview(false);
    setEditingStage(null);
  }, [talent?.id, open]);

  if (!talent) return null;

  const nextStatuses: CandidateStatus[] = talent.status ? [
    ...(talent.status === 'reviewing' ? ['suitable' as const, 'unsuitable' as const] : []),
    ...(talent.status === 'suitable' ? ['hr_interview_scheduled' as const] : []),
    ...(talent.status === 'hr_interview_scheduled' ? ['hr_interview_passed' as const, 'hr_interview_failed' as const] : []),
    ...(talent.status === 'hr_interview_passed' ? ['business_interview_scheduled' as const] : []),
    ...(talent.status === 'business_interview_scheduled' ? ['business_interview_passed' as const, 'business_interview_failed' as const] : []),
    ...(talent.status === 'business_interview_passed' ? ['offer_stage' as const] : []),
    ...(talent.status === 'offer_stage' ? ['hired' as const, 'offer_rejected' as const] : []),
  ] : [];

  // 当前处于哪个面试阶段
  const currentInterviewStage: 'hr' | 'business' | null =
    talent.status === 'hr_interview_scheduled' ? 'hr' :
    talent.status === 'business_interview_scheduled' ? 'business' : null;

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

  // 提交面试结果
  async function handleInterviewResult(passed: boolean) {
    if (!currentInterviewStage || !interviewDate || !talent) {
      message.warning('请至少填写面试日期');
      return;
    }
    setActing(true);
    const toStatus: CandidateStatus = currentInterviewStage === 'hr'
      ? (passed ? 'hr_interview_passed' : 'hr_interview_failed')
      : (passed ? 'business_interview_passed' : 'business_interview_failed');

    const existingRec = talent[currentInterviewStage === 'hr' ? 'hr_interview' : 'business_interview'];
    const interviewRecord = {
      scheduled_at: existingRec.scheduled_at,
      interviewer: interviewer || existingRec.interviewer,
      score: interviewScore,
      notes: interviewNotes,
      passed,
      interviewed_at: interviewDate.toISOString(),
    };

    const extra: Partial<Talent> = currentInterviewStage === 'hr'
      ? { hr_interview: interviewRecord }
      : { business_interview: interviewRecord };

    try {
      await executeTransition(talent, toStatus, extra);
      message.success(`面试${passed ? '通过' : '未通过'}，已记录`);
      onClose();
    } catch (err: any) {
      message.error(err.message || '操作失败');
    }
    setActing(false);
  }

  // 直接更新面试记录（不改变状态，仅编辑已存在的记录）
  async function handleUpdateInterview(stage: 'hr' | 'business') {
    if (!interviewDate || !talent) { message.warning('请填写面试日期'); return; }
    setActing(true);
    const existingRec = talent[stage === 'hr' ? 'hr_interview' : 'business_interview'];
    const record = {
      scheduled_at: existingRec.scheduled_at,
      interviewer: interviewer || existingRec.interviewer,
      score: interviewScore,
      notes: interviewNotes,
      passed: existingRec.passed,
      interviewed_at: interviewDate.toISOString(),
    };
    const update: Partial<Talent> = {
      updated_at: new Date().toISOString(),
      ...(stage === 'hr' ? { hr_interview: record } : { business_interview: record }),
    };
    await db.talents.update(talent.id!, update);
    message.success('面试记录已更新');
    setEditingInterview(false);
    setActing(false);
    onClose();
  }

  // 加载已有面试记录到编辑表单
  function loadInterviewForEdit(stage: 'hr' | 'business') {
    if (!talent) return;
    const record = talent[stage === 'hr' ? 'hr_interview' : 'business_interview'];
    setInterviewDate(record.interviewed_at ? dayjs(record.interviewed_at) : null);
    setInterviewer(record.interviewer || '');
    setInterviewScore(record.score);
    setInterviewNotes(record.notes || '');
    setEditingStage(stage);
    setEditingInterview(true);
  }

  // ---- 面试录入表单 ----
  const renderInterviewForm = (stage: 'hr' | 'business') => {
    const existing = talent[stage === 'hr' ? 'hr_interview' : 'business_interview'];
    const hasExisting = existing.interviewed_at;
    const label = stage === 'hr' ? 'HR面试' : '业务面试';

    if (hasExisting && !editingInterview) {
      return (
        <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Text strong>{label}记录</Typography.Text>
            <Button size="small" icon={<EditOutlined />} onClick={() => loadInterviewForEdit(stage)}>
              编辑
            </Button>
          </div>
          <div style={{ marginTop: 8 }}>
            <div>面试官: {existing.interviewer}</div>
            <div>日期: {existing.interviewed_at?.slice(0, 10)}</div>
            <div>评分: {existing.score}/10 · {existing.passed ? '通过' : '未通过'}</div>
            {existing.notes && <div style={{ color: '#666' }}>备注: {existing.notes}</div>}
          </div>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
        <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
          {editingInterview ? `编辑${label}记录` : `录入${label}结果`}
        </Typography.Text>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Space wrap>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>面试日期</div>
              <DatePicker
                value={interviewDate}
                onChange={setInterviewDate}
                style={{ width: 160 }}
                placeholder="选择日期"
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>面试官</div>
              <Input
                value={interviewer}
                onChange={e => setInterviewer(e.target.value)}
                style={{ width: 140 }}
                placeholder={stage === 'hr' ? 'HR姓名' : '业务负责人'}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>评分 (1-10)</div>
              <InputNumber
                value={interviewScore}
                onChange={v => setInterviewScore(v)}
                min={1} max={10}
                style={{ width: 80 }}
              />
            </div>
          </Space>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>评语</div>
            <Input.TextArea
              value={interviewNotes}
              onChange={e => setInterviewNotes(e.target.value)}
              rows={2}
              placeholder="面试评价..."
            />
          </div>
          {editingInterview ? (
            <Space>
              <Button onClick={() => { setEditingInterview(false); }}>取消</Button>
              <Button type="primary" loading={acting} onClick={() => handleUpdateInterview(stage)}>
                保存记录
              </Button>
            </Space>
          ) : currentInterviewStage === stage ? (
            <Space>
              <Popconfirm title="确认面试通过？" onConfirm={() => handleInterviewResult(true)}>
                <Button type="primary" icon={<CheckOutlined />} loading={acting}>通过</Button>
              </Popconfirm>
              <Popconfirm title="确认面试不通过？简历将标记为淘汰" onConfirm={() => handleInterviewResult(false)}>
                <Button danger icon={<CloseOutlined />} loading={acting}>不通过</Button>
              </Popconfirm>
            </Space>
          ) : null}
        </Space>
      </div>
    );
  };

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
          if (next === 'business_interview_scheduled') {
            return (
              <Popconfirm
                key={next}
                title="确认安排业务面试？"
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

      {/* ---- 面试录入区 ---- */}
      {currentInterviewStage === 'hr' && (
        <>
          <Divider>HR面试</Divider>
          {renderInterviewForm('hr')}
        </>
      )}
      {currentInterviewStage === 'business' && (
        <>
          <Divider>业务面试</Divider>
          {renderInterviewForm('business')}
        </>
      )}

      {/* ---- 已有面试记录时间线 ---- */}
      {(talent.hr_interview.interviewed_at || talent.business_interview.interviewed_at) && !currentInterviewStage && (
        <>
          <Divider>面试记录</Divider>
          <Timeline
            items={[
              ...(talent.hr_interview.interviewed_at ? [{
                color: talent.hr_interview.passed ? 'green' as const : 'red' as const,
                children: (
                  <>
                    <div><strong>HR面试</strong> — {talent.hr_interview.interviewer}</div>
                    <div>评分: {talent.hr_interview.score}/10 · {talent.hr_interview.passed ? '通过' : '未通过'}</div>
                    {talent.hr_interview.notes && <div style={{ color: '#666' }}>{talent.hr_interview.notes}</div>}
                    <div style={{ fontSize: 12, color: '#999' }}>{talent.hr_interview.interviewed_at?.slice(0, 10)}</div>
                    <Button size="small" type="link" onClick={() => loadInterviewForEdit('hr')} style={{ padding: 0 }}>
                      编辑
                    </Button>
                  </>
                ),
              }] : []),
              ...(talent.business_interview.interviewed_at ? [{
                color: talent.business_interview.passed ? 'green' as const : 'red' as const,
                children: (
                  <>
                    <div><strong>业务面试</strong> — {talent.business_interview.interviewer}</div>
                    <div>评分: {talent.business_interview.score}/10 · {talent.business_interview.passed ? '通过' : '未通过'}</div>
                    {talent.business_interview.notes && <div style={{ color: '#666' }}>{talent.business_interview.notes}</div>}
                    <div style={{ fontSize: 12, color: '#999' }}>{talent.business_interview.interviewed_at?.slice(0, 10)}</div>
                    <Button size="small" type="link" onClick={() => loadInterviewForEdit('business')} style={{ padding: 0 }}>
                      编辑
                    </Button>
                  </>
                ),
              }] : []),
            ]}
          />
        </>
      )}

      {/* 编辑面试记录（当不在面试阶段但要编辑已有记录时） */}
      {editingInterview && !currentInterviewStage && editingStage && (
        <div style={{ marginTop: 16 }}>
          {renderInterviewForm(editingStage)}
        </div>
      )}

      {/* 评价信息 */}
      {(talent.highlights || talent.risks || talent.general_notes) && (
        <>
          <Divider>评价</Divider>
          {talent.highlights && <div style={{ marginBottom: 8 }}>🌟 亮点：{talent.highlights}</div>}
          {talent.risks && <div style={{ marginBottom: 8, color: '#ff4d4f' }}>⚠️ 风险：{talent.risks}</div>}
          {talent.general_notes && <div>📝 备注：{talent.general_notes}</div>}
        </>
      )}
    </Drawer>
  );
}
