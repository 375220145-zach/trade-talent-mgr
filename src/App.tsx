// ============================================================
// 路由配置
// ============================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './components/Layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import RecruitmentPage from './pages/RecruitmentPage';
import TalentPoolPage from './pages/TalentPoolPage';
import NineGridPage from './pages/NineGridPage';
import EliminationPoolPage from './pages/EliminationPoolPage';
import InterviewCalendarPage from './pages/InterviewCalendarPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter basename="/trade-talent-mgr">
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/recruitment" element={<RecruitmentPage />} />
            <Route path="/elimination-pool" element={<EliminationPoolPage />} />
            <Route path="/interview-calendar" element={<InterviewCalendarPage />} />
            <Route path="/talent-pool" element={<TalentPoolPage />} />
            <Route path="/nine-grid" element={<NineGridPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
