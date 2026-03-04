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
- **AI 智能组合构建器 V3** — 完整AI投资顾问体验
  - 🧠 **GPT-5-mini 驱动**: 真正的自然语言理解，非关键词匹配
  - 🔄 **多模式对话**: analyze(分析) / followup(追问) / adjust(调整) / explain(解说)
  - 💬 **智能追问**: 信息不足时AI主动追问（而非用默认值敷衍）
  - 📊 **置信度系统**: 高/中/低置信度可视化，用户一目了然
  - 🎯 **6维配置确认卡**: 风格/风险/收益/行业/期限/预算可编辑
  - 🧮 **5步筛选逻辑透明化**: 展示AI的完整挑选思路供用户确认
  - 📈 **组合构建后AI解说**: 自动分析组合亮点、风险和优化建议
  - 🌍 **中英文双语**: 完整的i18n支持
  - 🔒 **API安全**: 后端代理，API key不暴露到前端
  - 📡 **上下文感知**: 传递平台数据统计和组合摘要给AI
  - ⬅️ **本地NLP回退**: AI API不可用时自动切换到本地100+关键词引擎
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

## AI 智能组合构建器 — 使用指南 (V3)

### 对话流程
1. 点击导航栏「AI组合」按钮进入
2. **用自然语言描述您的投资需求**，例如：
   - 「收益够高，风险平衡」
   - 「看好科技和医疗，稳健为主，预算3万」
   - 「短期投资，不想冒太大风险」
3. AI会根据输入信息量智能决定：
   - **信息充分** → 直接生成配置确认卡（含6维度配置 + 5步筛选逻辑）
   - **信息不足** → 主动追问缺失维度（给出选项引导）
4. 确认配置后，AI从19,110+张合约中精准筛选定制组合
5. 组合生成后，AI自动给出**投资解读**（亮点/风险/优化建议）
6. 随时用自然语言微调：「风险再低一点」「去掉餐饮行业」

### AI对话模式
| Mode | 触发条件 | AI行为 |
|------|----------|--------|
| analyze | 用户提供3+维度信息 | 直接生成完整配置 |
| followup | 缺少3+关键维度 | 主动追问，展示已识别的部分偏好 |
| adjust | 已有配置，用户微调 | 只修改提到的维度，保留其他 |
| explain | 组合构建完成后 | 分析组合亮点、风险、优化方向 |

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| POST | /api/auth/logout | User logout |
| GET | /api/auth/me | Current user info |
| GET | /api/deals | Get deals list |
| **POST** | **/api/ai/chat** | **AI对话 — 分析/追问/调整** |
| **POST** | **/api/ai/chat/stream** | **AI对话(流式SSE)** |
| **POST** | **/api/ai/explain** | **AI组合解说** |
| GET | / | Main SPA page |

## Tech Stack
- **Backend**: Hono (Cloudflare Workers framework)
- **AI**: GPT-5-mini via LLM proxy (genspark.ai)
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
├── .dev.vars              # Local env (OPENAI_API_KEY, OPENAI_BASE_URL)
├── ecosystem.config.cjs   # PM2 config (local dev)
├── wrangler.jsonc          # Cloudflare Workers config
├── vite.config.ts          # Vite build config
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies & scripts
└── README.md
```

## Version History
- **SAM-V1**: 初版看板
- **SAM-V2**: 筛子驱动看板 + 我的合约/组合完整版
- **SAM-V2 + AI V1**: 本地NLP关键词匹配的AI组合构建器
- **SAM-V2 + AI V2**: 接入GPT-5-mini API，真正的自然语言理解
- **SAM-V2 + AI V3 (Current)**: 多模式对话(followup/analyze/adjust/explain) + 智能追问 + 组合解说 + 上下文感知

## Local Development

```bash
# Install & build
npm install && npm run build

# Create .dev.vars with API keys
echo "OPENAI_API_KEY=your-key" >> .dev.vars
echo "OPENAI_BASE_URL=https://..." >> .dev.vars

# Start with PM2
pm2 start ecosystem.config.cjs
# Visit http://localhost:3000
```

## Data Storage
- **Current**: In-memory (demo mode) + localStorage (client-side persistence)
- **AI**: GPT-5-mini via backend proxy (API key secured in .dev.vars / Cloudflare secrets)
- **Production-ready**: Cloudflare D1 (migration-ready)
