# 人才管理系统 Demo

外贸初创企业人才管理系统功能演示原型。纯前端 SPA，数据存储在浏览器本地（IndexedDB），无需服务器。

## 功能模块

### 招聘管道
- 简历录入（手动 / PDF 上传自动解析）
- HR 审核 → 合适/不合适/储备池
- 两轮面试管道（HR 面试 → 业务面试 → Offer → 入职）
- 表格视图 + Kanban 看板双模式

### 人才库
- 内部人才分类管理（在岗/储备/淘汰/预淘汰/关键岗）
- 储备池 A/B/C 三级分级
- 核心技能标签、匹配评价、亮点/风险备注

### 人才九宫格
- 3×3 绩效×潜力矩阵
- 9 个格位：淘汰对象/一般人员/熟练工/待改进者/中坚人员/绩效之星/待提升者/潜力之星/明星
- 拖拽落位 + 点击穿透查看

### Dashboard 看板
- 员工性别分析（环形图）
- 各部门员工人数（柱状图）
- 员工学历分析（饼状图）
- 员工年龄分析（横向柱状图）
- 员工工龄分析（横向柱状图）
- 按部门/库类型全局筛选

## 快速启动

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:5173/trade-talent-mgr/

## 构建部署

```bash
npm run build    # 输出到 dist/
```

静态文件可直接部署到任何静态托管服务（GitHub Pages / Cloudflare Pages / OSS 等）。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| UI 组件 | Ant Design 5 |
| 图表 | ECharts 5 |
| 数据存储 | Dexie.js (IndexedDB) |
| PDF 解析 | pdf.js (client-side) |
| 路由 | React Router 6 |

## 给接手全栈的说明

这是一个**纯前端 Demo**，所有数据存在浏览器 IndexedDB 中。转为生产系统需要：

1. **后端 API**：将 Dexie.js CRUD 替换为 REST/GraphQL API 调用
2. **数据库**：候选人表、用户表、日志表（参考 `src/db/schema.ts` 数据模型）
3. **认证**：添加登录/权限控制（Demo 无认证）
4. **文件存储**：简历 PDF 上传 → 对象存储（Demo 只做文本提取，不存文件）
5. **部署**：选阿里云/腾讯云国内 Region，需要 ICP 备案

数据模型完整定义在 `src/db/schema.ts`，状态流转规则在 `src/utils/status-engine.ts`。前端组件可直接复用。

## License

Private — 为外贸初创企业定制开发
