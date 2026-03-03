/**
 * ===================================================================
 * 参与通 Deal Connect — Full-Stack SPA (V2 — 筛子驱动看板)
 * ===================================================================
 * 核心逻辑：
 *   发起通(Originate) → 产生所有投资机会
 *   评估通(Assess)    → 提供多种AI筛子模型
 *   参与通(Deal)      → 投资者看板：筛后展示 + 参与决策
 *
 * 参与通用户的工作流：
 *   1. 选择/切换评估通筛子（或不选 = 看全部）
 *   2. 浏览通过筛子的机会（来自发起通）
 *   3. 对感兴趣的机会表达参与意向
 *   4. 追踪参与进度
 *
 * Brand: DEAL CONNECT / 参与通
 * Powered by Micro Connect Group
 */
import { Hono } from 'hono'

const app = new Hono()

/* ============================
   API Routes (Backend)
   ============================ */

const users: Map<string, any> = new Map()

app.post('/api/auth/register', async (c) => {
  const { username, email, password, displayName, phone, role } = await c.req.json()
  if (!username || !email || !password) return c.json({ success: false, message: '用户名、邮箱和密码为必填项' }, 400)
  if (users.has(username) || [...users.values()].find(u => u.email === email)) return c.json({ success: false, message: '用户名或邮箱已被注册' }, 409)
  const user = { id: 'U_' + Date.now(), username, email, password, displayName: displayName || username, phone, role: role || 'investor', createdAt: new Date().toISOString() }
  users.set(username, user)
  return c.json({ success: true, user: { ...user, password: undefined }, message: '注册成功' })
})

app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json()
  if (!username || !password) return c.json({ success: false, message: '请输入用户名和密码' }, 400)
  const user = users.get(username) || [...users.values()].find(u => u.email === username)
  if (!user || user.password !== password) return c.json({ success: false, message: '用户名或密码错误' }, 401)
  return c.json({ success: true, user: { ...user, password: undefined }, message: '登录成功' })
})

app.post('/api/auth/logout', (c) => c.json({ success: true, message: '已安全退出' }))
app.get('/api/auth/me', (c) => c.json({ success: true, user: null }))
app.get('/api/deals', (c) => c.json({ success: true, deals: [] }))

/* ============================
   Main HTML Page (SPA)
   ============================ */
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>参与通 Deal Connect</title>
  <meta name="description" content="参与通 Deal Connect — 投资者的智能机会看板。基于评估通AI筛子，精准匹配发起通项目。">
  <meta name="theme-color" content="#0a2e2a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='64' y2='64'%3E%3Cstop offset='0%25' stop-color='%232EC4B6'/%3E%3Cstop offset='100%25' stop-color='%2328A696'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M20 20 L44 32 L20 44 Z' fill='white' opacity='0.95'/%3E%3C/svg%3E">
  <link rel="dns-prefetch" href="https://cdn.tailwindcss.com">
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  <link rel="preconnect" href="https://cdn.tailwindcss.com" crossorigin>
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <link href="/static/style.css" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.5; background: #f5f5f7; color: #1d1d1f; -webkit-font-smoothing: antialiased; letter-spacing: -0.01em; }
    .hidden { display: none !important; }
    .page { display: none; }
    .page.active { display: flex; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
    /* 筛子选择器专属样式 */
    .sieve-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; border: 1.5px solid rgba(0,0,0,0.08); background: white; cursor: pointer; transition: all 0.25s cubic-bezier(0.28,0.11,0.32,1); white-space: nowrap; }
    .sieve-chip:hover { border-color: rgba(93,196,179,0.4); background: rgba(93,196,179,0.04); transform: translateY(-1px); }
    .sieve-chip.active { border-color: #2EC4B6; background: linear-gradient(135deg, rgba(93,196,179,0.1), rgba(73,168,154,0.08)); color: #0f766e; box-shadow: 0 2px 8px rgba(46,196,182,0.2); }
    .sieve-chip.active i { color: #2EC4B6; }
    /* 匹配度指示条 */
    .match-bar { height: 3px; border-radius: 2px; background: #e5e7eb; overflow: hidden; }
    .match-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
    /* 来源标签 */
    .source-tag { display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; }
    .source-originate { background: rgba(245,158,11,0.1); color: #b45309; }
    /* 筛子标签 */
    .sieve-tag { display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .sieve-pass { background: rgba(16,185,129,0.1); color: #047857; }
    .sieve-fail { background: rgba(239,68,68,0.1); color: #b91c1c; }
    /* 用户下拉样式 */
    .user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 240px; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04); z-index: 100; opacity: 0; transform: translateY(-8px) scale(0.96); pointer-events: none; transition: all 0.2s cubic-bezier(0.28,0.11,0.32,1); }
    .user-dropdown.show { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .user-dropdown-header { padding: 16px; border-bottom: 1px solid #f1f5f9; }
    .user-dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; font-size: 13px; font-weight: 500; color: #374151; transition: all 0.15s; cursor: pointer; background: none; border: none; text-align: left; }
    .user-dropdown-item:hover { background: #f8fafc; color: #0f766e; }
    .user-dropdown-item.danger:hover { background: #fef2f2; color: #dc2626; }
    .user-dropdown-divider { height: 1px; background: #f1f5f9; margin: 4px 0; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">

  <!-- ==================== Loading Screen ==================== -->
  <div id="app-loading">
    <div style="width:56px; height:72px; position:relative; margin-bottom:8px;">
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6 0%, #3DD8CA 100%); position:absolute; top:0; left:4px; box-shadow: 0 4px 20px rgba(46,196,182,0.4); animation: pulse 2s ease-in-out infinite;"></div>
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, #28A696 0%, #2EC4B6 100%); position:absolute; bottom:0; left:4px; box-shadow: 0 4px 20px rgba(40,166,150,0.35); opacity:0.85; animation: pulse 2s ease-in-out infinite 0.3s;"></div>
    </div>
    <div class="loading-text" style="font-family:'Montserrat',sans-serif; font-weight:900; letter-spacing:0.05em;">DEAL CONNECT</div>
    <div class="loading-sub" style="font-size:14px; letter-spacing:0.15em; margin-top:4px;">参与通</div>
    <div class="loading-sub" id="loadingStatus" style="margin-top:12px;">正在初始化...</div>
    <div style="width: 200px; height: 3px; background: rgba(255,255,255,0.15); border-radius: 99px; margin-top: 16px; overflow: hidden;">
      <div id="loadingBar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #2EC4B6, #3DD8CA); border-radius: 99px; transition: width 0.4s ease;"></div>
    </div>
    <div style="margin-top:24px; font-size:9px; letter-spacing:0.2em; color:rgba(255,255,255,0.4); font-family:'Montserrat',sans-serif;">POWERED BY MICRO CONNECT GROUP</div>
  </div>

  <!-- ==================== Onboarding Modal ==================== -->
  <div id="onboardingModal" class="hidden fixed inset-0 bg-black/60 onboarding-modal flex items-center justify-center z-[300]">
    <div class="onboarding-card bg-white rounded-3xl max-w-2xl w-full mx-4 overflow-hidden">
      <div class="relative h-48 overflow-hidden" style="background: linear-gradient(135deg, #5DC4B3 0%, #49A89A 50%, #32ade6 100%);">
        <div class="absolute inset-0 pattern-bg"></div>
        <button onclick="closeOnboarding()" class="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all"><i class="fas fa-times"></i></button>
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <button onclick="goToOBStep(0)" class="step-dot w-2.5 h-2.5 rounded-full bg-white/50 active" data-step="0"></button>
          <button onclick="goToOBStep(1)" class="step-dot w-2.5 h-2.5 rounded-full bg-white/50" data-step="1"></button>
          <button onclick="goToOBStep(2)" class="step-dot w-2.5 h-2.5 rounded-full bg-white/50" data-step="2"></button>
          <button onclick="goToOBStep(3)" class="step-dot w-2.5 h-2.5 rounded-full bg-white/50" data-step="3"></button>
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="animate-float"><div class="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center"><i id="obIcon" class="fas fa-filter text-white text-4xl"></i></div></div>
        </div>
      </div>
      <div class="p-8 relative overflow-hidden" style="min-height: 280px;">
        <!-- Step 0: 欢迎 -->
        <div id="obStep0" class="ob-step active text-center">
          <h2 class="text-2xl font-bold text-gray-900 mb-3">欢迎使用参与通</h2>
          <p class="text-gray-500 mb-8">投资者的智能机会看板 — 精准匹配，高效参与</p>
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="p-4 bg-amber-50 rounded-2xl"><div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3"><i class="fas fa-paper-plane text-amber-600 text-xl"></i></div><p class="text-sm font-medium text-gray-700">发起通</p><p class="text-xs text-gray-400 mt-1">机会来源</p></div>
            <div class="p-4 bg-cyan-50 rounded-2xl"><div class="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-3"><i class="fas fa-filter text-cyan-600 text-xl"></i></div><p class="text-sm font-medium text-gray-700">评估通筛子</p><p class="text-xs text-gray-400 mt-1">AI精筛</p></div>
            <div class="p-4 bg-teal-50 rounded-2xl"><div class="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3"><i class="fas fa-hand-pointer text-teal-600 text-xl"></i></div><p class="text-sm font-medium text-gray-700">参与决策</p><p class="text-xs text-gray-400 mt-1">你的选择</p></div>
          </div>
        </div>
        <!-- Step 1: 发起通来源 -->
        <div id="obStep1" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200"><i class="fas fa-paper-plane text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold text-amber-600 uppercase tracking-wide">数据来源</span><h3 class="text-xl font-bold text-gray-900 mt-1 mb-3">机会来自发起通</h3><p class="text-gray-500 mb-4">融资方通过「发起通」上传经营数据、商业计划，生成标准化的投资机会。这些机会经过平台初筛后流入参与通。</p>
              <div class="flex items-center space-x-4 text-sm"><div class="flex items-center text-gray-400"><i class="fas fa-check-circle text-amber-500 mr-2"></i><span>标准化数据</span></div><div class="flex items-center text-gray-400"><i class="fas fa-check-circle text-amber-500 mr-2"></i><span>实时更新</span></div></div>
            </div>
          </div>
        </div>
        <!-- Step 2: 评估通筛子 -->
        <div id="obStep2" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-200"><i class="fas fa-filter text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold text-cyan-600 uppercase tracking-wide">智能筛选</span><h3 class="text-xl font-bold text-gray-900 mt-1 mb-3">评估通提供AI筛子</h3><p class="text-gray-500 mb-4">评估通内置多种AI筛选模型（筛子），每个筛子有不同的评估标准。选择筛子后，只展示通过该筛子的项目；不选则看到全部。</p>
              <div class="flex flex-wrap gap-2">
                <span class="sieve-chip active"><i class="fas fa-brain"></i>行业偏好</span>
                <span class="sieve-chip"><i class="fas fa-shield-alt"></i>风控优先</span>
                <span class="sieve-chip"><i class="fas fa-chart-line"></i>高回报</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Step 3: 参与决策 -->
        <div id="obStep3" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200"><i class="fas fa-hand-pointer text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold text-teal-600 uppercase tracking-wide">投资参与</span><h3 class="text-xl font-bold text-gray-900 mt-1 mb-3">筛后精准参与</h3><p class="text-gray-500 mb-4">在筛后的高质量机会中，查看详细评估报告、对比项目，对心仪项目表达参与意向。后续流入条款通和合约通。</p>
              <div class="flex items-center space-x-3">
                <div class="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium"><i class="fas fa-eye mr-1"></i>浏览筛后</div>
                <i class="fas fa-arrow-right text-gray-300"></i>
                <div class="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium"><i class="fas fa-hand-point-up mr-1"></i>表达意向</div>
                <i class="fas fa-arrow-right text-gray-300"></i>
                <div class="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-medium"><i class="fas fa-file-contract mr-1"></i>进入条款</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="px-8 pb-8 flex items-center justify-between">
        <button onclick="closeOnboarding()" class="text-sm text-gray-400 hover:text-gray-600 transition-colors">跳过教程</button>
        <div class="flex items-center space-x-3">
          <button id="obPrev" onclick="obPrev()" class="hidden px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all"><i class="fas fa-arrow-left mr-2"></i>上一步</button>
          <button id="obNext" onclick="obNext()" class="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 transition-all font-medium">开始探索<i class="fas fa-arrow-right ml-2"></i></button>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 0: Login / Register ==================== -->
  <div id="pageAuth" class="page active flex-col min-h-screen cyber-bg particles-bg">
    <div class="flex-1 flex items-center justify-center p-4 relative z-10">
      <div class="bg-white rounded-3xl max-w-md w-full overflow-hidden animate-scale-in" style="box-shadow: 0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08);">
        <div class="p-8 text-center" style="border-bottom: 1px solid rgba(0,0,0,0.06);">
          <div class="mx-auto mb-5 animate-float" style="width:52px; height:68px; position:relative;">
            <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6 0%, #3DD8CA 100%); position:absolute; top:0; left:4px; box-shadow: 0 4px 16px rgba(46,196,182,0.35);"></div>
            <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #28A696 0%, #2EC4B6 100%); position:absolute; bottom:0; left:4px; box-shadow: 0 4px 16px rgba(40,166,150,0.3); opacity:0.85;"></div>
          </div>
          <h1 style="font-family:'Montserrat',sans-serif; font-weight:900; font-size:22px; letter-spacing:0.04em; color:#1a1a1a; line-height:1.15; margin-bottom:6px;">DEAL<br>CONNECT</h1>
          <div style="width:120px; height:2.5px; background:#2EC4B6; margin:8px auto 10px; border-radius:2px;"></div>
          <p style="font-family:'Montserrat',sans-serif; font-size:9px; letter-spacing:0.2em; color:#666; font-weight:500;">POWERED BY MICRO CONNECT GROUP</p>
          <p class="text-lg font-bold mt-3" style="color:#1a1a1a;">参与通</p>
          <p class="text-xs text-gray-400 mt-1">投资者的智能机会看板</p>
        </div>
        <div class="flex" style="border-bottom: 1px solid rgba(0,0,0,0.06);">
          <button onclick="switchAuthTab('login')" id="tabLogin" class="flex-1 py-3 text-center font-semibold" style="color:#2EC4B6; border-bottom: 2px solid #2EC4B6;">登录</button>
          <button onclick="switchAuthTab('register')" id="tabRegister" class="flex-1 py-3 text-center font-semibold" style="color:#86868b;">注册</button>
        </div>
        <!-- Login Form -->
        <div id="formLogin" class="p-6">
          <form onsubmit="event.preventDefault(); handleLogin();" autocomplete="on">
          <div class="space-y-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">用户名 / 邮箱</label><input type="text" id="loginUsername" placeholder="请输入用户名或邮箱" autocomplete="username" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" onkeydown="if(event.key==='Enter')document.getElementById('loginPassword').focus()"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">密码</label><div class="password-wrapper" style="position:relative;"><input type="password" id="loginPassword" placeholder="请输入密码" autocomplete="current-password" class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"><button type="button" onclick="togglePwdVis('loginPassword', this)" class="password-toggle" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#9ca3af;cursor:pointer;padding:4px;"><i class="fas fa-eye"></i></button></div></div>
            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center text-gray-600 cursor-pointer whitespace-nowrap"><input type="checkbox" id="rememberMe" class="mr-2 rounded" style="width:16px;height:16px;flex-shrink:0;"><span>记住我</span></label>
              <a href="#" class="text-teal-600 hover:text-teal-700" onclick="event.preventDefault(); showToast('info','密码重置','此功能即将上线')">忘记密码？</a>
            </div>
            <button type="submit" class="w-full py-3 btn-primary rounded-xl font-medium shadow-lg"><i class="fas fa-sign-in-alt mr-2"></i>登录</button>
            <button type="button" onclick="handleGuestLogin()" class="w-full py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"><i class="fas fa-user-secret mr-2"></i>游客模式（体验功能）</button>
          </div>
          <p id="loginError" class="hidden mt-4 text-sm text-red-500 text-center"></p>
          </form>
          <div class="mt-6 pt-6 border-t border-gray-100">
            <p class="text-xs text-gray-400 text-center mb-3">企业用户</p>
            <button onclick="showToast('info','SSO登录即将上线','企业统一认证接口已预留')" class="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"><i class="fas fa-building mr-2"></i>公司SSO登录（即将上线）</button>
          </div>
        </div>
        <!-- Register Form -->
        <div id="formRegister" class="hidden p-6">
          <form onsubmit="event.preventDefault(); handleRegister();" autocomplete="on">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm font-medium text-gray-700 mb-1">用户名 <span class="text-red-500">*</span></label><input type="text" id="regUsername" placeholder="用于登录" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">姓名</label><input type="text" id="regDisplayName" placeholder="显示名称" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"></div>
            </div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">邮箱 <span class="text-red-500">*</span></label><input type="email" id="regEmail" placeholder="your@email.com" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">手机号</label><input type="tel" id="regPhone" placeholder="13800138000" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">密码 <span class="text-red-500">*</span></label><div class="password-wrapper" style="position:relative;"><input type="password" id="regPassword" placeholder="至少6位" autocomplete="new-password" class="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"><button type="button" onclick="togglePwdVis('regPassword', this)" class="password-toggle" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#9ca3af;cursor:pointer;padding:4px;"><i class="fas fa-eye"></i></button></div></div>
            <button type="submit" class="w-full py-3 btn-primary rounded-xl font-medium shadow-lg"><i class="fas fa-user-plus mr-2"></i>注册</button>
          </div>
          <p id="regError" class="hidden mt-4 text-sm text-red-500 text-center"></p>
          </form>
        </div>
        <div class="px-6 pb-4 text-center"><p class="text-xs text-gray-400">&copy; 2026 参与通 Deal Connect · Micro Connect Group</p></div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 1: Dashboard (投资者看板) ==================== -->
  <div id="pageDashboard" class="page flex-col min-h-screen grid-bg">
    <!-- Navbar -->
    <nav class="px-5 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div style="width:32px; height:36px; position:relative; flex-shrink:0;">
            <div style="width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6, #3DD8CA); position:absolute; top:0; left:3px;"></div>
            <div style="width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg, #28A696, #2EC4B6); position:absolute; bottom:0; left:3px; opacity:0.85;"></div>
          </div>
          <div>
            <h1 class="text-base font-bold tracking-tight" style="color:#1a1a1a;">参与通</h1>
            <p class="text-xs -mt-0.5" style="color:#86868b; font-family:'Montserrat',sans-serif; letter-spacing:0.05em; font-weight:600; font-size:9px;">DEAL CONNECT</p>
          </div>
        </div>
        <div class="flex items-center space-x-1.5">
          <button onclick="goToContracts()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: #0f766e; background: rgba(46,196,182,0.08); border: 1px solid rgba(46,196,182,0.2);" data-tip="合约看板"><i class="fas fa-file-contract"></i><span>合约看板</span></button>
          <div class="h-5 mx-0.5" style="width: 1px; background: rgba(0,0,0,0.08);"></div>
          <button onclick="showOnboarding()" class="tooltip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: #6b7280; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.06);" data-tip="新手引导"><i class="fas fa-question-circle text-xs"></i><span>帮助</span></button>
          <div class="h-5 mx-0.5" style="width: 1px; background: rgba(0,0,0,0.08);"></div>
          <button onclick="showToast('info','AI推荐引擎','正在基于您的筛子偏好生成推荐')" class="tooltip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: #49A89A; background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.12);" data-tip="AI推荐"><i class="fas fa-robot"></i><span>推荐</span></button>
          <!-- User avatar -->
          <div class="pl-1.5 ml-0.5 relative">
            <button onclick="toggleUserDD(event)" id="navUserBtn" class="flex items-center space-x-2 px-2 py-1.5 rounded-full transition-all" style="background: rgba(0,0,0,0.02);" onmouseover="this.style.background='rgba(93,196,179,0.08)'" onmouseout="this.style.background='rgba(0,0,0,0.02)'">
              <div id="navAvatar" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background: linear-gradient(135deg, #5DC4B3, #3D8F83); box-shadow: 0 2px 8px rgba(93,196,179,0.3);">U</div>
              <span id="navName" class="text-xs font-semibold max-w-[70px] truncate" style="color: #374151;">用户</span>
              <i class="fas fa-chevron-down text-xs" style="color: #9ca3af; font-size: 10px;"></i>
            </button>
            <div id="userDropdown" class="user-dropdown">
              <div class="user-dropdown-header"><div class="flex items-center space-x-3"><div id="ddAvatar" class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style="background: linear-gradient(135deg, #5DC4B3, #3D8F83);">U</div><div><div id="ddName" class="font-semibold text-gray-900 text-sm">用户</div><div id="ddRole" class="text-xs text-gray-500">投资者</div></div></div></div>
              <div class="py-1">
                <button class="user-dropdown-item" onclick="showToast('info','个人中心','功能开发中'); closeUserDD();"><i class="fas fa-user-circle"></i>个人中心</button>
                <button class="user-dropdown-item" onclick="showToast('info','筛子偏好','可在评估通中管理您的筛子模型'); closeUserDD();"><i class="fas fa-sliders-h"></i>筛子偏好设置</button>
                <button class="user-dropdown-item" onclick="showOnboarding(); closeUserDD();"><i class="fas fa-graduation-cap"></i>新手引导</button>
                <div class="user-dropdown-divider"></div>
                <button class="user-dropdown-item danger" onclick="closeUserDD(); handleLogout();"><i class="fas fa-sign-out-alt"></i>退出登录</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <div class="flex-1 p-4">
      <div class="max-w-7xl mx-auto">
        <!-- Hero Banner -->
        <div class="relative overflow-hidden rounded-2xl mb-5 p-6" style="background: linear-gradient(135deg, #0a2e2a 0%, #0f3d36 40%, #164e47 100%);">
          <div class="absolute inset-0" style="background: radial-gradient(ellipse at 70% 30%, rgba(93,196,179,0.35) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(46,196,182,0.2) 0%, transparent 50%); pointer-events:none;"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-white mb-1" style="letter-spacing: -0.02em;" id="welcomeText">欢迎回来</h2>
              <p class="text-sm" style="color: rgba(255,255,255,0.6);">发起通的投资机会，经您的评估通筛子精选后展示于此</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block">
                <p class="text-xs" style="color:rgba(255,255,255,0.4);">数据来源</p>
                <p class="text-sm font-semibold text-amber-300"><i class="fas fa-paper-plane mr-1"></i>发起通 Originate</p>
              </div>
              <div class="w-px h-10 bg-white/10 hidden sm:block"></div>
              <div class="text-right hidden sm:block">
                <p class="text-xs" style="color:rgba(255,255,255,0.4);">筛选引擎</p>
                <p class="text-sm font-semibold text-cyan-300"><i class="fas fa-filter mr-1"></i>评估通 Assess</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div class="stat-card animate-fade-in cursor-pointer" onclick="selectSieve('all')">
            <div class="flex items-center justify-between"><div><p class="stat-label">全部机会</p><p class="stat-value" id="statTotal">0</p><p class="text-xs text-gray-400 mt-0.5">来自发起通</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 4px 12px rgba(245,158,11,0.3);"><i class="fas fa-paper-plane text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-100 cursor-pointer" onclick="selectSieve('all')">
            <div class="flex items-center justify-between"><div><p class="stat-label">筛后通过</p><p class="stat-value" id="statFiltered">0</p><p class="text-xs text-gray-400 mt-0.5">当前筛子匹配</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); box-shadow: 0 4px 12px rgba(6,182,212,0.3);"><i class="fas fa-filter text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-200 cursor-pointer">
            <div class="flex items-center justify-between"><div><p class="stat-label">我的认购</p><p class="stat-value" id="statMyUnits">0</p><p class="text-xs text-gray-400 mt-0.5">已认购份数</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 12px rgba(16,185,129,0.3);"><i class="fas fa-file-contract text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-300 cursor-pointer">
            <div class="flex items-center justify-between"><div><p class="stat-label">投入金额</p><p class="stat-value" id="statMyAmount">0</p><p class="text-xs text-gray-400 mt-0.5">¥1000/份</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); box-shadow: 0 4px 12px rgba(139,92,246,0.3);"><i class="fas fa-yen-sign text-white text-sm"></i></div></div>
          </div>
        </div>

        <!-- ===== 筛子选择器 (核心新功能) ===== -->
        <div class="bg-white rounded-2xl p-4 mb-4 border border-gray-100" style="box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.12));"><i class="fas fa-filter text-cyan-600 text-sm"></i></div>
              <div>
                <h3 class="text-sm font-bold text-gray-800">评估通 · AI筛子</h3>
                <p class="text-xs text-gray-400">选择筛子模型过滤机会，不选则展示全部</p>
              </div>
            </div>
            <button onclick="showSieveManager()" class="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-cyan-50 transition-colors"><i class="fas fa-cogs mr-1"></i>管理筛子</button>
          </div>
          <div class="flex flex-wrap gap-2" id="sieveSelector">
            <!-- 动态渲染 by renderSieveSelector() -->
          </div>
          <!-- 筛子说明 -->
          <div id="sieveDescription" class="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 hidden">
            <i class="fas fa-info-circle text-cyan-500 mr-1"></i>
            <span id="sieveDescText">选择筛子后查看说明</span>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-2">
            <h2 class="text-base font-bold text-gray-800">投资机会</h2>
            <span id="filterLabel" class="text-xs text-gray-400 font-medium">· 展示全部</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="relative"><input type="text" id="dealSearch" placeholder="搜索项目名称…" class="search-input px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white w-48" oninput="renderDeals()"></div>
            <select class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" id="filterStatus" onchange="renderDeals()">
              <option value="all">全部状态</option>
              <option value="open">待参与</option>
              <option value="interested">已意向</option>
              <option value="confirmed">已确认</option>
              <option value="closed">已关闭</option>
            </select>
          </div>
        </div>

        <!-- Deal Grid -->
        <div id="dealGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"></div>

        <!-- Empty State -->
        <div id="emptyState" class="hidden py-6 animate-fade-in">
          <div class="max-w-3xl mx-auto">
            <div class="text-center mb-6">
              <div class="empty-state-icon mx-auto animate-float"><i class="fas fa-filter"></i></div>
              <h3 class="text-xl font-bold text-gray-800 mb-2" style="letter-spacing:-0.02em;">等待发起通的投资机会</h3>
              <p class="text-sm text-gray-500">机会由融资方通过发起通上传，经评估通筛子过滤后展示于此</p>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-6">
              <button onclick="loadDemoData()" class="group text-left p-5 rounded-2xl border transition-all" style="background: rgba(255,255,255,0.9); border-color: rgba(0,0,0,0.06);" onmouseover="this.style.borderColor='rgba(52,199,89,0.3)';this.style.boxShadow='0 8px 32px rgba(52,199,89,0.08)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(0,0,0,0.06)';this.style.boxShadow='none';this.style.transform='none'">
                <div class="w-12 h-12 icon-container icon-container-lg icon-gradient-success mb-4 group-hover:scale-105 transition-transform" style="border-radius:16px;"><i class="fas fa-database text-white text-lg"></i></div>
                <h4 class="font-bold text-gray-800 mb-1 text-base">加载演示数据</h4>
                <p class="text-sm text-gray-500 leading-relaxed">体验完整功能，查看模拟的发起通项目经筛子过滤后的效果</p>
              </button>
              <div class="text-left p-5 rounded-2xl border" style="background: rgba(255,255,255,0.9); border-color: rgba(0,0,0,0.06);">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style="background: linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.12));"><i class="fas fa-filter text-cyan-600 text-lg"></i></div>
                <h4 class="font-bold text-gray-800 mb-1 text-base">配置您的筛子</h4>
                <p class="text-sm text-gray-500 leading-relaxed">在评估通中设置您的AI筛选标准，让参与通自动展示匹配机会</p>
              </div>
            </div>
            <div class="rounded-2xl p-5 border" style="background: rgba(255,255,255,0.8); border-color: rgba(0,0,0,0.04);">
              <h4 class="text-xs font-bold uppercase tracking-wider mb-4" style="color: #86868b;"><i class="fas fa-route mr-1.5" style="color: #5DC4B3;"></i>数据流向</h4>
              <div class="flex items-center justify-center gap-3 flex-wrap">
                <div class="flex items-center gap-2 px-4 py-2.5 bg-amber-50 rounded-xl"><i class="fas fa-paper-plane text-amber-500"></i><span class="text-sm font-semibold text-amber-700">发起通</span></div>
                <i class="fas fa-long-arrow-alt-right text-gray-300"></i>
                <div class="flex items-center gap-2 px-4 py-2.5 bg-cyan-50 rounded-xl"><i class="fas fa-filter text-cyan-500"></i><span class="text-sm font-semibold text-cyan-700">评估通筛子</span></div>
                <i class="fas fa-long-arrow-alt-right text-gray-300"></i>
                <div class="flex items-center gap-2 px-4 py-2.5 bg-teal-50 rounded-xl border-2 border-teal-200"><i class="fas fa-hand-pointer text-teal-500"></i><span class="text-sm font-bold text-teal-700">参与通（此页）</span></div>
                <i class="fas fa-long-arrow-alt-right text-gray-300"></i>
                <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl"><i class="fas fa-file-contract text-gray-400"></i><span class="text-sm font-semibold text-gray-500">条款通</span></div>
              </div>
            </div>
            <p class="mt-4 text-xs text-gray-400"><i class="fas fa-question-circle mr-1"></i>首次使用？<button onclick="showOnboarding()" class="text-teal-500 hover:text-teal-600 underline font-medium">查看新手引导</button></p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 2: Contract Board (合约看板) ==================== -->
  <div id="pageContracts" class="page flex-col min-h-screen grid-bg">
    <nav class="px-5 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div style="width:32px; height:36px; position:relative; flex-shrink:0;">
            <div style="width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6, #3DD8CA); position:absolute; top:0; left:3px;"></div>
            <div style="width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg, #28A696, #2EC4B6); position:absolute; bottom:0; left:3px; opacity:0.85;"></div>
          </div>
          <div>
            <h1 class="text-base font-bold tracking-tight" style="color:#1a1a1a;">合约看板</h1>
            <p class="text-xs -mt-0.5" style="color:#86868b; font-family:'Montserrat',sans-serif; letter-spacing:0.05em; font-weight:600; font-size:9px;">CONTRACT BOARD · MCN</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="goToDashboard()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: #6b7280; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.06);"><i class="fas fa-th-large"></i><span>项目看板</span></button>
          <button onclick="goToContracts()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: white; background: linear-gradient(135deg, #2EC4B6, #06b6d4); border: 1px solid transparent;"><i class="fas fa-file-contract"></i><span>合约看板</span></button>
        </div>
      </div>
    </nav>

    <div class="flex-1 p-4">
      <div class="max-w-7xl mx-auto">
        <!-- MCN 编号体系说明 Banner -->
        <div class="relative overflow-hidden rounded-2xl mb-5 p-5" style="background: linear-gradient(135deg, #0c2d4a 0%, #0f3d36 40%, #164e47 100%);">
          <div class="absolute inset-0" style="background: radial-gradient(ellipse at 70% 30%, rgba(6,182,212,0.3) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(46,196,182,0.2) 0%, transparent 50%); pointer-events:none;"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-0.5 rounded text-xs font-bold" style="background: rgba(46,196,182,0.2); color: #5DC4B3; letter-spacing: 0.05em;">MCN SYSTEM</span>
                <span class="text-xs" style="color: rgba(255,255,255,0.4);">Micro Connect Note</span>
              </div>
              <h2 class="text-lg font-bold text-white mb-1">合约编号看板</h2>
              <p class="text-xs" style="color: rgba(255,255,255,0.5);">每张合约拥有唯一MCN编号（身份证），贯穿一级认购、二级转让全生命周期</p>
            </div>
            <div class="hidden sm:flex items-center gap-4">
              <div class="text-center">
                <p class="text-xl font-black text-white" id="contractStatTotal">0</p>
                <p class="text-xs" style="color: rgba(255,255,255,0.4);">合约总数</p>
              </div>
              <div class="w-px h-10 bg-white/10"></div>
              <div class="text-center">
                <p class="text-xl font-black text-cyan-300" id="contractStatActive">0</p>
                <p class="text-xs" style="color: rgba(255,255,255,0.4);">活跃合约</p>
              </div>
              <div class="w-px h-10 bg-white/10"></div>
              <div class="text-center">
                <p class="text-xl font-black text-amber-300" id="contractStatMy">0</p>
                <p class="text-xs" style="color: rgba(255,255,255,0.4);">我的持仓</p>
              </div>
            </div>
          </div>
        </div>

        <!-- MCN 编号说明卡片（可折叠） -->
        <div class="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden" style="box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <button onclick="toggleMCNExplainer()" class="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.12));"><i class="fas fa-info-circle text-cyan-600 text-xs"></i></div>
              <span class="text-sm font-bold text-gray-700">MCN编号规则</span>
              <span class="px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded text-xs font-medium">合约身份证</span>
            </div>
            <i id="mcnExplainerArrow" class="fas fa-chevron-down text-gray-300 text-xs transition-transform"></i>
          </button>
          <div id="mcnExplainer" class="hidden border-t border-gray-100 p-4">
            <div class="flex items-center gap-3 mb-3">
              <div class="flex-1 p-3 bg-slate-50 rounded-xl font-mono text-center">
                <p class="text-lg font-black tracking-wider" style="color: #0f766e;">MCN-FB-HZ-2602-0001</p>
              </div>
            </div>
            <div class="grid grid-cols-5 gap-2 text-center">
              <div class="p-2 bg-teal-50 rounded-lg"><p class="text-xs font-bold text-teal-700">MCN</p><p class="text-xs text-gray-400 mt-0.5">前缀</p><p class="text-xs text-gray-500">Micro Connect Note</p></div>
              <div class="p-2 bg-amber-50 rounded-lg"><p class="text-xs font-bold text-amber-700">FB</p><p class="text-xs text-gray-400 mt-0.5">行业</p><p class="text-xs text-gray-500">餐饮 F&B</p></div>
              <div class="p-2 bg-blue-50 rounded-lg"><p class="text-xs font-bold text-blue-700">HZ</p><p class="text-xs text-gray-400 mt-0.5">城市</p><p class="text-xs text-gray-500">杭州</p></div>
              <div class="p-2 bg-purple-50 rounded-lg"><p class="text-xs font-bold text-purple-700">2602</p><p class="text-xs text-gray-400 mt-0.5">年月</p><p class="text-xs text-gray-500">2026年2月</p></div>
              <div class="p-2 bg-rose-50 rounded-lg"><p class="text-xs font-bold text-rose-700">0001</p><p class="text-xs text-gray-400 mt-0.5">序号</p><p class="text-xs text-gray-500">批次唯一编号</p></div>
            </div>
            <p class="text-xs text-gray-400 mt-3"><i class="fas fa-shield-alt text-teal-500 mr-1"></i>MCN编号在合约生命周期内保持不变 — 无论一级认购还是二级市场转让，编号就是这张合约的「身份证」</p>
          </div>
        </div>

        <!-- 筛选工具栏 -->
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div class="flex items-center space-x-2">
            <h2 class="text-base font-bold text-gray-800"><i class="fas fa-file-contract mr-1.5 text-teal-500"></i>全部合约</h2>
            <span id="contractFilterLabel" class="text-xs text-gray-400 font-medium">· 展示全部</span>
          </div>
          <div class="flex items-center space-x-2 flex-wrap">
            <div class="relative"><input type="text" id="contractSearch" placeholder="搜索MCN编号/项目名…" class="search-input px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white w-52" oninput="renderContractBoard()"></div>
            <select class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" id="contractFilterIndustry" onchange="renderContractBoard()">
              <option value="all">全部行业</option>
              <option value="餐饮">餐饮 FB</option>
              <option value="零售">零售 RT</option>
              <option value="演艺">演艺 EN</option>
              <option value="教育">教育 ED</option>
              <option value="健康">健康 HC</option>
              <option value="科技">科技 TC</option>
            </select>
            <select class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" id="contractFilterStatus" onchange="renderContractBoard()">
              <option value="all">全部状态</option>
              <option value="open">待认购</option>
              <option value="interested">已意向</option>
              <option value="confirmed">已确认</option>
              <option value="closed">已关闭</option>
            </select>
            <select class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" id="contractSortBy" onchange="renderContractBoard()">
              <option value="mcn">按MCN编号</option>
              <option value="aiScore">按AI评分</option>
              <option value="amount">按金额</option>
              <option value="revenueShare">按分成比例</option>
              <option value="soldPct">按认购进度</option>
            </select>
            <div class="flex bg-gray-100 rounded-lg p-0.5">
              <button onclick="setContractView('table')" id="btnViewTable" class="px-2.5 py-1 rounded-md text-xs font-semibold bg-white shadow text-teal-600"><i class="fas fa-table"></i></button>
              <button onclick="setContractView('card')" id="btnViewCard" class="px-2.5 py-1 rounded-md text-xs font-semibold text-gray-500"><i class="fas fa-th-large"></i></button>
            </div>
          </div>
        </div>

        <!-- 合约列表（表格视图） -->
        <div id="contractTableView">
          <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden" style="box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-100" style="background: linear-gradient(135deg, #f8fffe, #f0fdfa);">
                    <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">MCN 编号</th>
                    <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">合约名称</th>
                    <th class="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">行业</th>
                    <th class="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">城市</th>
                    <th class="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">总额</th>
                    <th class="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">分成</th>
                    <th class="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">期限</th>
                    <th class="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">AI评分</th>
                    <th class="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">风控</th>
                    <th class="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">认购进度</th>
                    <th class="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">我的持仓</th>
                    <th class="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">状态</th>
                    <th class="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody id="contractTableBody">
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 合约列表（卡片视图） -->
        <div id="contractCardView" class="hidden">
          <div id="contractCardGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          </div>
        </div>

        <!-- 合约空状态 -->
        <div id="contractEmpty" class="hidden py-8">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style="background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(46,196,182,0.1));"><i class="fas fa-file-contract text-2xl text-teal-400"></i></div>
            <h3 class="text-lg font-bold text-gray-700 mb-1">暂无合约数据</h3>
            <p class="text-sm text-gray-400 mb-4">请先加载演示数据或等待发起通提交新合约</p>
            <button onclick="loadDemoData(); goToContracts(); renderContractBoard();" class="px-5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium"><i class="fas fa-database mr-1.5"></i>加载演示数据</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 3: Deal Detail ==================== -->
  <div id="pageDetail" class="page flex-col h-screen grid-bg">
    <nav class="px-4 py-2.5 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goBack()" class="back-btn flex items-center px-2.5 py-1.5 text-gray-600 hover:text-teal-600 rounded-lg text-sm"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium">返回</span></button>
          <div class="border-l border-gray-200 pl-3">
            <div class="flex items-center space-x-2"><span id="detailMCN" class="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded" style="background: linear-gradient(135deg, #ecfdf5, #ecfeff); color: #0f766e; border: 1px solid rgba(46,196,182,0.15);">MCN-XX-XX-0000-0000</span><h1 class="font-bold text-gray-900 text-sm" id="detailTitle">项目名称</h1><span id="detailStatus" class="badge badge-warning">待参与</span></div>
            <p class="text-xs text-gray-500"><span class="source-tag source-originate"><i class="fas fa-paper-plane"></i>发起通</span> <span id="detailIndustry">行业</span> · <span id="detailDate">日期</span></p>
          </div>
        </div>
        <div class="flex items-center space-x-1.5">
          <button onclick="showToast('info','分享','分享链接已复制')" class="tooltip p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 text-sm" data-tip="分享"><i class="fas fa-share-alt"></i></button>
          <button onclick="showToast('info','收藏','已添加到收藏夹')" class="tooltip p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 text-sm" data-tip="收藏"><i class="fas fa-bookmark"></i></button>
          <div class="w-px h-6 bg-gray-200 mx-1"></div>
          <button onclick="expressIntent()" id="btnExpressIntent" class="btn-primary text-xs py-1.5 px-4" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);"><i class="fas fa-hand-point-up mr-1"></i>我要参与</button>
        </div>
      </div>
    </nav>
    <div class="flex flex-1 overflow-hidden">
      <!-- Left: Deal Info -->
      <div class="w-2/5 border-r border-gray-200 flex flex-col bg-white overflow-y-auto">
        <div class="p-5" id="detailLeft">
          <div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><p class="text-sm">加载中...</p></div>
        </div>
      </div>
      <!-- Right: Analysis (筛子评估结果) -->
      <div class="w-3/5 flex flex-col bg-slate-50 overflow-y-auto">
        <div class="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
          <div class="flex items-center space-x-2"><span class="text-sm font-semibold text-gray-700"><i class="fas fa-chart-pie mr-1.5 text-teal-500"></i>合约评估</span></div>
          <div class="flex bg-gray-100 rounded-lg p-0.5">
            <button onclick="switchDetailView('sieve')" id="btnSieve" class="px-2.5 py-1 rounded-md text-xs font-semibold bg-white shadow text-teal-600"><i class="fas fa-crosshairs mr-1"></i>雷达评估</button>
            <button onclick="switchDetailView('financials')" id="btnFinancials" class="px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600"><i class="fas fa-calculator mr-1"></i>财务</button>
            <button onclick="switchDetailView('timeline')" id="btnTimeline" class="px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600"><i class="fas fa-stream mr-1"></i>时间线</button>
          </div>
        </div>
        <div class="flex-1 p-5" id="detailRight">
          <div class="text-center py-16 text-gray-400"><i class="fas fa-chart-area text-4xl mb-3 opacity-40"></i><p class="text-sm">选择一个项目查看筛子评估报告</p></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Confirm Dialog ==================== -->
  <div id="confirmModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]">
    <div class="bg-white rounded-2xl max-w-sm w-full mx-4 overflow-hidden animate-scale-in">
      <div class="confirm-dialog" style="padding:32px; text-align:center;">
        <div id="confirmIcon" class="confirm-icon warning" style="width:56px;height:56px;margin:0 auto 16px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(245,158,11,0.1);"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:24px;"></i></div>
        <h3 id="confirmTitle" class="text-lg font-bold text-gray-900 mb-2">确认操作</h3>
        <p id="confirmMessage" class="text-sm text-gray-500 mb-6">确定要执行此操作吗？</p>
        <div class="flex gap-3 justify-center"><button onclick="hideConfirm()" class="btn-secondary rounded-xl px-5 py-2">取消</button><button id="confirmAction" onclick="hideConfirm()" class="btn-primary rounded-xl px-5 py-2">确认</button></div>
      </div>
    </div>
  </div>

  <!-- ==================== AI Assistant FAB ==================== -->
  <div id="aiFab" class="ai-assistant-fab hidden" onclick="toggleAIChat()"><i class="fas fa-robot"></i></div>
  <div id="aiChat" class="ai-chat-window hidden">
    <div class="ai-chat-header"><div class="flex items-center space-x-2"><i class="fas fa-robot text-white"></i><span class="text-white font-semibold text-sm">Deal Connect AI 助手</span></div><button onclick="toggleAIChat()" class="text-white/80 hover:text-white"><i class="fas fa-times"></i></button></div>
    <div class="ai-chat-messages" id="aiMessages">
      <div class="ai-message assistant"><div class="ai-message-avatar"><i class="fas fa-robot"></i></div><div class="ai-message-content">您好！我是参与通AI助手。您可以问我关于筛子模型、项目评估、参与流程等问题。</div></div>
    </div>
    <div class="ai-chat-input" style="padding:16px; border-top:1px solid #f1f5f9;">
      <div class="flex items-center gap-2">
        <input type="text" id="aiInput" placeholder="例如：哪个筛子适合我？" class="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" onkeydown="if(event.key==='Enter')sendAIMsg()">
        <button onclick="sendAIMsg()" class="btn-primary px-3 py-2 rounded-xl text-sm"><i class="fas fa-paper-plane"></i></button>
      </div>
    </div>
  </div>

  <!-- ==================== JavaScript ==================== -->
  <script>
    // ==================== State ====================
    let currentUser = null;
    let allDeals = [];  // 所有来自发起通的机会（原始数据）
    let dealsList = []; // 当前筛子过滤后的机会
    let currentDeal = null;
    let currentSieve = 'all'; // 当前选中的筛子
    let obStep = 0;

    // ==================== 筛子库（全量可用筛子）====================
    const SIEVE_LIBRARY = {
      industry: {
        name: '行业偏好筛子', icon: 'fa-brain', color: '#8b5cf6', category: '行业',
        desc: '基于您的行业投资偏好（餐饮、零售、科技），筛选符合行业方向的项目',
        preferredIndustries: ['餐饮', '零售', '科技'],
        filter: function(deals) {
          return deals.map(d => {
            const match = this.preferredIndustries.includes(d.industry);
            return { ...d, matchScore: match ? 75 + Math.floor(Math.random() * 25) : 15 + Math.floor(Math.random() * 30), sieveResult: match ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      risk: {
        name: '风控优先筛子', icon: 'fa-shield-alt', color: '#10b981', category: '风控',
        desc: '严格风控标准：AI评分>=8.5、金额<=800万、有明确退出机制的低风险项目',
        filter: function(deals) {
          return deals.map(d => {
            const score = parseFloat(d.aiScore);
            const amt = d.amount / 10000;
            const pass = score >= 8.5 && amt <= 800;
            return { ...d, matchScore: pass ? 80 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 25), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      'return': {
        name: '高回报筛子', icon: 'fa-chart-line', color: '#f59e0b', category: '收益',
        desc: '聚焦高回报项目：分成比例>=12%、AI评分>=8.0的高潜力机会',
        filter: function(deals) {
          return deals.map(d => {
            const share = parseInt(d.revenueShare);
            const score = parseFloat(d.aiScore);
            const pass = share >= 12 && score >= 8.0;
            return { ...d, matchScore: pass ? 82 + Math.floor(Math.random() * 18) : 25 + Math.floor(Math.random() * 20), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      location: {
        name: '区域聚焦筛子', icon: 'fa-map-marker-alt', color: '#ef4444', category: '区域',
        desc: '聚焦一线城市（北京、上海、深圳、杭州）的优质项目',
        focusCities: ['北京', '上海', '深圳', '杭州'],
        filter: function(deals) {
          return deals.map(d => {
            const match = this.focusCities.includes(d.location);
            return { ...d, matchScore: match ? 70 + Math.floor(Math.random() * 30) : 10 + Math.floor(Math.random() * 25), sieveResult: match ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      composite: {
        name: '综合评估筛子', icon: 'fa-layer-group', color: '#06b6d4', category: '综合',
        desc: '多维度综合评估：AI评分、行业前景、风控等级、回报潜力的加权筛选',
        filter: function(deals) {
          return deals.map(d => {
            const score = parseFloat(d.aiScore);
            const share = parseInt(d.revenueShare);
            const composite = (score / 10) * 40 + (share / 20) * 30 + (Math.random() * 30);
            const pass = composite >= 55;
            return { ...d, matchScore: Math.min(99, Math.floor(composite)), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      // ---- 筛子库扩展筛子 ----
      growth: {
        name: '高成长筛子', icon: 'fa-seedling', color: '#22c55e', category: '成长',
        desc: '优选运营年限<=3年、月营收增速良好的高成长型早期项目',
        filter: function(deals) {
          return deals.map(d => {
            const years = parseFloat(d.operatingYears);
            const score = parseFloat(d.aiScore);
            const pass = years <= 3 && score >= 7.5;
            return { ...d, matchScore: pass ? 78 + Math.floor(Math.random() * 22) : 18 + Math.floor(Math.random() * 25), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      largeScale: {
        name: '大额项目筛子', icon: 'fa-gem', color: '#a855f7', category: '规模',
        desc: '筛选投资金额>=500万的大体量、高门槛优质项目',
        filter: function(deals) {
          return deals.map(d => {
            const amt = d.amount / 10000;
            const pass = amt >= 500;
            return { ...d, matchScore: pass ? 72 + Math.floor(Math.random() * 28) : 12 + Math.floor(Math.random() * 25), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      teamStrength: {
        name: '团队实力筛子', icon: 'fa-users', color: '#0ea5e9', category: '团队',
        desc: '优选员工>=50人、运营年限>=3年的成熟团队项目',
        filter: function(deals) {
          return deals.map(d => {
            const emp = d.employeeCount || 0;
            const years = parseFloat(d.operatingYears);
            const pass = emp >= 50 && years >= 3;
            return { ...d, matchScore: pass ? 75 + Math.floor(Math.random() * 25) : 15 + Math.floor(Math.random() * 28), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      quickReturn: {
        name: '短周期筛子', icon: 'fa-bolt', color: '#eab308', category: '周期',
        desc: '聚焦分成期限<=24个月的快速回收项目',
        filter: function(deals) {
          return deals.map(d => {
            const months = parseInt(d.period);
            const pass = months <= 24;
            return { ...d, matchScore: pass ? 80 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 22), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      safeHaven: {
        name: '稳健保守筛子', icon: 'fa-umbrella', color: '#64748b', category: '风控',
        desc: '极保守策略：风控评级A及以上、AI评分>=9.0、金额<=500万',
        filter: function(deals) {
          return deals.map(d => {
            const score = parseFloat(d.aiScore);
            const amt = d.amount / 10000;
            const grade = d.riskGrade || '';
            const pass = score >= 9.0 && amt <= 500 && (grade.startsWith('A'));
            return { ...d, matchScore: pass ? 88 + Math.floor(Math.random() * 12) : 8 + Math.floor(Math.random() * 20), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      }
    };

    // 「全部机会」内置筛子（不可删除）
    const SIEVE_ALL = {
      name: '全部机会', icon: 'fa-globe', color: '#6b7280',
      desc: '不使用筛子，展示发起通的所有投资机会',
      filter: (deals) => deals.map(d => ({ ...d, matchScore: null, sieveResult: 'all' }))
    };

    // 用户面板筛子（从筛子库中选取的键名列表）
    let mySieves = [];

    // 初始化用户筛子面板
    function initMySieves() {
      const saved = localStorage.getItem('ec_mySieves');
      if (saved) {
        try { mySieves = JSON.parse(saved).filter(k => SIEVE_LIBRARY[k]); } catch(e) { mySieves = []; }
      }
      if (mySieves.length === 0) {
        // 默认预装3个筛子
        mySieves = ['industry', 'risk', 'composite'];
        saveMySieves();
      }
    }
    function saveMySieves() {
      localStorage.setItem('ec_mySieves', JSON.stringify(mySieves));
    }

    // 构建当前可用的筛子模型（all + mySieves中的）
    function getActiveSieveModels() {
      const models = { all: SIEVE_ALL };
      mySieves.forEach(key => {
        if (SIEVE_LIBRARY[key]) models[key] = SIEVE_LIBRARY[key];
      });
      return models;
    }

    // ==================== Toast System ====================
    function initToastContainer() {
      if (!document.getElementById('toastContainer')) {
        const c = document.createElement('div'); c.id = 'toastContainer'; c.className = 'toast-container'; document.body.appendChild(c);
      }
    }
    function showToast(typeOrMsg, titleOrType, message, duration) {
      const validTypes = ['success', 'error', 'warning', 'info'];
      let type, title;
      if (validTypes.includes(typeOrMsg)) { type = typeOrMsg; title = titleOrType || ''; }
      else { type = validTypes.includes(titleOrType) ? titleOrType : 'info'; title = typeOrMsg || ''; message = ''; }
      initToastContainer();
      const container = document.getElementById('toastContainer');
      const icons = { success: 'fas fa-check-circle', error: 'fas fa-times-circle', warning: 'fas fa-exclamation-triangle', info: 'fas fa-info-circle' };
      duration = duration || (type === 'error' ? 5000 : 3000);
      const toast = document.createElement('div'); toast.className = 'toast toast-' + type;
      toast.innerHTML = '<div class="toast-icon"><i class="' + (icons[type]||icons.info) + '"></i></div><div class="toast-body"><div class="toast-title">' + title + '</div>' + (message ? '<div class="toast-message">' + message + '</div>' : '') + '</div><button class="toast-close" onclick="this.parentElement.classList.add(\\'toast-exit\\'); setTimeout(() => this.parentElement.remove(), 300);"><i class="fas fa-times"></i></button><div class="toast-progress" style="animation-duration: ' + duration + 'ms;"></div>';
      container.appendChild(toast);
      setTimeout(() => { if (toast.parentElement) { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); } }, duration);
    }

    // ==================== Utilities ====================
    function togglePwdVis(id, btn) {
      const inp = document.getElementById(id); if (!inp) return;
      const icon = btn.querySelector('i');
      if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
      else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
    }

    function switchPage(pageId) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const page = document.getElementById(pageId); if (page) page.classList.add('active');
      const fab = document.getElementById('aiFab'); if (fab) fab.classList.toggle('hidden', pageId === 'pageAuth');
      // 记住上一页用于返回
      if (pageId !== 'pageDetail') window._lastPage = pageId;
    }

    // ==================== Auth ====================
    function switchAuthTab(tab) {
      const tl = document.getElementById('tabLogin'), tr = document.getElementById('tabRegister');
      const fl = document.getElementById('formLogin'), fr = document.getElementById('formRegister');
      if (tab === 'login') {
        tl.style.color = '#2EC4B6'; tl.style.borderBottom = '2px solid #2EC4B6';
        tr.style.color = '#86868b'; tr.style.borderBottom = 'none';
        fl.classList.remove('hidden'); fr.classList.add('hidden');
      } else {
        tr.style.color = '#2EC4B6'; tr.style.borderBottom = '2px solid #2EC4B6';
        tl.style.color = '#86868b'; tl.style.borderBottom = 'none';
        fr.classList.remove('hidden'); fl.classList.add('hidden');
      }
    }

    async function handleLogin() {
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!username || !password) { showToast('warning', '请填写完整', '用户名和密码不能为空'); return; }
      try {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await res.json();
        if (data.success) { currentUser = data.user; onLoginSuccess(); }
        else { showToast('error', '登录失败', data.message); }
      } catch (e) { showToast('error', '网络错误', '请检查网络连接'); }
    }

    async function handleRegister() {
      const username = document.getElementById('regUsername').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const displayName = document.getElementById('regDisplayName').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      if (!username || !email || !password) { showToast('warning', '请填写必填项'); return; }
      if (password.length < 6) { showToast('warning', '密码过短', '密码至少6位'); return; }
      try {
        const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, displayName, phone, role: 'investor' }) });
        const data = await res.json();
        if (data.success) { showToast('success', '注册成功', '欢迎加入参与通！'); switchAuthTab('login'); document.getElementById('loginUsername').value = username; }
        else { showToast('error', '注册失败', data.message); }
      } catch (e) { showToast('error', '网络错误'); }
    }

    function handleGuestLogin() {
      currentUser = { id: 'guest', username: 'guest', displayName: '游客', email: 'guest@demo.com', role: 'investor' };
      loadDemoData();
      onLoginSuccess();
      showToast('info', '游客模式', '已加载 ' + allDeals.length + ' 张合约 · MCN编号已分配');
    }

    function onLoginSuccess() {
      const name = currentUser?.displayName || currentUser?.username || '用户';
      const initial = name.charAt(0).toUpperCase();
      document.getElementById('navAvatar').textContent = initial;
      document.getElementById('navName').textContent = name;
      document.getElementById('ddAvatar').textContent = initial;
      document.getElementById('ddName').textContent = name;
      document.getElementById('ddRole').textContent = '投资者';
      document.getElementById('welcomeText').textContent = '欢迎回来，' + name;
      switchPage('pageDashboard');
      initMySieves();
      renderSieveSelector();
      selectSieve('all');
      showToast('success', '登录成功', '欢迎回来，' + name);
      if (!localStorage.getItem('ec_onboarded')) { setTimeout(showOnboarding, 800); }
    }

    function handleLogout() { currentUser = null; switchPage('pageAuth'); showToast('info', '已退出', '您已安全退出账号'); }

    // ==================== User Dropdown ====================
    function toggleUserDD(e) { e.stopPropagation(); document.getElementById('userDropdown').classList.toggle('show'); }
    function closeUserDD() { document.getElementById('userDropdown').classList.remove('show'); }
    document.addEventListener('click', (e) => { if (!e.target.closest('#navUserBtn') && !e.target.closest('#userDropdown')) closeUserDD(); });

    // ==================== MCN 合约编号体系 ====================
    // MCN = Micro Connect Note
    // 格式: MCN-{行业2位}-{城市2位}-{年月4位}-{序号4位}
    // 例: MCN-FB-HZ-2602-0001
    const INDUSTRY_CODES = { '餐饮': 'FB', '零售': 'RT', '演艺': 'EN', '教育': 'ED', '健康': 'HC', '科技': 'TC', '金融': 'FI', '地产': 'RE', '物流': 'LG', '农业': 'AG' };
    const CITY_CODES = { '杭州': 'HZ', '深圳': 'SZ', '北京': 'BJ', '上海': 'SH', '成都': 'CD', '广州': 'GZ', '天津': 'TJ', '全国': 'CN', '香港': 'HK', '澳门': 'MO' };

    function generateMCN(industry, city, dateStr, seqNum) {
      const indCode = INDUSTRY_CODES[industry] || 'XX';
      const cityCode = CITY_CODES[city] || 'XX';
      const d = new Date(dateStr);
      const yearMonth = String(d.getFullYear()).slice(-2) + String(d.getMonth() + 1).padStart(2, '0');
      const seq = String(seqNum).padStart(4, '0');
      return 'MCN-' + indCode + '-' + cityCode + '-' + yearMonth + '-' + seq;
    }

    // 从MCN编号解析信息
    function parseMCN(mcn) {
      const parts = mcn.split('-');
      if (parts.length !== 5 || parts[0] !== 'MCN') return null;
      const indName = Object.keys(INDUSTRY_CODES).find(k => INDUSTRY_CODES[k] === parts[1]) || '未知';
      const cityName = Object.keys(CITY_CODES).find(k => CITY_CODES[k] === parts[2]) || '未知';
      const ym = parts[3];
      return { prefix: 'MCN', industryCode: parts[1], cityCode: parts[2], yearMonth: ym, year: '20' + ym.slice(0,2), month: ym.slice(2), seq: parts[4], industryName: indName, cityName: cityName };
    }

    // ==================== Demo Data (模拟发起通数据) ====================
    function loadDemoData() {
      const industries = ['餐饮','零售','演艺','教育','健康','科技','餐饮','零售','科技','餐饮','教育','健康'];
      const names = [
        '星巴克杭州新店','瑞幸深圳旗舰店','周杰伦2026巡演','新东方AI学堂',
        '美年健康体检中心','字节跳动AI Lab','海底捞成都总店','泡泡玛特北京旗舰',
        '喜茶上海概念店','太二酸菜鱼广州店','猿辅导天津中心','和睦家北京诊所'
      ];
      const locations = ['杭州','深圳','全国','北京','上海','北京','成都','北京','上海','广州','天津','北京'];
      const originators = ['杭州星巴克运营方','深圳瑞幸加盟商','演艺经纪公司','新东方教育集团','美年大健康集团','字节跳动投融部','海底捞运营总部','泡泡玛特品牌方','喜茶(深圳)公司','太二餐饮管理','猿辅导科技','和睦家医疗'];
      // 固定的发行日期 — 确保MCN编号在每次加载时保持一致
      const issueDates = ['2026-02-01','2026-02-03','2026-01-15','2026-02-10','2026-01-20','2026-02-14','2026-01-25','2026-02-05','2026-02-08','2026-01-28','2026-02-12','2026-02-18'];
      // 固定金额 — 确保份数不变
      const amounts = [480, 650, 920, 380, 550, 780, 420, 310, 570, 690, 450, 520]; // 万元

      allDeals = names.map((name, i) => {
        const amount = amounts[i] * 10000;
        const unitPrice = 1000; // 每份标准1000元
        const totalUnits = Math.floor(amount / unitPrice);
        const soldPercent = [0.35, 0.52, 0.68, 0.18, 0.42, 0.61, 0.28, 0.45, 0.55, 0.38, 0.22, 0.48][i];
        const soldUnits = Math.floor(totalUnits * soldPercent);
        const mcn = generateMCN(industries[i], locations[i], issueDates[i], i + 1);
        return {
          id: 'D_' + (1000 + i),
          mcn,  // 合约唯一身份编号 — 终身不变
          name,
          industry: industries[i],
          amount,
          unitPrice,
          totalUnits,
          soldUnits,
          myUnits: 0, // 当前用户认购份数
          aiScore: [8.5, 7.8, 9.2, 7.5, 8.8, 9.0, 8.2, 7.6, 8.7, 8.0, 7.3, 9.1][i].toFixed(1),
          status: 'open',
          revenueShare: [12, 8, 18, 10, 14, 15, 11, 7, 13, 9, 10, 16][i] + '%',
          period: [24, 36, 18, 30, 24, 36, 24, 30, 20, 28, 36, 24][i] + '个月',
          location: locations[i],
          originator: originators[i],
          originateDate: issueDates[i],
          issueDate: issueDates[i], // 合约发行日
          maturityDate: null, // 到期日（根据period计算）
          description: '由「' + originators[i] + '」通过发起通提交的' + industries[i] + '行业投资机会。已通过平台基础审核。',
          riskGrade: ['A+','A','A','A-','B+','A+','A-','B+','A','B+','A-','A'][i],
          monthlyRevenue: [120, 85, 230, 65, 150, 180, 95, 60, 140, 110, 75, 160][i] + '万',
          employeeCount: [45, 38, 12, 85, 62, 95, 55, 28, 42, 35, 70, 50][i],
          operatingYears: [3.5, 2.1, 8.0, 5.2, 4.8, 6.0, 7.5, 1.5, 2.8, 3.0, 4.0, 6.5][i].toFixed(1),
          contractType: 'RSN', // Revenue Sharing Note 收益分享合约
          currency: 'CNY'
        };
      });
      // 计算到期日
      allDeals.forEach(d => {
        const monthsNum = parseInt(d.period);
        const issue = new Date(d.issueDate);
        issue.setMonth(issue.getMonth() + monthsNum);
        d.maturityDate = issue.toISOString().slice(0, 10);
      });
      localStorage.setItem('ec_allDeals', JSON.stringify(allDeals));
    }

    // ==================== 合约多维度评估体系 ====================
    // 8个维度：YITO年化收益率、合约时长适配度、收入稳定性、风控评级、流动性、团队实力、市场潜力、AI综合评分
    const RADAR_DIMENSIONS = [
      { key: 'yield', label: 'YITO年化收益率', icon: 'fa-percentage', color: '#f59e0b', desc: '基于分成比例和期限折算的年化投资回报率（YITO模型）' },
      { key: 'duration', label: '合约时长适配度', icon: 'fa-clock', color: '#06b6d4', desc: '合约期限合理性评估，12-30个月为最优区间' },
      { key: 'stability', label: '收入稳定性', icon: 'fa-wave-square', color: '#8b5cf6', desc: '基于月营收数据推算的收入波动系数，越低越稳' },
      { key: 'riskCtrl', label: '风控评级', icon: 'fa-shield-alt', color: '#10b981', desc: '综合风控等级评估，含信用风险、运营风险、市场风险' },
      { key: 'liquidity', label: '流动性', icon: 'fa-exchange-alt', color: '#3b82f6', desc: '份额认购热度及二级市场潜在可转让性' },
      { key: 'team', label: '团队实力', icon: 'fa-users', color: '#ec4899', desc: '团队规模、运营年限、管理层经验综合评估' },
      { key: 'market', label: '市场潜力', icon: 'fa-chart-area', color: '#14b8a6', desc: '所在行业景气度与目标城市经济活力加权' },
      { key: 'aiScore', label: 'AI综合评分', icon: 'fa-robot', color: '#f97316', desc: 'AI大模型对合约多维度因子的综合信用打分' }
    ];

    // 根据deal数据计算各维度分数 (0-100)
    function calcRadarScores(deal) {
      if (!deal) return RADAR_DIMENSIONS.map(() => 50);

      // 1. YITO年化收益率 — 分成比例越高、期限适中 => 年化越高
      const shareNum = parseInt(deal.revenueShare) || 10;
      const periodNum = parseInt(deal.period) || 24;
      const annualYield = (shareNum / periodNum) * 12; // 简化年化
      const yieldScore = Math.min(100, Math.max(15, Math.round(annualYield * 8 + 10)));

      // 2. 合约时长适配度 — 12-30个月为最优，偏离扣分
      let durationScore;
      if (periodNum >= 12 && periodNum <= 30) durationScore = 75 + Math.round((1 - Math.abs(periodNum - 21) / 9) * 25);
      else if (periodNum < 12) durationScore = Math.max(30, 75 - (12 - periodNum) * 5);
      else durationScore = Math.max(25, 75 - (periodNum - 30) * 3);

      // 3. 收入稳定性 — 用月营收和行业推算
      const revenue = parseInt(deal.monthlyRevenue) || 100;
      const stableIndustries = ['餐饮', '健康', '教育'];
      const isStable = stableIndustries.includes(deal.industry);
      const stabilityScore = Math.min(95, Math.max(30, Math.round(50 + (isStable ? 20 : -5) + (revenue > 100 ? 15 : revenue > 50 ? 8 : 0) + Math.random() * 12)));

      // 4. 风控评级 — 直接映射
      const riskMap = { 'A+': 95, 'A': 82, 'A-': 72, 'B+': 58, 'B': 45, 'B-': 35, 'C': 20 };
      const riskCtrlScore = riskMap[deal.riskGrade] || 50;

      // 5. 流动性 — 认购进度越高说明越受欢迎（但过高也意味着份额紧张）
      const soldPct = deal.totalUnits > 0 ? deal.soldUnits / deal.totalUnits : 0;
      const liquidityScore = Math.min(95, Math.max(25, Math.round(
        soldPct < 0.3 ? 40 + soldPct * 80 :
        soldPct < 0.7 ? 65 + (soldPct - 0.3) * 50 :
        85 + (1 - soldPct) * 30
      )));

      // 6. 团队实力 — 员工数+运营年限
      const emp = deal.employeeCount || 30;
      const years = parseFloat(deal.operatingYears) || 2;
      const teamScore = Math.min(95, Math.max(20, Math.round(
        (Math.min(emp, 100) / 100) * 45 + (Math.min(years, 8) / 8) * 45 + 10
      )));

      // 7. 市场潜力 — 行业+城市
      const hotIndustries = { '科技': 92, '健康': 85, '教育': 78, '餐饮': 72, '零售': 65, '演艺': 60 };
      const hotCities = { '北京': 15, '上海': 14, '深圳': 13, '杭州': 12, '广州': 10, '成都': 8, '全国': 11, '天津': 7 };
      const marketScore = Math.min(98, Math.max(30, (hotIndustries[deal.industry] || 60) + (hotCities[deal.location] || 5)));

      // 8. AI综合评分 — 直接用aiScore*10
      const aiScoreVal = Math.min(100, Math.max(20, Math.round(parseFloat(deal.aiScore) * 10)));

      return [yieldScore, durationScore, stabilityScore, riskCtrlScore, liquidityScore, teamScore, marketScore, aiScoreVal];
    }

    // 计算综合得分（加权平均）
    function calcOverallScore(scores) {
      const weights = [0.20, 0.08, 0.15, 0.18, 0.08, 0.10, 0.10, 0.11]; // 权重：收益>风控>稳定性>AI>团队=市场>时长=流动
      let total = 0, wSum = 0;
      scores.forEach((s, i) => { total += s * weights[i]; wSum += weights[i]; });
      return Math.round(total / wSum);
    }

    // 评分等级判定
    function getScoreGrade(score) {
      if (score >= 85) return { grade: 'S', label: '卓越', color: '#059669', bg: 'rgba(5,150,105,0.1)' };
      if (score >= 75) return { grade: 'A', label: '优秀', color: '#0d9488', bg: 'rgba(13,148,136,0.1)' };
      if (score >= 65) return { grade: 'B+', label: '良好', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' };
      if (score >= 55) return { grade: 'B', label: '中等', color: '#d97706', bg: 'rgba(217,119,6,0.1)' };
      if (score >= 40) return { grade: 'C', label: '偏低', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' };
      return { grade: 'D', label: '风险', color: '#991b1b', bg: 'rgba(153,27,27,0.1)' };
    }

    // ==================== Canvas 雷达图绘制 ====================
    function drawRadarChart(canvasId, scores, options = {}) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const size = options.size || 280;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      ctx.scale(dpr, dpr);

      const cx = size / 2;
      const cy = size / 2;
      const maxR = (size / 2) - 40;
      const dims = RADAR_DIMENSIONS;
      const n = dims.length;
      const angleStep = (Math.PI * 2) / n;
      const startAngle = -Math.PI / 2; // 从顶部开始

      // 清空
      ctx.clearRect(0, 0, size, size);

      // 绘制背景网格（5层）
      for (let ring = 1; ring <= 5; ring++) {
        const r = maxR * (ring / 5);
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const angle = startAngle + i * angleStep;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = ring === 5 ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)';
        ctx.lineWidth = ring === 5 ? 1.2 : 0.8;
        ctx.stroke();

        // 20/40/60/80/100 标注
        if (ring % 2 === 0 || ring === 1) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.font = '9px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText((ring * 20).toString(), cx + 3, cy - r + 3);
        }
      }

      // 绘制轴线
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // 绘制数据区域（渐变填充）
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const idx = i % n;
        const angle = startAngle + idx * angleStep;
        const val = (scores[idx] || 0) / 100;
        const r = maxR * val;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // 渐变填充
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      gradient.addColorStop(0, 'rgba(46,196,182,0.35)');
      gradient.addColorStop(1, 'rgba(46,196,182,0.08)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // 描边
      ctx.strokeStyle = 'rgba(46,196,182,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制数据点
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const val = (scores[i] || 0) / 100;
        const r = maxR * val;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        // 外圈
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = dims[i].color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 内点
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = dims[i].color;
        ctx.fill();
      }

      // 绘制维度标签
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const labelR = maxR + 25;
        const x = cx + labelR * Math.cos(angle);
        const y = cy + labelR * Math.sin(angle);

        // 分数
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = dims[i].color;
        const scoreY = angle < 0 ? y - 7 : (angle > Math.PI * 0.8 ? y - 7 : y + 7);
        ctx.fillText(scores[i].toString(), x, i === 0 ? y - 5 : scoreY);

        // 标签名
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = '#6b7280';
        const nameY = i === 0 ? y + 6 : (angle < 0 ? y + 4 : (angle > Math.PI * 0.8 ? y + 4 : y - 4));
        // 对于左右两侧的标签，文字对齐方式调整
        const cosA = Math.cos(angle);
        if (cosA < -0.3) ctx.textAlign = 'right';
        else if (cosA > 0.3) ctx.textAlign = 'left';
        else ctx.textAlign = 'center';
        ctx.fillText(dims[i].label, x, nameY);
        ctx.textAlign = 'center';
      }
    }

    // 小型雷达图（用于卡片预览）
    function drawMiniRadar(canvasId, scores) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const size = 60;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      ctx.scale(dpr, dpr);

      const cx = size / 2, cy = size / 2, maxR = 24;
      const n = scores.length;
      const angleStep = (Math.PI * 2) / n;
      const startAngle = -Math.PI / 2;

      // 背景网格
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = startAngle + (i % n) * angleStep;
        const x = cx + maxR * Math.cos(angle);
        const y = cy + maxR * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // 数据
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const idx = i % n;
        const angle = startAngle + idx * angleStep;
        const r = maxR * (scores[idx] / 100);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      gradient.addColorStop(0, 'rgba(46,196,182,0.4)');
      gradient.addColorStop(1, 'rgba(46,196,182,0.1)');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = 'rgba(46,196,182,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ==================== 动态渲染筛子选择器 ====================
    function renderSieveSelector() {
      const container = document.getElementById('sieveSelector');
      if (!container) return;
      const models = getActiveSieveModels();
      let html = '<button onclick="selectSieve(&apos;all&apos;)" class="sieve-chip' + (currentSieve === 'all' ? ' active' : '') + '" data-sieve="all"><i class="fas fa-globe text-gray-400"></i>全部机会</button>';
      mySieves.forEach(key => {
        const s = SIEVE_LIBRARY[key];
        if (!s) return;
        html += '<button onclick="selectSieve(&apos;' + key + '&apos;)" class="sieve-chip' + (currentSieve === key ? ' active' : '') + '" data-sieve="' + key + '"><i class="fas ' + s.icon + '" style="color:' + s.color + ';"></i>' + s.name + '</button>';
      });
      container.innerHTML = html;
    }

    // ==================== 筛子管理弹窗 ====================
    function showSieveManager() {
      // 移除旧弹窗
      const old = document.getElementById('sieveManagerModal'); if (old) old.remove();

      const libraryKeys = Object.keys(SIEVE_LIBRARY);
      const availableKeys = libraryKeys.filter(k => !mySieves.includes(k));

      const modal = document.createElement('div');
      modal.id = 'sieveManagerModal';
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300]';
      modal.style.animation = 'fadeIn 0.2s ease';
      modal.onclick = (e) => { if (e.target === modal) closeSieveManager(); };

      modal.innerHTML = '<div style="animation: scaleIn 0.25s cubic-bezier(0.28,0.11,0.32,1);" class="bg-white rounded-3xl max-w-3xl w-full mx-4 overflow-hidden" style="box-shadow: 0 24px 80px rgba(0,0,0,0.2);">' +
        // Header
        '<div class="p-5 border-b border-gray-100" style="background: linear-gradient(135deg, rgba(6,182,212,0.06), rgba(14,165,233,0.04));">' +
          '<div class="flex items-center justify-between">' +
            '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #06b6d4, #0ea5e9); box-shadow: 0 4px 12px rgba(6,182,212,0.3);"><i class="fas fa-cogs text-white"></i></div><div><h2 class="text-lg font-bold text-gray-900">管理我的筛子</h2><p class="text-xs text-gray-400">从筛子库添加，或移除已有筛子</p></div></div>' +
            '<button onclick="closeSieveManager()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"><i class="fas fa-times"></i></button>' +
          '</div>' +
        '</div>' +
        // Body — 双栏
        '<div class="flex" style="min-height: 380px; max-height: 70vh;">' +
          // 左栏：筛子库
          '<div class="w-1/2 border-r border-gray-100 flex flex-col">' +
            '<div class="p-4 border-b border-gray-50 flex items-center justify-between"><h3 class="text-sm font-bold text-gray-700"><i class="fas fa-warehouse mr-1.5 text-cyan-500"></i>筛子库</h3><span class="text-xs text-gray-400">' + libraryKeys.length + ' 个可用</span></div>' +
            '<div class="flex-1 overflow-y-auto p-3 space-y-2" id="sieveLibraryList">' +
              renderLibraryItems(libraryKeys) +
            '</div>' +
          '</div>' +
          // 右栏：我的筛子
          '<div class="w-1/2 flex flex-col" style="background: #fafbfc;">' +
            '<div class="p-4 border-b border-gray-50 flex items-center justify-between"><h3 class="text-sm font-bold text-gray-700"><i class="fas fa-star mr-1.5 text-amber-500"></i>我的筛子</h3><span class="text-xs text-gray-400" id="mySieveCount">' + mySieves.length + ' 个已添加</span></div>' +
            '<div class="flex-1 overflow-y-auto p-3 space-y-2" id="mySieveList">' +
              renderMySieveItems() +
            '</div>' +
          '</div>' +
        '</div>' +
        // Footer
        '<div class="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">' +
          '<p class="text-xs text-gray-400"><i class="fas fa-info-circle mr-1"></i>「全部机会」为内置项，始终可用无需添加</p>' +
          '<button onclick="closeSieveManager()" class="px-5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 transition-all"><i class="fas fa-check mr-1.5"></i>完成</button>' +
        '</div>' +
      '</div>';

      document.body.appendChild(modal);
    }

    function renderLibraryItems(keys) {
      if (!keys) keys = Object.keys(SIEVE_LIBRARY);
      return keys.map(key => {
        const s = SIEVE_LIBRARY[key];
        const isAdded = mySieves.includes(key);
        return '<div class="flex items-center gap-3 p-3 rounded-xl border transition-all ' + (isAdded ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-cyan-200 hover:shadow-sm') + '" id="lib_' + key + '">' +
          '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + s.color + '15;"><i class="fas ' + s.icon + '" style="color:' + s.color + '; font-size:14px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-1.5"><p class="text-sm font-semibold text-gray-800 truncate">' + s.name + '</p><span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">' + (s.category || '') + '</span></div>' +
            '<p class="text-xs text-gray-400 truncate mt-0.5">' + s.desc + '</p>' +
          '</div>' +
          (isAdded
            ? '<span class="text-xs text-gray-400 flex-shrink-0 px-2 py-1"><i class="fas fa-check"></i> 已添加</span>'
            : '<button onclick="addSieve(&apos;' + key + '&apos;)" class="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"><i class="fas fa-plus mr-1"></i>添加</button>') +
        '</div>';
      }).join('');
    }

    function renderMySieveItems() {
      if (mySieves.length === 0) {
        return '<div class="text-center py-8"><div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3"><i class="fas fa-inbox text-gray-300 text-lg"></i></div><p class="text-sm text-gray-400">暂无筛子</p><p class="text-xs text-gray-300 mt-1">从左侧筛子库中添加</p></div>';
      }
      return mySieves.map((key, idx) => {
        const s = SIEVE_LIBRARY[key];
        if (!s) return '';
        return '<div class="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-red-200 group transition-all" id="my_' + key + '">' +
          '<div class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-100 flex-shrink-0">' + (idx + 1) + '</div>' +
          '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + s.color + '15;"><i class="fas ' + s.icon + '" style="color:' + s.color + '; font-size:14px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-sm font-semibold text-gray-800 truncate">' + s.name + '</p>' +
            '<p class="text-xs text-gray-400 truncate">' + (s.category || '') + '</p>' +
          '</div>' +
          '<button onclick="removeSieve(&apos;' + key + '&apos;)" class="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><i class="fas fa-trash-alt mr-1"></i>移除</button>' +
        '</div>';
      }).join('');
    }

    function addSieve(key) {
      if (mySieves.includes(key)) return;
      mySieves.push(key);
      saveMySieves();
      refreshSieveManager();
      renderSieveSelector();
      showToast('success', '已添加', SIEVE_LIBRARY[key].name + ' 已添加到您的筛子面板');
    }

    function removeSieve(key) {
      mySieves = mySieves.filter(k => k !== key);
      saveMySieves();
      // 如果移除的是当前选中的筛子，回到全部
      if (currentSieve === key) {
        currentSieve = 'all';
        selectSieve('all');
      }
      refreshSieveManager();
      renderSieveSelector();
      showToast('info', '已移除', SIEVE_LIBRARY[key].name + ' 已从您的面板移除');
    }

    function refreshSieveManager() {
      const libList = document.getElementById('sieveLibraryList');
      const myList = document.getElementById('mySieveList');
      const myCount = document.getElementById('mySieveCount');
      if (libList) libList.innerHTML = renderLibraryItems();
      if (myList) myList.innerHTML = renderMySieveItems();
      if (myCount) myCount.textContent = mySieves.length + ' 个已添加';
    }

    function closeSieveManager() {
      const modal = document.getElementById('sieveManagerModal');
      if (modal) { modal.style.opacity = '0'; setTimeout(() => modal.remove(), 200); }
    }

    // ==================== 筛子选择 ====================
    function selectSieve(sieveKey) {
      currentSieve = sieveKey;
      // 更新UI
      document.querySelectorAll('#sieveSelector .sieve-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.sieve === sieveKey);
      });
      // 获取当前可用筛子模型
      const models = getActiveSieveModels();
      const sieve = models[sieveKey];
      if (sieve) {
        dealsList = sieve.filter(allDeals);
        // 更新筛子说明
        const descEl = document.getElementById('sieveDescription');
        const descText = document.getElementById('sieveDescText');
        if (sieveKey === 'all') {
          descEl.classList.add('hidden');
        } else {
          descEl.classList.remove('hidden');
          descText.textContent = sieve.desc;
        }
        // 更新标签
        const label = document.getElementById('filterLabel');
        if (sieveKey === 'all') {
          label.textContent = '· 展示全部 ' + allDeals.length + ' 个机会';
        } else {
          label.textContent = '· ' + sieve.name + ' — 通过 ' + dealsList.length + '/' + allDeals.length;
        }
      }
      renderDeals();
      if (sieveKey !== 'all' && dealsList.length > 0) {
        showToast('success', sieve.name, '筛选出 ' + dealsList.length + ' 个匹配机会');
      }
    }

    // ==================== Render Deals ====================
    function renderDeals() {
      const grid = document.getElementById('dealGrid');
      const empty = document.getElementById('emptyState');
      const searchVal = (document.getElementById('dealSearch')?.value || '').toLowerCase();
      const filterVal = document.getElementById('filterStatus')?.value || 'all';

      let filtered = dealsList.filter(d => {
        if (searchVal && !d.name.toLowerCase().includes(searchVal) && !d.industry.includes(searchVal)) return false;
        if (filterVal !== 'all' && d.status !== filterVal) return false;
        return true;
      });

      // Update stats
      document.getElementById('statTotal').textContent = allDeals.length;
      document.getElementById('statFiltered').textContent = dealsList.length;
      const totalMyUnits = allDeals.reduce((s, d) => s + (d.myUnits || 0), 0);
      document.getElementById('statMyUnits').textContent = totalMyUnits.toLocaleString();
      document.getElementById('statMyAmount').textContent = '¥' + (totalMyUnits * 1000).toLocaleString();

      if (filtered.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
      empty.classList.add('hidden');

      const statusMap = {
        open: { label: '待参与', cls: 'badge-warning', icon: 'fa-clock' },
        interested: { label: '已意向', cls: 'badge-primary', icon: 'fa-hand-point-up' },
        confirmed: { label: '已确认', cls: 'badge-success', icon: 'fa-check-double' },
        closed: { label: '已关闭', cls: 'badge-danger', icon: 'fa-lock' }
      };

      grid.innerHTML = filtered.map((d, idx) => {
        const st = statusMap[d.status] || statusMap.open;
        const hasMatch = d.matchScore !== null && d.matchScore !== undefined;
        const matchColor = hasMatch ? (d.matchScore >= 80 ? '#10b981' : d.matchScore >= 60 ? '#f59e0b' : '#ef4444') : '#6b7280';

        const availUnits = d.totalUnits - d.soldUnits;
        const soldPct = d.totalUnits > 0 ? Math.round(d.soldUnits / d.totalUnits * 100) : 0;
        const soldBarColor = soldPct >= 80 ? '#ef4444' : soldPct >= 50 ? '#f59e0b' : '#10b981';

        // 计算雷达评分用于卡片展示
        const cardScores = calcRadarScores(d);
        const cardOverall = calcOverallScore(cardScores);
        const cardGrade = getScoreGrade(cardOverall);
        const miniCanvasId = 'miniRadar_' + d.id;

        return '<div class="project-card group cursor-pointer animate-fade-in" onclick="openDetail(\\'' + d.id + '\\')">' +
          // MCN Header
          '<div class="flex items-center justify-between mb-1.5">' +
            '<span class="font-mono text-xs font-bold tracking-wider px-1.5 py-0.5 rounded" style="background: linear-gradient(135deg, #ecfdf5, #ecfeff); color: #0f766e; border: 1px solid rgba(46,196,182,0.12); font-size: 10px;">' + (d.mcn || '') + '</span>' +
            '<span class="badge ' + st.cls + ' flex-shrink-0"><i class="fas ' + st.icon + ' mr-1"></i>' + st.label + '</span>' +
          '</div>' +
          // Header: name + status + mini radar
          '<div class="flex items-center justify-between mb-2">' +
            '<div class="flex items-center space-x-2 min-w-0 flex-1">' +
              '<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, rgba(93,196,179,0.12), rgba(73,168,154,0.12));"><i class="fas fa-briefcase" style="color: #5DC4B3;"></i></div>' +
              '<div class="min-w-0 flex-1"><h3 class="font-bold text-gray-900 text-sm group-hover:text-teal-600 transition-colors truncate">' + d.name + '</h3><p class="text-xs text-gray-500">' + d.industry + ' · ' + d.location + '</p></div>' +
            '</div>' +
            '<div class="flex items-center gap-2 flex-shrink-0">' +
              '<div class="flex items-center gap-1.5" title="合约综合评分">' +
                '<canvas id="' + miniCanvasId + '" width="60" height="60" style="width:30px;height:30px;"></canvas>' +
                '<div class="text-right">' +
                  '<p class="text-sm font-black leading-none" style="color:' + cardGrade.color + ';">' + cardOverall + '</p>' +
                  '<p class="font-bold leading-none" style="font-size:9px; color:' + cardGrade.color + ';">' + cardGrade.grade + '</p>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          // 来源标签 + 筛子标签
          '<div class="flex items-center gap-1.5 mb-2">' +
            '<span class="source-tag source-originate"><i class="fas fa-paper-plane" style="font-size:8px;"></i>发起通</span>' +
            (hasMatch ? '<span class="sieve-tag sieve-pass"><i class="fas fa-check" style="font-size:8px;"></i>' + (d.sieveName || '筛子') + '</span>' : '') +
            (hasMatch ? '<span class="text-xs font-bold" style="color:' + matchColor + ';">' + d.matchScore + '%匹配</span>' : '') +
          '</div>' +
          // 匹配度条
          (hasMatch ? '<div class="match-bar mb-2"><div class="match-bar-fill" style="width:' + d.matchScore + '%; background: ' + matchColor + ';"></div></div>' : '') +
          // ==== 份额信息 ====
          '<div class="mb-2 p-2.5 rounded-xl" style="background: linear-gradient(135deg, #f0fdf9, #ecfeff); border: 1px solid rgba(46,196,182,0.12);">' +
            '<div class="flex items-center justify-between mb-1.5">' +
              '<div class="flex items-center gap-1"><i class="fas fa-file-contract text-teal-500" style="font-size:10px;"></i><span class="text-xs font-bold text-gray-700">' + d.totalUnits.toLocaleString() + ' 份合约</span></div>' +
              '<span class="text-xs font-semibold" style="color:' + soldBarColor + ';">' + soldPct + '% 已认购</span>' +
            '</div>' +
            '<div class="match-bar" style="height:4px;"><div class="match-bar-fill" style="width:' + soldPct + '%; background:' + soldBarColor + ';"></div></div>' +
            '<div class="flex items-center justify-between mt-1.5 text-xs">' +
              '<span class="text-gray-400">¥' + d.unitPrice.toLocaleString() + '/份</span>' +
              '<span class="text-teal-600 font-semibold">可购 ' + availUnits.toLocaleString() + ' 份</span>' +
            '</div>' +
            (d.myUnits > 0 ? '<div class="mt-1.5 flex items-center gap-1 text-xs"><i class="fas fa-user-check text-emerald-500" style="font-size:9px;"></i><span class="text-emerald-600 font-bold">我已认购 ' + d.myUnits + ' 份 (¥' + (d.myUnits * d.unitPrice).toLocaleString() + ')</span></div>' : '') +
          '</div>' +
          // Metrics
          '<div class="flex items-center justify-between text-xs">' +
            '<div class="flex items-center space-x-3">' +
              '<span class="text-gray-500"><i class="fas fa-yen-sign mr-1 text-teal-500"></i>' + (d.amount/10000).toFixed(0) + '万</span>' +
              '<span class="text-gray-500"><i class="fas fa-percentage mr-1 text-amber-500"></i>' + d.revenueShare + '</span>' +
              '<span class="text-gray-500"><i class="fas fa-calendar mr-1 text-cyan-500"></i>' + d.period + '</span>' +
            '</div>' +
            '<div class="flex items-center"><i class="fas fa-star text-amber-400 mr-1"></i><span class="font-bold text-gray-700">' + d.aiScore + '</span></div>' +
          '</div>' +
          // Footer
          '<div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">' +
            '<span class="text-xs text-gray-400"><i class="fas fa-paper-plane mr-1 text-amber-300"></i>' + d.originateDate + '</span>' +
            (d.myUnits > 0
              ? '<span class="text-xs font-semibold text-emerald-600"><i class="fas fa-check-circle mr-1"></i>已认购 ' + d.myUnits + ' 份</span>'
              : '<button onclick="event.stopPropagation(); openDetail(\\'' + d.id + '\\')" class="text-xs font-medium text-teal-500 hover:text-teal-700 transition-colors"><i class="fas fa-shopping-cart mr-1"></i>认购份额</button>') +
          '</div>' +
        '</div>';
      }).join('');

      // 延迟绘制卡片上的小雷达图
      setTimeout(() => {
        filtered.forEach(d => {
          const scores = calcRadarScores(d);
          drawMiniRadar('miniRadar_' + d.id, scores);
        });
      }, 50);
    }

    function filterByStatus(status) {
      const sel = document.getElementById('filterStatus');
      if (sel) { sel.value = status; renderDeals(); }
    }

    // ==================== 认购弹窗 ====================
    function showSubscribeModal() {
      if (!currentDeal) return;
      const avail = currentDeal.totalUnits - currentDeal.soldUnits;
      if (avail <= 0) { showToast('warning', '已售罄', '该项目合约已全部认购'); return; }
      const maxShow = Math.min(avail, 9999);

      const old = document.getElementById('subscribeModal'); if (old) old.remove();
      const modal = document.createElement('div');
      modal.id = 'subscribeModal';
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300]';
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.innerHTML = '<div class="bg-white rounded-3xl max-w-md w-full mx-4 overflow-hidden" style="box-shadow: 0 24px 80px rgba(0,0,0,0.2); animation: scaleIn 0.25s cubic-bezier(0.28,0.11,0.32,1);">' +
        '<div class="p-5 border-b border-gray-100" style="background: linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04));">' +
          '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #10b981, #06b6d4);"><i class="fas fa-file-contract text-white"></i></div><div><h2 class="text-lg font-bold text-gray-900">认购合约份额</h2><p class="text-xs text-gray-400">' + currentDeal.name + '</p></div></div>' +
        '</div>' +
        '<div class="p-5">' +
          '<div class="grid grid-cols-3 gap-2 mb-4">' +
            '<div class="text-center p-2 bg-gray-50 rounded-xl"><p class="text-sm font-bold text-gray-800">' + currentDeal.totalUnits.toLocaleString() + '</p><p class="text-xs text-gray-400">总份数</p></div>' +
            '<div class="text-center p-2 bg-gray-50 rounded-xl"><p class="text-sm font-bold text-amber-600">' + currentDeal.soldUnits.toLocaleString() + '</p><p class="text-xs text-gray-400">已认购</p></div>' +
            '<div class="text-center p-2 bg-teal-50 rounded-xl border border-teal-200"><p class="text-sm font-bold text-teal-600">' + avail.toLocaleString() + '</p><p class="text-xs text-gray-400">可认购</p></div>' +
          '</div>' +
          '<div class="mb-4">' +
            '<label class="block text-sm font-semibold text-gray-700 mb-2">认购份数</label>' +
            '<div class="flex items-center gap-2">' +
              '<button onclick="adjustUnits(-10)" class="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors">-10</button>' +
              '<button onclick="adjustUnits(-1)" class="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors">-</button>' +
              '<input type="number" id="subscribeUnits" value="1" min="1" max="' + maxShow + '" class="flex-1 text-center text-lg font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" oninput="updateSubTotal()">' +
              '<button onclick="adjustUnits(1)" class="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors">+</button>' +
              '<button onclick="adjustUnits(10)" class="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors">+10</button>' +
            '</div>' +
            '<div class="flex justify-between mt-2"><button onclick="setUnits(1)" class="text-xs text-teal-600 hover:underline">最少1份</button><button onclick="setUnits(100)" class="text-xs text-teal-600 hover:underline">100份</button><button onclick="setUnits(500)" class="text-xs text-teal-600 hover:underline">500份</button><button onclick="setUnits(' + maxShow + ')" class="text-xs text-teal-600 hover:underline">最多' + maxShow.toLocaleString() + '份</button></div>' +
          '</div>' +
          '<div class="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 mb-4">' +
            '<div class="flex items-center justify-between mb-1"><span class="text-xs text-gray-500">每份金额</span><span class="text-sm font-semibold text-gray-700">¥' + currentDeal.unitPrice.toLocaleString() + '</span></div>' +
            '<div class="flex items-center justify-between mb-1"><span class="text-xs text-gray-500">认购份数</span><span class="text-sm font-semibold text-gray-700" id="subUnitsDisplay">1 份</span></div>' +
            '<div class="border-t border-teal-200 my-2"></div>' +
            '<div class="flex items-center justify-between"><span class="text-sm font-bold text-gray-800">合计金额</span><span class="text-xl font-bold text-teal-600" id="subTotalDisplay">¥' + currentDeal.unitPrice.toLocaleString() + '</span></div>' +
            '<p class="text-xs text-gray-400 mt-1" id="subPercentDisplay">占项目总额 ' + (1/currentDeal.totalUnits*100).toFixed(3) + '%</p>' +
          '</div>' +
        '</div>' +
        '<div class="px-5 pb-5 flex gap-3">' +
          '<button onclick="closeSubscribeModal()" class="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">取消</button>' +
          '<button onclick="confirmSubscribe()" class="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 transition-all"><i class="fas fa-check mr-1.5"></i>确认认购</button>' +
        '</div>' +
      '</div>';

      document.body.appendChild(modal);
      updateSubTotal();
    }

    function closeSubscribeModal() {
      const m = document.getElementById('subscribeModal'); if (m) m.remove();
    }

    function adjustUnits(delta) {
      const inp = document.getElementById('subscribeUnits');
      if (!inp) return;
      const max = parseInt(inp.max);
      let val = parseInt(inp.value) || 1;
      val = Math.max(1, Math.min(max, val + delta));
      inp.value = val;
      updateSubTotal();
    }

    function setUnits(n) {
      const inp = document.getElementById('subscribeUnits');
      if (!inp) return;
      const max = parseInt(inp.max);
      inp.value = Math.min(n, max);
      updateSubTotal();
    }

    function updateSubTotal() {
      if (!currentDeal) return;
      const inp = document.getElementById('subscribeUnits');
      let units = parseInt(inp?.value) || 1;
      const max = currentDeal.totalUnits - currentDeal.soldUnits;
      if (units < 1) units = 1;
      if (units > max) { units = max; if (inp) inp.value = max; }
      const total = units * currentDeal.unitPrice;
      const pct = (units / currentDeal.totalUnits * 100);
      const ud = document.getElementById('subUnitsDisplay');
      const td = document.getElementById('subTotalDisplay');
      const pd = document.getElementById('subPercentDisplay');
      if (ud) ud.textContent = units.toLocaleString() + ' 份';
      if (td) td.textContent = '¥' + total.toLocaleString();
      if (pd) pd.textContent = '占项目总额 ' + pct.toFixed(3) + '%';
    }

    function confirmSubscribe() {
      if (!currentDeal) return;
      const inp = document.getElementById('subscribeUnits');
      const units = parseInt(inp?.value) || 1;
      const avail = currentDeal.totalUnits - currentDeal.soldUnits;
      if (units > avail) { showToast('error', '份额不足', '可认购份数不足'); return; }

      // 更新数据
      currentDeal.soldUnits += units;
      currentDeal.myUnits += units;
      if (currentDeal.status === 'open') currentDeal.status = 'interested';

      // 同步回 allDeals
      const original = allDeals.find(d => d.id === currentDeal.id);
      if (original) {
        original.soldUnits = currentDeal.soldUnits;
        original.myUnits = currentDeal.myUnits;
        original.status = currentDeal.status;
      }
      localStorage.setItem('ec_allDeals', JSON.stringify(allDeals));

      // 关闭弹窗
      const modal = document.getElementById('subscribeModal');
      if (modal) modal.remove();

      showToast('success', '认购成功', '已认购 ' + units + ' 份 · ¥' + (units * currentDeal.unitPrice).toLocaleString());
      openDetail(currentDeal.id); // 刷新详情
    }

    // ==================== Detail Page ====================
    function openDetail(id) {
      currentDeal = dealsList.find(d => d.id === id) || allDeals.find(d => d.id === id);
      if (!currentDeal) return;
      document.getElementById('detailTitle').textContent = currentDeal.name;
      document.getElementById('detailMCN').textContent = currentDeal.mcn || 'MCN-XX-XX-0000-0000';
      const statusMap = { open: { label: '待参与', cls: 'badge-warning' }, interested: { label: '已意向', cls: 'badge-primary' }, confirmed: { label: '已确认', cls: 'badge-success' }, closed: { label: '已关闭', cls: 'badge-danger' } };
      const st = statusMap[currentDeal.status] || statusMap.open;
      document.getElementById('detailStatus').className = 'badge ' + st.cls;
      document.getElementById('detailStatus').textContent = st.label;
      document.getElementById('detailIndustry').textContent = currentDeal.industry;
      document.getElementById('detailDate').textContent = currentDeal.originateDate;

      // 更新参与按钮
      const btn = document.getElementById('btnExpressIntent');
      const avail = currentDeal.totalUnits - currentDeal.soldUnits;
      if (currentDeal.myUnits > 0) {
        btn.innerHTML = '<i class="fas fa-check-circle mr-1"></i>已认购 ' + currentDeal.myUnits + ' 份';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.onclick = function() { showToast('info', '已认购', '您已认购 ' + currentDeal.myUnits + ' 份，共 ¥' + (currentDeal.myUnits * currentDeal.unitPrice).toLocaleString()); };
      } else if (avail <= 0) {
        btn.innerHTML = '<i class="fas fa-lock mr-1"></i>已售罄';
        btn.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
        btn.onclick = null;
      } else {
        btn.innerHTML = '<i class="fas fa-shopping-cart mr-1"></i>认购份额';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.onclick = function() { showSubscribeModal(); };
      }

      // Left panel — 项目信息（来自发起通）
      document.getElementById('detailLeft').innerHTML =
        '<div class="mb-5">' +
          // MCN 编号卡片
          '<div class="p-4 rounded-2xl mb-4" style="background: linear-gradient(135deg, #0c2d4a 0%, #0f3d36 40%, #164e47 100%); position: relative; overflow: hidden;">' +
            '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 30%, rgba(6,182,212,0.25) 0%, transparent 50%);pointer-events:none;"></div>' +
            '<div class="relative z-10">' +
              '<div class="flex items-center gap-2 mb-2"><span class="px-1.5 py-0.5 rounded text-xs font-bold" style="background: rgba(46,196,182,0.2); color: #5DC4B3; letter-spacing: 0.03em;">MCN</span><span class="text-xs" style="color: rgba(255,255,255,0.4);">合约身份编号</span></div>' +
              '<p class="font-mono text-lg font-black tracking-wider text-white mb-2">' + (currentDeal.mcn || '') + '</p>' +
              '<div class="grid grid-cols-4 gap-1.5">' +
                '<div class="text-center p-1.5 rounded-lg" style="background: rgba(255,255,255,0.06);"><p class="text-xs font-bold text-cyan-300">' + (INDUSTRY_CODES[currentDeal.industry] || 'XX') + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">行业</p></div>' +
                '<div class="text-center p-1.5 rounded-lg" style="background: rgba(255,255,255,0.06);"><p class="text-xs font-bold text-cyan-300">' + (CITY_CODES[currentDeal.location] || 'XX') + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">城市</p></div>' +
                '<div class="text-center p-1.5 rounded-lg" style="background: rgba(255,255,255,0.06);"><p class="text-xs font-bold text-cyan-300">' + (currentDeal.issueDate || '').slice(0,7) + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">发行</p></div>' +
                '<div class="text-center p-1.5 rounded-lg" style="background: rgba(255,255,255,0.06);"><p class="text-xs font-bold text-amber-300">' + (currentDeal.contractType || 'RSN') + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">类型</p></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="p-3 bg-amber-50 rounded-xl border border-amber-100 mb-4 flex items-center gap-2"><i class="fas fa-paper-plane text-amber-500"></i><div><p class="text-xs font-bold text-amber-700">来自发起通</p><p class="text-xs text-amber-600">发起方：' + (currentDeal.originator || '未知') + '</p></div></div>' +
          '<div class="flex items-center space-x-3 mb-4"><div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background: linear-gradient(135deg, rgba(93,196,179,0.15), rgba(73,168,154,0.15));"><i class="fas fa-briefcase text-2xl" style="color: #5DC4B3;"></i></div><div><h2 class="text-lg font-bold text-gray-900">' + currentDeal.name + '</h2><p class="text-sm text-gray-500">' + currentDeal.industry + ' · ' + currentDeal.location + '</p></div></div>' +
          '<p class="text-sm text-gray-600 leading-relaxed mb-4">' + currentDeal.description + '</p>' +
        '</div>' +
        // ==== 份额核心面板 ====
        '<div class="p-4 rounded-2xl mb-5" style="background: linear-gradient(135deg, #ecfdf5, #ecfeff); border: 1.5px solid rgba(46,196,182,0.2);">' +
          '<div class="flex items-center gap-2 mb-3"><i class="fas fa-file-contract text-teal-500"></i><h3 class="text-sm font-bold text-gray-800">合约份额信息</h3><span class="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-semibold">¥' + currentDeal.unitPrice.toLocaleString() + '/份</span><span class="font-mono text-xs text-gray-400">' + (currentDeal.mcn || '') + '</span></div>' +
          '<div class="grid grid-cols-3 gap-2 mb-3">' +
            '<div class="text-center p-2 bg-white rounded-xl"><p class="text-lg font-bold text-gray-800">' + currentDeal.totalUnits.toLocaleString() + '</p><p class="text-xs text-gray-400">总份数</p></div>' +
            '<div class="text-center p-2 bg-white rounded-xl"><p class="text-lg font-bold text-amber-600">' + currentDeal.soldUnits.toLocaleString() + '</p><p class="text-xs text-gray-400">已认购</p></div>' +
            '<div class="text-center p-2 bg-white rounded-xl"><p class="text-lg font-bold text-teal-600">' + (currentDeal.totalUnits - currentDeal.soldUnits).toLocaleString() + '</p><p class="text-xs text-gray-400">可认购</p></div>' +
          '</div>' +
          '<div class="match-bar mb-1" style="height:6px;"><div class="match-bar-fill" style="width:' + Math.round(currentDeal.soldUnits/currentDeal.totalUnits*100) + '%; background: linear-gradient(90deg, #10b981, #06b6d4);"></div></div>' +
          '<div class="flex justify-between text-xs"><span class="text-gray-400">认购进度</span><span class="font-semibold" style="color:#0f766e;">' + Math.round(currentDeal.soldUnits/currentDeal.totalUnits*100) + '%</span></div>' +
          (currentDeal.myUnits > 0 ? '<div class="mt-3 p-2 bg-emerald-50 rounded-xl flex items-center gap-2 border border-emerald-100"><i class="fas fa-user-check text-emerald-500"></i><div><p class="text-xs font-bold text-emerald-700">我已认购 ' + currentDeal.myUnits + ' 份</p><p class="text-xs text-emerald-600">投入 ¥' + (currentDeal.myUnits * currentDeal.unitPrice).toLocaleString() + ' · 占总额 ' + (currentDeal.myUnits / currentDeal.totalUnits * 100).toFixed(2) + '%</p></div></div>' : '') +
        '</div>' +
        '<div class="grid grid-cols-2 gap-3 mb-5">' +
          '<div class="p-3 bg-teal-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">投资总额</p><p class="text-lg font-bold text-teal-600">¥' + (currentDeal.amount/10000).toFixed(0) + '万</p></div>' +
          '<div class="p-3 bg-amber-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">分成比例</p><p class="text-lg font-bold text-amber-600">' + currentDeal.revenueShare + '</p></div>' +
          '<div class="p-3 bg-cyan-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">分成期限</p><p class="text-lg font-bold text-cyan-600">' + currentDeal.period + '</p></div>' +
          '<div class="p-3 bg-emerald-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">AI评分</p><p class="text-lg font-bold text-emerald-600">' + currentDeal.aiScore + '<span class="text-xs text-gray-400">/10</span></p></div>' +
        '</div>' +
        '<div class="space-y-3"><h3 class="text-sm font-semibold text-gray-700 mb-2"><i class="fas fa-store mr-1.5 text-amber-500"></i>经营数据（发起通提供）</h3>' +
          '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between"><span class="text-xs font-medium text-gray-600">月均营收</span><span class="text-xs font-bold text-gray-800">' + (currentDeal.monthlyRevenue || '暂无') + '</span></div></div>' +
          '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between"><span class="text-xs font-medium text-gray-600">员工人数</span><span class="text-xs font-bold text-gray-800">' + (currentDeal.employeeCount || '暂无') + '人</span></div></div>' +
          '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between"><span class="text-xs font-medium text-gray-600">运营年限</span><span class="text-xs font-bold text-gray-800">' + (currentDeal.operatingYears || '暂无') + '年</span></div></div>' +
          '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between"><span class="text-xs font-medium text-gray-600">风控评级</span><span class="text-xs font-bold text-emerald-600">' + (currentDeal.riskGrade || 'N/A') + '</span></div></div>' +
          '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between"><span class="text-xs font-medium text-gray-600">到期日</span><span class="text-xs font-bold text-gray-800">' + (currentDeal.maturityDate || '—') + '</span></div></div>' +
        '</div>';

      // Right panel — 雷达图评估 + 筛子结果
      const hasMatch = currentDeal.matchScore !== null && currentDeal.matchScore !== undefined;
      const matchColor = hasMatch ? (currentDeal.matchScore >= 80 ? '#10b981' : currentDeal.matchScore >= 60 ? '#f59e0b' : '#ef4444') : '#6b7280';

      // 计算雷达评分
      const radarScores = calcRadarScores(currentDeal);
      const overallScore = calcOverallScore(radarScores);
      const gradeInfo = getScoreGrade(overallScore);

      // 生成各筛子的评估结果
      let sieveResults = '';
      mySieves.forEach(key => {
        const sieve = SIEVE_LIBRARY[key];
        if (!sieve) return;
        const testResult = sieve.filter([currentDeal]);
        const passed = testResult.length > 0;
        const score = passed ? testResult[0].matchScore : Math.floor(Math.random() * 35 + 10);
        const barColor = passed ? '#10b981' : '#ef4444';
        sieveResults += '<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">' +
          '<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + (passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') + ';"><i class="fas ' + sieve.icon + '" style="color:' + (passed ? '#10b981' : '#ef4444') + '; font-size:12px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center justify-between mb-1"><span class="text-xs font-semibold text-gray-700">' + sieve.name + '</span><span class="sieve-tag ' + (passed ? 'sieve-pass' : 'sieve-fail') + '">' + (passed ? '<i class="fas fa-check" style="font-size:8px;"></i>通过' : '<i class="fas fa-times" style="font-size:8px;"></i>未通过') + '</span></div>' +
            '<div class="match-bar"><div class="match-bar-fill" style="width:' + score + '%; background:' + barColor + ';"></div></div>' +
            '<p class="text-xs text-gray-400 mt-1">' + score + '% 匹配度</p>' +
          '</div></div>';
      });
      if (mySieves.length === 0) {
        sieveResults = '<div class="text-center py-4"><p class="text-sm text-gray-400">暂未添加筛子</p><button onclick="goToDashboard(); setTimeout(showSieveManager, 300);" class="text-xs text-cyan-600 mt-1 hover:underline">去管理筛子</button></div>';
      }

      // 维度详细列表 HTML
      let dimensionDetails = '';
      RADAR_DIMENSIONS.forEach((dim, i) => {
        const score = radarScores[i];
        const dGrade = getScoreGrade(score);
        const barWidth = score;
        dimensionDetails += '<div class="radar-dim-item p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all cursor-pointer" onclick="toggleDimDetail(this)">' +
          '<div class="flex items-center gap-3">' +
            '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + dim.color + '15;"><i class="fas ' + dim.icon + '" style="color:' + dim.color + '; font-size:13px;"></i></div>' +
            '<div class="flex-1 min-w-0">' +
              '<div class="flex items-center justify-between mb-1">' +
                '<span class="text-xs font-bold text-gray-700">' + dim.label + '</span>' +
                '<div class="flex items-center gap-2">' +
                  '<span class="text-xs font-bold" style="color:' + dGrade.color + ';">' + score + '</span>' +
                  '<span class="text-xs px-1.5 py-0.5 rounded font-bold" style="background:' + dGrade.bg + '; color:' + dGrade.color + ';">' + dGrade.grade + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="h-1.5 rounded-full bg-gray-200 overflow-hidden"><div class="h-full rounded-full transition-all" style="width:' + barWidth + '%; background: linear-gradient(90deg, ' + dim.color + ', ' + dim.color + 'cc);"></div></div>' +
            '</div>' +
            '<i class="fas fa-chevron-down text-gray-300 text-xs flex-shrink-0 dim-arrow transition-transform"></i>' +
          '</div>' +
          '<div class="dim-detail hidden mt-3 pt-3 border-t border-gray-100">' +
            '<p class="text-xs text-gray-500 leading-relaxed mb-2"><i class="fas fa-info-circle mr-1" style="color:' + dim.color + ';"></i>' + dim.desc + '</p>' +
            '<div class="flex items-center justify-between">' +
              '<span class="text-xs text-gray-400">评分依据</span>' +
              '<span class="text-xs font-medium" style="color:' + dGrade.color + ';">' + dGrade.label + '水平 · ' + (score >= 75 ? '优于' + (85 + Math.floor(Math.random()*10)) + '%同类合约' : score >= 55 ? '处于中位数附近' : '低于' + (55 + Math.floor(Math.random()*15)) + '%同类合约') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      });

      document.getElementById('detailRight').innerHTML =
        '<div class="space-y-4">' +
          // ===== 合约雷达图评估 =====
          '<div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">' +
            // 头部：综合评分 + 等级
            '<div class="p-4 flex items-center justify-between" style="background: linear-gradient(135deg, rgba(46,196,182,0.04), rgba(6,182,212,0.03)); border-bottom: 1px solid rgba(0,0,0,0.04);">' +
              '<div class="flex items-center gap-3">' +
                '<div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #2EC4B6, #06b6d4); box-shadow: 0 4px 12px rgba(46,196,182,0.3);"><i class="fas fa-radar text-white text-sm" style="font-size:16px;">&#x25CE;</i></div>' +
                '<div><h3 class="text-sm font-bold text-gray-900">合约多维评估</h3><p class="text-xs text-gray-400">8维度量化分析 · 综合评级</p></div>' +
              '</div>' +
              '<div class="flex items-center gap-3">' +
                '<div class="text-right">' +
                  '<p class="text-2xl font-black" style="color:' + gradeInfo.color + '; letter-spacing:-0.02em;">' + overallScore + '<span class="text-xs font-medium text-gray-400">/100</span></p>' +
                  '<p class="text-xs font-semibold" style="color:' + gradeInfo.color + ';">' + gradeInfo.label + '</p>' +
                '</div>' +
                '<div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background:' + gradeInfo.bg + '; border: 2px solid ' + gradeInfo.color + '33;">' +
                  '<span class="text-xl font-black" style="color:' + gradeInfo.color + ';">' + gradeInfo.grade + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            // 雷达图
            '<div class="flex items-center justify-center py-4 px-2">' +
              '<canvas id="radarCanvas" style="max-width:100%;"></canvas>' +
            '</div>' +
            // 维度缩略指标条
            '<div class="px-4 pb-4">' +
              '<div class="grid grid-cols-4 gap-2">' +
                RADAR_DIMENSIONS.map((dim, i) => {
                  const s = radarScores[i];
                  const g = getScoreGrade(s);
                  return '<div class="text-center p-2 rounded-xl" style="background:' + dim.color + '08; border: 1px solid ' + dim.color + '15;">' +
                    '<i class="fas ' + dim.icon + '" style="color:' + dim.color + '; font-size:11px;"></i>' +
                    '<p class="text-xs font-bold mt-1" style="color:' + g.color + ';">' + s + '</p>' +
                    '<p class="text-xs text-gray-400 truncate" style="font-size:9px;">' + dim.label.replace(/YITO/, '').substring(0, 4) + '</p>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          // ===== 维度详解（可展开） =====
          '<div class="bg-white rounded-2xl p-4 border border-gray-100">' +
            '<div class="flex items-center justify-between mb-3">' +
              '<h3 class="text-sm font-bold text-gray-800"><i class="fas fa-list-ul mr-1.5 text-teal-500"></i>维度详解</h3>' +
              '<button onclick="toggleAllDims()" class="text-xs text-teal-600 hover:text-teal-700 font-medium"><i class="fas fa-expand-alt mr-1"></i>全部展开</button>' +
            '</div>' +
            '<div class="space-y-2">' + dimensionDetails + '</div>' +
          '</div>' +
          // 筛子匹配概览
          (hasMatch ? '<div class="bg-white rounded-2xl p-4 border border-gray-100"><h3 class="text-sm font-bold text-gray-800 mb-3"><i class="fas fa-bullseye mr-1.5" style="color:' + matchColor + ';"></i>当前筛子匹配度</h3><div class="flex items-center gap-4"><div class="w-16 h-16 rounded-full border-4 flex items-center justify-center" style="border-color:' + matchColor + ';"><span class="text-xl font-bold" style="color:' + matchColor + ';">' + currentDeal.matchScore + '%</span></div><div class="flex-1"><p class="text-sm font-semibold text-gray-700">' + (currentDeal.sieveName || '当前筛子') + '</p><p class="text-xs text-gray-500 mt-1">' + (currentDeal.matchScore >= 80 ? '高度匹配，建议重点关注' : currentDeal.matchScore >= 60 ? '中等匹配，可进一步了解' : '匹配度较低') + '</p><div class="match-bar mt-2" style="height:4px;"><div class="match-bar-fill" style="width:' + currentDeal.matchScore + '%; background:' + matchColor + ';"></div></div></div></div></div>' : '') +
          // 各筛子评估结果
          '<div class="bg-white rounded-2xl p-4 border border-gray-100"><h3 class="text-sm font-bold text-gray-800 mb-3"><i class="fas fa-filter mr-1.5 text-cyan-500"></i>筛子评估</h3><div class="space-y-2">' + sieveResults + '</div></div>' +
          // 收入预测
          '<div class="bg-white rounded-2xl p-4 border border-gray-100"><h3 class="text-sm font-bold text-gray-800 mb-3"><i class="fas fa-chart-line mr-1.5 text-teal-500"></i>收入预测</h3><div class="h-36 flex items-end justify-around gap-1.5">' +
          [65,78,82,70,88,92,85,90,95,88,92,98].map((v,i) => '<div class="flex flex-col items-center flex-1"><div class="w-full rounded-t-md" style="height:' + v + '%; background: linear-gradient(180deg, #5DC4B3 0%, #49A89A 100%); opacity:' + (0.5+i*0.04) + ';"></div><span class="text-xs text-gray-400 mt-1" style="font-size:9px;">' + (i+1) + '月</span></div>').join('') +
          '</div></div>' +
          // 项目流向
          '<div class="bg-white rounded-2xl p-4 border border-gray-100"><h3 class="text-sm font-bold text-gray-800 mb-3"><i class="fas fa-route mr-1.5 text-amber-500"></i>项目流向</h3><div class="space-y-3">' +
          [
            { icon: 'fa-paper-plane', color: 'amber', title: '发起通 — 项目提交', desc: currentDeal.originator + ' · ' + currentDeal.originateDate },
            { icon: 'fa-filter', color: 'cyan', title: '评估通 — AI筛选', desc: '通过 ' + (hasMatch ? currentDeal.matchScore + '% 匹配' : '基础审核') },
            { icon: 'fa-hand-pointer', color: 'teal', title: '参与通 — 当前阶段', desc: currentDeal.status === 'open' ? '等待您的参与决策' : '已表达参与意向' },
            { icon: 'fa-file-contract', color: 'gray', title: '条款通 → 合约通', desc: '确认参与后进入条款协商' }
          ].map(t => '<div class="flex items-start space-x-3"><div class="w-8 h-8 rounded-lg bg-' + t.color + '-100 flex items-center justify-center flex-shrink-0"><i class="fas ' + t.icon + ' text-' + t.color + '-600 text-xs"></i></div><div><p class="text-sm font-medium text-gray-700">' + t.title + '</p><p class="text-xs text-gray-400">' + t.desc + '</p></div></div>').join('') +
          '</div></div>' +
        '</div>';

      // 延迟绘制雷达图（等DOM渲染完成）
      setTimeout(() => {
        drawRadarChart('radarCanvas', radarScores, { size: 320 });
      }, 50);

      switchPage('pageDetail');
    }

    function goToDashboard() { switchPage('pageDashboard'); renderDeals(); }

    function goBack() {
      const lastPage = window._lastPage || 'pageDashboard';
      if (lastPage === 'pageContracts') { goToContracts(); }
      else { goToDashboard(); }
    }

    // ==================== 合约看板 ====================
    let contractView = 'table'; // 'table' or 'card'

    function goToContracts() {
      switchPage('pageContracts');
      renderContractBoard();
    }

    function setContractView(view) {
      contractView = view;
      document.getElementById('btnViewTable').className = 'px-2.5 py-1 rounded-md text-xs font-semibold ' + (view === 'table' ? 'bg-white shadow text-teal-600' : 'text-gray-500');
      document.getElementById('btnViewCard').className = 'px-2.5 py-1 rounded-md text-xs font-semibold ' + (view === 'card' ? 'bg-white shadow text-teal-600' : 'text-gray-500');
      document.getElementById('contractTableView').classList.toggle('hidden', view !== 'table');
      document.getElementById('contractCardView').classList.toggle('hidden', view !== 'card');
      renderContractBoard();
    }

    function toggleMCNExplainer() {
      const el = document.getElementById('mcnExplainer');
      const arrow = document.getElementById('mcnExplainerArrow');
      el.classList.toggle('hidden');
      arrow.style.transform = el.classList.contains('hidden') ? '' : 'rotate(180deg)';
    }

    function renderContractBoard() {
      const searchVal = (document.getElementById('contractSearch')?.value || '').toLowerCase();
      const filterInd = document.getElementById('contractFilterIndustry')?.value || 'all';
      const filterSt = document.getElementById('contractFilterStatus')?.value || 'all';
      const sortBy = document.getElementById('contractSortBy')?.value || 'mcn';

      let filtered = allDeals.filter(d => {
        if (!d.mcn) return false;
        if (searchVal && !d.mcn.toLowerCase().includes(searchVal) && !d.name.toLowerCase().includes(searchVal) && !d.industry.includes(searchVal)) return false;
        if (filterInd !== 'all' && d.industry !== filterInd) return false;
        if (filterSt !== 'all' && d.status !== filterSt) return false;
        return true;
      });

      // 排序
      filtered.sort((a, b) => {
        if (sortBy === 'mcn') return a.mcn.localeCompare(b.mcn);
        if (sortBy === 'aiScore') return parseFloat(b.aiScore) - parseFloat(a.aiScore);
        if (sortBy === 'amount') return b.amount - a.amount;
        if (sortBy === 'revenueShare') return parseInt(b.revenueShare) - parseInt(a.revenueShare);
        if (sortBy === 'soldPct') return (b.soldUnits / b.totalUnits) - (a.soldUnits / a.totalUnits);
        return 0;
      });

      // 更新统计
      const el1 = document.getElementById('contractStatTotal');
      const el2 = document.getElementById('contractStatActive');
      const el3 = document.getElementById('contractStatMy');
      if (el1) el1.textContent = allDeals.length;
      if (el2) el2.textContent = allDeals.filter(d => d.status === 'open' || d.status === 'interested').length;
      if (el3) el3.textContent = allDeals.filter(d => d.myUnits > 0).length;

      const label = document.getElementById('contractFilterLabel');
      if (label) label.textContent = '· 展示 ' + filtered.length + ' / ' + allDeals.length + ' 张合约';

      // 空状态
      const emptyEl = document.getElementById('contractEmpty');
      const tableView = document.getElementById('contractTableView');
      const cardView = document.getElementById('contractCardView');
      if (filtered.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (tableView) tableView.classList.add('hidden');
        if (cardView) cardView.classList.add('hidden');
        return;
      }
      if (emptyEl) emptyEl.classList.add('hidden');

      const statusMap = {
        open: { label: '待认购', cls: 'badge-warning', icon: 'fa-clock', color: '#d97706' },
        interested: { label: '已意向', cls: 'badge-primary', icon: 'fa-hand-point-up', color: '#5DC4B3' },
        confirmed: { label: '已确认', cls: 'badge-success', icon: 'fa-check-double', color: '#059669' },
        closed: { label: '已关闭', cls: 'badge-danger', icon: 'fa-lock', color: '#dc2626' }
      };

      // ===== 表格视图 =====
      if (contractView === 'table') {
        if (tableView) tableView.classList.remove('hidden');
        if (cardView) cardView.classList.add('hidden');

        const tbody = document.getElementById('contractTableBody');
        if (!tbody) return;
        tbody.innerHTML = filtered.map((d, idx) => {
          const st = statusMap[d.status] || statusMap.open;
          const soldPct = d.totalUnits > 0 ? Math.round(d.soldUnits / d.totalUnits * 100) : 0;
          const soldColor = soldPct >= 80 ? '#ef4444' : soldPct >= 50 ? '#f59e0b' : '#10b981';
          const aiColor = parseFloat(d.aiScore) >= 9 ? '#059669' : parseFloat(d.aiScore) >= 8 ? '#0d9488' : '#d97706';
          const scores = calcRadarScores(d);
          const overall = calcOverallScore(scores);
          const grade = getScoreGrade(overall);

          return '<tr class="border-b border-gray-50 hover:bg-teal-50/30 cursor-pointer transition-colors" onclick="openDetail(\\'' + d.id + '\\')">' +
            '<td class="px-4 py-3"><div class="font-mono text-xs font-bold tracking-wide" style="color: #0f766e;">' + d.mcn + '</div><div class="text-xs text-gray-400 mt-0.5 font-medium">' + (d.contractType || 'RSN') + ' · ' + (d.currency || 'CNY') + '</div></td>' +
            '<td class="px-4 py-3"><div class="flex items-center gap-2"><div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, rgba(93,196,179,0.12), rgba(73,168,154,0.12));"><i class="fas fa-briefcase text-xs" style="color: #5DC4B3;"></i></div><div class="min-w-0"><p class="text-sm font-semibold text-gray-800 truncate">' + d.name + '</p><p class="text-xs text-gray-400 truncate">' + d.originator + '</p></div></div></td>' +
            '<td class="px-3 py-3 text-center"><span class="px-2 py-0.5 rounded text-xs font-semibold" style="background: rgba(245,158,11,0.08); color: #92400e;">' + (INDUSTRY_CODES[d.industry] || 'XX') + '</span><p class="text-xs text-gray-400 mt-0.5">' + d.industry + '</p></td>' +
            '<td class="px-3 py-3 text-center"><span class="text-xs font-medium text-gray-600">' + d.location + '</span></td>' +
            '<td class="px-3 py-3 text-right"><span class="text-sm font-bold text-gray-800">¥' + (d.amount/10000).toFixed(0) + '万</span><p class="text-xs text-gray-400">' + d.totalUnits.toLocaleString() + '份</p></td>' +
            '<td class="px-3 py-3 text-center"><span class="text-sm font-bold" style="color: #0f766e;">' + d.revenueShare + '</span></td>' +
            '<td class="px-3 py-3 text-center"><span class="text-xs font-medium text-gray-600">' + d.period + '</span></td>' +
            '<td class="px-3 py-3 text-center"><span class="text-sm font-bold" style="color:' + aiColor + ';">' + d.aiScore + '</span></td>' +
            '<td class="px-3 py-3 text-center"><span class="text-xs font-bold px-1.5 py-0.5 rounded" style="background:' + grade.bg + '; color:' + grade.color + ';">' + d.riskGrade + '</span></td>' +
            '<td class="px-3 py-3"><div class="flex items-center gap-2"><div class="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden" style="min-width:48px;"><div class="h-full rounded-full" style="width:' + soldPct + '%; background:' + soldColor + ';"></div></div><span class="text-xs font-bold flex-shrink-0" style="color:' + soldColor + ';">' + soldPct + '%</span></div></td>' +
            '<td class="px-3 py-3 text-center">' + (d.myUnits > 0 ? '<div class="text-xs font-bold text-emerald-600">' + d.myUnits + '份</div><div class="text-xs text-gray-400">¥' + (d.myUnits * d.unitPrice).toLocaleString() + '</div>' : '<span class="text-xs text-gray-300">—</span>') + '</td>' +
            '<td class="px-3 py-3 text-center"><span class="badge ' + st.cls + '"><i class="fas ' + st.icon + ' mr-1" style="font-size:9px;"></i>' + st.label + '</span></td>' +
            '<td class="px-3 py-3 text-center"><button onclick="event.stopPropagation(); openDetail(\\'' + d.id + '\\')" class="text-xs text-teal-600 hover:text-teal-800 font-semibold"><i class="fas fa-arrow-right"></i></button></td>' +
          '</tr>';
        }).join('');
      }

      // ===== 卡片视图 =====
      if (contractView === 'card') {
        if (tableView) tableView.classList.add('hidden');
        if (cardView) cardView.classList.remove('hidden');

        const cardGrid = document.getElementById('contractCardGrid');
        if (!cardGrid) return;
        cardGrid.innerHTML = filtered.map(d => {
          const st = statusMap[d.status] || statusMap.open;
          const soldPct = d.totalUnits > 0 ? Math.round(d.soldUnits / d.totalUnits * 100) : 0;
          const soldColor = soldPct >= 80 ? '#ef4444' : soldPct >= 50 ? '#f59e0b' : '#10b981';
          const scores = calcRadarScores(d);
          const overall = calcOverallScore(scores);
          const grade = getScoreGrade(overall);
          const mcnInfo = parseMCN(d.mcn);
          const miniCanvasId = 'cMiniRadar_' + d.id;

          return '<div class="project-card group cursor-pointer" onclick="openDetail(\\'' + d.id + '\\')">' +
            // MCN 编号头
            '<div class="flex items-center justify-between mb-2">' +
              '<div class="flex items-center gap-2">' +
                '<span class="font-mono text-xs font-black tracking-wider px-2 py-1 rounded-lg" style="background: linear-gradient(135deg, #ecfdf5, #ecfeff); color: #0f766e; border: 1px solid rgba(46,196,182,0.15);">' + d.mcn + '</span>' +
              '</div>' +
              '<span class="badge ' + st.cls + ' flex-shrink-0"><i class="fas ' + st.icon + ' mr-1" style="font-size:9px;"></i>' + st.label + '</span>' +
            '</div>' +
            // 名称 + 评分
            '<div class="flex items-center justify-between mb-2">' +
              '<div class="flex items-center gap-2 min-w-0 flex-1">' +
                '<div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, rgba(93,196,179,0.12), rgba(73,168,154,0.12));"><i class="fas fa-briefcase text-sm" style="color: #5DC4B3;"></i></div>' +
                '<div class="min-w-0"><h3 class="font-bold text-gray-900 text-sm truncate group-hover:text-teal-600">' + d.name + '</h3><p class="text-xs text-gray-400">' + d.industry + ' · ' + d.location + '</p></div>' +
              '</div>' +
              '<div class="flex items-center gap-1.5 flex-shrink-0" title="合约综合评分">' +
                '<canvas id="' + miniCanvasId + '" width="60" height="60" style="width:28px;height:28px;"></canvas>' +
                '<div class="text-right"><p class="text-sm font-black leading-none" style="color:' + grade.color + ';">' + overall + '</p><p class="font-bold leading-none" style="font-size:9px; color:' + grade.color + ';">' + grade.grade + '</p></div>' +
              '</div>' +
            '</div>' +
            // 核心指标
            '<div class="grid grid-cols-4 gap-1.5 mb-2">' +
              '<div class="text-center p-1.5 rounded-lg bg-gray-50"><p class="text-xs font-bold text-gray-700">¥' + (d.amount/10000).toFixed(0) + '万</p><p class="text-xs text-gray-400" style="font-size:9px;">总额</p></div>' +
              '<div class="text-center p-1.5 rounded-lg bg-gray-50"><p class="text-xs font-bold" style="color:#0f766e;">' + d.revenueShare + '</p><p class="text-xs text-gray-400" style="font-size:9px;">分成</p></div>' +
              '<div class="text-center p-1.5 rounded-lg bg-gray-50"><p class="text-xs font-bold text-gray-700">' + d.period + '</p><p class="text-xs text-gray-400" style="font-size:9px;">期限</p></div>' +
              '<div class="text-center p-1.5 rounded-lg bg-gray-50"><p class="text-xs font-bold" style="color:' + (parseFloat(d.aiScore) >= 9 ? '#059669' : '#0d9488') + ';">' + d.aiScore + '</p><p class="text-xs text-gray-400" style="font-size:9px;">AI评分</p></div>' +
            '</div>' +
            // 认购进度
            '<div class="p-2 rounded-xl mb-2" style="background: linear-gradient(135deg, #f0fdf9, #ecfeff); border: 1px solid rgba(46,196,182,0.1);">' +
              '<div class="flex items-center justify-between mb-1">' +
                '<span class="text-xs font-semibold text-gray-600"><i class="fas fa-file-contract text-teal-500 mr-1" style="font-size:10px;"></i>' + d.totalUnits.toLocaleString() + ' 份</span>' +
                '<span class="text-xs font-bold" style="color:' + soldColor + ';">' + soldPct + '% 已认购</span>' +
              '</div>' +
              '<div class="h-1.5 rounded-full bg-gray-200 overflow-hidden"><div class="h-full rounded-full" style="width:' + soldPct + '%; background:' + soldColor + ';"></div></div>' +
              (d.myUnits > 0 ? '<div class="mt-1.5 flex items-center gap-1 text-xs"><i class="fas fa-user-check text-emerald-500" style="font-size:9px;"></i><span class="text-emerald-600 font-bold">我已认购 ' + d.myUnits + ' 份 (¥' + (d.myUnits * d.unitPrice).toLocaleString() + ')</span></div>' : '') +
            '</div>' +
            // 底部
            '<div class="flex items-center justify-between text-xs">' +
              '<span class="text-gray-400">发行 ' + d.issueDate + '</span>' +
              '<span class="text-gray-400">到期 ' + (d.maturityDate || '—') + '</span>' +
            '</div>' +
          '</div>';
        }).join('');

        // 延迟绘制小雷达
        setTimeout(() => {
          filtered.forEach(d => {
            const scores = calcRadarScores(d);
            drawMiniRadar('cMiniRadar_' + d.id, scores);
          });
        }, 50);
      }
    }

    function expressIntent() {
      if (!currentDeal) return;
      if (currentDeal.myUnits > 0) {
        showToast('info', '已认购', '您已认购 ' + currentDeal.myUnits + ' 份');
      } else {
        showSubscribeModal();
      }
    }

    // 维度详解展开/折叠
    function toggleDimDetail(el) {
      const detail = el.querySelector('.dim-detail');
      const arrow = el.querySelector('.dim-arrow');
      if (detail) {
        detail.classList.toggle('hidden');
        if (arrow) arrow.style.transform = detail.classList.contains('hidden') ? '' : 'rotate(180deg)';
      }
    }

    let allDimsExpanded = false;
    function toggleAllDims() {
      allDimsExpanded = !allDimsExpanded;
      document.querySelectorAll('.radar-dim-item').forEach(el => {
        const detail = el.querySelector('.dim-detail');
        const arrow = el.querySelector('.dim-arrow');
        if (detail) {
          if (allDimsExpanded) { detail.classList.remove('hidden'); if (arrow) arrow.style.transform = 'rotate(180deg)'; }
          else { detail.classList.add('hidden'); if (arrow) arrow.style.transform = ''; }
        }
      });
    }

    function switchDetailView(view) {
      ['sieve', 'financials', 'timeline'].forEach(v => {
        const btn = document.getElementById('btn' + v.charAt(0).toUpperCase() + v.slice(1));
        if (btn) { btn.className = v === view ? 'px-2.5 py-1 rounded-md text-xs font-semibold bg-white shadow text-teal-600' : 'px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600'; }
      });
    }

    // ==================== Modals ====================
    function showConfirm(title, msg, cb) {
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = msg;
      document.getElementById('confirmAction').onclick = () => { hideConfirm(); cb && cb(); };
      document.getElementById('confirmModal').classList.remove('hidden');
    }
    function hideConfirm() { document.getElementById('confirmModal').classList.add('hidden'); }

    // ==================== Onboarding ====================
    function showOnboarding() { document.getElementById('onboardingModal').classList.remove('hidden'); obStep = 0; updateOBStep(); }
    function closeOnboarding() { document.getElementById('onboardingModal').classList.add('hidden'); localStorage.setItem('ec_onboarded', '1'); }
    function updateOBStep() {
      const icons = ['fa-filter', 'fa-paper-plane', 'fa-filter', 'fa-hand-pointer'];
      document.getElementById('obIcon').className = 'fas ' + icons[obStep] + ' text-white text-4xl';
      for (let i = 0; i < 4; i++) {
        const el = document.getElementById('obStep' + i); if (el) el.style.display = i === obStep ? 'block' : 'none';
      }
      document.querySelectorAll('.step-dot').forEach((d, i) => d.classList.toggle('active', i === obStep));
      document.getElementById('obPrev').classList.toggle('hidden', obStep === 0);
      document.getElementById('obNext').innerHTML = obStep === 3 ? '开始使用<i class="fas fa-check ml-2"></i>' : '下一步<i class="fas fa-arrow-right ml-2"></i>';
    }
    function obNext() { if (obStep < 3) { obStep++; updateOBStep(); } else { closeOnboarding(); } }
    function obPrev() { if (obStep > 0) { obStep--; updateOBStep(); } }
    function goToOBStep(s) { obStep = s; updateOBStep(); }

    // ==================== AI Chat ====================
    function toggleAIChat() { document.getElementById('aiChat').classList.toggle('hidden'); }
    function sendAIMsg() {
      const input = document.getElementById('aiInput');
      const msg = input.value.trim(); if (!msg) return;
      const msgs = document.getElementById('aiMessages');
      msgs.innerHTML += '<div class="ai-message user"><div class="ai-message-avatar"><i class="fas fa-user"></i></div><div class="ai-message-content">' + msg + '</div></div>';
      input.value = '';
      setTimeout(() => {
        const responses = [
          '当前筛子「' + (getActiveSieveModels()[currentSieve]?.name || '全部') + '」筛选出 ' + dealsList.length + ' 个机会。如需调整标准，可切换其他筛子模型或在「管理筛子」中添加新筛子。',
          '「风控优先筛子」适合保守型投资者，它要求AI评分>=8.5、金额<=800万。「高回报筛子」则聚焦分成>=12%的高潜力项目。',
          '所有机会均来自发起通，经过平台基础审核。评估通筛子在此基础上做二次精筛，帮您找到最匹配的项目。',
          '建议先用「综合评估筛子」做全面筛选，再针对感兴趣的项目切换「风控优先」做安全性验证。',
          '表达参与意向后，项目将流向条款通进行交易条款协商。整个过程透明可追踪。'
        ];
        msgs.innerHTML += '<div class="ai-message assistant"><div class="ai-message-avatar"><i class="fas fa-robot"></i></div><div class="ai-message-content">' + responses[Math.floor(Math.random() * responses.length)] + '</div></div>';
        msgs.scrollTop = msgs.scrollHeight;
      }, 800);
    }

    // ==================== Init ====================
    function initApp() {
      const bar = document.getElementById('loadingBar');
      const status = document.getElementById('loadingStatus');
      const steps = [
        { p: 25, t: '连接发起通数据...' },
        { p: 50, t: '加载评估通筛子...' },
        { p: 75, t: '初始化参与通看板...' },
        { p: 100, t: '准备就绪' }
      ];
      let i = 0;
      const tick = setInterval(() => {
        if (i >= steps.length) {
          clearInterval(tick);
          setTimeout(() => {
            document.getElementById('app-loading').classList.add('fade-out');
            setTimeout(() => document.getElementById('app-loading').style.display = 'none', 500);
          }, 300);
          return;
        }
        bar.style.width = steps[i].p + '%'; status.textContent = steps[i].t; i++;
      }, 400);

      // 尝试从 localStorage 恢复
      const saved = localStorage.getItem('ec_allDeals');
      if (saved) { try { allDeals = JSON.parse(saved); } catch(e) {} }
    }

    document.addEventListener('DOMContentLoaded', initApp);
  </script>
</body>
</html>`)
})

// Favicon SVG
app.get('/favicon.svg', (c) => {
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="64" y2="64"><stop offset="0%" stop-color="#2EC4B6"/><stop offset="100%" stop-color="#28A696"/></linearGradient></defs><path d="M20 20 L44 32 L20 44 Z" fill="white" opacity="0.95"/></svg>',
    { headers: { 'Content-Type': 'image/svg+xml' } }
  )
})

export default app
