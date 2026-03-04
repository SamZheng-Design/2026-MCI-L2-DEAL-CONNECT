#!/usr/bin/env python3
"""
Translate all Chinese text in index.tsx to English.
This script performs targeted string replacements.
"""

import re

# Read the file
with open('src/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define all Chinese → English replacements
# Format: (old_chinese, new_english)
replacements = [
    # ============ COMMENTS (lines 1-18) ============
    ('参与通 Deal Connect — Full-Stack SPA (V2 — 筛子驱动看板)', 'Deal Connect — Full-Stack SPA (V2 — Sieve-Driven Board)'),
    ('核心逻辑：', 'Core Logic:'),
    ('发起通(Originate) → 产生所有投资机会', 'Originate → Generates all investment opportunities'),
    ('评估通(Assess)    → 提供多种AI筛子模型', 'Assess    → Provides multiple AI sieve models'),
    ('参与通(Deal)      → 投资者看板：筛后展示 + 参与决策', 'Deal      → Investor board: filtered display + deal participation'),
    ('参与通用户的工作流：', 'Deal Connect user workflow:'),
    ('1. 选择/切换评估通筛子（或不选 = 看全部）', '1. Select/switch Assess sieves (or none = view all)'),
    ('2. 浏览通过筛子的机会（来自发起通）', '2. Browse sieve-filtered opportunities (from Originate)'),
    ('3. 对感兴趣的机会表达参与意向', '3. Express interest in opportunities'),
    ('4. 追踪参与进度', '4. Track participation progress'),
    ('Brand: DEAL CONNECT / 参与通', 'Brand: DEAL CONNECT / Deal Connect'),

    # ============ API MESSAGES (lines 31-46) ============
    ("message: '用户名、邮箱和密码为必填项'", "message: 'Username, email, and password are required'"),
    ("message: '用户名或邮箱已被注册'", "message: 'Username or email already registered'"),
    ("message: '注册成功'", "message: 'Registration successful'"),
    ("message: '请输入用户名和密码'", "message: 'Please enter username and password'"),
    ("message: '用户名或密码错误'", "message: 'Invalid username or password'"),
    ("message: '登录成功'", "message: 'Login successful'"),
    ("message: '已安全退出'", "message: 'Logged out successfully'"),

    # ============ HTML HEAD (lines 55-60) ============
    ('lang="zh-CN"', 'lang="en"'),
    ('<title>参与通 Deal Connect</title>', '<title>Deal Connect</title>'),
    ('content="参与通 Deal Connect — 投资者的智能机会看板。基于评估通AI筛子，精准匹配发起通项目。"', 'content="Deal Connect — Intelligent opportunity board for investors. AI sieve-powered matching from Originate projects."'),

    # ============ CSS COMMENTS ============
    ('/* 筛子选择器专属样式 */', '/* Sieve selector styles */'),
    ('/* 匹配度指示条 */', '/* Match indicator bar */'),
    ('/* 来源标签 */', '/* Source tag */'),
    ('/* 筛子标签 */', '/* Sieve tag */'),
    ('/* 用户下拉样式 */', '/* User dropdown styles */'),
    ('/* ===== 合约卡片系统 (Fintech Card) ===== */', '/* ===== Contract Card System (Fintech Card) ===== */'),
    ('/* 移动端详情页/组合详情：左右分栏改为上下堆叠 */', '/* Mobile detail/portfolio: side-by-side to stacked layout */'),
    ('/* 搜索框快捷键提示 */', '/* Search shortcut hint */'),
    ('/* Toast容器 — 确保移动端可见 */', '/* Toast container — ensure mobile visibility */'),
    ('/* 骨架屏加载效果 */', '/* Skeleton loading effect */'),
    ('/* AI Builder 专属样式 — 深色终端青绿色系 */', '/* AI Builder styles — dark terminal teal theme */'),
    ('/* AI入口卡片动效 — 增强版 */', '/* AI entry card animation — enhanced */'),
    ('/* AI入口额外粒子层 */', '/* AI entry extra particle layer */'),
    ('/* AI入口脉冲环 */', '/* AI entry pulse ring */'),
    ('/* 导航栏AI按钮增强 */', '/* Nav bar AI button enhanced */'),
    ('/* 全局浮动AI入口 FAB */', '/* Global floating AI entry FAB */'),
    ('/* AI统计卡片增强 */', '/* AI stat card enhanced */'),
    ('/* AI入口指引提示 */', '/* AI entry guide hint */'),
    ('/* ===== 聚光灯效果：AI入口点亮 ===== */', '/* ===== Spotlight effect: AI entry highlight ===== */'),

    # ============ SPOTLIGHT & LOADING (lines 398-421) ============
    ('<!-- ===== 聚光灯遮罩层 ===== -->', '<!-- ===== Spotlight Overlay ===== -->'),
    ('✨ 试试 AI 智能组合构建器', '✨ Try the AI Portfolio Builder'),
    ('与 AI 对话 · 智能匹配 · 一键构建专属投资组合', 'Chat with AI · Smart Matching · One-Click Portfolio Building'),
    ('<i class="fas fa-hand-pointer" style="margin-right: 4px;"></i>点击任意空白处继续浏览', '<i class="fas fa-hand-pointer" style="margin-right: 4px;"></i>Click anywhere to continue browsing'),
    ('>参与通</div>', '>DEAL CONNECT</div>'),
    ('>正在初始化...</div>', '>Initializing...</div>'),

    # ============ ONBOARDING MODAL (lines 441-493) ============
    ('<!-- Step 0: 欢迎 -->', '<!-- Step 0: Welcome -->'),
    ('>欢迎使用参与通</h2>', '>Welcome to Deal Connect</h2>'),
    ('>投资者的智能机会看板 — 精准匹配，高效参与</p>', '>Intelligent opportunity board for investors — Precise matching, efficient participation</p>'),
    ('>发起通</p><p class="text-xs mt-1" style="color:#5A9A90;">机会来源</p>', '>Originate</p><p class="text-xs mt-1" style="color:#5A9A90;">Deal Source</p>'),
    ('>评估通筛子</p><p class="text-xs mt-1" style="color:#5A9A90;">AI精筛</p>', '>Assess Sieves</p><p class="text-xs mt-1" style="color:#5A9A90;">AI Filtering</p>'),
    ('>参与决策</p><p class="text-xs mt-1" style="color:#5A9A90;">你的选择</p>', '>Deal Decision</p><p class="text-xs mt-1" style="color:#5A9A90;">Your Choice</p>'),

    ('<!-- Step 1: 发起通来源 -->', '<!-- Step 1: Originate Source -->'),
    ('>数据来源</span>', '>DATA SOURCE</span>'),
    ('>机会来自发起通</h3>', '>Opportunities from Originate</h3>'),
    ('融资方通过「发起通」上传经营数据、商业计划，生成标准化的投资机会。这些机会经过平台初筛后流入参与通。', 'Fundraisers upload business data and plans through Originate, generating standardized investment opportunities. These are pre-screened before flowing into Deal Connect.'),
    ('>标准化数据</span>', '>Standardized Data</span>'),
    ('>实时更新</span>', '>Real-time Updates</span>'),

    ('<!-- Step 2: 评估通筛子 -->', '<!-- Step 2: Assess Sieves -->'),
    ('>智能筛选</span>', '>SMART FILTERING</span>'),
    ('>评估通提供AI筛子</h3>', '>AI Sieves from Assess</h3>'),
    ('评估通内置多种AI筛选模型（筛子），每个筛子有不同的评估标准。选择筛子后，只展示通过该筛子的项目；不选则看到全部。', 'Assess provides multiple AI filtering models (sieves), each with different evaluation criteria. Select a sieve to show only passing opportunities; select none to view all.'),
    ('>行业偏好</span>', '>Industry Pref.</span>'),
    ('>风控优先</span>', '>Risk-First</span>'),
    ('>高回报</span>', '>High Return</span>'),

    ('<!-- Step 3: 参与决策 -->', '<!-- Step 3: Deal Decision -->'),
    ('>投资参与</span>', '>DEAL PARTICIPATION</span>'),
    ('>筛后精准参与</h3>', '>Precise Participation After Filtering</h3>'),
    ('在筛后的高质量机会中，查看详细评估报告、对比项目，对心仪项目表达参与意向。后续流入条款通和合约通。', 'Among filtered high-quality opportunities, review detailed assessment reports, compare deals, and express interest. Next steps flow into Terms and Contracts.'),
    ('>浏览筛后</div>', '>Browse Filtered</div>'),
    ('>表达意向</div>', '>Express Interest</div>'),
    ('>进入条款</div>', '>Enter Terms</div>'),
    ('>跳过教程</button>', '>Skip Tutorial</button>'),
    ('>上一步</button>', '>Previous</button>'),
    ('>开始探索<i', '>Start Exploring<i'),

    # ============ AUTH PAGE (lines 499-554) ============
    ('>参与通</p>\n          <p class="text-xs mt-1" style="color:#5A9A90;">投资者的智能机会看板</p>', '>Deal Connect</p>\n          <p class="text-xs mt-1" style="color:#5A9A90;">Intelligent Opportunity Board for Investors</p>'),
    ('data-i18n="authLogin">登录</button>', 'data-i18n="authLogin">Login</button>'),
    ('data-i18n="authRegister">注册</button>', 'data-i18n="authRegister">Register</button>'),
    ('>用户名 / 邮箱</label>', '>Username / Email</label>'),
    ('placeholder="请输入用户名或邮箱"', 'placeholder="Enter username or email"'),
    ('>密码</label><div class="password-wrapper"', '>Password</label><div class="password-wrapper"'),
    ('placeholder="请输入密码"', 'placeholder="Enter password"'),
    ('>记住我</span>', '>Remember me</span>'),
    ("showToast('info','密码重置','此功能即将上线')\">忘记密码？</a>", "showToast('info','Password Reset','This feature is coming soon')\">Forgot password?</a>"),
    ('data-i18n="authLoginBtn">登录</span>', 'data-i18n="authLoginBtn">Login</span>'),
    ('data-i18n="authGuestBtn">游客快速体验</span>', 'data-i18n="authGuestBtn">Quick Guest Access</span>'),
    ('>企业用户</p>', '>Enterprise Users</p>'),
    ("showToast('info','SSO登录即将上线','企业统一认证接口已预留')", "showToast('info','SSO Coming Soon','Enterprise unified authentication interface reserved')"),
    ('>公司SSO登录（即将上线）</button>', '>Company SSO Login (Coming Soon)</button>'),

    # Register form
    ('>用户名 <span', '>Username <span'),
    ('placeholder="用于登录"', 'placeholder="For login"'),
    ('>姓名</label>', '>Display Name</label>'),
    ('placeholder="显示名称"', 'placeholder="Display name"'),
    ('>邮箱 <span', '>Email <span'),
    ('>手机号</label>', '>Phone</label>'),
    ('placeholder="13800138000"', 'placeholder="+1 (555) 000-0000"'),
    ('>密码 <span class="text-red-500">*</span></label><div class="password-wrapper"', '>Password <span class="text-red-500">*</span></label><div class="password-wrapper"'),
    ('placeholder="至少6位"', 'placeholder="At least 6 characters"'),
    ('>注册</button>', '>Register</button>'),
    ('&copy; 2026 参与通 Deal Connect', '&copy; 2026 Deal Connect'),

    # ============ DASHBOARD HEADER (lines 559-665) ============
    ("<!-- ==================== Page 1: Dashboard (投资者看板) ==================== -->", "<!-- ==================== Page 1: Dashboard (Investor Board) ==================== -->"),
    ('<!-- 主导航行 -->', '<!-- Main navigation row -->'),
    ('<!-- 左：品牌 + 导航 -->', '<!-- Left: Brand + Nav -->'),
    ('>参与通 · MICRO CONNECT</p>', '>DEAL CONNECT · MICRO CONNECT</p>'),
    ('<!-- 导航快捷键 Bloomberg风格 -->', '<!-- Navigation shortcuts Bloomberg-style -->'),
    ('data-i18n="navDashboard">看板</span>', 'data-i18n="navDashboard">Board</span>'),
    ('data-i18n="navContracts">合约</span>', 'data-i18n="navContracts">Contracts</span>'),
    ('data-i18n="navPortfolios">组合</span>', 'data-i18n="navPortfolios">Portfolios</span>'),
    ('<!-- 右：工具栏 -->', '<!-- Right: Toolbar -->'),
    ('data-i18n="navAIBuilder">AI 组合</span>', 'data-i18n="navAIBuilder">AI Portfolio</span>'),
    ('>中</button>', '>ZH</button>'),
    ('>用户</span>', '>User</span>'),
    ('>用户</div>', '>User</div>'),
    ('>投资者</div>', '>Investor</div>'),
    ("showToast('info','个人中心','功能开发中'); closeUserDD();\"><i class=\"fas fa-user-circle\"></i>个人中心</button>", "showToast('info','Profile','Feature under development'); closeUserDD();\"><i class=\"fas fa-user-circle\"></i>Profile</button>"),
    ("showToast('info','筛子偏好','可在评估通中管理您的筛子模型'); closeUserDD();\"><i class=\"fas fa-sliders-h\"></i>筛子偏好设置</button>", "showToast('info','Sieve Preferences','Manage your sieve models in Assess'); closeUserDD();\"><i class=\"fas fa-sliders-h\"></i>Sieve Preferences</button>"),
    ('>新手引导</button>', '>User Guide</button>'),
    ('>退出登录</button>', '>Sign Out</button>'),

    # ============ TICKER & STATS (lines 615-713) ============
    ('<!-- 数据Ticker行 — Bloomberg风格实时数据条 -->', '<!-- Data Ticker Row — Bloomberg-style live data bar -->'),
    ('data-i18n="tickerSourceVal">发起通</span>', 'data-i18n="tickerSourceVal">Originate</span>'),
    ('data-i18n="tickerFilterVal">评估通</span>', 'data-i18n="tickerFilterVal">Assess</span>'),
    ('<!-- Terminal Welcome Bar — 紧凑替代Hero Banner -->', '<!-- Terminal Welcome Bar — Compact Hero Banner -->'),
    ('data-i18n="welcomeBack">欢迎回来</h2>', 'data-i18n="welcomeBack">Welcome back</h2>'),
    ('data-i18n="welcomeSubDefault">发起通的投资机会，经您的评估通筛子精选后展示于此</p>', 'data-i18n="welcomeSubDefault">Investment opportunities from Originate, filtered by your Assess sieves</p>'),
    ('<!-- Terminal Stats — 紧凑的monospace数据卡片 -->', '<!-- Terminal Stats — Compact monospace data cards -->'),
    ('data-i18n="statContractsDesc">平台全部合约</p>', 'data-i18n="statContractsDesc">Total Platform Contracts</p>'),
    ('data-i18n="statDealsDesc">已完成交易</p>', 'data-i18n="statDealsDesc">Completed Transactions</p>'),
    ('data-i18n="statMyPosDesc">已认购张数</p>', 'data-i18n="statMyPosDesc">Subscribed Contracts</p>'),
    ('data-i18n="statPortfoliosDesc">投资组合</p>', 'data-i18n="statPortfoliosDesc">Investment Portfolios</p>'),
    ('<!-- AI BUILDER 专属卡片 -->', '<!-- AI BUILDER Card -->'),
    ('data-i18n="statAIBuilderAction">点击开始构建 →</p>', 'data-i18n="statAIBuilderAction">Start building →</p>'),

    # ============ AI ENTRY CARD (lines 717-750) ============
    ('<!-- ===== AI 组合构建器入口 — 强化版 ===== -->', '<!-- ===== AI Portfolio Builder Entry — Enhanced ===== -->'),
    ('<!-- 顶部渐变装饰线 -->', '<!-- Top gradient decoration line -->'),
    ('data-i18n="aiEntryTitle">AI 智能组合构建器</h3>', 'data-i18n="aiEntryTitle">AI Portfolio Architect</h3>'),
    ('data-i18n="aiEntryPilot">试点功能</span>', 'data-i18n="aiEntryPilot">PILOT</span>'),
    ('data-i18n="aiEntryDesc">与 AI 对话，智能匹配全平台合约 · 一键构建您的专属投资组合</p>', 'data-i18n="aiEntryDesc">Converse with AI to match contracts platform-wide · Build your personalized portfolio in one click</p>'),
    ('data-i18n="aiEntryFeature1">智能风控匹配</span>', 'data-i18n="aiEntryFeature1">Smart Risk Matching</span>'),
    ('data-i18n="aiEntryFeature2">多维度评估</span>', 'data-i18n="aiEntryFeature2">Multi-Dimension Analysis</span>'),
    ('data-i18n="aiEntryFeature3">一键认购</span>', 'data-i18n="aiEntryFeature3">One-Click Subscribe</span>'),
]

# Apply replacements
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"✅ Replaced: {old[:60]}...")
    else:
        print(f"⚠️ NOT FOUND: {old[:60]}...")

# Write back
with open('src/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Count remaining Chinese
import re
remaining = re.findall(r'[\u4e00-\u9fff]+', content)
print(f"\n📊 Total remaining Chinese fragments: {len(remaining)}")
# Show unique ones
unique_remaining = set(remaining)
print(f"📊 Unique Chinese fragments: {len(unique_remaining)}")
for fragment in sorted(unique_remaining):
    print(f"   「{fragment}」")
