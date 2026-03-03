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
- 项目详情页（筛子评估报告 + 财务数据 + 项目流向）
- 参与意向表达 + 状态追踪（待参与 → 已意向 → 已确认）
- 统计面板（全部机会/筛后通过/已意向/已确认）
- AI助手聊天窗口
- 新手引导 Onboarding
- 响应式设计

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

## Local Development

### Prerequisites
- Node.js >= 18
- npm >= 9

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build

# 3. Start local dev server
npx wrangler pages dev dist --ip 0.0.0.0 --port 3000

# Open http://localhost:3000
```

### Using PM2 (recommended for persistent dev)
```bash
npm run build
pm2 start ecosystem.config.cjs
# Visit http://localhost:3000
```

### Available Scripts
```bash
npm run build          # Build with Vite
npm run dev            # Vite dev server
npm run preview        # Wrangler local preview
```

## Deploy to Cloudflare Pages

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Build
npm run build

# 3. Create project (first time only)
npx wrangler pages project create l2-deal-connect --production-branch main

# 4. Deploy
npx wrangler pages deploy dist --project-name l2-deal-connect
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
