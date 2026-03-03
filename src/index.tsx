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

    /* ===== 合约卡片系统 (Fintech Card) ===== */
    .cc { background: white; border-radius: 16px; border: 1px solid rgba(0,0,0,0.06); overflow: hidden; transition: all 0.35s cubic-bezier(0.28,0.11,0.32,1); position: relative; }
    .cc:hover { border-color: rgba(46,196,182,0.25); box-shadow: 0 8px 32px rgba(46,196,182,0.08), 0 2px 8px rgba(0,0,0,0.04); transform: translateY(-2px); }
    .cc.cc-expanded { border-color: rgba(46,196,182,0.3); box-shadow: 0 12px 48px rgba(46,196,182,0.12), 0 4px 16px rgba(0,0,0,0.06); transform: none; grid-column: 1 / -1; }
    .cc-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #2EC4B6, #06b6d4, #8b5cf6); opacity: 0; transition: opacity 0.3s; }
    .cc:hover .cc-accent, .cc.cc-expanded .cc-accent { opacity: 1; }
    .cc-header { padding: 14px 16px; cursor: pointer; }
    .cc-body { padding: 0 16px 14px; }
    .cc-expand-area { max-height: 0; overflow: hidden; transition: max-height 0.45s cubic-bezier(0.28,0.11,0.32,1), opacity 0.3s; opacity: 0; }
    .cc.cc-expanded .cc-expand-area { max-height: 1800px; opacity: 1; }
    .cc-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .cc-metric { text-align: center; padding: 8px 4px; background: #f8fafc; border-radius: 10px; border: 1px solid rgba(0,0,0,0.03); }
    .cc-metric-val { font-size: 13px; font-weight: 800; color: #1a1a1a; }
    .cc-metric-lbl { font-size: 9px; color: #94a3b8; margin-top: 2px; letter-spacing: 0.03em; }
    .cc-progress { height: 5px; border-radius: 3px; background: #e5e7eb; overflow: hidden; }
    .cc-progress-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
    .cc-status { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
    .cc-status-open { background: rgba(245,158,11,0.1); color: #b45309; }
    .cc-status-interested { background: rgba(46,196,182,0.1); color: #0f766e; }
    .cc-status-confirmed { background: rgba(16,185,129,0.1); color: #047857; }
    .cc-status-closed { background: rgba(100,116,139,0.1); color: #475569; }
    .cc-mcn { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; color: #0f766e; padding: 3px 8px; background: linear-gradient(135deg, #ecfdf5, #ecfeff); border: 1px solid rgba(46,196,182,0.15); border-radius: 6px; }
    .cc-score-ring { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column; position: relative; }
    .cc-score-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 2.5px solid rgba(0,0,0,0.06); }
    .cc-expand-toggle { width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; transition: all 0.3s; border: none; cursor: pointer; }
    .cc-expand-toggle:hover { background: rgba(46,196,182,0.1); }
    .cc.cc-expanded .cc-expand-toggle { transform: rotate(180deg); background: rgba(46,196,182,0.15); }
    .cc-section { padding: 14px; background: #f8fafc; border-radius: 12px; border: 1px solid rgba(0,0,0,0.04); margin-bottom: 10px; }
    .cc-section-title { font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .cc-timeline { position: relative; padding-left: 20px; }
    .cc-timeline::before { content: ''; position: absolute; left: 5px; top: 4px; bottom: 4px; width: 2px; background: linear-gradient(180deg, #2EC4B6, #e5e7eb); border-radius: 1px; }
    .cc-timeline-item { position: relative; margin-bottom: 12px; }
    .cc-timeline-item:last-child { margin-bottom: 0; }
    .cc-timeline-dot { position: absolute; left: -18px; top: 3px; width: 8px; height: 8px; border-radius: 50%; border: 2px solid #2EC4B6; background: white; }
    .cc-timeline-dot.active { background: #2EC4B6; }
    .cc-grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
    @media (max-width: 768px) { .cc-grid-cards { grid-template-columns: 1fr; } .cc-metrics { grid-template-columns: repeat(2, 1fr); } }
    /* AI Builder 专属样式 */
    .ab-quick-btn { display: inline-flex; align-items: center; padding: 8px 14px; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.25s cubic-bezier(0.28,0.11,0.32,1); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); white-space: nowrap; }
    .ab-quick-btn:hover { background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.3); color: #c4b5fd; transform: translateY(-1px); }
    .ab-msg-user { display: flex; justify-content: flex-end; }
    .ab-msg-user > div { max-width: 80%; padding: 12px 16px; border-radius: 16px; border-bottom-right-radius: 4px; font-size: 13px; line-height: 1.6; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; box-shadow: 0 4px 12px rgba(124,58,237,0.25); }
    .ab-msg-ai { display: flex; gap: 12px; align-items: flex-start; }
    .ab-msg-ai .ab-avatar { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, #7c3aed, #6d28d9); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 12px rgba(124,58,237,0.3); }
    .ab-msg-ai .ab-avatar i { color: white; font-size: 12px; }
    .ab-msg-ai .ab-content { flex: 1; padding: 12px 16px; border-radius: 16px; border-top-left-radius: 4px; font-size: 13px; line-height: 1.6; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); }
    .ab-typing { display: flex; gap: 4px; padding: 6px 0; }
    .ab-typing span { width: 6px; height: 6px; border-radius: 50%; background: #7c3aed; animation: abTypingBounce 1.4s infinite ease-in-out both; }
    .ab-typing span:nth-child(1) { animation-delay: -0.32s; }
    .ab-typing span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes abTypingBounce { 0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
    .ab-portfolio-evolve { animation: abEvolve 0.6s cubic-bezier(0.28,0.11,0.32,1); }
    @keyframes abEvolve { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    #abInput::placeholder { color: rgba(255,255,255,0.25); }
    #abInput:focus { border-color: rgba(139,92,246,0.4); box-shadow: 0 0 0 3px rgba(139,92,246,0.1); outline: none; }
    @keyframes ccSlideDown { from { max-height: 0; opacity: 0; } to { max-height: 1800px; opacity: 1; } }
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

          <button onclick="showOnboarding()" class="tooltip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: #6b7280; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.06);" data-tip="新手引导"><i class="fas fa-question-circle text-xs"></i><span>帮助</span></button>
          <div class="h-5 mx-0.5" style="width: 1px; background: rgba(0,0,0,0.08);"></div>
          <button onclick="goToAIBuilder()" class="tooltip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: #7c3aed; background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(124,58,237,0.06)); border: 1px solid rgba(139,92,246,0.18);" data-tip="AI组合构建"><i class="fas fa-magic"></i><span>AI组合</span></button>
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

        <!-- Stats Grid — 全部合约客观维度总结 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div class="stat-card animate-fade-in cursor-pointer" onclick="selectSieve('all')">
            <div class="flex items-center justify-between"><div><p class="stat-label">总合约数量</p><p class="stat-value" id="statTotalContracts">0</p><p class="text-xs text-gray-400 mt-0.5">平台全部合约</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); box-shadow: 0 4px 12px rgba(99,102,241,0.3);"><i class="fas fa-layer-group text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-100 cursor-pointer" onclick="selectSieve('all')">
            <div class="flex items-center justify-between"><div><p class="stat-label">总交易数量</p><p class="stat-value" id="statTotalTransactions">0</p><p class="text-xs text-gray-400 mt-0.5">已完成交易</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 4px 12px rgba(245,158,11,0.3);"><i class="fas fa-exchange-alt text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-200 cursor-pointer" onclick="goToMyContracts()">
            <div class="flex items-center justify-between"><div><p class="stat-label">我的合约</p><p class="stat-value" id="statMyContracts">0</p><p class="text-xs text-gray-400 mt-0.5">已认购张数</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 12px rgba(16,185,129,0.3);"><i class="fas fa-file-contract text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-300 cursor-pointer" onclick="goToMyPortfolios()">
            <div class="flex items-center justify-between"><div><p class="stat-label">我的组合</p><p class="stat-value" id="statMyPortfolios">0</p><p class="text-xs text-gray-400 mt-0.5">跨项目基金型组合</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); box-shadow: 0 4px 12px rgba(139,92,246,0.3);"><i class="fas fa-object-group text-white text-sm"></i></div></div>
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
            <h2 class="text-base font-bold text-gray-800"><i class="fas fa-file-contract mr-1.5 text-teal-500"></i>合约看板</h2>
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

  <!-- ==================== Page: 我的合约 ==================== -->
  <div id="pageMyContracts" class="page flex-col min-h-screen grid-bg">
    <nav class="px-5 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goToDashboard()" class="back-btn flex items-center px-2.5 py-1.5 text-gray-600 hover:text-teal-600 rounded-lg text-sm"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium">返回看板</span></button>
          <div class="border-l border-gray-200 pl-3">
            <h1 class="text-base font-bold text-gray-900"><i class="fas fa-file-contract mr-1.5 text-emerald-500"></i>我的合约</h1>
            <p class="text-xs text-gray-400" id="myContractsSubtitle">已认购 0 张 · 总投入 ¥0</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <input type="text" id="mcSearchInput" placeholder="搜索合约名称/MCN…" class="search-input px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white w-52" oninput="renderMyContracts()">
          <select class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" id="mcFilterIndustry" onchange="renderMyContracts()">
            <option value="all">全部行业</option>
          </select>
          <select class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" id="mcSortBy" onchange="renderMyContracts()">
            <option value="date">按认购时间</option>
            <option value="score">按AI评分</option>
            <option value="yield">按分成比例</option>
            <option value="project">按项目分组</option>
          </select>
        </div>
      </div>
    </nav>
    <div class="flex-1 p-4">
      <div class="max-w-7xl mx-auto">
        <!-- 统计概览 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5" id="mcStatsGrid"></div>
        <!-- 合约列表 -->
        <div id="mcGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"></div>
        <!-- 空状态 -->
        <div id="mcEmpty" class="hidden text-center py-16">
          <div class="empty-state-icon mx-auto animate-float"><i class="fas fa-file-contract"></i></div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">暂无合约</h3>
          <p class="text-sm text-gray-500 mb-4">您还没有认购任何合约，去合约看板挑选吧</p>
          <button onclick="goToDashboard()" class="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium shadow-lg shadow-teal-200"><i class="fas fa-shopping-cart mr-2"></i>去认购</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page: 我的组合 ==================== -->
  <div id="pageMyPortfolios" class="page flex-col min-h-screen grid-bg">
    <nav class="px-5 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goToDashboard()" class="back-btn flex items-center px-2.5 py-1.5 text-gray-600 hover:text-teal-600 rounded-lg text-sm"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium">返回看板</span></button>
          <div class="border-l border-gray-200 pl-3">
            <h1 class="text-base font-bold text-gray-900"><i class="fas fa-object-group mr-1.5 text-violet-500"></i>我的组合</h1>
            <p class="text-xs text-gray-400" id="myPortfoliosSubtitle">共 0 个组合 · 0 张合约 · 总投入 ¥0</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <div class="px-3 py-1.5 bg-violet-50 rounded-lg border border-violet-100 text-xs text-violet-700 font-medium"><i class="fas fa-info-circle mr-1"></i>跨项目基金型组合 · 按投资理念和主题智能配置</div>
        </div>
      </div>
    </nav>
    <div class="flex-1 p-4">
      <div class="max-w-7xl mx-auto">
        <!-- 组合筛选栏 -->
        <div class="flex items-center gap-2 mb-4 flex-wrap">
          <button onclick="filterPortfoliosByCategory('all')" class="mp-filter-btn active px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="all"><i class="fas fa-th mr-1"></i>全部</button>
          <button onclick="filterPortfoliosByCategory('稳健型')" class="mp-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="稳健型"><i class="fas fa-shield-alt mr-1"></i>稳健型</button>
          <button onclick="filterPortfoliosByCategory('进取型')" class="mp-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="进取型"><i class="fas fa-rocket mr-1"></i>进取型</button>
          <button onclick="filterPortfoliosByCategory('平衡型')" class="mp-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="平衡型"><i class="fas fa-balance-scale mr-1"></i>平衡型</button>
          <button onclick="filterPortfoliosByCategory('主题型')" class="mp-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="主题型"><i class="fas fa-bullseye mr-1"></i>主题型</button>
          <button onclick="filterPortfoliosByCategory('行业型')" class="mp-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="行业型"><i class="fas fa-industry mr-1"></i>行业型</button>
        </div>
        <!-- 组合统计 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5" id="mpStatsGrid"></div>
        <!-- 组合列表 -->
        <div id="mpGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"></div>
        <!-- 空状态 -->
        <div id="mpEmpty" class="hidden text-center py-16">
          <div class="empty-state-icon mx-auto animate-float"><i class="fas fa-object-group"></i></div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">暂无组合</h3>
          <p class="text-sm text-gray-500 mb-4">认购合约后自动生成投资组合</p>
          <button onclick="goToDashboard()" class="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium shadow-lg shadow-teal-200"><i class="fas fa-shopping-cart mr-2"></i>去认购合约</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page: 组合详情 ==================== -->
  <div id="pagePortfolioDetail" class="page flex-col h-screen grid-bg">
    <nav class="px-4 py-2.5 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goToMyPortfolios()" class="back-btn flex items-center px-2.5 py-1.5 text-gray-600 hover:text-teal-600 rounded-lg text-sm"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium">返回组合</span></button>
          <div class="border-l border-gray-200 pl-3">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" id="pdIconBox" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"><i class="fas fa-object-group text-white text-sm" id="pdIcon"></i></div>
              <div>
                <div class="flex items-center gap-2"><h1 class="font-bold text-gray-900 text-sm" id="pdTitle">组合名称</h1><span id="pdCategoryBadge" class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:#ede9fe;color:#7c3aed;">稳健型</span></div>
                <p class="text-xs text-gray-500" id="pdSubtitle">0 张合约 · 0 个项目 · 总投入 ¥0</p>
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span id="pdGradeBadge" class="px-3 py-1 rounded-xl text-sm font-bold"></span>
        </div>
      </div>
    </nav>
    <div class="flex flex-1 overflow-hidden">
      <!-- Left: 组合概览 -->
      <div class="w-2/5 border-r border-gray-200 flex flex-col bg-white overflow-y-auto">
        <div class="p-5" id="pdLeft">
          <div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><p class="text-sm">加载中...</p></div>
        </div>
      </div>
      <!-- Right: 组合雷达图+合约列表 -->
      <div class="w-3/5 flex flex-col bg-slate-50 overflow-y-auto">
        <div class="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
          '<span class="text-sm font-semibold text-gray-700"><i class="fas fa-chart-pie mr-1.5 text-violet-500"></i>组合加权分析</span>
          '<span class="text-xs text-gray-400" id="pdWeightNote">跨项目合约等权重加权</span>
        </div>
        <div class="flex-1 p-5" id="pdRight">
          <div class="text-center py-16 text-gray-400"><i class="fas fa-chart-area text-4xl mb-3 opacity-40"></i><p class="text-sm">加载组合加权分析...</p></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page: AI 组合构建器 ==================== -->
  <div id="pageAIBuilder" class="page flex-col h-screen" style="background: #0f0f17;">
    <!-- Nav -->
    <nav class="px-5 py-2.5 flex-shrink-0" style="background: rgba(15,15,23,0.95); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(139,92,246,0.12);">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goToDashboard()" class="flex items-center px-2.5 py-1.5 rounded-lg text-sm transition-all" style="color: rgba(255,255,255,0.5);" onmouseover="this.style.color='#c4b5fd';this.style.background='rgba(139,92,246,0.1)'" onmouseout="this.style.color='rgba(255,255,255,0.5)';this.style.background='none'"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium">返回看板</span></button>
          <div class="border-l pl-3" style="border-color: rgba(255,255,255,0.08);">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); box-shadow: 0 0 20px rgba(124,58,237,0.4);"><i class="fas fa-magic text-white text-sm"></i></div>
              <div><h1 class="text-sm font-bold text-white">AI 组合构建器</h1><p class="text-xs" style="color: rgba(255,255,255,0.35); font-family:'Montserrat',sans-serif; letter-spacing:0.05em; font-size:9px;">PORTFOLIO ARCHITECT · PILOT</p></div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-full text-xs font-medium" style="background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2);"><i class="fas fa-flask mr-1"></i>试点功能</span>
          <button onclick="resetAIBuilder()" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style="color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.08);" onmouseover="this.style.color='#f87171';this.style.borderColor='rgba(248,113,113,0.3)'" onmouseout="this.style.color='rgba(255,255,255,0.4)';this.style.borderColor='rgba(255,255,255,0.08)'"><i class="fas fa-redo mr-1"></i>重新开始</button>
        </div>
      </div>
    </nav>

    <!-- Main Content: 左对话 + 右组合 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- ===== 左侧: AI 对话区 ===== -->
      <div class="w-2/5 flex flex-col" style="background: linear-gradient(180deg, #0f0f17 0%, #13131f 100%); border-right: 1px solid rgba(139,92,246,0.1);">
        <!-- 对话消息区 -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4" id="abMessages" style="scroll-behavior: smooth;">
          <!-- 初始欢迎 -->
          <div class="flex items-start gap-3 animate-fade-in" id="abWelcome">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); box-shadow: 0 0 16px rgba(124,58,237,0.35);"><i class="fas fa-robot text-white text-sm"></i></div>
            <div class="flex-1">
              <div class="p-4 rounded-2xl rounded-tl-md" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.06);">
                <p class="text-sm text-white leading-relaxed mb-3">您好！我是 <span style="color: #c4b5fd; font-weight: 700;">参与通 AI 组合构建器</span>。</p>
                <p class="text-sm leading-relaxed mb-3" style="color: rgba(255,255,255,0.65);">我将通过对话，了解您的投资偏好和目标，从平台全部合约中为您智能构建个性化投资组合。</p>
                <p class="text-sm leading-relaxed mb-4" style="color: rgba(255,255,255,0.65);">我们先从一个简单的问题开始 —</p>
                <div class="p-3 rounded-xl" style="background: linear-gradient(135deg, rgba(124,58,237,0.12), rgba(139,92,246,0.08)); border: 1px solid rgba(139,92,246,0.2);">
                  <p class="text-sm font-semibold" style="color: #c4b5fd;"><i class="fas fa-compass mr-1.5"></i>您这次投资最看重什么？</p>
                </div>
              </div>
              <!-- 快捷选项 -->
              <div class="flex flex-wrap gap-2 mt-3" id="abQuickOptions">
                <button onclick="abSelectOption('追求稳定收益，安全第一')" class="ab-quick-btn"><i class="fas fa-shield-alt mr-1.5 text-emerald-400"></i>稳定收益，安全第一</button>
                <button onclick="abSelectOption('愿承担风险，追求高回报')" class="ab-quick-btn"><i class="fas fa-rocket mr-1.5 text-amber-400"></i>愿承担风险，追高回报</button>
                <button onclick="abSelectOption('攻守兼备，均衡配置')" class="ab-quick-btn"><i class="fas fa-balance-scale mr-1.5 text-blue-400"></i>攻守兼备，均衡配置</button>
                <button onclick="abSelectOption('看好特定行业，集中布局')" class="ab-quick-btn"><i class="fas fa-bullseye mr-1.5 text-pink-400"></i>看好特定行业，集中布局</button>
              </div>
            </div>
          </div>
        </div>
        <!-- 输入区 -->
        <div class="flex-shrink-0 p-4" style="border-top: 1px solid rgba(255,255,255,0.06); background: rgba(15,15,23,0.9);">
          <div class="flex items-center gap-2">
            <div class="flex-1 relative">
              <input type="text" id="abInput" placeholder="输入您的投资需求或偏好..." class="w-full px-4 py-3 pr-12 rounded-xl text-sm" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: white;" onkeydown="if(event.key==='Enter')abSendMessage()">
            </div>
            <button onclick="abSendMessage()" class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); box-shadow: 0 4px 12px rgba(124,58,237,0.3);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-paper-plane text-white text-sm"></i></button>
          </div>
          <p class="text-xs mt-2 text-center" style="color: rgba(255,255,255,0.2);">AI 实时分析您的需求，从 <span id="abTotalContracts">0</span> 张合约中智能配置</p>
        </div>
      </div>

      <!-- ===== 右侧: 实时组合面板 ===== -->
      <div class="w-3/5 flex flex-col overflow-y-auto" style="background: linear-gradient(180deg, #111118 0%, #0f0f17 100%);">
        <!-- 组合未生成时的等待状态 -->
        <div id="abWaitingState" class="flex-1 flex items-center justify-center p-8">
          <div class="text-center max-w-md">
            <div class="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style="background: linear-gradient(135deg, rgba(124,58,237,0.1), rgba(139,92,246,0.06)); border: 1px dashed rgba(139,92,246,0.25);">
              <i class="fas fa-layer-group text-4xl" style="color: rgba(139,92,246,0.4);"></i>
            </div>
            <h3 class="text-lg font-bold text-white mb-2" style="letter-spacing: -0.02em;">等待 AI 构建您的专属组合</h3>
            <p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.4);">在左侧与 AI 对话，描述您的投资偏好。AI 将根据您的需求从全平台合约中实时构建投资组合。</p>
            <div class="flex items-center justify-center gap-4 mt-6">
              <div class="flex items-center gap-1.5" style="color: rgba(255,255,255,0.25);"><div class="w-2 h-2 rounded-full" style="background: #7c3aed;"></div><span class="text-xs">风格偏好</span></div>
              <i class="fas fa-long-arrow-alt-right" style="color: rgba(255,255,255,0.15);"></i>
              <div class="flex items-center gap-1.5" style="color: rgba(255,255,255,0.25);"><div class="w-2 h-2 rounded-full" style="background: #06b6d4;"></div><span class="text-xs">行业选择</span></div>
              <i class="fas fa-long-arrow-alt-right" style="color: rgba(255,255,255,0.15);"></i>
              <div class="flex items-center gap-1.5" style="color: rgba(255,255,255,0.25);"><div class="w-2 h-2 rounded-full" style="background: #10b981;"></div><span class="text-xs">组合生成</span></div>
            </div>
          </div>
        </div>

        <!-- 组合结果面板（初始隐藏） -->
        <div id="abPortfolioPanel" class="hidden flex-1 p-5 space-y-4 overflow-y-auto">
          <!-- 组合 header -->
          <div class="rounded-2xl overflow-hidden" id="abPortfolioHeader">
            <div class="p-5" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%); position: relative;">
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 30%, rgba(139,92,246,0.3) 0%, transparent 50%);pointer-events:none;"></div>
              <div class="relative z-10">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-xs font-bold" style="background: rgba(196,181,253,0.2); color: #c4b5fd;"><i class="fas fa-magic mr-1"></i>AI 构建</span>
                    <span class="text-xs" style="color: rgba(255,255,255,0.4);" id="abPortfolioMeta">实时生成</span>
                  </div>
                  <span class="px-3 py-1 rounded-xl text-sm font-bold" id="abGradeBadge" style="background: rgba(16,185,129,0.15); color: #34d399;">A · 82分</span>
                </div>
                <h2 class="text-xl font-bold text-white mb-1" id="abPortfolioName" style="letter-spacing:-0.02em;">AI 推荐组合</h2>
                <p class="text-xs" style="color: rgba(255,255,255,0.45);" id="abPortfolioDesc">基于您的投资偏好智能生成</p>
                <!-- 核心数字 -->
                <div class="grid grid-cols-4 gap-2 mt-4" id="abCoreStats">
                  <div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.06);">
                    <p class="text-lg font-black text-white" id="abStatContracts">0</p>
                    <p style="font-size:9px; color: rgba(255,255,255,0.35);">张合约</p>
                  </div>
                  <div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.06);">
                    <p class="text-lg font-black text-violet-300" id="abStatProjects">0</p>
                    <p style="font-size:9px; color: rgba(255,255,255,0.35);">个项目</p>
                  </div>
                  <div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.06);">
                    <p class="text-lg font-black text-amber-300" id="abStatValue">¥0</p>
                    <p style="font-size:9px; color: rgba(255,255,255,0.35);">总投入</p>
                  </div>
                  <div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.06);">
                    <p class="text-lg font-black text-emerald-300" id="abStatReturn">0%</p>
                    <p style="font-size:9px; color: rgba(255,255,255,0.35);">预期回报</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 雷达图 -->
          <div class="rounded-2xl overflow-hidden" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
            <div class="p-4 flex items-center justify-between" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
              <span class="text-sm font-bold text-white"><i class="fas fa-chart-pie mr-1.5" style="color: #a78bfa;"></i>组合雷达评估</span>
              <span class="text-xs" style="color: rgba(255,255,255,0.3);">8维度量化</span>
            </div>
            <div class="flex items-center justify-center py-4 px-2">
              <canvas id="abRadarCanvas" style="max-width:100%;"></canvas>
            </div>
            <div class="px-4 pb-4">
              <div class="grid grid-cols-4 gap-2" id="abDimGrid"></div>
            </div>
          </div>

          <!-- 行业配比 -->
          <div class="rounded-2xl p-4" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
            <h3 class="text-sm font-bold text-white mb-3"><i class="fas fa-chart-bar mr-1.5" style="color:#06b6d4;"></i>行业配比</h3>
            <div id="abIndustryDistrib" class="space-y-2"></div>
          </div>

          <!-- 合约清单 -->
          <div class="rounded-2xl p-4" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-bold text-white"><i class="fas fa-list mr-1.5" style="color:#10b981;"></i>推荐合约清单</h3>
              <span class="text-xs" style="color: rgba(255,255,255,0.3);" id="abContractCount">0 张</span>
            </div>
            <div class="space-y-2" id="abContractList"></div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-3 pt-2 pb-4">
            <button onclick="abApplyPortfolio()" class="flex-1 py-3 rounded-xl text-sm font-bold transition-all" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; box-shadow: 0 4px 16px rgba(124,58,237,0.35);" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'"><i class="fas fa-check-circle mr-2"></i>一键认购此组合</button>
            <button onclick="abRefine()" class="py-3 px-5 rounded-xl text-sm font-medium transition-all" style="color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1);" onmouseover="this.style.color='#c4b5fd';this.style.borderColor='rgba(139,92,246,0.3)'" onmouseout="this.style.color='rgba(255,255,255,0.5)';this.style.borderColor='rgba(255,255,255,0.1)'"><i class="fas fa-sliders-h mr-1"></i>继续调整</button>
          </div>
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
            const amt = d.projectTotalAmount || 0;
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
            const amt = d.projectTotalAmount || 0;
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
            const amt = d.projectTotalAmount || 0;
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
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      closeBtn.onclick = function() { this.parentElement.classList.add('toast-exit'); setTimeout(function() { toast.remove(); }, 300); };
      toast.innerHTML = '<div class="toast-icon"><i class="' + (icons[type]||icons.info) + '"></i></div><div class="toast-body"><div class="toast-title">' + title + '</div>' + (message ? '<div class="toast-message">' + message + '</div>' : '') + '</div><div class="toast-progress" style="animation-duration: ' + duration + 'ms;"></div>';
      toast.appendChild(closeBtn);
      container.appendChild(toast);
      setTimeout(function() { if (toast.parentElement) { toast.classList.add('toast-exit'); setTimeout(function() { toast.remove(); }, 300); } }, duration);
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
      showToast('info', '游客模式', '已加载 ' + totalVirtualContracts.toLocaleString() + ' 张合约（' + PROJECT_TEMPLATES.length + '个项目 · ¥1,000/张）展示 ' + allDeals.length + ' 张代表性合约');
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
      initMySieves();
      renderSieveSelector();
      selectSieve('all');
      // 登录后直接进入合约看板（首页）
      goToDashboard();
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
    // ★ 核心概念重构：
    //   一个项目 = 多张合约，融资金额 = 合约张数 × ¥1,000/张
    //   项目融资额范围：30万~200万（即300~2000张合约）
    //   合约看板以项目为维度分组展示
    const PROJECT_TEMPLATES = [
      // ——— 餐饮 F&B ———
      { name: '星巴克杭州西溪天堂店', industry: '餐饮', location: '杭州', originator: '杭州星巴克运营有限公司', issueDate: '2026-01-10', totalAmount: 80, revenueShare: 12, period: 24, aiScore: 8.7, riskGrade: 'A+', monthlyRevenue: 120, employeeCount: 45, operatingYears: 3.5, desc: '星巴克臻选店，西溪湿地核心商圈，日均客流8000+' },
      { name: '海底捞成都春熙路旗舰店', industry: '餐饮', location: '成都', originator: '海底捞成都运营总部', issueDate: '2026-01-18', totalAmount: 120, revenueShare: 11, period: 30, aiScore: 8.3, riskGrade: 'A', monthlyRevenue: 180, employeeCount: 85, operatingYears: 7.5, desc: '海底捞西南区旗舰店，春熙路核心位置，月均翻台率4.2' },
      { name: '太二酸菜鱼广州天河城店', industry: '餐饮', location: '广州', originator: '太二餐饮管理有限公司', issueDate: '2026-02-01', totalAmount: 55, revenueShare: 9, period: 24, aiScore: 7.9, riskGrade: 'A-', monthlyRevenue: 85, employeeCount: 32, operatingYears: 3.0, desc: '九毛九旗下网红品牌，天河核心商圈，排队率高' },
      { name: '喜茶上海南京西路概念店', industry: '餐饮', location: '上海', originator: '深圳美西西餐饮管理有限公司', issueDate: '2026-02-08', totalAmount: 65, revenueShare: 13, period: 24, aiScore: 8.5, riskGrade: 'A', monthlyRevenue: 140, employeeCount: 38, operatingYears: 2.8, desc: '喜茶LAB概念店，配备手冲茶实验室，日均出杯2000+' },
      { name: '奈雪的茶深圳万象城旗舰店', industry: '餐饮', location: '深圳', originator: '深圳市品道餐饮管理有限公司', issueDate: '2025-12-20', totalAmount: 48, revenueShare: 10, period: 24, aiScore: 7.6, riskGrade: 'A-', monthlyRevenue: 75, employeeCount: 28, operatingYears: 2.2, desc: '奈雪PRO店型，精简高效模型，坪效领先同行业' },
      // ——— 零售 RT ———
      { name: '泡泡玛特北京三里屯旗舰店', industry: '零售', location: '北京', originator: '泡泡玛特国际集团', issueDate: '2026-01-25', totalAmount: 95, revenueShare: 8, period: 30, aiScore: 7.8, riskGrade: 'A-', monthlyRevenue: 60, employeeCount: 25, operatingYears: 1.5, desc: '盲盒零售标杆门店，IP矩阵丰富，会员复购率65%' },
      { name: '名创优品上海环球港店', industry: '零售', location: '上海', originator: '名创优品集团控股有限公司', issueDate: '2026-02-05', totalAmount: 45, revenueShare: 7, period: 24, aiScore: 7.4, riskGrade: 'B+', monthlyRevenue: 55, employeeCount: 18, operatingYears: 4.0, desc: '全球化零售品牌，超200SKU月更，高周转低库存' },
      { name: '瑞幸咖啡深圳科技园集群店', industry: '零售', location: '深圳', originator: '瑞幸咖啡(中国)有限公司', issueDate: '2026-02-10', totalAmount: 38, revenueShare: 8, period: 24, aiScore: 8.0, riskGrade: 'A', monthlyRevenue: 92, employeeCount: 15, operatingYears: 2.5, desc: '写字楼集群覆盖模式，3家联营门店打包，日均单量800+' },
      // ——— 科技 TC ———
      { name: '字节跳动AI Lab加速器', industry: '科技', location: '北京', originator: '字节跳动投融资管理部', issueDate: '2026-01-15', totalAmount: 200, revenueShare: 15, period: 36, aiScore: 9.2, riskGrade: 'A+', monthlyRevenue: 280, employeeCount: 120, operatingYears: 6.0, desc: 'AI大模型商业化项目，ToB SaaS收入稳定增长，月活用户500万+' },
      { name: '商汤科技智慧城市项目', industry: '科技', location: '上海', originator: '商汤科技集团股份有限公司', issueDate: '2026-02-12', totalAmount: 150, revenueShare: 14, period: 36, aiScore: 8.8, riskGrade: 'A', monthlyRevenue: 210, employeeCount: 95, operatingYears: 5.5, desc: '智慧城市解决方案，已签约12个一线城市，政府采购订单稳定' },
      { name: '大疆创新农业无人机项目', industry: '科技', location: '深圳', originator: '深圳市大疆创新科技有限公司', issueDate: '2025-12-28', totalAmount: 130, revenueShare: 12, period: 30, aiScore: 9.0, riskGrade: 'A+', monthlyRevenue: 185, employeeCount: 78, operatingYears: 8.0, desc: '农业植保无人机，覆盖全国15省，设备保有量行业第一' },
      // ——— 教育 ED ———
      { name: '新东方AI智慧学堂', industry: '教育', location: '北京', originator: '新东方教育科技集团', issueDate: '2026-02-01', totalAmount: 85, revenueShare: 10, period: 30, aiScore: 7.5, riskGrade: 'A-', monthlyRevenue: 65, employeeCount: 90, operatingYears: 5.2, desc: 'AI双师课堂，覆盖K12全学段，续课率85%，月增学员3000+' },
      { name: '猿辅导天津线下中心', industry: '教育', location: '天津', originator: '北京猿力教育科技有限公司', issueDate: '2026-02-15', totalAmount: 60, revenueShare: 9, period: 30, aiScore: 7.2, riskGrade: 'B+', monthlyRevenue: 48, employeeCount: 55, operatingYears: 3.8, desc: 'OMO线上线下融合教育，社区化小班精品课，家长满意度92%' },
      // ——— 健康 HC ———
      { name: '美年大健康上海浦东旗舰中心', industry: '健康', location: '上海', originator: '美年大健康产业控股股份有限公司', issueDate: '2026-01-20', totalAmount: 110, revenueShare: 14, period: 24, aiScore: 8.9, riskGrade: 'A', monthlyRevenue: 165, employeeCount: 72, operatingYears: 6.0, desc: '高端体检+专科医疗，日均检量350人，企业团检客户200+' },
      { name: '和睦家北京CBD诊所', industry: '健康', location: '北京', originator: '和睦家医疗集团', issueDate: '2026-02-18', totalAmount: 90, revenueShare: 16, period: 24, aiScore: 9.1, riskGrade: 'A+', monthlyRevenue: 195, employeeCount: 60, operatingYears: 8.0, desc: '高端私立医疗品牌，外籍医生团队，保险直付覆盖率95%' },
      { name: '微医互联网医院杭州中心', industry: '健康', location: '杭州', originator: '微医集团(浙江)有限公司', issueDate: '2025-12-15', totalAmount: 70, revenueShare: 11, period: 30, aiScore: 7.8, riskGrade: 'A-', monthlyRevenue: 88, employeeCount: 45, operatingYears: 4.5, desc: '互联网+医疗，线上问诊月活120万，AI辅诊准确率92%' },
      // ——— 演艺 EN ———
      { name: '周杰伦2026全球巡回演唱会', industry: '演艺', location: '全国', originator: '杰威尔音乐有限公司', issueDate: '2026-01-08', totalAmount: 180, revenueShare: 18, period: 18, aiScore: 9.5, riskGrade: 'A+', monthlyRevenue: 350, employeeCount: 15, operatingYears: 12.0, desc: '亚洲顶级IP，20城巡演，场均4万人，衍生品收入占比30%' },
      { name: '开心麻花全国巡演项目', industry: '演艺', location: '北京', originator: '北京开心麻花娱乐文化传媒', issueDate: '2026-02-20', totalAmount: 55, revenueShare: 12, period: 24, aiScore: 8.0, riskGrade: 'A-', monthlyRevenue: 75, employeeCount: 40, operatingYears: 10.0, desc: '话剧+电影双线收入，全国30城巡演，IP改编电影累计票房50亿+' },
      // ——— 新增行业覆盖 ———
      { name: '顺丰同城急送杭州运营中心', industry: '零售', location: '杭州', originator: '顺丰同城急送有限公司', issueDate: '2026-01-30', totalAmount: 75, revenueShare: 9, period: 24, aiScore: 8.1, riskGrade: 'A', monthlyRevenue: 130, employeeCount: 200, operatingYears: 3.0, desc: '同城配送头部品牌，日均单量12万，骑手团队规模5000+' },
      { name: '蔚来汽车成都交付中心', industry: '科技', location: '成都', originator: '蔚来汽车科技(安徽)有限公司', issueDate: '2026-02-22', totalAmount: 160, revenueShare: 13, period: 36, aiScore: 8.4, riskGrade: 'A', monthlyRevenue: 220, employeeCount: 65, operatingYears: 5.0, desc: '新能源汽车交付+售后一体化，月均交付300台，NPS行业领先' }
    ];

    // ★ 虚拟合约生成器 — 按需生成合约对象，避免一次性创建数万条记录导致浏览器卡死
    // 核心思路：只存项目级元数据 + 每个项目生成少量代表性合约用于展示
    // 全量数字（如 19,110 张）仅用于统计显示，不实际创建对象

    const STATUS_POOL = ['available', 'available', 'available', 'sold', 'available', 'sold', 'available', 'mine', 'available', 'sold'];
    const HOLDER_NAMES = ['张三', '李四', '王五', '赵六', '陈七', '机构A', '基金B', '投资人C', '信托D', '私募E', '家办F', '资管G'];
    const MAX_CONTRACTS_PER_PROJECT = 60; // 每项目实际生成的合约上限（用于展示和交互）

    // 项目级汇总缓存（用于快速统计）
    let projectSummaries = [];
    let totalVirtualContracts = 0; // 全部项目的虚拟合约总数（真实融资额 × 10）

    function buildContractForProject(proj, pi, ci, globalSeq, totalContracts) {
      var mcn = generateMCN(proj.industry, proj.location, proj.issueDate, globalSeq);
      var statusIdx = (pi * 7 + ci * 3 + Math.floor(ci / 10)) % STATUS_POOL.length;
      var statusRand = STATUS_POOL[statusIdx];
      var holder = null;
      var isMine = false;
      if (statusRand === 'mine') {
        holder = currentUser ? (currentUser.displayName || currentUser.username) : '游客';
        isMine = true;
        statusRand = 'sold';
      } else if (statusRand === 'sold') {
        holder = HOLDER_NAMES[(pi * 3 + ci) % HOLDER_NAMES.length];
      }
      var scoreVariation = ((ci * 7 + pi * 13) % 7 - 3) * 0.1;
      var finalScore = Math.max(6.5, Math.min(9.9, proj.aiScore + scoreVariation));
      var monthsNum = proj.period;
      var issue = new Date(proj.issueDate);
      var matDate = new Date(issue); matDate.setMonth(matDate.getMonth() + monthsNum);

      return {
        id: 'C_' + globalSeq,
        mcn: mcn,
        projectId: 'P_' + (pi + 1),
        name: proj.name,
        industry: proj.industry,
        location: proj.location,
        originator: proj.originator,
        originateDate: proj.issueDate,
        issueDate: proj.issueDate,
        maturityDate: matDate.toISOString().slice(0, 10),
        faceValue: 1000,
        status: statusRand,
        holder: holder,
        isMine: isMine,
        revenueShare: proj.revenueShare + '%',
        period: proj.period + '个月',
        aiScore: finalScore.toFixed(1),
        riskGrade: proj.riskGrade,
        monthlyRevenue: proj.monthlyRevenue + '万',
        employeeCount: proj.employeeCount,
        operatingYears: proj.operatingYears.toFixed(1),
        contractType: 'RSN',
        currency: 'CNY',
        seqInProject: ci + 1,
        totalInProject: totalContracts,
        projectTotalAmount: proj.totalAmount,
        projectDesc: proj.desc || '',
        description: '由「' + proj.originator + '」通过发起通发行的' + proj.industry + '行业标准合约。面值 ¥1,000 · 收益分享合约(RSN)。项目融资总额 ¥' + proj.totalAmount + '万（' + totalContracts + '张合约）。'
      };
    }

    function loadDemoData() {
      // ★ 性能优化：每个项目只生成 MAX_CONTRACTS_PER_PROJECT 张代表性合约
      //   项目的真实合约总数 = totalAmount × 10（仅用于统计展示）
      //   例：星巴克80万 = 虚拟800张，但实际只生成60张供浏览
      allDeals = [];
      projectSummaries = [];
      totalVirtualContracts = 0;
      var globalSeq = 1;

      PROJECT_TEMPLATES.forEach(function(proj, pi) {
        var virtualTotal = proj.totalAmount * 10; // 虚拟总数（真实融资额映射）
        var actualGen = Math.min(virtualTotal, MAX_CONTRACTS_PER_PROJECT); // 实际生成数
        totalVirtualContracts += virtualTotal;

        // 统计虚拟总分布（确定性计算，不需要生成全部对象）
        var vAvail = 0, vSold = 0, vMine = 0;
        for (var vi = 0; vi < virtualTotal; vi++) {
          var sIdx = (pi * 7 + vi * 3 + Math.floor(vi / 10)) % STATUS_POOL.length;
          var sRand = STATUS_POOL[sIdx];
          if (sRand === 'mine') { vMine++; vSold++; }
          else if (sRand === 'sold') { vSold++; }
          else { vAvail++; }
        }

        projectSummaries.push({
          projectId: 'P_' + (pi + 1),
          name: proj.name,
          industry: proj.industry,
          location: proj.location,
          originator: proj.originator,
          totalAmount: proj.totalAmount,
          virtualTotal: virtualTotal,
          actualGen: actualGen,
          available: vAvail,
          sold: vSold,
          mine: vMine,
          aiScore: proj.aiScore,
          riskGrade: proj.riskGrade,
          revenueShare: proj.revenueShare,
          period: proj.period,
          desc: proj.desc || ''
        });

        // 只生成 actualGen 张合约（均匀采样）
        for (var ci = 0; ci < actualGen; ci++) {
          // 均匀采样：从虚拟总数中按比例选取序号
          var sampledIdx = actualGen < virtualTotal
            ? Math.floor(ci * (virtualTotal / actualGen))
            : ci;
          var contract = buildContractForProject(proj, pi, sampledIdx, globalSeq, virtualTotal);
          // 覆盖 seqInProject 为采样序号+1，保留 totalInProject 为虚拟总数
          contract.seqInProject = sampledIdx + 1;
          allDeals.push(contract);
          globalSeq++;
        }
      });

      // 不再写入 localStorage（19K+ 对象会超过 5MB 配额导致卡死）
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

      // 5. 流动性 — 基于合约状态和项目热度
      var idNum = parseInt((deal.id || '0').replace(/\\D/g, '')) || 0;
      var liquidityScore;
      if (deal.status === 'sold' || deal.isMine) liquidityScore = 70 + (idNum % 20);
      else liquidityScore = 45 + (idNum % 25);
      liquidityScore = Math.min(95, Math.max(25, liquidityScore));

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
      // 更新UI（安全处理，因为可能从非 dashboard 页面调用）
      document.querySelectorAll('#sieveSelector .sieve-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.sieve === sieveKey);
      });
      // 获取当前可用筛子模型
      const models = getActiveSieveModels();
      const sieve = models[sieveKey];
      if (sieve) {
        dealsList = sieve.filter(allDeals);
        // 更新筛子说明（安全null检查）
        const descEl = document.getElementById('sieveDescription');
        const descText = document.getElementById('sieveDescText');
        if (descEl) {
          if (sieveKey === 'all') {
            descEl.classList.add('hidden');
          } else {
            descEl.classList.remove('hidden');
            if (descText) descText.textContent = sieve.desc;
          }
        }
        // 更新标签
        const label = document.getElementById('filterLabel');
        if (label) {
          if (sieveKey === 'all') {
            label.textContent = '· 展示全部 ' + (totalVirtualContracts || allDeals.length).toLocaleString() + ' 个机会';
          } else {
            label.textContent = '· ' + sieve.name + ' — 通过 ' + dealsList.length + '/' + (totalVirtualContracts || allDeals.length).toLocaleString();
          }
        }
      } else {
        // sieve not found (e.g. 'all' before mySieves init)
        dealsList = allDeals.map(d => ({ ...d, matchScore: null, sieveResult: 'all' }));
      }
      renderDeals();
      if (sieveKey !== 'all' && sieve && dealsList.length > 0) {
        showToast('success', sieve.name, '筛选出 ' + dealsList.length + ' 个匹配机会');
      }
    }

    // ==================== Render Deals ====================
    function renderDeals() {
      const grid = document.getElementById('dealGrid');
      const empty = document.getElementById('emptyState');
      if (!grid) return; // 安全检查：非 dashboard 页面时不渲染
      const searchVal = (document.getElementById('dealSearch')?.value || '').toLowerCase();
      const filterVal = document.getElementById('filterStatus')?.value || 'all';

      let filtered = dealsList.filter(d => {
        if (searchVal && !d.name.toLowerCase().includes(searchVal) && !d.industry.includes(searchVal)) return false;
        if (filterVal !== 'all' && d.status !== filterVal) return false;
        return true;
      });

      // Update stats — 客观维度总结（不做任何预设判断）
      var dashVTotal = totalVirtualContracts || allDeals.length;
      var dashVMine = 0;
      var dashVSold = 0; // 总交易（已售出）
      projectSummaries.forEach(function(ps) {
        dashVMine += ps.mine;
        dashVSold += ps.sold;
      });
      if (dashVMine === 0) dashVMine = allDeals.filter(d => d.isMine).length;
      if (dashVSold === 0) dashVSold = allDeals.filter(d => d.status === 'sold').length;
      // 我的组合 = 基金型跨项目组合数量
      var fundPortfolios = getMyPortfolios();
      var dashVPortfolios = fundPortfolios.length;
      var el;
      el = document.getElementById('statTotalContracts'); if (el) el.textContent = dashVTotal.toLocaleString();
      el = document.getElementById('statTotalTransactions'); if (el) el.textContent = dashVSold.toLocaleString();
      el = document.getElementById('statMyContracts'); if (el) el.textContent = dashVMine.toLocaleString();
      el = document.getElementById('statMyPortfolios'); if (el) el.textContent = dashVPortfolios.toLocaleString();

      if (filtered.length === 0) { grid.innerHTML = ''; if (empty) empty.classList.remove('hidden'); return; }
      if (empty) empty.classList.add('hidden');

      const statusMap = {
        available: { label: '待售', cls: 'badge-warning', icon: 'fa-tag' },
        sold: { label: '已售', cls: 'badge-success', icon: 'fa-check' }
      };

      grid.innerHTML = filtered.map((d, idx) => {
        const st = statusMap[d.status] || statusMap.available;
        const hasMatch = d.matchScore !== null && d.matchScore !== undefined;
        const matchColor = hasMatch ? (d.matchScore >= 80 ? '#10b981' : d.matchScore >= 60 ? '#f59e0b' : '#ef4444') : '#6b7280';

        // 计算雷达评分用于卡片展示
        const cardScores = calcRadarScores(d);
        const cardOverall = calcOverallScore(cardScores);
        const cardGrade = getScoreGrade(cardOverall);
        const miniCanvasId = 'miniRadar_' + d.id;

        return '<div class="project-card group cursor-pointer animate-fade-in" onclick="openDetail(&#39;' + d.id + '&#39;)">' +
          // MCN Header
          '<div class="flex items-center justify-between mb-1.5">' +
            '<span class="font-mono text-xs font-bold tracking-wider px-1.5 py-0.5 rounded" style="background: linear-gradient(135deg, #ecfdf5, #ecfeff); color: #0f766e; border: 1px solid rgba(46,196,182,0.12); font-size: 10px;">' + (d.mcn || '') + '</span>' +
            '<span class="badge ' + st.cls + ' flex-shrink-0"><i class="fas ' + st.icon + ' mr-1"></i>' + st.label + (d.isMine ? '·我' : '') + '</span>' +
          '</div>' +
          // Header: name + mini radar
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
          // ==== 单张合约信息 ====
          '<div class="mb-2 p-2.5 rounded-xl" style="background: linear-gradient(135deg, #f0fdf9, #ecfeff); border: 1px solid rgba(46,196,182,0.12);">' +
            '<div class="flex items-center justify-between">' +
              '<div class="flex items-center gap-1.5"><i class="fas fa-file-contract text-teal-500" style="font-size:10px;"></i><span class="text-lg font-black text-teal-700">¥1,000</span><span class="text-xs text-gray-400">面值</span></div>' +
              (d.holder ? '<div class="flex items-center gap-1 text-xs"><i class="fas fa-user' + (d.isMine ? '-check text-emerald-500' : ' text-gray-400') + '" style="font-size:9px;"></i><span class="font-semibold ' + (d.isMine ? 'text-emerald-600' : 'text-gray-500') + '">' + d.holder + '</span></div>' : '<span class="text-xs text-amber-600 font-semibold"><i class="fas fa-tag mr-1" style="font-size:9px;"></i>可认购</span>') +
            '</div>' +
          '</div>' +
          // Metrics
          '<div class="flex items-center justify-between text-xs">' +
            '<div class="flex items-center space-x-3">' +
              '<span class="text-gray-500"><i class="fas fa-percentage mr-1 text-amber-500"></i>' + d.revenueShare + '</span>' +
              '<span class="text-gray-500"><i class="fas fa-calendar mr-1 text-cyan-500"></i>' + d.period + '</span>' +
              '<span class="text-gray-500"><i class="fas fa-shield-alt mr-1 text-emerald-500"></i>' + d.riskGrade + '</span>' +
            '</div>' +
            '<div class="flex items-center"><i class="fas fa-star text-amber-400 mr-1"></i><span class="font-bold text-gray-700">' + d.aiScore + '</span></div>' +
          '</div>' +
          // Footer
          '<div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">' +
            '<span class="text-xs text-gray-400"><i class="fas fa-paper-plane mr-1 text-amber-300"></i>' + d.originateDate + '</span>' +
            (d.isMine
              ? '<span class="text-xs font-semibold text-emerald-600"><i class="fas fa-check-circle mr-1"></i>我的合约</span>'
              : d.status === 'sold'
                ? '<span class="text-xs text-gray-400">已售出</span>'
                : '<button onclick="event.stopPropagation(); openDetail(&#39;' + d.id + '&#39;)" class="text-xs font-medium text-teal-500 hover:text-teal-700 transition-colors"><i class="fas fa-shopping-cart mr-1"></i>认购</button>') +
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

    // ==================== 认购弹窗 (单张合约) ====================
    function showSubscribeModal() {
      if (!currentDeal) return;
      if (currentDeal.status === 'sold') { showToast('warning', '已售出', '该合约已被认购'); return; }

      const old = document.getElementById('subscribeModal'); if (old) old.remove();
      const modal = document.createElement('div');
      modal.id = 'subscribeModal';
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300]';
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.innerHTML = '<div class="bg-white rounded-3xl max-w-md w-full mx-4 overflow-hidden" style="box-shadow: 0 24px 80px rgba(0,0,0,0.2); animation: scaleIn 0.25s cubic-bezier(0.28,0.11,0.32,1);">' +
        '<div class="p-5 border-b border-gray-100" style="background: linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04));">' +
          '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #10b981, #06b6d4);"><i class="fas fa-file-contract text-white"></i></div><div><h2 class="text-lg font-bold text-gray-900">认购合约</h2><p class="text-xs text-gray-400">' + currentDeal.name + '</p></div></div>' +
        '</div>' +
        '<div class="p-5">' +
          '<div class="p-4 bg-slate-50 rounded-2xl mb-4 text-center">' +
            '<p class="font-mono text-sm font-bold tracking-wider mb-2" style="color:#0f766e;">' + (currentDeal.mcn || '') + '</p>' +
            '<p class="text-3xl font-black text-teal-600 mb-1">¥1,000</p>' +
            '<p class="text-xs text-gray-400">单张合约面值 · 不可分割</p>' +
          '</div>' +
          '<div class="grid grid-cols-2 gap-2 mb-4">' +
            '<div class="p-3 bg-amber-50 rounded-xl text-center"><p class="text-sm font-bold text-amber-700">' + currentDeal.revenueShare + '</p><p class="text-xs text-gray-400">分成比例</p></div>' +
            '<div class="p-3 bg-cyan-50 rounded-xl text-center"><p class="text-sm font-bold text-cyan-700">' + currentDeal.period + '</p><p class="text-xs text-gray-400">分成期限</p></div>' +
          '</div>' +
          '<div class="p-3 bg-emerald-50 rounded-xl mb-4 border border-emerald-100">' +
            '<div class="flex items-center gap-2"><i class="fas fa-info-circle text-emerald-500"></i><p class="text-xs text-emerald-700">认购后这张合约将归您所有，MCN编号永久绑定。在合约期内按约定比例分享收益。</p></div>' +
          '</div>' +
        '</div>' +
        '<div class="px-5 pb-5 flex gap-3">' +
          '<button onclick="closeSubscribeModal()" class="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">取消</button>' +
          '<button onclick="confirmSubscribe()" class="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 transition-all"><i class="fas fa-check mr-1.5"></i>确认认购 ¥1,000</button>' +
        '</div>' +
      '</div>';

      document.body.appendChild(modal);
    }

    function closeSubscribeModal() {
      const m = document.getElementById('subscribeModal'); if (m) m.remove();
    }

    function confirmSubscribe() {
      if (!currentDeal) return;
      if (currentDeal.status === 'sold') { showToast('error', '已售出', '该合约已被认购'); return; }

      // 更新数据：这张合约归当前用户
      const userName = currentUser ? (currentUser.displayName || currentUser.username) : '游客';
      currentDeal.status = 'sold';
      currentDeal.holder = userName;
      currentDeal.isMine = true;

      // 同步回 allDeals
      const original = allDeals.find(d => d.id === currentDeal.id);
      if (original) {
        original.status = currentDeal.status;
        original.holder = currentDeal.holder;
        original.isMine = currentDeal.isMine;
      }
      // 更新 projectSummaries 中对应项目的 mine 计数
      var ps = projectSummaries.find(function(s) { return s.projectId === currentDeal.projectId; });
      if (ps) { ps.mine++; ps.available = Math.max(0, ps.available - 1); }

      // 关闭弹窗
      const modal = document.getElementById('subscribeModal');
      if (modal) modal.remove();

      showToast('success', '认购成功', '合约 ' + currentDeal.mcn + ' 已归您所有 · ¥1,000');
      openDetail(currentDeal.id); // 刷新详情
    }

    // ==================== Detail Page ====================
    function openDetail(id) {
      currentDeal = dealsList.find(d => d.id === id) || allDeals.find(d => d.id === id);
      if (!currentDeal) return;
      document.getElementById('detailTitle').textContent = currentDeal.name;
      document.getElementById('detailMCN').textContent = currentDeal.mcn || 'MCN-XX-XX-0000-0000';
      const statusMap = { available: { label: '待售', cls: 'badge-warning' }, sold: { label: '已售', cls: 'badge-success' } };
      const st = statusMap[currentDeal.status] || statusMap.available;
      document.getElementById('detailStatus').className = 'badge ' + st.cls;
      document.getElementById('detailStatus').textContent = st.label + (currentDeal.isMine ? ' · 我的' : '');
      document.getElementById('detailIndustry').textContent = currentDeal.industry;
      document.getElementById('detailDate').textContent = currentDeal.originateDate;

      // 更新参与按钮
      const btn = document.getElementById('btnExpressIntent');
      if (currentDeal.isMine) {
        btn.innerHTML = '<i class="fas fa-check-circle mr-1"></i>我的合约';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.onclick = function() { showToast('info', '我的合约', '您持有此合约 · ' + currentDeal.mcn); };
      } else if (currentDeal.status === 'sold') {
        btn.innerHTML = '<i class="fas fa-lock mr-1"></i>已售出';
        btn.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
        btn.onclick = null;
      } else {
        btn.innerHTML = '<i class="fas fa-shopping-cart mr-1"></i>认购此合约 ¥1,000';
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
        // ==== 单张合约核心信息 ====
        '<div class="p-4 rounded-2xl mb-5" style="background: linear-gradient(135deg, #ecfdf5, #ecfeff); border: 1.5px solid rgba(46,196,182,0.2);">' +
          '<div class="flex items-center gap-2 mb-3"><i class="fas fa-file-contract text-teal-500"></i><h3 class="text-sm font-bold text-gray-800">合约信息</h3><span class="font-mono text-xs text-gray-400">' + (currentDeal.mcn || '') + '</span></div>' +
          '<div class="text-center p-4 bg-white rounded-xl mb-3">' +
            '<p class="text-3xl font-black text-teal-600 mb-1">¥1,000</p>' +
            '<p class="text-xs text-gray-400">合约面值 · 不可分割</p>' +
          '</div>' +
          '<div class="grid grid-cols-2 gap-2 mb-3">' +
            '<div class="p-2 bg-white rounded-xl text-center"><p class="text-xs text-gray-400">状态</p><p class="text-sm font-bold ' + (currentDeal.status === 'available' ? 'text-amber-600' : 'text-emerald-600') + '">' + (currentDeal.status === 'available' ? '待售' : '已售') + '</p></div>' +
            '<div class="p-2 bg-white rounded-xl text-center"><p class="text-xs text-gray-400">持有人</p><p class="text-sm font-bold ' + (currentDeal.isMine ? 'text-emerald-600' : 'text-gray-700') + '">' + (currentDeal.holder || '无（可认购）') + '</p></div>' +
          '</div>' +
          (currentDeal.isMine ? '<div class="p-2 bg-emerald-50 rounded-xl flex items-center gap-2 border border-emerald-100"><i class="fas fa-user-check text-emerald-500"></i><div><p class="text-xs font-bold text-emerald-700">我的合约</p><p class="text-xs text-emerald-600">投入 ¥1,000 · MCN编号永久绑定</p></div></div>' : '') +
        '</div>' +
        '<div class="grid grid-cols-2 gap-3 mb-5">' +
          '<div class="p-3 bg-teal-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">项目总额</p><p class="text-lg font-bold text-teal-600">¥' + (currentDeal.projectTotalAmount || 0) + '万</p></div>' +
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
            { icon: 'fa-hand-pointer', color: 'teal', title: '参与通 — 当前阶段', desc: currentDeal.status === 'available' ? '等待认购' : (currentDeal.isMine ? '您已认购此合约' : '已被认购') },
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
      if (lastPage === 'pageMyContracts') goToMyContracts();
      else if (lastPage === 'pageMyPortfolios') goToMyPortfolios();
      else goToDashboard();
    }


    function expressIntent() {
      if (!currentDeal) return;
      if (currentDeal.isMine) {
        showToast('info', '我的合约', '您已持有此合约 · ' + currentDeal.mcn);
      } else if (currentDeal.status === 'sold') {
        showToast('warning', '已售出', '该合约已被他人认购');
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
      var bar = document.getElementById('loadingBar');
      var status = document.getElementById('loadingStatus');
      if (!bar || !status) {
        // DOM 未就绪时延迟重试
        setTimeout(initApp, 50);
        return;
      }
      var steps = [
        { p: 25, t: '连接发起通数据...' },
        { p: 50, t: '加载评估通筛子...' },
        { p: 75, t: '初始化参与通看板...' },
        { p: 100, t: '准备就绪' }
      ];
      var stepIdx = 0;
      var tick = setInterval(function() {
        if (stepIdx >= steps.length) {
          clearInterval(tick);
          setTimeout(function() {
            var loadEl = document.getElementById('app-loading');
            if (loadEl) {
              loadEl.classList.add('fade-out');
              setTimeout(function() { loadEl.style.display = 'none'; }, 500);
            }
          }, 300);
          return;
        }
        bar.style.width = steps[stepIdx].p + '%';
        status.textContent = steps[stepIdx].t;
        stepIdx++;
      }, 350);

      // 合约数据由 loadDemoData() 按需生成（游客登录时调用）
    }

    // ==================== 「我的合约」页面 ====================
    function getMyContracts() {
      return allDeals.filter(d => d.isMine);
    }

    function goToMyContracts() {
      renderMyContracts();
      switchPage('pageMyContracts');
    }

    function renderMyContracts() {
      const myDeals = getMyContracts();
      const search = (document.getElementById('mcSearchInput')?.value || '').toLowerCase();
      const industry = document.getElementById('mcFilterIndustry')?.value || 'all';
      const sortBy = document.getElementById('mcSortBy')?.value || 'date';

      // 填充行业筛选
      const indSelect = document.getElementById('mcFilterIndustry');
      if (indSelect && indSelect.options.length <= 1) {
        const inds = [...new Set(myDeals.map(d => d.industry))];
        inds.forEach(ind => { const o = document.createElement('option'); o.value = ind; o.textContent = ind; indSelect.appendChild(o); });
      }

      let filtered = myDeals.filter(d => {
        if (search && !d.name.toLowerCase().includes(search) && !(d.mcn || '').toLowerCase().includes(search)) return false;
        if (industry !== 'all' && d.industry !== industry) return false;
        return true;
      });

      // 排序
      if (sortBy === 'score') filtered.sort((a, b) => parseFloat(b.aiScore) - parseFloat(a.aiScore));
      else if (sortBy === 'yield') filtered.sort((a, b) => parseInt(b.revenueShare) - parseInt(a.revenueShare));
      else if (sortBy === 'project') filtered.sort((a, b) => a.projectId.localeCompare(b.projectId) || a.seqInProject - b.seqInProject);

      // 统计
      const totalInvest = myDeals.length * 1000;
      const avgScore = myDeals.length > 0 ? (myDeals.reduce((s, d) => s + parseFloat(d.aiScore), 0) / myDeals.length).toFixed(1) : '0';
      const projectCount = [...new Set(myDeals.map(d => d.projectId))].length;
      const industryCount = [...new Set(myDeals.map(d => d.industry))].length;

      document.getElementById('myContractsSubtitle').textContent = '已认购 ' + myDeals.length.toLocaleString() + ' 张 · 总投入 ¥' + totalInvest.toLocaleString();

      document.getElementById('mcStatsGrid').innerHTML =
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">持有合约</p><p class="stat-value">' + myDeals.length.toLocaleString() + '</p><p class="text-xs text-gray-400 mt-0.5">张</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #10b981, #059669);"><i class="fas fa-file-contract text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">总投入</p><p class="stat-value">¥' + totalInvest.toLocaleString() + '</p><p class="text-xs text-gray-400 mt-0.5">面值合计</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><i class="fas fa-coins text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">覆盖项目</p><p class="stat-value">' + projectCount + '</p><p class="text-xs text-gray-400 mt-0.5">个不同项目</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"><i class="fas fa-briefcase text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">平均AI评分</p><p class="stat-value">' + avgScore + '</p><p class="text-xs text-gray-400 mt-0.5">加权平均</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #06b6d4, #0891b2);"><i class="fas fa-robot text-white text-sm"></i></div></div></div>';

      const grid = document.getElementById('mcGrid');
      const empty = document.getElementById('mcEmpty');
      if (filtered.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
      empty.classList.add('hidden');

      grid.innerHTML = filtered.map(d => {
        const scores = calcRadarScores(d);
        const overall = calcOverallScore(scores);
        const grade = getScoreGrade(overall);
        const miniId = 'mcRadar_' + d.id;
        return '<div class="project-card group cursor-pointer animate-fade-in" onclick="openDetail(&#39;' + d.id + '&#39;)">' +
          '<div class="flex items-center justify-between mb-1.5">' +
            '<span class="font-mono text-xs font-bold tracking-wider px-1.5 py-0.5 rounded" style="background: linear-gradient(135deg, #ecfdf5, #ecfeff); color: #0f766e; border: 1px solid rgba(46,196,182,0.12); font-size: 10px;">' + (d.mcn || '') + '</span>' +
            '<span class="badge badge-success flex-shrink-0"><i class="fas fa-user-check mr-1"></i>我的</span>' +
          '</div>' +
          '<div class="flex items-center justify-between mb-2">' +
            '<div class="flex items-center space-x-2 min-w-0 flex-1">' +
              '<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.12));"><i class="fas fa-file-contract" style="color: #10b981;"></i></div>' +
              '<div class="min-w-0 flex-1"><h3 class="font-bold text-gray-900 text-sm group-hover:text-teal-600 transition-colors truncate">' + d.name + '</h3><p class="text-xs text-gray-500">' + d.industry + ' · ' + d.location + '</p></div>' +
            '</div>' +
            '<div class="flex items-center gap-1.5">' +
              '<canvas id="' + miniId + '" width="60" height="60" style="width:30px;height:30px;"></canvas>' +
              '<div class="text-right"><p class="text-sm font-black leading-none" style="color:' + grade.color + ';">' + overall + '</p><p class="font-bold leading-none" style="font-size:9px; color:' + grade.color + ';">' + grade.grade + '</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="p-2.5 rounded-xl mb-2" style="background: linear-gradient(135deg, #f0fdf9, #ecfeff); border: 1px solid rgba(46,196,182,0.12);">' +
            '<div class="flex items-center justify-between"><div class="flex items-center gap-1.5"><i class="fas fa-file-contract text-teal-500" style="font-size:10px;"></i><span class="text-lg font-black text-teal-700">¥1,000</span><span class="text-xs text-gray-400">面值</span></div><span class="text-xs font-semibold text-emerald-600"><i class="fas fa-check-circle mr-1"></i>已认购</span></div>' +
          '</div>' +
          '<div class="flex items-center justify-between text-xs">' +
            '<div class="flex items-center space-x-3">' +
              '<span class="text-gray-500"><i class="fas fa-percentage mr-1 text-amber-500"></i>' + d.revenueShare + '</span>' +
              '<span class="text-gray-500"><i class="fas fa-calendar mr-1 text-cyan-500"></i>' + d.period + '</span>' +
              '<span class="text-gray-500"><i class="fas fa-shield-alt mr-1 text-emerald-500"></i>' + d.riskGrade + '</span>' +
            '</div>' +
            '<span class="font-bold text-gray-700"><i class="fas fa-star text-amber-400 mr-1"></i>' + d.aiScore + '</span>' +
          '</div>' +
        '</div>';
      }).join('');

      setTimeout(() => {
        filtered.forEach(d => { drawMiniRadar('mcRadar_' + d.id, calcRadarScores(d)); });
      }, 50);
    }

    // ==================== 「我的组合」页面 ====================
    // ★ 全新设计：跨项目基金型组合 — 像公募基金一样，按投资理念/主题/风格配置
    // 每个组合从不同项目中抽取合约，形成多元化投资组合

    // 组合风格色彩映射
    const PORTFOLIO_CATEGORY_STYLES = {
      '稳健型': { icon: 'fa-shield-alt', gradient: 'linear-gradient(135deg, #10b981, #059669)', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Conservative' },
      '进取型': { icon: 'fa-rocket', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Aggressive' },
      '平衡型': { icon: 'fa-balance-scale', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', label: 'Balanced' },
      '主题型': { icon: 'fa-bullseye', gradient: 'linear-gradient(135deg, #ec4899, #db2777)', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', label: 'Thematic' },
      '行业型': { icon: 'fa-industry', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', label: 'Sector' }
    };

    // ★ 20个预定义的跨项目基金型组合
    // projectFilter: 函数，接收合约返回是否纳入该组合
    const FUND_PORTFOLIOS = [
      // === 稳健型 (4个) ===
      {
        id: 'FUND_S01', name: '餐饮稳健S26', category: '稳健型', riskLevel: '低风险',
        strategy: '精选头部餐饮品牌合约，聚焦现金流稳定的成熟门店，追求稳定分红收益',
        targetIndustries: ['餐饮'], targetReturn: '8-12%', targetPeriod: '24个月',
        filter: function(c) { return c.industry === '餐饮' && parseFloat(c.aiScore) >= 7.5 && c.riskGrade !== 'B+'; }
      },
      {
        id: 'FUND_S02', name: '传统行业保守型', category: '稳健型', riskLevel: '低风险',
        strategy: '配置餐饮+零售等传统消费行业合约，优选运营年限长、评级A-以上的低波动项目',
        targetIndustries: ['餐饮', '零售'], targetReturn: '7-10%', targetPeriod: '24个月',
        filter: function(c) { return (c.industry === '餐饮' || c.industry === '零售') && parseFloat(c.operatingYears) >= 2.5 && c.riskGrade !== 'B+'; }
      },
      {
        id: 'FUND_S03', name: '医疗健康稳健1号', category: '稳健型', riskLevel: '低风险',
        strategy: '聚焦医疗健康赛道，配置高端医疗和体检龙头，享受大健康产业的确定性红利',
        targetIndustries: ['健康'], targetReturn: '11-16%', targetPeriod: '24-30个月',
        filter: function(c) { return c.industry === '健康'; }
      },
      {
        id: 'FUND_S04', name: '蓝筹价值守护者', category: '稳健型', riskLevel: '低风险',
        strategy: '全行业精选A+评级蓝筹合约，只投最优质项目，以安全边际为第一原则',
        targetIndustries: ['全行业'], targetReturn: '10-15%', targetPeriod: '18-36个月',
        filter: function(c) { return c.riskGrade === 'A+' && parseFloat(c.aiScore) >= 8.5; }
      },

      // === 进取型 (4个) ===
      {
        id: 'FUND_A01', name: '全行业Alpha高收益型', category: '进取型', riskLevel: '高风险',
        strategy: '全行业扫描高分成比例合约，追求绝对回报Alpha，适合风险承受能力强的投资者',
        targetIndustries: ['全行业'], targetReturn: '13-18%', targetPeriod: '18-36个月',
        filter: function(c) { return parseInt(c.revenueShare) >= 12 && parseFloat(c.aiScore) >= 8.0; }
      },
      {
        id: 'FUND_A02', name: '科技创新进取号', category: '进取型', riskLevel: '较高风险',
        strategy: '重仓AI、智能硬件、新能源科技合约，押注下一个十年的技术浪潮',
        targetIndustries: ['科技'], targetReturn: '12-15%', targetPeriod: '30-36个月',
        filter: function(c) { return c.industry === '科技'; }
      },
      {
        id: 'FUND_A03', name: '演艺IP爆发型', category: '进取型', riskLevel: '高风险',
        strategy: '配置顶流IP演艺项目，高分成+短周期，博取IP经济的爆发性收益',
        targetIndustries: ['演艺'], targetReturn: '12-18%', targetPeriod: '18-24个月',
        filter: function(c) { return c.industry === '演艺'; }
      },
      {
        id: 'FUND_A04', name: '高成长新锐猎手', category: '进取型', riskLevel: '较高风险',
        strategy: '聚焦运营3年内的新锐品牌，以高成长性换取超额收益，适合长期持有',
        targetIndustries: ['全行业'], targetReturn: '8-13%', targetPeriod: '24-30个月',
        filter: function(c) { return parseFloat(c.operatingYears) <= 3.0 && parseFloat(c.aiScore) >= 7.5; }
      },

      // === 平衡型 (4个) ===
      {
        id: 'FUND_B01', name: '消费+科技双轮驱动', category: '平衡型', riskLevel: '中风险',
        strategy: '50%配置稳定消费类（餐饮零售）+ 50%科技成长类，攻守兼备的经典组合',
        targetIndustries: ['餐饮', '零售', '科技'], targetReturn: '9-14%', targetPeriod: '24-36个月',
        filter: function(c) { return (c.industry === '餐饮' || c.industry === '零售' || c.industry === '科技') && parseFloat(c.aiScore) >= 7.5; }
      },
      {
        id: 'FUND_B02', name: '全天候均衡配置', category: '平衡型', riskLevel: '中风险',
        strategy: '横跨餐饮、零售、科技、健康、教育、演艺六大行业，通过分散化降低波动',
        targetIndustries: ['全行业'], targetReturn: '9-13%', targetPeriod: '24-30个月',
        filter: function(c) { return parseFloat(c.aiScore) >= 7.0; }
      },
      {
        id: 'FUND_B03', name: '一线城市核心资产', category: '平衡型', riskLevel: '中低风险',
        strategy: '锁定北上广深杭五大核心城市优质项目，享受城市化和消费升级红利',
        targetIndustries: ['全行业'], targetReturn: '8-14%', targetPeriod: '24-30个月',
        filter: function(c) { return ['北京','上海','深圳','广州','杭州'].indexOf(c.location) >= 0; }
      },
      {
        id: 'FUND_B04', name: '中等回报稳增长', category: '平衡型', riskLevel: '中风险',
        strategy: '筛选分成比例9-13%的中等回报区间，兼顾收益与安全，适合大多数投资者',
        targetIndustries: ['全行业'], targetReturn: '9-13%', targetPeriod: '24-30个月',
        filter: function(c) { var rs = parseInt(c.revenueShare); return rs >= 9 && rs <= 13 && parseFloat(c.aiScore) >= 7.5; }
      },

      // === 主题型 (4个) ===
      {
        id: 'FUND_T01', name: 'AI智能浪潮主题', category: '主题型', riskLevel: '较高风险',
        strategy: '捕捉AI产业链机会：从AI Lab到智慧城市到AI教育，一键布局人工智能全生态',
        targetIndustries: ['科技', '教育'], targetReturn: '10-15%', targetPeriod: '30-36个月',
        filter: function(c) { return (c.industry === '科技' || c.industry === '教育') && (c.name.indexOf('AI') >= 0 || c.name.indexOf('智') >= 0 || c.name.indexOf('科技') >= 0); }
      },
      {
        id: 'FUND_T02', name: '新消费趋势精选', category: '主题型', riskLevel: '中风险',
        strategy: '精选新茶饮、潮玩、新零售等Z世代消费品牌，把握年轻人消费升级浪潮',
        targetIndustries: ['餐饮', '零售'], targetReturn: '8-13%', targetPeriod: '24-30个月',
        filter: function(c) { return (c.industry === '餐饮' || c.industry === '零售') && parseFloat(c.operatingYears) <= 4.0; }
      },
      {
        id: 'FUND_T03', name: '短周期快回收', category: '主题型', riskLevel: '中风险',
        strategy: '仅配置24个月及以下短期合约，追求资金快速周转，灵活把握市场机会',
        targetIndustries: ['全行业'], targetReturn: '7-13%', targetPeriod: '≤24个月',
        filter: function(c) { var months = parseInt(c.period); return months <= 24; }
      },
      {
        id: 'FUND_T04', name: '大额旗舰项目精选', category: '主题型', riskLevel: '中低风险',
        strategy: '只配置融资额100万以上的大型旗舰项目，规模效应带来的稳定性溢价',
        targetIndustries: ['全行业'], targetReturn: '11-16%', targetPeriod: '24-36个月',
        filter: function(c) { return (c.projectTotalAmount || 0) >= 100; }
      },

      // === 行业型 (4个) ===
      {
        id: 'FUND_I01', name: '教育产业深耕者', category: '行业型', riskLevel: '中风险',
        strategy: '深度布局教育赛道，从K12到职教到AI教育，享受知识经济长期红利',
        targetIndustries: ['教育'], targetReturn: '9-10%', targetPeriod: '30个月',
        filter: function(c) { return c.industry === '教育'; }
      },
      {
        id: 'FUND_I02', name: '零售消费领航者', category: '行业型', riskLevel: '中低风险',
        strategy: '布局零售消费全品类：从潮玩到日用到咖啡到物流，消费永不眠',
        targetIndustries: ['零售'], targetReturn: '7-9%', targetPeriod: '24-30个月',
        filter: function(c) { return c.industry === '零售'; }
      },
      {
        id: 'FUND_I03', name: '大消费产业链ETF', category: '行业型', riskLevel: '中风险',
        strategy: '餐饮+零售双行业联动，从上游品牌到下游渠道，覆盖消费产业全链条',
        targetIndustries: ['餐饮', '零售'], targetReturn: '7-12%', targetPeriod: '24-30个月',
        filter: function(c) { return c.industry === '餐饮' || c.industry === '零售'; }
      },
      {
        id: 'FUND_I04', name: '科技+健康未来组合', category: '行业型', riskLevel: '中风险',
        strategy: '双引擎驱动：科技代表效率革命，健康代表消费升级，两大确定性赛道叠加',
        targetIndustries: ['科技', '健康'], targetReturn: '11-16%', targetPeriod: '24-36个月',
        filter: function(c) { return c.industry === '科技' || c.industry === '健康'; }
      }
    ];

    let currentPortfolioFilter = 'all';

    function getMyPortfolios() {
      const myDeals = getMyContracts();
      if (myDeals.length === 0) return [];
      
      return FUND_PORTFOLIOS.map(function(fund) {
        var contracts = myDeals.filter(fund.filter);
        if (contracts.length === 0) return null;
        
        // 统计涉及的项目和行业
        var projectSet = {};
        var industrySet = {};
        contracts.forEach(function(c) {
          projectSet[c.projectId] = c.name;
          industrySet[c.industry] = true;
        });
        
        return {
          id: fund.id,
          name: fund.name,
          category: fund.category,
          riskLevel: fund.riskLevel,
          strategy: fund.strategy,
          targetIndustries: fund.targetIndustries,
          targetReturn: fund.targetReturn,
          targetPeriod: fund.targetPeriod,
          contracts: contracts,
          projects: projectSet,
          projectCount: Object.keys(projectSet).length,
          industries: Object.keys(industrySet),
          industryCount: Object.keys(industrySet).length
        };
      }).filter(function(p) { return p !== null; });
    }

    // 计算组合的加权平均雷达评分
    function calcPortfolioRadarScores(contracts) {
      if (!contracts || contracts.length === 0) return RADAR_DIMENSIONS.map(() => 50);
      const allScores = contracts.map(c => calcRadarScores(c));
      const n = RADAR_DIMENSIONS.length;
      const avg = [];
      for (let i = 0; i < n; i++) {
        let sum = 0;
        allScores.forEach(s => { sum += s[i]; });
        avg.push(Math.round(sum / allScores.length));
      }
      return avg;
    }

    function goToMyPortfolios() {
      renderMyPortfolios();
      switchPage('pageMyPortfolios');
    }

    function filterPortfoliosByCategory(cat) {
      currentPortfolioFilter = cat;
      document.querySelectorAll('.mp-filter-btn').forEach(function(btn) {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
      });
      var activeBtn = document.querySelector('.mp-filter-btn[data-cat="' + cat + '"]');
      if (activeBtn) {
        activeBtn.classList.add('active');
        if (cat !== 'all' && PORTFOLIO_CATEGORY_STYLES[cat]) {
          var st = PORTFOLIO_CATEGORY_STYLES[cat];
          activeBtn.style.background = st.bg;
          activeBtn.style.color = st.color;
          activeBtn.style.borderColor = st.border;
        } else if (cat === 'all') {
          activeBtn.style.background = '#f5f3ff';
          activeBtn.style.color = '#7c3aed';
          activeBtn.style.borderColor = '#c4b5fd';
        }
      }
      renderMyPortfolios();
    }

    function renderMyPortfolios() {
      var allPortfolios = getMyPortfolios();
      var portfolios = allPortfolios;
      if (currentPortfolioFilter !== 'all') {
        portfolios = allPortfolios.filter(function(p) { return p.category === currentPortfolioFilter; });
      }

      // 总统计（基于全部，不受筛选影响）
      var totalContracts = allPortfolios.reduce(function(s, p) { return s + p.contracts.length; }, 0);
      var uniqueContracts = {};
      allPortfolios.forEach(function(p) { p.contracts.forEach(function(c) { uniqueContracts[c.id] = true; }); });
      var uniqueCount = Object.keys(uniqueContracts).length;
      var totalInvest = uniqueCount * 1000;

      document.getElementById('myPortfoliosSubtitle').textContent = '共 ' + allPortfolios.length + ' 个组合 · ' + uniqueCount + ' 张合约 · 总投入 ¥' + totalInvest.toLocaleString();

      // 组合统计
      var categoryCount = {};
      allPortfolios.forEach(function(p) { categoryCount[p.category] = (categoryCount[p.category] || 0) + 1; });
      var allPortScores = portfolios.map(function(p) { var s = calcPortfolioRadarScores(p.contracts); return calcOverallScore(s); });
      var avgOverall = allPortScores.length > 0 ? Math.round(allPortScores.reduce(function(a, b) { return a + b; }, 0) / allPortScores.length) : 0;
      var allIndustries = {};
      allPortfolios.forEach(function(p) { p.industries.forEach(function(ind) { allIndustries[ind] = true; }); });

      document.getElementById('mpStatsGrid').innerHTML =
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">组合数量</p><p class="stat-value">' + allPortfolios.length + '</p><p class="text-xs text-gray-400 mt-0.5">' + Object.keys(categoryCount).length + ' 种策略类型</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"><i class="fas fa-object-group text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">去重合约</p><p class="stat-value">' + uniqueCount + '</p><p class="text-xs text-gray-400 mt-0.5">¥' + totalInvest.toLocaleString() + ' 总投入</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #10b981, #059669);"><i class="fas fa-file-contract text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">覆盖行业</p><p class="stat-value">' + Object.keys(allIndustries).length + '</p><p class="text-xs text-gray-400 mt-0.5">' + Object.keys(allIndustries).join('·') + '</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><i class="fas fa-th-large text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">平均评分</p><p class="stat-value">' + avgOverall + '</p><p class="text-xs text-gray-400 mt-0.5">组合综合评分</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #06b6d4, #0891b2);"><i class="fas fa-chart-line text-white text-sm"></i></div></div></div>';

      const grid = document.getElementById('mpGrid');
      const empty = document.getElementById('mpEmpty');
      if (portfolios.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
      empty.classList.add('hidden');

      grid.innerHTML = portfolios.map(function(p, idx) {
        var scores = calcPortfolioRadarScores(p.contracts);
        var overall = calcOverallScore(scores);
        var grade = getScoreGrade(overall);
        var totalValue = p.contracts.length * 1000;
        var avgAI = (p.contracts.reduce(function(s, c) { return s + parseFloat(c.aiScore); }, 0) / p.contracts.length).toFixed(1);
        var canvasId = 'mpRadar_' + idx;
        var catStyle = PORTFOLIO_CATEGORY_STYLES[p.category] || PORTFOLIO_CATEGORY_STYLES['平衡型'];

        return '<div class="project-card group cursor-pointer animate-fade-in" onclick="openPortfolioDetail(&#39;' + p.id + '&#39;)">' +
          // Header — 基金名称和类型
          '<div class="flex items-center justify-between mb-3">' +
            '<div class="flex items-center gap-2 min-w-0">' +
              '<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="' + catStyle.gradient + ';"><i class="fas ' + catStyle.icon + ' text-white text-sm"></i></div>' +
              '<div class="min-w-0"><h3 class="font-bold text-gray-900 text-sm group-hover:text-violet-600 transition-colors truncate">' + p.name + '</h3><p class="text-xs text-gray-500 flex items-center gap-1"><span class="px-1.5 py-0.5 rounded text-xs font-bold" style="background:' + catStyle.bg + '; color:' + catStyle.color + '; font-size:9px;">' + p.category + '</span><span>' + p.riskLevel + '</span></p></div>' +
            '</div>' +
            '<div class="flex items-center gap-2 flex-shrink-0">' +
              '<canvas id="' + canvasId + '" width="60" height="60" style="width:30px;height:30px;"></canvas>' +
              '<div class="text-right"><p class="text-sm font-black leading-none" style="color:' + grade.color + ';">' + overall + '</p><p class="font-bold leading-none" style="font-size:9px; color:' + grade.color + ';">' + grade.grade + '</p></div>' +
            '</div>' +
          '</div>' +
          // 策略说明
          '<p class="text-xs text-gray-400 mb-2 leading-relaxed line-clamp-2" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + p.strategy + '</p>' +
          // 组合配置信息
          '<div class="p-3 rounded-xl mb-2" style="background:' + catStyle.bg + '; border: 1px solid ' + catStyle.border + ';">' +
            '<div class="flex items-center justify-between mb-2">' +
              '<span class="text-xs font-bold" style="color:' + catStyle.color + ';"><i class="fas fa-layer-group mr-1"></i>' + p.contracts.length + ' 张合约 · ' + p.projectCount + ' 个项目</span>' +
              '<span class="text-sm font-black" style="color:' + catStyle.color + ';">¥' + totalValue.toLocaleString() + '</span>' +
            '</div>' +
            '<div class="flex flex-wrap gap-1">' +
              p.industries.map(function(ind) { return '<span class="px-1.5 py-0.5 rounded text-xs font-medium bg-white border border-gray-100" style="font-size:9px; color:#6b7280;">' + ind + '</span>'; }).join('') +
              Object.values(p.projects).slice(0, 3).map(function(name) { return '<span class="px-1.5 py-0.5 rounded text-xs bg-white border border-gray-100" style="font-size:9px; color:#9ca3af;">' + (name.length > 8 ? name.substring(0, 8) + '…' : name) + '</span>'; }).join('') +
              (p.projectCount > 3 ? '<span class="text-xs text-gray-400 self-center">+' + (p.projectCount - 3) + '</span>' : '') +
            '</div>' +
          '</div>' +
          // 关键指标
          '<div class="grid grid-cols-3 gap-2 mb-2">' +
            '<div class="text-center p-2 bg-gray-50 rounded-lg"><p class="text-xs font-bold text-amber-600">' + p.targetReturn + '</p><p style="font-size:9px;" class="text-gray-400">目标回报</p></div>' +
            '<div class="text-center p-2 bg-gray-50 rounded-lg"><p class="text-xs font-bold text-cyan-600">' + p.targetPeriod + '</p><p style="font-size:9px;" class="text-gray-400">目标期限</p></div>' +
            '<div class="text-center p-2 bg-gray-50 rounded-lg"><p class="text-xs font-bold text-emerald-600">' + avgAI + '</p><p style="font-size:9px;" class="text-gray-400">AI均分</p></div>' +
          '</div>' +
          // Footer
          '<div class="flex items-center justify-between pt-2 border-t border-gray-100">' +
            '<span class="text-xs text-gray-400"><i class="fas fa-tags mr-1"></i>' + p.targetIndustries.join(' · ') + '</span>' +
            '<span class="text-xs font-medium group-hover:text-violet-700 transition-colors" style="color:' + catStyle.color + ';"><i class="fas fa-arrow-right mr-1"></i>查看详情</span>' +
          '</div>' +
        '</div>';
      }).join('');

      setTimeout(function() {
        portfolios.forEach(function(p, idx) {
          drawMiniRadar('mpRadar_' + idx, calcPortfolioRadarScores(p.contracts));
        });
      }, 50);

      // 初始化筛选按钮激活状态
      document.querySelectorAll('.mp-filter-btn').forEach(function(btn) {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        if (btn.getAttribute('data-cat') === currentPortfolioFilter) {
          btn.classList.add('active');
          if (currentPortfolioFilter === 'all') {
            btn.style.background = '#f5f3ff';
            btn.style.color = '#7c3aed';
            btn.style.borderColor = '#c4b5fd';
          } else if (PORTFOLIO_CATEGORY_STYLES[currentPortfolioFilter]) {
            var st = PORTFOLIO_CATEGORY_STYLES[currentPortfolioFilter];
            btn.style.background = st.bg;
            btn.style.color = st.color;
            btn.style.borderColor = st.border;
          }
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // ==================== 组合详情页 ====================
    let currentPortfolio = null;

    function openPortfolioDetail(fundId) {
      const portfolios = getMyPortfolios();
      currentPortfolio = portfolios.find(function(p) { return p.id === fundId; });
      if (!currentPortfolio) return;

      const contracts = currentPortfolio.contracts;
      const scores = calcPortfolioRadarScores(contracts);
      const overall = calcOverallScore(scores);
      const grade = getScoreGrade(overall);
      const totalValue = contracts.length * 1000;
      const avgAI = (contracts.reduce(function(s, c) { return s + parseFloat(c.aiScore); }, 0) / contracts.length).toFixed(1);
      const avgShare = (contracts.reduce(function(s, c) { return s + parseInt(c.revenueShare); }, 0) / contracts.length).toFixed(1);
      const catStyle = PORTFOLIO_CATEGORY_STYLES[currentPortfolio.category] || PORTFOLIO_CATEGORY_STYLES['平衡型'];

      document.getElementById('pdTitle').textContent = currentPortfolio.name;
      document.getElementById('pdSubtitle').textContent = contracts.length + ' 张合约 · ' + currentPortfolio.projectCount + ' 个项目 · 总投入 ¥' + totalValue.toLocaleString();
      document.getElementById('pdGradeBadge').textContent = grade.grade + ' · ' + overall + '分';
      document.getElementById('pdGradeBadge').style.cssText = 'background:' + grade.bg + '; color:' + grade.color + '; padding:4px 14px; border-radius:12px; font-size:13px; font-weight:700;';
      document.getElementById('pdCategoryBadge').textContent = currentPortfolio.category;
      document.getElementById('pdCategoryBadge').style.cssText = 'background:' + catStyle.bg + '; color:' + catStyle.color + '; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:600;';
      document.getElementById('pdIconBox').style.background = catStyle.gradient;
      document.getElementById('pdIcon').className = 'fas ' + catStyle.icon + ' text-white text-sm';

      // === Left panel — 组合概览 ===
      // 按项目分组展示合约
      var projectGroups = {};
      contracts.forEach(function(c) {
        if (!projectGroups[c.projectId]) {
          projectGroups[c.projectId] = { name: c.name, industry: c.industry, location: c.location, contracts: [] };
        }
        projectGroups[c.projectId].contracts.push(c);
      });

      var projectGroupsHTML = Object.keys(projectGroups).map(function(pid) {
        var pg = projectGroups[pid];
        return '<div class="mb-3">' +
          '<div class="flex items-center gap-2 mb-1.5">' +
            '<span class="text-xs font-bold text-gray-700"><i class="fas fa-building mr-1 text-gray-400"></i>' + pg.name + '</span>' +
            '<span class="text-xs text-gray-400">' + pg.industry + ' · ' + pg.location + '</span>' +
          '</div>' +
          '<div class="space-y-1.5">' +
            pg.contracts.map(function(c) {
              var cs = calcRadarScores(c);
              var co = calcOverallScore(cs);
              var cg = getScoreGrade(co);
              return '<div class="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-violet-200 cursor-pointer transition-all" onclick="openDetail(&#39;' + c.id + '&#39;)">' +
                '<div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(16,185,129,0.1);"><i class="fas fa-file-contract text-emerald-500" style="font-size:10px;"></i></div>' +
                '<div class="flex-1 min-w-0">' +
                  '<p class="font-mono text-xs font-bold text-gray-700 truncate">' + (c.mcn || '') + '</p>' +
                  '<p class="text-xs text-gray-400">¥1,000 · ' + c.revenueShare + ' · ' + c.riskGrade + '</p>' +
                '</div>' +
                '<div class="text-right flex-shrink-0">' +
                  '<p class="text-xs font-bold" style="color:' + cg.color + ';">' + co + '</p>' +
                  '<p style="font-size:9px; color:' + cg.color + ';">' + cg.grade + '</p>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>';
      }).join('');

      // 行业配比饼图数据
      var industryDistrib = {};
      contracts.forEach(function(c) { industryDistrib[c.industry] = (industryDistrib[c.industry] || 0) + 1; });
      var distribHTML = Object.keys(industryDistrib).map(function(ind) {
        var pct = (industryDistrib[ind] / contracts.length * 100).toFixed(1);
        var indColors = { '餐饮': '#f59e0b', '零售': '#06b6d4', '科技': '#8b5cf6', '教育': '#10b981', '健康': '#ef4444', '演艺': '#ec4899' };
        var c = indColors[ind] || '#6b7280';
        return '<div class="flex items-center gap-2">' +
          '<div class="w-3 h-3 rounded-full flex-shrink-0" style="background:' + c + ';"></div>' +
          '<span class="text-xs text-gray-600 flex-1">' + ind + '</span>' +
          '<span class="text-xs font-bold text-gray-700">' + industryDistrib[ind] + '张</span>' +
          '<span class="text-xs text-gray-400">' + pct + '%</span>' +
        '</div>';
      }).join('');

      document.getElementById('pdLeft').innerHTML =
        '<div class="mb-5">' +
          // 组合基本信息
          '<div class="p-4 rounded-2xl mb-4" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%); position: relative; overflow: hidden;">' +
            '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 30%, rgba(139,92,246,0.25) 0%, transparent 50%);pointer-events:none;"></div>' +
            '<div class="relative z-10">' +
              '<div class="flex items-center gap-2 mb-2"><span class="px-2 py-0.5 rounded text-xs font-bold" style="background:' + catStyle.color + '33; color: #c4b5fd;">' + currentPortfolio.category + '</span><span class="text-xs" style="color: rgba(255,255,255,0.4);">' + catStyle.label + ' Fund</span><span class="px-2 py-0.5 rounded text-xs" style="background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6);">' + currentPortfolio.riskLevel + '</span></div>' +
              '<h2 class="text-lg font-bold text-white mb-1">' + currentPortfolio.name + '</h2>' +
              '<p class="text-xs mb-3" style="color: rgba(255,255,255,0.5);">' + currentPortfolio.strategy + '</p>' +
              '<div class="grid grid-cols-4 gap-2">' +
                '<div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.08);"><p class="text-lg font-black text-white">' + contracts.length + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">张合约</p></div>' +
                '<div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.08);"><p class="text-lg font-black text-violet-300">' + currentPortfolio.projectCount + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">个项目</p></div>' +
                '<div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.08);"><p class="text-lg font-black text-amber-300">¥' + totalValue.toLocaleString() + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">总投入</p></div>' +
                '<div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.08);"><p class="text-lg font-black" style="color:' + grade.color + ';">' + overall + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">综合评分</p></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          // 关键参数
          '<div class="grid grid-cols-2 gap-3 mb-4">' +
            '<div class="p-3 bg-amber-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">加权分成比例</p><p class="text-lg font-bold text-amber-600">' + avgShare + '%</p></div>' +
            '<div class="p-3 bg-cyan-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">目标回报</p><p class="text-lg font-bold text-cyan-600">' + currentPortfolio.targetReturn + '</p></div>' +
            '<div class="p-3 bg-emerald-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">AI评分均值</p><p class="text-lg font-bold text-emerald-600">' + avgAI + '<span class="text-xs text-gray-400">/10</span></p></div>' +
            '<div class="p-3 bg-violet-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">目标期限</p><p class="text-lg font-bold text-violet-600">' + currentPortfolio.targetPeriod + '</p></div>' +
          '</div>' +
          // 行业配比
          '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4">' +
            '<p class="text-xs font-bold text-gray-700 mb-2"><i class="fas fa-chart-pie mr-1.5 text-violet-500"></i>行业配比 · ' + currentPortfolio.industryCount + ' 个行业</p>' +
            '<div class="space-y-1.5">' + distribHTML + '</div>' +
          '</div>' +
          // 投资策略说明
          '<div class="p-3 bg-violet-50 rounded-xl border border-violet-100 mb-4">' +
            '<div class="flex items-start gap-2"><i class="fas fa-lightbulb text-violet-500 mt-0.5"></i><div><p class="text-xs font-bold text-violet-700 mb-1">投资策略</p><p class="text-xs text-violet-600 leading-relaxed">' + currentPortfolio.strategy + '</p><p class="text-xs text-violet-400 mt-1">覆盖行业：' + currentPortfolio.targetIndustries.join('、') + ' | 跨 ' + currentPortfolio.projectCount + ' 个项目配置 ' + contracts.length + ' 张合约</p></div></div>' +
          '</div>' +
        '</div>' +
        // 按项目分组的合约清单
        '<div><h3 class="text-sm font-bold text-gray-800 mb-3"><i class="fas fa-sitemap mr-1.5 text-violet-500"></i>组合持仓明细 · 按项目分组 (' + contracts.length + '张)</h3>' +
        '<div>' + projectGroupsHTML + '</div>' +
        '</div>';

      // Right panel — 加权雷达图 + 维度分析
      let dimensionDetails = '';
      RADAR_DIMENSIONS.forEach((dim, i) => {
        const score = scores[i];
        const dGrade = getScoreGrade(score);
        // 各合约在此维度的分数
        const contractScoresForDim = contracts.map(c => calcRadarScores(c)[i]);
        const minS = Math.min(...contractScoresForDim);
        const maxS = Math.max(...contractScoresForDim);
        dimensionDetails += '<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">' +
          '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + dim.color + '15;"><i class="fas ' + dim.icon + '" style="color:' + dim.color + '; font-size:13px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center justify-between mb-1">' +
              '<span class="text-xs font-bold text-gray-700">' + dim.label + '</span>' +
              '<div class="flex items-center gap-2">' +
                '<span class="text-xs text-gray-400">' + minS + '~' + maxS + '</span>' +
                '<span class="text-xs font-bold" style="color:' + dGrade.color + ';">' + score + '</span>' +
                '<span class="text-xs px-1.5 py-0.5 rounded font-bold" style="background:' + dGrade.bg + '; color:' + dGrade.color + ';">' + dGrade.grade + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="h-1.5 rounded-full bg-gray-200 overflow-hidden"><div class="h-full rounded-full" style="width:' + score + '%; background: linear-gradient(90deg, ' + dim.color + ', ' + dim.color + 'cc);"></div></div>' +
          '</div>' +
        '</div>';
      });

      document.getElementById('pdRight').innerHTML =
        '<div class="space-y-4">' +
          // 组合雷达图
          '<div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">' +
            '<div class="p-4 flex items-center justify-between" style="background: linear-gradient(135deg, rgba(139,92,246,0.04), rgba(124,58,237,0.03)); border-bottom: 1px solid rgba(0,0,0,0.04);">' +
              '<div class="flex items-center gap-3">' +
                '<div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"><i class="fas fa-chart-pie text-white text-sm"></i></div>' +
                '<div><h3 class="text-sm font-bold text-gray-900">组合加权雷达图</h3><p class="text-xs text-gray-400">跨 ' + currentPortfolio.projectCount + ' 个项目 · ' + contracts.length + ' 张合约等权重加权</p></div>' +
              '</div>' +
              '<div class="flex items-center gap-3">' +
                '<div class="text-right">' +
                  '<p class="text-2xl font-black" style="color:' + grade.color + ';">' + overall + '<span class="text-xs font-medium text-gray-400">/100</span></p>' +
                  '<p class="text-xs font-semibold" style="color:' + grade.color + ';">' + grade.label + '</p>' +
                '</div>' +
                '<div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background:' + grade.bg + '; border: 2px solid ' + grade.color + '33;">' +
                  '<span class="text-xl font-black" style="color:' + grade.color + ';">' + grade.grade + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="flex items-center justify-center py-4 px-2">' +
              '<canvas id="pdRadarCanvas" style="max-width:100%;"></canvas>' +
            '</div>' +
            '<div class="px-4 pb-4">' +
              '<div class="grid grid-cols-4 gap-2">' +
                RADAR_DIMENSIONS.map((dim, i) => {
                  const s = scores[i]; const g = getScoreGrade(s);
                  return '<div class="text-center p-2 rounded-xl" style="background:' + dim.color + '08; border: 1px solid ' + dim.color + '15;">' +
                    '<i class="fas ' + dim.icon + '" style="color:' + dim.color + '; font-size:11px;"></i>' +
                    '<p class="text-xs font-bold mt-1" style="color:' + g.color + ';">' + s + '</p>' +
                    '<p class="text-xs text-gray-400 truncate" style="font-size:9px;">' + dim.label.replace(/YITO/, '').substring(0, 4) + '</p>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          // 维度详解
          '<div class="bg-white rounded-2xl p-4 border border-gray-100">' +
            '<h3 class="text-sm font-bold text-gray-800 mb-3"><i class="fas fa-list-ul mr-1.5 text-violet-500"></i>各维度加权详解</h3>' +
            '<div class="space-y-2">' + dimensionDetails + '</div>' +
          '</div>' +
          // 合约分布
          '<div class="bg-white rounded-2xl p-4 border border-gray-100">' +
            '<h3 class="text-sm font-bold text-gray-800 mb-3"><i class="fas fa-chart-bar mr-1.5 text-teal-500"></i>合约评分分布</h3>' +
            '<div class="h-32 flex items-end justify-around gap-1">' +
              contracts.map((c, i) => {
                const cs = calcRadarScores(c); const co = calcOverallScore(cs); const cg = getScoreGrade(co);
                return '<div class="flex flex-col items-center flex-1" title="' + (c.mcn || '') + ' — ' + co + '分">' +
                  '<div class="w-full rounded-t-md cursor-pointer hover:opacity-80 transition-opacity" style="height:' + co + '%; background: linear-gradient(180deg, ' + cg.color + ', ' + cg.color + '88); min-height:8px;" onclick="openDetail(&#39;' + c.id + '&#39;)"></div>' +
                  '<span class="text-xs text-gray-400 mt-1" style="font-size:8px;">#' + (i + 1) + '</span>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>';

      setTimeout(() => {
        drawRadarChart('pdRadarCanvas', scores, { size: 320 });
      }, 50);

      switchPage('pagePortfolioDetail');
    }

    // ==================== AI 组合构建器 (Portfolio Architect) ====================
    // 核心逻辑：通过多轮对话逐步了解投资者需求，从宽泛到具体
    // 每轮对话后，AI 实时更新右侧推荐组合

    let abState = {
      step: 0,  // 对话阶段: 0=风格 1=行业 2=参数 3=生成完成 4=调整
      style: null,       // 投资风格: conservative / aggressive / balanced / sector
      industries: [],    // 偏好行业列表
      riskTolerance: null, // low / medium / high
      targetReturn: null,  // 目标回报
      budget: null,      // 预算（张数）
      period: null,      // 期限偏好
      extraPrefs: [],    // 额外偏好（自然语言记录）
      portfolio: [],     // 当前推荐的合约列表
      portfolioName: '', // 组合名称
    };

    // 对话引导流程
    const AB_FLOW = [
      // Step 0: 投资风格（已通过初始快捷选项触发）
      // Step 1: 行业偏好
      {
        question: '有哪些行业是您特别看好的？可以选择多个。',
        options: [
          { text: '餐饮美食', icon: 'fa-utensils', color: '#f59e0b', value: '餐饮' },
          { text: '科技创新', icon: 'fa-microchip', color: '#8b5cf6', value: '科技' },
          { text: '医疗健康', icon: 'fa-heartbeat', color: '#ef4444', value: '健康' },
          { text: '零售消费', icon: 'fa-shopping-bag', color: '#06b6d4', value: '零售' },
          { text: '教育培训', icon: 'fa-graduation-cap', color: '#10b981', value: '教育' },
          { text: '演艺娱乐', icon: 'fa-music', color: '#ec4899', value: '演艺' },
          { text: '不限行业，全面配置', icon: 'fa-globe', color: '#6b7280', value: 'all' },
        ]
      },
      // Step 2: 风险与回报参数
      {
        question: '您期望的投资回报和风险级别是？',
        options: [
          { text: '年化 7-10%，低风险', icon: 'fa-shield-alt', color: '#10b981', value: 'low' },
          { text: '年化 10-14%，中等风险', icon: 'fa-balance-scale', color: '#3b82f6', value: 'medium' },
          { text: '年化 14%+，可承受较高风险', icon: 'fa-fire-alt', color: '#f59e0b', value: 'high' },
        ]
      },
      // Step 3: 投资期限
      {
        question: '您倾向的投资期限是？',
        options: [
          { text: '短期 ≤24个月，快速回收', icon: 'fa-bolt', color: '#eab308', value: 'short' },
          { text: '中期 24-30个月，主流选择', icon: 'fa-clock', color: '#06b6d4', value: 'medium' },
          { text: '长期 30个月+，追求长期价值', icon: 'fa-hourglass-half', color: '#8b5cf6', value: 'long' },
        ]
      },
      // Step 4: 预算规模
      {
        question: '您计划投入多少资金？（每张合约 ¥1,000）',
        options: [
          { text: '¥5,000 - ¥20,000（5-20张）', icon: 'fa-seedling', color: '#10b981', value: '10' },
          { text: '¥20,000 - ¥50,000（20-50张）', icon: 'fa-tree', color: '#06b6d4', value: '35' },
          { text: '¥50,000+（50张以上）', icon: 'fa-landmark', color: '#8b5cf6', value: '60' },
        ]
      }
    ];

    function goToAIBuilder() {
      if (allDeals.length === 0) {
        // 确保筛子已初始化
        if (mySieves.length === 0) initMySieves();
        loadDemoData();
        // 只设置 dealsList，不渲染 dashboard（避免 null 引用）
        var models = getActiveSieveModels();
        var sieve = models['all'];
        if (sieve) dealsList = sieve.filter(allDeals);
        else dealsList = allDeals.map(function(d) { return Object.assign({}, d, { matchScore: null, sieveResult: 'all' }); });
        currentSieve = 'all';
      }
      var el = document.getElementById('abTotalContracts');
      if (el) el.textContent = (totalVirtualContracts || allDeals.length).toLocaleString();
      switchPage('pageAIBuilder');
    }

    function resetAIBuilder() {
      abState = { step: 0, style: null, industries: [], riskTolerance: null, targetReturn: null, budget: null, period: null, extraPrefs: [], portfolio: [], portfolioName: '' };
      abSelectedIndustries = [];
      // 重置UI
      var msgs = document.getElementById('abMessages');
      if (msgs) msgs.innerHTML = '';
      var waitEl = document.getElementById('abWaitingState');
      if (waitEl) waitEl.classList.remove('hidden');
      var panelEl = document.getElementById('abPortfolioPanel');
      if (panelEl) panelEl.classList.add('hidden');
      // 重新生成欢迎消息
      abAddAIMessage(
        '<p class="text-sm text-white leading-relaxed mb-3">好的，我们重新开始！</p>' +
        '<p class="text-sm leading-relaxed mb-4" style="color: rgba(255,255,255,0.65);">您这次投资最看重什么？</p>',
        [
          { text: '稳定收益，安全第一', icon: 'fa-shield-alt', color: 'emerald', action: "abSelectOption('追求稳定收益，安全第一')" },
          { text: '愿承担风险，追高回报', icon: 'fa-rocket', color: 'amber', action: "abSelectOption('愿承担风险，追求高回报')" },
          { text: '攻守兼备，均衡配置', icon: 'fa-balance-scale', color: 'blue', action: "abSelectOption('攻守兼备，均衡配置')" },
          { text: '看好特定行业，集中布局', icon: 'fa-bullseye', color: 'pink', action: "abSelectOption('看好特定行业，集中布局')" },
        ]
      );
      showToast('info', '已重置', 'AI 组合构建器已重新开始');
    }

    function abAddUserMessage(text) {
      const msgs = document.getElementById('abMessages');
      if (!msgs) return;
      const div = document.createElement('div');
      div.className = 'ab-msg-user animate-fade-in';
      div.innerHTML = '<div>' + text + '</div>';
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function abAddAIMessage(html, quickOptions) {
      const msgs = document.getElementById('abMessages');
      if (!msgs) return;

      // 打字动画
      const typing = document.createElement('div');
      typing.className = 'ab-msg-ai';
      typing.innerHTML = '<div class="ab-avatar"><i class="fas fa-robot"></i></div><div class="ab-content"><div class="ab-typing"><span></span><span></span><span></span></div></div>';
      msgs.appendChild(typing);
      msgs.scrollTop = msgs.scrollHeight;

      setTimeout(() => {
        typing.remove();
        const div = document.createElement('div');
        div.className = 'ab-msg-ai animate-fade-in';
        let optHTML = '';
        if (quickOptions && quickOptions.length > 0) {
          optHTML = '<div class="flex flex-wrap gap-2 mt-3">';
          quickOptions.forEach(opt => {
            optHTML += '<button onclick="' + (opt.action || '') + '" class="ab-quick-btn"><i class="fas ' + opt.icon + ' mr-1.5 text-' + opt.color + '-400"></i>' + opt.text + '</button>';
          });
          optHTML += '</div>';
        }
        div.innerHTML = '<div class="ab-avatar"><i class="fas fa-robot"></i></div><div class="flex-1"><div class="ab-content">' + html + '</div>' + optHTML + '</div>';
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
      }, 800 + Math.random() * 600);
    }

    function abSelectOption(text) {
      abAddUserMessage(text);
      // 移除当前快捷按钮（已点击）
      const lastMsg = document.getElementById('abMessages').lastElementChild;
      // 解析用户选择并推进对话
      abProcessUserInput(text);
    }

    function abSendMessage() {
      const input = document.getElementById('abInput');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      abAddUserMessage(msg);
      abProcessUserInput(msg);
    }

    function abProcessUserInput(text) {
      const lower = text.toLowerCase();

      if (abState.step === 0) {
        // Step 0: 解析投资风格
        if (lower.includes('稳定') || lower.includes('安全') || lower.includes('保守')) {
          abState.style = 'conservative';
          abState.riskTolerance = 'low';
        } else if (lower.includes('风险') || lower.includes('高回报') || lower.includes('激进') || lower.includes('进取')) {
          abState.style = 'aggressive';
          abState.riskTolerance = 'high';
        } else if (lower.includes('均衡') || lower.includes('攻守') || lower.includes('平衡')) {
          abState.style = 'balanced';
          abState.riskTolerance = 'medium';
        } else if (lower.includes('行业') || lower.includes('集中') || lower.includes('看好')) {
          abState.style = 'sector';
          abState.riskTolerance = 'medium';
        } else {
          abState.style = 'balanced';
          abState.riskTolerance = 'medium';
        }
        abState.step = 1;
        // 根据风格给出不同的行业引导
        const styleNames = { conservative: '稳健型', aggressive: '进取型', balanced: '均衡型', sector: '行业聚焦型' };
        const styleEmojis = { conservative: '🛡️', aggressive: '🚀', balanced: '⚖️', sector: '🎯' };
        abAddAIMessage(
          '<p class="text-sm leading-relaxed mb-2" style="color: rgba(255,255,255,0.7);">收到！您倾向于 <span class="font-bold text-white">' + styleNames[abState.style] + '</span> ' + styleEmojis[abState.style] + ' 投资策略。</p>' +
          '<p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.55);">接下来，' + AB_FLOW[0].question + '</p>',
          AB_FLOW[0].options.map(opt => ({
            text: opt.text, icon: opt.icon, color: opt.color.replace('#', '').substring(0,3) === '10b' ? 'emerald' : (opt.color.includes('5cf6') ? 'violet' : (opt.color.includes('f44') ? 'red' : (opt.color.includes('b6d4') ? 'cyan' : (opt.color.includes('4899') ? 'pink' : (opt.color.includes('b308') ? 'yellow' : 'gray'))))),
            action: "abSelectIndustry('" + opt.value + "')"
          }))
        );
        // 第一次生成初始组合
        abBuildPortfolio();
      } else if (abState.step === 1) {
        // 解析行业（可能是手动输入）
        abParseIndustryInput(lower);
        abState.step = 2;
        abAddAIMessage(
          '<p class="text-sm leading-relaxed mb-2" style="color: rgba(255,255,255,0.7);">好的，行业方向已明确 ✅ 我正在筛选匹配的合约。</p>' +
          '<p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.55);">' + AB_FLOW[1].question + '</p>',
          AB_FLOW[1].options.map(opt => ({
            text: opt.text, icon: opt.icon, color: opt.color.includes('10b') ? 'emerald' : (opt.color.includes('3b82') ? 'blue' : 'amber'),
            action: "abSelectRisk('" + opt.value + "')"
          }))
        );
        abBuildPortfolio();
      } else if (abState.step === 2) {
        // 解析风险等级
        if (lower.includes('低') || lower.includes('7') || lower.includes('安全')) abState.riskTolerance = 'low';
        else if (lower.includes('高') || lower.includes('14') || lower.includes('承受')) abState.riskTolerance = 'high';
        else abState.riskTolerance = 'medium';
        abState.step = 3;
        abAddAIMessage(
          '<p class="text-sm leading-relaxed mb-2" style="color: rgba(255,255,255,0.7);">风险偏好已记录 📊 组合正在优化中...</p>' +
          '<p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.55);">' + AB_FLOW[2].question + '</p>',
          AB_FLOW[2].options.map(opt => ({
            text: opt.text, icon: opt.icon, color: opt.color.includes('eab') ? 'yellow' : (opt.color.includes('06b') ? 'cyan' : 'violet'),
            action: "abSelectPeriod('" + opt.value + "')"
          }))
        );
        abBuildPortfolio();
      } else if (abState.step === 3) {
        // 解析期限
        if (lower.includes('短') || lower.includes('快') || lower.includes('24')) abState.period = 'short';
        else if (lower.includes('长') || lower.includes('30')) abState.period = 'long';
        else abState.period = 'medium';
        abState.step = 4;
        abAddAIMessage(
          '<p class="text-sm leading-relaxed mb-2" style="color: rgba(255,255,255,0.7);">期限偏好已确认 ⏱️</p>' +
          '<p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.55);">' + AB_FLOW[3].question + '</p>',
          AB_FLOW[3].options.map(opt => ({
            text: opt.text, icon: opt.icon, color: opt.color.includes('10b') ? 'emerald' : (opt.color.includes('06b') ? 'cyan' : 'violet'),
            action: "abSelectBudget('" + opt.value + "')"
          }))
        );
        abBuildPortfolio();
      } else if (abState.step === 4) {
        // 解析预算
        if (lower.includes('5') && !lower.includes('50')) abState.budget = 10;
        else if (lower.includes('50') || lower.includes('以上') || lower.includes('大')) abState.budget = 60;
        else abState.budget = 35;
        abState.step = 5;
        abBuildPortfolio();
        abAddAIMessage(
          '<p class="text-sm leading-relaxed mb-2 font-semibold text-white">🎉 您的专属投资组合已构建完成！</p>' +
          '<p class="text-sm leading-relaxed mb-3" style="color: rgba(255,255,255,0.55);">右侧面板展示了 AI 根据您的偏好从 ' + (totalVirtualContracts || allDeals.length).toLocaleString() + ' 张全平台合约中精选的组合。</p>' +
          '<div class="p-3 rounded-xl" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);">' +
            '<p class="text-xs" style="color: #34d399;"><i class="fas fa-check-circle mr-1"></i>您可以继续与我对话来微调组合，例如「减少餐饮比例」「加入更多科技合约」「降低风险」等。</p>' +
          '</div>',
          [
            { text: '满意，去认购', icon: 'fa-check', color: 'emerald', action: "abApplyPortfolio()" },
            { text: '减少风险', icon: 'fa-shield-alt', color: 'blue', action: "abSelectOption('帮我降低组合风险')" },
            { text: '加入更多科技', icon: 'fa-microchip', color: 'violet', action: "abSelectOption('我想加入更多科技类合约')" },
          ]
        );
      } else {
        // Step 5+: 自由调整阶段
        abState.extraPrefs.push(text);
        // 解析自由文本微调
        if (lower.includes('科技') || lower.includes('ai') || lower.includes('人工智能')) {
          if (!abState.industries.includes('科技')) abState.industries.push('科技');
        }
        if (lower.includes('餐饮') || lower.includes('美食')) {
          if (!abState.industries.includes('餐饮')) abState.industries.push('餐饮');
        }
        if (lower.includes('减少风险') || lower.includes('降低风险') || lower.includes('更安全')) {
          abState.riskTolerance = 'low';
        }
        if (lower.includes('提高回报') || lower.includes('更激进') || lower.includes('更高')) {
          abState.riskTolerance = 'high';
        }
        if (lower.includes('减少') && lower.includes('餐饮')) {
          abState.industries = abState.industries.filter(i => i !== '餐饮');
          if (abState.industries.length === 0) abState.industries = ['all'];
        }
        if (lower.includes('短期') || lower.includes('快速')) abState.period = 'short';
        if (lower.includes('健康') || lower.includes('医疗')) {
          if (!abState.industries.includes('健康')) abState.industries.push('健康');
        }
        if (lower.includes('演艺') || lower.includes('娱乐')) {
          if (!abState.industries.includes('演艺')) abState.industries.push('演艺');
        }
        if (lower.includes('教育')) {
          if (!abState.industries.includes('教育')) abState.industries.push('教育');
        }
        if (lower.includes('零售')) {
          if (!abState.industries.includes('零售')) abState.industries.push('零售');
        }

        abBuildPortfolio();
        const p = abState.portfolio;
        abAddAIMessage(
          '<p class="text-sm leading-relaxed mb-2" style="color: rgba(255,255,255,0.7);">已根据您的要求重新调整组合 🔄</p>' +
          '<p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.55);">当前组合包含 <span class="font-bold text-white">' + p.length + '</span> 张合约，覆盖 <span class="font-bold text-white">' + [...new Set(p.map(c=>c.industry))].length + '</span> 个行业。右侧面板已更新。</p>' +
          '<p class="text-xs mt-2" style="color: rgba(255,255,255,0.3);">继续输入可进一步微调，或点击「一键认购」完成。</p>',
          [
            { text: '满意，去认购', icon: 'fa-check', color: 'emerald', action: "abApplyPortfolio()" },
            { text: '继续调整', icon: 'fa-sliders-h', color: 'violet', action: "document.getElementById('abInput').focus()" },
          ]
        );
      }
    }

    // 行业选择（支持多选）
    let abSelectedIndustries = [];
    function abSelectIndustry(value) {
      if (value === 'all') {
        abSelectedIndustries = ['all'];
        abAddUserMessage('不限行业，全面配置');
        abState.industries = ['all'];
        abState.step = 2;
        abBuildPortfolio();
        abAddAIMessage(
          '<p class="text-sm leading-relaxed mb-2" style="color: rgba(255,255,255,0.7);">全行业配置 🌐 我会从所有行业中均衡筛选。</p>' +
          '<p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.55);">' + AB_FLOW[1].question + '</p>',
          AB_FLOW[1].options.map(opt => ({
            text: opt.text, icon: opt.icon, color: opt.color.includes('10b') ? 'emerald' : (opt.color.includes('3b82') ? 'blue' : 'amber'),
            action: "abSelectRisk('" + opt.value + "')"
          }))
        );
        return;
      }
      if (abSelectedIndustries.includes(value)) return;
      abSelectedIndustries.push(value);
      abState.industries = [...abSelectedIndustries];
      abAddUserMessage('选择了: ' + abSelectedIndustries.join('、'));
      abBuildPortfolio();

      // 还可以继续选，或者进入下一步
      if (abSelectedIndustries.length >= 1) {
        abState.step = 2;
        abAddAIMessage(
          '<p class="text-sm leading-relaxed mb-2" style="color: rgba(255,255,255,0.7);">已选择 <span class="font-bold text-white">' + abSelectedIndustries.join('、') + '</span> ✅</p>' +
          '<p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.55);">' + AB_FLOW[1].question + '</p>',
          AB_FLOW[1].options.map(opt => ({
            text: opt.text, icon: opt.icon, color: opt.color.includes('10b') ? 'emerald' : (opt.color.includes('3b82') ? 'blue' : 'amber'),
            action: "abSelectRisk('" + opt.value + "')"
          }))
        );
      }
    }

    function abSelectRisk(value) {
      abState.riskTolerance = value;
      const labels = { low: '低风险 · 年化 7-10%', medium: '中等风险 · 年化 10-14%', high: '较高风险 · 年化 14%+' };
      abAddUserMessage(labels[value] || value);
      abState.step = 3;
      abBuildPortfolio();
      abAddAIMessage(
        '<p class="text-sm leading-relaxed mb-2" style="color: rgba(255,255,255,0.7);">风险偏好 → <span class="font-bold text-white">' + (labels[value] || value) + '</span> 📊</p>' +
        '<p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.55);">' + AB_FLOW[2].question + '</p>',
        AB_FLOW[2].options.map(opt => ({
          text: opt.text, icon: opt.icon, color: opt.color.includes('eab') ? 'yellow' : (opt.color.includes('06b') ? 'cyan' : 'violet'),
          action: "abSelectPeriod('" + opt.value + "')"
        }))
      );
    }

    function abSelectPeriod(value) {
      abState.period = value;
      const labels = { short: '短期 ≤24个月', medium: '中期 24-30个月', long: '长期 30个月+' };
      abAddUserMessage(labels[value] || value);
      abState.step = 4;
      abBuildPortfolio();
      abAddAIMessage(
        '<p class="text-sm leading-relaxed mb-2" style="color: rgba(255,255,255,0.7);">期限偏好 → <span class="font-bold text-white">' + (labels[value] || value) + '</span> ⏱️</p>' +
        '<p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.55);">' + AB_FLOW[3].question + '</p>',
        AB_FLOW[3].options.map(opt => ({
          text: opt.text, icon: opt.icon, color: opt.color.includes('10b') ? 'emerald' : (opt.color.includes('06b') ? 'cyan' : 'violet'),
          action: "abSelectBudget('" + opt.value + "')"
        }))
      );
    }

    function abSelectBudget(value) {
      abState.budget = parseInt(value);
      const labels = { '10': '¥5,000 - ¥20,000', '35': '¥20,000 - ¥50,000', '60': '¥50,000+' };
      abAddUserMessage(labels[value] || '¥' + (parseInt(value) * 1000).toLocaleString());
      abProcessUserInput(labels[value] || value);
    }

    function abParseIndustryInput(text) {
      const mapping = { '餐饮': '餐饮', '美食': '餐饮', '科技': '科技', 'ai': '科技', '健康': '健康', '医疗': '健康', '零售': '零售', '消费': '零售', '教育': '教育', '演艺': '演艺', '娱乐': '演艺' };
      Object.keys(mapping).forEach(key => {
        if (text.includes(key) && !abState.industries.includes(mapping[key])) {
          abState.industries.push(mapping[key]);
        }
      });
      if (abState.industries.length === 0) abState.industries = ['all'];
    }

    // ★ 核心：根据当前状态从全部合约中构建组合
    function abBuildPortfolio() {
      let pool = allDeals.filter(d => d.status === 'available' || d.isMine);

      // 1. 行业筛选
      if (abState.industries.length > 0 && !abState.industries.includes('all')) {
        pool = pool.filter(c => abState.industries.includes(c.industry));
      }

      // 2. 风险筛选
      if (abState.riskTolerance === 'low') {
        pool = pool.filter(c => parseFloat(c.aiScore) >= 8.0 && (c.riskGrade === 'A+' || c.riskGrade === 'A'));
      } else if (abState.riskTolerance === 'high') {
        pool = pool.filter(c => parseInt(c.revenueShare) >= 11);
      } else {
        pool = pool.filter(c => parseFloat(c.aiScore) >= 7.0);
      }

      // 3. 期限筛选
      if (abState.period === 'short') {
        pool = pool.filter(c => parseInt(c.period) <= 24);
      } else if (abState.period === 'long') {
        pool = pool.filter(c => parseInt(c.period) >= 30);
      }

      // 4. 排序（按 AI 评分降序 + 多样性）
      pool.sort((a, b) => parseFloat(b.aiScore) - parseFloat(a.aiScore));

      // 5. 预算限制 & 多样性选择
      const budget = abState.budget || 25;
      const selected = [];
      const projectSeen = {};
      for (const c of pool) {
        if (selected.length >= budget) break;
        // 每个项目最多选 N 张，保证多样性
        const maxPerProject = Math.max(3, Math.ceil(budget / 5));
        if (!projectSeen[c.projectId]) projectSeen[c.projectId] = 0;
        if (projectSeen[c.projectId] >= maxPerProject) continue;
        projectSeen[c.projectId]++;
        selected.push(c);
      }

      abState.portfolio = selected;

      // 生成组合名称
      const styleNames = { conservative: '稳健守护', aggressive: '进取猎手', balanced: '均衡优选', sector: '行业先锋' };
      abState.portfolioName = (styleNames[abState.style] || 'AI智选') + ' · ' + (abState.industries.includes('all') ? '全行业' : abState.industries.join('+')) + ' S26';

      // 更新右侧面板
      abRenderPortfolio();
    }

    function abRenderPortfolio() {
      const p = abState.portfolio;
      if (p.length === 0) return;

      // 显示面板（安全检查）
      var waitEl = document.getElementById('abWaitingState');
      var panelEl = document.getElementById('abPortfolioPanel');
      if (waitEl) waitEl.classList.add('hidden');
      if (panelEl) {
        panelEl.classList.remove('hidden');
        panelEl.classList.add('ab-portfolio-evolve');
        setTimeout(function() { panelEl.classList.remove('ab-portfolio-evolve'); }, 600);
      }

      // 计算统计
      const scores = calcPortfolioRadarScores(p);
      const overall = calcOverallScore(scores);
      const grade = getScoreGrade(overall);
      const projects = [...new Set(p.map(c => c.projectId))];
      const totalValue = p.length * 1000;
      const avgShare = (p.reduce((s, c) => s + parseInt(c.revenueShare), 0) / p.length).toFixed(1);

      // Header
      document.getElementById('abPortfolioName').textContent = abState.portfolioName;
      document.getElementById('abPortfolioDesc').textContent = '基于您的投资偏好从 ' + allDeals.length + ' 张合约中智能生成';
      document.getElementById('abPortfolioMeta').textContent = 'Step ' + Math.min(abState.step, 5) + '/5 · 实时演进';
      document.getElementById('abGradeBadge').textContent = grade.grade + ' · ' + overall + '分';
      document.getElementById('abGradeBadge').style.cssText = 'background:' + grade.bg + '; color:' + grade.color + '; padding:4px 14px; border-radius:12px; font-size:13px; font-weight:700;';

      // 核心数字
      document.getElementById('abStatContracts').textContent = p.length;
      document.getElementById('abStatProjects').textContent = projects.length;
      document.getElementById('abStatValue').textContent = '¥' + totalValue.toLocaleString();
      document.getElementById('abStatReturn').textContent = avgShare + '%';

      // 雷达图
      setTimeout(() => { drawRadarChart('abRadarCanvas', scores, { size: 300 }); }, 100);

      // 维度网格
      document.getElementById('abDimGrid').innerHTML = RADAR_DIMENSIONS.map((dim, i) => {
        const s = scores[i]; const g = getScoreGrade(s);
        return '<div class="text-center p-2 rounded-xl" style="background:' + dim.color + '10; border: 1px solid ' + dim.color + '22;">' +
          '<i class="fas ' + dim.icon + '" style="color:' + dim.color + '; font-size:11px;"></i>' +
          '<p class="text-xs font-bold mt-1" style="color:' + g.color + ';">' + s + '</p>' +
          '<p class="text-xs truncate" style="font-size:8px; color: rgba(255,255,255,0.35);">' + dim.label.replace(/YITO/, '').substring(0, 4) + '</p>' +
        '</div>';
      }).join('');

      // 行业配比
      const industryDistrib = {};
      p.forEach(c => { industryDistrib[c.industry] = (industryDistrib[c.industry] || 0) + 1; });
      const indColors = { '餐饮': '#f59e0b', '零售': '#06b6d4', '科技': '#8b5cf6', '教育': '#10b981', '健康': '#ef4444', '演艺': '#ec4899' };
      document.getElementById('abIndustryDistrib').innerHTML = Object.keys(industryDistrib).map(ind => {
        const count = industryDistrib[ind];
        const pct = (count / p.length * 100).toFixed(1);
        const c = indColors[ind] || '#6b7280';
        return '<div class="flex items-center gap-3">' +
          '<div class="w-3 h-3 rounded-full flex-shrink-0" style="background:' + c + ';"></div>' +
          '<span class="text-xs flex-1" style="color: rgba(255,255,255,0.6);">' + ind + '</span>' +
          '<div class="flex-1 h-2 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.06);"><div class="h-full rounded-full transition-all" style="width:' + pct + '%; background:' + c + ';"></div></div>' +
          '<span class="text-xs font-bold" style="color: rgba(255,255,255,0.7);">' + count + '张</span>' +
          '<span class="text-xs" style="color: rgba(255,255,255,0.3);">' + pct + '%</span>' +
        '</div>';
      }).join('');

      // 合约清单
      document.getElementById('abContractCount').textContent = p.length + ' 张';
      document.getElementById('abContractList').innerHTML = p.slice(0, 30).map(c => {
        const cs = calcRadarScores(c); const co = calcOverallScore(cs); const cg = getScoreGrade(co);
        return '<div class="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);" onmouseover="this.style.borderColor=\'rgba(139,92,246,0.2)\';this.style.background=\'rgba(139,92,246,0.05)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.05)\';this.style.background=\'rgba(255,255,255,0.03)\'" onclick="openDetail(&#39;' + c.id + '&#39;)">' +
          '<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + (indColors[c.industry] || '#6b7280') + '18;"><i class="fas fa-file-contract" style="color:' + (indColors[c.industry] || '#6b7280') + '; font-size:10px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-xs font-bold text-white truncate">' + c.name + '</p>' +
            '<p class="text-xs" style="color: rgba(255,255,255,0.35);"><span class="font-mono">' + (c.mcn || '').substring(0, 16) + '</span> · ' + c.industry + ' · ' + c.revenueShare + '</p>' +
          '</div>' +
          '<div class="text-right flex-shrink-0">' +
            '<p class="text-xs font-bold" style="color:' + cg.color + ';">' + co + '</p>' +
            '<p style="font-size:9px; color:' + cg.color + ';">' + cg.grade + '</p>' +
          '</div>' +
        '</div>';
      }).join('') + (p.length > 30 ? '<p class="text-xs text-center py-2" style="color: rgba(255,255,255,0.25);">还有 ' + (p.length - 30) + ' 张合约未展示</p>' : '');
    }

    function abApplyPortfolio() {
      if (abState.portfolio.length === 0) { showToast('warning', '组合为空', '请先通过对话构建组合'); return; }
      const userName = currentUser ? (currentUser.displayName || currentUser.username) : '游客';
      let count = 0;
      abState.portfolio.forEach(c => {
        if (c.status === 'available' && !c.isMine) {
          c.status = 'sold'; c.holder = userName; c.isMine = true;
          const orig = allDeals.find(d => d.id === c.id);
          if (orig) { orig.status = 'sold'; orig.holder = userName; orig.isMine = true; }
          const ps = projectSummaries.find(s => s.projectId === c.projectId);
          if (ps) { ps.mine++; ps.available = Math.max(0, ps.available - 1); }
          count++;
        }
      });
      showToast('success', '一键认购成功！', '已认购 ' + count + ' 张合约 · 总投入 ¥' + (count * 1000).toLocaleString());
      abBuildPortfolio(); // 刷新面板
    }

    function abRefine() {
      document.getElementById('abInput').focus();
      showToast('info', '继续调整', '在输入框中描述您的调整需求');
    }

    // ==================== 初始化入口 ====================
    // 立即启动初始化（不等待 DOMContentLoaded，因为 script 在 body 末尾）
    initApp();
  </script>
  <!-- Tailwind CSS CDN 放在最后异步加载，不阻塞页面渲染和JS执行 -->
  <script src="https://cdn.tailwindcss.com"></script>
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
