/**
 * ===================================================================
 * 参与通 Deal Connect — Full-Stack SPA
 * ===================================================================
 * Self-contained product: Loading → Login/Register → Dashboard → Detail
 * Visual mother template: 合约通 Contract Connect (V33)
 * Brand: DEAL CONNECT / 参与通
 * Powered by Micro Connect Group
 *
 * Business domain: Deal participation & opportunity engagement
 * - Browse & filter investment opportunities
 * - Express interest / mark intent on deals
 * - Track deal pipeline and participation status
 * - AI-powered deal recommendations
 */
import { Hono } from 'hono'

const app = new Hono()

/* ============================
   API Routes (Backend)
   ============================ */

// In-memory store (Cloudflare Workers: use D1/KV for production)
const users: Map<string, any> = new Map()
const deals: any[] = []

// ---- Auth ----
app.post('/api/auth/register', async (c) => {
  const { username, email, password, displayName, phone, role } = await c.req.json()
  if (!username || !email || !password) {
    return c.json({ success: false, message: '用户名、邮箱和密码为必填项' }, 400)
  }
  if (users.has(username) || [...users.values()].find(u => u.email === email)) {
    return c.json({ success: false, message: '用户名或邮箱已被注册' }, 409)
  }
  const user = { id: 'U_' + Date.now(), username, email, password, displayName: displayName || username, phone, role: role || 'both', createdAt: new Date().toISOString() }
  users.set(username, user)
  return c.json({ success: true, user: { ...user, password: undefined }, message: '注册成功，欢迎加入Deal Connect！' })
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

// ---- Deals ----
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
  <meta name="description" content="参与通 Deal Connect — 投资参与机会的智能匹配与管理平台。Powered by Micro Connect Group.">
  <meta name="theme-color" content="#0a2e2a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta property="og:title" content="参与通 Deal Connect">
  <meta property="og:description" content="投资参与机会的智能匹配与管理平台">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Micro Connect">
  <!-- Favicon: rounded square with gradient -->
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='64' y2='64'%3E%3Cstop offset='0%25' stop-color='%232EC4B6'/%3E%3Cstop offset='100%25' stop-color='%2328A696'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M20 20 L44 32 L20 44 Z' fill='white' opacity='0.95'/%3E%3C/svg%3E">
  <!-- DNS Prefetch -->
  <link rel="dns-prefetch" href="https://cdn.tailwindcss.com">
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  <link rel="preconnect" href="https://cdn.tailwindcss.com" crossorigin>
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- FontAwesome -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <!-- Design System CSS -->
  <link href="/static/style.css" rel="stylesheet">
  <!-- Inline utility fallbacks -->
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.5; background: #f5f5f7; color: #1d1d1f; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; letter-spacing: -0.01em; }
    .hidden { display: none !important; }
    .page { display: none; }
    .page.active { display: flex; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
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
          <div class="animate-float"><div class="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center"><i id="obIcon" class="fas fa-handshake text-white text-4xl"></i></div></div>
        </div>
      </div>
      <div class="p-8 relative overflow-hidden" style="min-height: 280px;">
        <div id="obStep0" class="ob-step active text-center">
          <h2 class="text-2xl font-bold text-gray-900 mb-3">欢迎使用参与通</h2>
          <p class="text-gray-500 mb-8">一站式发现、评估和参与投资机会</p>
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="p-4 bg-teal-50 rounded-2xl"><div class="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3"><i class="fas fa-search-dollar text-teal-600 text-xl"></i></div><p class="text-sm font-medium text-gray-700">机会发现</p></div>
            <div class="p-4 bg-cyan-50 rounded-2xl"><div class="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-3"><i class="fas fa-chart-line text-cyan-600 text-xl"></i></div><p class="text-sm font-medium text-gray-700">智能分析</p></div>
            <div class="p-4 bg-pink-50 rounded-2xl"><div class="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3"><i class="fas fa-hands-helping text-pink-600 text-xl"></i></div><p class="text-sm font-medium text-gray-700">快速参与</p></div>
          </div>
        </div>
        <div id="obStep1" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200"><i class="fas fa-binoculars text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold text-teal-600 uppercase tracking-wide">第一步</span><h3 class="text-xl font-bold text-gray-900 mt-1 mb-3">浏览投资机会</h3><p class="text-gray-500 mb-4">系统汇集经过评审和风控的高质量项目，您可以按行业、金额、评分等维度筛选。</p>
              <div class="flex items-center space-x-4 text-sm"><div class="flex items-center text-gray-400"><i class="fas fa-check-circle text-emerald-500 mr-2"></i><span>多维度筛选</span></div><div class="flex items-center text-gray-400"><i class="fas fa-check-circle text-emerald-500 mr-2"></i><span>AI评分排序</span></div></div>
            </div>
          </div>
        </div>
        <div id="obStep2" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200"><i class="fas fa-hand-pointer text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold text-emerald-600 uppercase tracking-wide">第二步</span><h3 class="text-xl font-bold text-gray-900 mt-1 mb-3">表达投资意向</h3><p class="text-gray-500 mb-4">对感兴趣的项目点击"我要参与"，系统自动记录意向并通知项目方。支持对比多个项目。</p>
              <div class="bg-gray-50 rounded-xl p-3 border border-gray-100"><div class="flex items-center text-sm text-gray-600"><i class="fas fa-star text-amber-500 mr-2"></i><span class="italic">"已收藏3个项目，正在对比中…"</span></div></div>
            </div>
          </div>
        </div>
        <div id="obStep3" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200"><i class="fas fa-chart-pie text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold text-amber-600 uppercase tracking-wide">第三步</span><h3 class="text-xl font-bold text-gray-900 mt-1 mb-3">追踪参与进度</h3><p class="text-gray-500 mb-4">在仪表盘实时查看每笔参与的处理进度、预期回报和合同状态。</p>
              <div class="flex items-center space-x-3">
                <div class="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium"><i class="fas fa-spinner mr-1"></i>评审中</div>
                <i class="fas fa-arrow-right text-gray-300"></i>
                <div class="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium"><i class="fas fa-check mr-1"></i>已通过</div>
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
        <!-- Logo -->
        <div class="p-8 text-center" style="border-bottom: 1px solid rgba(0,0,0,0.06);">
          <div class="mx-auto mb-5 animate-float" style="width:52px; height:68px; position:relative;">
            <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6 0%, #3DD8CA 100%); position:absolute; top:0; left:4px; box-shadow: 0 4px 16px rgba(46,196,182,0.35);"></div>
            <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #28A696 0%, #2EC4B6 100%); position:absolute; bottom:0; left:4px; box-shadow: 0 4px 16px rgba(40,166,150,0.3); opacity:0.85;"></div>
          </div>
          <h1 style="font-family:'Montserrat',sans-serif; font-weight:900; font-size:22px; letter-spacing:0.04em; color:#1a1a1a; line-height:1.15; margin-bottom:6px;">DEAL<br>CONNECT</h1>
          <div style="width:120px; height:2.5px; background:#2EC4B6; margin:8px auto 10px; border-radius:2px;"></div>
          <p style="font-family:'Montserrat',sans-serif; font-size:9px; letter-spacing:0.2em; color:#666; font-weight:500;">POWERED BY MICRO CONNECT GROUP</p>
          <p class="text-lg font-bold mt-3" style="color:#1a1a1a;">参与通</p>
        </div>
        <!-- Tabs -->
        <div class="flex" style="border-bottom: 1px solid rgba(0,0,0,0.06);">
          <button onclick="switchAuthTab('login')" id="tabLogin" class="flex-1 py-3 text-center font-semibold" style="color:#2EC4B6; border-bottom: 2px solid #2EC4B6;">登录</button>
          <button onclick="switchAuthTab('register')" id="tabRegister" class="flex-1 py-3 text-center font-semibold" style="color:#86868b;">注册</button>
        </div>
        <!-- Login Form -->
        <div id="formLogin" class="p-6">
          <form onsubmit="event.preventDefault(); handleLogin();" autocomplete="on">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">用户名 / 邮箱</label>
              <input type="text" id="loginUsername" placeholder="请输入用户名或邮箱" autocomplete="username" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" onkeydown="if(event.key==='Enter')document.getElementById('loginPassword').focus()">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div class="password-wrapper">
                <input type="password" id="loginPassword" placeholder="请输入密码" autocomplete="current-password" class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500">
                <button type="button" onclick="togglePwdVis('loginPassword', this)" class="password-toggle" tabindex="-1"><i class="fas fa-eye"></i></button>
              </div>
            </div>
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
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">密码 <span class="text-red-500">*</span></label>
              <div class="password-wrapper"><input type="password" id="regPassword" placeholder="至少6位" autocomplete="new-password" class="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"><button type="button" onclick="togglePwdVis('regPassword', this)" class="password-toggle" tabindex="-1"><i class="fas fa-eye"></i></button></div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">默认角色</label>
              <div class="grid grid-cols-3 gap-2">
                <label class="flex items-center justify-center p-2.5 border border-gray-200 rounded-xl cursor-pointer hover:border-teal-300 transition-all text-sm has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50"><input type="radio" name="regRole" value="investor" class="mr-1.5" style="width:14px;height:14px;" checked><i class="fas fa-landmark mr-1 text-xs text-teal-600"></i>投资方</label>
                <label class="flex items-center justify-center p-2.5 border border-gray-200 rounded-xl cursor-pointer hover:border-amber-300 transition-all text-sm has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50"><input type="radio" name="regRole" value="borrower" class="mr-1.5" style="width:14px;height:14px;"><i class="fas fa-store mr-1 text-xs text-amber-600"></i>融资方</label>
                <label class="flex items-center justify-center p-2.5 border border-gray-200 rounded-xl cursor-pointer hover:border-cyan-300 transition-all text-sm has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-50"><input type="radio" name="regRole" value="both" class="mr-1.5" style="width:14px;height:14px;"><i class="fas fa-exchange-alt mr-1 text-xs text-cyan-600"></i>双方</label>
              </div>
            </div>
            <button type="submit" class="w-full py-3 btn-primary rounded-xl font-medium shadow-lg"><i class="fas fa-user-plus mr-2"></i>注册</button>
          </div>
          <p id="regError" class="hidden mt-4 text-sm text-red-500 text-center"></p>
          </form>
        </div>
        <!-- Footer -->
        <div class="px-6 pb-4 text-center"><p class="text-xs text-gray-400">&copy; 2026 参与通 Deal Connect · Micro Connect Group</p></div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 1: Dashboard (Main List) ==================== -->
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
          <button onclick="showOnboarding()" class="tooltip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: #6b7280; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.06);" data-tip="新手引导" onmouseover="this.style.background='rgba(93,196,179,0.1)'; this.style.color='#3D8F83'" onmouseout="this.style.background='rgba(0,0,0,0.03)'; this.style.color='#6b7280'"><i class="fas fa-question-circle text-xs"></i><span>帮助</span></button>
          <div class="h-5 mx-0.5" style="width: 1px; background: rgba(0,0,0,0.08);"></div>
          <button onclick="showToast('info','推荐引擎','AI正在为您寻找最佳机会')" class="tooltip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: #49A89A; background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.12);" data-tip="AI推荐"><i class="fas fa-robot"></i><span>推荐</span></button>
          <button onclick="showNewDealModal()" class="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white transition-all" style="background: linear-gradient(135deg, #5DC4B3, #49A89A); box-shadow: 0 2px 8px rgba(93,196,179,0.35);" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'"><i class="fas fa-plus" style="font-size: 10px;"></i>发起参与</button>
          <!-- User avatar -->
          <div class="pl-1.5 ml-0.5 relative">
            <button onclick="toggleUserDD(event)" id="navUserBtn" class="flex items-center space-x-2 px-2 py-1.5 rounded-full transition-all" style="background: rgba(0,0,0,0.02);" onmouseover="this.style.background='rgba(93,196,179,0.08)'" onmouseout="this.style.background='rgba(0,0,0,0.02)'">
              <div id="navAvatar" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background: linear-gradient(135deg, #5DC4B3, #3D8F83); box-shadow: 0 2px 8px rgba(93,196,179,0.3);">U</div>
              <span id="navName" class="text-xs font-semibold max-w-[70px] truncate" style="color: #374151;">用户</span>
              <i class="fas fa-chevron-down text-xs" style="color: #9ca3af; font-size: 10px;"></i>
            </button>
            <div id="userDropdown" class="user-dropdown">
              <div class="user-dropdown-header"><div class="flex items-center space-x-3"><div id="ddAvatar" class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style="background: linear-gradient(135deg, #5DC4B3, #3D8F83);">U</div><div><div id="ddName" class="font-semibold text-gray-900 text-sm">用户</div><div id="ddRole" class="text-xs text-gray-500">游客模式</div></div></div></div>
              <div class="py-1">
                <button class="user-dropdown-item" onclick="showToast('info','个人中心','功能开发中'); closeUserDD();"><i class="fas fa-user-circle"></i>个人中心</button>
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
              <p class="text-sm" style="color: rgba(255,255,255,0.6);">发现优质投资参与机会，追踪每一笔意向进展</p>
            </div>
            <div class="flex items-center gap-3">
              <button onclick="showToast('info','AI推荐','正在生成个性化推荐')" class="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2" style="background: rgba(255,255,255,0.12); color: white; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(8px);"><i class="fas fa-magic"></i>AI推荐</button>
              <button onclick="showNewDealModal()" class="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2" style="background: white; color: #0a2e2a; box-shadow: 0 4px 12px rgba(0,0,0,0.2);"><i class="fas fa-plus"></i>发起参与</button>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div class="stat-card animate-fade-in cursor-pointer" onclick="filterDeals('all')">
            <div class="flex items-center justify-between"><div><p class="stat-label">全部机会</p><p class="stat-value" id="statTotal">0</p></div><div class="icon-container icon-container-sm icon-gradient-primary"><i class="fas fa-briefcase text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-100 cursor-pointer" onclick="filterDeals('interested')">
            <div class="flex items-center justify-between"><div><p class="stat-label">已表达意向</p><p class="stat-value" id="statInterested">0</p></div><div class="icon-container icon-container-sm icon-gradient-warning"><i class="fas fa-hand-point-up text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-200 cursor-pointer" onclick="filterDeals('confirmed')">
            <div class="flex items-center justify-between"><div><p class="stat-label">已确认参与</p><p class="stat-value" id="statConfirmed">0</p></div><div class="icon-container icon-container-sm icon-gradient-success"><i class="fas fa-check-double text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-300 cursor-pointer">
            <div class="flex items-center justify-between"><div><p class="stat-label">总参与金额</p><p class="stat-value" id="statAmount">¥0</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #0D9488 0%, #3D8F83 100%); box-shadow: 0 4px 12px rgba(73, 168, 154, 0.3);"><i class="fas fa-yen-sign text-white text-sm"></i></div></div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-bold text-gray-800">投资机会</h2>
          <div class="flex items-center space-x-2">
            <div class="relative"><input type="text" id="dealSearch" placeholder="搜索项目名称…" class="search-input px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white w-48" oninput="renderDeals()"></div>
            <select class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" id="filterStatus" onchange="renderDeals()">
              <option value="all">全部状态</option>
              <option value="open">开放中</option>
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
              <div class="empty-state-icon mx-auto animate-float"><i class="fas fa-search-dollar"></i></div>
              <h3 class="text-xl font-bold text-gray-800 mb-2" style="letter-spacing:-0.02em;">发现您的第一个投资机会</h3>
              <p class="text-sm text-gray-500">让参与投资变得简单、透明、高效</p>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-6">
              <button onclick="showNewDealModal()" class="group text-left p-5 rounded-2xl border transition-all" style="background: rgba(255,255,255,0.9); border-color: rgba(0,0,0,0.06);" onmouseover="this.style.borderColor='rgba(93,196,179,0.3)';this.style.boxShadow='0 8px 32px rgba(93,196,179,0.08)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(0,0,0,0.06)';this.style.boxShadow='none';this.style.transform='none'">
                <div class="w-12 h-12 icon-container icon-container-lg icon-gradient-primary mb-4 group-hover:scale-105 transition-transform" style="border-radius:16px;"><i class="fas fa-plus text-white text-lg"></i></div>
                <h4 class="font-bold text-gray-800 mb-1 text-base">发起参与</h4>
                <p class="text-sm text-gray-500 leading-relaxed">创建新的投资参与意向，系统自动匹配优质项目</p>
              </button>
              <button onclick="loadDemoData()" class="group text-left p-5 rounded-2xl border transition-all" style="background: rgba(255,255,255,0.9); border-color: rgba(0,0,0,0.06);" onmouseover="this.style.borderColor='rgba(52,199,89,0.3)';this.style.boxShadow='0 8px 32px rgba(52,199,89,0.08)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(0,0,0,0.06)';this.style.boxShadow='none';this.style.transform='none'">
                <div class="w-12 h-12 icon-container icon-container-lg icon-gradient-success mb-4 group-hover:scale-105 transition-transform" style="border-radius:16px;"><i class="fas fa-database text-white text-lg"></i></div>
                <h4 class="font-bold text-gray-800 mb-1 text-base">加载演示数据</h4>
                <p class="text-sm text-gray-500 leading-relaxed">体验完整功能，查看模拟投资机会和参与流程</p>
              </button>
            </div>
            <div class="rounded-2xl p-5 border" style="background: rgba(255,255,255,0.8); border-color: rgba(0,0,0,0.04);">
              <h4 class="text-xs font-bold uppercase tracking-wider mb-4" style="color: #86868b;"><i class="fas fa-sparkles mr-1.5" style="color: #5DC4B3;"></i>平台核心能力</h4>
              <div class="grid grid-cols-4 gap-4">
                <div class="text-center"><div class="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2" style="background: linear-gradient(135deg, rgba(93,196,179,0.08), rgba(73,168,154,0.08));"><i class="fas fa-robot text-base" style="color: #5DC4B3;"></i></div><p class="font-medium text-xs text-gray-700">AI智能匹配</p><p class="text-xs text-gray-400 mt-0.5">精准推荐</p></div>
                <div class="text-center"><div class="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2" style="background: linear-gradient(135deg, rgba(73,168,154,0.08), rgba(50,173,230,0.06));"><i class="fas fa-shield-alt text-base" style="color: #49A89A;"></i></div><p class="font-medium text-xs text-gray-700">风控评审</p><p class="text-xs text-gray-400 mt-0.5">多维评估</p></div>
                <div class="text-center"><div class="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2" style="background: linear-gradient(135deg, rgba(50,173,230,0.08), rgba(93,196,179,0.06));"><i class="fas fa-chart-bar text-base" style="color: #32ade6;"></i></div><p class="font-medium text-xs text-gray-700">数据透视</p><p class="text-xs text-gray-400 mt-0.5">实时追踪</p></div>
                <div class="text-center"><div class="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2" style="background: linear-gradient(135deg, rgba(255,55,95,0.06), rgba(255,159,10,0.06));"><i class="fas fa-file-contract text-base" style="color: #ff375f;"></i></div><p class="font-medium text-xs text-gray-700">合约协同</p><p class="text-xs text-gray-400 mt-0.5">无缝衔接</p></div>
              </div>
            </div>
            <p class="mt-4 text-xs text-gray-400"><i class="fas fa-question-circle mr-1"></i>首次使用？<button onclick="showOnboarding()" class="text-teal-500 hover:text-teal-600 underline font-medium">查看新手引导</button></p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 2: Deal Detail ==================== -->
  <div id="pageDetail" class="page flex-col h-screen grid-bg">
    <nav class="px-4 py-2.5 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goToDashboard()" class="back-btn flex items-center px-2.5 py-1.5 text-gray-600 hover:text-teal-600 rounded-lg text-sm"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium">返回</span></button>
          <div class="border-l border-gray-200 pl-3">
            <div class="flex items-center space-x-2"><h1 class="font-bold text-gray-900 text-sm" id="detailTitle">项目名称</h1><span id="detailStatus" class="badge badge-warning">开放中</span></div>
            <p class="text-xs text-gray-500"><span id="detailIndustry">行业</span> · <span id="detailDate">日期</span></p>
          </div>
        </div>
        <div class="flex items-center space-x-1.5">
          <button onclick="showToast('info','分享','分享链接已复制')" class="tooltip p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 text-sm" data-tip="分享"><i class="fas fa-share-alt"></i></button>
          <button onclick="showToast('info','收藏','已添加到收藏夹')" class="tooltip p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 text-sm" data-tip="收藏"><i class="fas fa-bookmark"></i></button>
          <button onclick="showToast('info','AI分析','正在生成项目深度分析')" class="tooltip p-1.5 hover:bg-teal-100 rounded-lg text-teal-600 text-sm" data-tip="AI分析"><i class="fas fa-robot"></i></button>
          <div class="w-px h-6 bg-gray-200 mx-1"></div>
          <button onclick="expressIntent()" class="btn-primary text-xs py-1.5 px-4" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);"><i class="fas fa-hand-point-up mr-1"></i>我要参与</button>
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
      <!-- Right: Analysis -->
      <div class="w-3/5 flex flex-col bg-slate-50 overflow-y-auto">
        <div class="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
          <div class="flex items-center space-x-2"><span class="text-sm font-semibold text-gray-700"><i class="fas fa-chart-pie mr-1.5 text-teal-500"></i>投资分析</span></div>
          <div class="flex bg-gray-100 rounded-lg p-0.5">
            <button onclick="switchDetailView('overview')" id="btnOverview" class="px-2.5 py-1 rounded-md text-xs font-semibold bg-white shadow text-teal-600"><i class="fas fa-th-large mr-1"></i>概览</button>
            <button onclick="switchDetailView('financials')" id="btnFinancials" class="px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600"><i class="fas fa-calculator mr-1"></i>财务</button>
            <button onclick="switchDetailView('timeline')" id="btnTimeline" class="px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600"><i class="fas fa-stream mr-1"></i>时间线</button>
          </div>
        </div>
        <div class="flex-1 p-5" id="detailRight">
          <div class="text-center py-16 text-gray-400"><i class="fas fa-chart-area text-4xl mb-3 opacity-40"></i><p class="text-sm">选择一个项目查看详细分析</p></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Modal: New Deal ==================== -->
  <div id="newDealModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]">
    <div class="bg-white rounded-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in">
      <div class="p-6 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div class="flex items-center justify-between">
          <div><h2 class="text-xl font-bold text-gray-900"><i class="fas fa-plus-circle mr-2 text-teal-600"></i>发起参与</h2><p class="text-sm text-gray-500 mt-1">创建新的投资参与意向</p></div>
          <button onclick="hideNewDealModal()" class="p-2 hover:bg-white/50 rounded-lg"><i class="fas fa-times text-gray-500"></i></button>
        </div>
      </div>
      <div class="p-6 overflow-y-auto max-h-[60vh] space-y-4">
        <div><label class="block text-sm font-medium text-gray-700 mb-1">项目名称 <span class="text-red-500">*</span></label><input type="text" id="newDealName" placeholder="例如：XX品牌杭州店融资参与" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm font-medium text-gray-700 mb-1">行业</label><select id="newDealIndustry" class="w-full px-4 py-3 border border-gray-200 rounded-xl"><option value="餐饮">餐饮</option><option value="零售">零售</option><option value="演艺">演艺</option><option value="教育">教育</option><option value="健康">健康</option><option value="科技">科技</option></select></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">金额 (万元)</label><input type="number" id="newDealAmount" placeholder="500" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">备注</label><textarea id="newDealNote" rows="2" placeholder="项目背景、期望条件…" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm"></textarea></div>
      </div>
      <div class="p-6 border-t border-gray-100 flex justify-between items-center">
        <p class="text-xs text-gray-400"><i class="fas fa-shield-alt mr-1 text-emerald-500"></i>数据安全存储</p>
        <div class="flex space-x-3"><button onclick="hideNewDealModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">取消</button><button onclick="createDeal()" class="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium shadow-lg"><i class="fas fa-rocket mr-2"></i>提交意向</button></div>
      </div>
    </div>
  </div>

  <!-- ==================== Confirm Dialog ==================== -->
  <div id="confirmModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]">
    <div class="bg-white rounded-2xl max-w-sm w-full mx-4 overflow-hidden animate-scale-in">
      <div class="confirm-dialog">
        <div id="confirmIcon" class="confirm-icon warning"><i class="fas fa-exclamation-triangle"></i></div>
        <h3 id="confirmTitle" class="confirm-title">确认操作</h3>
        <p id="confirmMessage" class="confirm-message">确定要执行此操作吗？</p>
        <div class="confirm-actions"><button onclick="hideConfirm()" class="btn-secondary rounded-xl">取消</button><button id="confirmAction" onclick="hideConfirm()" class="btn-primary rounded-xl">确认</button></div>
      </div>
    </div>
  </div>

  <!-- ==================== AI Assistant FAB ==================== -->
  <div id="aiFab" class="ai-assistant-fab hidden" onclick="toggleAIChat()"><i class="fas fa-robot"></i></div>
  <div id="aiChat" class="ai-chat-window hidden">
    <div class="ai-chat-header"><div class="flex items-center space-x-2"><i class="fas fa-robot text-white"></i><span class="text-white font-semibold text-sm">Deal Connect AI 助手</span></div><button onclick="toggleAIChat()" class="text-white/80 hover:text-white"><i class="fas fa-times"></i></button></div>
    <div class="ai-chat-messages" id="aiMessages">
      <div class="ai-message assistant"><div class="ai-message-avatar"><i class="fas fa-robot"></i></div><div class="ai-message-content">您好！我是Deal Connect的AI助手。有关投资机会的问题都可以问我。</div></div>
    </div>
    <div class="ai-chat-input">
      <div class="flex items-center gap-2">
        <input type="text" id="aiInput" placeholder="输入问题…" class="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" onkeydown="if(event.key==='Enter')sendAIMsg()">
        <button onclick="sendAIMsg()" class="btn-primary px-3 py-2 rounded-xl text-sm"><i class="fas fa-paper-plane"></i></button>
      </div>
    </div>
  </div>

  <!-- ==================== JavaScript ==================== -->
  <script>
    // ==================== State ====================
    let currentUser = null;
    let dealsList = JSON.parse(localStorage.getItem('ec_deals') || '[]');
    let currentDeal = null;
    let obStep = 0;

    // ==================== Toast System ====================
    function initToastContainer() {
      if (!document.getElementById('toastContainer')) {
        const c = document.createElement('div');
        c.id = 'toastContainer';
        c.className = 'toast-container';
        document.body.appendChild(c);
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
      const toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.innerHTML = '<div class="toast-icon"><i class="' + (icons[type]||icons.info) + '"></i></div><div class="toast-body"><div class="toast-title">' + title + '</div>' + (message ? '<div class="toast-message">' + message + '</div>' : '') + '</div><button class="toast-close" onclick="this.parentElement.classList.add(\\'toast-exit\\'); setTimeout(() => this.parentElement.remove(), 300);"><i class="fas fa-times"></i></button><div class="toast-progress" style="animation-duration: ' + duration + 'ms;"></div>';
      container.appendChild(toast);
      setTimeout(() => { if (toast.parentElement) { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); } }, duration);
    }

    // ==================== Password Toggle ====================
    function togglePwdVis(id, btn) {
      const inp = document.getElementById(id);
      if (!inp) return;
      const icon = btn.querySelector('i');
      if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
      else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
    }

    // ==================== Page Switching ====================
    function switchPage(pageId) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const page = document.getElementById(pageId);
      if (page) page.classList.add('active');
      // Show AI fab on dashboard & detail
      const fab = document.getElementById('aiFab');
      if (fab) fab.classList.toggle('hidden', pageId === 'pageAuth');
    }

    // ==================== Auth Tab ====================
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

    // ==================== Auth Handlers ====================
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
      const role = document.querySelector('input[name="regRole"]:checked')?.value || 'both';
      if (!username || !email || !password) { showToast('warning', '请填写必填项'); return; }
      if (password.length < 6) { showToast('warning', '密码过短', '密码至少6位'); return; }
      try {
        const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, displayName, phone, role }) });
        const data = await res.json();
        if (data.success) { showToast('success', '注册成功', '欢迎加入参与通！'); switchAuthTab('login'); document.getElementById('loginUsername').value = username; }
        else { showToast('error', '注册失败', data.message); }
      } catch (e) { showToast('error', '网络错误'); }
    }

    function handleGuestLogin() {
      currentUser = { id: 'guest', username: 'guest', displayName: '游客', email: 'guest@demo.com', role: 'both' };
      loadDemoData();
      onLoginSuccess();
      showToast('info', '游客模式', '已加载 ' + dealsList.length + ' 个演示项目');
    }

    function onLoginSuccess() {
      const name = currentUser?.displayName || currentUser?.username || '用户';
      const initial = name.charAt(0).toUpperCase();
      document.getElementById('navAvatar').textContent = initial;
      document.getElementById('navName').textContent = name;
      document.getElementById('ddAvatar').textContent = initial;
      document.getElementById('ddName').textContent = name;
      document.getElementById('ddRole').textContent = { investor: '投资方', borrower: '融资方', both: '双角色' }[currentUser?.role] || '游客模式';
      document.getElementById('welcomeText').textContent = '欢迎回来，' + name;
      switchPage('pageDashboard');
      renderDeals();
      showToast('success', '登录成功', '欢迎回来，' + name);
      if (!localStorage.getItem('ec_onboarded')) { setTimeout(showOnboarding, 800); }
    }

    function handleLogout() {
      currentUser = null;
      switchPage('pageAuth');
      showToast('info', '已退出', '您已安全退出账号');
    }

    // ==================== User Dropdown ====================
    function toggleUserDD(e) { e.stopPropagation(); document.getElementById('userDropdown').classList.toggle('show'); }
    function closeUserDD() { document.getElementById('userDropdown').classList.remove('show'); }
    document.addEventListener('click', (e) => { if (!e.target.closest('#navUserBtn') && !e.target.closest('#userDropdown')) closeUserDD(); });

    // ==================== Demo Data ====================
    function loadDemoData() {
      const industries = ['餐饮','零售','演艺','教育','健康','科技'];
      const statuses = ['open','open','open','interested','interested','confirmed','confirmed','closed'];
      const names = ['星巴克杭州新店','瑞幸深圳旗舰店','周杰伦2026巡演','新东方AI学堂','美年健康体检中心','字节跳动AI Lab','海底捞成都总店','泡泡玛特北京旗舰'];
      dealsList = names.map((name, i) => ({
        id: 'D_' + (1000 + i),
        name,
        industry: industries[i % industries.length],
        amount: (300 + Math.floor(Math.random() * 700)) * 10000,
        aiScore: (7.5 + Math.random() * 2.5).toFixed(1),
        status: statuses[i],
        revenueShare: (8 + Math.floor(Math.random() * 12)) + '%',
        period: (24 + Math.floor(Math.random() * 36)) + '个月',
        location: ['杭州','深圳','全国','北京','上海','北京','成都','北京'][i],
        createdAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().slice(0, 10),
        description: '这是一个优质的' + industries[i % industries.length] + '行业投资机会，经过严格的风控评审。'
      }));
      localStorage.setItem('ec_deals', JSON.stringify(dealsList));
    }

    // ==================== Render Deals ====================
    function renderDeals() {
      const grid = document.getElementById('dealGrid');
      const empty = document.getElementById('emptyState');
      const searchVal = (document.getElementById('dealSearch')?.value || '').toLowerCase();
      const filterVal = document.getElementById('filterStatus')?.value || 'all';
      let filtered = dealsList.filter(d => {
        if (searchVal && !d.name.toLowerCase().includes(searchVal)) return false;
        if (filterVal !== 'all' && d.status !== filterVal) return false;
        return true;
      });
      // Update stats
      document.getElementById('statTotal').textContent = dealsList.length;
      document.getElementById('statInterested').textContent = dealsList.filter(d => d.status === 'interested').length;
      document.getElementById('statConfirmed').textContent = dealsList.filter(d => d.status === 'confirmed').length;
      const totalAmt = dealsList.filter(d => d.status === 'confirmed').reduce((s, d) => s + d.amount, 0);
      document.getElementById('statAmount').textContent = '¥' + (totalAmt >= 10000 ? (totalAmt / 10000).toFixed(0) + '万' : totalAmt.toLocaleString());

      if (filtered.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
      empty.classList.add('hidden');

      const statusMap = { open: { label: '开放中', cls: 'badge-warning', icon: 'fa-clock' }, interested: { label: '已意向', cls: 'badge-primary', icon: 'fa-hand-point-up' }, confirmed: { label: '已确认', cls: 'badge-success', icon: 'fa-check-double' }, closed: { label: '已关闭', cls: 'badge-danger', icon: 'fa-lock' } };

      grid.innerHTML = filtered.map(d => {
        const st = statusMap[d.status] || statusMap.open;
        return '<div class="project-card group cursor-pointer animate-fade-in" onclick="openDetail(\\'' + d.id + '\\')">' +
          '<div class="flex items-center justify-between mb-3"><div class="flex items-center space-x-2"><div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, rgba(93,196,179,0.12), rgba(73,168,154,0.12));"><i class="fas fa-briefcase" style="color: #5DC4B3;"></i></div><div><h3 class="font-bold text-gray-900 text-sm group-hover:text-teal-600 transition-colors">' + d.name + '</h3><p class="text-xs text-gray-500">' + d.industry + ' · ' + d.location + '</p></div></div><span class="badge ' + st.cls + '"><i class="fas ' + st.icon + ' mr-1"></i>' + st.label + '</span></div>' +
          '<p class="text-xs text-gray-500 mb-3 line-clamp-2">' + (d.description || '') + '</p>' +
          '<div class="flex items-center justify-between text-xs"><div class="flex items-center space-x-3"><span class="text-gray-500"><i class="fas fa-yen-sign mr-1 text-teal-500"></i>' + (d.amount/10000).toFixed(0) + '万</span><span class="text-gray-500"><i class="fas fa-percentage mr-1 text-amber-500"></i>' + d.revenueShare + '</span><span class="text-gray-500"><i class="fas fa-calendar mr-1 text-cyan-500"></i>' + d.period + '</span></div><div class="flex items-center"><i class="fas fa-star text-amber-400 mr-1"></i><span class="font-bold text-gray-700">' + d.aiScore + '</span></div></div>' +
          '<div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between"><span class="text-xs text-gray-400">' + d.createdAt + '</span><button onclick="event.stopPropagation(); toggleIntent(\\'' + d.id + '\\')" class="text-xs font-medium ' + (d.status === 'interested' || d.status === 'confirmed' ? 'text-teal-600' : 'text-gray-400 hover:text-teal-600') + ' transition-colors"><i class="fas ' + (d.status === 'interested' || d.status === 'confirmed' ? 'fa-heart' : 'fa-heart') + ' mr-1"></i>' + (d.status === 'interested' || d.status === 'confirmed' ? '已关注' : '关注') + '</button></div></div>';
      }).join('');
    }

    function filterDeals(status) {
      const sel = document.getElementById('filterStatus');
      if (sel) { sel.value = status === 'all' ? 'all' : status; renderDeals(); }
    }

    function toggleIntent(id) {
      const deal = dealsList.find(d => d.id === id);
      if (!deal) return;
      if (deal.status === 'open') { deal.status = 'interested'; showToast('success', '已表达意向', deal.name); }
      else if (deal.status === 'interested') { deal.status = 'open'; showToast('info', '已取消意向', deal.name); }
      localStorage.setItem('ec_deals', JSON.stringify(dealsList));
      renderDeals();
    }

    // ==================== Detail Page ====================
    function openDetail(id) {
      currentDeal = dealsList.find(d => d.id === id);
      if (!currentDeal) return;
      document.getElementById('detailTitle').textContent = currentDeal.name;
      const statusMap = { open: { label: '开放中', cls: 'badge-warning' }, interested: { label: '已意向', cls: 'badge-primary' }, confirmed: { label: '已确认', cls: 'badge-success' }, closed: { label: '已关闭', cls: 'badge-danger' } };
      const st = statusMap[currentDeal.status] || statusMap.open;
      document.getElementById('detailStatus').className = 'badge ' + st.cls;
      document.getElementById('detailStatus').textContent = st.label;
      document.getElementById('detailIndustry').textContent = currentDeal.industry;
      document.getElementById('detailDate').textContent = currentDeal.createdAt;

      // Left panel
      document.getElementById('detailLeft').innerHTML =
        '<div class="mb-6"><div class="flex items-center space-x-3 mb-4"><div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background: linear-gradient(135deg, rgba(93,196,179,0.15), rgba(73,168,154,0.15));"><i class="fas fa-briefcase text-2xl" style="color: #5DC4B3;"></i></div><div><h2 class="text-lg font-bold text-gray-900">' + currentDeal.name + '</h2><p class="text-sm text-gray-500">' + currentDeal.industry + ' · ' + currentDeal.location + '</p></div></div>' +
        '<p class="text-sm text-gray-600 leading-relaxed mb-4">' + currentDeal.description + '</p></div>' +
        '<div class="grid grid-cols-2 gap-3 mb-6">' +
        '<div class="p-3 bg-teal-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">投资金额</p><p class="text-lg font-bold text-teal-600">¥' + (currentDeal.amount/10000).toFixed(0) + '万</p></div>' +
        '<div class="p-3 bg-amber-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">分成比例</p><p class="text-lg font-bold text-amber-600">' + currentDeal.revenueShare + '</p></div>' +
        '<div class="p-3 bg-cyan-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">分成期限</p><p class="text-lg font-bold text-cyan-600">' + currentDeal.period + '</p></div>' +
        '<div class="p-3 bg-emerald-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">AI评分</p><p class="text-lg font-bold text-emerald-600">' + currentDeal.aiScore + '<span class="text-xs text-gray-400">/10</span></p></div></div>' +
        '<div class="space-y-3"><h3 class="text-sm font-semibold text-gray-700 mb-2"><i class="fas fa-list-check mr-1.5 text-teal-500"></i>关键条款</h3>' +
        '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between mb-1"><span class="text-xs font-medium text-gray-600">最低投资额</span><span class="text-xs font-bold text-gray-800">¥100万</span></div></div>' +
        '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between mb-1"><span class="text-xs font-medium text-gray-600">预期年化</span><span class="text-xs font-bold text-emerald-600">12-18%</span></div></div>' +
        '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between mb-1"><span class="text-xs font-medium text-gray-600">退出机制</span><span class="text-xs font-bold text-gray-800">到期自动退出</span></div></div></div>';

      // Right panel
      document.getElementById('detailRight').innerHTML =
        '<div class="space-y-5">' +
        '<div class="bg-white rounded-2xl p-5 border border-gray-100"><h3 class="text-sm font-bold text-gray-800 mb-4"><i class="fas fa-chart-line mr-1.5 text-teal-500"></i>收入预测</h3><div class="h-40 flex items-end justify-around gap-2">' +
        [65,78,82,70,88,92,85,90,95,88,92,98].map((v,i) => '<div class="flex flex-col items-center flex-1"><div class="w-full rounded-t-md transition-all" style="height:' + v + '%; background: linear-gradient(180deg, #5DC4B3 0%, #49A89A 100%); opacity:' + (0.5+i*0.04) + ';"></div><span class="text-xs text-gray-400 mt-1">' + (i+1) + '月</span></div>').join('') +
        '</div></div>' +
        '<div class="grid grid-cols-2 gap-4">' +
        '<div class="bg-white rounded-2xl p-5 border border-gray-100"><h3 class="text-sm font-bold text-gray-800 mb-3"><i class="fas fa-shield-alt mr-1.5 text-emerald-500"></i>风控评级</h3><div class="flex items-center justify-center"><div class="w-20 h-20 rounded-full border-4 border-emerald-400 flex items-center justify-center"><span class="text-2xl font-bold text-emerald-600">A+</span></div></div><p class="text-xs text-gray-500 text-center mt-2">综合风险等级较低</p></div>' +
        '<div class="bg-white rounded-2xl p-5 border border-gray-100"><h3 class="text-sm font-bold text-gray-800 mb-3"><i class="fas fa-users mr-1.5 text-cyan-500"></i>参与者</h3><div class="space-y-2"><div class="flex items-center space-x-2"><div class="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-600">A</div><div><p class="text-xs font-medium text-gray-700">Alpha Capital</p><p class="text-xs text-gray-400">主投方</p></div></div><div class="flex items-center space-x-2"><div class="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-600">B</div><div><p class="text-xs font-medium text-gray-700">Beta Ventures</p><p class="text-xs text-gray-400">跟投方</p></div></div></div></div></div>' +
        '<div class="bg-white rounded-2xl p-5 border border-gray-100"><h3 class="text-sm font-bold text-gray-800 mb-4"><i class="fas fa-stream mr-1.5 text-amber-500"></i>项目时间线</h3><div class="space-y-4">' +
        [{ icon: 'fa-flag', color: 'teal', title: '项目创建', desc: currentDeal.createdAt }, { icon: 'fa-search', color: 'cyan', title: '评审通过', desc: '风控评分 ' + currentDeal.aiScore }, { icon: 'fa-bullhorn', color: 'amber', title: '开放认购', desc: '目标金额 ¥' + (currentDeal.amount/10000).toFixed(0) + '万' }, { icon: 'fa-handshake', color: 'emerald', title: '确认参与', desc: '预计收益 12-18%' }].map(t => '<div class="flex items-start space-x-3"><div class="w-8 h-8 rounded-lg bg-' + t.color + '-100 flex items-center justify-center flex-shrink-0"><i class="fas ' + t.icon + ' text-' + t.color + '-600 text-xs"></i></div><div><p class="text-sm font-medium text-gray-700">' + t.title + '</p><p class="text-xs text-gray-400">' + t.desc + '</p></div></div>').join('') +
        '</div></div></div>';

      switchPage('pageDetail');
    }

    function goToDashboard() { switchPage('pageDashboard'); renderDeals(); }

    function expressIntent() {
      if (!currentDeal) return;
      if (currentDeal.status === 'open') { currentDeal.status = 'interested'; }
      else if (currentDeal.status === 'interested') { currentDeal.status = 'confirmed'; }
      localStorage.setItem('ec_deals', JSON.stringify(dealsList));
      showToast('success', '参与状态已更新', currentDeal.name);
      openDetail(currentDeal.id);
    }

    function switchDetailView(view) {
      ['overview', 'financials', 'timeline'].forEach(v => {
        const btn = document.getElementById('btn' + v.charAt(0).toUpperCase() + v.slice(1));
        if (btn) { btn.className = v === view ? 'px-2.5 py-1 rounded-md text-xs font-semibold bg-white shadow text-teal-600' : 'px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600'; }
      });
    }

    // ==================== Modals ====================
    function showNewDealModal() { document.getElementById('newDealModal').classList.remove('hidden'); }
    function hideNewDealModal() { document.getElementById('newDealModal').classList.add('hidden'); }
    function showConfirm(title, msg, cb) {
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = msg;
      document.getElementById('confirmAction').onclick = () => { hideConfirm(); cb && cb(); };
      document.getElementById('confirmModal').classList.remove('hidden');
    }
    function hideConfirm() { document.getElementById('confirmModal').classList.add('hidden'); }

    function createDeal() {
      const name = document.getElementById('newDealName').value.trim();
      if (!name) { showToast('warning', '请输入项目名称'); return; }
      const deal = {
        id: 'D_' + Date.now(),
        name,
        industry: document.getElementById('newDealIndustry').value,
        amount: (parseFloat(document.getElementById('newDealAmount').value) || 500) * 10000,
        aiScore: (7 + Math.random() * 3).toFixed(1),
        status: 'open',
        revenueShare: (8 + Math.floor(Math.random() * 12)) + '%',
        period: (24 + Math.floor(Math.random() * 36)) + '个月',
        location: '全国',
        createdAt: new Date().toISOString().slice(0, 10),
        description: document.getElementById('newDealNote').value || '新创建的投资参与项目。'
      };
      dealsList.unshift(deal);
      localStorage.setItem('ec_deals', JSON.stringify(dealsList));
      hideNewDealModal();
      renderDeals();
      showToast('success', '意向已创建', deal.name);
      document.getElementById('newDealName').value = '';
      document.getElementById('newDealAmount').value = '';
      document.getElementById('newDealNote').value = '';
    }

    // ==================== Onboarding ====================
    function showOnboarding() { document.getElementById('onboardingModal').classList.remove('hidden'); obStep = 0; updateOBStep(); }
    function closeOnboarding() { document.getElementById('onboardingModal').classList.add('hidden'); localStorage.setItem('ec_onboarded', '1'); }
    function updateOBStep() {
      const icons = ['fa-handshake', 'fa-binoculars', 'fa-hand-pointer', 'fa-chart-pie'];
      document.getElementById('obIcon').className = 'fas ' + icons[obStep] + ' text-white text-4xl';
      for (let i = 0; i < 4; i++) {
        const el = document.getElementById('obStep' + i);
        if (el) el.style.display = i === obStep ? 'block' : 'none';
      }
      document.querySelectorAll('.step-dot').forEach((d, i) => d.classList.toggle('active', i === obStep));
      document.getElementById('obPrev').classList.toggle('hidden', obStep === 0);
      document.getElementById('obNext').innerHTML = obStep === 3 ? '开始使用<i class="fas fa-check ml-2"></i>' : '下一步<i class="fas fa-arrow-right ml-2"></i>';
    }
    function obNext() { if (obStep < 3) { obStep++; updateOBStep(); } else { closeOnboarding(); } }
    function obPrev() { if (obStep > 0) { obStep--; updateOBStep(); } }
    function goToOBStep(s) { obStep = s; updateOBStep(); }

    // ==================== AI Chat ====================
    function toggleAIChat() {
      const chat = document.getElementById('aiChat');
      chat.classList.toggle('hidden');
    }
    function sendAIMsg() {
      const input = document.getElementById('aiInput');
      const msg = input.value.trim();
      if (!msg) return;
      const msgs = document.getElementById('aiMessages');
      msgs.innerHTML += '<div class="ai-message user"><div class="ai-message-avatar"><i class="fas fa-user"></i></div><div class="ai-message-content">' + msg + '</div></div>';
      input.value = '';
      setTimeout(() => {
        const responses = [
          '根据您的偏好，我推荐关注餐饮和零售行业的项目，当前有3个评分8.0以上的机会。',
          '这个项目的分成比例在行业中属于中等水平，建议关注实际月均营收数据。',
          '目前平台共有 ' + dealsList.length + ' 个活跃机会，其中 ' + dealsList.filter(d=>d.status==='open').length + ' 个正在开放认购。',
          '建议分散投资，不要将超过30%的资金集中在单一行业。'
        ];
        msgs.innerHTML += '<div class="ai-message assistant"><div class="ai-message-avatar"><i class="fas fa-robot"></i></div><div class="ai-message-content">' + responses[Math.floor(Math.random() * responses.length)] + '</div></div>';
        msgs.scrollTop = msgs.scrollHeight;
      }, 800);
    }

    // ==================== Init ====================
    function initApp() {
      const bar = document.getElementById('loadingBar');
      const status = document.getElementById('loadingStatus');
      let progress = 0;
      const steps = [
        { p: 30, t: '加载设计系统...' },
        { p: 55, t: '初始化组件...' },
        { p: 80, t: '连接数据服务...' },
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
        bar.style.width = steps[i].p + '%';
        status.textContent = steps[i].t;
        i++;
      }, 400);
    }

    // Start
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
