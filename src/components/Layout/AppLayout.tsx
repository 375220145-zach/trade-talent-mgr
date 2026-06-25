// ============================================================
// App 布局 — 侧边导航 + 内容区
// ============================================================

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, theme } from 'antd';
import {
  DashboardOutlined,
  UserSwitchOutlined,
  TeamOutlined,
  AppstoreOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  StopOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/recruitment', icon: <UserSwitchOutlined />, label: '招聘管道' },
  { key: '/elimination-pool', icon: <StopOutlined />, label: '淘汰池' },
  { key: '/interview-calendar', icon: <CalendarOutlined />, label: '面试日历' },
  { key: '/talent-pool', icon: <TeamOutlined />, label: '人才库' },
  { key: '/nine-grid', icon: <AppstoreOutlined />, label: '九宫格' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const selectedKey = '/' + location.pathname.split('/')[1];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={200}
        style={{
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: 'none',
        }}
      >
        <div style={{
          height: 48,
          margin: '16px 16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: collapsed ? 14 : 16,
          color: token.colorPrimary,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}>
          {collapsed ? 'TM' : '人才管理系统'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'center',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <span style={{ marginLeft: 16, fontSize: 14, color: token.colorTextSecondary }}>
            Demo · 演示版本 · 数据存储在浏览器本地
          </span>
        </Header>
        <Content style={{
          padding: 24,
          overflow: 'auto',
          background: token.colorBgLayout,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
