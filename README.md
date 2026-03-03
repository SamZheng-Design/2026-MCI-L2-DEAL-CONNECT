# L2 - Deal Connect 参与通

## Project Overview
- **Name**: 参与通 Deal Connect
- **Layer**: L2 (参与层)
- **Goal**: 投资者智能机会看板 — 基于评估通AI筛子，精准匹配发起通项目
- **Brand**: DEAL CONNECT / Powered by Micro Connect Group

## Core Workflow

```
发起通(Originate) → 评估通(Assess) AI筛子 → 参与通(Deal) 投资者看板 → 条款通(Terms)
```

1. **发起通** — 融资方上传经营数据，生成标准化投资机会
2. **评估通** — 提供多种AI筛子模型（筛子库10+），用户按需选取
3. **参与通（本项目）** — 投资者看板：筛后展示 + 参与决策
4. **条款通** — 确认参与后进入条款协商

## Features

### Completed
- 登录/注册/游客模式 认证系统
- 筛子驱动的投资机会看板（筛后展示来自发起通的项目）
- **筛子管理系统**：从筛子库添加/删除筛子到个人面板
- 筛子库（10个AI筛子模型）：行业偏好、风控优先、高回报、区域聚焦、综合评估、高成长、大额项目、团队实力、短周期、稳健保守
- 动态筛子选择器（基于用户面板实时渲染）
- MCN合约编号体系 + 合约卡片看板（¥1,000/张 × 20个项目）
- 项目详情页（8维雷达图评估 + 财务数据 + 项目流向）
- 合约认购（单张 ¥1,000 不可分割）
- 我的合约页面 — 已认购合约管理
- 我的组合页面 — 20个跨项目基金型预定义组合（稳健型/进取型/平衡型/主题型/行业型）
- 组合详情页 — 加权雷达图 + 行业配比 + 持仓明细
- **AI 组合构建器（NEW - 试点）** — 对话式智能投资组合构建
  - 左侧: AI引导对话，5步流程（风格→行业→风险→期限→预算）
  - 右侧: 实时演进的组合面板（雷达图+行业配比+合约清单）
  - 支持自然语言微调（如"减少餐饮""加入更多科技"）
  - 一键认购整个组合
- AI助手聊天窗口
- 新手引导 Onboarding
- 响应式设计

### Pages & URIs
| Page | Path/Action | Description |
|------|-------------|-------------|
| 登录/注册 | `pageAuth` | 用户认证，支持游客模式 |
| 合约看板 | `pageDashboard` | 主看板，筛子选择+合约网格 |
| 合约详情 | `pageDetail` | 单张合约8维雷达评估 |
| 我的合约 | `pageMyContracts` | 已认购合约管理 |
| 我的组合 | `pageMyPortfolios` | 基金型组合列表 |
| 组合详情 | `pagePortfolioDetail` | 组合加权分析 |
| **AI组合构建器** | `pageAIBuilder` | **对话式AI智能组合构建** |

### Sieve Library (筛子库)
| Sieve | Category | Logic |
|-------|----------|-------|
| 行业偏好筛子 | 行业 | 餐饮/零售/科技行业过滤 |
| 风控优先筛子 | 风控 | AI评分>=8.5 且 金额<=800万 |
| 高回报筛子 | 收益 | 分成>=12% 且 AI评分>=8.0 |
| 区域聚焦筛子 | 区域 | 一线城市项目 |
| 综合评估筛子 | 综合 | 多维加权评估 |
| 高成长筛子 | 成长 | 运营<=3年 早期项目 |
| 大额项目筛子 | 规模 | 金额>=500万 |
| 团队实力筛子 | 团队 | 员工>=50 且 运营>=3年 |
| 短周期筛子 | 周期 | 分成期限<=24个月 |
| 稳健保守筛子 | 风控 | A级评级 + AI>=9.0 + <=500万 |

## AI 组合构建器 — 使用指南

1. 点击导航栏「AI组合」按钮进入
2. AI会逐步引导您：
   - **Step 1**: 您最看重什么？（稳定/高回报/均衡/行业聚焦）
   - **Step 2**: 偏好哪些行业？（支持多选）
   - **Step 3**: 风险承受能力？（低/中/高）
   - **Step 4**: 投资期限偏好？（短/中/长期）
   - **Step 5**: 预算规模？
3. 每步对话后，右侧面板实时更新推荐组合
4. 完成后可继续自然语言微调
5. 满意后一键认购

## Tech Stack
- **Backend**: Hono (Cloudflare Workers framework)
- **Frontend**: Tailwind CSS (CDN) + Font Awesome + Vanilla JS
- **Runtime**: Cloudflare Workers / Wrangler
- **Build**: Vite + @hono/vite-cloudflare-pages

## Project Structure
```
├── src/
│   └── index.tsx          # Main Hono app (backend + SPA HTML)
├── public/
│   └── static/
│       └── style.css      # Custom CSS styles
├── ecosystem.config.cjs   # PM2 config (local dev)
├── wrangler.jsonc          # Cloudflare Workers config
├── vite.config.ts          # Vite build config
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies & scripts
└── README.md
```

## Version History
- **SAM-V2**: 筛子驱动看板 + 我的合约/组合完整版
- **Current**: SAM-V2 + AI组合构建器试点

## Local Development

```bash
# Install & build
npm install && npm run build

# Start with PM2
pm2 start ecosystem.config.cjs
# Visit http://localhost:3000
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| POST | /api/auth/logout | User logout |
| GET | /api/auth/me | Current user info |
| GET | /api/deals | Get deals list |
| GET | / | Main SPA page |

## Data Storage
- **Current**: In-memory (demo mode) + localStorage (client-side persistence)
- **Production-ready**: Cloudflare D1 (migration-ready)

---
*L2 Deal Connect - Micro Connect Group - 2026*
