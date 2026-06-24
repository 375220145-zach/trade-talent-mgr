// ============================================================
// 候选人表单 — 手动录入 / 编辑
// ============================================================

import { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, InputNumber, Space, Button, Upload,
  message, Divider, Tag, Alert, Typography,
} from 'antd';
import { UploadOutlined, SearchOutlined } from '@ant-design/icons';
import type { Talent, Gender, Education, Department } from '../../db/schema';
import { db } from '../../db';
import { parseResume, type ParsedResume } from '../../utils/resume-parser';

const SKILL_OPTIONS = [
  '英语谈判', 'LC单证', 'HS编码归类', '客户开发', '供应商管理', '外贸跟单',
  '国际物流', '报关报检', '外汇风险管理', '跨境电商运营', '阿里巴巴国际站',
  '展会参展', '大客户维护', '供应链管理', '成本核算', '合同审核',
  '西语商务', '俄语商务', '日语商务', '阿拉伯语商务', '数据分析', '团队管理',
];

interface Props {
  open: boolean;
  onClose: () => void;
  talent?: Talent | null;       // null = 新建模式
}

export default function CandidateForm({ open, onClose, talent }: Props) {
  const [form] = Form.useForm();
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!talent;

  useEffect(() => {
    if (open) {
      if (talent) {
        form.setFieldsValue(talent);
      } else {
        form.resetFields();
      }
      setParsed(null);
    }
  }, [open, talent, form]);

  // 处理简历上传解析
  async function handleResumeUpload(file: File): Promise<false> {
    setParsing(true);
    const result = await parseResume(file);
    setParsed(result);

    // 自动填充表单
    const fill: Record<string, any> = {};
    if (result.name) fill.name = result.name;
    if (result.phone) fill.phone = result.phone;
    if (result.email) fill.email = result.email;
    if (result.education) fill.education = result.education;
    if (result.current_location) fill.current_location = result.current_location;
    if (result.position_applied) fill.position_applied = result.position_applied;
    if (result.skills.length > 0) fill.skills = result.skills;

    form.setFieldsValue(fill);
    setParsing(false);
    message.info(`简历解析完成，置信度: ${result.confidence === 'high' ? '高' : result.confidence === 'medium' ? '中' : '低'}，请核对字段`);
    return false; // 阻止自动上传
  }

  async function handleSubmit(values: any) {
    setSubmitting(true);
    const now = new Date().toISOString();
    const data: Talent = {
      ...values,
      updated_at: now,
    };

    if (isEdit) {
      await db.talents.update(talent!.id!, data);
      message.success('候选人信息已更新');
    } else {
      const newTalent: Talent = {
        ...data,
        status: 'new',
        pool_type: 'reserve',
        reserve_level: null,
        source: 'hr_upload',
        resume_file_name: null,
        resume_text: parsed?.raw_text || null,
        hr_review: { decision: null, notes: '', reviewed_at: null },
        hr_interview: { scheduled_at: null, interviewer: '', score: null, notes: '', passed: null, interviewed_at: null },
        business_interview: { scheduled_at: null, interviewer: '', score: null, notes: '', passed: null, interviewed_at: null },
        offer_status: null,
        grid_position: null,
        performance_score: null,
        potential_score: null,
        highlights: '',
        risks: '',
        general_notes: '',
        is_deleted: false,
        deleted_reason: null,
        deleted_at: null,
        created_at: now,
        languages: values.languages || [],
        trade_categories: values.trade_categories || [],
        target_markets: values.target_markets || [],
      };
      await db.talents.add(newTalent);
      message.success('候选人已录入');
    }

    setSubmitting(false);
    onClose();
  }

  return (
    <Modal
      title={isEdit ? '编辑候选人' : '录入候选人'}
      open={open}
      onCancel={onClose}
      width={720}
      footer={null}
      destroyOnClose
    >
      {/* 简历上传解析区 */}
      {!isEdit && (
        <>
          <Upload
            beforeUpload={handleResumeUpload}
            showUploadList={false}
            accept=".pdf,.doc,.docx"
          >
            <Button icon={<UploadOutlined />} loading={parsing}>
              上传简历自动解析
            </Button>
          </Upload>
          {parsed && (
            <Alert
              type={parsed.confidence === 'high' ? 'success' : parsed.confidence === 'medium' ? 'warning' : 'info'}
              message={`解析置信度: ${parsed.confidence === 'high' ? '高' : parsed.confidence === 'medium' ? '中' : '低'}`}
              description="已自动填充下方字段，请核对后补充缺失信息"
              style={{ marginTop: 12 }}
            />
          )}
          <Divider />
        </>
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Typography.Title level={5}>基本信息</Typography.Title>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="gender" label="性别" rules={[{ required: true }]}>
            <Select style={{ width: 80 }} options={[
              { label: '男', value: '男' }, { label: '女', value: '女' }
            ]} />
          </Form.Item>
          <Form.Item name="age" label="年龄">
            <InputNumber min={18} max={65} style={{ width: 70 }} />
          </Form.Item>
          <Form.Item name="education" label="学历">
            <Select style={{ width: 90 }} options={[
              { label: '高中', value: '高中' }, { label: '大专', value: '大专' },
              { label: '本科', value: '本科' }, { label: '硕士', value: '硕士' },
              { label: '博士', value: '博士' },
            ]} />
          </Form.Item>
        </Space>

        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="phone" label="手机">
            <Input style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="current_location" label="所在地">
            <Input style={{ width: 120 }} />
          </Form.Item>
        </Space>

        <Divider />
        <Typography.Title level={5}>专业信息</Typography.Title>

        <Form.Item name="skills" label="技能标签">
          <Select mode="multiple" placeholder="选择或输入技能" options={
            SKILL_OPTIONS.map(s => ({ label: s, value: s }))
          } />
        </Form.Item>

        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="trade_experience_years" label="外贸经验(年)">
            <InputNumber min={0} max={30} style={{ width: 80 }} />
          </Form.Item>
          <Form.Item name="work_years" label="社会工龄(年)">
            <InputNumber min={0} max={40} style={{ width: 80 }} />
          </Form.Item>
          <Form.Item name="department" label="部门">
            <Select style={{ width: 130 }} options={[
              { label: '业务部', value: '业务部' }, { label: '人力资源部', value: '人力资源部' },
              { label: '渠道拓展部', value: '渠道拓展部' }, { label: '项目部', value: '项目部' },
            ]} />
          </Form.Item>
        </Space>

        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="trade_categories" label="贸易品类">
            <Select mode="multiple" style={{ minWidth: 300 }} options={[
              '纺织', '电子', '机械', '化工', '农产品', '建材', '五金', '家居', '服装', '玩具',
            ].map(s => ({ label: s, value: s }))} />
          </Form.Item>
          <Form.Item name="target_markets" label="目标市场">
            <Select mode="multiple" style={{ minWidth: 250 }} options={[
              '东南亚', '中东', '欧盟', '北美', '南美', '非洲', '日韩', '俄罗斯', '澳大利亚', '南亚',
            ].map(s => ({ label: s, value: s }))} />
          </Form.Item>
        </Space>

        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="position_applied" label="应聘岗位">
            <Input style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="position_intended" label="意向岗位">
            <Input style={{ width: 180 }} />
          </Form.Item>
        </Space>

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>取消</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {isEdit ? '保存' : '录入'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
