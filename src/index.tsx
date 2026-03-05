/**
 * ===================================================================
 * Deal Connect — Full-Stack SPA (V2 — Sieve-Driven Board)
 * ===================================================================
 * Core Logic:
 *   Originate → Generates all investment opportunities
 *   Assess    → Provides multiple AI sieve models
 *   Deal      → Investor board: filtered display + deal participation
 *
 * Deal Connect user workflow:
 *   1. Select/switch Assess sieves (or none = view all)
 *   2. Browse sieve-filtered opportunities (from Originate)
 *   3. Express interest in opportunities
 *   4. Track participation progress
 *
 * Brand: DEAL CONNECT / Deal Connect
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
  if (!username || !email || !password) return c.json({ success: false, message: 'Username, email, and password are required' }, 400)
  if (users.has(username) || [...users.values()].find(u => u.email === email)) return c.json({ success: false, message: 'Username or email already registered' }, 409)
  const user = { id: 'U_' + Date.now(), username, email, password, displayName: displayName || username, phone, role: role || 'investor', createdAt: new Date().toISOString() }
  users.set(username, user)
  return c.json({ success: true, user: { ...user, password: undefined }, message: 'Registration successful' })
})

app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json()
  if (!username || !password) return c.json({ success: false, message: 'Please enter username and password' }, 400)
  const user = users.get(username) || [...users.values()].find(u => u.email === username)
  if (!user || user.password !== password) return c.json({ success: false, message: 'Invalid username or password' }, 401)
  return c.json({ success: true, user: { ...user, password: undefined }, message: 'Login successful' })
})

app.post('/api/auth/logout', (c) => c.json({ success: true, message: 'Logged out successfully' }))
app.get('/api/auth/me', (c) => c.json({ success: true, user: null }))
app.get('/api/deals', (c) => c.json({ success: true, deals: [] }))

/* ============================
   AI Portfolio Architect API
   ============================ */

// System prompt for AI portfolio architect agent
const AI_SYSTEM_PROMPT = `你是 Deal Connect（参与通）平台的**AI投资组合顾问**。你是一位经验丰富、善于倾听的投资顾问，擅长从客户的只言片语中精准捕捉投资偏好，并给出专业的定制化建议。

## 你的角色定位
- 像一位资深投资顾问那样跟客户对话——温和、专业、有洞察力
- 仔细分析客户说的每一句话，从中提取投资偏好信号
- 如果信息不足，**主动追问**而非用默认值敷衍
- 每次给出配置时，要**解释你的推理逻辑**，让客户理解为什么这样配

## 对话模式（mode字段控制）
你根据不同场景输出不同结构：

### mode = "analyze"（首次分析 / 用户输入新需求）
从用户自然语言中提取投资偏好，生成配置建议。

### mode = "followup"（追问补全）
当你认为某些关键维度缺失时，主动追问获取信息，而非使用默认值。

### mode = "adjust"（调整优化）
用户在已有配置基础上微调，只修改提到的维度。

### mode = "explain"（组合解说）
对已生成的组合进行专业解读，解释为什么选了这些合约。

## 平台可用行业
F&B (餐饮美食), Technology (科技创新), Healthcare (医疗健康), Retail (零售消费), Education (教育培训), Entertainment (演艺娱乐)

## 配置参数
- style: "conservative" | "aggressive" | "balanced" | "sector"
- risk: "low" | "medium" | "high"  
- returnTarget: "low" (7-10%) | "medium" (10-14%) | "high" (14%+)
- industries: 行业代码数组 或 ["all"]
- period: "short" (≤24个月) | "medium" (24-30个月) | "long" (≥30个月)
- budget: 10 (¥5k-20k) | 35 (¥20k-50k) | 60 (¥50k+)

## 输出格式
你必须返回一个扁平JSON对象。analysis字段必须是纯文本字符串。

### 当 mode = "analyze" 或 "adjust" 时：
{"mode":"analyze","config":{"style":"balanced","risk":"medium","returnTarget":"medium","industries":["Technology","Healthcare"],"period":"medium","budget":35},"analysis":"你的分析文本","logic":["推理步骤1","推理步骤2","推理步骤3"],"confidence":85,"followUp":"可选的追问","missingDims":[]}

### 当 mode = "followup" 时（缺失维度较多，需要追问）：
{"mode":"followup","partialConfig":{"style":"balanced","risk":null,"returnTarget":null,"industries":["Technology"],"period":null,"budget":null},"analysis":"我理解您看好科技板块。为了给您定制最合适的组合，我还需要了解几个重要信息：","questions":["您的风险承受能力如何？能接受波动大一些但收益更高，还是更偏好稳定？","您打算投资多久？短期（2年内）还是中长期？","预算大概在什么范围？"],"missingDims":["risk","period","budget"],"confidence":40}

### 当 mode = "explain" 时（组合解说）：
{"mode":"explain","analysis":"对组合的专业解读文本","highlights":["亮点1","亮点2","亮点3"],"risks":["风险提示1","风险提示2"],"suggestion":"优化建议"}

## 核心规则
1. **用户语言优先**：用户说中文你就回中文，说英文就回英文
2. **不要用默认值敷衍**：如果用户只说了"收益高"但没提风险、期限、预算，置信度应该很低（<60），并主动追问
3. **主动追问的触发条件**：
   - 缺少3个及以上关键维度（style、risk、returnTarget、period、budget中的3个以上全无线索）→ mode="followup"
   - 缺少1-2个维度时→ mode="analyze"，为缺失维度选择合理默认值，并在 followUp 中简要说明
   - 所有维度都能推断时→ mode="analyze" 且 confidence 较高
   - **重要**：如果用户提供了3个以上维度的信息，即使还有1-2个维度不明确，也应该用 mode="analyze" 并给出合理默认值
4. **追问要具体且有选项感**：不要问"你的预算是多少"，而是"您的预算大概是5千到2万的轻投入，还是2万到5万的中等配置，或是5万以上的大额配置？"
5. **调整时保留已有配置**：用户说"风险再低一点"时，只改 risk，其他全部保留
6. **解释你的逻辑**：logic数组要清晰说明每一步推理，让用户理解你的思路
7. analysis简洁有力（中文200字内，英文300字内）
8. logic数组3-4项，每项80字符内
9. followUp在100字符内
10. questions数组（followup模式）2-3项，每项引导性强`;

// System prompt for portfolio explanation
const AI_EXPLAIN_PROMPT = `你是Deal Connect平台的AI投资组合分析师。请根据提供的组合数据，给出专业的投资解读。

## 你的任务
分析已构建的投资组合，解释选择逻辑，指出亮点和风险。

## 输出格式
返回JSON：{"mode":"explain","analysis":"总体评价","highlights":["亮点1","亮点2","亮点3"],"risks":["风险1","风险2"],"suggestion":"优化建议"}

## 规则
1. 用与用户相同的语言
2. analysis简明扼要（150字内）
3. highlights 2-4项，每项说清楚为什么是亮点
4. risks 1-3项，真实有价值的风险提示
5. suggestion给出一个具体可操作的优化方向`;

app.post('/api/ai/chat', async (c) => {
  try {
    const { messages, currentConfig, lang, mode, portfolioSummary, platformStats } = await c.req.json();

    // Get API credentials from environment
    const apiKey = c.env?.OPENAI_API_KEY || '';
    const baseUrl = c.env?.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1';

    if (!apiKey) {
      return c.json({ success: false, error: 'AI service not configured' }, 500);
    }

    // Choose system prompt based on mode
    const systemPrompt = mode === 'explain' ? AI_EXPLAIN_PROMPT : AI_SYSTEM_PROMPT;

    // Build messages array for LLM
    const llmMessages = [
      { role: 'system', content: systemPrompt },
    ];

    // Add platform context if available
    if (platformStats) {
      llmMessages.push({
        role: 'system',
        content: '平台数据概况: ' + JSON.stringify(platformStats)
      });
    }

    // Add context about current config if adjusting
    if (currentConfig) {
      llmMessages.push({
        role: 'system',
        content: '当前组合配置（用户正在调整中，只修改用户提到的维度）: ' + JSON.stringify(currentConfig)
      });
    }

    // Add portfolio summary for explanation mode
    if (mode === 'explain' && portfolioSummary) {
      llmMessages.push({
        role: 'system',
        content: '当前已生成的组合摘要: ' + JSON.stringify(portfolioSummary)
      });
    }

    // Add language context
    llmMessages.push({
      role: 'system',
      content: 'User language: ' + (lang || 'zh') + '. 用相同语言回复。'
    });

    // Add conversation history (last 12 messages max for better context)
    const recentMessages = (messages || []).slice(-12);
    recentMessages.forEach((msg) => {
      llmMessages.push({ role: msg.role, content: msg.content });
    });

    // Call LLM API
    const response = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: llmMessages,
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('LLM API error:', response.status, errText);
      return c.json({ success: false, error: 'AI service error: ' + response.status }, 500);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      try {
        let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (e2) {
        parsed = {
          mode: mode || 'analyze',
          config: { style: 'balanced', risk: 'medium', returnTarget: 'medium', industries: ['all'], period: 'medium', budget: 35 },
          analysis: content,
          logic: [],
          confidence: 50,
          followUp: '',
        };
      }
    }

    // Post-process: if analysis contains a nested JSON with better config, extract it
    if (parsed.analysis && typeof parsed.analysis === 'string') {
      try {
        const nestedJson = JSON.parse(parsed.analysis);
        if (nestedJson.config || nestedJson.mode) {
          if (nestedJson.config) parsed.config = nestedJson.config;
          if (nestedJson.analysis) parsed.analysis = nestedJson.analysis;
          if (nestedJson.logic) parsed.logic = nestedJson.logic;
          if (nestedJson.confidence) parsed.confidence = nestedJson.confidence;
          if (nestedJson.followUp) parsed.followUp = nestedJson.followUp;
          if (nestedJson.mode) parsed.mode = nestedJson.mode;
          if (nestedJson.questions) parsed.questions = nestedJson.questions;
          if (nestedJson.missingDims) parsed.missingDims = nestedJson.missingDims;
          if (nestedJson.partialConfig) parsed.partialConfig = nestedJson.partialConfig;
          if (nestedJson.highlights) parsed.highlights = nestedJson.highlights;
          if (nestedJson.risks) parsed.risks = nestedJson.risks;
          if (nestedJson.suggestion) parsed.suggestion = nestedJson.suggestion;
        }
      } catch (ignored) {
        // analysis is plain text, that's fine
      }
    }

    // Ensure required mode field
    parsed.mode = parsed.mode || mode || 'analyze';

    // For analyze/adjust mode, ensure config has all required fields
    if (parsed.mode === 'analyze' || parsed.mode === 'adjust') {
      if (!parsed.config) parsed.config = parsed.partialConfig || {};
      parsed.config.style = parsed.config.style || 'balanced';
      parsed.config.risk = parsed.config.risk || 'medium';
      parsed.config.returnTarget = parsed.config.returnTarget || 'medium';
      parsed.config.industries = parsed.config.industries || ['all'];
      parsed.config.period = parsed.config.period || 'medium';
      parsed.config.budget = parsed.config.budget || 35;
    }

    // For followup mode, ensure partialConfig exists
    if (parsed.mode === 'followup') {
      parsed.partialConfig = parsed.partialConfig || parsed.config || {};
      parsed.questions = parsed.questions || [];
      parsed.missingDims = parsed.missingDims || [];
    }

    return c.json({ success: true, data: parsed });

  } catch (err) {
    console.error('AI chat error:', err);
    return c.json({ success: false, error: 'Internal error: ' + (err.message || err) }, 500);
  }
})

// Streaming AI chat endpoint (SSE)
app.post('/api/ai/chat/stream', async (c) => {
  try {
    const { messages, currentConfig, lang, mode, portfolioSummary, platformStats } = await c.req.json();

    const apiKey = c.env?.OPENAI_API_KEY || '';
    const baseUrl = c.env?.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1';

    if (!apiKey) {
      return c.json({ success: false, error: 'AI service not configured' }, 500);
    }

    const systemPrompt = mode === 'explain' ? AI_EXPLAIN_PROMPT : AI_SYSTEM_PROMPT;

    const llmMessages = [{ role: 'system', content: systemPrompt }];

    if (platformStats) {
      llmMessages.push({ role: 'system', content: '平台数据概况: ' + JSON.stringify(platformStats) });
    }
    if (currentConfig) {
      llmMessages.push({ role: 'system', content: '当前组合配置: ' + JSON.stringify(currentConfig) });
    }
    if (mode === 'explain' && portfolioSummary) {
      llmMessages.push({ role: 'system', content: '组合摘要: ' + JSON.stringify(portfolioSummary) });
    }
    llmMessages.push({ role: 'system', content: 'User language: ' + (lang || 'zh') + '. 用相同语言回复。' });

    const recentMessages = (messages || []).slice(-12);
    recentMessages.forEach((msg) => {
      llmMessages.push({ role: msg.role, content: msg.content });
    });

    // Call LLM API with streaming
    const response = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: llmMessages,
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return c.json({ success: false, error: 'AI service error: ' + response.status }, 500);
    }

    // Forward the SSE stream
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('AI stream error:', err);
    return c.json({ success: false, error: 'Internal error: ' + (err.message || err) }, 500);
  }
})

// AI portfolio explanation endpoint
app.post('/api/ai/explain', async (c) => {
  try {
    const { portfolioSummary, userConfig, lang } = await c.req.json();

    const apiKey = c.env?.OPENAI_API_KEY || '';
    const baseUrl = c.env?.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1';

    if (!apiKey) {
      return c.json({ success: false, error: 'AI service not configured' }, 500);
    }

    const llmMessages = [
      { role: 'system', content: AI_EXPLAIN_PROMPT + '\n\nIMPORTANT: Return ONLY a JSON object. Do NOT wrap JSON inside other JSON. The analysis field must be a plain text string, NOT a JSON string. Example:\n{"mode":"explain","analysis":"这个组合整体表现良好...","highlights":["亮点1","亮点2"],"risks":["风险1"],"suggestion":"建议文本"}' },
      { role: 'system', content: 'User language: ' + (lang || 'zh') },
      { role: 'user', content: 'Analyze this portfolio:\nUser config: ' + JSON.stringify(userConfig) + '\nPortfolio data: ' + JSON.stringify(portfolioSummary) }
    ];

    const response = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model: 'gpt-5-mini', messages: llmMessages, temperature: 0.3, max_tokens: 2048 }),
    });

    if (!response.ok) {
      return c.json({ success: false, error: 'AI service error' }, 500);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      try {
        let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (e2) {
        // Try to extract the largest JSON object from the text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch (e3) {
            parsed = { mode: 'explain', analysis: content, highlights: [], risks: [], suggestion: '' };
          }
        } else {
          parsed = { mode: 'explain', analysis: content, highlights: [], risks: [], suggestion: '' };
        }
      }
    }

    // Deep extraction: if analysis contains nested JSON, extract the inner fields
    parsed.mode = 'explain';
    function extractFromAnalysis(obj) {
      if (obj.analysis && typeof obj.analysis === 'string') {
        try {
          const nested = JSON.parse(obj.analysis);
          if (nested && typeof nested === 'object') {
            if (nested.analysis && typeof nested.analysis === 'string' && !nested.analysis.startsWith('{')) {
              obj.analysis = nested.analysis;
            }
            if (nested.highlights && nested.highlights.length > 0) obj.highlights = nested.highlights;
            if (nested.risks && nested.risks.length > 0) obj.risks = nested.risks;
            if (nested.suggestion) obj.suggestion = nested.suggestion;
            // Recursively check if the extracted analysis is also JSON
            extractFromAnalysis(obj);
          }
        } catch (ignored) {}
      }
    }
    extractFromAnalysis(parsed);

    // If analysis is still a JSON string, just use it as text
    if (parsed.analysis && typeof parsed.analysis === 'string' && parsed.analysis.startsWith('{')) {
      try {
        const obj = JSON.parse(parsed.analysis);
        parsed.analysis = obj.analysis || '组合已构建，请查看右侧面板了解详情。';
        if (obj.highlights) parsed.highlights = obj.highlights;
        if (obj.risks) parsed.risks = obj.risks;
        if (obj.suggestion) parsed.suggestion = obj.suggestion;
      } catch(e) {
        parsed.analysis = '组合已构建，请查看右侧面板了解详情。';
      }
    }

    parsed.analysis = parsed.analysis || '';
    parsed.highlights = parsed.highlights || [];
    parsed.risks = parsed.risks || [];
    parsed.suggestion = parsed.suggestion || '';

    return c.json({ success: true, data: parsed });
  } catch (err) {
    return c.json({ success: false, error: 'Internal error: ' + (err.message || err) }, 500);
  }
})

/* ============================
   Main HTML Page (SPA)
   ============================ */
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Deal Connect</title>
  <meta name="description" content="Deal Connect — Intelligent opportunity board for investors. AI sieve-powered matching from Originate projects.">
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.5; background: #0B1E1C; color: #E8F5F3; -webkit-font-smoothing: antialiased; letter-spacing: -0.01em; }
    .hidden { display: none !important; }
    .page { display: none; }

    /* ===== Loading Screen ===== */
    #app-loading {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: linear-gradient(145deg, #0B1E1C 0%, #0F2E2B 50%, #0B1E1C 100%);
      transition: opacity 0.5s ease, visibility 0.5s ease;
    }
    #app-loading.fade-out {
      opacity: 0; visibility: hidden; pointer-events: none;
    }
    .loading-text {
      font-size: 28px; color: #E8F5F3; font-weight: 900;
      letter-spacing: 0.05em; margin-top: 4px;
    }
    .loading-sub {
      font-size: 12px; color: rgba(232,245,243,0.5);
      letter-spacing: 0.15em; text-transform: uppercase;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.06); opacity: 0.75; }
    }
    .page.active { display: flex; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
    /* Sieve selector styles */
    .sieve-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; border: 1.5px solid rgba(46,196,182,0.15); background: rgba(15,46,43,0.8); color: #8EBDB5; cursor: pointer; transition: all 0.25s cubic-bezier(0.28,0.11,0.32,1); white-space: nowrap; }
    .sieve-chip:hover { border-color: rgba(46,196,182,0.4); background: rgba(46,196,182,0.1); transform: translateY(-1px); color: #2EC4B6; }
    .sieve-chip.active { border-color: #2EC4B6; background: linear-gradient(135deg, rgba(46,196,182,0.15), rgba(40,166,150,0.12)); color: #3DD8CA; box-shadow: 0 2px 8px rgba(46,196,182,0.2), 0 0 0 1px rgba(46,196,182,0.1); }
    .sieve-chip.active i { color: #2EC4B6; }
    /* Match indicator bar */
    .match-bar { height: 3px; border-radius: 2px; background: rgba(46,196,182,0.15); overflow: hidden; }
    .match-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
    /* Source tag */
    .source-tag { display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; }
    .source-originate { background: rgba(245,158,11,0.12); color: #fbbf24; }
    /* Sieve tag */
    .sieve-tag { display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .sieve-pass { background: rgba(16,185,129,0.12); color: #34d399; }
    .sieve-fail { background: rgba(239,68,68,0.12); color: #f87171; }
    /* User dropdown styles */
    .user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 240px; background: rgba(13,36,34,0.96); backdrop-filter: blur(20px); border-radius: 16px; border: 1px solid rgba(46,196,182,0.15); box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(46,196,182,0.08); z-index: 100; opacity: 0; transform: translateY(-8px) scale(0.96); pointer-events: none; transition: all 0.2s cubic-bezier(0.28,0.11,0.32,1); }
    .user-dropdown.show { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .user-dropdown-header { padding: 16px; border-bottom: 1px solid rgba(46,196,182,0.1); }
    .user-dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; font-size: 13px; font-weight: 500; color: #8EBDB5; transition: all 0.15s; cursor: pointer; background: none; border: none; text-align: left; }
    .user-dropdown-item:hover { background: rgba(46,196,182,0.1); color: #2EC4B6; }
    .user-dropdown-item.danger:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
    .user-dropdown-divider { height: 1px; background: rgba(46,196,182,0.1); margin: 4px 0; }

    /* ===== Contract Card System (Fintech Card) ===== */
    .cc { background: rgba(15,46,43,0.85); border-radius: 16px; border: 1px solid rgba(46,196,182,0.1); overflow: hidden; transition: all 0.35s cubic-bezier(0.28,0.11,0.32,1); position: relative; }
    .cc:hover { border-color: rgba(46,196,182,0.25); box-shadow: 0 8px 32px rgba(46,196,182,0.08), 0 2px 8px rgba(0,0,0,0.15); transform: translateY(-2px); }
    .cc.cc-expanded { border-color: rgba(46,196,182,0.3); box-shadow: 0 12px 48px rgba(46,196,182,0.12), 0 4px 16px rgba(0,0,0,0.06); transform: none; grid-column: 1 / -1; }
    .cc-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #2EC4B6, #06b6d4, #8b5cf6); opacity: 0; transition: opacity 0.3s; }
    .cc:hover .cc-accent, .cc.cc-expanded .cc-accent { opacity: 1; }
    .cc-header { padding: 14px 16px; cursor: pointer; }
    .cc-body { padding: 0 16px 14px; }
    .cc-expand-area { max-height: 0; overflow: hidden; transition: max-height 0.45s cubic-bezier(0.28,0.11,0.32,1), opacity 0.3s; opacity: 0; }
    .cc.cc-expanded .cc-expand-area { max-height: 1800px; opacity: 1; }
    .cc-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .cc-metric { text-align: center; padding: 8px 4px; background: rgba(11,30,28,0.6); border-radius: 10px; border: 1px solid rgba(46,196,182,0.06); }
    .cc-metric-val { font-size: 13px; font-weight: 800; color: #3DD8CA; font-family: 'SF Mono', 'Fira Code', monospace; }
    .cc-metric-lbl { font-size: 9px; color: #5A9A90; margin-top: 2px; letter-spacing: 0.03em; }
    .cc-progress { height: 5px; border-radius: 3px; background: rgba(46,196,182,0.15); overflow: hidden; }
    .cc-progress-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
    .cc-status { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
    .cc-status-open { background: rgba(245,158,11,0.12); color: #fbbf24; }
    .cc-status-interested { background: rgba(46,196,182,0.15); color: #3DD8CA; }
    .cc-status-confirmed { background: rgba(16,185,129,0.12); color: #34d399; }
    .cc-status-closed { background: rgba(100,116,139,0.12); color: #94a3b8; }
    .cc-mcn { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; color: #3DD8CA; padding: 3px 8px; background: rgba(46,196,182,0.1); border: 1px solid rgba(46,196,182,0.2); border-radius: 6px; }
    .cc-score-ring { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column; position: relative; }
    .cc-score-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 2.5px solid rgba(46,196,182,0.15); }
    .cc-expand-toggle { width: 24px; height: 24px; border-radius: 50%; background: rgba(46,196,182,0.08); display: flex; align-items: center; justify-content: center; transition: all 0.3s; border: none; cursor: pointer; color: #5A9A90; }
    .cc-expand-toggle:hover { background: rgba(46,196,182,0.1); }
    .cc.cc-expanded .cc-expand-toggle { transform: rotate(180deg); background: rgba(46,196,182,0.15); }
    .cc-section { padding: 14px; background: rgba(11,30,28,0.5); border-radius: 12px; border: 1px solid rgba(46,196,182,0.06); margin-bottom: 10px; }
    .cc-section-title { font-size: 12px; font-weight: 700; color: #8EBDB5; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .cc-timeline { position: relative; padding-left: 20px; }
    .cc-timeline::before { content: ''; position: absolute; left: 5px; top: 4px; bottom: 4px; width: 2px; background: linear-gradient(180deg, #2EC4B6, rgba(46,196,182,0.15)); border-radius: 1px; }
    .cc-timeline-item { position: relative; margin-bottom: 12px; }
    .cc-timeline-item:last-child { margin-bottom: 0; }
    .cc-timeline-dot { position: absolute; left: -18px; top: 3px; width: 8px; height: 8px; border-radius: 50%; border: 2px solid #2EC4B6; background: #0B1E1C; }
    .cc-timeline-dot.active { background: #2EC4B6; }
    .cc-grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
    @media (max-width: 768px) { .cc-grid-cards { grid-template-columns: 1fr; } .cc-metrics { grid-template-columns: repeat(2, 1fr); } }
    /* Mobile detail/portfolio: side-by-side to stacked layout */
    @media (max-width: 1024px) {
      #pageDetail .flex.flex-1.overflow-hidden,
      #pagePortfolioDetail .flex.flex-1.overflow-hidden,
      #pageAIBuilder .flex.flex-1.overflow-hidden { flex-direction: column; }
      #pageDetail .w-2\\/5, #pageDetail .w-3\\/5,
      #pagePortfolioDetail .w-2\\/5, #pagePortfolioDetail .w-3\\/5,
      #pageAIBuilder .w-2\\/5, #pageAIBuilder .w-3\\/5 { width: 100%; }
      #pageDetail .w-2\\/5, #pagePortfolioDetail .w-2\\/5, #pageAIBuilder .w-2\\/5 { max-height: 45vh; border-right: none; border-bottom: 1px solid rgba(46,196,182,0.12); }
      #pageDetail .w-3\\/5, #pagePortfolioDetail .w-3\\/5, #pageAIBuilder .w-3\\/5 { flex: 1; }
    }
    /* Search shortcut hint */
    .search-shortcut { display: inline-flex; align-items: center; gap: 2px; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; color: #3D7A70; background: rgba(46,196,182,0.06); border: 1px solid rgba(46,196,182,0.12); font-family: 'SF Mono', monospace; pointer-events: none; }
    /* Toast container — ensure mobile visibility */
    .toast-container { position: fixed; top: 16px; right: 16px; z-index: 900; display: flex; flex-direction: column; gap: 8px; max-width: 380px; }
    @media (max-width: 480px) { .toast-container { top: auto; bottom: 16px; right: 8px; left: 8px; max-width: none; } }
    .toast { display: flex; align-items: flex-start; padding: 12px 16px; border-radius: 12px; background: rgba(13,36,34,0.96); backdrop-filter: blur(16px); border: 1px solid rgba(46,196,182,0.15); box-shadow: 0 8px 32px rgba(0,0,0,0.4); animation: toastSlideIn 0.3s cubic-bezier(0.28,0.11,0.32,1); position: relative; overflow: hidden; }
    .toast-exit { animation: toastSlideOut 0.3s ease forwards; }
    .toast-icon { flex-shrink: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 14px; }
    .toast-success .toast-icon { color: #34d399; }
    .toast-error .toast-icon { color: #f87171; }
    .toast-warning .toast-icon { color: #fbbf24; }
    .toast-info .toast-icon { color: #22d3ee; }
    .toast-body { flex: 1; min-width: 0; }
    .toast-title { font-size: 13px; font-weight: 700; color: #E8F5F3; }
    .toast-message { font-size: 12px; color: #5A9A90; margin-top: 2px; }
    .toast-close { flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: none; border: none; color: #3D7A70; cursor: pointer; font-size: 11px; margin-left: 8px; transition: all 0.15s; }
    .toast-close:hover { background: rgba(46,196,182,0.1); color: #8EBDB5; }
    .toast-progress { position: absolute; bottom: 0; left: 0; height: 2px; background: linear-gradient(90deg, #2EC4B6, #06b6d4); animation: toastProgress linear forwards; border-radius: 0 0 12px 12px; }
    @keyframes toastSlideIn { from { opacity: 0; transform: translateX(40px) scale(0.96); } to { opacity: 1; transform: translateX(0) scale(1); } }
    @keyframes toastSlideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(60px); } }
    @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }
    /* Skeleton loading effect */
    .skeleton-card { background: rgba(15,46,43,0.6); border: 1px solid rgba(46,196,182,0.06); border-radius: 6px; padding: 14px; }
    /* ===== Dim Tooltip (hover to show professional logic) ===== */
    .dim-tooltip-wrap { position: relative; display: inline-flex; align-items: center; gap: 4px; cursor: help; }
    .dim-tooltip-wrap .dim-tooltip-text { visibility: hidden; opacity: 0; position: absolute; z-index: 100; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); min-width: 260px; max-width: 340px; padding: 10px 14px; border-radius: 10px; font-size: 11px; line-height: 1.6; color: #E8F5F3; background: rgba(8,24,22,0.98); border: 1px solid rgba(46,196,182,0.25); box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(46,196,182,0.08); pointer-events: none; transition: all 0.2s cubic-bezier(0.28,0.11,0.32,1); white-space: normal; text-align: left; }
    .dim-tooltip-wrap .dim-tooltip-text::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border-width: 6px; border-style: solid; border-color: rgba(8,24,22,0.98) transparent transparent transparent; }
    .dim-tooltip-wrap:hover .dim-tooltip-text { visibility: visible; opacity: 1; transform: translateX(-50%) translateY(-2px); }
    /* Group tag pill */
    .dim-group-tag { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; letter-spacing: 0.04em; }
    .dim-group-risk { background: rgba(239,68,68,0.1); color: #f87171; }
    .dim-group-return { background: rgba(96,165,250,0.1); color: #60a5fa; }
    .dim-group-control { background: rgba(139,92,246,0.1); color: #a78bfa; }
    .dim-group-adequacy { background: rgba(74,222,128,0.1); color: #4ade80; }
    /* Primary Category Card (一级标签折叠卡片) */
    .primary-cat-card { border-radius: 16px; overflow: hidden; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
    .primary-cat-card:hover { transform: translateY(-1px); }
    .primary-cat-header { cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 14px 16px; transition: background 0.2s; user-select: none; }
    .primary-cat-header:hover { filter: brightness(1.08); }
    .primary-cat-body { max-height: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), padding 0.3s; padding: 0 16px; }
    .primary-cat-body.expanded { max-height: 2000px; padding: 0 16px 16px 16px; }
    .primary-cat-arrow { transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); }
    .primary-cat-arrow.rotated { transform: rotate(180deg); }
    .primary-cat-score-ring { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; }
    .primary-cat-score-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 2.5px solid currentColor; opacity: 0.2; }
    .primary-cat-dims-count { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; border-radius: 9px; font-size: 10px; font-weight: 700; padding: 0 5px; }
    .skeleton-line { height: 12px; background: linear-gradient(90deg, rgba(46,196,182,0.06) 0%, rgba(46,196,182,0.12) 50%, rgba(46,196,182,0.06) 100%); background-size: 200% 100%; border-radius: 6px; animation: shimmer 1.5s infinite; margin-bottom: 8px; }
    .skeleton-line.w-60 { width: 60%; }
    .skeleton-line.w-80 { width: 80%; }
    .skeleton-line.w-40 { width: 40%; }
    .skeleton-line.h-6 { height: 24px; }
    /* AI Builder styles — dark terminal teal theme */
    .ab-quick-btn { display: inline-flex; align-items: center; padding: 8px 14px; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.25s cubic-bezier(0.28,0.11,0.32,1); background: rgba(46,196,182,0.08); border: 1px solid rgba(46,196,182,0.2); color: #2EC4B6; white-space: nowrap; }
    .ab-quick-btn:hover { background: rgba(46,196,182,0.18); border-color: rgba(46,196,182,0.4); color: #3DD8CA; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(46,196,182,0.15); }
    .ab-msg-user { display: flex; justify-content: flex-end; }
    .ab-msg-user > div { max-width: 80%; padding: 12px 16px; border-radius: 16px; border-bottom-right-radius: 4px; font-size: 13px; line-height: 1.6; background: linear-gradient(135deg, #5DC4B3, #49A89A); color: white; box-shadow: 0 4px 12px rgba(93,196,179,0.25); }
    .ab-msg-ai { display: flex; gap: 12px; align-items: flex-start; }
    .ab-msg-ai .ab-avatar { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, #5DC4B3, #3D8F83); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(93,196,179,0.3); }
    .ab-msg-ai .ab-avatar i { color: white; font-size: 12px; }
    .ab-msg-ai .ab-content { flex: 1; padding: 12px 16px; border-radius: 16px; border-top-left-radius: 4px; font-size: 13px; line-height: 1.6; background: rgba(15,46,43,0.9); border: 1px solid rgba(46,196,182,0.1); color: #8EBDB5; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
    .ab-typing { display: flex; gap: 4px; padding: 6px 0; }
    .ab-typing span { width: 6px; height: 6px; border-radius: 50%; background: #5DC4B3; animation: abTypingBounce 1.4s infinite ease-in-out both; }
    .ab-typing span:nth-child(1) { animation-delay: -0.32s; }
    .ab-typing span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes abTypingBounce { 0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
    .ab-portfolio-evolve { animation: abEvolve 0.6s cubic-bezier(0.28,0.11,0.32,1); }
    @keyframes abEvolve { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    #abInput::placeholder { color: #3D7A70; }
    #abInput:focus { border-color: rgba(46,196,182,0.5); box-shadow: 0 0 0 3px rgba(46,196,182,0.12); outline: none; }
    @keyframes ccSlideDown { from { max-height: 0; opacity: 0; } to { max-height: 1800px; opacity: 1; } }
    .ab-contract-item { background: rgba(15,46,43,0.6); border: 1px solid rgba(46,196,182,0.08); }
    .ab-contract-item:hover { border-color: rgba(46,196,182,0.25); background: rgba(46,196,182,0.06); box-shadow: 0 2px 8px rgba(46,196,182,0.08); }
    /* AI entry card animation — enhanced */
    @keyframes aiEntryShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
    @keyframes aiEntryPulse { 0%, 100% { box-shadow: 0 4px 20px rgba(93,196,179,0.25), 0 0 0 0 rgba(93,196,179,0.4), inset 0 1px 0 rgba(255,255,255,0.08); } 50% { box-shadow: 0 8px 40px rgba(93,196,179,0.35), 0 0 0 8px rgba(93,196,179,0), inset 0 1px 0 rgba(255,255,255,0.08); } }
    @keyframes aiEntryFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes aiEntryBorderGlow { 0%, 100% { border-color: rgba(93,196,179,0.35); } 50% { border-color: rgba(93,196,179,0.65); } }
    @keyframes aiEntryGradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes aiParticleRise { 0% { transform: translateY(100%) translateX(0) scale(0); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 0.6; } 100% { transform: translateY(-100%) translateX(20px) scale(1); opacity: 0; } }
    @keyframes aiParticleRise2 { 0% { transform: translateY(100%) translateX(0) scale(0); opacity: 0; } 15% { opacity: 0.8; } 85% { opacity: 0.4; } 100% { transform: translateY(-120%) translateX(-15px) scale(1.2); opacity: 0; } }
    @keyframes aiRingPulse { 0% { transform: scale(0.8); opacity: 0.6; } 50% { transform: scale(1.15); opacity: 0; } 100% { transform: scale(0.8); opacity: 0; } }
    @keyframes navAIPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(46,196,182,0.4); } 50% { box-shadow: 0 0 0 6px rgba(46,196,182,0); } }
    @keyframes aiFabPulse { 0%, 100% { box-shadow: 0 4px 20px rgba(46,196,182,0.4), 0 0 0 0 rgba(46,196,182,0.3); } 50% { box-shadow: 0 4px 20px rgba(46,196,182,0.4), 0 0 0 10px rgba(46,196,182,0); } }
    @keyframes aiFabBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @keyframes aiStatShine { 0% { left: -100%; } 100% { left: 200%; } }
    .ai-entry-card { position: relative; overflow: hidden; cursor: pointer; transition: all 0.4s cubic-bezier(0.28,0.11,0.32,1); animation: aiEntryPulse 3s ease-in-out infinite, aiEntryBorderGlow 3s ease-in-out infinite; border: 1.5px solid rgba(93,196,179,0.35) !important; }
    .ai-entry-card:hover { transform: translateY(-4px) scale(1.008); box-shadow: 0 16px 48px rgba(93,196,179,0.3), 0 4px 16px rgba(0,0,0,0.1), 0 0 80px rgba(46,196,182,0.1) !important; border-color: rgba(93,196,179,0.7) !important; }
    .ai-entry-card::before { content: ''; position: absolute; inset: -2px; border-radius: inherit; background: linear-gradient(135deg, rgba(93,196,179,0.2), transparent 40%, transparent 60%, rgba(46,196,182,0.15)); z-index: 0; pointer-events: none; }
    .ai-entry-card::after { content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), rgba(93,196,179,0.08), transparent); animation: aiEntryShimmer 3.5s ease-in-out infinite; pointer-events: none; z-index: 1; }
    .ai-entry-icon { animation: aiEntryFloat 3s ease-in-out infinite; }
    .ai-entry-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
    .ai-entry-particles::before, .ai-entry-particles::after { content: ''; position: absolute; border-radius: 50%; background: rgba(93,196,179,0.5); }
    .ai-entry-particles::before { width: 5px; height: 5px; top: 30%; right: 12%; animation: aiParticleRise 4s ease-in-out infinite; }
    .ai-entry-particles::after { width: 3px; height: 3px; bottom: 20%; right: 25%; animation: aiParticleRise2 5s ease-in-out infinite 1s; }
    /* AI entry extra particle layer */
    .ai-entry-particles-extra { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
    .ai-entry-particles-extra::before { content: ''; position: absolute; width: 4px; height: 4px; border-radius: 50%; background: rgba(94,234,212,0.4); top: 60%; right: 8%; animation: aiParticleRise 6s ease-in-out infinite 2s; }
    .ai-entry-particles-extra::after { content: ''; position: absolute; width: 6px; height: 6px; border-radius: 50%; background: rgba(46,196,182,0.3); bottom: 40%; left: 15%; animation: aiParticleRise2 7s ease-in-out infinite 0.5s; }
    /* AI entry pulse ring */
    .ai-entry-ring { position: absolute; top: 50%; left: 50%; width: 100%; height: 100%; transform: translate(-50%,-50%); border: 2px solid rgba(93,196,179,0.15); border-radius: inherit; pointer-events: none; animation: aiRingPulse 3s ease-out infinite; z-index: 0; }
    /* Nav bar AI button enhanced */
    .nav-ai-btn { position: relative; gap: 5px; padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; color: #3DD8CA; background: linear-gradient(135deg, rgba(46,196,182,0.15), rgba(93,196,179,0.08)); border: 1px solid rgba(46,196,182,0.35); transition: all 0.3s cubic-bezier(0.28,0.11,0.32,1); cursor: pointer; animation: navAIPulse 2.5s ease-in-out infinite; }
    .nav-ai-btn:hover { background: linear-gradient(135deg, rgba(46,196,182,0.25), rgba(93,196,179,0.15)); box-shadow: 0 0 20px rgba(46,196,182,0.2); border-color: rgba(46,196,182,0.6); color: #5eead4; transform: translateY(-1px); }
    .nav-ai-btn::after { content: ''; position: absolute; inset: -1px; border-radius: inherit; background: linear-gradient(135deg, rgba(93,196,179,0.3), transparent, rgba(46,196,182,0.2)); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    .nav-ai-btn:hover::after { opacity: 1; }
    .nav-ai-dot { width: 6px; height: 6px; border-radius: 50%; background: #5eead4; animation: pulse 1.5s ease-in-out infinite; flex-shrink: 0; }
    /* Global floating AI entry FAB */
    .ai-builder-fab { position: fixed; bottom: 90px; right: 20px; z-index: 800; width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg, #2EC4B6, #1a9e92); border: 1.5px solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; font-size: 20px; transition: all 0.3s cubic-bezier(0.28,0.11,0.32,1); animation: aiFabPulse 2.5s ease-in-out infinite; box-shadow: 0 4px 20px rgba(46,196,182,0.4); }
    .ai-builder-fab:hover { transform: translateY(-3px) scale(1.05); box-shadow: 0 8px 32px rgba(46,196,182,0.5), 0 0 60px rgba(46,196,182,0.15); }
    .ai-builder-fab .fab-badge { position: absolute; top: -4px; right: -4px; background: #f59e0b; color: white; font-size: 8px; font-weight: 800; padding: 2px 5px; border-radius: 6px; line-height: 1; letter-spacing: 0.05em; }
    .ai-builder-fab .fab-ring { position: absolute; inset: -4px; border-radius: 20px; border: 2px solid rgba(46,196,182,0.3); animation: aiRingPulse 3s ease-out infinite; pointer-events: none; }
    .ai-builder-fab-tooltip { position: absolute; right: calc(100% + 12px); top: 50%; transform: translateY(-50%); background: rgba(13,36,34,0.95); border: 1px solid rgba(46,196,182,0.25); border-radius: 10px; padding: 8px 14px; white-space: nowrap; opacity: 0; pointer-events: none; transition: all 0.25s; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    .ai-builder-fab:hover .ai-builder-fab-tooltip { opacity: 1; transform: translateY(-50%) translateX(-4px); }
    .ai-builder-fab-tooltip::after { content: ''; position: absolute; right: -6px; top: 50%; transform: translateY(-50%) rotate(45deg); width: 10px; height: 10px; background: rgba(13,36,34,0.95); border-right: 1px solid rgba(46,196,182,0.25); border-bottom: 1px solid rgba(46,196,182,0.25); }
    /* AI stat card enhanced */
    .ai-stat-card { position: relative; overflow: hidden; padding: 10px 14px; background: linear-gradient(135deg, rgba(15,60,55,0.9), rgba(20,75,68,0.8)); border: 1.5px solid rgba(46,196,182,0.25); border-radius: 6px; transition: all 0.3s; cursor: pointer; animation: aiEntryBorderGlow 3s ease-in-out infinite; }
    .ai-stat-card:hover { border-color: rgba(46,196,182,0.5); background: linear-gradient(135deg, rgba(15,60,55,1), rgba(25,85,75,0.9)); box-shadow: 0 4px 20px rgba(46,196,182,0.15); transform: translateY(-1px); }
    .ai-stat-card::after { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(93,196,179,0.08), transparent); animation: aiStatShine 4s ease-in-out infinite; pointer-events: none; }
    /* Language Toggle */
    .lang-toggle { display: flex; align-items: center; background: rgba(15,46,43,0.8); border: 1px solid rgba(46,196,182,0.15); border-radius: 6px; overflow: hidden; }
    .lang-btn { padding: 3px 8px; font-size: 10px; font-weight: 700; color: #5A9A90; background: transparent; border: none; cursor: pointer; transition: all 0.2s; letter-spacing: 0.03em; }
    .lang-btn:hover { color: #8EBDB5; }
    .lang-btn.active { color: #3DD8CA; background: rgba(46,196,182,0.15); }
    /* AI entry guide hint */
    @keyframes aiHintBounce {
      0%, 100% { transform: translateY(0); }
      40% { transform: translateY(-8px); }
      60% { transform: translateY(-4px); }
    }
    @keyframes aiHintFadeIn {
      from { opacity: 0; transform: translateY(10px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes aiHintPointer {
      0%, 100% { transform: translateX(0) rotate(-8deg); }
      50% { transform: translateX(6px) rotate(-8deg); }
    }
    .ai-entry-hint {
      position: absolute;
      bottom: -58px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      animation: aiHintFadeIn 0.6s cubic-bezier(0.28,0.11,0.32,1) 1.5s both;
      pointer-events: none;
    }
    .ai-entry-hint-inner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, rgba(13,36,34,0.98), rgba(20,55,50,0.95));
      border: 1px solid rgba(93,196,179,0.35);
      border-radius: 12px;
      padding: 10px 20px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 20px rgba(46,196,182,0.1), 0 0 0 1px rgba(93,196,179,0.15);
      white-space: nowrap;
      animation: aiHintBounce 2.5s ease-in-out 2.2s infinite;
    }
    .ai-entry-hint-inner::before {
      content: '';
      position: absolute;
      top: -7px;
      left: 50%;
      transform: translateX(-50%);
      width: 12px;
      height: 12px;
      background: rgba(13,36,34,0.95);
      border-left: 1px solid rgba(93,196,179,0.25);
      border-top: 1px solid rgba(93,196,179,0.25);
      transform: translateX(-50%) rotate(45deg);
    }
    .ai-hint-hand {
      font-size: 16px;
      animation: aiHintPointer 1.5s ease-in-out 2.5s infinite;
      display: inline-block;
    }
    /* ===== Spotlight effect: AI entry highlight ===== */
    @keyframes spotlightFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes spotlightGlow {
      0%, 100% { box-shadow: 0 0 40px rgba(93,196,179,0.5), 0 0 80px rgba(93,196,179,0.2), 0 4px 20px rgba(93,196,179,0.2); }
      50% { box-shadow: 0 0 60px rgba(93,196,179,0.6), 0 0 120px rgba(93,196,179,0.25), 0 8px 40px rgba(93,196,179,0.3); }
    }
    @keyframes spotlightLabelPulse {
      0%, 100% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.03); }
    }
    #spotlightOverlay {
      position: fixed;
      inset: 0;
      z-index: 999;
      background: rgba(0,0,0,0.55);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.5s cubic-bezier(0.28,0.11,0.32,1);
    }
    #spotlightOverlay.active {
      opacity: 1;
      pointer-events: auto;
      animation: spotlightFadeIn 0.5s cubic-bezier(0.28,0.11,0.32,1);
    }
    .spotlight-active .ai-entry-card {
      position: relative;
      z-index: 1001 !important;
      animation: spotlightGlow 2s ease-in-out infinite !important;
      transform: scale(1.03);
      border: 2px solid rgba(93,196,179,0.7) !important;
    }
    .spotlight-active #aiEntryWrapper {
      position: relative;
      z-index: 1001;
    }
    .spotlight-active .ai-entry-hint {
      z-index: 1002;
    }
    #spotlightLabel {
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1003;
      background: linear-gradient(135deg, #0a2e2a, #164e47);
      border: 1px solid rgba(93,196,179,0.35);
      border-radius: 0 0 16px 16px;
      padding: 10px 28px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s ease 0.2s;
      animation: spotlightLabelPulse 3s ease-in-out infinite;
    }
    #spotlightLabel.active {
      opacity: 1;
    }
    #spotlightLabel .spotlight-label-text {
      color: #5eead4;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    #spotlightLabel .spotlight-label-sub {
      color: rgba(255,255,255,0.5);
      font-size: 11px;
    }
    #spotlightDismissHint {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1003;
      color: rgba(255,255,255,0.6);
      font-size: 12px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s ease 0.6s;
    }
    #spotlightDismissHint.active {
      opacity: 1;
    }
  </style>
</head>
<body class="min-h-screen" style="background:#0B1E1C;">

  <!-- ===== Spotlight Overlay ===== -->
  <div id="spotlightOverlay" onclick="dismissSpotlight()"></div>
  <div id="spotlightLabel">
    <i class="fas fa-magic" style="color: #5eead4; font-size: 16px;"></i>
    <div>
      <div class="spotlight-label-text" data-i18n="spotlightTitle">✨ Try the AI Portfolio Builder</div>
      <div class="spotlight-label-sub" data-i18n="spotlightSub">Chat with AI · Smart Matching · One-Click Portfolio Building</div>
    </div>
  </div>
  <div id="spotlightDismissHint"><i class="fas fa-hand-pointer" style="margin-right: 4px;"></i><span data-i18n="spotlightDismiss">Click anywhere to continue browsing</span></div>

  <!-- ==================== Loading Screen ==================== -->
  <div id="app-loading">
    <div style="width:56px; height:72px; position:relative; margin-bottom:8px;">
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6 0%, #3DD8CA 100%); position:absolute; top:0; left:4px; box-shadow: 0 4px 20px rgba(46,196,182,0.4); animation: pulse 2s ease-in-out infinite;"></div>
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, #28A696 0%, #2EC4B6 100%); position:absolute; bottom:0; left:4px; box-shadow: 0 4px 20px rgba(40,166,150,0.35); opacity:0.85; animation: pulse 2s ease-in-out infinite 0.3s;"></div>
    </div>
    <div class="loading-text" style="font-family:'Montserrat',sans-serif; font-weight:900; letter-spacing:0.05em;">DEAL CONNECT</div>
    <div class="loading-sub" style="font-size:14px; letter-spacing:0.15em; margin-top:4px;">DEAL CONNECT</div>
    <div class="loading-sub" id="loadingStatus" style="margin-top:12px;">Initializing...</div>
    <div style="width: 200px; height: 3px; background: rgba(255,255,255,0.15); border-radius: 99px; margin-top: 16px; overflow: hidden;">
      <div id="loadingBar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #2EC4B6, #3DD8CA); border-radius: 99px; transition: width 0.4s ease;"></div>
    </div>
    <div style="margin-top:24px; font-size:9px; letter-spacing:0.2em; color:rgba(255,255,255,0.4); font-family:'Montserrat',sans-serif;">POWERED BY MICRO CONNECT GROUP</div>
  </div>

  <!-- ==================== Onboarding Modal ==================== -->
  <div id="onboardingModal" class="hidden fixed inset-0 bg-black/60 onboarding-modal flex items-center justify-center z-[300]">
    <div class="onboarding-card rounded-3xl max-w-2xl w-full mx-4 overflow-hidden" style="background:rgba(13,36,34,0.98); border:1px solid rgba(46,196,182,0.15);">
      <div class="relative h-48 overflow-hidden" style="background: linear-gradient(135deg, #5DC4B3 0%, #49A89A 50%, #32ade6 100%);">
        <div class="absolute inset-0 pattern-bg"></div>
        <button onclick="closeOnboarding()" class="absolute top-4 right-4 w-8 h-8 bg-[#0F2E2B]/20 hover:bg-[#0F2E2B]/30 rounded-full flex items-center justify-center text-white transition-all"><i class="fas fa-times"></i></button>
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <button onclick="goToOBStep(0)" class="step-dot w-2.5 h-2.5 rounded-full bg-[#0F2E2B]/50 active" data-step="0"></button>
          <button onclick="goToOBStep(1)" class="step-dot w-2.5 h-2.5 rounded-full bg-[#0F2E2B]/50" data-step="1"></button>
          <button onclick="goToOBStep(2)" class="step-dot w-2.5 h-2.5 rounded-full bg-[#0F2E2B]/50" data-step="2"></button>
          <button onclick="goToOBStep(3)" class="step-dot w-2.5 h-2.5 rounded-full bg-[#0F2E2B]/50" data-step="3"></button>
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="animate-float"><div class="w-24 h-24 bg-[#0F2E2B]/20 backdrop-blur-sm rounded-3xl flex items-center justify-center"><i id="obIcon" class="fas fa-filter text-white text-4xl"></i></div></div>
        </div>
      </div>
      <div class="p-8 relative overflow-hidden" style="min-height: 280px; background:rgba(11,30,28,0.95);">
        <!-- Step 0: Welcome -->
        <div id="obStep0" class="ob-step active text-center">
          <h2 class="text-2xl font-bold mb-3" style="color:#E8F5F3;" data-i18n="obWelcomeTitle">Welcome to Deal Connect</h2>
          <p class="mb-8" style="color:#5A9A90;" data-i18n="obWelcomeDesc">Intelligent opportunity board for investors — Precise matching, efficient participation</p>
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="p-4 rounded-2xl" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.15);"><div class="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style="background:rgba(245,158,11,0.15);"><i class="fas fa-paper-plane text-xl" style="color:#fbbf24;"></i></div><p class="text-sm font-medium" style="color:#E8F5F3;" data-i18n="obOriginate">Originate</p><p class="text-xs mt-1" style="color:#5A9A90;" data-i18n="obOriginateDesc">Deal Source</p></div>
            <div class="p-4 rounded-2xl" style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.15);"><div class="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style="background:rgba(6,182,212,0.15);"><i class="fas fa-filter text-xl" style="color:#22d3ee;"></i></div><p class="text-sm font-medium" style="color:#E8F5F3;" data-i18n="obAssess">Assess Sieves</p><p class="text-xs mt-1" style="color:#5A9A90;" data-i18n="obAssessDesc">AI Filtering</p></div>
            <div class="p-4 rounded-2xl" style="background:rgba(46,196,182,0.08);border:1px solid rgba(46,196,182,0.15);"><div class="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style="background:rgba(46,196,182,0.15);"><i class="fas fa-hand-pointer text-xl" style="color:#3DD8CA;"></i></div><p class="text-sm font-medium" style="color:#E8F5F3;" data-i18n="obDeal">Deal Decision</p><p class="text-xs mt-1" style="color:#5A9A90;" data-i18n="obDealDesc">Your Choice</p></div>
          </div>
        </div>
        <!-- Step 1: Originate Source -->
        <div id="obStep1" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center" style="box-shadow:0 8px 24px rgba(245,158,11,0.25);"><i class="fas fa-paper-plane text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold uppercase tracking-wide" style="color:#fbbf24;" data-i18n="obStep1Tag">DATA SOURCE</span><h3 class="text-xl font-bold mt-1 mb-3" style="color:#E8F5F3;" data-i18n="obStep1Title">Opportunities from Originate</h3><p class="mb-4" style="color:#5A9A90;" data-i18n="obStep1Desc">Fundraisers upload business data and plans through Originate, generating standardized investment opportunities. These are pre-screened before flowing into Deal Connect.</p>
              <div class="flex items-center space-x-4 text-sm"><div class="flex items-center" style="color:#5A9A90;"><i class="fas fa-check-circle text-amber-500 mr-2"></i><span data-i18n="obStep1Check1">Standardized Data</span></div><div class="flex items-center" style="color:#5A9A90;"><i class="fas fa-check-circle text-amber-500 mr-2"></i><span data-i18n="obStep1Check2">Real-time Updates</span></div></div>
            </div>
          </div>
        </div>
        <!-- Step 2: Assess Sieves -->
        <div id="obStep2" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center" style="box-shadow:0 8px 24px rgba(6,182,212,0.25);"><i class="fas fa-filter text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold uppercase tracking-wide" style="color:#22d3ee;" data-i18n="obStep2Tag">SMART FILTERING</span><h3 class="text-xl font-bold mt-1 mb-3" style="color:#E8F5F3;" data-i18n="obStep2Title">AI Sieves from Assess</h3><p class="mb-4" style="color:#5A9A90;" data-i18n="obStep2Desc">Assess provides multiple AI filtering models (sieves), each with different evaluation criteria. Select a sieve to show only passing opportunities; select none to view all.</p>
              <div class="flex flex-wrap gap-2">
                <span class="sieve-chip active"><i class="fas fa-brain"></i><span data-i18n="obStep2Chip1">Industry Pref.</span></span>
                <span class="sieve-chip"><i class="fas fa-shield-alt"></i><span data-i18n="obStep2Chip2">Risk-First</span></span>
                <span class="sieve-chip"><i class="fas fa-chart-line"></i><span data-i18n="obStep2Chip3">High Return</span></span>
              </div>
            </div>
          </div>
        </div>
        <!-- Step 3: Deal Decision -->
        <div id="obStep3" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center" style="box-shadow:0 8px 24px rgba(46,196,182,0.25);"><i class="fas fa-hand-pointer text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold uppercase tracking-wide" style="color:#3DD8CA;" data-i18n="obStep3Tag">DEAL PARTICIPATION</span><h3 class="text-xl font-bold mt-1 mb-3" style="color:#E8F5F3;" data-i18n="obStep3Title">Precise Participation After Filtering</h3><p class="mb-4" style="color:#5A9A90;" data-i18n="obStep3Desc">Among filtered high-quality opportunities, review detailed assessment reports, compare deals, and express interest. Next steps flow into Terms and Contracts.</p>
              <div class="flex items-center space-x-3">
                <div class="px-3 py-1.5 rounded-lg text-sm font-medium" style="background:rgba(46,196,182,0.12);color:#3DD8CA;"><i class="fas fa-eye mr-1"></i><span data-i18n="obStep3Flow1">Browse Filtered</span></div>
                <i class="fas fa-arrow-right" style="color:#2A5E58;"></i>
                <div class="px-3 py-1.5 rounded-lg text-sm font-medium" style="background:rgba(16,185,129,0.12);color:#34d399;"><i class="fas fa-hand-point-up mr-1"></i><span data-i18n="obStep3Flow2">Express Interest</span></div>
                <i class="fas fa-arrow-right" style="color:#2A5E58;"></i>
                <div class="px-3 py-1.5 rounded-lg text-sm font-medium" style="background:rgba(6,182,212,0.12);color:#22d3ee;"><i class="fas fa-file-contract mr-1"></i><span data-i18n="obStep3Flow3">Enter Terms</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="px-8 pb-8 flex items-center justify-between">
        <button onclick="closeOnboarding()" class="text-sm transition-colors" style="color:#5A9A90;" data-i18n="obSkipBtn">Skip Tutorial</button>
        <div class="flex items-center space-x-3">
          <button id="obPrev" onclick="obPrev()" class="hidden px-4 py-2 rounded-xl transition-all" style="border:1px solid rgba(46,196,182,0.2);color:#8EBDB5;"><i class="fas fa-arrow-left mr-2"></i><span data-i18n="obPrevBtn">Previous</span></button>
          <button id="obNext" onclick="obNext()" class="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all font-medium" style="box-shadow:0 8px 24px rgba(46,196,182,0.25);"><span data-i18n="obStartBtn">Start Exploring</span><i class="fas fa-arrow-right ml-2"></i></button>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 0: Login / Register ==================== -->
  <div id="pageAuth" class="page active flex-col min-h-screen cyber-bg particles-bg">
    <div class="flex-1 flex items-center justify-center p-4 relative z-10">
      <div class="rounded-3xl max-w-md w-full overflow-hidden animate-scale-in" style="background:rgba(13,36,34,0.96);backdrop-filter:blur(20px);border:1px solid rgba(46,196,182,0.12);box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(46,196,182,0.08);">
        <div class="p-8 text-center" style="border-bottom: 1px solid rgba(46,196,182,0.1);">
          <div class="mx-auto mb-5 animate-float" style="width:52px; height:68px; position:relative;">
            <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6 0%, #3DD8CA 100%); position:absolute; top:0; left:4px; box-shadow: 0 4px 16px rgba(46,196,182,0.35);"></div>
            <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #28A696 0%, #2EC4B6 100%); position:absolute; bottom:0; left:4px; box-shadow: 0 4px 16px rgba(40,166,150,0.3); opacity:0.85;"></div>
          </div>
          <h1 style="font-family:'Montserrat',sans-serif; font-weight:900; font-size:22px; letter-spacing:0.04em; color:#E8F5F3; line-height:1.15; margin-bottom:6px;">DEAL<br>CONNECT</h1>
          <div style="width:120px; height:2.5px; background:#2EC4B6; margin:8px auto 10px; border-radius:2px;"></div>
          <p style="font-family:'Montserrat',sans-serif; font-size:9px; letter-spacing:0.2em; color:#5A9A90; font-weight:500;">POWERED BY MICRO CONNECT GROUP</p>
          <p class="text-lg font-bold mt-3" style="color:#E8F5F3;">Deal Connect</p>
          <p class="text-xs mt-1" style="color:#5A9A90;" data-i18n="authSubtitle">Intelligent Opportunity Board for Investors</p>
        </div>
        <div class="flex" style="border-bottom: 1px solid rgba(46,196,182,0.1);">
          <button onclick="switchAuthTab('login')" id="tabLogin" class="flex-1 py-3 text-center font-semibold" style="color:#2EC4B6; border-bottom: 2px solid #2EC4B6;" data-i18n="authLogin">Login</button>
          <button onclick="switchAuthTab('register')" id="tabRegister" class="flex-1 py-3 text-center font-semibold" style="color:#5A9A90;" data-i18n="authRegister">Register</button>
        </div>
        <!-- Login Form -->
        <div id="formLogin" class="p-6">
          <form onsubmit="event.preventDefault(); handleLogin();" autocomplete="on">
          <div class="space-y-4">
            <div><label class="block text-sm font-medium mb-1" style="color:#8EBDB5;" data-i18n="authUsernameEmail">Username / Email</label><input type="text" id="loginUsername" data-i18n="authPlaceholderLogin" data-i18n-attr="placeholder" placeholder="Enter username or email" autocomplete="username" class="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" style="background:rgba(11,30,28,0.8);border:1px solid rgba(46,196,182,0.15);color:#E8F5F3;" onkeydown="if(event.key==='Enter')document.getElementById('loginPassword').focus()"></div>
            <div><label class="block text-sm font-medium mb-1" style="color:#8EBDB5;" data-i18n="authPassword">Password</label><div class="password-wrapper" style="position:relative;"><input type="password" id="loginPassword" data-i18n="authPlaceholderPwd" data-i18n-attr="placeholder" placeholder="Enter password" autocomplete="current-password" class="w-full px-4 py-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" style="background:rgba(11,30,28,0.8);border:1px solid rgba(46,196,182,0.15);color:#E8F5F3;"><button type="button" onclick="togglePwdVis('loginPassword', this)" class="password-toggle" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#5A9A90;cursor:pointer;padding:4px;"><i class="fas fa-eye"></i></button></div></div>
            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center cursor-pointer whitespace-nowrap" style="color:#5A9A90;"><input type="checkbox" id="rememberMe" class="mr-2 rounded" style="width:16px;height:16px;flex-shrink:0;"><span data-i18n="authRemember">Remember me</span></label>
              <a href="#" class="text-[#3DD8CA] hover:text-[#2EC4B6]" onclick="event.preventDefault(); showToast('info',t('toastPwdReset'),t('toastPwdResetMsg'))" data-i18n="authForgot">Forgot password?</a>
            </div>
            <button type="submit" class="w-full py-3 btn-primary rounded-xl font-medium shadow-lg"><i class="fas fa-sign-in-alt mr-2"></i><span data-i18n="authLoginBtn">Login</span></button>
            <button type="button" onclick="handleGuestLogin()" class="w-full py-3 rounded-xl font-medium transition-colors" style="border:1px solid rgba(46,196,182,0.2);color:#8EBDB5;background:rgba(46,196,182,0.05);"><i class="fas fa-user-secret mr-2"></i><span data-i18n="authGuestBtn">Quick Guest Access</span></button>
          </div>
          <p id="loginError" class="hidden mt-4 text-sm text-red-500 text-center"></p>
          </form>
          <div class="mt-6 pt-6" style="border-top:1px solid rgba(46,196,182,0.1);">
            <p class="text-xs text-center mb-3" style="color:#5A9A90;" data-i18n="authEnterprise">Enterprise Users</p>
            <button onclick="showToast('info',t('toastSSOTitle'),t('toastSSOMsg'))" class="w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center" style="background:rgba(46,196,182,0.06);color:#5A9A90;"><i class="fas fa-building mr-2"></i><span data-i18n="authSSO">Company SSO Login (Coming Soon)</span></button>
          </div>
        </div>
        <!-- Register Form -->
        <div id="formRegister" class="hidden p-6">
          <form onsubmit="event.preventDefault(); handleRegister();" autocomplete="on">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm font-medium mb-1" style="color:#8EBDB5;"><span data-i18n="authRegUsernameLabel">Username</span> <span class="text-red-500">*</span></label><input type="text" id="regUsername" data-i18n="authRegUsernamePh" data-i18n-attr="placeholder" placeholder="For login" class="w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" style="background:rgba(11,30,28,0.8);border:1px solid rgba(46,196,182,0.15);color:#E8F5F3;"></div>
              <div><label class="block text-sm font-medium mb-1" style="color:#8EBDB5;" data-i18n="authRegDisplayLabel">Display Name</label><input type="text" id="regDisplayName" data-i18n="authRegDisplayPh" data-i18n-attr="placeholder" placeholder="Display name" class="w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" style="background:rgba(11,30,28,0.8);border:1px solid rgba(46,196,182,0.15);color:#E8F5F3;"></div>
            </div>
            <div><label class="block text-sm font-medium mb-1" style="color:#8EBDB5;"><span data-i18n="authRegEmailLabel">Email</span> <span class="text-red-500">*</span></label><input type="email" id="regEmail" data-i18n="authRegEmailPh" data-i18n-attr="placeholder" placeholder="your@email.com" class="w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" style="background:rgba(11,30,28,0.8);border:1px solid rgba(46,196,182,0.15);color:#E8F5F3;"></div>
            <div><label class="block text-sm font-medium mb-1" style="color:#8EBDB5;" data-i18n="authRegPhoneLabel">Phone</label><input type="tel" id="regPhone" data-i18n="authRegPhonePh" data-i18n-attr="placeholder" placeholder="+1 (555) 000-0000" class="w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" style="background:rgba(11,30,28,0.8);border:1px solid rgba(46,196,182,0.15);color:#E8F5F3;"></div>
            <div><label class="block text-sm font-medium mb-1" style="color:#8EBDB5;"><span data-i18n="authRegPwdLabel">Password</span> <span class="text-red-500">*</span></label><div class="password-wrapper" style="position:relative;"><input type="password" id="regPassword" data-i18n="authRegPwdPh" data-i18n-attr="placeholder" placeholder="At least 6 characters" autocomplete="new-password" class="w-full px-4 py-2.5 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" style="background:rgba(11,30,28,0.8);border:1px solid rgba(46,196,182,0.15);color:#E8F5F3;"><button type="button" onclick="togglePwdVis('regPassword', this)" class="password-toggle" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#5A9A90;cursor:pointer;padding:4px;"><i class="fas fa-eye"></i></button></div></div>
            <button type="submit" class="w-full py-3 btn-primary rounded-xl font-medium shadow-lg"><i class="fas fa-user-plus mr-2"></i><span data-i18n="authRegisterBtn">Register</span></button>
          </div>
          <p id="regError" class="hidden mt-4 text-sm text-red-500 text-center"></p>
          </form>
        </div>
        <div class="px-6 pb-4 text-center"><p class="text-xs" style="color:#3D7A70;">&copy; 2026 Deal Connect · Micro Connect Group</p></div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 1: Dashboard (Investor Board) ==================== -->
  <div id="pageDashboard" class="page flex-col min-h-screen grid-bg">
    <!-- Bloomberg-style Top Bar -->
    <nav style="background:rgba(8,24,22,0.98);border-bottom:1px solid rgba(46,196,182,0.12);backdrop-filter:blur(12px);">
      <!-- Main navigation row -->
      <div class="max-w-7xl mx-auto flex items-center justify-between" style="padding:8px 20px;">
        <!-- Left: Brand + Nav -->
        <div class="flex items-center" style="gap:16px;">
          <div class="flex items-center" style="gap:8px;">
            <div style="width:28px; height:32px; position:relative; flex-shrink:0;">
              <div style="width:22px; height:22px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6, #3DD8CA); position:absolute; top:0; left:3px;"></div>
              <div style="width:22px; height:22px; border-radius:50%; background:linear-gradient(135deg, #28A696, #2EC4B6); position:absolute; bottom:0; left:3px; opacity:0.85;"></div>
            </div>
            <div>
              <h1 style="color:#3DD8CA; font-family:'Montserrat',sans-serif; font-weight:800; font-size:13px; letter-spacing:0.08em; line-height:1.2;">DEAL CONNECT</h1>
              <p style="color:#3D7A70; font-size:9px; letter-spacing:0.12em; font-weight:600; font-family:'Montserrat',sans-serif;">DEAL CONNECT · MICRO CONNECT</p>
            </div>
          </div>
          <div style="width:1px;height:24px;background:rgba(46,196,182,0.12);"></div>
          <!-- Navigation shortcuts Bloomberg-style -->
          <div class="hidden sm:flex items-center" style="gap:4px;">
            <button onclick="selectSieve('all')" class="flex items-center" style="gap:4px;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;color:#8EBDB5;background:rgba(46,196,182,0.08);border:1px solid rgba(46,196,182,0.12);transition:all 0.15s;cursor:pointer;" onmouseover="this.style.background='rgba(46,196,182,0.15)';this.style.color='#3DD8CA'" onmouseout="this.style.background='rgba(46,196,182,0.08)';this.style.color='#8EBDB5'"><i class="fas fa-th-large" style="font-size:10px;"></i><span data-i18n="navDashboard">Board</span></button>
            <button onclick="goToMyContracts()" class="flex items-center" style="gap:4px;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;color:#8EBDB5;background:transparent;border:1px solid transparent;transition:all 0.15s;cursor:pointer;" onmouseover="this.style.background='rgba(46,196,182,0.08)';this.style.borderColor='rgba(46,196,182,0.12)'" onmouseout="this.style.background='transparent';this.style.borderColor='transparent'"><i class="fas fa-file-contract" style="font-size:10px;"></i><span data-i18n="navContracts">Contracts</span></button>
            <button onclick="goToMyPortfolios()" class="flex items-center" style="gap:4px;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;color:#8EBDB5;background:transparent;border:1px solid transparent;transition:all 0.15s;cursor:pointer;" onmouseover="this.style.background='rgba(46,196,182,0.08)';this.style.borderColor='rgba(46,196,182,0.12)'" onmouseout="this.style.background='transparent';this.style.borderColor='transparent'"><i class="fas fa-object-group" style="font-size:10px;"></i><span data-i18n="navPortfolios">Portfolios</span></button>
          </div>
        </div>
        <!-- Right: Toolbar -->
        <div class="flex items-center" style="gap:6px;">
          <button onclick="goToAIBuilder()" class="flex items-center nav-ai-btn"><span class="nav-ai-dot"></span><i class="fas fa-magic" style="font-size:10px;"></i><span data-i18n="navAIBuilder">AI Portfolio</span></button>
          <!-- Language Toggle -->
          <div class="lang-toggle">
            <button id="langZH" class="lang-btn active" onclick="setLanguage('zh')">ZH</button>
            <button id="langEN" class="lang-btn" onclick="setLanguage('en')">EN</button>
          </div>
          <button onclick="showOnboarding()" style="width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#5A9A90;background:transparent;border:1px solid transparent;transition:all 0.15s;cursor:pointer;font-size:12px;" onmouseover="this.style.background='rgba(46,196,182,0.08)';this.style.borderColor='rgba(46,196,182,0.12)'" onmouseout="this.style.background='transparent';this.style.borderColor='transparent'"><i class="fas fa-question-circle"></i></button>
          <div style="width:1px;height:20px;background:rgba(46,196,182,0.1);"></div>
          <!-- User avatar -->
          <div class="relative">
            <button onclick="toggleUserDD(event)" id="navUserBtn" class="flex items-center" style="gap:6px;padding:3px 8px 3px 3px;border-radius:6px;background:rgba(46,196,182,0.04);transition:all 0.15s;cursor:pointer;border:1px solid transparent;" onmouseover="this.style.background='rgba(93,196,179,0.1)';this.style.borderColor='rgba(46,196,182,0.12)'" onmouseout="this.style.background='rgba(46,196,182,0.04)';this.style.borderColor='transparent'">
              <div id="navAvatar" class="flex items-center justify-center text-white font-bold" style="width:26px;height:26px;border-radius:6px;font-size:10px;background:linear-gradient(135deg, #5DC4B3, #3D8F83);">U</div>
              <span id="navName" style="font-size:11px;font-weight:600;color:#8EBDB5;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">User</span>
              <i class="fas fa-chevron-down" style="color:#3D7A70;font-size:8px;"></i>
            </button>
            <div id="userDropdown" class="user-dropdown">
              <div class="user-dropdown-header"><div class="flex items-center space-x-3"><div id="ddAvatar" class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style="background: linear-gradient(135deg, #5DC4B3, #3D8F83);">U</div><div><div id="ddName" class="font-semibold text-sm" style="color:#E8F5F3;">User</div><div id="ddRole" class="text-xs" style="color:#5A9A90;">Investor</div></div></div></div>
              <div class="py-1">
                <button class="user-dropdown-item" onclick="showToast('info', t('navProfile'), t('toastFeatureWIP')); closeUserDD();"><i class="fas fa-user-circle"></i>Profile</button>
                <button class="user-dropdown-item" onclick="showToast('info', t('navSievePrefs'), t('toastSieveHint')); closeUserDD();"><i class="fas fa-sliders-h"></i>Sieve Preferences</button>
                <button class="user-dropdown-item" onclick="showOnboarding(); closeUserDD();"><i class="fas fa-graduation-cap"></i><span data-i18n="navOnboarding">User Guide</span></button>
                <div class="user-dropdown-divider"></div>
                <button class="user-dropdown-item danger" onclick="closeUserDD(); handleLogout();"><i class="fas fa-sign-out-alt"></i><span data-i18n="navLogout">Sign Out</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Data Ticker Row — Bloomberg-style live data bar -->
      <div style="border-top:1px solid rgba(46,196,182,0.06);background:rgba(6,20,18,0.6);">
        <div class="max-w-7xl mx-auto flex items-center justify-between" style="padding:5px 20px;">
          <div class="flex items-center" style="gap:16px;">
            <div class="flex items-center" style="gap:6px;">
              <span style="font-size:10px;color:#3D7A70;font-weight:600;letter-spacing:0.05em;" data-i18n="statContractsLabel">CONTRACTS</span>
              <span id="tickerTotalContracts" style="font-family:'SF Mono','Fira Code',monospace;font-size:13px;font-weight:800;color:#3DD8CA;">0</span>
            </div>
            <div style="width:1px;height:14px;background:rgba(46,196,182,0.1);"></div>
            <div class="flex items-center" style="gap:6px;">
              <span style="font-size:10px;color:#3D7A70;font-weight:600;letter-spacing:0.05em;" data-i18n="statDealsLabel">DEALS</span>
              <span id="tickerTotalTransactions" style="font-family:'SF Mono','Fira Code',monospace;font-size:13px;font-weight:800;color:#fbbf24;">0</span>
            </div>
            <div style="width:1px;height:14px;background:rgba(46,196,182,0.1);"></div>
            <div class="flex items-center" style="gap:6px;">
              <span style="font-size:10px;color:#3D7A70;font-weight:600;letter-spacing:0.05em;" data-i18n="statMyPosLabel">MY POS</span>
              <span id="tickerMyContracts" style="font-family:'SF Mono','Fira Code',monospace;font-size:13px;font-weight:800;color:#34d399;">0</span>
            </div>
            <div style="width:1px;height:14px;background:rgba(46,196,182,0.1);"></div>
            <div class="flex items-center" style="gap:6px;">
              <span style="font-size:10px;color:#3D7A70;font-weight:600;letter-spacing:0.05em;" data-i18n="statPortfoliosLabel">PORTFOLIOS</span>
              <span id="tickerMyPortfolios" style="font-family:'SF Mono','Fira Code',monospace;font-size:13px;font-weight:800;color:#818cf8;">0</span>
            </div>
          </div>
          <div class="flex items-center" style="gap:12px;">
            <div class="hidden sm:flex items-center" style="gap:6px;">
              <span style="font-size:10px;color:#3D7A70;font-weight:500;" data-i18n="tickerSourceLabel">SOURCE</span>
              <span style="font-size:10px;font-weight:700;color:#fbbf24;"><i class="fas fa-paper-plane" style="font-size:8px;margin-right:2px;"></i><span data-i18n="tickerSourceVal">Originate</span></span>
            </div>
            <div class="hidden sm:flex items-center" style="gap:6px;">
              <span style="font-size:10px;color:#3D7A70;font-weight:500;" data-i18n="tickerFilterLabel">FILTER</span>
              <span style="font-size:10px;font-weight:700;color:#22d3ee;"><i class="fas fa-filter" style="font-size:8px;margin-right:2px;"></i><span data-i18n="tickerFilterVal">Assess</span></span>
            </div>
            <div class="flex items-center" style="gap:4px;">
              <div style="width:6px;height:6px;border-radius:50%;background:#34d399;animation:pulse 2s infinite;"></div>
              <span style="font-size:10px;color:#34d399;font-weight:600;" id="tickerTime">LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </nav>


    <div class="flex-1 p-4">
      <div class="max-w-7xl mx-auto">
        <!-- Terminal Welcome Bar — Compact Hero Banner -->
        <div class="flex items-center justify-between mb-4" style="padding:10px 16px;background:rgba(8,24,22,0.6);border:1px solid rgba(46,196,182,0.08);border-radius:8px;">
          <div class="flex items-center" style="gap:12px;">
            <h2 style="font-size:14px;font-weight:700;color:#E8F5F3;letter-spacing:-0.02em;" id="welcomeText" data-i18n="welcomeBack">Welcome back</h2>
            <span style="font-size:11px;color:#3D7A70;">|</span>
            <p style="font-size:12px;color:#5A9A90;" id="welcomeSubText" data-i18n="welcomeSubDefault">Investment opportunities from Originate, filtered by your Assess sieves</p>
          </div>
          <div class="hidden sm:flex items-center" style="gap:8px;">
            <span style="font-size:10px;color:#3D7A70;font-family:'SF Mono','Fira Code',monospace;" id="terminalDate"></span>
          </div>
        </div>

        <!-- Terminal Stats — Compact monospace data cards -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <div class="cursor-pointer" onclick="selectSieve('all')" style="padding:10px 14px;background:rgba(15,46,43,0.7);border:1px solid rgba(46,196,182,0.08);border-radius:6px;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(99,102,241,0.3)';this.style.background='rgba(15,46,43,0.9)'" onmouseout="this.style.borderColor='rgba(46,196,182,0.08)';this.style.background='rgba(15,46,43,0.7)'">
            <div class="flex items-center justify-between">
              <span style="font-size:10px;color:#3D7A70;font-weight:600;letter-spacing:0.05em;" data-i18n="statContractsLabel">CONTRACTS</span>
              <i class="fas fa-layer-group" style="font-size:10px;color:#818cf8;"></i>
            </div>
            <p style="font-family:'SF Mono','Fira Code',monospace;font-size:20px;font-weight:800;color:#818cf8;margin-top:4px;line-height:1;" id="statTotalContracts">0</p>
            <p style="font-size:10px;color:#3D7A70;margin-top:2px;" data-i18n="statContractsDesc">Total Platform Contracts</p>
          </div>
          <div class="cursor-pointer" onclick="selectSieve('all')" style="padding:10px 14px;background:rgba(15,46,43,0.7);border:1px solid rgba(46,196,182,0.08);border-radius:6px;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(245,158,11,0.3)';this.style.background='rgba(15,46,43,0.9)'" onmouseout="this.style.borderColor='rgba(46,196,182,0.08)';this.style.background='rgba(15,46,43,0.7)'">
            <div class="flex items-center justify-between">
              <span style="font-size:10px;color:#3D7A70;font-weight:600;letter-spacing:0.05em;" data-i18n="statDealsLabel">DEALS</span>
              <i class="fas fa-exchange-alt" style="font-size:10px;color:#fbbf24;"></i>
            </div>
            <p style="font-family:'SF Mono','Fira Code',monospace;font-size:20px;font-weight:800;color:#fbbf24;margin-top:4px;line-height:1;" id="statTotalTransactions">0</p>
            <p style="font-size:10px;color:#3D7A70;margin-top:2px;" data-i18n="statDealsDesc">Completed Transactions</p>
          </div>
          <div class="cursor-pointer" onclick="goToMyContracts()" style="padding:10px 14px;background:rgba(15,46,43,0.7);border:1px solid rgba(46,196,182,0.08);border-radius:6px;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(52,211,153,0.3)';this.style.background='rgba(15,46,43,0.9)'" onmouseout="this.style.borderColor='rgba(46,196,182,0.08)';this.style.background='rgba(15,46,43,0.7)'">
            <div class="flex items-center justify-between">
              <span style="font-size:10px;color:#3D7A70;font-weight:600;letter-spacing:0.05em;" data-i18n="statMyPosLabel">MY POS</span>
              <i class="fas fa-file-contract" style="font-size:10px;color:#34d399;"></i>
            </div>
            <p style="font-family:'SF Mono','Fira Code',monospace;font-size:20px;font-weight:800;color:#34d399;margin-top:4px;line-height:1;" id="statMyContracts">0</p>
            <p style="font-size:10px;color:#3D7A70;margin-top:2px;" data-i18n="statMyPosDesc">Subscribed Contracts</p>
          </div>
          <div class="cursor-pointer" onclick="goToMyPortfolios()" style="padding:10px 14px;background:rgba(15,46,43,0.7);border:1px solid rgba(46,196,182,0.08);border-radius:6px;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(139,92,246,0.3)';this.style.background='rgba(15,46,43,0.9)'" onmouseout="this.style.borderColor='rgba(46,196,182,0.08)';this.style.background='rgba(15,46,43,0.7)'">
            <div class="flex items-center justify-between">
              <span style="font-size:10px;color:#3D7A70;font-weight:600;letter-spacing:0.05em;" data-i18n="statPortfoliosLabel">PORTFOLIOS</span>
              <i class="fas fa-object-group" style="font-size:10px;color:#818cf8;"></i>
            </div>
            <p style="font-family:'SF Mono','Fira Code',monospace;font-size:20px;font-weight:800;color:#818cf8;margin-top:4px;line-height:1;" id="statMyPortfolios">0</p>
            <p style="font-size:10px;color:#3D7A70;margin-top:2px;" data-i18n="statPortfoliosDesc">Investment Portfolios</p>
          </div>
          <!-- AI BUILDER Card -->
          <div class="ai-stat-card cursor-pointer" onclick="goToAIBuilder()">
            <div class="flex items-center justify-between">
              <span style="font-size:10px;color:#2EC4B6;font-weight:700;letter-spacing:0.05em;" data-i18n="statAIBuilderLabel">AI BUILDER</span>
              <i class="fas fa-magic" style="font-size:10px;color:#5eead4;"></i>
            </div>
            <p style="font-family:'SF Mono','Fira Code',monospace;font-size:20px;font-weight:800;color:#5eead4;margin-top:4px;line-height:1;" id="statAIReady"><i class="fas fa-bolt" style="font-size:16px;"></i></p>
            <p style="font-size:10px;color:#2EC4B6;margin-top:2px;font-weight:600;" data-i18n="statAIBuilderAction">Start building →</p>
          </div>
        </div>

        <!-- ===== AI Portfolio Builder Entry — Enhanced ===== -->
        <div class="relative mb-5" id="aiEntryWrapper" style="margin-bottom: 72px;">
          <div onclick="dismissSpotlight(); goToAIBuilder(); dismissAIHint();" class="ai-entry-card rounded-2xl p-0" style="background: linear-gradient(135deg, #0a3530 0%, #0f4a42 35%, #1a5f55 70%, #175248 100%); background-size: 200% 200%; animation: aiEntryPulse 3s ease-in-out infinite, aiEntryBorderGlow 3s ease-in-out infinite, aiEntryGradientShift 8s ease-in-out infinite;">
            <div class="ai-entry-particles"></div>
            <div class="ai-entry-particles-extra"></div>
            <div class="ai-entry-ring" style="border-radius: 16px;"></div>
            <!-- Top gradient decoration line -->
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg, #2EC4B6, #5eead4, #06b6d4, #2EC4B6);background-size:200% 100%;animation:aiEntryShimmer 3s linear infinite;border-radius:16px 16px 0 0;z-index:2;"></div>
            <div class="relative z-10 flex items-center justify-between p-5" style="padding: 20px 24px;">
              <div class="flex items-center gap-5">
                <div class="ai-entry-icon flex-shrink-0" style="width:60px;height:60px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, rgba(46,196,182,0.3), rgba(93,196,179,0.15));border:1.5px solid rgba(93,196,179,0.4);backdrop-filter:blur(8px);box-shadow:0 4px 16px rgba(46,196,182,0.2);">
                  <i class="fas fa-magic text-2xl" style="color:#5eead4;text-shadow:0 0 12px rgba(94,234,212,0.4);"></i>
                </div>
                <div>
                  <div class="flex items-center gap-2 mb-1.5">
                    <h3 style="font-size:17px;font-weight:800;color:#fff;letter-spacing:-0.02em;" data-i18n="aiEntryTitle">AI Portfolio Architect</h3>
                    <span class="px-2 py-0.5 rounded-full text-xs font-bold" style="background:linear-gradient(135deg, #f59e0b, #f97316);color:#fff;font-size:10px;letter-spacing:0.05em;box-shadow:0 2px 8px rgba(245,158,11,0.3);">HOT</span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-bold" style="background:rgba(46,196,182,0.15);color:#5eead4;font-size:10px;animation:pulseGlow 2s ease-in-out infinite;" data-i18n="aiEntryPilot">PILOT</span>
                  </div>
                  <p style="font-size:13px;color:#8EBDB5;line-height:1.5;" data-i18n="aiEntryDesc">Converse with AI to match contracts platform-wide · Build your personalized portfolio in one click</p>
                  <div class="flex items-center gap-3 mt-2">
                    <span style="font-size:11px;color:#5A9A90;display:flex;align-items:center;gap:4px;"><i class="fas fa-check-circle" style="color:#34d399;font-size:10px;"></i><span data-i18n="aiEntryFeature1">Smart Risk Matching</span></span>
                    <span style="font-size:11px;color:#5A9A90;display:flex;align-items:center;gap:4px;"><i class="fas fa-check-circle" style="color:#34d399;font-size:10px;"></i><span data-i18n="aiEntryFeature2">Multi-Dimension Analysis</span></span>
                    <span style="font-size:11px;color:#5A9A90;display:flex;align-items:center;gap:4px;"><i class="fas fa-check-circle" style="color:#34d399;font-size:10px;"></i><span data-i18n="aiEntryFeature3">One-Click Subscribe</span></span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="hidden sm:flex items-center gap-5 mr-3">
                  <div class="text-center">
                    <p style="font-family:'SF Mono','Fira Code',monospace;font-size:22px;font-weight:900;color:#5eead4;line-height:1;text-shadow:0 0 8px rgba(94,234,212,0.3);" id="aiEntryContracts">0</p>
                    <p style="font-size:10px;color:rgba(142,189,181,0.6);margin-top:3px;font-weight:600;" data-i18n="aiEntryContractsLabel">Available Contracts</p>
                  </div>
                  <div style="width:1px;height:36px;background:linear-gradient(to bottom, transparent, rgba(93,196,179,0.3), transparent);"></div>
                  <div class="text-center">
                    <p style="font-family:'SF Mono','Fira Code',monospace;font-size:22px;font-weight:900;color:#fbbf24;line-height:1;text-shadow:0 0 8px rgba(251,191,36,0.3);" id="aiEntryProjects">0</p>
                    <p style="font-size:10px;color:rgba(142,189,181,0.6);margin-top:3px;font-weight:600;" data-i18n="aiEntryProjectsLabel">Projects Covered</p>
                  </div>
                </div>
                <div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, rgba(46,196,182,0.2), rgba(93,196,179,0.1));border:1.5px solid rgba(93,196,179,0.3);transition:all 0.3s;" onmouseover="this.style.background='linear-gradient(135deg, rgba(46,196,182,0.35), rgba(93,196,179,0.2))';this.style.borderColor='rgba(93,196,179,0.5)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(46,196,182,0.2), rgba(93,196,179,0.1))';this.style.borderColor='rgba(93,196,179,0.3)'">
                  <i class="fas fa-arrow-right" style="color:#5eead4;font-size:14px;"></i>
                </div>
              </div>
            </div>
          </div>
          <!-- Guide hint bubble -->
          <div class="ai-entry-hint" id="aiEntryHint">
            <div class="ai-entry-hint-inner">
              <span class="ai-hint-hand">👆</span>
              <span style="font-size: 13px; font-weight: 600; color: #3DD8CA;" data-i18n="aiEntryHint">Click to experience AI building your portfolio</span>
              <i class="fas fa-sparkles text-xs" style="color: #5DC4B3;"></i>
            </div>
          </div>
        </div>

        <!-- ===== Sieve Selector (Core Feature) ===== -->
        <div class="rounded-2xl p-4 mb-4" style="background:rgba(15,46,43,0.85);border:1px solid rgba(46,196,182,0.1);box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(14,165,233,0.15));"><i class="fas fa-filter text-sm" style="color:#22d3ee;"></i></div>
              <div>
                <h3 class="text-sm font-bold" style="color:#E8F5F3;" data-i18n="sieveTitle">Assess · AI Sieves</h3>
                <p class="text-xs" style="color:#5A9A90;" data-i18n="sieveSub">Select a sieve model to filter opportunities, or view all</p>
              </div>
            </div>
            <button onclick="showSieveManager()" class="text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors" style="color:#22d3ee;"><i class="fas fa-cogs mr-1"></i><span data-i18n="sieveManage">Manage Sieves</span></button>
          </div>
          <div class="flex flex-wrap gap-2" id="sieveSelector">
            <!-- Dynamically rendered by renderSieveSelector() -->
          </div>
          <!-- Sieve description -->
          <div id="sieveDescription" class="mt-3 p-3 rounded-xl text-xs hidden" style="background:rgba(11,30,28,0.6);color:#5A9A90;">
            <i class="fas fa-info-circle text-cyan-500 mr-1"></i>
            <span id="sieveDescText" data-i18n="sieveSelectHint">Select a sieve to view description</span>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-2">
            <h2 class="text-base font-bold" style="color:#E8F5F3;"><i class="fas fa-file-contract mr-1.5" style="color:#3DD8CA;"></i><span data-i18n="boardTitle">Contract Board</span></h2>
            <span id="filterLabel" class="text-xs font-medium" style="color:#5A9A90;" data-i18n="boardShowing">· Showing all</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="relative"><input type="text" id="dealSearch" placeholder="" data-i18n="searchPlaceholder" data-i18n-attr="placeholder" class="search-input px-3 py-1.5 rounded-lg text-xs w-48" style="background:rgba(11,30,28,0.8);border:1px solid rgba(46,196,182,0.15);color:#E8F5F3;" oninput="debounceRenderDeals()"><span class="search-shortcut" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);">⌘K</span></div>
            <select class="px-3 py-1.5 rounded-lg text-xs" style="background:rgba(11,30,28,0.8);border:1px solid rgba(46,196,182,0.15);color:#8EBDB5;" id="filterStatus" onchange="renderDeals()">
              <option value="all" data-i18n="filterAll">All Status</option>
              <option value="available" data-i18n="filterAvailable">Available</option>
              <option value="sold" data-i18n="filterSold">Sold</option>
              <option value="mine" data-i18n="filterMine">Mine</option>
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
              <h3 class="text-xl font-bold mb-2" style="color:#E8F5F3;letter-spacing:-0.02em;" data-i18n="emptyTitle">Awaiting Investment Opportunities from Originate</h3>
              <p class="text-sm" style="color:#5A9A90;" data-i18n="emptyDesc">Opportunities are uploaded by fundraisers via Originate, filtered by Assess sieves and displayed here</p>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-6">
              <button onclick="loadDemoData()" class="group text-left p-5 rounded-2xl border transition-all" style="background: rgba(15,46,43,0.8); border-color: rgba(46,196,182,0.1);" onmouseover="this.style.borderColor='rgba(52,199,89,0.3)';this.style.boxShadow='0 8px 32px rgba(52,199,89,0.08)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(46,196,182,0.1)';this.style.boxShadow='none';this.style.transform='none'">
                <div class="w-12 h-12 icon-container icon-container-lg icon-gradient-success mb-4 group-hover:scale-105 transition-transform" style="border-radius:16px;"><i class="fas fa-database text-white text-lg"></i></div>
                <h4 class="font-bold mb-1 text-base" style="color:#E8F5F3;" data-i18n="emptyLoadDemo">Load Demo Data</h4>
                <p class="text-sm leading-relaxed" style="color:#5A9A90;" data-i18n="emptyLoadDemoDesc">Experience full features with simulated Originate projects filtered by sieves</p>
              </button>
              <div class="text-left p-5 rounded-2xl border" style="background: rgba(15,46,43,0.8); border-color: rgba(46,196,182,0.1);">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style="background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(14,165,233,0.15));"><i class="fas fa-filter text-lg" style="color:#22d3ee;"></i></div>
                <h4 class="font-bold mb-1 text-base" style="color:#E8F5F3;" data-i18n="emptySieveConfig">Configure Your Sieves</h4>
                <p class="text-sm leading-relaxed" style="color:#5A9A90;" data-i18n="emptySieveConfigDesc">Set your AI filtering criteria in Assess to automatically display matching opportunities</p>
              </div>
            </div>
            <div class="rounded-2xl p-5 border" style="background: rgba(15,46,43,0.7); border-color: rgba(46,196,182,0.1);">
              <h4 class="text-xs font-bold uppercase tracking-wider mb-4" style="color: #5A9A90;"><i class="fas fa-route mr-1.5" style="color: #5DC4B3;"></i><span data-i18n="detDataFlow">Data Flow</span></h4>
              <div class="flex items-center justify-center gap-3 flex-wrap">
                <div class="flex items-center gap-2 px-4 py-2.5 rounded-xl" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.15);"><i class="fas fa-paper-plane" style="color:#fbbf24;"></i><span class="text-sm font-semibold" style="color:#fbbf24;" data-i18n="detOriginateLabel">Originate</span></div>
                <i class="fas fa-long-arrow-alt-right" style="color:#2A5E58;"></i>
                <div class="flex items-center gap-2 px-4 py-2.5 rounded-xl" style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.15);"><i class="fas fa-filter" style="color:#22d3ee;"></i><span class="text-sm font-semibold" style="color:#22d3ee;" data-i18n="detAssessLabel">Assess Sieves</span></div>
                <i class="fas fa-long-arrow-alt-right" style="color:#2A5E58;"></i>
                <div class="flex items-center gap-2 px-4 py-2.5 rounded-xl" style="background:rgba(46,196,182,0.12);border:2px solid rgba(46,196,182,0.3);"><i class="fas fa-hand-pointer" style="color:#3DD8CA;"></i><span class="text-sm font-bold" style="color:#3DD8CA;" data-i18n="detDealLabel">Deal Connect (This Page)</span></div>
                <i class="fas fa-long-arrow-alt-right" style="color:#2A5E58;"></i>
                <div class="flex items-center gap-2 px-4 py-2.5 rounded-xl" style="background:rgba(100,116,139,0.08);border:1px solid rgba(100,116,139,0.15);"><i class="fas fa-file-contract" style="color:#94a3b8;"></i><span class="text-sm font-semibold" style="color:#94a3b8;" data-i18n="detTermsLabel">Terms Connect</span></div>
              </div>
            </div>
            <p class="mt-4 text-xs" style="color:#3D7A70;"><i class="fas fa-question-circle mr-1"></i><span data-i18n="detFirstTime">First time?</span> <button onclick="showOnboarding()" class="underline font-medium" style="color:#3DD8CA;" data-i18n="detViewGuide">View user guide</button></p>
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
          <button onclick="goBack()" class="back-btn flex items-center px-2.5 py-1.5 text-[#8EBDB5] hover:text-[#3DD8CA] rounded-lg text-sm"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium" data-i18n="navBack">Back</span></button>
          <div class="border-l border-[rgba(46,196,182,0.12)] pl-3">
            <div class="flex items-center space-x-2"><span id="detailMCN" class="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded" style="background: rgba(46,196,182,0.1); color: #3DD8CA; border: 1px solid rgba(46,196,182,0.2);">MCN-XX-XX-0000-0000</span><h1 class="font-bold text-[#E8F5F3] text-sm" id="detailTitle">Project Name</h1><span id="detailStatus" class="badge badge-warning">Pending</span></div>
            <p class="text-xs text-[#5A9A90]"><span class="source-tag source-originate"><i class="fas fa-paper-plane"></i>Originate</span> <span id="detailIndustry">Industry</span> · <span id="detailDate">Date</span></p>
          </div>
        </div>
        <div class="flex items-center space-x-1.5">
          <button onclick="showToast('info',t('toastShare'),t('toastShareMsg'))" class="tooltip p-1.5 hover:bg-[rgba(46,196,182,0.06)] rounded-lg text-[#5A9A90] text-sm" data-tip="Share"><i class="fas fa-share-alt"></i></button>
          <button onclick="showToast('info',t('toastBookmark'),t('toastBookmarkMsg'))" class="tooltip p-1.5 hover:bg-[rgba(46,196,182,0.06)] rounded-lg text-[#5A9A90] text-sm" data-tip="Bookmark"><i class="fas fa-bookmark"></i></button>
          <div class="w-px h-6 bg-[rgba(46,196,182,0.1)] mx-1"></div>
          <button onclick="expressIntent()" id="btnExpressIntent" class="btn-primary text-xs py-1.5 px-4" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);"><i class="fas fa-hand-point-up mr-1"></i><span data-i18n="btnSubscribe">Express Interest</span></button>
        </div>
      </div>
    </nav>
    <div class="flex flex-1 overflow-hidden">
      <!-- Left: Deal Info -->
      <div class="w-2/5 border-r border-[rgba(46,196,182,0.12)] flex flex-col bg-[#0F2E2B] overflow-y-auto">
        <div class="p-5" id="detailLeft">
          <div class="text-center py-8 text-[#3D7A70]"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><p class="text-sm" data-i18n="loadingText">Loading...</p></div>
        </div>
      </div>
      <!-- Right: Analysis (Sieve Assessment Results) -->
      <div class="w-3/5 flex flex-col overflow-y-auto" style="background:rgba(11,30,28,0.95);">
        <div class="p-3 border-b border-[rgba(46,196,182,0.12)] bg-[#0F2E2B] flex items-center justify-between">
          <div class="flex items-center space-x-2"><span class="text-sm font-semibold text-[#B0D5CF]"><i class="fas fa-chart-pie mr-1.5 text-[#2EC4B6]"></i><span data-i18n="detAssessTitle">Contract Assessment</span></span></div>
          <div class="flex bg-[rgba(46,196,182,0.06)] rounded-lg p-0.5">
            <button onclick="switchDetailView('sieve')" id="btnSieve" class="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#0F2E2B] shadow text-[#3DD8CA]"><i class="fas fa-crosshairs mr-1"></i><span data-i18n="detTabRadar">Radar Assessment</span></button>
            <button onclick="switchDetailView('financials')" id="btnFinancials" class="px-2.5 py-1 rounded-md text-xs font-semibold text-[#8EBDB5]"><i class="fas fa-calculator mr-1"></i><span data-i18n="detTabFinancials">Financials</span></button>
            <button onclick="switchDetailView('timeline')" id="btnTimeline" class="px-2.5 py-1 rounded-md text-xs font-semibold text-[#8EBDB5]"><i class="fas fa-stream mr-1"></i><span data-i18n="detTabTimeline">Timeline</span></button>
          </div>
        </div>
        <div class="flex-1 p-5" id="detailRight">
          <div class="text-center py-16 text-[#3D7A70]"><i class="fas fa-chart-area text-4xl mb-3 opacity-40"></i><p class="text-sm" data-i18n="detRightEmpty">Select a contract to view sieve assessment report</p></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page: My Contracts ==================== -->
  <div id="pageMyContracts" class="page flex-col min-h-screen grid-bg">
    <nav class="px-5 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goToDashboard()" class="back-btn flex items-center px-2.5 py-1.5 text-[#8EBDB5] hover:text-[#3DD8CA] rounded-lg text-sm"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium" data-i18n="navBackBoard">Back to Board</span></button>
          <div class="border-l border-[rgba(46,196,182,0.12)] pl-3">
            <h1 class="text-base font-bold text-[#E8F5F3]"><i class="fas fa-file-contract mr-1.5 text-emerald-500"></i><span data-i18n="myContractsTitle">My Contracts</span></h1>
            <p class="text-xs text-[#3D7A70]" id="myContractsSubtitle">Subscribed 0 contracts · Total investment ¥0</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <input type="text" id="mcSearchInput" placeholder="Search contract/MCN..." data-i18n="mcSearchPlaceholder" data-i18n-attr="placeholder" class="search-input px-3 py-1.5 border border-[rgba(46,196,182,0.12)] rounded-lg text-xs bg-[#0F2E2B] w-52" oninput="renderMyContracts()">
          <select class="px-3 py-1.5 border border-[rgba(46,196,182,0.12)] rounded-lg text-xs bg-[#0F2E2B]" id="mcFilterIndustry" onchange="renderMyContracts()">
            <option value="all" data-i18n="abStep1All">All Industries</option>
          </select>
          <select class="px-3 py-1.5 border border-[rgba(46,196,182,0.12)] rounded-lg text-xs bg-[#0F2E2B]" id="mcSortBy" onchange="renderMyContracts()">
            <option value="date" data-i18n="myContractsSortDate">By subscription date</option>
            <option value="score" data-i18n="myContractsSortAI">By AI score</option>
            <option value="yield" data-i18n="myContractsSortShare">By revenue share</option>
            <option value="project" data-i18n="sortByProject">By project</option>
          </select>
        </div>
      </div>
    </nav>
    <div class="flex-1 p-4">
      <div class="max-w-7xl mx-auto">
        <!-- Stats Overview -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5" id="mcStatsGrid"></div>
        <!-- Contract List -->
        <div id="mcGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"></div>
        <!-- Empty State -->
        <div id="mcEmpty" class="hidden text-center py-16">
          <div class="empty-state-icon mx-auto animate-float"><i class="fas fa-file-contract"></i></div>
          <h3 class="text-xl font-bold text-[#E8F5F3] mb-2" data-i18n="mcEmptyTitle">No Contracts Yet</h3>
          <p class="text-sm text-[#5A9A90] mb-4" data-i18n="mcEmptyDesc">You have not subscribed to any contracts yet. Browse the contract board to find opportunities.</p>
          <button onclick="goToDashboard()" class="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium shadow-lg shadow-[rgba(46,196,182,0.15)]"><i class="fas fa-shopping-cart mr-2"></i><span data-i18n="mcEmptyBtn">Subscribe Now</span></button>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page: My Portfolios ==================== -->
  <div id="pageMyPortfolios" class="page flex-col min-h-screen grid-bg">
    <nav class="px-5 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goToDashboard()" class="back-btn flex items-center px-2.5 py-1.5 text-[#8EBDB5] hover:text-[#3DD8CA] rounded-lg text-sm"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium" data-i18n="navBackBoard">Back to Board</span></button>
          <div class="border-l border-[rgba(46,196,182,0.12)] pl-3">
            <h1 class="text-base font-bold text-[#E8F5F3]"><i class="fas fa-object-group mr-1.5 text-[#8B5CF6]"></i><span data-i18n="myPortfoliosTitle">My Portfolios</span></h1>
            <p class="text-xs text-[#3D7A70]" id="myPortfoliosSubtitle">0 portfolios · 0 contracts · Total investment ¥0</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <div class="px-3 py-1.5 bg-[rgba(139,92,246,0.06)] rounded-lg border border-[rgba(139,92,246,0.12)] text-xs text-[#A78BFA] font-medium"><i class="fas fa-info-circle mr-1"></i><span data-i18n="mpInfoBar">Cross-project fund portfolios · Intelligently configured by investment philosophy and theme</span></div>
        </div>
      </div>
    </nav>
    <div class="flex-1 p-4">
      <div class="max-w-7xl mx-auto">
        <!-- Portfolio Filter Bar -->
        <div class="flex items-center gap-2 mb-4 flex-wrap">
          <button onclick="filterPortfoliosByCategory('all')" class="mp-filter-btn active px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="all"><i class="fas fa-th mr-1"></i><span data-i18n="mpFilterAll">All</span></button>
          <button onclick="filterPortfoliosByCategory('Conservative')" class="mp-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="Conservative"><i class="fas fa-shield-alt mr-1"></i><span data-i18n="mpCatConservative">Conservative</span></button>
          <button onclick="filterPortfoliosByCategory('Aggressive')" class="mp-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="Aggressive"><i class="fas fa-rocket mr-1"></i><span data-i18n="mpCatAggressive">Aggressive</span></button>
          <button onclick="filterPortfoliosByCategory('Balanced')" class="mp-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="Balanced"><i class="fas fa-balance-scale mr-1"></i><span data-i18n="mpCatBalanced">Balanced</span></button>
          <button onclick="filterPortfoliosByCategory('Thematic')" class="mp-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="Thematic"><i class="fas fa-bullseye mr-1"></i><span data-i18n="mpCatThematic">Thematic</span></button>
          <button onclick="filterPortfoliosByCategory('Industry')" class="mp-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all" data-cat="Industry"><i class="fas fa-industry mr-1"></i><span data-i18n="mpCatSector">Industry</span></button>
        </div>
        <!-- Portfolio Stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5" id="mpStatsGrid"></div>
        <!-- Portfolio List -->
        <div id="mpGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"></div>
        <!-- Empty State -->
        <div id="mpEmpty" class="hidden text-center py-16">
          <div class="empty-state-icon mx-auto animate-float"><i class="fas fa-object-group"></i></div>
          <h3 class="text-xl font-bold text-[#E8F5F3] mb-2" data-i18n="mpEmptyTitle">No Portfolios Yet</h3>
          <p class="text-sm text-[#5A9A90] mb-4" data-i18n="mpEmptyDesc">Portfolios are automatically generated after subscribing to contracts</p>
          <button onclick="goToDashboard()" class="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium shadow-lg shadow-[rgba(46,196,182,0.15)]"><i class="fas fa-shopping-cart mr-2"></i><span data-i18n="mpEmptyBtn">Subscribe to Contracts</span></button>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page: Portfolio Detail ==================== -->
  <div id="pagePortfolioDetail" class="page flex-col h-screen grid-bg">
    <nav class="px-4 py-2.5 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goToMyPortfolios()" class="back-btn flex items-center px-2.5 py-1.5 text-[#8EBDB5] hover:text-[#3DD8CA] rounded-lg text-sm"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium" data-i18n="navBackPortfolios">Back to Portfolios</span></button>
          <div class="border-l border-[rgba(46,196,182,0.12)] pl-3">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" id="pdIconBox" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"><i class="fas fa-object-group text-white text-sm" id="pdIcon"></i></div>
              <div>
                <div class="flex items-center gap-2"><h1 class="font-bold text-[#E8F5F3] text-sm" id="pdTitle">Portfolio Name</h1><span id="pdCategoryBadge" class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:rgba(139,92,246,0.12);color:#a78bfa;">Conservative</span></div>
                <p class="text-xs text-[#5A9A90]" id="pdSubtitle">0 contracts · 0 projects · Total ¥0</p>
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
      <!-- Left: Portfolio Overview -->
      <div class="w-2/5 border-r border-[rgba(46,196,182,0.12)] flex flex-col bg-[#0F2E2B] overflow-y-auto">
        <div class="p-5" id="pdLeft">
          <div class="text-center py-8 text-[#3D7A70]"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><p class="text-sm" data-i18n="loadingText">Loading...</p></div>
        </div>
      </div>
      <!-- Right: Portfolio Radar + Contract List -->
      <div class="w-3/5 flex flex-col overflow-y-auto" style="background:rgba(11,30,28,0.95);">
        <div class="p-3 border-b border-[rgba(46,196,182,0.12)] bg-[#0F2E2B] flex items-center justify-between">
          <span class="text-sm font-semibold text-[#B0D5CF]"><i class="fas fa-chart-pie mr-1.5 text-[#8B5CF6]"></i><span data-i18n="pdWeightedTitle">Portfolio Weighted Analysis</span></span>
          <span class="text-xs text-[#3D7A70]" id="pdWeightNote" data-i18n="pdWeightNote">Cross-project equal-weight analysis</span>
        </div>
        <div class="flex-1 p-5" id="pdRight">
          <div class="text-center py-16 text-[#3D7A70]"><i class="fas fa-chart-area text-4xl mb-3 opacity-40"></i><p class="text-sm" data-i18n="loadingPortfolio">Loading portfolio analysis...</p></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page: AI Portfolio Builder ==================== -->
  <div id="pageAIBuilder" class="page flex-col h-screen" style="background: #0B1E1C;">
    <!-- Nav -->
    <nav class="px-5 py-2.5 flex-shrink-0" style="background: rgba(13,36,34,0.95); backdrop-filter: blur(20px) saturate(180%); border-bottom: 1px solid rgba(46,196,182,0.1);">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goToDashboard()" class="back-btn flex items-center px-2.5 py-1.5 rounded-lg text-sm transition-all text-[#5A9A90] hover:text-[#3DD8CA]"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium" data-i18n="detailBack">Back to Board</span></button>
          <div class="border-l pl-3" style="border-color: rgba(46,196,182,0.12);">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, #5DC4B3, #3D8F83); box-shadow: 0 4px 12px rgba(93,196,179,0.35);"><i class="fas fa-magic text-white text-sm"></i></div>
              <div><h1 class="text-sm font-bold text-[#E8F5F3]" data-i18n="abTitle">AI Portfolio Architect</h1><p class="text-xs" style="color: #5A9A90; font-family:'Montserrat',sans-serif; letter-spacing:0.05em; font-size:9px;" data-i18n="abSub">PORTFOLIO ARCHITECT · PILOT</p></div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-full text-xs font-medium" style="background: rgba(245,158,11,0.1); color: #FBBF24; border: 1px solid rgba(245,158,11,0.2);"><i class="fas fa-flask mr-1"></i><span data-i18n="abPilot">PILOT</span></span>
          <button onclick="resetAIBuilder()" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-[#3D7A70] hover:text-red-500 hover:border-[rgba(239,68,68,0.3)]" style="border: 1px solid rgba(46,196,182,0.12);"><i class="fas fa-redo mr-1"></i><span data-i18n="abRestart">Start Over</span></button>
        </div>
      </div>
    </nav>

    <!-- Main Content: Left Chat + Right Portfolio -->
    <div class="flex flex-1 overflow-hidden">
      <!-- ===== Left: AI Chat Area ===== -->
      <div class="w-2/5 flex flex-col bg-[#0F2E2B]" style="border-right: 1px solid rgba(46,196,182,0.1);">
        <!-- Chat Messages Area -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4" id="abMessages" style="scroll-behavior: smooth; background: linear-gradient(180deg, #0B1E1C 0%, #0D2422 100%);">
          <!-- Initial Welcome -->
          <div class="flex items-start gap-3 animate-fade-in" id="abWelcome">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, #5DC4B3, #3D8F83); box-shadow: 0 4px 12px rgba(93,196,179,0.3);"><i class="fas fa-robot text-white text-sm"></i></div>
            <div class="flex-1">
              <div class="p-4 rounded-2xl rounded-tl-md bg-[#0F2E2B]" style="border: 1px solid rgba(46,196,182,0.1); box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                <p class="text-sm text-[#E8F5F3] leading-relaxed mb-3" data-i18n="abNlpWelcome1">Hello! I am the <span style="color: #3DD8CA; font-weight: 700;">Deal Connect AI Portfolio Architect</span>.</p>
                <p class="text-sm leading-relaxed mb-3 text-[#5A9A90]" data-i18n="abNlpWelcome2">Tell me your investment needs in natural language. I'll analyze, confirm my logic with you, then <span style="color:#5eead4;">tailor-make</span> your portfolio.</p>
                <div class="p-3 rounded-xl mb-3" style="background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.15);">
                  <p class="text-xs font-semibold mb-2" style="color: #3DD8CA;" data-i18n="abNlpWelcome3">For example, you could say:</p>
                  <div class="space-y-1.5">
                    <p class="text-xs cursor-pointer transition-colors hover:text-[#3DD8CA]" style="color: #5A9A90;" onclick="document.getElementById('abInput').value=this.textContent.replace(/[「」\u201c\u201d]/g,'');document.getElementById('abInput').focus()"><span data-i18n="abNlpWelcomeEx1">「收益够高，风险平衡」</span></p>
                    <p class="text-xs cursor-pointer transition-colors hover:text-[#3DD8CA]" style="color: #5A9A90;" onclick="document.getElementById('abInput').value=this.textContent.replace(/[「」\u201c\u201d]/g,'');document.getElementById('abInput').focus()"><span data-i18n="abNlpWelcomeEx2">「看好科技和医疗，稳健为主」</span></p>
                    <p class="text-xs cursor-pointer transition-colors hover:text-[#3DD8CA]" style="color: #5A9A90;" onclick="document.getElementById('abInput').value=this.textContent.replace(/[「」\u201c\u201d]/g,'');document.getElementById('abInput').focus()"><span data-i18n="abNlpWelcomeEx3">「短期投资，预算3万」</span></p>
                  </div>
                </div>
                <p class="text-xs leading-relaxed text-[#5A9A90]" data-i18n="abNlpWelcomeHint">Or pick a quick style below ——</p>
              </div>
              <!-- Quick Options (kept as fallback) -->
              <div class="flex flex-wrap gap-2 mt-3" id="abQuickOptions">
                <button onclick="abSelectOption(t('abStep2Low'))" class="ab-quick-btn"><i class="fas fa-shield-alt mr-1.5 text-emerald-500"></i><span data-i18n="abStep2Low">Conservative</span></button>
                <button onclick="abSelectOption(t('abStep2High'))" class="ab-quick-btn"><i class="fas fa-rocket mr-1.5 text-amber-500"></i><span data-i18n="abStep2High">Aggressive</span></button>
                <button onclick="abSelectOption(t('abStep2Mid'))" class="ab-quick-btn"><i class="fas fa-balance-scale mr-1.5 text-blue-500"></i><span data-i18n="abStep2Mid">Balanced</span></button>
                <button onclick="abSelectOption(t('catSector'))" class="ab-quick-btn"><i class="fas fa-bullseye mr-1.5 text-pink-500"></i><span data-i18n="catSector">Industry</span></button>
              </div>
            </div>
          </div>
        </div>
        <!-- Input Area -->
        <div class="flex-shrink-0 p-4 bg-[#0F2E2B]" style="border-top: 1px solid rgba(46,196,182,0.1);">
          <div class="flex items-center gap-2">
            <div class="flex-1 relative">
              <input type="text" id="abInput" data-i18n="abInputPlaceholder" data-i18n-attr="placeholder" placeholder="用自然语言描述您的投资需求，如「收益够高，风险平衡」..." class="w-full px-4 py-3 pr-12 rounded-xl text-sm" style="background: #0F2E2B; border: 1px solid rgba(46,196,182,0.15); color: #E8F5F3;" onkeydown="if(event.key==='Enter')abSendMessage()">
            </div>
            <button onclick="abSendMessage()" class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all" style="background: linear-gradient(135deg, #5DC4B3, #3D8F83); box-shadow: 0 4px 12px rgba(93,196,179,0.3);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-paper-plane text-white text-sm"></i></button>
          </div>
          <p class="text-xs mt-2 text-center text-[#3D7A70]">AI analyzes your needs in real-time from <span id="abTotalContracts" class="font-semibold text-[#3DD8CA]">0</span> contracts</p>
        </div>
      </div>

      <!-- ===== Right: Real-time Portfolio Panel ===== -->
      <div class="w-3/5 flex flex-col overflow-y-auto" style="background: rgba(11,30,28,0.95);">
        <!-- Waiting state before portfolio generation -->
        <div id="abWaitingState" class="flex-1 flex items-center justify-center p-8">
          <div class="text-center max-w-md">
            <div class="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 ai-entry-icon" style="background: linear-gradient(135deg, rgba(93,196,179,0.1), rgba(46,196,182,0.06)); border: 1px dashed rgba(93,196,179,0.3);">
              <i class="fas fa-layer-group text-4xl" style="color: rgba(93,196,179,0.5);"></i>
            </div>
            <h3 class="text-lg font-bold text-[#E8F5F3] mb-2" style="letter-spacing: -0.02em;" data-i18n="abWaitTitle">Waiting for AI to Build Your Portfolio</h3>
            <p class="text-sm leading-relaxed text-[#5A9A90]" data-i18n="abWaitDesc">Chat with AI on the left to describe your investment preferences. AI will build a portfolio from all platform contracts based on your needs.</p>
            <div class="flex items-center justify-center gap-4 mt-6">
              <div class="flex items-center gap-1.5 text-[#3D7A70]"><div class="w-2 h-2 rounded-full" style="background: #5DC4B3;"></div><span id="abFlowStep1" class="text-xs" data-i18n="abFlowStep1">Style Preference</span></div>
              <i class="fas fa-long-arrow-alt-right text-[#2A5E58]"></i>
              <div class="flex items-center gap-1.5 text-[#3D7A70]"><div class="w-2 h-2 rounded-full" style="background: #06b6d4;"></div><span class="text-xs" id="abFlowStep2" data-i18n="abFlowStep2">Industry Selection</span></div>
              <i class="fas fa-long-arrow-alt-right text-[#2A5E58]"></i>
              <div class="flex items-center gap-1.5 text-[#3D7A70]"><div class="w-2 h-2 rounded-full" style="background: #10b981;"></div><span id="abFlowStep3" class="text-xs" data-i18n="abFlowStep3">Portfolio Generation</span></div>
            </div>
          </div>
        </div>

        <!-- Portfolio Result Panel (initially hidden) -->
        <div id="abPortfolioPanel" class="hidden flex-1 flex flex-col overflow-hidden">
          <!-- ===== Fixed top: One-click Purchase button ===== -->
          <div class="flex-shrink-0 px-5 py-3" style="background: rgba(11,30,28,0.98); border-bottom: 1px solid rgba(46,196,182,0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            <button onclick="abOneClickPurchase()" class="w-full py-3.5 rounded-xl text-sm font-bold transition-all btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 16px rgba(16,185,129,0.4);"><i class="fas fa-shopping-cart mr-2"></i><span data-i18n="abOneClickPurchase">Confirm & Subscribe All</span></button>
            <p class="text-xs text-center mt-2" style="color: #3D7A70;"><i class="fas fa-info-circle mr-1"></i><span data-i18n="abPurchaseHint">Continue chatting on the left to adjust portfolio in real-time</span></p>
          </div>

          <!-- ===== Scrollable: Header + Radar + Sector Mix + Contracts ===== -->
          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            <!-- Portfolio header -->
            <div class="rounded-2xl overflow-hidden" id="abPortfolioHeader">
              <div class="p-5 relative" style="background: linear-gradient(135deg, #0a2e2a 0%, #0f3d36 40%, #164e47 100%);">
                <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 30%, rgba(93,196,179,0.35) 0%, transparent 50%);pointer-events:none;"></div>
                <div class="relative z-10">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-xs font-bold" style="background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9);"><i class="fas fa-magic mr-1"></i><span data-i18n="abAIBuilt">AI Built</span></span>
                      <span class="px-2 py-0.5 rounded text-xs font-bold" style="background: rgba(16,185,129,0.2); color: #34d399;"><div class="inline-block w-1.5 h-1.5 rounded-full mr-1" style="background:#34d399; animation: pulse 2s infinite;"></div><span data-i18n="abPreviewTag">Live Preview</span></span>
                      <span class="text-xs" style="color: rgba(255,255,255,0.5);" id="abPortfolioMeta" data-i18n="abPortfolioMetaDefault">Real-time Generation</span>
                    </div>
                    <span class="px-3 py-1 rounded-xl text-sm font-bold" id="abGradeBadge" style="background: rgba(16,185,129,0.2); color: #34d399;">A · 82</span>
                  </div>
                  <h2 class="text-xl font-bold text-white mb-1" id="abPortfolioName" style="letter-spacing:-0.02em;" data-i18n="abPortfolioTitle">AI Recommended Portfolio</h2>
                  <p class="text-xs" style="color: rgba(255,255,255,0.5);" id="abPortfolioDesc" data-i18n="abPortfolioDescDefault">Intelligently generated based on your investment preferences</p>
                  <!-- Core Numbers -->
                  <div class="grid grid-cols-4 gap-2 mt-4" id="abCoreStats">
                    <div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.1);">
                      <p class="text-lg font-black text-white" id="abStatContracts">0</p>
                      <p style="font-size:9px; color: rgba(255,255,255,0.5);" data-i18n="abStatContractsLabel">Contracts</p>
                    </div>
                    <div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.1);">
                      <p class="text-lg font-black text-cyan-200" id="abStatProjects">0</p>
                      <p style="font-size:9px; color: rgba(255,255,255,0.5);" data-i18n="abStatProjectsLabel">Projects</p>
                    </div>
                    <div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.1);">
                      <p class="text-lg font-black text-amber-200" id="abStatValue">¥0</p>
                      <p style="font-size:9px; color: rgba(255,255,255,0.5);" data-i18n="abStatValueLabel">Total Investment</p>
                    </div>
                    <div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.1);">
                      <p class="text-lg font-black text-emerald-200" id="abStatReturn">0%</p>
                      <p style="font-size:9px; color: rgba(255,255,255,0.5);" data-i18n="abStatReturnLabel">Expected Return</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Radar Chart -->
            <div class="rounded-2xl overflow-hidden bg-[#0F2E2B]" style="border: 1px solid rgba(46,196,182,0.1); box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
              <div class="p-4 flex items-center justify-between" style="border-bottom: 1px solid rgba(46,196,182,0.08);">
                <span class="text-sm font-bold text-[#E8F5F3]"><i class="fas fa-chart-pie mr-1.5 text-[#2EC4B6]"></i><span data-i18n="abRadarTitle">Portfolio Radar Assessment</span></span>
                <span class="text-xs text-[#3D7A70]" data-i18n="abRadar8Dim">4 Dimensions · 8 Indicators</span>
              </div>
              <div class="flex items-center justify-center py-4 px-2">
                <canvas id="abRadarCanvas" style="max-width:100%;"></canvas>
              </div>
              <div class="px-4 pb-4">
                <div class="grid grid-cols-4 gap-2" id="abDimGrid"></div>
              </div>
            </div>

            <!-- Industry Mix -->
            <div class="rounded-2xl p-4 bg-[#0F2E2B]" style="border: 1px solid rgba(46,196,182,0.1); box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
              <h3 class="text-sm font-bold text-[#E8F5F3] mb-3"><i class="fas fa-chart-bar mr-1.5 text-cyan-500"></i><span data-i18n="abIndustryTitle">Sector Allocation</span></h3>
              <div id="abIndustryDistrib" class="space-y-2"></div>
            </div>

            <!-- Contract List -->
            <div class="rounded-2xl p-4 bg-[#0F2E2B]" style="border: 1px solid rgba(46,196,182,0.1); box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-[#E8F5F3]"><i class="fas fa-list mr-1.5 text-emerald-500"></i><span data-i18n="abContractListTitle">Recommended Contracts</span></h3>
                <span class="text-xs text-[#3D7A70]" id="abContractCount">0</span>
              </div>
              <div class="space-y-2" id="abContractList"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Confirm Dialog ==================== -->
  <div id="confirmModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]">
    <div class="bg-[#0F2E2B] rounded-2xl max-w-sm w-full mx-4 overflow-hidden animate-scale-in">
      <div class="confirm-dialog" style="padding:32px; text-align:center;">
        <div id="confirmIcon" class="confirm-icon warning" style="width:56px;height:56px;margin:0 auto 16px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(245,158,11,0.1);"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:24px;"></i></div>
        <h3 id="confirmTitle" class="text-lg font-bold text-[#E8F5F3] mb-2" data-i18n="confirmTitle">Confirm Action</h3>
        <p id="confirmMessage" class="text-sm text-[#5A9A90] mb-6" data-i18n="confirmMsg">Are you sure you want to proceed?</p>
        <div class="flex gap-3 justify-center"><button onclick="hideConfirm()" class="btn-secondary rounded-xl px-5 py-2" data-i18n="confirmCancel">Cancel</button><button id="confirmAction" onclick="hideConfirm()" class="btn-primary rounded-xl px-5 py-2" data-i18n="confirmOk">Confirm</button></div>
      </div>
    </div>
  </div>

  <!-- ==================== AI Builder Global FAB ==================== -->
  <div id="aiBuilderFab" class="ai-builder-fab hidden" onclick="goToAIBuilder()">
    <i class="fas fa-magic"></i>
    <span class="fab-badge">AI</span>
    <div class="fab-ring"></div>
    <div class="ai-builder-fab-tooltip">
      <div style="font-size:12px;font-weight:700;color:#5eead4;" data-i18n="fabTitle">AI Portfolio Builder</div>
      <div style="font-size:10px;color:#5A9A90;margin-top:2px;" data-i18n="fabDesc">Chat with AI, build portfolios in one click</div>
    </div>
  </div>

  <!-- ==================== AI Assistant FAB ==================== -->
  <div id="aiFab" class="ai-assistant-fab hidden" onclick="toggleAIChat()"><i class="fas fa-robot"></i></div>
  <div id="aiChat" class="ai-chat-window hidden">
    <div class="ai-chat-header"><div class="flex items-center space-x-2"><i class="fas fa-robot text-white"></i><span class="text-white font-semibold text-sm" data-i18n="aiChatTitle">Deal Connect AI Assistant</span></div><button onclick="toggleAIChat()" class="text-white/80 hover:text-white"><i class="fas fa-times"></i></button></div>
    <div class="ai-chat-messages" id="aiMessages">
      <div class="ai-message assistant"><div class="ai-message-avatar"><i class="fas fa-robot"></i></div><div class="ai-message-content" data-i18n="aiChatWelcome">Hello! I am the Deal Connect AI Assistant. Ask me about sieve models, project assessments, or the participation process.</div></div>
    </div>
    <div class="ai-chat-input" style="padding:16px; border-top:1px solid rgba(46,196,182,0.1); background:#0F2E2B;">
      <div class="flex items-center gap-2">
        <input type="text" id="aiInput" placeholder="e.g., Which sieve suits me?" data-i18n="aiAssistPlaceholder" data-i18n-attr="placeholder" class="flex-1 px-3 py-2 border border-[rgba(46,196,182,0.12)] rounded-xl text-sm" onkeydown="if(event.key==='Enter')sendAIMsg()">
        <button onclick="sendAIMsg()" class="btn-primary px-3 py-2 rounded-xl text-sm"><i class="fas fa-paper-plane"></i></button>
      </div>
    </div>
  </div>

  <!-- ==================== JavaScript ==================== -->
  <script>
    // ==================== i18n Internationalization System ====================
    let currentLang = localStorage.getItem('dc_lang') || 'en';

    const i18n = {
      zh: {
        // Nav
        navDashboard: '看板', navContracts: '合约', navPortfolios: '组合', navAIBuilder: 'AI 组合',
        navProfile: '个人中心', navSievePrefs: '筛子偏好设置', navOnboarding: '新手引导', navLogout: '退出登录',
        // Ticker
        tickerSourceVal: '发起通', tickerFilterVal: '评估通',
        // Welcome
        welcomeBack: '欢迎回来',
        welcomeSubDefault: '发起通的投资机会，经您的评估通筛子精选后展示于此',
        welcomeSubHolding: '持有 {mine} 张合约 · {portfolios} 个组合 · 使用筛子精选您的下一个投资机会',
        welcomeSubExplore: '{total} 张合约待您探索 · 使用筛子精选您的下一个投资机会',
        // Stats
        statContractsDesc: '平台全部合约', statDealsDesc: '已完成交易', statMyPosDesc: '已认购张数', statPortfoliosDesc: '投资组合',
        statAIBuilderAction: '点击开始构建 →',
        // AI Entry
        aiEntryTitle: 'AI 智能组合构建器', aiEntryPilot: '试点功能',
        aiEntryDesc: '与 AI 对话，智能匹配全平台合约 · 一键构建您的专属投资组合',
        aiEntryFeature1: '智能风控匹配', aiEntryFeature2: '多维度评估', aiEntryFeature3: '一键认购',
        aiEntryContractsLabel: '可选合约', aiEntryProjectsLabel: '覆盖项目',
        aiEntryHint: '点击体验 AI 构建您的专属组合',
        // Spotlight
        spotlightTitle: '✨ 体验 AI 组合构建器',
        spotlightSub: '与 AI 对话 · 智能匹配 · 一键构建投资组合',
        spotlightDismiss: '点击任意空白处继续浏览',
        navBack: '返回', navBackBoard: '返回看板', navBackPortfolios: '返回组合',
        mcEmptyTitle: '暂无合约', mcEmptyDesc: '浏览看板并认购合约，认购后将在这里显示', mcEmptyBtn: '去认购',
        mpEmptyTitle: '暂无组合', mpEmptyDesc: '认购合约后将自动生成投资组合', mpEmptyBtn: '去认购合约',
        detRightEmpty: '选择一张合约查看筛子评估报告',
        pdWeightNote: '跨项目等权重分析',
        aiChatTitle: 'Deal Connect AI 助手',
        // Sieve
        sieveTitle: '评估通 · AI筛子', sieveSub: '选择筛子模型过滤机会，不选则展示全部',
        sieveAll: '全部机会', sieveManage: '管理筛子',
        sieveIndustry: '行业偏好筛子', sieveRisk: '风控优先筛子', sieveReturn: '高回报筛子',
        sieveComposite: '综合评估筛子',
        sieveIndustryDesc: '基于您的行业投资偏好（餐饮、零售、科技），筛选符合行业方向的项目',
        sieveRiskDesc: '严格风控标准：AI评分>=8.5、金额<=800万、有明确退出机制的低风险项目',
        sieveReturnDesc: '聚焦高回报项目：分成比例>=12%、AI评分>=8.0的高潜力机会',
        sieveCompositeDesc: '多因子加权评估：综合AI评分、风控、回报的全能型评估',
        // Filter
        filterSearch: '搜索项目、MCN编号...',
        filterAll: '全部状态', filterAvailable: '可认购', filterSold: '已认购', filterMine: '我的',
        // Deal Card
        dealOrigin: '发起通', dealRSN: '收益分享合约',
        dealAIScore: 'AI评分', dealRevenueShare: '分成比例', dealPeriod: '合约期限',
        dealMonthlyIncome: '预估月收', dealFaceValue: '合约面值',
        dealAvailable: '可认购', dealSold: '已认购', dealMine: '已持有',
        dealSubscribe: '认购', dealViewDetail: '查看详情',
        // Detail
        detailBack: '返回看板', detailProjectInfo: '项目信息', detailContractInfo: '合约核心信息',
        detailRadarTitle: '多维雷达评估', detailRadar8Dim: '回报·风险·管控·收益 4维·8指标',
        detailOverallScore: '综合评分', detailDimDetail: '维度详评',
        detailSieveOverview: '筛子匹配概览', detailSieveResults: '各筛子检验结果',
        detailIncomeTitle: '收入预测', detailTimeline: '项目流程时间线',
        detailExpandAll: '全部展开',
        // Subscription
        subTitle: '确认认购', subContractInfo: '合约信息', subMCN: 'MCN合约编号',
        subFaceValue: '合约面值', subRevenueShare: '收益分享', subPeriod: '合约期限',
        subAIScore: 'AI评分', subCancel: '取消', subConfirm: '确认认购',
        subSuccess: '认购成功', subSuccessMsg: '合约已加入您的持仓',
        // My Contracts
        myContractsTitle: '我的合约', myContractsSub: '我的合约',
        myContractsSummary: '合约摘要', myContractsTotal: '总持仓', myContractsValue: '总价值',
        myContractsAvgAI: '平均AI评分', myContractsAvgShare: '平均分成',
        myContractsFilterAll: '全部', myContractsFilterActive: '生效中', myContractsFilterPending: '待生效',
        myContractsSortAI: 'AI评分', myContractsSortDate: '认购日期', myContractsSortShare: '分成比例',
        myContractsEmpty: '暂无持仓合约', myContractsEmptyAction: '前往看板认购',
        // My Portfolios
        myPortfoliosTitle: '我的组合', myPortfoliosSub: '我的组合',
        myPortfoliosFilterAll: '全部组合',
        pfContracts: '合约', pfProjects: '项目', pfValue: '组合价值', pfAvgAI: '均分',
        pfTargetReturn: '目标回报', pfPeriod: '投资周期', pfStrategy: '投资策略',
        pfEmpty: '暂无投资组合', pfEmptyAction: '认购合约后自动生成组合',
        // Portfolio Detail
        pdBack: '返回组合', pdOverview: '组合概览', pdRadarTitle: '组合雷达评估',
        pdDimDetail: '维度详评', pdContractDist: '合约分布',
        pdContracts: '合约数', pdProjects: '项目数', pdValue: '组合价值', pdAvgAI: 'AI均分',
        pdAvgYield: '年化收益', pdAvgDays: '平均期限',
        // AI Builder
        abTitle: 'AI 组合构建器', abSub: '组合构建器 · 试点',
        abPilot: '试点功能', abReset: '重置',
        abWelcome1: '您好！我是 <span style="color:#3DD8CA;font-weight:700;">参与通 AI 组合构建器</span>。',
        abWelcome2: '我会通过几个简单的问题了解您的投资偏好，然后从全平台合约中智能筛选，为您构建个性化的投资组合。',
        abWelcome3: '首先，您对哪些 <span style="color:#5eead4;">行业</span> 感兴趣？',
        abTotalContracts: '全平台可匹配合约',
        abInputPlaceholder: '用自然语言描述您的投资需求，如「收益够高，风险平衡」...',
        abStatus: '由参与通AI模型驱动 · 投资建议仅供参考',
        abWaitTitle: '等待 AI 构建您的专属组合',
        abWaitDesc: '在左侧与 AI 对话后，您的专属投资组合将在此呈现',
        abPortfolioTitle: 'AI 推荐组合', abPortfolioGrade: '综合评级',
        abRadarTitle: '组合雷达评估', abRadar8Dim: '回报·风险·管控·收益 4维·8指标',
        abIndustryTitle: '行业配比', abContractListTitle: '推荐合约清单',
        abApply: '一键认购全部', abRefine: '继续调整',
        abOneClickPurchase: '确认认购全部合约', abPurchaseHint: '左侧继续对话可实时调整组合',
        abLivePreview: '🔄 实时预览已更新', abAutoBuilding: '正在根据您的偏好实时构建...',
        abPurchaseConfirmTitle: '确认认购', abPurchaseConfirmMsg: '确认认购该组合中的所有可用合约？',
        abPurchaseSuccess: '认购成功！', abPurchaseSuccessMsg: '已成功认购 {count} 张合约，总金额 ¥{total}',
        abPreviewTag: '实时预览', abPreviewUpdated: '组合已根据您的最新偏好更新',
        abApplySuccess: '认购成功', abApplySuccessMsg: '{count} 张合约已加入您的持仓',
        // AI Builder Steps
        abStep1Q: '请选择您感兴趣的行业：',
        abStep1All: '全部行业',
        abStep2Q: '了解！接下来，您的 <span style="color:#5eead4;">风险偏好</span> 是？',
        abStep2Low: '稳健型', abStep2LowD: '低风险·年化 7-10%',
        abStep2Mid: '均衡型', abStep2MidD: '中等风险·年化 10-14%',
        abStep2High: '进取型', abStep2HighD: '较高风险·年化 14%+',
        abStep3Q: '收到！您期望的 <span style="color:#5eead4;">投资期限</span> 是？',
        abStep3Short: '短期', abStep3ShortD: '≤24个月',
        abStep3Mid: '中期', abStep3MidD: '24-30个月',
        abStep3Long: '长期', abStep3LongD: '≥30个月',
        abStep4Q: '最后一步！您的 <span style="color:#5eead4;">预算范围</span> 是？',
        abStep4Small: '轻量级', abStep4SmallD: '¥5,000-¥20,000',
        abStep4Mid: '标准', abStep4MidD: '¥20,000-¥50,000',
        abStep4Large: '重仓', abStep4LargeD: '¥50,000+',
        abBuildingMsg: '正在为您构建投资组合...',
        abBuildingDetail: '分析中：{industries} 行业 · {risk} · 预算 {budget}',
        abNoMatch: '抱歉，当前筛选条件下没有匹配的合约。请尝试调整条件。',
        abRestart: '重新选择',
        // AB dialogue flow
        abStyleConservative: '稳健守护', abStyleAggressive: '进取猎手', abStyleBalanced: '均衡优选', abStyleSector: '行业先锋', abStyleAIDefault: 'AI智选',
        abGotStyle: '收到！您倾向于 ', abStyleStrategy: ' 投资策略。',
        abNextIndustry: '接下来，',
        abIndustryConfirmed: '好的，行业方向已明确 ✅ 我正在筛选匹配的合约。',
        abRiskConfirmed: '风险偏好已记录 📊 组合正在优化中...',
        abPeriodConfirmed: '期限偏好已确认 ⏱️',
        abCompleteTitle: '🎉 您的专属投资组合已构建完成！',
        abCompleteDesc: '右侧面板展示了 AI 根据您的偏好从 {total} 张全平台合约中精选的组合。',
        abCompleteHint: '您可以继续与我对话来微调组合，例如「减少餐饮比例」「加入更多科技合约」「降低风险」等。',
        abSatisfied: '满意，去认购', abReduceRisk: '减少风险', abAddTech: '加入更多科技',
        abAdjusted: '已根据您的要求重新调整组合 🔄',
        abAdjustedDesc: '当前组合包含 {contracts} 张合约，覆盖 {industries} 个行业。右侧面板已更新。',
        abAdjustedHint: '继续输入可进一步微调，或点击「一键认购」完成。',
        abContinueRefine: '继续调整',
        abAllIndustries: '不限行业，全面配置',
        abAllIndustriesConfirm: '全行业配置 🌐 我会从所有行业中均衡筛选。',
        abSelected: '选择了: ', abSelectedConfirm: '已选择 ',
        abRiskPref: '风险偏好 → ', abPeriodPref: '期限偏好 → ',
        abRiskLowLabel: '低风险 · 年化 7-10%', abRiskMidLabel: '中等风险 · 年化 10-14%', abRiskHighLabel: '较高风险 · 年化 14%+',
        abPeriodShortLabel: '短期 ≤24个月', abPeriodMidLabel: '中期 24-30个月', abPeriodLongLabel: '长期 30个月+',
        abPortfolioDescTpl: '基于您的投资偏好从 {total} 张合约中智能生成',
        abPortfolioMetaTpl: '第 {step}/5 步 · 实时演进',
        abContractUnit: '', abContractUnitMore: '张合约未展示',
        abApplyEmptyTitle: '组合为空', abApplyEmptyMsg: '请先通过对话构建组合',
        abApplySuccessTitle: '一键认购成功！', abApplySuccessMsgFull: '已认购 {count} 张合约 · 总投入 ¥{total}，可在「我的合约」中查看',
        abRefineTitle: '继续调整', abRefineMsg: '在输入框中描述您的调整需求',
        abResetDone: '已重置', abResetDoneMsg: 'AI 组合构建器已重新开始',
        abResetWelcome: '好的，我们重新开始！',
        abResetQ: '您这次投资最看重什么？',
        abResetOpt1: '稳定收益，安全第一', abResetOpt2: '愿承担风险，追高回报', abResetOpt3: '攻守兼备，均衡配置', abResetOpt4: '看好特定行业，集中布局',
        // Smart NLP Confirm Card
        abNlpTitle: '📋 我理解到的配置逻辑',
        abNlpSubtitle: '请确认以下配置是否符合您的意图，可点击任意项修改：',
        abNlpStyle: '投资风格', abNlpRisk: '风险偏好', abNlpReturn: '收益目标',
        abNlpIndustry: '行业偏好', abNlpPeriod: '投资期限', abNlpBudget: '预算规模',
        abNlpConfirm: '✅ 确认，开始构建', abNlpModify: '🔧 我要修改',
        abNlpAnalysis: '💡 配置解读',
        abNlpParsing: '正在分析您的需求...',
        abNlpNoMatch: '我没有完全理解您的意思，能否再描述得具体一些？比如：',
        abNlpExamples: '「收益要高一些，风险能接受中等」 · 「看好科技和医疗，短期为主」 · 「预算5万，稳定收益优先」',
        abNlpStyleConservative: '🛡️ 稳健守护', abNlpStyleAggressive: '🚀 进取猎手', abNlpStyleBalanced: '⚖️ 均衡优选', abNlpStyleSector: '🎯 行业先锋',
        abNlpRiskLow: '低风险', abNlpRiskMed: '中等风险', abNlpRiskHigh: '较高风险',
        abNlpReturnLow: '年化 7-10%', abNlpReturnMed: '年化 10-14%', abNlpReturnHigh: '年化 14%+',
        abNlpPeriodShort: '短期 ≤24月', abNlpPeriodMed: '中期 24-30月', abNlpPeriodLong: '长期 ≥30月',
        abNlpBudgetSmall: '¥5k-2万', abNlpBudgetMed: '¥2万-5万', abNlpBudgetLarge: '¥5万+',
        abNlpAllIndustry: '全行业配置',
        abNlpConfirmed: '✅ 配置已确认！正在为您定制组合...',
        abNlpWelcome1: '您好！我是 <span style="color:#3DD8CA;font-weight:700;">参与通 AI 组合构建器</span>。',
        abNlpWelcome2: '请用自然语言告诉我您的投资需求，我会分析后跟您确认配置逻辑，再为您<span style="color:#5eead4;">量身定制</span>投资组合。',
        abNlpWelcome3: '比如您可以说：',
        abNlpWelcomeEx1: '「收益够高，风险平衡」',
        abNlpWelcomeEx2: '「看好科技和医疗，稳健为主」',
        abNlpWelcomeEx3: '「短期投资，预算3万」',
        abNlpWelcomeHint: '或者直接选择一个快速风格 ——',
        abNlpLogicExplain: '🧠 我的挑选逻辑',
        abNlpFilterStep1: '第1步 · 行业筛选',
        abNlpFilterStep2: '第2步 · 风控过滤',
        abNlpFilterStep3: '第3步 · 收益匹配',
        abNlpFilterStep4: '第4步 · 期限适配',
        abNlpFilterStep5: '第5步 · 多样化配置',
        abNlpFilterDesc1: '从 {total} 张合约中筛选 {industry} 行业',
        abNlpFilterDesc2: 'AI评分 ≥ {score}，风控等级 {grade}',
        abNlpFilterDesc3: '年化收益 {range}',
        abNlpFilterDesc4: '合约期限 {period}',
        abNlpFilterDesc5: '每项目最多 {max} 张，确保分散化',
        abNlpAdjustIntro: '收到！根据您的调整要求，我重新分析了配置逻辑：',
        // AI followup & explain
        abAiThinking: 'AI 正在思考...',
        abAiFollowupIntro: '我捕捉到了您的部分偏好，但还需要更多信息来精准配置：',
        abAiFollowupQ: '请回答以下问题，帮我完善您的配置：',
        abAiExplainTitle: '📊 AI 组合解读',
        abAiHighlights: '✨ 亮点',
        abAiRisks: '⚠️ 风险提示',
        abAiSuggestion: '💡 优化建议',
        abAiExplainLoading: 'AI 正在分析您的组合...',
        abAiAnswerMore: '继续回答',
        abAiSkipBuild: '跳过，先用这些配置构建',
        abAiPartialConfig: '已识别的偏好：',
        abAiMissingHint: '还差几项关键信息（点击维度可手动设置）：',
        abAiStreamError: 'AI 响应中断，已切换到本地分析',
        // Portfolio detail more
        pdInvested: '总投入', pdAnnualYield: '年化收益率', pdWeightedShare: '加权分成 ',
        pdAvgContract: '平均合约时长', pdDayUnit: '天', pdAboutMonths: '约 {n} 个月',
        pdAvgAIScore: 'AI评分均值', pdTargetHorizon: '目标期限',
        pdSectorAlloc: '行业配比 · {n} 个行业', pdSectorsLabel: '覆盖行业：',
        pdStrategyAcross: ' | 跨 {projects} 个项目配置 {contracts} 张合约',
        pdHoldings: '组合持仓明细 · 按项目分组',
        pdWeightedRadarSub: '跨 {projects} 个项目 · {contracts} 张合约等权重加权',
        pdDimWeightedDetail: '各维度加权详解', pdScoreDist: '合约评分分布',
        // Onboarding
        obStartBtn: '开始使用', obNextBtn: '下一步', obPrevBtn: '上一步', obSkipBtn: '跳过引导',
        obWelcomeTitle: '欢迎使用 Deal Connect', obWelcomeDesc: '智能投资机遇看板 — 精准匹配，高效参与',
        obOriginate: '发起通', obOriginateDesc: '项目来源', obAssess: '评估通', obAssessDesc: 'AI 筛选', obDeal: '参与通', obDealDesc: '您的选择',
        obStep1Tag: '数据来源', obStep1Title: '来自发起通的投资机会', obStep1Desc: '融资方通过发起通上传经营数据和融资计划，生成标准化投资机会。这些项目经过预审后流入参与通。',
        obStep1Check1: '标准化数据', obStep1Check2: '实时更新',
        obStep2Tag: '智能筛选', obStep2Title: '来自评估通的AI筛子', obStep2Desc: '评估通提供多种AI筛选模型（筛子），每种有不同评估标准。选择筛子只显示通过的机会；不选则查看全部。',
        obStep2Chip1: '行业偏好', obStep2Chip2: '风控优先', obStep2Chip3: '高回报',
        obStep3Tag: '项目参与', obStep3Title: '筛选后精准参与', obStep3Desc: '在筛选后的优质机会中，查看详细评估报告，比较项目，表达认购意向。后续进入条款协商和合约签署。',
        obStep3Flow1: '浏览筛选结果', obStep3Flow2: '表达意向', obStep3Flow3: '进入条款',
        // selectSieve
        sieveShowAll: '展示全部 ', sieveOpportunities: ' 个机会', sievePassed: '通过 ', sieveFiltered: '筛选出 ', sieveMatchOpp: ' 个匹配机会',
        // AI Chat
        aiChatResponses: '当前筛子筛选出机会，可切换其他筛子模型。',
        // initApp
        loadStep1: '连接发起通数据...', loadStep2: '加载评估通筛子...', loadStep3: '初始化参与通看板...', loadStep4: '准备就绪',
        // refreshDashboard
        abFlowStep1: '风格偏好', abFlowStep2: '行业选择', abFlowStep3: '组合生成',
        abStatusTpl: 'AI 实时分析您的需求，从 {count} 张合约中智能配置',
        abIndustryQ: '有哪些行业是您特别看好的？可以选择多个。',
        abRiskQ: '您期望的投资回报和风险级别是？',
        abPeriodQ: '您倾向的投资期限是？',
        abBudgetQ: '您计划投入多少资金？（每张合约 ¥1,000）',
        abIndDining: '餐饮美食', abIndTech: '科技创新', abIndHealth: '医疗健康', abIndRetail: '零售消费', abIndEdu: '教育培训', abIndEnter: '演艺娱乐',
        abIndAll: '不限行业，全面配置',
        // Radar Dims (二级标签名称)
        dimReturnIntensity: '回报强度', dimReturnQuality: '回报质量', dimVolatilityControl: '波动可控性',
        dimCashFlowReliability: '现金流可靠性', dimLifecycleVisibility: '生命周期可见性',
        dimLeverageControl: 'Leverage管控力', dimAutoReport: '自动报数和打款', dimProfitMargin: '生意的利润率',
        // 一级标签
        catReturn: '回报', catRisk: '风险', catControl: '管控够不够', catAdequacy: '收益够不够',
        // Industries
        indDining: '餐饮', indRetail: '零售', indTech: '科技', indEducation: '教育', indHealth: '医疗', indEntertainment: '娱乐',
        // Portfolio Categories
        catConservative: '稳健型', catAggressive: '进取型', catBalanced: '均衡型', catThematic: '主题型', catSector: '行业型',
        // Common
        months: '个月', wan: '万',
        confirmTitle: '确认操作', confirmMsg: '确定要执行此操作吗？', confirmCancel: '取消', confirmOk: '确认',
        // Onboarding
        obTitle: '欢迎使用 参与通', obSkip: '跳过', obNext: '下一步', obStart: '开始探索',
        // Toast
        toastLoginSuccess: '登录成功', toastLogout: '已安全退出',
        toastGuestWelcome: '游客模式', toastGuestMsg: '已加载 {contracts} 张虚拟合约（{projects} 个项目），请自由体验',
        toastSubscribeSuccess: '认购成功', toastSubscribeMsg: '合约已加入您的持仓',
        toastFeatureWIP: '功能开发中', toastSieveHint: '在评估通中管理您的筛子模型',
        // Auth
        authLogin: '登录', authRegister: '注册', authUsername: '用户名', authEmail: '邮箱',
        authPassword: '密码', authDisplayName: '显示名称', authPhone: '手机号码',
        authRoleInvestor: '投资者', authRoleManager: '管理者',
        authLoginBtn: '登录', authRegisterBtn: '创建账户',
        authGuestBtn: '游客快速体验', authGuestHint: '无需注册，一键体验全部功能', authOr: '或者',
        authSubtitle: '智能投资机遇平台',
        authUsernameEmail: '用户名 / 邮箱', authPlaceholderLogin: '请输入用户名或邮箱', authPlaceholderPwd: '请输入密码',
        authRemember: '记住我', authForgot: '忘记密码？', authEnterprise: '企业用户', authSSO: '企业SSO登录（即将上线）',
        authRegUsernameLabel: '用户名', authRegDisplayLabel: '显示名称', authRegEmailLabel: '邮箱', authRegPhoneLabel: '手机号码', authRegPwdLabel: '密码',
        authRegUsernamePh: '用于登录', authRegDisplayPh: '显示名称', authRegEmailPh: '您的邮箱', authRegPhonePh: '+86 138 0000 0000', authRegPwdPh: '至少6个字符',
        toastPwdReset: '密码重置', toastPwdResetMsg: '此功能即将上线',
        toastSSOTitle: 'SSO即将上线', toastSSOMsg: '企业统一认证接口已预留',
        toastIncomplete: '信息不完整', toastIncompleteMsg: '请输入用户名和密码',
        toastLoginFailed: '登录失败', toastNetworkError: '网络错误', toastNetworkErrorMsg: '请检查网络连接',
        toastRegFieldsMissing: '必填项缺失', toastPwdTooShort: '密码太短', toastPwdTooShortMsg: '至少6个字符',
        toastRegSuccess: '注册成功', toastRegSuccessMsg: '欢迎加入 Deal Connect！', toastRegFailed: '注册失败',
        toastLoginSuccessMsg: '欢迎回来，{name}', toastSignedOut: '已退出', toastSignedOutMsg: '您已安全退出',
        toastShare: '分享', toastShareMsg: '分享链接已复制', toastBookmark: '收藏', toastBookmarkMsg: '已添加到收藏夹',
        // Empty
        emptyDeals: '未发现匹配机会', emptyDealsAction: '试试切换筛子或加载演示数据',
        emptyConfigSieve: '配置筛子',
        // AI Assistant
        aiAssistTitle: 'Deal Connect AI 助手',
        aiAssistWelcome: '您好！我是参与通AI助手。您可以问我关于筛子模型、项目评估、参与流程等问题。',
        // Data
        monthlyRevenue: '月营收', employees: '员工', years: '年',
        totalAmount: '融资总额', issued: '发行', maturity: '到期',
        riskLow: '低', riskMedium: '中', riskHigh: '高',
        contractCount: '{n} 张', projectCount: '{n} 个项目',
        // Sieve Manager
        smTitle: '管理我的筛子', smSub: '从筛子库添加，或移除已有筛子',
        smLibrary: '筛子库', smAvailable: '{n} 个可用', smMySieves: '我的筛子', smAdded: '{n} 个已添加',
        smAlreadyAdded: '已添加', smAdd: '添加', smRemove: '移除', smDone: '完成',
        smEmptyTitle: '暂无筛子', smEmptySub: '从左侧筛子库中添加',
        smBuiltinHint: '「全部机会」为内置项，始终可用无需添加',
        // Sieve names (dynamic)
        sieveLocation: '区域聚焦筛子', sieveGrowth: '高成长筛子', sieveLargeScale: '大额项目筛子',
        sieveTeamStrength: '团队实力筛子', sieveQuickReturn: '短周期筛子', sieveSafeHaven: '稳健保守筛子',
        sieveLocationDesc: '聚焦一线城市（北京、上海、深圳、杭州）的优质项目',
        sieveGrowthDesc: '优选运营年限<=3年、月营收增速良好的高成长型早期项目',
        sieveLargeScaleDesc: '筛选投资金额>=500万的大体量、高门槛优质项目',
        sieveTeamStrengthDesc: '优选员工>=50人、运营年限>=3年的成熟团队项目',
        sieveQuickReturnDesc: '聚焦分成期限<=24个月的快速回收项目',
        sieveSafeHavenDesc: '极保守策略：风控评级A及以上、AI评分>=9.0、金额<=500万',
        sieveCatIndustry: '行业', sieveCatRisk: '风控', sieveCatReturn: '收益', sieveCatComposite: '综合',
        sieveCatLocation: '区域', sieveCatGrowth: '成长', sieveCatScale: '规模', sieveCatTeam: '团队',
        sieveCatCycle: '周期', sieveCatRiskCtrl: '风控',
        sieveAllDesc: '不使用筛子，展示发起通的所有投资机会',
        // Deal card dynamic
        dealSearchEmpty: '未找到「{keyword}」相关合约', dealSearchEmptyHint: '尝试换个关键词，或清空搜索查看全部',
        dealClearSearch: '清空搜索', dealOriginate: '发起通', dealSieve: '筛子',
        dealStatusAvailable: '可认购', dealStatusSold: '已认购',
        dealStatusMine: '·我', dealScoreTitle: '合约综合评分',
        // Detail page
        detMCNLabel: '合约身份编号', detIndustryLabel: '行业', detCityLabel: '城市', detIssueLabel: '发行', detTypeLabel: '类型',
        detFromOriginate: '来自发起通', detOriginator: '发起方：{name}',
        detContractInfo: '合约信息', detFaceValueFull: '合约面值 · 不可分割',
        detStatus: '状态', detHolder: '持有人', detNoHolder: '无（可认购）',
        detMyContract: '我的合约', detMyContractNote: '投入 ¥1,000 · MCN编号永久绑定',
        detProjectTotal: '项目总额', detShareRatio: '分成比例', detSharePeriod: '分成期限', detAIScoreLabel: 'AI评分',
        detBizData: '经营数据（发起通提供）', detAvgRevenue: '月均营收', detNoData: '暂无',
        detEmployeeCount: '员工人数', detOpYears: '运营年限', detRiskGrade: '风控评级', detMaturityDate: '到期日',
        detRadarTitle: '合约多维评估', detRadar8Dim: '回报·风险·管控·收益 4维8指标 · 综合评级',
        detDimDetail: '维度详解', detExpandAll: '全部展开', detScoringBasis: '评分依据',
        detAbovePct: '优于{pct}%同类合约', detAroundMedian: '处于中位数附近', detBelowPct: '低于{pct}%同类合约',
        detCurrentSieveMatch: '当前筛子匹配度',
        detHighMatch: '高度匹配，建议重点关注', detMidMatch: '中等匹配，可进一步了解', detLowMatch: '匹配度较低',
        detSieveEval: '筛子评估', detSievePass: '通过', detSieveFail: '未通过',
        detMatchPct: '{n}% 匹配度', detNoSieve: '暂未添加筛子', detGoManageSieve: '去管理筛子',
        detIncomeTitle: '收入预测', detMonthPrefix: '月',
        detTimelineTitle: '项目流向',
        detDataFlow: '数据流向', detOriginateLabel: '发起通', detAssessLabel: '评估通', detDealLabel: '参与通（当前页）', detTermsLabel: '条款通',
        detFirstTime: '第一次使用？', detViewGuide: '查看用户指南',
        detTL1: '发起通 — 项目提交', detTL2: '评估通 — AI筛选', detTL3: '参与通 — 当前阶段', detTL4: '条款通 → 合约通',
        detTL2Desc: '通过 {match}', detTL2DescBasic: '基础审核',
        detTL3Wait: '等待认购', detTL3Mine: '您已认购此合约', detTL3Sold: '已被认购',
        detTL4Desc: '确认参与后进入条款协商',
        // Subscribe modal
        subModalTitle: '认购合约', subFaceNote: '单张合约面值 · 不可分割',
        subShareLabel: '分成比例', subPeriodLabel: '分成期限',
        subNote: '认购后这张合约将归您所有，MCN编号永久绑定。在合约期内按约定比例分享收益。',
        subCancelBtn: '取消', subConfirmBtn: '确认认购 ¥1,000',
        subAlreadySold: '此合约已被认购', subSuccessDetail: '合约 {mcn} 已归您所有 · ¥1,000',
        // Express intent
        eiMyContract: '我的合约', eiMyContractMsg: '您持有此合约 · {mcn}',
        eiSold: '已售出', eiSoldMsg: '此合约已被其他投资者认购',
        // Detail button
        btnMyContract: '我的合约', btnSoldOut: '已售出', btnSubscribe: '认购此合约 ¥1,000',
        btnMyContractToast: '您持有此合约 · {mcn}',
        // Grade labels
        gradeExcellent: '卓越', gradeGood: '优秀', gradeAboveAvg: '良好', gradeAverage: '一般', gradeBelowAvg: '偏低', gradeRisky: '风险',
        gradeLevelSuffix: '水平',
        // Radar dims (dynamic) — 二级标签
        rdRiskRating: '波动可控性', rdHealthIndex: '生命周期可见性', rdAnnualROI: '回报强度', rdReturnAdequacy: '生意的利润率',
        rdUnitReturn: '回报质量', rdLeverage: '现金流可靠性', rdLabour: 'Leverage管控力', rdLand: '自动报数和打款',
        rdRiskRatingDesc: '波动可控性：综合风控等级评估（评级制），含信用风险、运营风险、市场风险；EL=PD×LGD',
        rdHealthIndexDesc: '生命周期可见性：合约时长 / 行业平均寿命，反映合约存续期是否合理匹配行业特征',
        rdAnnualROIDesc: '回报强度：年化投资回报率（Annual ROI），基于收益分成比例折算',
        rdReturnAdequacyDesc: '生意的利润率：合约回报 / 行业平均回报，>1表示优于行业水平；含DSCR安全垫',
        rdUnitReturnDesc: '回报质量：单位收益 = ROI / CAPEX，每一元投入产生多少回报；回本越快分越高',
        rdLeverageDesc: '现金流可靠性：融资规模 / 月营收比值评级，杠杆越低越健康',
        rdLabourDesc: 'Leverage管控力：团队规模 × 运营年限综合评级，反映人力治理成熟度',
        rdLandDesc: '自动报数和打款：分账自动化/数据审计/权限管控/执行预案评级',
        // Radar sub-labels
        rslRiskRating: '波动可控', rslHealthIndex: '生命周期', rslAnnualROI: '回报强度', rslReturnAdequacy: '利润率',
        rslUnitReturn: '回报质量', rslLeverage: '现金流', rslLabour: 'Leverage', rslLand: '自动报数',
        // My Contracts dynamic
        mcSubtitle: '已认购 {count} 张 · 总投入 ¥{total}',
        mcStatHolding: '持有合约', mcStatUnit: '', mcStatInvest: '总投入', mcStatInvestNote: '面值合计',
        mcStatProjects: '覆盖项目', mcStatProjectsNote: '个不同项目', mcStatAvgAI: '平均AI评分', mcStatAvgAINote: '加权平均',
        mcSubscribed: '已认购 ¥1,000',
        // My Portfolios dynamic
        mpSubtitle: '共 {count} 个组合 · 覆盖 {contracts} 张合约',
        mpContracts: '合约', mpProjects: '项目', mpTargetReturn: '目标回报', mpPeriod: '投资周期',
        mpStrategy: '投资策略', mpContractCountLabel: '张合约',
        mpCatConservative: '稳健型', mpCatAggressive: '进取型', mpCatBalanced: '均衡型', mpCatThematic: '主题型', mpCatSector: '行业型',
        mpFilterAll: '全部',
        mpRiskLow: '低风险', mpRiskMedHigh: '中高风险', mpRiskHigh: '高风险', mpRiskMedium: '中等风险',
        // Portfolio Detail dynamic
        pdSubtitle: '{contracts} 张合约 · 覆盖 {projects} 个项目',
        pdRadar8Dim: '回报·风险·管控·收益 4维·8指标',
        pdOverallScore: '综合评分',
        pdWeightedRadar: '组合加权雷达图',
        pdContractList: '组合内合约',
        pdContractEmpty: '该组合暂无匹配合约',
        pdContractCountSuffix: ' 张合约',
        // AI Builder dynamic
        abIndustryAll: '全部行业',
        abQuickStable: '稳定收益，安全第一', abQuickRisk: '愿承担风险，追高回报',
        abQuickBalanced: '攻守兼备，均衡配置', abQuickSector: '看好特定行业，集中布局',
        abUserMsg: '我选择：',
        abAIThinking: 'AI 正在分析您的需求...',
        abAnalyzing: '分析中：{detail}',
        abResultTitle: 'AI 推荐投资组合',
        abResultOverall: '综合评分', abResultGrade: '综合评级',
        abStrategyLabel: '投资策略',
        abStrategyDefault: '50%配置稳定消费类（餐饮零售）+ 50%科技成长类，攻守兼备的经典组合',

        // Header Stats
        statContractsLabel: '合约', statDealsLabel: '成交', statMyPosLabel: '我的持仓', statPortfoliosLabel: '组合', statAIBuilderLabel: 'AI 构建器',
        // Contract Board
        boardTitle: '合约看板', boardShowing: '· 展示全部',
        // Card labels
        cardFace: '面值', cardYield: '收益', cardTerm: '期限', cardRisk: '评级', cardBuy: '认购',
        // Search
        searchPlaceholder: '搜索项目名称...',
        sortByProject: '按项目',
        // Ticker bar
        tickerSourceLabel: '来源', tickerFilterLabel: '筛选',
        // Empty state (no data)
        emptyTitle: '等待来自发起通的投资机会', emptyDesc: '融资方通过发起通上传项目，经评估通AI筛选后在此展示',
        emptyLoadDemo: '加载演示数据', emptyLoadDemoDesc: '使用模拟数据体验全部功能，感受筛子筛选后的项目',
        emptySieveConfig: '配置您的筛子', emptySieveConfigDesc: '在评估通中设置AI筛选标准，自动展示匹配的投资机会',
        // Detail page tabs
        detAssessTitle: '合约评估', detTabRadar: '雷达评估', detTabFinancials: '财务分析', detTabTimeline: '时间线',
        // My Contracts search
        mcSearchPlaceholder: '搜索合约/MCN编号...',
        // Portfolio info bar
        mpInfoBar: '跨项目基金组合 · 按投资理念与主题智能配置',
        // Portfolio weighted
        pdWeightedTitle: '组合加权分析',
        // AI Builder stats labels
        abStatContractsLabel: '合约数', abStatProjectsLabel: '覆盖项目', abStatValueLabel: '总投资额', abStatReturnLabel: '预期回报',
        // FAB tooltip
        fabTitle: 'AI 组合构建器', fabDesc: '与AI对话，一键构建投资组合',
        // AI Chat
        aiChatWelcome: '您好！我是 Deal Connect AI 助手。可以询问我关于筛子模型、项目评估或参与流程的问题。',
        aiAssistPlaceholder: '例如：哪个筛子适合我？',
        // AI Builder welcome Q
        abWelcome2Q: '我们从一个简单的问题开始 ——',
        sieveSelectHint: '选择筛子查看描述',
        abPortfolioMetaDefault: '实时生成',
        abPortfolioDescDefault: '基于您的投资偏好智能生成',
        loadingText: '加载中...', loadingPortfolio: '正在加载组合分析...',
        abAIBuilt: 'AI 构建',
      },
      en: {
        // Nav
        navDashboard: 'Dashboard', navContracts: 'Contracts', navPortfolios: 'Portfolios', navAIBuilder: 'AI Portfolio',
        navProfile: 'Profile', navSievePrefs: 'Sieve Preferences', navOnboarding: 'Quick Start', navLogout: 'Sign Out',
        // Ticker
        tickerSourceVal: 'Originate', tickerFilterVal: 'Assess',
        // Welcome
        welcomeBack: 'Welcome back',
        welcomeSubDefault: 'Investment opportunities from Originate, curated by your Assess AI sieves',
        welcomeSubHolding: 'Holding {mine} contracts · {portfolios} portfolios · Use sieves to find your next opportunity',
        welcomeSubExplore: '{total} contracts to explore · Use sieves to find your next opportunity',
        // Stats
        statContractsDesc: 'Total Platform Contracts', statDealsDesc: 'Completed Transactions', statMyPosDesc: 'Subscribed Contracts', statPortfoliosDesc: 'Investment Portfolios',
        statAIBuilderAction: 'Start building →',
        // AI Entry
        aiEntryTitle: 'AI Portfolio Architect', aiEntryPilot: 'PILOT',
        aiEntryDesc: 'Converse with AI to match contracts platform-wide · Build your personalized portfolio in one click',
        aiEntryFeature1: 'Smart Risk Matching', aiEntryFeature2: 'Multi-Dimension Analysis', aiEntryFeature3: 'One-Click Subscribe',
        aiEntryContractsLabel: 'Available Contracts', aiEntryProjectsLabel: 'Covered Projects',
        aiEntryHint: 'Click to build your personalized portfolio with AI',
        // Spotlight
        spotlightTitle: '✨ Try the AI Portfolio Architect',
        spotlightSub: 'AI-Powered · Smart Matching · Build Your Portfolio in One Click',
        spotlightDismiss: 'Click anywhere to dismiss',
        navBack: 'Back', navBackBoard: 'Back to Board', navBackPortfolios: 'Back to Portfolios',
        mcEmptyTitle: 'No Contracts Yet', mcEmptyDesc: 'Browse the board and subscribe to contracts', mcEmptyBtn: 'Subscribe Now',
        mpEmptyTitle: 'No Portfolios Yet', mpEmptyDesc: 'Portfolios are automatically generated after subscribing to contracts', mpEmptyBtn: 'Subscribe to Contracts',
        detRightEmpty: 'Select a contract to view sieve assessment report',
        pdWeightNote: 'Cross-project equal-weight analysis',
        aiChatTitle: 'Deal Connect AI Assistant',
        // Sieve
        sieveTitle: 'Assess · AI Sieves', sieveSub: 'Select a sieve model to filter opportunities, or view all',
        sieveAll: 'All Opportunities', sieveManage: 'Manage Sieves',
        sieveIndustry: 'Industry Preference Sieve', sieveRisk: 'Risk-First Sieve', sieveReturn: 'High Return Sieve',
        sieveComposite: 'Composite Assessment Sieve',
        sieveIndustryDesc: 'Filters by your preferred industries (F&B, Retail, Technology)',
        sieveRiskDesc: 'Strict risk controls: AI Score ≥8.5, Raise ≤¥8M, clear exit mechanisms',
        sieveReturnDesc: 'Targets high-return opportunities: Revenue share ≥12%, AI Score ≥8.0',
        sieveCompositeDesc: 'Multi-factor weighted assessment: comprehensive AI, risk, and return scoring',
        // Filter
        filterSearch: 'Search projects, MCN codes...',
        filterAll: 'All Status', filterAvailable: 'Available', filterSold: 'Subscribed', filterMine: 'My Holdings',
        // Deal Card
        dealOrigin: 'Originate', dealRSN: 'Revenue Share Note',
        dealAIScore: 'AI Score', dealRevenueShare: 'Revenue Share', dealPeriod: 'Contract Term',
        dealMonthlyIncome: 'Est. Monthly Income', dealFaceValue: 'Face Value',
        dealAvailable: 'Available', dealSold: 'Subscribed', dealMine: 'Held',
        dealSubscribe: 'Subscribe', dealViewDetail: 'View Details',
        // Detail
        detailBack: 'Back to Dashboard', detailProjectInfo: 'Project Information', detailContractInfo: 'Contract Key Metrics',
        detailRadarTitle: 'Multi-Dimension Radar Analysis', detailRadar8Dim: 'Return·Risk·Control·Adequacy · 4 Dimensions 8 Indicators',
        detailOverallScore: 'Overall Score', detailDimDetail: 'Dimension Breakdown',
        detailSieveOverview: 'Sieve Match Overview', detailSieveResults: 'Individual Sieve Results',
        detailIncomeTitle: 'Income Projection', detailTimeline: 'Project Timeline',
        detailExpandAll: 'Expand All',
        // Subscription
        subTitle: 'Confirm Subscription', subContractInfo: 'Contract Details', subMCN: 'MCN Contract ID',
        subFaceValue: 'Face Value', subRevenueShare: 'Revenue Share', subPeriod: 'Contract Term',
        subAIScore: 'AI Score', subCancel: 'Cancel', subConfirm: 'Confirm Subscription',
        subSuccess: 'Subscription Successful', subSuccessMsg: 'Contract added to your holdings',
        // My Contracts
        myContractsTitle: 'My Contracts', myContractsSub: 'MY CONTRACTS',
        myContractsSummary: 'Contract Summary', myContractsTotal: 'Total Holdings', myContractsValue: 'Total Value',
        myContractsAvgAI: 'Avg AI Score', myContractsAvgShare: 'Avg Revenue Share',
        myContractsFilterAll: 'All', myContractsFilterActive: 'Active', myContractsFilterPending: 'Pending',
        myContractsSortAI: 'AI Score', myContractsSortDate: 'Subscribe Date', myContractsSortShare: 'Revenue Share',
        myContractsEmpty: 'No contracts in holdings', myContractsEmptyAction: 'Go to Dashboard to subscribe',
        // My Portfolios
        myPortfoliosTitle: 'My Portfolios', myPortfoliosSub: 'MY PORTFOLIOS',
        myPortfoliosFilterAll: 'All Portfolios',
        pfContracts: 'Contracts', pfProjects: 'Projects', pfValue: 'Portfolio Value', pfAvgAI: 'Avg Score',
        pfTargetReturn: 'Target Return', pfPeriod: 'Investment Horizon', pfStrategy: 'Investment Strategy',
        pfEmpty: 'No portfolios yet', pfEmptyAction: 'Portfolios are auto-generated after subscribing',
        // Portfolio Detail
        pdBack: 'Back to Portfolios', pdOverview: 'Portfolio Overview', pdRadarTitle: 'Portfolio Radar Analysis',
        pdDimDetail: 'Dimension Breakdown', pdContractDist: 'Contract Distribution',
        pdContracts: 'Contracts', pdProjects: 'Projects', pdValue: 'Portfolio Value', pdAvgAI: 'AI Avg Score',
        pdAvgYield: 'Annualized Yield', pdAvgDays: 'Avg Term',
        // AI Builder
        abTitle: 'AI Portfolio Architect', abSub: 'PORTFOLIO ARCHITECT · PILOT',
        abPilot: 'PILOT', abReset: 'Reset',
        abWelcome1: 'Hello! I am the <span style="color:#3DD8CA;font-weight:700;">Deal Connect AI Portfolio Architect</span>.',
        abWelcome2: "I'll ask a few simple questions about your investment preferences, then intelligently screen contracts across the platform to construct your personalized portfolio.",
        abWelcome3: 'First, which <span style="color:#5eead4;">industries</span> interest you?',
        abTotalContracts: 'Platform-wide Matchable Contracts',
        abInputPlaceholder: 'Describe your needs naturally, e.g. "high returns, balanced risk"...',
        abStatus: 'Powered by Deal Connect AI · Investment advice for reference only',
        abWaitTitle: 'Awaiting AI Portfolio Construction',
        abWaitDesc: 'Converse with AI on the left, and your personalized portfolio will appear here',
        abPortfolioTitle: 'AI Recommended Portfolio', abPortfolioGrade: 'Overall Rating',
        abRadarTitle: 'Portfolio Radar Analysis', abRadar8Dim: 'Return·Risk·Control·Adequacy · 4 Dimensions 8 Indicators',
        abIndustryTitle: 'Sector Allocation', abContractListTitle: 'Recommended Contracts',
        abApply: 'Subscribe All Contracts', abRefine: 'Continue Refining',
        abOneClickPurchase: 'Confirm & Subscribe All', abPurchaseHint: 'Keep chatting on the left to adjust portfolio in real-time',
        abLivePreview: '🔄 Live preview updated', abAutoBuilding: 'Building in real-time based on your preferences...',
        abPurchaseConfirmTitle: 'Confirm Subscription', abPurchaseConfirmMsg: 'Subscribe to all available contracts in this portfolio?',
        abPurchaseSuccess: 'Subscribed!', abPurchaseSuccessMsg: 'Successfully subscribed to {count} contracts, total ¥{total}',
        abPreviewTag: 'Live Preview', abPreviewUpdated: 'Portfolio updated based on your latest preferences',
        abApplySuccess: 'Subscription Successful', abApplySuccessMsg: '{count} contracts added to your holdings',
        // AI Builder Steps
        abStep1Q: 'Which industries are you interested in?',
        abStep1All: 'All Industries',
        abStep2Q: 'Great! What is your <span style="color:#5eead4;">risk appetite</span>?',
        abStep2Low: 'Conservative', abStep2LowD: 'Low risk · 7-10% annualized',
        abStep2Mid: 'Balanced', abStep2MidD: 'Moderate risk · 10-14% annualized',
        abStep2High: 'Aggressive', abStep2HighD: 'Higher risk · 14%+ annualized',
        abStep3Q: 'Noted! What is your preferred <span style="color:#5eead4;">investment horizon</span>?',
        abStep3Short: 'Short-term', abStep3ShortD: '≤24 months',
        abStep3Mid: 'Medium-term', abStep3MidD: '24-30 months',
        abStep3Long: 'Long-term', abStep3LongD: '≥30 months',
        abStep4Q: 'Final step! What is your <span style="color:#5eead4;">target allocation</span>?',
        abStep4Small: 'Light', abStep4SmallD: '¥5,000-¥20,000',
        abStep4Mid: 'Standard', abStep4MidD: '¥20,000-¥50,000',
        abStep4Large: 'Heavy', abStep4LargeD: '¥50,000+',
        abBuildingMsg: 'Constructing your portfolio...',
        abBuildingDetail: 'Analyzing: {industries} sector · {risk} · Budget {budget}',
        abNoMatch: 'No contracts match your criteria. Please try adjusting your preferences.',
        abRestart: 'Start Over',
        // AB dialogue flow
        abStyleConservative: 'Conservative Guard', abStyleAggressive: 'Aggressive Hunter', abStyleBalanced: 'Balanced Select', abStyleSector: 'Sector Pioneer', abStyleAIDefault: 'AI Select',
        abGotStyle: 'Got it! You prefer a ', abStyleStrategy: ' investment strategy.',
        abNextIndustry: 'Next up, ',
        abIndustryConfirmed: 'Great, sector direction is set ✅ Screening matching contracts now.',
        abRiskConfirmed: 'Risk appetite recorded 📊 Optimizing portfolio...',
        abPeriodConfirmed: 'Horizon preference confirmed ⏱️',
        abCompleteTitle: '🎉 Your personalized portfolio is ready!',
        abCompleteDesc: 'The right panel shows contracts AI-selected from {total} platform-wide contracts based on your preferences.',
        abCompleteHint: 'Continue chatting to fine-tune, e.g. "reduce F&B allocation", "add more tech contracts", "lower risk" etc.',
        abSatisfied: 'Satisfied, subscribe', abReduceRisk: 'Reduce Risk', abAddTech: 'Add More Tech',
        abAdjusted: 'Portfolio readjusted per your request 🔄',
        abAdjustedDesc: 'Current portfolio has {contracts} contracts across {industries} sectors. Right panel updated.',
        abAdjustedHint: 'Keep typing to refine further, or click "Subscribe All" to finalize.',
        abContinueRefine: 'Continue Refining',
        abAllIndustries: 'All sectors, diversified',
        abAllIndustriesConfirm: 'Full-sector allocation 🌐 I will screen evenly from all industries.',
        abSelected: 'Selected: ', abSelectedConfirm: 'Selected ',
        abRiskPref: 'Risk appetite → ', abPeriodPref: 'Horizon → ',
        abRiskLowLabel: 'Low risk · 7-10% annualized', abRiskMidLabel: 'Moderate risk · 10-14% annualized', abRiskHighLabel: 'Higher risk · 14%+ annualized',
        abPeriodShortLabel: 'Short-term ≤24mo', abPeriodMidLabel: 'Medium-term 24-30mo', abPeriodLongLabel: 'Long-term 30mo+',
        abPortfolioDescTpl: 'AI-generated from {total} contracts based on your preferences',
        abPortfolioMetaTpl: 'Step {step}/5 · Evolving',
        abContractUnit: '', abContractUnitMore: ' contracts not shown',
        abApplyEmptyTitle: 'Portfolio Empty', abApplyEmptyMsg: 'Please build a portfolio through conversation first',
        abApplySuccessTitle: 'Batch Subscription Successful!', abApplySuccessMsgFull: 'Subscribed {count} contracts · Total ¥{total} — view in My Contracts',
        abRefineTitle: 'Continue Refining', abRefineMsg: 'Describe your adjustment needs in the input box',
        abResetDone: 'Reset', abResetDoneMsg: 'AI Portfolio Architect has restarted',
        abResetWelcome: "OK, let's start fresh!",
        abResetQ: 'What matters most in your investment this time?',
        abResetOpt1: 'Stable returns, safety first', abResetOpt2: 'Willing to take risks for high returns', abResetOpt3: 'Balanced approach', abResetOpt4: 'Bullish on specific sectors',
        // Smart NLP Confirm Card
        abNlpTitle: '📋 AI Configuration Analysis',
        abNlpSubtitle: 'Please confirm the configuration below. Click any item to modify:',
        abNlpStyle: 'Investment Style', abNlpRisk: 'Risk Appetite', abNlpReturn: 'Return Target',
        abNlpIndustry: 'Sector Focus', abNlpPeriod: 'Investment Horizon', abNlpBudget: 'Budget Scale',
        abNlpConfirm: '✅ Confirm & Build', abNlpModify: '🔧 Modify',
        abNlpAnalysis: '💡 Configuration Analysis',
        abNlpParsing: 'Analyzing your requirements...',
        abNlpNoMatch: "I didn't fully understand your request. Could you be more specific? For example:",
        abNlpExamples: '"High returns with balanced risk" · "Bullish on tech and healthcare, conservative approach" · "Budget 50K, stable returns priority"',
        abNlpStyleConservative: '🛡️ Conservative Guard', abNlpStyleAggressive: '🚀 Aggressive Hunter', abNlpStyleBalanced: '⚖️ Balanced Select', abNlpStyleSector: '🎯 Sector Pioneer',
        abNlpRiskLow: 'Low Risk', abNlpRiskMed: 'Moderate Risk', abNlpRiskHigh: 'Higher Risk',
        abNlpReturnLow: '7-10% annualized', abNlpReturnMed: '10-14% annualized', abNlpReturnHigh: '14%+ annualized',
        abNlpPeriodShort: 'Short ≤24mo', abNlpPeriodMed: 'Medium 24-30mo', abNlpPeriodLong: 'Long ≥30mo',
        abNlpBudgetSmall: '¥5k-20k', abNlpBudgetMed: '¥20k-50k', abNlpBudgetLarge: '¥50k+',
        abNlpAllIndustry: 'All Sectors',
        abNlpConfirmed: '✅ Configuration confirmed! Building your custom portfolio...',
        abNlpWelcome1: 'Hello! I am the <span style="color:#3DD8CA;font-weight:700;">Deal Connect AI Portfolio Architect</span>.',
        abNlpWelcome2: 'Tell me your investment needs in natural language. I will analyze, confirm my logic with you, then <span style="color:#5eead4;">tailor-make</span> your portfolio.',
        abNlpWelcome3: 'For example, you could say:',
        abNlpWelcomeEx1: '"High returns with balanced risk"',
        abNlpWelcomeEx2: '"Bullish on tech and healthcare, conservative approach"',
        abNlpWelcomeEx3: '"Short-term investment, budget 30K"',
        abNlpWelcomeHint: 'Or pick a quick style below ——',
        abNlpLogicExplain: '🧠 My Selection Logic',
        abNlpFilterStep1: 'Step 1 · Sector Screening',
        abNlpFilterStep2: 'Step 2 · Risk Filtering',
        abNlpFilterStep3: 'Step 3 · Return Matching',
        abNlpFilterStep4: 'Step 4 · Horizon Matching',
        abNlpFilterStep5: 'Step 5 · Diversification',
        abNlpFilterDesc1: 'Screening {industry} sectors from {total} contracts',
        abNlpFilterDesc2: 'AI score ≥ {score}, risk grade {grade}',
        abNlpFilterDesc3: 'Annualized return {range}',
        abNlpFilterDesc4: 'Contract term {period}',
        abNlpFilterDesc5: 'Max {max} per project for diversification',
        abNlpAdjustIntro: 'Got it! Based on your adjustment, here is my updated configuration logic:',
        // AI followup & explain
        abAiThinking: 'AI is thinking...',
        abAiFollowupIntro: 'I have captured some of your preferences, but need a bit more to configure precisely:',
        abAiFollowupQ: 'Please answer these questions to complete your profile:',
        abAiExplainTitle: '📊 AI Portfolio Analysis',
        abAiHighlights: '✨ Highlights',
        abAiRisks: '⚠️ Risk Notes',
        abAiSuggestion: '💡 Optimization Tip',
        abAiExplainLoading: 'AI is analyzing your portfolio...',
        abAiAnswerMore: 'Answer More',
        abAiSkipBuild: 'Skip, build with current config',
        abAiPartialConfig: 'Identified preferences:',
        abAiMissingHint: 'Missing key dimensions (click to set manually):',
        abAiStreamError: 'AI response interrupted, switched to local analysis',
        // Portfolio detail more
        pdInvested: 'Invested', pdAnnualYield: 'Annualized Yield', pdWeightedShare: 'Weighted share ',
        pdAvgContract: 'Avg Contract Term', pdDayUnit: 'd', pdAboutMonths: '~{n} months',
        pdAvgAIScore: 'AI Score Avg', pdTargetHorizon: 'Target Horizon',
        pdSectorAlloc: 'Sector Allocation · {n} sectors', pdSectorsLabel: 'Sectors: ',
        pdStrategyAcross: ' | {projects} projects, {contracts} contracts',
        pdHoldings: 'Holdings by Project',
        pdWeightedRadarSub: '{projects} projects · {contracts} contracts equally weighted',
        pdDimWeightedDetail: 'Weighted Dimension Analysis', pdScoreDist: 'Contract Score Distribution',
        // Onboarding
        obStartBtn: 'Get Started', obNextBtn: 'Next', obPrevBtn: 'Previous', obSkipBtn: 'Skip Tutorial',
        obWelcomeTitle: 'Welcome to Deal Connect', obWelcomeDesc: 'Intelligent opportunity board for investors — Precise matching, efficient participation',
        obOriginate: 'Originate', obOriginateDesc: 'Deal Source', obAssess: 'Assess Sieves', obAssessDesc: 'AI Filtering', obDeal: 'Deal Decision', obDealDesc: 'Your Choice',
        obStep1Tag: 'DATA SOURCE', obStep1Title: 'Opportunities from Originate', obStep1Desc: 'Fundraisers upload business data and plans through Originate, generating standardized investment opportunities. These are pre-screened before flowing into Deal Connect.',
        obStep1Check1: 'Standardized Data', obStep1Check2: 'Real-time Updates',
        obStep2Tag: 'SMART FILTERING', obStep2Title: 'AI Sieves from Assess', obStep2Desc: 'Assess provides multiple AI filtering models (sieves), each with different evaluation criteria. Select a sieve to show only passing opportunities; select none to view all.',
        obStep2Chip1: 'Industry Pref.', obStep2Chip2: 'Risk-First', obStep2Chip3: 'High Return',
        obStep3Tag: 'DEAL PARTICIPATION', obStep3Title: 'Precise Participation After Filtering', obStep3Desc: 'Among filtered high-quality opportunities, review detailed assessment reports, compare deals, and express interest. Next steps flow into Terms and Contracts.',
        obStep3Flow1: 'Browse Filtered', obStep3Flow2: 'Express Interest', obStep3Flow3: 'Enter Terms',
        // selectSieve
        sieveShowAll: 'Showing all ', sieveOpportunities: ' opportunities', sievePassed: 'Passed ', sieveFiltered: 'Filtered ', sieveMatchOpp: ' matching opportunities',
        // AI Chat
        aiChatResponses: 'Current sieve filtered opportunities. Switch to other sieve models for different results.',
        // initApp
        loadStep1: 'Connecting to Originate data...', loadStep2: 'Loading Assess sieve models...', loadStep3: 'Initializing Deal Connect dashboard...', loadStep4: 'Ready',
        // refreshDashboard
        abFlowStep1: 'Style Preference', abFlowStep2: 'Sector Selection', abFlowStep3: 'Portfolio Build',
        abStatusTpl: 'AI analyzes your needs in real-time, configuring from {count} contracts',
        abIndustryQ: 'Which industries are you particularly bullish on? You can select multiple.',
        abRiskQ: 'What level of risk and return do you expect?',
        abPeriodQ: 'What is your preferred investment horizon?',
        abBudgetQ: 'How much are you planning to invest? (¥1,000 per contract)',
        abIndDining: 'F&B / Dining', abIndTech: 'Tech / Innovation', abIndHealth: 'Healthcare', abIndRetail: 'Retail / Consumer', abIndEdu: 'Education', abIndEnter: 'Entertainment',
        abIndAll: 'All sectors, diversified',
        // Radar Dims (二级标签 en)
        dimReturnIntensity: 'Return Intensity', dimReturnQuality: 'Return Quality', dimVolatilityControl: 'Volatility Control',
        dimCashFlowReliability: 'Cash Flow Reliability', dimLifecycleVisibility: 'Lifecycle Visibility',
        dimLeverageControl: 'Leverage Control', dimAutoReport: 'Auto-Report & Payment', dimProfitMargin: 'Business Profit Margin',
        // Primary categories
        catReturn: 'Return', catRisk: 'Risk', catControl: 'Control', catAdequacy: 'Adequacy',
        // Industries
        indDining: 'F&B', indRetail: 'Retail', indTech: 'Technology', indEducation: 'Education', indHealth: 'Healthcare', indEntertainment: 'Entertainment',
        // Portfolio Categories
        catConservative: 'Conservative', catAggressive: 'Aggressive', catBalanced: 'Balanced', catThematic: 'Thematic', catSector: 'Sector',
        // Common
        months: ' mo', wan: 'M',
        confirmTitle: 'Confirm Action', confirmMsg: 'Are you sure you want to proceed?', confirmCancel: 'Cancel', confirmOk: 'Confirm',
        // Onboarding
        obTitle: 'Welcome to Deal Connect', obSkip: 'Skip', obNext: 'Next', obStart: 'Get Started',
        // Toast
        toastLoginSuccess: 'Login Successful', toastLogout: 'Signed out safely',
        toastGuestWelcome: 'Guest Mode', toastGuestMsg: 'Loaded {contracts} virtual contracts ({projects} projects) — explore freely',
        toastSubscribeSuccess: 'Subscription Successful', toastSubscribeMsg: 'Contract added to your holdings',
        toastFeatureWIP: 'Coming Soon', toastSieveHint: 'Manage your sieve models in Assess',
        // Auth
        authLogin: 'Sign In', authRegister: 'Sign Up', authUsername: 'Username', authEmail: 'Email',
        authPassword: 'Password', authDisplayName: 'Display Name', authPhone: 'Phone Number',
        authRoleInvestor: 'Investor', authRoleManager: 'Manager',
        authLoginBtn: 'Sign In', authRegisterBtn: 'Create Account',
        authGuestBtn: 'Quick Guest Access', authGuestHint: 'No registration required — explore all features instantly', authOr: 'or',
        authSubtitle: 'Intelligent Opportunity Board for Investors',
        authUsernameEmail: 'Username / Email', authPlaceholderLogin: 'Enter username or email', authPlaceholderPwd: 'Enter password',
        authRemember: 'Remember me', authForgot: 'Forgot password?', authEnterprise: 'Enterprise Users', authSSO: 'Company SSO Login (Coming Soon)',
        authRegUsernameLabel: 'Username', authRegDisplayLabel: 'Display Name', authRegEmailLabel: 'Email', authRegPhoneLabel: 'Phone', authRegPwdLabel: 'Password',
        authRegUsernamePh: 'For login', authRegDisplayPh: 'Display name', authRegEmailPh: 'your@email.com', authRegPhonePh: '+1 (555) 000-0000', authRegPwdPh: 'At least 6 characters',
        toastPwdReset: 'Password Reset', toastPwdResetMsg: 'This feature is coming soon',
        toastSSOTitle: 'SSO Coming Soon', toastSSOMsg: 'Enterprise unified authentication interface reserved',
        toastIncomplete: 'Incomplete', toastIncompleteMsg: 'Username and password required',
        toastLoginFailed: 'Login Failed', toastNetworkError: 'Network error', toastNetworkErrorMsg: 'Please check network connection',
        toastRegFieldsMissing: 'Required fields missing', toastPwdTooShort: 'Password too short', toastPwdTooShortMsg: 'Minimum 6 characters',
        toastRegSuccess: 'Registration Successful', toastRegSuccessMsg: 'Welcome to Deal Connect!', toastRegFailed: 'Registration Failed',
        toastLoginSuccessMsg: 'Welcome back, {name}', toastSignedOut: 'Signed Out', toastSignedOutMsg: 'You have been safely signed out',
        toastShare: 'Share', toastShareMsg: 'Share link copied', toastBookmark: 'Bookmark', toastBookmarkMsg: 'Added to bookmarks',
        // Empty
        emptyDeals: 'No matching opportunities found', emptyDealsAction: 'Try switching sieves or loading demo data',
        emptyConfigSieve: 'Configure Sieves',
        // AI Assistant
        aiAssistTitle: 'Deal Connect AI Assistant',
        aiAssistWelcome: "Hello! I'm the Deal Connect AI Assistant. Ask me about sieve models, project assessments, or the subscription process.",
        // Data
        monthlyRevenue: 'Monthly Rev.', employees: 'Employees', years: 'yrs',
        totalAmount: 'Total Raise', issued: 'Issued', maturity: 'Maturity',
        riskLow: 'Low', riskMedium: 'Med', riskHigh: 'High',
        contractCount: '{n} contracts', projectCount: '{n} projects',
        // Sieve Manager
        smTitle: 'Manage My Sieves', smSub: 'Add from Sieve Library or remove existing ones',
        smLibrary: 'Sieve Library', smAvailable: '{n} available', smMySieves: 'My Sieves', smAdded: '{n} active',
        smAlreadyAdded: 'Added', smAdd: 'Add', smRemove: 'Remove', smDone: 'Done',
        smEmptyTitle: 'No sieves configured', smEmptySub: 'Add from the library on the left',
        smBuiltinHint: '"All Opportunities" is built-in and always available',
        // Sieve names (dynamic)
        sieveLocation: 'Regional Focus Sieve', sieveGrowth: 'High-Growth Sieve', sieveLargeScale: 'Large-Cap Sieve',
        sieveTeamStrength: 'Team Quality Sieve', sieveQuickReturn: 'Short-Cycle Sieve', sieveSafeHaven: 'Ultra-Conservative Sieve',
        sieveLocationDesc: 'Focus on Tier-1 cities (Beijing, Shanghai, Shenzhen, Hangzhou)',
        sieveGrowthDesc: 'Target early-stage ventures ≤3 yrs with strong revenue growth',
        sieveLargeScaleDesc: 'Filter for large-scale projects with raise ≥¥5M',
        sieveTeamStrengthDesc: 'Mature teams with ≥50 employees and ≥3 yrs operation',
        sieveQuickReturnDesc: 'Focus on short-duration contracts ≤24 months',
        sieveSafeHavenDesc: 'Ultra-conservative: Grade A+, AI Score ≥9.0, Raise ≤¥5M',
        sieveCatIndustry: 'Sector', sieveCatRisk: 'Risk', sieveCatReturn: 'Return', sieveCatComposite: 'Composite',
        sieveCatLocation: 'Region', sieveCatGrowth: 'Growth', sieveCatScale: 'Scale', sieveCatTeam: 'Team',
        sieveCatCycle: 'Cycle', sieveCatRiskCtrl: 'Risk',
        sieveAllDesc: 'Show all origination opportunities without any sieve filter',
        // Deal card dynamic
        dealSearchEmpty: 'No contracts matching "{keyword}"', dealSearchEmptyHint: 'Try a different keyword or clear the search',
        dealClearSearch: 'Clear Search', dealOriginate: 'Originate', dealSieve: 'Sieve',
        dealStatusAvailable: 'Available', dealStatusSold: 'Subscribed',
        dealStatusMine: ' · Mine', dealScoreTitle: 'Overall Contract Score',
        // Detail page
        detMCNLabel: 'Contract Identity No.', detIndustryLabel: 'Sector', detCityLabel: 'City', detIssueLabel: 'Issue', detTypeLabel: 'Type',
        detFromOriginate: 'From Originate', detOriginator: 'Originator: {name}',
        detContractInfo: 'Contract Details', detFaceValueFull: 'Face Value per Contract · Indivisible',
        detStatus: 'Status', detHolder: 'Holder', detNoHolder: 'None (Available)',
        detMyContract: 'My Contract', detMyContractNote: 'Invested ¥1,000 · MCN permanently bound',
        detProjectTotal: 'Total Raise', detShareRatio: 'Revenue Share', detSharePeriod: 'Contract Term', detAIScoreLabel: 'AI Score',
        detBizData: 'Business Metrics (from Originate)', detAvgRevenue: 'Avg Monthly Revenue', detNoData: 'N/A',
        detEmployeeCount: 'Headcount', detOpYears: 'Yrs in Operation', detRiskGrade: 'Risk Rating', detMaturityDate: 'Maturity Date',
        detRadarTitle: 'Multi-Dimension Assessment', detRadar8Dim: 'Return·Risk·Control·Adequacy · 4 Dimensions 8 Indicators',
        detDimDetail: 'Dimension Breakdown', detExpandAll: 'Expand All', detScoringBasis: 'Scoring Basis',
        detAbovePct: 'Outperforms {pct}% of peers', detAroundMedian: 'Near median range', detBelowPct: 'Below {pct}% of peers',
        detCurrentSieveMatch: 'Current Sieve Match',
        detHighMatch: 'High match — consider for priority review', detMidMatch: 'Moderate match — worth further analysis', detLowMatch: 'Low match score',
        detSieveEval: 'Sieve Assessment', detSievePass: 'Pass', detSieveFail: 'Fail',
        detMatchPct: '{n}% match', detNoSieve: 'No sieves configured', detGoManageSieve: 'Configure Sieves',
        detIncomeTitle: 'Income Projection', detMonthPrefix: 'M',
        detTimelineTitle: 'Deal Flow',
        detDataFlow: 'Data Flow', detOriginateLabel: 'Originate', detAssessLabel: 'Assess Sieves', detDealLabel: 'Deal Connect (This Page)', detTermsLabel: 'Terms Connect',
        detFirstTime: 'First time?', detViewGuide: 'View user guide',
        detTL1: 'Originate — Deal Submission', detTL2: 'Assess — AI Screening', detTL3: 'Deal — Current Stage', detTL4: 'Term → Contract',
        detTL2Desc: 'Passed {match}', detTL2DescBasic: 'Basic review',
        detTL3Wait: 'Awaiting subscription', detTL3Mine: 'You have subscribed', detTL3Sold: 'Already subscribed',
        detTL4Desc: 'Proceed to term negotiation upon commitment',
        // Subscribe modal
        subModalTitle: 'Subscribe to Contract', subFaceNote: 'Face value per contract · Indivisible',
        subShareLabel: 'Revenue Share', subPeriodLabel: 'Contract Term',
        subNote: 'Upon subscription, this contract is permanently assigned to you with MCN binding. Revenue sharing commences per the agreed terms.',
        subCancelBtn: 'Cancel', subConfirmBtn: 'Confirm ¥1,000',
        subAlreadySold: 'This contract has been subscribed', subSuccessDetail: 'Contract {mcn} assigned to you · ¥1,000',
        // Express intent
        eiMyContract: 'My Contract', eiMyContractMsg: 'You hold this contract · {mcn}',
        eiSold: 'Sold Out', eiSoldMsg: 'This contract has been subscribed by another investor',
        // Detail button
        btnMyContract: 'My Contract', btnSoldOut: 'Sold Out', btnSubscribe: 'Subscribe ¥1,000',
        btnMyContractToast: 'You hold this contract · {mcn}',
        // Grade labels
        gradeExcellent: 'Exceptional', gradeGood: 'Excellent', gradeAboveAvg: 'Above Avg', gradeAverage: 'Average', gradeBelowAvg: 'Below Avg', gradeRisky: 'At Risk',
        gradeLevelSuffix: ' level',
        // Radar dims (dynamic) — 二级标签 en
        rdRiskRating: 'Volatility Control', rdHealthIndex: 'Lifecycle Visibility', rdAnnualROI: 'Return Intensity', rdReturnAdequacy: 'Business Profit Margin',
        rdUnitReturn: 'Return Quality', rdLeverage: 'Cash Flow Reliability', rdLabour: 'Leverage Control', rdLand: 'Auto-Report & Payment',
        rdRiskRatingDesc: 'Volatility Control: Risk grade assessment incl. credit, operational & market risks; EL=PD×LGD',
        rdHealthIndexDesc: 'Lifecycle Visibility: Contract Duration / Industry Avg Lifespan, reflects term-industry fit',
        rdAnnualROIDesc: 'Return Intensity: Annualized ROI derived from revenue share ratio',
        rdReturnAdequacyDesc: 'Business Profit Margin: Contract Return / Industry Avg Return, >1 = above avg; incl. DSCR cushion',
        rdUnitReturnDesc: 'Return Quality: Unit Return = ROI / CAPEX, return per capital unit; faster payback = higher score',
        rdLeverageDesc: 'Cash Flow Reliability: financing scale / monthly revenue ratio; lower leverage = healthier; incl. CF volatility',
        rdLabourDesc: 'Leverage Control: team size × operational years composite; reflects governance maturity',
        rdLandDesc: 'Auto-Report & Payment: split-payment automation, data audit, permission control, enforcement playbook',
        // Radar sub-labels
        rslRiskRating: 'Volatility', rslHealthIndex: 'Lifecycle', rslAnnualROI: 'Intensity', rslReturnAdequacy: 'Profit',
        rslUnitReturn: 'Quality', rslLeverage: 'Cash Flow', rslLabour: 'Leverage', rslLand: 'Auto-Report',
        // My Contracts dynamic
        mcSubtitle: '{count} contracts held · Total investment ¥{total}',
        mcStatHolding: 'Holdings', mcStatUnit: 'contracts', mcStatInvest: 'Total Invested', mcStatInvestNote: 'Aggregate face value',
        mcStatProjects: 'Projects', mcStatProjectsNote: 'distinct projects', mcStatAvgAI: 'Avg AI Score', mcStatAvgAINote: 'Weighted average',
        mcSubscribed: 'Subscribed ¥1,000',
        // My Portfolios dynamic
        mpSubtitle: '{count} portfolios · {contracts} contracts',
        mpContracts: 'Contracts', mpProjects: 'Projects', mpTargetReturn: 'Target Return', mpPeriod: 'Horizon',
        mpStrategy: 'Strategy', mpContractCountLabel: ' contracts',
        mpCatConservative: 'Conservative', mpCatAggressive: 'Aggressive', mpCatBalanced: 'Balanced', mpCatThematic: 'Thematic', mpCatSector: 'Sector',
        mpFilterAll: 'All',
        mpRiskLow: 'Low Risk', mpRiskMedHigh: 'Med-High Risk', mpRiskHigh: 'High Risk', mpRiskMedium: 'Moderate Risk',
        // Portfolio Detail dynamic
        pdSubtitle: '{contracts} contracts · {projects} projects',
        pdRadar8Dim: 'Return·Risk·Control·Adequacy · 4 Dimensions 8 Indicators',
        pdOverallScore: 'Overall Score',
        pdWeightedRadar: 'Portfolio Weighted Radar',
        pdContractList: 'Portfolio Contracts',
        pdContractEmpty: 'No matching contracts in this portfolio',
        pdContractCountSuffix: ' contracts',
        // AI Builder dynamic
        abIndustryAll: 'All Sectors',
        abQuickStable: 'Stable returns, safety first', abQuickRisk: 'Higher risk for higher returns',
        abQuickBalanced: 'Balanced allocation', abQuickSector: 'Sector-focused, concentrated exposure',
        abUserMsg: 'My preference: ',
        abAIThinking: 'AI is analyzing your preferences...',
        abAnalyzing: 'Analyzing: {detail}',
        abResultTitle: 'AI Recommended Portfolio',
        abResultOverall: 'Overall Score', abResultGrade: 'Overall Rating',
        abStrategyLabel: 'Investment Strategy',
        abStrategyDefault: '50% stable consumer staples (F&B/Retail) + 50% technology growth — a classic balanced allocation',

        // Header Stats
        statContractsLabel: 'CONTRACTS', statDealsLabel: 'DEALS', statMyPosLabel: 'MY POS', statPortfoliosLabel: 'PORTFOLIOS', statAIBuilderLabel: 'AI BUILDER',
        // Contract Board
        boardTitle: 'Contract Board', boardShowing: '· Showing all',
        // Card labels
        cardFace: 'FACE', cardYield: 'YIELD', cardTerm: 'TERM', cardRisk: 'RISK', cardBuy: 'BUY',
        // Search
        searchPlaceholder: 'Search project name...',
        sortByProject: 'By project',
        // Ticker bar
        tickerSourceLabel: 'SOURCE', tickerFilterLabel: 'FILTER',
        // Empty state (no data)
        emptyTitle: 'Awaiting Investment Opportunities from Originate', emptyDesc: 'Opportunities are uploaded by fundraisers via Originate, filtered by Assess sieves and displayed here',
        emptyLoadDemo: 'Load Demo Data', emptyLoadDemoDesc: 'Experience full features with simulated Originate projects filtered by sieves',
        emptySieveConfig: 'Configure Your Sieves', emptySieveConfigDesc: 'Set your AI filtering criteria in Assess to automatically display matching opportunities',
        // Detail page tabs
        detAssessTitle: 'Contract Assessment', detTabRadar: 'Radar Assessment', detTabFinancials: 'Financials', detTabTimeline: 'Timeline',
        // My Contracts search
        mcSearchPlaceholder: 'Search contract/MCN...',
        // Portfolio info bar
        mpInfoBar: 'Cross-project fund portfolios · Intelligently configured by investment philosophy and theme',
        // Portfolio weighted
        pdWeightedTitle: 'Portfolio Weighted Analysis',
        // AI Builder stats labels
        abStatContractsLabel: 'Contracts', abStatProjectsLabel: 'Projects', abStatValueLabel: 'Total Investment', abStatReturnLabel: 'Expected Return',
        // FAB tooltip
        fabTitle: 'AI Portfolio Builder', fabDesc: 'Chat with AI, build portfolios in one click',
        // AI Chat
        aiChatWelcome: 'Hello! I am the Deal Connect AI Assistant. Ask me about sieve models, project assessments, or the participation process.',
        aiAssistPlaceholder: 'e.g., Which sieve suits me?',
        // AI Builder welcome Q
        abWelcome2Q: "Let's start with a simple question —",
        sieveSelectHint: 'Select a sieve to view description',
        abPortfolioMetaDefault: 'Real-time Generation',
        abPortfolioDescDefault: 'Intelligently generated based on your investment preferences',
        loadingText: 'Loading...', loadingPortfolio: 'Loading portfolio analysis...',
        abAIBuilt: 'AI Built',
      }
    };

    function t(key, params) {
      var text = (i18n[currentLang] && i18n[currentLang][key]) || (i18n['zh'][key]) || key;
      if (params) {
        Object.keys(params).forEach(function(k) {
          text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
        });
      }
      return text;
    }

    function setLanguage(lang) {
      currentLang = lang;
      localStorage.setItem('dc_lang', lang);
      applyLanguage();
      var zhBtn = document.getElementById('langZH');
      var enBtn = document.getElementById('langEN');
      if (zhBtn && enBtn) {
        zhBtn.className = lang === 'zh' ? 'lang-btn active' : 'lang-btn';
        enBtn.className = lang === 'en' ? 'lang-btn active' : 'lang-btn';
      }
    }

    function applyLanguage() {
      document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        var attr = el.getAttribute('data-i18n-attr');
        if (attr === 'placeholder') { el.placeholder = t(key); }
        else if (attr === 'title') { el.title = t(key); }
        else {
          var val = t(key);
          if (val.indexOf('<') >= 0) el.innerHTML = val; else el.textContent = val;
        }
      });
      if (typeof refreshDashboardTexts === 'function') refreshDashboardTexts();
    }

    // ==================== State ====================
    let currentUser = null;
    let allDeals = [];  // All opportunities from Originate (raw data)
    let dealsList = []; // Filtered by current sieve
    let currentDeal = null;
    let currentSieve = 'all'; // Currently selected sieve
    let obStep = 0;

    // ==================== Sieve Library (All Available Sieves) ====================
    const SIEVE_LIBRARY = {
      industry: {
        name: 'Industry Preference Sieve', icon: 'fa-brain', color: '#8b5cf6', category: 'Industry',
        desc: 'Filter by your preferred industries (F&B, Retail, Tech)',
        preferredIndustries: ['F&B', 'Retail', 'Technology'],
        filter: function(deals) {
          return deals.map(d => {
            const match = this.preferredIndustries.includes(d.industry);
            return { ...d, matchScore: match ? 75 + Math.floor(Math.random() * 25) : 15 + Math.floor(Math.random() * 30), sieveResult: match ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      risk: {
        name: 'V1 Risk-First Sieve', icon: 'fa-shield-alt', color: '#10b981', category: 'Risk Mgmt',
        desc: 'V1\u56FE\u8C31\u7B5B\u9009: \u5B89\u5168\u57AB\u2265T4 \u4E14 \u8FDD\u7EA6\u635F\u5931\u2265T4 \u4E14 \u6CE2\u52A8\u6027\u2265T3',
        filter: function(deals) {
          return deals.map(function(d) {
            var r = calcContractRadarV1(d);
            var cushion = r.axes[4]; // coverage_cushion
            var defLoss = r.axes[5]; // default_loss
            var vol = r.axes[3]; // volatility
            var pass = cushion.tier >= 4 && defLoss.tier >= 4 && vol.tier >= 3;
            var matchScore = pass ? Math.round((cushion.score + defLoss.score + vol.score) / 3) : Math.round((cushion.score + defLoss.score + vol.score) / 3 * 0.5);
            return Object.assign({}, d, { matchScore: matchScore, sieveResult: pass ? 'pass' : 'fail', sieveName: 'V1 Risk-First' });
          }).filter(function(d) { return d.sieveResult === 'pass'; });
        }
      },
      'return': {
        name: 'V1 High Return Sieve', icon: 'fa-chart-line', color: '#f59e0b', category: 'Return',
        desc: 'V1\u56FE\u8C31\u7B5B\u9009: \u56DE\u62A5\u6C34\u5E73\u2265T4 \u4E14 \u56DE\u672C\u901F\u5EA6\u2265T3',
        filter: function(deals) {
          return deals.map(function(d) {
            var r = calcContractRadarV1(d);
            var ret = r.axes[0]; // return_level
            var pb = r.axes[1]; // payback_speed
            var pass = ret.tier >= 4 && pb.tier >= 3;
            var matchScore = pass ? Math.round((ret.score * 0.6 + pb.score * 0.4)) : Math.round((ret.score * 0.6 + pb.score * 0.4) * 0.5);
            return Object.assign({}, d, { matchScore: matchScore, sieveResult: pass ? 'pass' : 'fail', sieveName: 'V1 High Return' });
          }).filter(function(d) { return d.sieveResult === 'pass'; });
        }
      },
      location: {
        name: 'Regional Focus Sieve', icon: 'fa-map-marker-alt', color: '#ef4444', category: 'Location',
        desc: 'Focus on Tier-1 cities (Beijing, Shanghai, Shenzhen, Hangzhou)',
        focusCities: ['Beijing', 'Shanghai', 'Shenzhen', 'Hangzhou'],
        filter: function(deals) {
          return deals.map(d => {
            const match = this.focusCities.includes(d.location);
            return { ...d, matchScore: match ? 70 + Math.floor(Math.random() * 30) : 10 + Math.floor(Math.random() * 25), sieveResult: match ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      composite: {
        name: 'V1 Composite Sieve', icon: 'fa-layer-group', color: '#06b6d4', category: 'Composite',
        desc: 'V1\u56FE\u8C31\u7EFC\u5408\u7B5B: overallScore\u226570 \u4E14 \u65E0\u4EFB\u4F55\u8F74\u4F4ETier1',
        filter: function(deals) {
          return deals.map(function(d) {
            var r = calcContractRadarV1(d);
            var noTier1 = r.axes.every(function(a) { return a.tier >= 2; });
            var pass = r.overallScore >= 70 && noTier1;
            return Object.assign({}, d, { matchScore: r.overallScore, sieveResult: pass ? 'pass' : 'fail', sieveName: 'V1 Composite' });
          }).filter(function(d) { return d.sieveResult === 'pass'; });
        }
      },
      // ---- Extended sieves from library ----
      growth: {
        name: 'High-Growth Sieve', icon: 'fa-seedling', color: '#22c55e', category: 'Growth',
        desc: 'Target early-stage <=3yrs with strong monthly revenue growth',
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
        name: 'Large-Cap Sieve', icon: 'fa-gem', color: '#a855f7', category: 'Scale',
        desc: 'Filter for large projects with raise >=5M',
        filter: function(deals) {
          return deals.map(d => {
            const amt = d.projectTotalAmount || 0;
            const pass = amt >= 500;
            return { ...d, matchScore: pass ? 72 + Math.floor(Math.random() * 28) : 12 + Math.floor(Math.random() * 25), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      teamStrength: {
        name: 'Team Strength Sieve', icon: 'fa-users', color: '#0ea5e9', category: 'Team',
        desc: 'Mature teams with >=50 employees and >=3yrs operation',
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
        name: 'V1 Quick Payback Sieve', icon: 'fa-bolt', color: '#eab308', category: 'Cycle',
        desc: 'V1\u56FE\u8C31\u7B5B: \u56DE\u672C\u901F\u5EA6\u2265T4 \u4E14 \u671F\u9650\u5339\u914D\u2265T3',
        filter: function(deals) {
          return deals.map(function(d) {
            var r = calcContractRadarV1(d);
            var pb = r.axes[1]; // payback_speed
            var tenor = r.axes[6]; // lifecycle_tenor_fit
            var pass = pb.tier >= 4 && tenor.tier >= 3;
            var matchScore = pass ? Math.round((pb.score * 0.6 + tenor.score * 0.4)) : Math.round((pb.score * 0.6 + tenor.score * 0.4) * 0.5);
            return Object.assign({}, d, { matchScore: matchScore, sieveResult: pass ? 'pass' : 'fail', sieveName: 'V1 Quick Payback' });
          }).filter(function(d) { return d.sieveResult === 'pass'; });
        }
      },
      safeHaven: {
        name: 'V1 Ultra-Safe Sieve', icon: 'fa-umbrella', color: '#64748b', category: 'Risk Mgmt',
        desc: 'V1\u56FE\u8C31\u7B5B: \u51688\u7EF4\u2265T3 \u4E14 \u98CE\u9669\u8F74(4,5,6)\u5747\u2265T4',
        filter: function(deals) {
          return deals.map(function(d) {
            var r = calcContractRadarV1(d);
            var allT3 = r.axes.every(function(a) { return a.tier >= 3; });
            var riskAxes = [r.axes[3], r.axes[4], r.axes[5]]; // vol, cushion, default
            var riskT4 = riskAxes.every(function(a) { return a.tier >= 4; });
            var pass = allT3 && riskT4;
            return Object.assign({}, d, { matchScore: r.overallScore, sieveResult: pass ? 'pass' : 'fail', sieveName: 'V1 Ultra-Safe' });
          }).filter(function(d) { return d.sieveResult === 'pass'; });
        }
      }
    };

    // 'All opportunities' built-in sieve (cannot delete)
    const SIEVE_ALL = {
      name: 'All Opportunities', icon: 'fa-globe', color: '#3D7A70',
      desc: 'Show all origination opportunities without filter',
      filter: (deals) => deals.map(d => ({ ...d, matchScore: null, sieveResult: 'all' }))
    };

    // User panel sieves (selected sieve keys from library)
    let mySieves = [];

    // Initialize user sieve panel
    function initMySieves() {
      const saved = localStorage.getItem('ec_mySieves');
      if (saved) {
        try { mySieves = JSON.parse(saved).filter(k => SIEVE_LIBRARY[k]); } catch(e) { mySieves = []; }
      }
      if (mySieves.length === 0) {
        // Default 3 pre-installed sieves
        mySieves = ['industry', 'risk', 'composite'];
        saveMySieves();
      }
    }
    function saveMySieves() {
      localStorage.setItem('ec_mySieves', JSON.stringify(mySieves));
    }

    // Build available sieve models (all + user's mySieves)
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
      const aiFab = document.getElementById('aiBuilderFab'); if (aiFab) aiFab.classList.toggle('hidden', pageId === 'pageAuth' || pageId === 'pageAIBuilder');
      // Remember previous page for back navigation
      if (pageId !== 'pageDetail' && pageId !== 'pagePortfolioDetail') window._lastPage = pageId;
      // Scroll to top after page switch
      window.scrollTo(0, 0);
      // Reset scrollable panels to top
      var scrollables = page ? page.querySelectorAll('.overflow-y-auto') : [];
      scrollables.forEach(function(el) { el.scrollTop = 0; });
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
      if (!username || !password) { showToast('warning', t('toastIncomplete'), t('toastIncompleteMsg')); return; }
      try {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await res.json();
        if (data.success) { currentUser = data.user; onLoginSuccess(); }
        else { showToast('error', t('toastLoginFailed'), data.message); }
      } catch (e) { showToast('error', t('toastNetworkError'), t('toastNetworkErrorMsg')); }
    }

    async function handleRegister() {
      const username = document.getElementById('regUsername').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const displayName = document.getElementById('regDisplayName').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      if (!username || !email || !password) { showToast('warning', t('toastRegFieldsMissing')); return; }
      if (password.length < 6) { showToast('warning', t('toastPwdTooShort'), t('toastPwdTooShortMsg')); return; }
      try {
        const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, displayName, phone, role: 'investor' }) });
        const data = await res.json();
        if (data.success) { showToast('success', t('toastRegSuccess'), t('toastRegSuccessMsg')); switchAuthTab('login'); document.getElementById('loginUsername').value = username; }
        else { showToast('error', t('toastRegFailed'), data.message); }
      } catch (e) { showToast('error', t('toastNetworkError')); }
    }

    function handleGuestLogin() {
      currentUser = { id: 'guest', username: 'guest', displayName: currentLang === 'en' ? 'Guest' : '游客', email: 'guest@demo.com', role: 'investor' };
      loadDemoData();
      onLoginSuccess();
      showToast('info', t('toastGuestWelcome'), t('toastGuestMsg', { contracts: totalVirtualContracts.toLocaleString(), projects: String(PROJECT_TEMPLATES.length) }));
    }

    function onLoginSuccess() {
      const name = currentUser?.displayName || currentUser?.username || (currentLang === 'en' ? 'User' : '用户');
      const initial = name.charAt(0).toUpperCase();
      document.getElementById('navAvatar').textContent = initial;
      document.getElementById('navName').textContent = name;
      document.getElementById('ddAvatar').textContent = initial;
      document.getElementById('ddName').textContent = name;
      document.getElementById('ddRole').textContent = t('authRoleInvestor');
      document.getElementById('welcomeText').textContent = t('welcomeBack') + (currentLang === 'zh' ? '，' : ', ') + name;
      initMySieves();
      // Auto-load data if not loaded yet
      if (allDeals.length === 0) loadDemoData();
      // Restore last sieve selection
      var savedSieve = localStorage.getItem('ec_lastSieve') || 'all';
      renderSieveSelector();
      selectSieve(savedSieve);
      // Go to contract board after login
      goToDashboard();
      showToast('success', t('toastLoginSuccess'), t('toastLoginSuccessMsg', {name: name}));
      // Delay 1.2s for spotlight onboarding (first time only)
      if (!localStorage.getItem('ec_spotlightShown')) {
        setTimeout(function() { showSpotlight(); localStorage.setItem('ec_spotlightShown', '1'); }, 1200);
      }
    }

    function handleLogout() {
      currentUser = null;
      allDeals = []; dealsList = []; projectSummaries = []; totalVirtualContracts = 0;
      switchPage('pageAuth');
      showToast('info', t('toastSignedOut'), t('toastSignedOutMsg'));
    }

    // ==================== User Dropdown ====================
    function toggleUserDD(e) { e.stopPropagation(); document.getElementById('userDropdown').classList.toggle('show'); }
    function closeUserDD() { document.getElementById('userDropdown').classList.remove('show'); }
    document.addEventListener('click', (e) => { if (!e.target.closest('#navUserBtn') && !e.target.closest('#userDropdown')) closeUserDD(); });

    // ==================== Global Keyboard Shortcuts ====================
    document.addEventListener('keydown', function(e) {
      // Escape to close modal
      if (e.key === 'Escape') {
        var modals = ['subscribeModal', 'sieveManagerModal', 'onboardingModal', 'confirmModal'];
        modals.forEach(function(id) { var m = document.getElementById(id); if (m && !m.classList.contains('hidden')) { m.remove ? m.remove() : m.classList.add('hidden'); } });
        closeUserDD();
        dismissSpotlight();
      }
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        var searchInput = document.getElementById('dealSearch');
        if (searchInput && document.getElementById('pageDashboard').classList.contains('active')) {
          searchInput.focus(); searchInput.select();
        }
      }
    });

    // ==================== Browser History Navigation ====================
    window.addEventListener('popstate', function(e) {
      if (e.state && e.state.page) {
        var pageId = e.state.page;
        document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
        var page = document.getElementById(pageId);
        if (page) page.classList.add('active');
      }
    });
    function pushPageState(pageId) {
      history.pushState({ page: pageId }, '', '#' + pageId.replace('page', '').toLowerCase());
    }

    // ==================== MCN Contract Numbering System ====================
    // MCN = Micro Connect Note
    // Format: MCN-{Industry2}-{City2}-{YYMM4}-{Seq4}
    // Example: MCN-FB-HZ-2602-0001
    const INDUSTRY_CODES = { 'F&B': 'FB', 'Retail': 'RT', 'Entertainment': 'EN', 'Education': 'ED', 'Healthcare': 'HC', 'Technology': 'TC', 'Finance': 'FI', 'Real Estate': 'RE', 'Logistics': 'LG', 'Agriculture': 'AG' };
    const CITY_CODES = { 'Hangzhou': 'HZ', 'Shenzhen': 'SZ', 'Beijing': 'BJ', 'Shanghai': 'SH', 'Chengdu': 'CD', 'Guangzhou': 'GZ', 'Tianjin': 'TJ', 'Nationwide': 'CN', 'Hong Kong': 'HK', 'Macau': 'MO' };

    function generateMCN(industry, city, dateStr, seqNum) {
      const indCode = INDUSTRY_CODES[industry] || 'XX';
      const cityCode = CITY_CODES[city] || 'XX';
      const d = new Date(dateStr);
      const yearMonth = String(d.getFullYear()).slice(-2) + String(d.getMonth() + 1).padStart(2, '0');
      const seq = String(seqNum).padStart(4, '0');
      return 'MCN-' + indCode + '-' + cityCode + '-' + yearMonth + '-' + seq;
    }

    // Parse info from MCN
    function parseMCN(mcn) {
      const parts = mcn.split('-');
      if (parts.length !== 5 || parts[0] !== 'MCN') return null;
      const indName = Object.keys(INDUSTRY_CODES).find(k => INDUSTRY_CODES[k] === parts[1]) || 'Unknown';
      const cityName = Object.keys(CITY_CODES).find(k => CITY_CODES[k] === parts[2]) || 'Unknown';
      const ym = parts[3];
      return { prefix: 'MCN', industryCode: parts[1], cityCode: parts[2], yearMonth: ym, year: '20' + ym.slice(0,2), month: ym.slice(2), seq: parts[4], industryName: indName, cityName: cityName };
    }

    // ==================== i18n: Industry / City / Data Translation Maps ====================
    const INDUSTRY_ZH = { 'F&B': '餐饮', 'Retail': '零售', 'Technology': '科技', 'Education': '教育', 'Healthcare': '医疗', 'Entertainment': '娱乐', 'Finance': '金融', 'Real Estate': '房地产', 'Logistics': '物流', 'Agriculture': '农业', 'All Sectors': '全行业' };
    const CITY_ZH = { 'Hangzhou': '杭州', 'Shenzhen': '深圳', 'Beijing': '北京', 'Shanghai': '上海', 'Chengdu': '成都', 'Guangzhou': '广州', 'Tianjin': '天津', 'Nationwide': '全国', 'Hong Kong': '香港', 'Macau': '澳门' };

    function getIndustryName(ind) { return currentLang === 'zh' ? (INDUSTRY_ZH[ind] || ind) : ind; }
    function getCityName(city) { return currentLang === 'zh' ? (CITY_ZH[city] || city) : city; }
    function getProjectName(d) { return currentLang === 'zh' && d.name_zh ? d.name_zh : d.name; }
    function getOriginatorName(d) { return currentLang === 'zh' && d.originator_zh ? d.originator_zh : d.originator; }
    function getProjectDesc(d) { return currentLang === 'zh' && d.desc_zh ? d.desc_zh : (d.projectDesc || d.desc || ''); }
    function getContractDescription(d) { return currentLang === 'zh' && d.description_zh ? d.description_zh : (d.description || ''); }
    function getPeriodDisplay(d) { var p = d.period || d.periodDisplay || ''; return (typeof p === 'number' ? p : parseInt(p) || p) + (currentLang === 'zh' ? '个月' : 'mo'); }

    // ==================== Demo Data (Simulated Originate Data) ====================
    // ★ Core concept:
    //   One project = multiple contracts, Raise = # contracts × ¥1,000/each
    //   Project raise range: ¥300K~¥2M (i.e. 300~2,000 contracts)
    //   Board displays grouped by project
    const PROJECT_TEMPLATES = [
      // ——— F&B ———
      { name: 'Starbucks Hangzhou Xixi Paradise', name_zh: '星巴克杭州西溪天堂店', industry: 'F&B', location: 'Hangzhou', originator: 'Hangzhou Starbucks Operations Co., Ltd.', originator_zh: '杭州星巴克运营有限公司', issueDate: '2026-01-10', totalAmount: 80, revenueShare: 12, period: 24, aiScore: 8.7, riskGrade: 'A+', monthlyRevenue: 120, employeeCount: 45, operatingYears: 3.5, desc: 'Starbucks Reserve store, Xixi Wetland prime district, 8,000+ daily footfall', desc_zh: '星巴克臻选门店，西溪湿地核心商圈，日均客流8,000+' },
      { name: 'Haidilao Chengdu Chunxi Rd Flagship', name_zh: '海底捞成都春熙路旗舰店', industry: 'F&B', location: 'Chengdu', originator: 'Haidilao Chengdu Operations HQ', originator_zh: '海底捞成都运营总部', issueDate: '2026-01-18', totalAmount: 120, revenueShare: 11, period: 30, aiScore: 8.3, riskGrade: 'A', monthlyRevenue: 180, employeeCount: 85, operatingYears: 7.5, desc: 'Haidilao SW flagship, prime Chunxi Rd location, 4.2 avg monthly table turnover', desc_zh: '海底捞西南旗舰店，春熙路黄金地段，月均翻台率4.2次' },
      { name: 'Tai Er Fish Guangzhou Tianhe City', name_zh: '太二酸菜鱼广州天河城店', industry: 'F&B', location: 'Guangzhou', originator: 'Tai Er F&B Management Co., Ltd.', originator_zh: '太二餐饮管理有限公司', issueDate: '2026-02-01', totalAmount: 55, revenueShare: 9, period: 24, aiScore: 7.9, riskGrade: 'A-', monthlyRevenue: 85, employeeCount: 32, operatingYears: 3.0, desc: 'Jiumaojiu sub-brand, Tianhe prime district, high queue rate', desc_zh: '九毛九旗下品牌，天河核心商圈，排队率领先同行' },
      { name: 'HEYTEA Shanghai Nanjing W Rd Concept Store', name_zh: '喜茶上海南京西路概念店', industry: 'F&B', location: 'Shanghai', originator: 'Shenzhen Meixi F&B Management Co., Ltd.', originator_zh: '深圳美西餐饮管理有限公司', issueDate: '2026-02-08', totalAmount: 65, revenueShare: 13, period: 24, aiScore: 8.5, riskGrade: 'A', monthlyRevenue: 140, employeeCount: 38, operatingYears: 2.8, desc: 'HEYTEA LAB concept store with hand-brew tea lab, 2,000+ cups daily', desc_zh: '喜茶LAB概念店，手冲茶实验室，日均出杯2,000+' },
      { name: 'Nayuki Shenzhen MixC Flagship', name_zh: '奈雪的茶深圳万象城旗舰店', industry: 'F&B', location: 'Shenzhen', originator: 'Shenzhen Pindao F&B Management Co., Ltd.', originator_zh: '深圳品道餐饮管理有限公司', issueDate: '2025-12-20', totalAmount: 48, revenueShare: 10, period: 24, aiScore: 7.6, riskGrade: 'A-', monthlyRevenue: 75, employeeCount: 28, operatingYears: 2.2, desc: 'Nayuki PRO format, lean & efficient model, industry-leading revenue per sqft', desc_zh: '奈雪PRO店型，精简高效模式，坪效行业领先' },
      // ——— Retail ———
      { name: 'Pop Mart Beijing Sanlitun Flagship', name_zh: '泡泡玛特北京三里屯旗舰店', industry: 'Retail', location: 'Beijing', originator: 'Pop Mart International Group', originator_zh: '泡泡玛特国际集团', issueDate: '2026-01-25', totalAmount: 95, revenueShare: 8, period: 30, aiScore: 7.8, riskGrade: 'A-', monthlyRevenue: 60, employeeCount: 25, operatingYears: 1.5, desc: 'Benchmark blind-box retail store, rich IP portfolio, 65% member repurchase rate', desc_zh: '标杆潮玩零售门店，IP矩阵丰富，会员复购率65%' },
      { name: 'MINISO Shanghai Global Harbor', name_zh: '名创优品上海环球港店', industry: 'Retail', location: 'Shanghai', originator: 'MINISO Group Holdings Ltd.', originator_zh: '名创优品集团控股有限公司', issueDate: '2026-02-05', totalAmount: 45, revenueShare: 7, period: 24, aiScore: 7.4, riskGrade: 'B+', monthlyRevenue: 55, employeeCount: 18, operatingYears: 4.0, desc: 'Global retail brand, 200+ SKU monthly refresh, high turnover low inventory', desc_zh: '全球零售品牌，月均上新200+ SKU，高周转低库存' },
      { name: 'Luckin Coffee Shenzhen Tech Park Cluster', name_zh: '瑞幸咖啡深圳科技园集群店', industry: 'Retail', location: 'Shenzhen', originator: 'Luckin Coffee (China) Co., Ltd.', originator_zh: '瑞幸咖啡（中国）有限公司', issueDate: '2026-02-10', totalAmount: 38, revenueShare: 8, period: 24, aiScore: 8.0, riskGrade: 'A', monthlyRevenue: 92, employeeCount: 15, operatingYears: 2.5, desc: 'Office cluster coverage model, 3 franchise stores bundled, 800+ daily orders', desc_zh: '写字楼集群覆盖模式，3家联营门店捆绑，日均订单800+' },
      // ——— Technology ———
      { name: 'ByteDance AI Lab Accelerator', name_zh: '字节跳动AI实验室加速器', industry: 'Technology', location: 'Beijing', originator: 'ByteDance Investment Management', originator_zh: '字节跳动投资管理', issueDate: '2026-01-15', totalAmount: 200, revenueShare: 15, period: 36, aiScore: 9.2, riskGrade: 'A+', monthlyRevenue: 280, employeeCount: 120, operatingYears: 6.0, desc: 'AI large model commercialization, stable B2B SaaS revenue growth, 5M+ MAU', desc_zh: 'AI大模型商业化，B2B SaaS收入稳健增长，MAU 500万+' },
      { name: 'SenseTime Smart City Project', name_zh: '商汤科技智慧城市项目', industry: 'Technology', location: 'Shanghai', originator: 'SenseTime Group Inc.', originator_zh: '商汤科技集团股份有限公司', issueDate: '2026-02-12', totalAmount: 150, revenueShare: 14, period: 36, aiScore: 8.8, riskGrade: 'A', monthlyRevenue: 210, employeeCount: 95, operatingYears: 5.5, desc: 'Smart city solutions, contracted with 12 tier-1 cities, stable govt procurement', desc_zh: '智慧城市解决方案，已签约12个一线城市，政府采购稳定' },
      { name: 'DJI Agriculture Drone Project', name_zh: '大疆农业无人机项目', industry: 'Technology', location: 'Shenzhen', originator: 'Shenzhen DJI Innovation Technology Co., Ltd.', originator_zh: '深圳市大疆创新科技有限公司', issueDate: '2025-12-28', totalAmount: 130, revenueShare: 12, period: 30, aiScore: 9.0, riskGrade: 'A+', monthlyRevenue: 185, employeeCount: 78, operatingYears: 8.0, desc: 'Agricultural drones, covering 15 provinces nationwide, #1 fleet size in industry', desc_zh: '农业无人机，覆盖全国15省，机队规模行业第一' },
      // ——— Education ———
      { name: 'New Oriental AI Smart School', name_zh: '新东方AI智慧学堂', industry: 'Education', location: 'Beijing', originator: 'New Oriental Education & Technology Group', originator_zh: '新东方教育科技集团', issueDate: '2026-02-01', totalAmount: 85, revenueShare: 10, period: 30, aiScore: 7.5, riskGrade: 'A-', monthlyRevenue: 65, employeeCount: 90, operatingYears: 5.2, desc: 'AI dual-teacher classroom, K12 full coverage, 85% renewal rate, 3,000+ new students/month', desc_zh: 'AI双师课堂，K12全覆盖，续费率85%，月均新增学员3,000+' },
      { name: 'Yuanfudao Tianjin Offline Center', name_zh: '猿辅导天津线下学习中心', industry: 'Education', location: 'Tianjin', originator: 'Beijing Yuanli Education Technology Co., Ltd.', originator_zh: '北京猿力教育科技有限公司', issueDate: '2026-02-15', totalAmount: 60, revenueShare: 9, period: 30, aiScore: 7.2, riskGrade: 'B+', monthlyRevenue: 48, employeeCount: 55, operatingYears: 3.8, desc: 'OMO blended education, community-based boutique classes, 92% parent satisfaction', desc_zh: 'OMO融合教育模式，社区精品小班，家长满意度92%' },
      // ——— Healthcare ———
      { name: 'Meinian Onehealth Shanghai Pudong Flagship', name_zh: '美年大健康上海浦东旗舰店', industry: 'Healthcare', location: 'Shanghai', originator: 'Meinian Onehealth Industry Holdings Co., Ltd.', originator_zh: '美年大健康产业控股股份有限公司', issueDate: '2026-01-20', totalAmount: 110, revenueShare: 14, period: 24, aiScore: 8.9, riskGrade: 'A', monthlyRevenue: 165, employeeCount: 72, operatingYears: 6.0, desc: 'Premium checkup + specialty care, 350 daily exams, 200+ corporate clients', desc_zh: '高端体检+专科医疗，日均体检350人次，200+家企业客户' },
      { name: 'United Family Beijing CBD Clinic', name_zh: '和睦家北京CBD诊所', industry: 'Healthcare', location: 'Beijing', originator: 'United Family Healthcare Group', originator_zh: '和睦家医疗集团', issueDate: '2026-02-18', totalAmount: 90, revenueShare: 16, period: 24, aiScore: 9.1, riskGrade: 'A+', monthlyRevenue: 195, employeeCount: 60, operatingYears: 8.0, desc: 'Premium private healthcare brand, expat physician team, 95% direct insurance coverage', desc_zh: '高端私立医疗品牌，外籍医师团队，95%直付保险覆盖' },
      { name: 'WeDoctor Internet Hospital Hangzhou Center', name_zh: '微医互联网医院杭州中心', industry: 'Healthcare', location: 'Hangzhou', originator: 'WeDoctor Group (Zhejiang) Co., Ltd.', originator_zh: '微医集团（浙江）有限公司', issueDate: '2025-12-15', totalAmount: 70, revenueShare: 11, period: 30, aiScore: 7.8, riskGrade: 'A-', monthlyRevenue: 88, employeeCount: 45, operatingYears: 4.5, desc: 'Internet + healthcare, 1.2M monthly online consultations, 92% AI-assisted diagnosis accuracy', desc_zh: '互联网+医疗，月均线上问诊120万次，AI辅助诊断准确率92%' },
      // ——— Entertainment ———
      { name: 'Jay Chou 2026 World Tour', name_zh: '周杰伦2026世界巡回演唱会', industry: 'Entertainment', location: 'Nationwide', originator: 'JVR Music Co., Ltd.', originator_zh: '杰威尔音乐有限公司', issueDate: '2026-01-08', totalAmount: 180, revenueShare: 18, period: 18, aiScore: 9.5, riskGrade: 'A+', monthlyRevenue: 350, employeeCount: 15, operatingYears: 12.0, desc: 'Top Asian IP, 20-city tour, avg 40K per show, 30% merch revenue share', desc_zh: '亚洲顶级IP，20城巡演，场均4万人，周边收入分成30%' },
      { name: 'Mahua FunAge National Tour Project', name_zh: '开心麻花全国巡演项目', industry: 'Entertainment', location: 'Beijing', originator: 'Beijing Mahua FunAge Entertainment & Culture Media', originator_zh: '北京开心麻花娱乐文化传媒', issueDate: '2026-02-20', totalAmount: 55, revenueShare: 12, period: 24, aiScore: 8.0, riskGrade: 'A-', monthlyRevenue: 75, employeeCount: 40, operatingYears: 10.0, desc: 'Theater + film dual revenue, 30-city national tour, IP film adaptations CNY 5B+ total box office', desc_zh: '话剧+电影双收入引擎，30城全国巡演，IP电影改编累计票房50亿+' },
      // ——— Additional Industry Coverage ———
      { name: 'SF Same-City Express Hangzhou Center', name_zh: '顺丰同城急送杭州中心', industry: 'Retail', location: 'Hangzhou', originator: 'SF Same-City Express Co., Ltd.', originator_zh: '顺丰同城急送有限公司', issueDate: '2026-01-30', totalAmount: 75, revenueShare: 9, period: 24, aiScore: 8.1, riskGrade: 'A', monthlyRevenue: 130, employeeCount: 200, operatingYears: 3.0, desc: 'Leading same-city delivery brand, 120K daily orders, 5,000+ rider fleet', desc_zh: '同城配送头部品牌，日均订单12万单，骑手团队5,000+' },
      { name: 'NIO Chengdu Delivery Center', name_zh: '蔚来汽车成都交付中心', industry: 'Technology', location: 'Chengdu', originator: 'NIO Technology (Anhui) Co., Ltd.', originator_zh: '蔚来汽车科技（安徽）有限公司', issueDate: '2026-02-22', totalAmount: 160, revenueShare: 13, period: 36, aiScore: 8.4, riskGrade: 'A', monthlyRevenue: 220, employeeCount: 65, operatingYears: 5.0, desc: 'NEV delivery + after-sales integration, 300 monthly deliveries, industry-leading NPS', desc_zh: '新能源交付+售后一体化，月交付300台，用户满意度行业领先' }
    ];

    // ★ Virtual contract generator — on-demand to avoid creating tens of thousands of records
    // Core approach: store project metadata + generate limited representative contracts for display
    // Total numbers (e.g., 19,110) for statistics display only, no actual objects created

    const STATUS_POOL = ['available', 'available', 'available', 'sold', 'available', 'sold', 'available', 'mine', 'available', 'sold'];
    const HOLDER_NAMES_EN = ['J. Smith', 'L. Chen', 'W. Zhang', 'M. Liu', 'K. Yang', 'Inst. Alpha', 'Fund Beta', 'Investor C', 'Trust Delta', 'PE Epsilon', 'FO Foxtrot', 'AM Golf'];
    const HOLDER_NAMES_ZH = ['张先生', '陈女士', '王先生', '刘女士', '杨先生', '甲机构', '乙基金', '丙投资人', '丁信托', '戊私募', '己家族', '庚资管'];
    function getHolderName(idx) { return currentLang === 'zh' ? HOLDER_NAMES_ZH[idx % HOLDER_NAMES_ZH.length] : HOLDER_NAMES_EN[idx % HOLDER_NAMES_EN.length]; }
    const MAX_CONTRACTS_PER_PROJECT = 60; // Max contracts generated per project (for display)

    // Project-level summary cache
    let projectSummaries = [];
    let totalVirtualContracts = 0; // Total virtual contracts across all projects

    function buildContractForProject(proj, pi, ci, globalSeq, totalContracts) {
      var mcn = generateMCN(proj.industry, proj.location, proj.issueDate, globalSeq);
      var statusIdx = (pi * 7 + ci * 3 + Math.floor(ci / 10)) % STATUS_POOL.length;
      var statusRand = STATUS_POOL[statusIdx];
      var holder = null;
      var isMine = false;
      if (statusRand === 'mine') {
        holder = currentUser ? (currentUser.displayName || currentUser.username) : (currentLang === 'en' ? 'Guest' : '游客');
        isMine = true;
        statusRand = 'sold';
      } else if (statusRand === 'sold') {
        holder = getHolderName((pi * 3 + ci) % HOLDER_NAMES_EN.length);
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
        name_zh: proj.name_zh || proj.name,
        industry: proj.industry,
        location: proj.location,
        originator: proj.originator,
        originator_zh: proj.originator_zh || proj.originator,
        originateDate: proj.issueDate,
        issueDate: proj.issueDate,
        maturityDate: matDate.toISOString().slice(0, 10),
        faceValue: 1000,
        status: statusRand,
        holder: holder,
        isMine: isMine,
        revenueShare: proj.revenueShare + '%',
        period: proj.period,
        periodDisplay: proj.period + (currentLang === 'zh' ? '个月' : 'mo'),
        aiScore: finalScore.toFixed(1),
        riskGrade: proj.riskGrade,
        monthlyRevenue: proj.monthlyRevenue + '0K',
        employeeCount: proj.employeeCount,
        operatingYears: proj.operatingYears.toFixed(1),
        contractType: 'RSN',
        currency: 'CNY',
        seqInProject: ci + 1,
        totalInProject: totalContracts,
        projectTotalAmount: proj.totalAmount,
        projectDesc: proj.desc || '',
        desc_zh: proj.desc_zh || '',
        description: 'Standard ' + proj.industry + ' sector contract issued by "' + proj.originator + '" via Originate. Face value ¥1,000 · Revenue Share Note (RSN). Project total raise ¥' + proj.totalAmount + '0K (' + totalContracts + ' contracts).',
        description_zh: '标准' + (INDUSTRY_ZH[proj.industry] || proj.industry) + '行业合约，由「' + (proj.originator_zh || proj.originator) + '」通过发起通发行。合约面值 ¥1,000 · 收益分享合约（RSN）。项目总融资 ¥' + proj.totalAmount + '万（' + totalContracts + ' 张合约）。'
      };
    }

    function loadDemoData() {
      // Show skeleton loading
      showDealGridSkeleton();
      // ★ Performance: only generate MAX_CONTRACTS_PER_PROJECT representative contracts per project
      //   Real total = totalAmount × 10 (for stats display only)
      //   e.g., Starbucks ¥800K = virtual 800, but only 60 generated for browsing
      allDeals = [];
      projectSummaries = [];
      totalVirtualContracts = 0;
      var globalSeq = 1;

      PROJECT_TEMPLATES.forEach(function(proj, pi) {
        var virtualTotal = proj.totalAmount * 10; // Virtual total (mapped from real raise amount)
        var actualGen = Math.min(virtualTotal, MAX_CONTRACTS_PER_PROJECT); // Actual generated count
        totalVirtualContracts += virtualTotal;

        // Deterministic virtual distribution calc
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

        // Only generate actualGen contracts (uniform sampling)
        for (var ci = 0; ci < actualGen; ci++) {
          // Uniform sampling: select by proportion from virtual total
          var sampledIdx = actualGen < virtualTotal
            ? Math.floor(ci * (virtualTotal / actualGen))
            : ci;
          var contract = buildContractForProject(proj, pi, sampledIdx, globalSeq, virtualTotal);
          // Override seqInProject as sampled index+1, keep totalInProject as virtual total
          contract.seqInProject = sampledIdx + 1;
          allDeals.push(contract);
          globalSeq++;
        }
      });

      // Skip localStorage (19K+ objects exceed 5MB quota and freeze browser)
    }

    // ╔══════════════════════════════════════════════════════════════════════════╗
    // ║  RADAR V1 — 统一评估图谱引擎 (v1_20260305)                              ║
    // ║  单张合约 8 维 DNA + 组合 2 维 = 10 维标准化雷达图谱                      ║
    // ║  硬约束: 越靠外越好 / 全站统一来源 / 缺失字段显式标红                       ║
    // ╚══════════════════════════════════════════════════════════════════════════╝

    // ===== RADAR V1 §1: Schema — 维度协议定义 =====
    const RADAR_V1_SCHEMA_VERSION = 'v1_20260305';

    // 8 合约维度 + 2 组合维度，统一轴顺序（全站一致）
    const V1_AXIS_DEFS = [
      // ── 1. 回报水平 ──
      {
        id: 'return_level', order: 1,
        nameCN: '回报水平', nameEN: 'Return Level',
        direction: 'higherBetter',
        icon: 'fa-percentage', color: '#f59e0b', group: 'return',
        weight: 0.20,
        requiredFields: ['revenueShare'],
        optionalFields: ['irr', 'moic', 'unitReturn'],
        rawExtract: function(deal) {
          var annualYield = parseFloat(deal.revenueShare) || 0;
          var irr = deal.irr != null ? parseFloat(deal.irr) : null;
          var moic = deal.moic != null ? parseFloat(deal.moic) : null;
          return { value: annualYield, irr: irr, moic: moic, unit: '%', formulaNotes: '年化收益率(revenueShare)', timeWindow: 'contract_life' };
        },
        primaryRawKey: 'value',
        explanationTemplate: function(raw, score, tier, ctx) {
          var s = '\u5E74\u5316' + raw.value.toFixed(1) + '%';
          if (raw.irr != null) s += ', IRR=' + raw.irr.toFixed(1) + '%';
          s += ' \u2192 Tier' + tier + '(' + score + '\u5206)';
          if (ctx.usedGlobal) s += '\uFF0C\u4F7F\u7528\u5168\u5C40\u9608\u503C';
          return s;
        }
      },
      // ── 2. 回本速度 ──
      {
        id: 'payback_speed', order: 2,
        nameCN: '回本速度', nameEN: 'Payback Speed',
        direction: 'lowerBetter',
        icon: 'fa-tachometer-alt', color: '#10b981', group: 'return',
        weight: 0.10,
        requiredFields: ['revenueShare'],
        optionalFields: ['paybackDaysBase', 'paybackDaysDownside', 'rampUpDays'],
        rawExtract: function(deal) {
          var yld = parseFloat(deal.revenueShare) || 10;
          var pbBase = deal.paybackDaysBase != null ? parseInt(deal.paybackDaysBase) : Math.round(365 / (yld / 100));
          var pbDown = deal.paybackDaysDownside != null ? parseInt(deal.paybackDaysDownside) : null;
          var ramp = deal.rampUpDays != null ? parseInt(deal.rampUpDays) : null;
          return { value: pbBase, paybackDaysDownside: pbDown, rampUpDays: ramp, unit: '\u5929', formulaNotes: pbDown == null ? '365/(annualYield%)\u4F30\u7B97' : '\u5B9E\u9645\u56DE\u672C\u5929\u6570', timeWindow: 'contract_life' };
        },
        primaryRawKey: 'value',
        explanationTemplate: function(raw, score, tier, ctx) {
          var s = '\u56DE\u672C' + raw.value + '\u5929';
          if (raw.paybackDaysDownside != null) s += '(\u60B2\u89C2' + raw.paybackDaysDownside + '\u5929)';
          s += ' \u2192 Tier' + tier + '(' + score + '\u5206)';
          if (ctx.usedGlobal) s += '\uFF0C\u5168\u5C40\u9608\u503C';
          return s;
        }
      },
      // ── 3. 频率与连续性 ──
      {
        id: 'frequency_continuity', order: 3,
        nameCN: '频率与连续性', nameEN: 'Frequency & Continuity',
        direction: 'higherBetter',
        icon: 'fa-stream', color: '#06b6d4', group: 'cashflow',
        weight: 0.10,
        requiredFields: [],
        optionalFields: ['cashflowPerMonth', 'avgIntervalDays', 'continuityRatio', 'maxGapDays'],
        rawExtract: function(deal) {
          var cfpm = deal.cashflowPerMonth != null ? parseFloat(deal.cashflowPerMonth) : null;
          var interval = deal.avgIntervalDays != null ? parseFloat(deal.avgIntervalDays) : null;
          var conti = deal.continuityRatio != null ? parseFloat(deal.continuityRatio) : null;
          var maxGap = deal.maxGapDays != null ? parseInt(deal.maxGapDays) : null;
          // 估算: 月度分配 → continuityRatio ≈ 0.9 (假设)
          var estimatedConti = conti != null ? conti : 0.85;
          var estimateFlag = conti == null;
          return { value: estimatedConti, cashflowPerMonth: cfpm, avgIntervalDays: interval, maxGapDays: maxGap, unit: 'ratio', formulaNotes: estimateFlag ? '\u65E0\u5B9E\u9645\u6570\u636E\uFF0C\u9ED8\u8BA4\u4F30\u7B97\u503C0.85' : '\u5B9E\u9645\u8FDE\u7EED\u6027\u6BD4\u7387', timeWindow: 'trailing_12m', estimated: estimateFlag };
        },
        primaryRawKey: 'value',
        explanationTemplate: function(raw, score, tier, ctx) {
          var s = '\u8FDE\u7EED\u6027' + (raw.value * 100).toFixed(0) + '%';
          if (raw.estimated) s += '(\u4F30\u7B97\u503C)';
          if (raw.cashflowPerMonth != null) s += ', \u6708\u5747' + raw.cashflowPerMonth + '\u7B14';
          s += ' \u2192 Tier' + tier;
          if (ctx.usedGlobal) s += '\uFF0C\u5168\u5C40\u9608\u503C';
          return s;
        }
      },
      // ── 4. 现金流波动性 ──
      {
        id: 'volatility', order: 4,
        nameCN: '现金流波动性', nameEN: 'Cash Flow Volatility',
        direction: 'lowerBetter',
        icon: 'fa-wave-square', color: '#8b5cf6', group: 'cashflow',
        weight: 0.10,
        requiredFields: [],
        optionalFields: ['cashflowCV', 'worstMonthOverMean', 'downsideMonthRatio'],
        rawExtract: function(deal) {
          var cv = deal.cashflowCV != null ? parseFloat(deal.cashflowCV) : null;
          var worst = deal.worstMonthOverMean != null ? parseFloat(deal.worstMonthOverMean) : null;
          var downRatio = deal.downsideMonthRatio != null ? parseFloat(deal.downsideMonthRatio) : null;
          // 估算: 无月度序列时用行业经验值
          var estimatedCV = cv != null ? cv : 0.35;
          var estimateFlag = cv == null;
          return { value: estimatedCV, worstMonthOverMean: worst, downsideMonthRatio: downRatio, unit: 'CV', formulaNotes: estimateFlag ? '\u65E0\u6708\u5E8F\u5217\uFF0C\u7ECF\u9A8C\u4F30\u503C0.35' : '\u5B9E\u9645\u53D8\u5F02\u7CFB\u6570', timeWindow: 'trailing_12m', estimated: estimateFlag };
        },
        primaryRawKey: 'value',
        explanationTemplate: function(raw, score, tier, ctx) {
          var s = 'CV=' + raw.value.toFixed(2);
          if (raw.estimated) s += '(\u4F30\u7B97)';
          if (raw.worstMonthOverMean != null) s += ', \u6700\u5DEE\u6708/\u5747\u503C=' + raw.worstMonthOverMean.toFixed(2);
          s += ' \u2192 Tier' + tier + '(\u8D8A\u4F4E\u8D8A\u597D)';
          return s;
        }
      },
      // ── 5. 收益充足性/安全垫 ──
      {
        id: 'coverage_cushion', order: 5,
        nameCN: '安全垫', nameEN: 'Coverage Cushion',
        direction: 'higherBetter',
        icon: 'fa-shield-alt', color: '#ef4444', group: 'risk',
        weight: 0.15,
        requiredFields: ['monthlyRevenue', 'projectTotalAmount'],
        optionalFields: ['coverageMultiple', 'fixedCostRatio', 'guaranteeCoverage', 'downsideBufferMonths'],
        rawExtract: function(deal) {
          var coverage = deal.coverageMultiple != null ? parseFloat(deal.coverageMultiple) : null;
          var monthlyRev = parseInt(deal.monthlyRevenue) || 0;
          var totalAmt = deal.projectTotalAmount || 0;
          var shareNum = parseFloat(deal.revenueShare) || 10;
          // 估算DSCR: 月营收*分成比 / (总额/期数)
          var periodMonths = parseInt(deal.period) || 24;
          var monthlyDebt = totalAmt * 10000 / periodMonths;
          var monthlyIncome = monthlyRev * 10000 * (shareNum / 100);
          var estimatedDSCR = coverage != null ? coverage : (monthlyDebt > 0 ? monthlyIncome / monthlyDebt : 1.0);
          var estimateFlag = coverage == null;
          var fixedCost = deal.fixedCostRatio != null ? parseFloat(deal.fixedCostRatio) : null;
          return { value: estimatedDSCR, fixedCostRatio: fixedCost, guaranteeCoverage: deal.guaranteeCoverage || null, unit: 'x', formulaNotes: estimateFlag ? 'DSCR\u4F30\u7B97=\u6708\u5206\u6210\u6536\u5165/\u6708\u5747\u672C\u91D1' : '\u5B9E\u9645DSCR', timeWindow: 'contract_life', estimated: estimateFlag };
        },
        primaryRawKey: 'value',
        explanationTemplate: function(raw, score, tier, ctx) {
          var s = 'DSCR=' + raw.value.toFixed(2) + 'x';
          if (raw.estimated) s += '(\u4F30\u7B97)';
          if (raw.fixedCostRatio != null) s += ', \u56FA\u5B9A\u6210\u672C\u5360\u6BD4' + (raw.fixedCostRatio * 100).toFixed(0) + '%';
          s += ' \u2192 Tier' + tier;
          return s;
        }
      },
      // ── 6. 违约/闭店/损失 ──
      {
        id: 'default_loss', order: 6,
        nameCN: '违约损失', nameEN: 'Default & Loss',
        direction: 'lowerBetter',
        icon: 'fa-exclamation-triangle', color: '#dc2626', group: 'risk',
        weight: 0.15,
        requiredFields: ['riskGrade'],
        optionalFields: ['defaultRate', 'closeRate', 'lgd', 'recoveryRate', 'collectionCycleDays'],
        rawExtract: function(deal) {
          var defRate = deal.defaultRate != null ? parseFloat(deal.defaultRate) : null;
          var closeRate = deal.closeRate != null ? parseFloat(deal.closeRate) : null;
          var lgd = deal.lgd != null ? parseFloat(deal.lgd) : null;
          var recovery = deal.recoveryRate != null ? parseFloat(deal.recoveryRate) : null;
          // 从riskGrade推算隐含违约率
          var gradeDefaults = { 'A+': 0.005, 'A': 0.01, 'A-': 0.02, 'B+': 0.05, 'B': 0.08, 'B-': 0.12, 'C': 0.20 };
          var impliedDefault = defRate != null ? defRate : (gradeDefaults[deal.riskGrade] || 0.08);
          var estimateFlag = defRate == null;
          var impliedLGD = lgd != null ? lgd : 0.45;
          var expectedLoss = impliedDefault * impliedLGD;
          return { value: expectedLoss, defaultRate: impliedDefault, lgd: impliedLGD, recoveryRate: recovery, closeRate: closeRate, unit: 'EL', formulaNotes: estimateFlag ? '\u4ECEriskGrade\u63A8\u7B97\u9690\u542B\u8FDD\u7EA6\u7387' : '\u5B9E\u9645\u8FDD\u7EA6\u7387', timeWindow: 'historical', estimated: estimateFlag };
        },
        primaryRawKey: 'value',
        explanationTemplate: function(raw, score, tier, ctx) {
          var s = 'EL=' + (raw.value * 100).toFixed(2) + '%(PD=' + (raw.defaultRate * 100).toFixed(1) + '%,LGD=' + (raw.lgd * 100).toFixed(0) + '%)';
          if (raw.estimated) s += ' \u63A8\u7B97';
          s += ' \u2192 Tier' + tier + '(\u8D8A\u4F4E\u8D8A\u597D)';
          return s;
        }
      },
      // ── 7. 生命周期与期限匹配 ──
      {
        id: 'lifecycle_tenor_fit', order: 7,
        nameCN: '期限匹配', nameEN: 'Lifecycle Tenor Fit',
        direction: 'higherBetter',
        icon: 'fa-clock', color: '#0d9488', group: 'structure',
        weight: 0.10,
        requiredFields: ['period'],
        optionalFields: ['remainingTenorDays', 'renewalProb', 'earlyTerminatePenalty'],
        rawExtract: function(deal) {
          var periodMonths = parseInt(deal.period) || 24;
          var remainDays = deal.remainingTenorDays != null ? parseInt(deal.remainingTenorDays) : periodMonths * 30;
          var yld = parseFloat(deal.revenueShare) || 10;
          var pbDays = Math.round(365 / (yld / 100));
          var tenorCoverage = remainDays / (pbDays || 365);
          var renewProb = deal.renewalProb != null ? parseFloat(deal.renewalProb) : null;
          return { value: tenorCoverage, remainingTenorDays: remainDays, paybackDaysRef: pbDays, renewalProb: renewProb, unit: 'x', formulaNotes: 'TenorCoverage=\u5269\u4F59\u5929\u6570/\u56DE\u672C\u5929\u6570', timeWindow: 'contract_life' };
        },
        primaryRawKey: 'value',
        explanationTemplate: function(raw, score, tier, ctx) {
          var s = '\u671F\u9650\u8986\u76D6=' + raw.value.toFixed(2) + 'x(\u5269' + raw.remainingTenorDays + '\u5929/\u56DE\u672C' + raw.paybackDaysRef + '\u5929)';
          if (raw.renewalProb != null) s += ', \u7EED\u7EA6\u6982\u7387' + (raw.renewalProb * 100).toFixed(0) + '%';
          s += ' \u2192 Tier' + tier;
          return s;
        }
      },
      // ── 8. 管控强度与可执行性 ──
      {
        id: 'control_enforceability', order: 8,
        nameCN: '管控执行', nameEN: 'Control & Enforceability',
        direction: 'higherBetter',
        icon: 'fa-lock', color: '#ec4899', group: 'structure',
        weight: 0.10,
        requiredFields: [],
        optionalFields: ['splitPaymentAutomationLevel', 'dataAuditabilityLevel', 'permissionControlLevel', 'enforcementPlaybookLevel'],
        rawExtract: function(deal) {
          var levels = ['splitPaymentAutomationLevel', 'dataAuditabilityLevel', 'permissionControlLevel', 'enforcementPlaybookLevel'];
          var levelMap = { 'none': 0, 'low': 25, 'medium': 50, 'high': 75, 'full': 100 };
          var sum = 0, count = 0, missing = [];
          levels.forEach(function(f) {
            if (deal[f] != null && deal[f] !== '') {
              var v = typeof deal[f] === 'number' ? deal[f] : (levelMap[deal[f]] != null ? levelMap[deal[f]] : 50);
              sum += v; count++;
            } else {
              missing.push(f);
            }
          });
          var avgLevel = count > 0 ? sum / count : 50;
          return { value: avgLevel, detailLevels: levels.map(function(f) { return { field: f, val: deal[f] || null }; }), unit: 'score(0-100)', formulaNotes: count > 0 ? count + '/4\u9879\u6709\u6570\u636E' : '\u5168\u90E8\u7F3A\u5931\uFF0C\u9ED8\u8BA4\u4E2D\u4F4D50', timeWindow: 'current', estimated: count === 0 };
        },
        primaryRawKey: 'value',
        explanationTemplate: function(raw, score, tier, ctx) {
          var s = '\u7BA1\u63A7\u7EFC\u5408=' + raw.value.toFixed(0) + '/100';
          if (raw.estimated) s += '(\u5168\u7F3A\u5931\u9ED8\u8BA4\u503C)';
          s += ' \u2192 Tier' + tier;
          return s;
        }
      },
      // ── 9. 单项目集中度 (组合专用) ──
      {
        id: 'single_name_concentration', order: 9,
        nameCN: '单项目集中度', nameEN: 'Single Name Concentration',
        direction: 'lowerBetter',
        icon: 'fa-crosshairs', color: '#7c3aed', group: 'portfolio',
        weight: 0.05,
        isPortfolioOnly: true,
        requiredFields: [], optionalFields: [],
        rawExtract: function() { return { value: 0 }; },
        primaryRawKey: 'value',
        explanationTemplate: function(raw, score, tier) { return 'Top1\u5360\u6BD4' + (raw.top1Share * 100).toFixed(1) + '%, HHI=' + raw.hhi.toFixed(4) + ' \u2192 Tier' + tier; }
      },
      // ── 10. 行业集中度 (组合专用) ──
      {
        id: 'sector_concentration', order: 10,
        nameCN: '行业集中度', nameEN: 'Sector Concentration',
        direction: 'lowerBetter',
        icon: 'fa-industry', color: '#be185d', group: 'portfolio',
        weight: 0.05,
        isPortfolioOnly: true,
        requiredFields: [], optionalFields: [],
        rawExtract: function() { return { value: 0 }; },
        primaryRawKey: 'value',
        explanationTemplate: function(raw, score, tier) { return '\u884C\u4E1ATop1\u5360\u6BD4' + (raw.sectorTop1Share * 100).toFixed(1) + '% \u2192 Tier' + tier; }
      }
    ];

    // 合约维度（排除组合专用）
    var V1_CONTRACT_AXES = V1_AXIS_DEFS.filter(function(a) { return !a.isPortfolioOnly; });

    // ===== RADAR V1 §2: 阈值表 (thresholdsBySector) =====
    // cuts: [tier1上界, tier2上界, tier3上界, tier4上界]
    // tier1=最差(score 0-20), tier5=最好(score 80-100)
    // lowerBetter 类型: cuts 从高到低（越小越好）
    var v1GlobalThresholds = {
      return_level:             { type: 'higherBetter', cuts: [5, 8, 12, 18],       clampMin: 0,    clampMax: 35 },
      payback_speed:            { type: 'lowerBetter',  cuts: [2500, 1600, 900, 450], clampMin: 120,  clampMax: 3650 },
      frequency_continuity:     { type: 'higherBetter', cuts: [0.5, 0.7, 0.85, 0.95], clampMin: 0,   clampMax: 1.0 },
      volatility:               { type: 'lowerBetter',  cuts: [0.7, 0.5, 0.3, 0.15], clampMin: 0,    clampMax: 1.2 },
      coverage_cushion:         { type: 'higherBetter', cuts: [0.8, 1.2, 1.8, 2.5],  clampMin: 0,    clampMax: 5.0 },
      default_loss:             { type: 'lowerBetter',  cuts: [0.08, 0.04, 0.02, 0.005], clampMin: 0, clampMax: 0.15 },
      lifecycle_tenor_fit:      { type: 'higherBetter', cuts: [0.5, 1.0, 1.5, 2.5],  clampMin: 0,    clampMax: 5.0 },
      control_enforceability:   { type: 'higherBetter', cuts: [25, 45, 65, 85],      clampMin: 0,    clampMax: 100 },
      single_name_concentration:{ type: 'lowerBetter',  cuts: [0.6, 0.4, 0.25, 0.1], clampMin: 0,    clampMax: 1.0 },
      sector_concentration:     { type: 'lowerBetter',  cuts: [0.8, 0.6, 0.4, 0.2],  clampMin: 0,    clampMax: 1.0 }
    };

    var v1ThresholdsBySector = {
      'F&B': {
        return_level:        { type: 'higherBetter', cuts: [6, 10, 14, 20],      clampMin: 0, clampMax: 30 },
        payback_speed:       { type: 'lowerBetter',  cuts: [2200, 1400, 800, 400], clampMin: 120, clampMax: 3650 },
        coverage_cushion:    { type: 'higherBetter', cuts: [0.7, 1.1, 1.6, 2.2],  clampMin: 0, clampMax: 5.0 },
        default_loss:        { type: 'lowerBetter',  cuts: [0.10, 0.05, 0.025, 0.008], clampMin: 0, clampMax: 0.18 }
      },
      'Retail': {
        return_level:        { type: 'higherBetter', cuts: [4, 7, 11, 16],       clampMin: 0, clampMax: 25 },
        payback_speed:       { type: 'lowerBetter',  cuts: [2800, 1800, 1000, 500], clampMin: 120, clampMax: 3650 },
        default_loss:        { type: 'lowerBetter',  cuts: [0.12, 0.06, 0.03, 0.01], clampMin: 0, clampMax: 0.20 }
      },
      'Technology': {
        return_level:        { type: 'higherBetter', cuts: [8, 14, 20, 28],      clampMin: 0, clampMax: 40 },
        payback_speed:       { type: 'lowerBetter',  cuts: [1800, 1100, 650, 300], clampMin: 90, clampMax: 3000 },
        coverage_cushion:    { type: 'higherBetter', cuts: [1.0, 1.5, 2.2, 3.0],  clampMin: 0, clampMax: 6.0 }
      },
      'Healthcare': {
        return_level:        { type: 'higherBetter', cuts: [7, 11, 16, 22],      clampMin: 0, clampMax: 30 },
        default_loss:        { type: 'lowerBetter',  cuts: [0.06, 0.03, 0.015, 0.005], clampMin: 0, clampMax: 0.12 }
      },
      'Education': {
        return_level:        { type: 'higherBetter', cuts: [5, 9, 13, 18],       clampMin: 0, clampMax: 25 },
        default_loss:        { type: 'lowerBetter',  cuts: [0.09, 0.05, 0.025, 0.008], clampMin: 0, clampMax: 0.15 }
      },
      'Entertainment': {
        return_level:        { type: 'higherBetter', cuts: [9, 15, 22, 30],      clampMin: 0, clampMax: 40 },
        volatility:          { type: 'lowerBetter',  cuts: [0.8, 0.55, 0.35, 0.2],  clampMin: 0, clampMax: 1.5 },
        default_loss:        { type: 'lowerBetter',  cuts: [0.14, 0.08, 0.04, 0.015], clampMin: 0, clampMax: 0.25 }
      },
      'Finance': {
        return_level:        { type: 'higherBetter', cuts: [6, 10, 15, 22],      clampMin: 0, clampMax: 30 }
      },
      'Logistics': {
        return_level:        { type: 'higherBetter', cuts: [5, 8, 12, 17],       clampMin: 0, clampMax: 25 }
      },
      'Agriculture': {
        return_level:        { type: 'higherBetter', cuts: [4, 7, 10, 15],       clampMin: 0, clampMax: 22 }
      },
      'Real Estate': {
        return_level:        { type: 'higherBetter', cuts: [4, 7, 10, 14],       clampMin: 0, clampMax: 20 }
      }
    };

    // ===== RADAR V1 §3: Scoring Engine 通用工具 =====
    function v1Clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

    // rawValue → 0..100 分段线性插值
    // lowerBetter 类型: 在函数内部做反向
    function v1ScoreByThreshold(rawValue, thresholdConfig) {
      var type = thresholdConfig.type;
      var cuts = thresholdConfig.cuts;
      var cMin = thresholdConfig.clampMin;
      var cMax = thresholdConfig.clampMax;

      if (type === 'lowerBetter') {
        // lowerBetter: cuts从高到低 [worst, ..., best]
        // 反向: 将 rawValue 映射为"越小越好"的score
        // cuts[0]=差, cuts[3]=好 → rawValue <= cuts[3] → 高分
        var v = v1Clamp(rawValue, cMin, cMax);
        // 分段: v >= cuts[0] → score 0~20; v >= cuts[1] → 20~40; ...
        if (v >= cuts[0]) return Math.round(Math.max(2, 20 * (1 - (v - cuts[0]) / (cMax - cuts[0] || 1))));
        if (v >= cuts[1]) return Math.round(20 + (cuts[0] - v) / (cuts[0] - cuts[1] || 1) * 20);
        if (v >= cuts[2]) return Math.round(40 + (cuts[1] - v) / (cuts[1] - cuts[2] || 1) * 20);
        if (v >= cuts[3]) return Math.round(60 + (cuts[2] - v) / (cuts[2] - cuts[3] || 1) * 20);
        return Math.round(Math.min(98, 80 + (cuts[3] - v) / (cuts[3] - cMin || 1) * 18));
      } else {
        // higherBetter: cuts从低到高 [worst, ..., best]
        var v = v1Clamp(rawValue, cMin, cMax);
        if (v <= cuts[0]) return Math.round(Math.max(2, 20 * v / (cuts[0] || 1)));
        if (v <= cuts[1]) return Math.round(20 + (v - cuts[0]) / (cuts[1] - cuts[0] || 1) * 20);
        if (v <= cuts[2]) return Math.round(40 + (v - cuts[1]) / (cuts[2] - cuts[1] || 1) * 20);
        if (v <= cuts[3]) return Math.round(60 + (v - cuts[2]) / (cuts[3] - cuts[2] || 1) * 20);
        return Math.round(Math.min(98, 80 + (v - cuts[3]) / (cMax - cuts[3] || 1) * 18));
      }
    }

    function v1TierFromScore(score) {
      if (score >= 80) return 5;
      if (score >= 60) return 4;
      if (score >= 40) return 3;
      if (score >= 20) return 2;
      return 1;
    }

    function v1ConfidenceFromEvidence(axisDef, deal) {
      var req = axisDef.requiredFields || [];
      var opt = axisDef.optionalFields || [];
      if (req.length === 0 && opt.length === 0) return 30; // 全是估算
      var totalWeight = req.length + opt.length * 0.4;
      var have = 0;
      req.forEach(function(f) { if (deal[f] != null && deal[f] !== '') have += 1; });
      opt.forEach(function(f) { if (deal[f] != null && deal[f] !== '') have += 0.4; });
      return Math.round(v1Clamp(have / (totalWeight || 1) * 100, 10, 100));
    }

    function v1GetMissingFields(fieldList, deal) {
      return fieldList.filter(function(f) { return deal[f] == null || deal[f] === ''; });
    }

    // ===== RADAR V1 §4: calcContractRadarV1(deal, ctx) =====
    var _v1RadarCache = {};
    var _v1CacheVersion = 0;

    function v1ClearCache() { _v1RadarCache = {}; _v1CacheVersion++; }

    function _v1EmptyContractResult() {
      return {
        axes: V1_CONTRACT_AXES.map(function(a) {
          return { id: a.id, nameCN: a.nameCN, raw: { value: 0 }, score: 50, tier: 3, explanation: '\u65E0\u6570\u636E', evidence: {}, missing: a.requiredFields.concat(a.optionalFields), confidence: 0 };
        }),
        radarPoints: V1_CONTRACT_AXES.map(function() { return 0.5; }),
        overallScore: 50,
        overallConfidence: 0,
        missingFields: [],
        lowConfidenceWarning: true,
        schemaVersion: RADAR_V1_SCHEMA_VERSION
      };
    }

    function calcContractRadarV1(deal, ctx) {
      if (!deal) return _v1EmptyContractResult();
      ctx = ctx || {};

      var cacheKey = (deal.id || 'unknown') + '_' + _v1CacheVersion;
      if (_v1RadarCache[cacheKey]) return _v1RadarCache[cacheKey];

      var sector = deal.industry || deal.sector || 'default';
      var sectorTh = v1ThresholdsBySector[sector] || {};

      var axes = V1_CONTRACT_AXES.map(function(axisDef) {
        var th = sectorTh[axisDef.id] || v1GlobalThresholds[axisDef.id];
        var usedGlobal = !sectorTh[axisDef.id];

        // 提取raw
        var raw = axisDef.rawExtract(deal);

        // 缺失字段
        var missingReq = v1GetMissingFields(axisDef.requiredFields, deal);
        var missingOpt = v1GetMissingFields(axisDef.optionalFields || [], deal);
        var allMissing = missingReq.concat(missingOpt);

        // 可信度
        var confidence = v1ConfidenceFromEvidence(axisDef, deal);

        // 评分
        var score;
        var primaryVal = raw[axisDef.primaryRawKey];
        if (primaryVal == null || (missingReq.length === axisDef.requiredFields.length && axisDef.requiredFields.length > 0)) {
          score = 50; // 全缺失给中位默认
          confidence = Math.min(confidence, 20);
        } else {
          score = v1ScoreByThreshold(primaryVal, th);
        }
        score = Math.round(v1Clamp(score, 2, 98));

        var tier = v1TierFromScore(score);

        // 解释文案
        var explanation = '';
        try {
          explanation = axisDef.explanationTemplate(raw, score, tier, { usedGlobal: usedGlobal, sector: sector });
        } catch(e) {
          explanation = axisDef.nameCN + ': ' + score + '\u5206(Tier' + tier + ')';
        }
        if (explanation.length > 120) explanation = explanation.substring(0, 117) + '...';

        return {
          id: axisDef.id,
          nameCN: axisDef.nameCN,
          nameEN: axisDef.nameEN,
          icon: axisDef.icon,
          color: axisDef.color,
          raw: raw,
          score: score,
          tier: tier,
          explanation: explanation,
          evidence: {
            source: 'deal_object',
            auditedFlag: false,
            sampleSize: 1,
            dataWindow: ctx.dataWindow || 'latest',
            lastUpdatedAt: new Date().toISOString()
          },
          missing: allMissing,
          confidence: confidence
        };
      });

      // 雷达点 (0~1)
      var radarPoints = axes.map(function(a) { return v1Clamp(a.score / 100, 0, 1); });

      // 综合评分 (加权)
      var weightedSum = 0, weightTotal = 0;
      axes.forEach(function(a, i) {
        var w = V1_CONTRACT_AXES[i].weight;
        weightedSum += a.score * w;
        weightTotal += w;
      });
      var overallScore = Math.round(weightedSum / (weightTotal || 1));
      var overallConfidence = Math.round(axes.reduce(function(s, a) { return s + a.confidence; }, 0) / axes.length);

      // 低可信折扣
      if (overallConfidence < 60) {
        overallScore = Math.round(overallScore * (0.7 + overallConfidence / 200));
      }
      overallScore = Math.round(v1Clamp(overallScore, 5, 98));

      var result = {
        axes: axes,
        radarPoints: radarPoints,
        overallScore: overallScore,
        overallConfidence: overallConfidence,
        missingFields: axes.reduce(function(acc, a) { return acc.concat(a.missing); }, []),
        lowConfidenceWarning: overallConfidence < 60,
        schemaVersion: RADAR_V1_SCHEMA_VERSION
      };

      _v1RadarCache[cacheKey] = result;
      return result;
    }

    // ===== RADAR V1 §5: calcPortfolioRadarV1(deals[], ctx) =====
    function _v1EmptyPortfolioResult() {
      var emptyAxes = V1_CONTRACT_AXES.map(function(a) {
        return { id: a.id, nameCN: a.nameCN, weighted_mean: 50, tail_metric: 50, effective_value: 50 };
      });
      return {
        contractAxes: emptyAxes,
        portfolioAxes: [
          { id: 'single_name_concentration', nameCN: '\u5355\u9879\u76EE\u96C6\u4E2D\u5EA6', score: 50, tier: 3, raw: { top1Share: 0, hhi: 0 }, explanation: '\u65E0\u6570\u636E' },
          { id: 'sector_concentration', nameCN: '\u884C\u4E1A\u96C6\u4E2D\u5EA6', score: 50, tier: 3, raw: { sectorTop1Share: 0 }, explanation: '\u65E0\u6570\u636E' }
        ],
        radarPoints: new Array(10).fill(0.5),
        overallScore: 50,
        warnings: [],
        contractResults: [],
        schemaVersion: RADAR_V1_SCHEMA_VERSION
      };
    }

    function calcPortfolioRadarV1(deals, ctx) {
      if (!deals || deals.length === 0) return _v1EmptyPortfolioResult();
      ctx = ctx || {};

      // 每个deal先算合约8轴
      var contractResults = deals.map(function(d) { return calcContractRadarV1(d, ctx); });

      // 权重: 用 projectTotalAmount 或等权1000
      var weights = deals.map(function(d) { return d.projectTotalAmount || d.faceValue || 1; });
      var totalWeight = weights.reduce(function(s, w) { return s + w; }, 0) || 1;

      // 8轴聚合: weighted_mean + tail_metric + effective_value
      var aggregatedAxes = V1_CONTRACT_AXES.map(function(axisDef, axIdx) {
        var scores = contractResults.map(function(r) { return r.axes[axIdx].score; });

        // 加权平均
        var wMean = 0;
        scores.forEach(function(sc, i) { wMean += sc * weights[i]; });
        wMean = Math.round(wMean / totalWeight);

        // P10尾部
        var sorted = scores.slice().sort(function(a, b) { return a - b; });
        var p10Idx = Math.max(0, Math.ceil(sorted.length * 0.1) - 1);
        var tailMetric = sorted[p10Idx];

        return {
          id: axisDef.id,
          nameCN: axisDef.nameCN,
          nameEN: axisDef.nameEN,
          icon: axisDef.icon,
          color: axisDef.color,
          weighted_mean: wMean,
          tail_metric: tailMetric,
          effective_value: wMean, // 先设等于mean，后面做集中度惩罚
          min: sorted[0],
          max: sorted[sorted.length - 1]
        };
      });

      // ── 组合新增轴 ── 单项目集中度
      var top1Share = Math.max.apply(null, weights) / totalWeight;
      var hhi = weights.reduce(function(s, w) { return s + Math.pow(w / totalWeight, 2); }, 0);
      var concTh = v1GlobalThresholds['single_name_concentration'];
      var concScore = v1ScoreByThreshold(top1Share, concTh);
      var concTier = v1TierFromScore(concScore);

      // ── 行业集中度
      var sectorWeights = {};
      deals.forEach(function(d, i) {
        var ind = d.industry || 'Unknown';
        sectorWeights[ind] = (sectorWeights[ind] || 0) + weights[i];
      });
      var sectorValues = Object.keys(sectorWeights).map(function(k) { return sectorWeights[k]; });
      var sectorTop1Share = (Math.max.apply(null, sectorValues) || 0) / totalWeight;
      var sectorHHI = sectorValues.reduce(function(s, w) { return s + Math.pow(w / totalWeight, 2); }, 0);
      var sectorConcTh = v1GlobalThresholds['sector_concentration'];
      var sectorConcScore = v1ScoreByThreshold(sectorTop1Share, sectorConcTh);
      var sectorConcTier = v1TierFromScore(sectorConcScore);

      // ── 集中度惩罚: 对风险相关轴做折扣
      var riskAxesIds = ['volatility', 'default_loss', 'lifecycle_tenor_fit'];
      var concPenalty = 1.0;
      if (concScore < 40) concPenalty *= 0.92;
      if (sectorConcScore < 40) concPenalty *= 0.93;
      aggregatedAxes.forEach(function(a) {
        if (riskAxesIds.indexOf(a.id) >= 0) {
          a.effective_value = Math.round(a.weighted_mean * concPenalty);
        } else {
          a.effective_value = a.weighted_mean;
        }
      });

      // ── 风险提示
      var warnings = [];
      if (top1Share > 0.4) warnings.push('\u96C6\u4E2D\u5EA6\u9884\u8B66\uFF1ATop1\u9879\u76EE\u5360\u6BD4' + (top1Share * 100).toFixed(1) + '%\uFF0C\u5EFA\u8BAE\u5206\u6563');
      if (sectorTop1Share > 0.6) warnings.push('\u884C\u4E1A\u96C6\u4E2D\u5EA6\u9884\u8B66\uFF1ATop1\u884C\u4E1A\u5360\u6BD4' + (sectorTop1Share * 100).toFixed(1) + '%');
      aggregatedAxes.forEach(function(a) {
        if (a.weighted_mean - a.tail_metric > 20) {
          warnings.push(a.nameCN + '\u5C3E\u90E8\u62D6\u7D2F\u660E\u663E(\u5747\u503C' + a.weighted_mean + ' vs P10=' + a.tail_metric + ')\uFF0C\u5E73\u5747\u6570\u53EF\u80FD\u6D17\u767D\u98CE\u9669');
        }
      });

      // ── 组合综合评分 (10轴加权)
      var pOverall = 0, pWeightSum = 0;
      aggregatedAxes.forEach(function(a, i) {
        var w = V1_CONTRACT_AXES[i].weight;
        pOverall += a.effective_value * w;
        pWeightSum += w;
      });
      // 组合2轴
      var portfolioAxisDefs = V1_AXIS_DEFS.filter(function(a) { return a.isPortfolioOnly; });
      pOverall += concScore * portfolioAxisDefs[0].weight;
      pWeightSum += portfolioAxisDefs[0].weight;
      pOverall += sectorConcScore * portfolioAxisDefs[1].weight;
      pWeightSum += portfolioAxisDefs[1].weight;

      var portfolioOverall = Math.round(v1Clamp(pOverall / (pWeightSum || 1), 5, 98));

      // ── 10维雷达点
      var radarPoints = aggregatedAxes.map(function(a) { return v1Clamp(a.effective_value / 100, 0, 1); });
      radarPoints.push(v1Clamp(concScore / 100, 0, 1));
      radarPoints.push(v1Clamp(sectorConcScore / 100, 0, 1));

      // 组合新增轴的explanation
      var concExpl = V1_AXIS_DEFS[8].explanationTemplate({ top1Share: top1Share, hhi: hhi }, concScore, concTier);
      var sectorExpl = V1_AXIS_DEFS[9].explanationTemplate({ sectorTop1Share: sectorTop1Share }, sectorConcScore, sectorConcTier);

      return {
        contractAxes: aggregatedAxes,
        portfolioAxes: [
          { id: 'single_name_concentration', nameCN: '\u5355\u9879\u76EE\u96C6\u4E2D\u5EA6', nameEN: 'Single Name Conc.', icon: 'fa-crosshairs', color: '#7c3aed', score: concScore, tier: concTier, raw: { top1Share: top1Share, hhi: hhi }, explanation: concExpl },
          { id: 'sector_concentration', nameCN: '\u884C\u4E1A\u96C6\u4E2D\u5EA6', nameEN: 'Sector Conc.', icon: 'fa-industry', color: '#be185d', score: sectorConcScore, tier: sectorConcTier, raw: { sectorTop1Share: sectorTop1Share, sectorHHI: sectorHHI }, explanation: sectorExpl }
        ],
        radarPoints: radarPoints,
        overallScore: portfolioOverall,
        warnings: warnings,
        contractResults: contractResults,
        displayMode: 'effective_value', // 默认展示模式
        schemaVersion: RADAR_V1_SCHEMA_VERSION
      };
    }

    // ╔══════════════════════════════════════════════════════════════════════════╗
    // ║  END RADAR V1 ENGINE — 以下为旧系统兼容层                                ║
    // ╚══════════════════════════════════════════════════════════════════════════╝

    // ==================== Contract Multi-Dimension Assessment System (V1 Bridge) ====================
    // V1 统一图谱: 8维合约DNA + 2维组合 → 全站统一来源
    // 旧接口保留签名，内部代理到 RADAR V1 Engine
    const RADAR_DIMENSIONS = V1_CONTRACT_AXES.map(function(a) {
      return { key: a.id, labelKey: 'rdV1_' + a.id, icon: a.icon, color: a.color, descKey: 'rdV1Desc_' + a.id, group: a.group, nameCN: a.nameCN, nameEN: a.nameEN };
    });

    // ╔══════════════════════════════════════════════════════════════════════════╗
    // ║  一级标签 (Primary Categories) — 资产端评估雷达图 4象限                    ║
    // ║  回报(Return) · 风险(Risk) · 管控够不够 · 收益够不够                       ║
    // ╚══════════════════════════════════════════════════════════════════════════╝
    var PRIMARY_CATEGORIES = [
      { id: 'return',    zhName: '回报',     enName: 'Return',    icon: 'fa-chart-line',    color: '#60a5fa', bgColor: 'rgba(96,165,250,0.08)',  borderColor: 'rgba(96,165,250,0.2)',  dimKeys: ['return_level', 'payback_speed'] },
      { id: 'risk',      zhName: '风险',     enName: 'Risk',      icon: 'fa-shield-alt',    color: '#f87171', bgColor: 'rgba(239,68,68,0.08)',   borderColor: 'rgba(239,68,68,0.2)',   dimKeys: ['default_loss', 'volatility', 'lifecycle_tenor_fit'] },
      { id: 'control',   zhName: '管控够不够', enName: 'Control',   icon: 'fa-sliders-h',     color: '#a78bfa', bgColor: 'rgba(139,92,246,0.08)',  borderColor: 'rgba(139,92,246,0.2)',  dimKeys: ['frequency_continuity', 'control_enforceability'] },
      { id: 'adequacy',  zhName: '收益够不够', enName: 'Adequacy',  icon: 'fa-balance-scale',  color: '#4ade80', bgColor: 'rgba(74,222,128,0.08)',  borderColor: 'rgba(74,222,128,0.2)',  dimKeys: ['coverage_cushion'] }
    ];
    // 快速查找: dimKey → 所属一级标签
    var DIM_TO_PRIMARY = {};
    PRIMARY_CATEGORIES.forEach(function(cat) {
      cat.dimKeys.forEach(function(k) { DIM_TO_PRIMARY[k] = cat; });
    });

    // V1 维度名称映射 (中/英双语) — 按雷达图二级标签命名
    // 鼠标hover显示专业逻辑（V1_DIM_DESCS）
    var V1_DIM_LABELS = {
      return_level:           { zh: '回报强度',         en: 'Return Intensity' },
      payback_speed:          { zh: '回报质量',         en: 'Return Quality' },
      frequency_continuity:   { zh: 'Leverage管控力',   en: 'Leverage Control' },
      volatility:             { zh: '现金流可靠性',     en: 'Cash Flow Reliability' },
      coverage_cushion:       { zh: '生意的利润率',     en: 'Business Profit Margin' },
      default_loss:           { zh: '波动可控性',       en: 'Volatility Control' },
      lifecycle_tenor_fit:    { zh: '生命周期可见性',   en: 'Lifecycle Visibility' },
      control_enforceability: { zh: '自动报数和打款',   en: 'Auto-Report & Payment' }
    };
    // 分组标签 — 4个一级标签
    var V1_DIM_GROUPS = {
      return_level:           { zh: '回报', en: 'Return' },
      payback_speed:          { zh: '回报', en: 'Return' },
      frequency_continuity:   { zh: '管控够不够', en: 'Control' },
      volatility:             { zh: '风险', en: 'Risk' },
      coverage_cushion:       { zh: '收益够不够', en: 'Adequacy' },
      default_loss:           { zh: '风险', en: 'Risk' },
      lifecycle_tenor_fit:    { zh: '风险', en: 'Risk' },
      control_enforceability: { zh: '管控够不够', en: 'Control' }
    };
    // 专业tooltip描述 — hover时显示
    var V1_DIM_DESCS = {
      return_level:           { zh: '回报强度：年化投资回报率（Annual ROI），基于收益分成比例折算；含IRR/MOIC等回报指标', en: 'Return Intensity: Annual ROI derived from revenue share ratio; includes IRR/MOIC metrics' },
      payback_speed:          { zh: '回报质量：单位收益 = ROI / CAPEX，衡量每一元投入产生的回报效率；回本天数越短，质量越高', en: 'Return Quality: Unit Return = ROI / CAPEX, return efficiency per capital unit; shorter payback = higher quality' },
      frequency_continuity:   { zh: 'Leverage管控力：团队规模 × 运营年限综合评级，反映人力治理成熟度与杠杆管控能力', en: 'Leverage Control: Team size × operational years composite rating, reflects governance maturity and leverage management' },
      volatility:             { zh: '现金流可靠性：融资规模 / 月营收比值评级，杠杆越低越健康；含现金流波动系数CV', en: 'Cash Flow Reliability: Financing scale / monthly revenue ratio; lower leverage = healthier; includes CF volatility CV' },
      coverage_cushion:       { zh: '生意的利润率：合约回报 / 行业平均回报，>1表示优于行业平均；含DSCR偿债覆盖倍数', en: 'Business Profit Margin: Contract Return / Industry Avg Return, >1 = above average; includes DSCR coverage' },
      default_loss:           { zh: '波动可控性：综合风控等级评估（评级制），含信用风险、运营风险、市场风险；EL=PD×LGD', en: 'Volatility Control: Risk grade assessment incl. credit, operational, market risks; EL=PD×LGD' },
      lifecycle_tenor_fit:    { zh: '生命周期可见性：合约时长 / 行业平均寿命，反映合约存续期是否合理匹配行业特征', en: 'Lifecycle Visibility: Contract Duration / Industry Avg Lifespan, reflects term-industry fit' },
      control_enforceability: { zh: '自动报数和打款：分账自动化/数据审计/权限管控/执行预案综合评级', en: 'Auto-Report & Payment: Split-payment automation, data audit, permission control, enforcement playbook' }
    };

    // 兼容旧代码的 getDimLabel / getDimDesc / getDimGroup
    function getDimLabel(dim) {
      var labels = V1_DIM_LABELS[dim.key];
      if (labels) return currentLang === 'zh' ? labels.zh : labels.en;
      return dim.nameCN || dim.key;
    }
    function getDimDesc(dim) {
      var descs = V1_DIM_DESCS[dim.key];
      if (descs) return currentLang === 'zh' ? descs.zh : descs.en;
      return '';
    }
    // 获取维度分组标签（风险/收益/管控）
    function getDimGroup(dim) {
      var groups = V1_DIM_GROUPS[dim.key];
      if (groups) return currentLang === 'zh' ? groups.zh : groups.en;
      return '';
    }
    // 分组颜色
    function getDimGroupColor(dim) {
      var cat = DIM_TO_PRIMARY[dim.key];
      if (cat) return cat.color;
      return '#5A9A90';
    }
    // 获取维度对应的一级标签CSS class
    function getDimGroupCls(dim) {
      var cat = DIM_TO_PRIMARY[dim.key];
      if (!cat) return '';
      if (cat.id === 'risk') return 'dim-group-risk';
      if (cat.id === 'return') return 'dim-group-return';
      if (cat.id === 'control') return 'dim-group-control';
      if (cat.id === 'adequacy') return 'dim-group-adequacy';
      return '';
    }

    // 保留行业参考常量(用于其他地方)
    const INDUSTRY_AVG_LIFESPAN = { 'F&B': 36, 'Retail': 30, 'Technology': 48, 'Education': 36, 'Healthcare': 42, 'Entertainment': 24, 'Finance': 48, 'Real Estate': 60, 'Logistics': 36, 'Agriculture': 48 };
    const INDUSTRY_AVG_RETURN = { 'F&B': 10, 'Retail': 8, 'Technology': 14, 'Education': 9, 'Healthcare': 12, 'Entertainment': 16, 'Finance': 11, 'Real Estate': 8, 'Logistics': 9, 'Agriculture': 7 };

    // ===== calcRadarScores → V1 代理 (返回8元素score数组，兼容旧调用) =====
    function calcRadarScores(deal) {
      if (!deal) return RADAR_DIMENSIONS.map(function() { return 50; });
      var result = calcContractRadarV1(deal);
      return result.axes.map(function(a) { return a.score; });
    }

    // Calculate per-contract est. monthly income (project monthly rev × share ÷ total contracts)
    function calcContractMonthlyIncome(deal) {
      const monthlyRev = parseInt(deal.monthlyRevenue) || 50;
      const shareNum = parseInt(deal.revenueShare) || 10;
      const totalAmt = deal.projectTotalAmount || 50;
      const totalContracts = totalAmt * 10;
      return monthlyRev * 10000 * shareNum / 100 / totalContracts;
    }

    // ===== calcDealDisplayValues → 从V1 axes.raw提取关键显示值 =====
    function calcDealDisplayValues(deal) {
      if (!deal) return ['—', '—', '—', '—', '—', '—', '—', '—'];
      var r = calcContractRadarV1(deal);
      return r.axes.map(function(a) {
        var raw = a.raw;
        var v = raw.value;
        switch (a.id) {
          case 'return_level': return v.toFixed(1) + '%';
          case 'payback_speed': return v + (currentLang === 'zh' ? '\u5929' : 'd');
          case 'frequency_continuity': return (v * 100).toFixed(0) + '%';
          case 'volatility': return 'CV ' + v.toFixed(2);
          case 'coverage_cushion': return v.toFixed(2) + 'x';
          case 'default_loss': return (raw.defaultRate * 100).toFixed(1) + '%';
          case 'lifecycle_tenor_fit': return v.toFixed(1) + 'x';
          case 'control_enforceability': return v.toFixed(0) + '/100';
          default: return String(v);
        }
      });
    }

    // ===== calcPortfolioDisplayValues → 从V1组合结果提取 =====
    function calcPortfolioDisplayValues(contracts) {
      if (!contracts || contracts.length === 0) return ['—', '—', '—', '—', '—', '—', '—', '—'];
      var pr = calcPortfolioRadarV1(contracts);
      return pr.contractAxes.map(function(a) {
        switch (a.id) {
          case 'return_level': return a.weighted_mean + (currentLang === 'zh' ? '\u5206' : 'pt');
          case 'payback_speed': return a.weighted_mean + (currentLang === 'zh' ? '\u5206' : 'pt');
          case 'frequency_continuity': return a.weighted_mean + (currentLang === 'zh' ? '\u5206' : 'pt');
          case 'volatility': return a.weighted_mean + (currentLang === 'zh' ? '\u5206' : 'pt');
          case 'coverage_cushion': return a.weighted_mean + (currentLang === 'zh' ? '\u5206' : 'pt');
          case 'default_loss': return a.weighted_mean + (currentLang === 'zh' ? '\u5206' : 'pt');
          case 'lifecycle_tenor_fit': return a.weighted_mean + (currentLang === 'zh' ? '\u5206' : 'pt');
          case 'control_enforceability': return a.weighted_mean + (currentLang === 'zh' ? '\u5206' : 'pt');
          default: return a.weighted_mean + '';
        }
      });
    }

    // ===== Dimension sub-labels → V1 维度短名 =====
    function getRadarSubLabel(i) {
      if (i < V1_CONTRACT_AXES.length) {
        var a = V1_CONTRACT_AXES[i];
        return currentLang === 'zh' ? a.nameCN : a.nameEN;
      }
      // 组合轴(9,10)
      if (i === 8) return currentLang === 'zh' ? '\u5355\u9879\u76EE\u96C6\u4E2D' : 'Name Conc.';
      if (i === 9) return currentLang === 'zh' ? '\u884C\u4E1A\u96C6\u4E2D' : 'Sector Conc.';
      return '';
    }

    // ===== calcOverallScore → V1 代理 (兼容旧 score[] 入参) =====
    function calcOverallScore(scores) {
      // 如果传入的是V1 result对象
      if (scores && scores.overallScore != null) return scores.overallScore;
      // 兼容旧数组入参: 用V1权重
      var weights = V1_CONTRACT_AXES.map(function(a) { return a.weight; });
      var total = 0, wSum = 0;
      scores.forEach(function(s, i) {
        if (i < weights.length) { total += s * weights[i]; wSum += weights[i]; }
      });
      return Math.round(total / (wSum || 1));
    }

    // Score grade determination
    function getScoreGrade(score) {
      if (score >= 85) return { grade: 'S', label: t('gradeExcellent'), color: '#059669', bg: 'rgba(5,150,105,0.1)' };
      if (score >= 75) return { grade: 'A', label: t('gradeGood'), color: '#0d9488', bg: 'rgba(13,148,136,0.1)' };
      if (score >= 65) return { grade: 'B+', label: t('gradeAboveAvg'), color: '#2563eb', bg: 'rgba(37,99,235,0.1)' };
      if (score >= 55) return { grade: 'B', label: t('gradeAverage'), color: '#d97706', bg: 'rgba(217,119,6,0.1)' };
      if (score >= 40) return { grade: 'C', label: t('gradeBelowAvg'), color: '#dc2626', bg: 'rgba(220,38,38,0.1)' };
      return { grade: 'D', label: t('gradeRisky'), color: '#991b1b', bg: 'rgba(153,27,27,0.1)' };
    }

    // ==================== Canvas Radar Chart Drawing ====================
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
      const startAngle = -Math.PI / 2; // Start from top

      // Clear
      ctx.clearRect(0, 0, size, size);

      // Draw background grid (5 layers)
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
        ctx.strokeStyle = ring === 5 ? 'rgba(46,196,182,0.2)' : 'rgba(46,196,182,0.08)';
        ctx.lineWidth = ring === 5 ? 1.2 : 0.8;
        ctx.stroke();

        // 20/40/60/80/100 labels
        if (ring % 2 === 0 || ring === 1) {
          ctx.fillStyle = 'rgba(142,189,181,0.4)';
          ctx.font = '9px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText((ring * 20).toString(), cx + 3, cy - r + 3);
        }
      }

      // Draw axis lines
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
        ctx.strokeStyle = 'rgba(46,196,182,0.12)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Draw data area (gradient fill)
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

      // Gradient fill
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      gradient.addColorStop(0, 'rgba(46,196,182,0.35)');
      gradient.addColorStop(1, 'rgba(46,196,182,0.08)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke
      ctx.strokeStyle = 'rgba(46,196,182,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw data points
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const val = (scores[i] || 0) / 100;
        const r = maxR * val;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        // Outer circle
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#0B1E1C';
        ctx.fill();
        ctx.strokeStyle = dims[i].color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = dims[i].color;
        ctx.fill();
      }

      // Draw dimension labels
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const displayLabels = options.displayValues || null; // Actual display labels (e.g., "12.0%", "540days")
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const labelR = maxR + 25;
        const x = cx + labelR * Math.cos(angle);
        const y = cy + labelR * Math.sin(angle);

        // Show actual value (preferred) or score
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = dims[i].color;
        const scoreY = angle < 0 ? y - 7 : (angle > Math.PI * 0.8 ? y - 7 : y + 7);
        const labelText = displayLabels ? displayLabels[i] : scores[i].toString();
        ctx.fillText(labelText, x, i === 0 ? y - 5 : scoreY);

        // Label name
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = '#5A9A90';
        const nameY = i === 0 ? y + 6 : (angle < 0 ? y + 4 : (angle > Math.PI * 0.8 ? y + 4 : y - 4));
        // Adjust text alignment for left/right labels
        const cosA = Math.cos(angle);
        if (cosA < -0.3) ctx.textAlign = 'right';
        else if (cosA > 0.3) ctx.textAlign = 'left';
        else ctx.textAlign = 'center';
        ctx.fillText(getRadarSubLabel(i), x, nameY);
        ctx.textAlign = 'center';
      }
    }

    // Mini radar chart (for card preview)
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

      // Background grid
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = startAngle + (i % n) * angleStep;
        const x = cx + maxR * Math.cos(angle);
        const y = cy + maxR * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(46,196,182,0.12)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Data
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

    // ==================== Dynamic Sieve Selector Rendering ====================
    function getSieveName(key) {
      var map = { industry: 'sieveIndustry', risk: 'sieveRisk', 'return': 'sieveReturn', composite: 'sieveComposite', location: 'sieveLocation', growth: 'sieveGrowth', largeScale: 'sieveLargeScale', teamStrength: 'sieveTeamStrength', quickReturn: 'sieveQuickReturn', safeHaven: 'sieveSafeHaven' };
      return map[key] ? t(map[key]) : (SIEVE_LIBRARY[key] ? SIEVE_LIBRARY[key].name : key);
    }
    function getSieveDesc(key) {
      var map = { industry: 'sieveIndustryDesc', risk: 'sieveRiskDesc', 'return': 'sieveReturnDesc', composite: 'sieveCompositeDesc', location: 'sieveLocationDesc', growth: 'sieveGrowthDesc', largeScale: 'sieveLargeScaleDesc', teamStrength: 'sieveTeamStrengthDesc', quickReturn: 'sieveQuickReturnDesc', safeHaven: 'sieveSafeHavenDesc' };
      return map[key] ? t(map[key]) : (SIEVE_LIBRARY[key] ? SIEVE_LIBRARY[key].desc : '');
    }
    function getSieveCat(key) {
      var s = SIEVE_LIBRARY[key]; if (!s) return '';
      var map = { 'Industry': 'sieveCatIndustry', 'Risk Mgmt': 'sieveCatRisk', 'Return': 'sieveCatReturn', 'Composite': 'sieveCatComposite', 'Location': 'sieveCatLocation', 'Growth': 'sieveCatGrowth', 'Scale': 'sieveCatScale', 'Team': 'sieveCatTeam', 'Cycle': 'sieveCatCycle' };
      return map[s.category] ? t(map[s.category]) : s.category;
    }

    function renderSieveSelector() {
      const container = document.getElementById('sieveSelector');
      if (!container) return;
      const models = getActiveSieveModels();
      let html = '<button onclick="selectSieve(&apos;all&apos;)" class="sieve-chip' + (currentSieve === 'all' ? ' active' : '') + '" data-sieve="all"><i class="fas fa-globe text-[#3D7A70]"></i>' + t('sieveAll') + '</button>';
      mySieves.forEach(key => {
        const s = SIEVE_LIBRARY[key];
        if (!s) return;
        html += '<button onclick="selectSieve(&apos;' + key + '&apos;)" class="sieve-chip' + (currentSieve === key ? ' active' : '') + '" data-sieve="' + key + '"><i class="fas ' + s.icon + '" style="color:' + s.color + ';"></i>' + getSieveName(key) + '</button>';
      });
      container.innerHTML = html;
    }

    // ==================== Sieve Manager Modal ====================
    function showSieveManager() {
      // Remove old modal
      const old = document.getElementById('sieveManagerModal'); if (old) old.remove();

      const libraryKeys = Object.keys(SIEVE_LIBRARY);
      const availableKeys = libraryKeys.filter(k => !mySieves.includes(k));

      const modal = document.createElement('div');
      modal.id = 'sieveManagerModal';
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300]';
      modal.style.animation = 'fadeIn 0.2s ease';
      modal.onclick = (e) => { if (e.target === modal) closeSieveManager(); };

      modal.innerHTML = '<div style="animation: scaleIn 0.25s cubic-bezier(0.28,0.11,0.32,1);" class="bg-[#0F2E2B] rounded-3xl max-w-3xl w-full mx-4 overflow-hidden" style="box-shadow: 0 24px 80px rgba(0,0,0,0.2);">' +
        // Header
        '<div class="p-5 border-b border-[rgba(46,196,182,0.08)]" style="background: linear-gradient(135deg, rgba(6,182,212,0.06), rgba(14,165,233,0.04));">' +
          '<div class="flex items-center justify-between">' +
            '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #06b6d4, #0ea5e9); box-shadow: 0 4px 12px rgba(6,182,212,0.3);"><i class="fas fa-cogs text-white"></i></div><div><h2 class="text-lg font-bold text-[#E8F5F3]">' + t('smTitle') + '</h2><p class="text-xs text-[#3D7A70]">' + t('smSub') + '</p></div></div>' +
            '<button onclick="closeSieveManager()" class="w-8 h-8 rounded-full bg-[rgba(46,196,182,0.06)] hover:bg-[rgba(46,196,182,0.1)] flex items-center justify-center text-[#5A9A90] transition-colors"><i class="fas fa-times"></i></button>' +
          '</div>' +
        '</div>' +
        // Body — two columns
        '<div class="flex" style="min-height: 380px; max-height: 70vh;">' +
          // Left column: sieve library
          '<div class="w-1/2 border-r border-[rgba(46,196,182,0.08)] flex flex-col">' +
            '<div class="p-4 border-b border-gray-50 flex items-center justify-between"><h3 class="text-sm font-bold text-[#B0D5CF]"><i class="fas fa-warehouse mr-1.5 text-cyan-500"></i>' + t('smLibrary') + '</h3><span class="text-xs text-[#3D7A70]">' + t('smAvailable', {n: libraryKeys.length}) + '</span></div>' +
            '<div class="flex-1 overflow-y-auto p-3 space-y-2" id="sieveLibraryList">' +
              renderLibraryItems(libraryKeys) +
            '</div>' +
          '</div>' +
          // Right column: my sieves
          '<div class="w-1/2 flex flex-col" style="background: #fafbfc;">' +
            '<div class="p-4 border-b border-gray-50 flex items-center justify-between"><h3 class="text-sm font-bold text-[#B0D5CF]"><i class="fas fa-star mr-1.5 text-amber-500"></i>' + t('smMySieves') + '</h3><span class="text-xs text-[#3D7A70]" id="mySieveCount">' + t('smAdded', {n: mySieves.length}) + '</span></div>' +
            '<div class="flex-1 overflow-y-auto p-3 space-y-2" id="mySieveList">' +
              renderMySieveItems() +
            '</div>' +
          '</div>' +
        '</div>' +
        // Footer
        '<div class="p-4 border-t border-[rgba(46,196,182,0.08)] flex items-center justify-between bg-[#0B2624]">' +
          '<p class="text-xs text-[#3D7A70]"><i class="fas fa-info-circle mr-1"></i>' + t('smBuiltinHint') + '</p>' +
          '<button onclick="closeSieveManager()" class="px-5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-[rgba(46,196,182,0.15)] transition-all"><i class="fas fa-check mr-1.5"></i>' + t('smDone') + '</button>' +
        '</div>' +
      '</div>';

      document.body.appendChild(modal);
    }

    function renderLibraryItems(keys) {
      if (!keys) keys = Object.keys(SIEVE_LIBRARY);
      return keys.map(key => {
        const s = SIEVE_LIBRARY[key];
        const isAdded = mySieves.includes(key);
        return '<div class="flex items-center gap-3 p-3 rounded-xl border transition-all ' + (isAdded ? 'bg-[#0B2624] border-[rgba(46,196,182,0.08)] opacity-60' : 'bg-[#0F2E2B] border-[rgba(46,196,182,0.08)] hover:border-[rgba(6,182,212,0.3)] hover:shadow-sm') + '" id="lib_' + key + '">' +
          '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + s.color + '15;"><i class="fas ' + s.icon + '" style="color:' + s.color + '; font-size:14px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-1.5"><p class="text-sm font-semibold text-[#E8F5F3] truncate">' + getSieveName(key) + '</p><span class="text-xs px-1.5 py-0.5 rounded bg-[rgba(46,196,182,0.06)] text-[#5A9A90] flex-shrink-0">' + getSieveCat(key) + '</span></div>' +
            '<p class="text-xs text-[#3D7A70] truncate mt-0.5">' + getSieveDesc(key) + '</p>' +
          '</div>' +
          (isAdded
            ? '<span class="text-xs text-[#3D7A70] flex-shrink-0 px-2 py-1"><i class="fas fa-check"></i> ' + t('smAlreadyAdded') + '</span>'
            : '<button onclick="addSieve(&apos;' + key + '&apos;)" class="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-[#06B6D4] bg-[rgba(6,182,212,0.06)] hover:bg-[rgba(6,182,212,0.1)] rounded-lg transition-colors"><i class="fas fa-plus mr-1"></i>' + t('smAdd') + '</button>') +
        '</div>';
      }).join('');
    }

    function renderMySieveItems() {
      if (mySieves.length === 0) {
        return '<div class="text-center py-8"><div class="w-12 h-12 rounded-full bg-[rgba(46,196,182,0.06)] flex items-center justify-center mx-auto mb-3"><i class="fas fa-inbox text-[#2A5E58] text-lg"></i></div><p class="text-sm text-[#3D7A70]">' + t('smEmptyTitle') + '</p><p class="text-xs text-[#2A5E58] mt-1">' + t('smEmptySub') + '</p></div>';
      }
      return mySieves.map((key, idx) => {
        const s = SIEVE_LIBRARY[key];
        if (!s) return '';
        return '<div class="flex items-center gap-3 p-3 bg-[#0F2E2B] rounded-xl border border-[rgba(46,196,182,0.08)] hover:border-[rgba(239,68,68,0.3)] group transition-all" id="my_' + key + '">' +
          '<div class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-[#3D7A70] bg-[rgba(46,196,182,0.06)] flex-shrink-0">' + (idx + 1) + '</div>' +
          '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + s.color + '15;"><i class="fas ' + s.icon + '" style="color:' + s.color + '; font-size:14px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-sm font-semibold text-[#E8F5F3] truncate">' + getSieveName(key) + '</p>' +
            '<p class="text-xs text-[#3D7A70] truncate">' + getSieveCat(key) + '</p>' +
          '</div>' +
          '<button onclick="removeSieve(&apos;' + key + '&apos;)" class="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-red-500 bg-[rgba(239,68,68,0.08)] hover:bg-[rgba(239,68,68,0.15)] rounded-lg transition-colors opacity-0 group-hover:opacity-100"><i class="fas fa-trash-alt mr-1"></i>' + t('smRemove') + '</button>' +
        '</div>';
      }).join('');
    }

    function addSieve(key) {
      if (mySieves.includes(key)) return;
      mySieves.push(key);
      saveMySieves();
      refreshSieveManager();
      renderSieveSelector();
      showToast('success', currentLang === 'zh' ? '已添加' : 'Added', getSieveName(key) + (currentLang === 'zh' ? ' 已添加到您的筛子面板' : ' has been added to your sieve panel'));
    }

    function removeSieve(key) {
      mySieves = mySieves.filter(k => k !== key);
      saveMySieves();
      // If removed sieve is current, reset to all
      if (currentSieve === key) {
        currentSieve = 'all';
        selectSieve('all');
      }
      refreshSieveManager();
      renderSieveSelector();
      showToast('info', currentLang === 'zh' ? '已移除' : 'Removed', getSieveName(key) + (currentLang === 'zh' ? ' 已从您的面板移除' : ' has been removed from your panel'));
    }

    function refreshSieveManager() {
      const libList = document.getElementById('sieveLibraryList');
      const myList = document.getElementById('mySieveList');
      const myCount = document.getElementById('mySieveCount');
      if (libList) libList.innerHTML = renderLibraryItems();
      if (myList) myList.innerHTML = renderMySieveItems();
      if (myCount) myCount.textContent = mySieves.length + ' added';
    }

    function closeSieveManager() {
      const modal = document.getElementById('sieveManagerModal');
      if (modal) { modal.style.opacity = '0'; setTimeout(() => modal.remove(), 200); }
    }

    // ==================== Sieve Selection ====================
    function selectSieve(sieveKey) {
      currentSieve = sieveKey;
      // Persist sieve selection
      try { localStorage.setItem('ec_lastSieve', sieveKey); } catch(e) {}
      // Update UI (safe handling, may be called from non-dashboard pages)
      document.querySelectorAll('#sieveSelector .sieve-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.sieve === sieveKey);
      });
      // Get current available sieve models
      const models = getActiveSieveModels();
      const sieve = models[sieveKey];
      if (sieve) {
        dealsList = sieve.filter(allDeals);
        // Update sieve description (safe null check)
        const descEl = document.getElementById('sieveDescription');
        const descText = document.getElementById('sieveDescText');
        if (descEl) {
          if (sieveKey === 'all') {
            descEl.classList.add('hidden');
          } else {
            descEl.classList.remove('hidden');
            if (descText) descText.textContent = getSieveDesc(Object.keys(SIEVE_LIBRARY).find(k => SIEVE_LIBRARY[k] === sieve) || '');
          }
        }
        // Update labels
        const label = document.getElementById('filterLabel');
        if (label) {
          if (sieveKey === 'all') {
            label.textContent = '· ' + t('sieveShowAll') + (totalVirtualContracts || allDeals.length).toLocaleString() + t('sieveOpportunities');
          } else {
            var sieveDisplayName = getSieveName(sieveKey);
            label.textContent = '· ' + sieveDisplayName + ' — ' + t('sievePassed') + dealsList.length + '/' + (totalVirtualContracts || allDeals.length).toLocaleString();
          }
        }
      } else {
        // sieve not found (e.g. 'all' before mySieves init)
        dealsList = allDeals.map(d => ({ ...d, matchScore: null, sieveResult: 'all' }));
      }
      renderDeals();
      if (sieveKey !== 'all' && sieve && dealsList.length > 0) {
        showToast('success', getSieveName(sieveKey), t('sieveFiltered') + dealsList.length + t('sieveMatchOpp'));
      }
    }

    // ==================== Render Deals ====================
    function renderDeals() {
      const grid = document.getElementById('dealGrid');
      const empty = document.getElementById('emptyState');
      if (!grid) return; // Safety check: skip if not on dashboard page
      const searchVal = (document.getElementById('dealSearch')?.value || '').toLowerCase();
      const filterVal = document.getElementById('filterStatus')?.value || 'all';

      let filtered = dealsList.filter(d => {
        if (searchVal && !getProjectName(d).toLowerCase().includes(searchVal) && !d.name.toLowerCase().includes(searchVal) && !(d.name_zh || '').toLowerCase().includes(searchVal) && !d.industry.includes(searchVal) && !getIndustryName(d.industry).includes(searchVal)) return false;
        if (filterVal === 'mine') {
          if (!d.isMine) return false;
        } else if (filterVal === 'available') {
          if (d.status !== 'available') return false;
        } else if (filterVal === 'sold') {
          if (d.status !== 'sold' || d.isMine) return false;
        }
        return true;
      });

      // Update stats — objective dimension summary (no preset judgments)
      var dashVTotal = totalVirtualContracts || allDeals.length;
      var dashVMine = 0;
      var dashVSold = 0; // Total deals (sold)
      projectSummaries.forEach(function(ps) {
        dashVMine += ps.mine;
        dashVSold += ps.sold;
      });
      if (dashVMine === 0) dashVMine = allDeals.filter(d => d.isMine).length;
      if (dashVSold === 0) dashVSold = allDeals.filter(d => d.status === 'sold').length;
      // My portfolios = cross-project fund portfolio count
      var fundPortfolios = getMyPortfolios();
      var dashVPortfolios = fundPortfolios.length;
      var el;
      el = document.getElementById('statTotalContracts'); animateNumber(el, dashVTotal);
      el = document.getElementById('statTotalTransactions'); animateNumber(el, dashVSold);
      el = document.getElementById('statMyContracts'); animateNumber(el, dashVMine);
      el = document.getElementById('statMyPortfolios'); animateNumber(el, dashVPortfolios);
      // Bloomberg Ticker sync update
      el = document.getElementById('tickerTotalContracts'); animateNumber(el, dashVTotal);
      el = document.getElementById('tickerTotalTransactions'); animateNumber(el, dashVSold);
      el = document.getElementById('tickerMyContracts'); animateNumber(el, dashVMine);
      el = document.getElementById('tickerMyPortfolios'); animateNumber(el, dashVPortfolios);
      // Update AI entry card stats
      el = document.getElementById('aiEntryContracts'); if (el) el.textContent = dashVTotal.toLocaleString();
      el = document.getElementById('aiEntryProjects'); if (el) el.textContent = allDeals.length.toLocaleString();
      // Update AI stats cards
      var aiReadyEl = document.getElementById('statAIReady');
      if (aiReadyEl && dashVTotal > 0) { aiReadyEl.innerHTML = '<span style="font-family:SF Mono,Fira Code,monospace;">' + dashVTotal.toLocaleString() + '</span>'; }
      // Dynamic update welcome subtitle
      var subText = document.getElementById('welcomeSubText');
      if (subText) {
        if (dashVMine > 0) {
          subText.textContent = t('welcomeSubHolding', { mine: dashVMine, portfolios: dashVPortfolios });
        } else {
          subText.textContent = t('welcomeSubExplore', { total: dashVTotal.toLocaleString() });
        }
      }

      if (filtered.length === 0) {
        if (searchVal) {
          grid.innerHTML = '<div class="col-span-full text-center py-12"><div class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style="background:rgba(46,196,182,0.06);"><i class="fas fa-search text-2xl" style="color:#3D7A70;"></i></div><p class="text-sm font-semibold" style="color:#8EBDB5;">' + t('dealSearchEmpty', {keyword: searchVal}) + '</p><p class="text-xs mt-1" style="color:#3D7A70;">' + t('dealSearchEmptyHint') + '</p><button onclick="document.getElementById(&#39;dealSearch&#39;).value=&#39;&#39;;renderDeals();" class="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium" style="background:rgba(46,196,182,0.08);color:#3DD8CA;border:1px solid rgba(46,196,182,0.2);">' + t('dealClearSearch') + '</button></div>';
          if (empty) empty.classList.add('hidden');
        } else {
          grid.innerHTML = ''; if (empty) empty.classList.remove('hidden');
        }
        return;
      }
      if (empty) empty.classList.add('hidden');

      const statusMap = {
        available: { label: t('dealStatusAvailable'), cls: 'badge-warning', icon: 'fa-tag' },
        sold: { label: t('dealStatusSold'), cls: 'badge-success', icon: 'fa-check' }
      };

      grid.innerHTML = filtered.map((d, idx) => {
        const st = statusMap[d.status] || statusMap.available;
        const hasMatch = d.matchScore !== null && d.matchScore !== undefined;
        const matchColor = hasMatch ? (d.matchScore >= 80 ? '#10b981' : d.matchScore >= 60 ? '#f59e0b' : '#ef4444') : '#3D7A70';

        // Calculate radar scores for card display
        const cardScores = calcRadarScores(d);
        const cardOverall = calcOverallScore(cardScores);
        const cardGrade = getScoreGrade(cardOverall);
        const miniCanvasId = 'miniRadar_' + d.id;

        return '<div class="project-card group cursor-pointer animate-fade-in" onclick="openDetail(&#39;' + d.id + '&#39;)">' +
          // Terminal Header — MCN + Status + Score
          '<div class="flex items-center justify-between mb-2">' +
            '<div class="flex items-center gap-2">' +
              '<span class="font-mono text-xs font-bold tracking-wider px-1.5 py-0.5 rounded" style="background: rgba(46,196,182,0.08); color: #3DD8CA; border: 1px solid rgba(46,196,182,0.15); font-size: 10px;">' + (d.mcn || '') + '</span>' +
              '<span class="badge ' + st.cls + ' flex-shrink-0"><i class="fas ' + st.icon + ' mr-1"></i>' + st.label + (d.isMine ? t('dealStatusMine') : '') + '</span>' +
            '</div>' +
            '<div class="flex items-center gap-1.5 flex-shrink-0" title="' + t('dealScoreTitle') + '">' +
              '<canvas id="' + miniCanvasId + '" width="60" height="60" style="width:26px;height:26px;"></canvas>' +
              '<div class="text-right">' +
                '<p class="font-mono text-sm font-black leading-none" style="color:' + cardGrade.color + ';">' + cardOverall + '</p>' +
                '<p class="font-mono font-bold leading-none" style="font-size:8px; color:' + cardGrade.color + '; opacity:0.8;">' + cardGrade.grade + '</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
          // Project Name Row
          '<div class="flex items-center space-x-2 mb-2">' +
            '<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(93,196,179,0.1);"><i class="fas fa-briefcase" style="color: #5DC4B3; font-size:12px;"></i></div>' +
            '<div class="min-w-0 flex-1"><h3 class="font-bold text-[#E8F5F3] text-sm group-hover:text-[#3DD8CA] transition-colors truncate">' + getProjectName(d) + '</h3><p class="text-xs text-[#5A9A90]">' + getIndustryName(d.industry) + ' · ' + getCityName(d.location) + '</p></div>' +
          '</div>' +
          // Source + Sieve Tags
          (hasMatch ? '<div class="flex items-center gap-1.5 mb-2">' +
            '<span class="source-tag source-originate"><i class="fas fa-paper-plane" style="font-size:8px;"></i>' + t('dealOriginate') + '</span>' +
            '<span class="sieve-tag sieve-pass"><i class="fas fa-check" style="font-size:8px;"></i>' + (d.sieveName ? (function(){ var foundKey = mySieves.find(k => SIEVE_LIBRARY[k] && SIEVE_LIBRARY[k].name === d.sieveName) || Object.keys(SIEVE_LIBRARY).find(k => SIEVE_LIBRARY[k].name === d.sieveName) || ''; return foundKey ? getSieveName(foundKey) : d.sieveName; })() : t('dealSieve')) + '</span>' +
            '<span class="font-mono text-xs font-bold" style="color:' + matchColor + ';">' + d.matchScore + '%</span>' +
            '<div class="flex-1 h-1 rounded-full overflow-hidden" style="background:rgba(46,196,182,0.08);"><div class="h-full rounded-full" style="width:' + d.matchScore + '%;background:' + matchColor + ';"></div></div>' +
          '</div>' : '<div class="flex items-center gap-1.5 mb-2"><span class="source-tag source-originate"><i class="fas fa-paper-plane" style="font-size:8px;"></i>' + t('dealOriginate') + '</span></div>') +
          // Terminal Data Grid — Contract Core Info
          '<div class="grid grid-cols-4 gap-1 mb-2">' +
            '<div class="text-center p-1.5 rounded-md" style="background:rgba(46,196,182,0.05); border:1px solid rgba(46,196,182,0.08);"><p class="font-mono text-sm font-black text-[#3DD8CA]">¥1K</p><p style="font-size:8px;" class="text-[#3D7A70] uppercase tracking-wider">' + t('cardFace') + '</p></div>' +
            '<div class="text-center p-1.5 rounded-md" style="background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.08);"><p class="font-mono text-sm font-bold text-[#FBBF24]">' + d.revenueShare + '</p><p style="font-size:8px;" class="text-[#3D7A70] uppercase tracking-wider">' + t('cardYield') + '</p></div>' +
            '<div class="text-center p-1.5 rounded-md" style="background:rgba(6,182,212,0.05); border:1px solid rgba(6,182,212,0.08);"><p class="font-mono text-sm font-bold text-[#22D3EE]">' + getPeriodDisplay(d) + '</p><p style="font-size:8px;" class="text-[#3D7A70] uppercase tracking-wider">' + t('cardTerm') + '</p></div>' +
            '<div class="text-center p-1.5 rounded-md" style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.08);"><p class="font-mono text-sm font-bold text-[#34D399]">' + d.riskGrade + '</p><p style="font-size:8px;" class="text-[#3D7A70] uppercase tracking-wider">' + t('cardRisk') + '</p></div>' +
          '</div>' +
          // Footer — Date + AI Score + Action
          '<div class="flex items-center justify-between pt-2 border-t border-[rgba(46,196,182,0.06)]">' +
            '<div class="flex items-center gap-3">' +
              '<span class="text-xs text-[#3D7A70]"><i class="fas fa-clock mr-1" style="font-size:9px;"></i>' + d.originateDate + '</span>' +
              '<span class="font-mono text-xs font-bold text-[#B0D5CF]"><i class="fas fa-robot mr-1 text-[#2EC4B6]" style="font-size:9px;"></i>' + d.aiScore + '</span>' +
            '</div>' +
            (d.isMine
              ? '<span class="text-xs font-semibold text-[#10B981]"><i class="fas fa-check-circle mr-1"></i>' + (currentLang === 'zh' ? '我的' : 'MINE') + '</span>'
              : d.status === 'sold'
                ? '<span class="text-xs text-[#3D7A70] font-mono">' + (currentLang === 'zh' ? '已售' : 'SOLD') + '</span>'
                : d.holder
                  ? '<span class="text-xs text-[#5A9A90]">' + d.holder + '</span>'
                  : '<button onclick="event.stopPropagation(); openDetail(&#39;' + d.id + '&#39;)" class="text-xs font-mono font-bold text-[#2EC4B6] hover:text-[#3DD8CA] transition-colors"><i class="fas fa-shopping-cart mr-1"></i>' + t('cardBuy') + '</button>') +
          '</div>' +
        '</div>';
      }).join('');

      // Delay draw mini radars on cards
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

    // ==================== Subscribe Modal (Single Contract) ====================
    function showSubscribeModal() {
      if (!currentDeal) return;
      if (currentDeal.status === 'sold') { showToast('warning', t('eiSold'), t('subAlreadySold')); return; }

      const old = document.getElementById('subscribeModal'); if (old) old.remove();
      const modal = document.createElement('div');
      modal.id = 'subscribeModal';
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300]';
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.innerHTML = '<div class="bg-[#0F2E2B] rounded-3xl max-w-md w-full mx-4 overflow-hidden" style="box-shadow: 0 24px 80px rgba(0,0,0,0.2); animation: scaleIn 0.25s cubic-bezier(0.28,0.11,0.32,1);">' +
        '<div class="p-5 border-b border-[rgba(46,196,182,0.08)]" style="background: linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04));">' +
          '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #10b981, #06b6d4);"><i class="fas fa-file-contract text-white"></i></div><div><h2 class="text-lg font-bold text-[#E8F5F3]">' + t('subModalTitle') + '</h2><p class="text-xs text-[#3D7A70]">' + getProjectName(currentDeal) + '</p></div></div>' +
        '</div>' +
        '<div class="p-5">' +
          '<div class="p-4 bg-[rgba(11,30,28,0.6)] rounded-2xl mb-4 text-center">' +
            '<p class="font-mono text-sm font-bold tracking-wider mb-2" style="color:#3DD8CA;">' + (currentDeal.mcn || '') + '</p>' +
            '<p class="text-3xl font-black text-[#3DD8CA] mb-1">¥1,000</p>' +
            '<p class="text-xs text-[#3D7A70]">' + t('subFaceNote') + '</p>' +
          '</div>' +
          '<div class="grid grid-cols-2 gap-2 mb-4">' +
            '<div class="p-3 bg-[rgba(245,158,11,0.06)] rounded-xl text-center"><p class="text-sm font-bold text-[#FBBF24]">' + currentDeal.revenueShare + '</p><p class="text-xs text-[#3D7A70]">' + t('subShareLabel') + '</p></div>' +
            '<div class="p-3 bg-[rgba(6,182,212,0.06)] rounded-xl text-center"><p class="text-sm font-bold text-[#22D3EE]">' + getPeriodDisplay(currentDeal) + '</p><p class="text-xs text-[#3D7A70]">' + t('subPeriodLabel') + '</p></div>' +
          '</div>' +
          '<div class="p-3 bg-[rgba(16,185,129,0.06)] rounded-xl mb-4 border border-[rgba(16,185,129,0.12)]">' +
            '<div class="flex items-center gap-2"><i class="fas fa-info-circle text-emerald-500"></i><p class="text-xs text-[#34D399]">' + t('subNote') + '</p></div>' +
          '</div>' +
        '</div>' +
        '<div class="px-5 pb-5 flex gap-3">' +
          '<button onclick="closeSubscribeModal()" class="flex-1 py-2.5 border border-[rgba(46,196,182,0.12)] rounded-xl text-sm font-medium text-[#8EBDB5] hover:bg-[#0B2624] transition-colors">' + t('subCancelBtn') + '</button>' +
          '<button onclick="confirmSubscribe()" class="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-[rgba(46,196,182,0.15)] transition-all"><i class="fas fa-check mr-1.5"></i>' + t('subConfirmBtn') + '</button>' +
        '</div>' +
      '</div>';

      document.body.appendChild(modal);
    }

    function closeSubscribeModal() {
      const m = document.getElementById('subscribeModal'); if (m) m.remove();
    }

    function confirmSubscribe() {
      if (!currentDeal) return;
      if (currentDeal.status === 'sold') { showToast('error', t('eiSold'), t('subAlreadySold')); return; }

      // Update data: assign this contract to current user
      const userName = currentUser ? (currentUser.displayName || currentUser.username) : (currentLang === 'en' ? 'Guest' : '游客');
      currentDeal.status = 'sold';
      currentDeal.holder = userName;
      currentDeal.isMine = true;

      // Sync back to allDeals
      const original = allDeals.find(d => d.id === currentDeal.id);
      if (original) {
        original.status = currentDeal.status;
        original.holder = currentDeal.holder;
        original.isMine = currentDeal.isMine;
      }
      // Update mine count in projectSummaries for this project
      var ps = projectSummaries.find(function(s) { return s.projectId === currentDeal.projectId; });
      if (ps) { ps.mine++; ps.available = Math.max(0, ps.available - 1); }

      // Close modal
      const modal = document.getElementById('subscribeModal');
      if (modal) modal.remove();

      showToast('success', t('toastSubscribeSuccess'), t('subSuccessDetail', {mcn: currentDeal.mcn}));
      openDetail(currentDeal.id); // Refresh details
    }

    // ==================== Detail Page ====================
    function openDetail(id) {
      currentDeal = dealsList.find(d => d.id === id) || allDeals.find(d => d.id === id);
      if (!currentDeal) return;
      document.getElementById('detailTitle').textContent = getProjectName(currentDeal);
      document.getElementById('detailMCN').textContent = currentDeal.mcn || 'MCN-XX-XX-0000-0000';
      const statusMap = { available: { label: t('dealStatusAvailable'), cls: 'badge-warning' }, sold: { label: t('dealStatusSold'), cls: 'badge-success' } };
      const st = statusMap[currentDeal.status] || statusMap.available;
      document.getElementById('detailStatus').className = 'badge ' + st.cls;
      document.getElementById('detailStatus').textContent = st.label + (currentDeal.isMine ? ' · ' + t('detMyContract') : '');
      document.getElementById('detailIndustry').textContent = getIndustryName(currentDeal.industry);
      document.getElementById('detailDate').textContent = currentDeal.originateDate;

      // Update subscribe button
      const btn = document.getElementById('btnExpressIntent');
      if (currentDeal.isMine) {
        btn.innerHTML = '<i class="fas fa-check-circle mr-1"></i>' + t('btnMyContract');
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.onclick = function() { showToast('info', t('eiMyContract'), t('btnMyContractToast', {mcn: currentDeal.mcn})); };
      } else if (currentDeal.status === 'sold') {
        btn.innerHTML = '<i class="fas fa-lock mr-1"></i>' + t('btnSoldOut');
        btn.style.background = 'linear-gradient(135deg, #3D7A70 0%, #2A5E58 100%)';
        btn.onclick = null;
      } else {
        btn.innerHTML = '<i class="fas fa-shopping-cart mr-1"></i>' + t('btnSubscribe');
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.onclick = function() { showSubscribeModal(); };
      }

      // Left panel — project info (from Originate)
      document.getElementById('detailLeft').innerHTML =
        '<div class="mb-5">' +
          // MCN code card
          '<div class="p-4 rounded-2xl mb-4" style="background: linear-gradient(135deg, #0c2d4a 0%, #0f3d36 40%, #164e47 100%); position: relative; overflow: hidden;">' +
            '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 30%, rgba(6,182,212,0.25) 0%, transparent 50%);pointer-events:none;"></div>' +
            '<div class="relative z-10">' +
              '<div class="flex items-center gap-2 mb-2"><span class="px-1.5 py-0.5 rounded text-xs font-bold" style="background: rgba(46,196,182,0.2); color: #5DC4B3; letter-spacing: 0.03em;">MCN</span><span class="text-xs" style="color: rgba(255,255,255,0.4);">' + t('detMCNLabel') + '</span></div>' +
              '<p class="font-mono text-lg font-black tracking-wider text-white mb-2">' + (currentDeal.mcn || '') + '</p>' +
              '<div class="grid grid-cols-4 gap-1.5">' +
                '<div class="text-center p-1.5 rounded-lg" style="background: rgba(255,255,255,0.06);"><p class="text-xs font-bold text-cyan-300">' + (INDUSTRY_CODES[currentDeal.industry] || 'XX') + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">' + t('detIndustryLabel') + '</p></div>' +
                '<div class="text-center p-1.5 rounded-lg" style="background: rgba(255,255,255,0.06);"><p class="text-xs font-bold text-cyan-300">' + (CITY_CODES[currentDeal.location] || 'XX') + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">' + t('detCityLabel') + '</p></div>' +
                '<div class="text-center p-1.5 rounded-lg" style="background: rgba(255,255,255,0.06);"><p class="text-xs font-bold text-cyan-300">' + (currentDeal.issueDate || '').slice(0,7) + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">' + t('detIssueLabel') + '</p></div>' +
                '<div class="text-center p-1.5 rounded-lg" style="background: rgba(255,255,255,0.06);"><p class="text-xs font-bold text-amber-300">' + (currentDeal.contractType || 'RSN') + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">' + t('detTypeLabel') + '</p></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="p-3 bg-[rgba(245,158,11,0.06)] rounded-xl border border-[rgba(245,158,11,0.12)] mb-4 flex items-center gap-2"><i class="fas fa-paper-plane text-amber-500"></i><div><p class="text-xs font-bold text-[#FBBF24]">' + t('detFromOriginate') + '</p><p class="text-xs text-[#F59E0B]">' + t('detOriginator', {name: getOriginatorName(currentDeal) || 'N/A'}) + '</p></div></div>' +
          '<div class="flex items-center space-x-3 mb-4"><div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background: linear-gradient(135deg, rgba(93,196,179,0.15), rgba(73,168,154,0.15));"><i class="fas fa-briefcase text-2xl" style="color: #5DC4B3;"></i></div><div><h2 class="text-lg font-bold text-[#E8F5F3]">' + getProjectName(currentDeal) + '</h2><p class="text-sm text-[#5A9A90]">' + getIndustryName(currentDeal.industry) + ' · ' + getCityName(currentDeal.location) + '</p></div></div>' +
          '<p class="text-sm text-[#8EBDB5] leading-relaxed mb-4">' + getContractDescription(currentDeal) + '</p>' +
        '</div>' +
        // ==== Single contract core info ====
        '<div class="p-4 rounded-2xl mb-5" style="background: linear-gradient(135deg, rgba(46,196,182,0.06), rgba(6,182,212,0.04)); border: 1.5px solid rgba(46,196,182,0.2);">' +
          '<div class="flex items-center gap-2 mb-3"><i class="fas fa-file-contract text-[#2EC4B6]"></i><h3 class="text-sm font-bold text-[#E8F5F3]">' + t('detContractInfo') + '</h3><span class="font-mono text-xs text-[#3D7A70]">' + (currentDeal.mcn || '') + '</span></div>' +
          '<div class="text-center p-4 bg-[#0F2E2B] rounded-xl mb-3">' +
            '<p class="text-3xl font-black text-[#3DD8CA] mb-1">¥1,000</p>' +
            '<p class="text-xs text-[#3D7A70]">' + t('detFaceValueFull') + '</p>' +
          '</div>' +
          '<div class="grid grid-cols-2 gap-2 mb-3">' +
            '<div class="p-2 bg-[#0F2E2B] rounded-xl text-center"><p class="text-xs text-[#3D7A70]">' + t('detStatus') + '</p><p class="text-sm font-bold ' + (currentDeal.status === 'available' ? 'text-[#F59E0B]' : 'text-[#10B981]') + '">' + (currentDeal.status === 'available' ? t('dealStatusAvailable') : t('dealStatusSold')) + '</p></div>' +
            '<div class="p-2 bg-[#0F2E2B] rounded-xl text-center"><p class="text-xs text-[#3D7A70]">' + t('detHolder') + '</p><p class="text-sm font-bold ' + (currentDeal.isMine ? 'text-[#10B981]' : 'text-[#B0D5CF]') + '">' + (currentDeal.holder || t('detNoHolder')) + '</p></div>' +
          '</div>' +
          (currentDeal.isMine ? '<div class="p-2 bg-[rgba(16,185,129,0.06)] rounded-xl flex items-center gap-2 border border-[rgba(16,185,129,0.12)]"><i class="fas fa-user-check text-emerald-500"></i><div><p class="text-xs font-bold text-[#34D399]">' + t('detMyContract') + '</p><p class="text-xs text-[#10B981]">' + t('detMyContractNote') + '</p></div></div>' : '') +
        '</div>' +
        '<div class="grid grid-cols-2 gap-3 mb-5">' +
          '<div class="p-3 bg-[rgba(20,184,166,0.06)] rounded-xl"><p class="text-xs text-[#5A9A90] mb-1">' + t('detProjectTotal') + '</p><p class="text-lg font-bold text-[#3DD8CA]">¥' + (currentDeal.projectTotalAmount || 0) + t('wan') + '</p></div>' +
          '<div class="p-3 bg-[rgba(245,158,11,0.06)] rounded-xl"><p class="text-xs text-[#5A9A90] mb-1">' + t('detShareRatio') + '</p><p class="text-lg font-bold text-[#F59E0B]">' + currentDeal.revenueShare + '</p></div>' +
          '<div class="p-3 bg-[rgba(6,182,212,0.06)] rounded-xl"><p class="text-xs text-[#5A9A90] mb-1">' + t('detSharePeriod') + '</p><p class="text-lg font-bold text-[#06B6D4]">' + getPeriodDisplay(currentDeal) + '</p></div>' +
          '<div class="p-3 bg-[rgba(16,185,129,0.06)] rounded-xl"><p class="text-xs text-[#5A9A90] mb-1">' + t('detAIScoreLabel') + '</p><p class="text-lg font-bold text-[#10B981]">' + currentDeal.aiScore + '<span class="text-xs text-[#3D7A70]">/10</span></p></div>' +
        '</div>' +
        '<div class="space-y-3"><h3 class="text-sm font-semibold text-[#B0D5CF] mb-2"><i class="fas fa-store mr-1.5 text-amber-500"></i>' + t('detBizData') + '</h3>' +
          '<div class="p-3 bg-[#0B2624] rounded-xl border border-[rgba(46,196,182,0.08)]"><div class="flex items-center justify-between"><span class="text-xs font-medium text-[#8EBDB5]">' + t('detAvgRevenue') + '</span><span class="text-xs font-bold text-[#E8F5F3]">' + (currentDeal.monthlyRevenue || t('detNoData')) + '</span></div></div>' +
          '<div class="p-3 bg-[#0B2624] rounded-xl border border-[rgba(46,196,182,0.08)]"><div class="flex items-center justify-between"><span class="text-xs font-medium text-[#8EBDB5]">' + t('detEmployeeCount') + '</span><span class="text-xs font-bold text-[#E8F5F3]">' + (currentDeal.employeeCount || t('detNoData')) + '</span></div></div>' +
          '<div class="p-3 bg-[#0B2624] rounded-xl border border-[rgba(46,196,182,0.08)]"><div class="flex items-center justify-between"><span class="text-xs font-medium text-[#8EBDB5]">' + t('detOpYears') + '</span><span class="text-xs font-bold text-[#E8F5F3]">' + (currentDeal.operatingYears || t('detNoData')) + ' ' + t('years') + '</span></div></div>' +
          '<div class="p-3 bg-[#0B2624] rounded-xl border border-[rgba(46,196,182,0.08)]"><div class="flex items-center justify-between"><span class="text-xs font-medium text-[#8EBDB5]">' + t('detRiskGrade') + '</span><span class="text-xs font-bold text-[#10B981]">' + (currentDeal.riskGrade || 'N/A') + '</span></div></div>' +
          '<div class="p-3 bg-[#0B2624] rounded-xl border border-[rgba(46,196,182,0.08)]"><div class="flex items-center justify-between"><span class="text-xs font-medium text-[#8EBDB5]">' + t('detMaturityDate') + '</span><span class="text-xs font-bold text-[#E8F5F3]">' + (currentDeal.maturityDate || '—') + '</span></div></div>' +
        '</div>';

      // Right panel — radar assessment + sieve results
      const hasMatch = currentDeal.matchScore !== null && currentDeal.matchScore !== undefined;
      const matchColor = hasMatch ? (currentDeal.matchScore >= 80 ? '#10b981' : currentDeal.matchScore >= 60 ? '#f59e0b' : '#ef4444') : '#3D7A70';

      // Calculate radar scores — V1 统一引擎
      const v1Result = calcContractRadarV1(currentDeal);
      const radarScores = v1Result.axes.map(function(a) { return a.score; });
      const overallScore = v1Result.overallScore;
      const gradeInfo = getScoreGrade(overallScore);
      const overallConfidence = v1Result.overallConfidence;

      // Generate assessment results for each sieve
      let sieveResults = '';
      mySieves.forEach(key => {
        const sieve = SIEVE_LIBRARY[key];
        if (!sieve) return;
        const testResult = sieve.filter([currentDeal]);
        const passed = testResult.length > 0;
        const score = passed ? testResult[0].matchScore : Math.floor(Math.random() * 35 + 10);
        const barColor = passed ? '#10b981' : '#ef4444';
        sieveResults += '<div class="flex items-center gap-3 p-3 bg-[#0B2624] rounded-xl border border-[rgba(46,196,182,0.08)]">' +
          '<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + (passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') + ';"><i class="fas ' + sieve.icon + '" style="color:' + (passed ? '#10b981' : '#ef4444') + '; font-size:12px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center justify-between mb-1"><span class="text-xs font-semibold text-[#B0D5CF]">' + getSieveName(key) + '</span><span class="sieve-tag ' + (passed ? 'sieve-pass' : 'sieve-fail') + '">' + (passed ? '<i class="fas fa-check" style="font-size:8px;"></i>' + t('detSievePass') : '<i class="fas fa-times" style="font-size:8px;"></i>' + t('detSieveFail')) + '</span></div>' +
            '<div class="match-bar"><div class="match-bar-fill" style="width:' + score + '%; background:' + barColor + ';"></div></div>' +
            '<p class="text-xs text-[#3D7A70] mt-1">' + t('detMatchPct', {n: score}) + '</p>' +
          '</div></div>';
      });
      if (mySieves.length === 0) {
        sieveResults = '<div class="text-center py-4"><p class="text-sm text-[#3D7A70]">' + t('detNoSieve') + '</p><button onclick="goToDashboard(); setTimeout(showSieveManager, 300);" class="text-xs text-[#06B6D4] mt-1 hover:underline">' + t('detGoManageSieve') + '</button></div>';
      }

      // Dimension detail list HTML — 一级标签(PRIMARY_CATEGORIES)折叠 → 二级标签(V1维度)展开
      let dimensionDetails = '';
      PRIMARY_CATEGORIES.forEach(function(cat) {
        // 收集该一级标签下的所有二级维度
        var catDims = [];
        var catScoreSum = 0;
        v1Result.axes.forEach(function(axis, i) {
          var dim = RADAR_DIMENSIONS[i];
          var belongCat = DIM_TO_PRIMARY[dim.key];
          if (belongCat && belongCat.id === cat.id) {
            catDims.push({ axis: axis, dim: dim, idx: i });
            catScoreSum += axis.score;
          }
        });
        if (catDims.length === 0) return;
        var catAvgScore = Math.round(catScoreSum / catDims.length);
        var catGrade = getScoreGrade(catAvgScore);
        var catName = currentLang === 'zh' ? cat.zhName : cat.enName;

        // 生成二级维度卡片HTML
        var innerDimsHtml = '';
        catDims.forEach(function(item) {
          var axis = item.axis, dim = item.dim;
          var score = axis.score;
          var dGrade = getScoreGrade(score);
          var barWidth = score;
          var tierStars = '';
          for (var t_ = 0; t_ < 5; t_++) { tierStars += '<i class="fas fa-star" style="font-size:8px; color:' + (t_ < axis.tier ? axis.color : 'rgba(46,196,182,0.15)') + '; margin-right:1px;"></i>'; }
          var confColor = axis.confidence >= 70 ? '#10b981' : axis.confidence >= 40 ? '#f59e0b' : '#ef4444';
          var confLabel = axis.confidence >= 70 ? (currentLang === 'zh' ? '高可信' : 'High') : axis.confidence >= 40 ? (currentLang === 'zh' ? '中可信' : 'Med') : (currentLang === 'zh' ? '低可信' : 'Low');
          innerDimsHtml += '<div class="radar-dim-item p-3 bg-[#0B2624] rounded-xl border border-[rgba(46,196,182,0.08)] hover:border-[rgba(46,196,182,0.12)] transition-all cursor-pointer" onclick="toggleDimDetail(this)">' +
            '<div class="flex items-center gap-3">' +
              '<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + axis.color + '15;"><i class="fas ' + axis.icon + '" style="color:' + axis.color + '; font-size:12px;"></i></div>' +
              '<div class="flex-1 min-w-0">' +
                '<div class="flex items-center justify-between mb-1">' +
                  '<div class="flex items-center gap-1.5">' +
                    '<span class="dim-tooltip-wrap"><span class="text-xs font-bold text-[#B0D5CF]">' + getDimLabel(dim) + '</span><i class="fas fa-info-circle" style="font-size:9px;color:#3D7A70;margin-left:2px;"></i><span class="dim-tooltip-text"><b style="color:' + axis.color + ';">' + getDimLabel(dim) + '</b><br>' + getDimDesc(dim) + '</span></span>' +
                    '<span class="flex items-center">' + tierStars + '</span>' +
                  '</div>' +
                  '<div class="flex items-center gap-2">' +
                    '<span class="text-xs font-mono" style="color:' + confColor + ';">' + confLabel + '</span>' +
                    '<span class="text-xs font-bold" style="color:' + dGrade.color + ';">' + score + '</span>' +
                    '<span class="text-xs px-1.5 py-0.5 rounded font-bold" style="background:' + dGrade.bg + '; color:' + dGrade.color + ';">T' + axis.tier + '</span>' +
                  '</div>' +
                '</div>' +
                '<div class="h-1.5 rounded-full bg-[rgba(46,196,182,0.1)] overflow-hidden"><div class="h-full rounded-full transition-all" style="width:' + barWidth + '%; background: linear-gradient(90deg, ' + axis.color + ', ' + axis.color + 'cc);"></div></div>' +
              '</div>' +
              '<i class="fas fa-chevron-down text-[#2A5E58] text-xs flex-shrink-0 dim-arrow transition-transform"></i>' +
            '</div>' +
            '<div class="dim-detail hidden mt-3 pt-3 border-t border-[rgba(46,196,182,0.08)]">' +
              '<p class="text-xs text-[#8EBDB5] leading-relaxed mb-2"><i class="fas fa-calculator mr-1" style="color:' + axis.color + ';"></i>' + axis.explanation + '</p>' +
              '<p class="text-xs text-[#5A9A90] leading-relaxed mb-2"><i class="fas fa-info-circle mr-1" style="color:' + axis.color + ';"></i>' + getDimDesc(dim) + '</p>' +
              '<div class="flex items-center gap-2 mb-1.5">' +
                '<span class="text-xs text-[#3D7A70]">' + (currentLang === 'zh' ? '可信度' : 'Confidence') + '</span>' +
                '<div class="flex-1 h-1.5 rounded-full bg-[rgba(46,196,182,0.08)] overflow-hidden"><div class="h-full rounded-full" style="width:' + axis.confidence + '%; background:' + confColor + ';"></div></div>' +
                '<span class="text-xs font-mono font-bold" style="color:' + confColor + ';">' + axis.confidence + '%</span>' +
              '</div>' +
              (axis.missing && axis.missing.length > 0 ? '<div class="flex items-start gap-1.5"><span class="text-xs text-[#ef4444] flex-shrink-0"><i class="fas fa-exclamation-triangle" style="font-size:9px;"></i></span><div class="text-xs text-[#f87171]">' + (currentLang === 'zh' ? '缺失字段: ' : 'Missing: ') + axis.missing.join(', ') + '</div></div>' : '<div class="text-xs text-[#10b981]"><i class="fas fa-check-circle mr-1" style="font-size:9px;"></i>' + (currentLang === 'zh' ? '数据完整' : 'Data complete') + '</div>') +
            '</div>' +
          '</div>';
        });

        // 一级标签卡片
        dimensionDetails += '<div class="primary-cat-card" style="background:' + cat.bgColor + '; border: 1px solid ' + cat.borderColor + ';">' +
          '<div class="primary-cat-header" onclick="togglePrimaryCategory(this)">' +
            '<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:' + cat.color + '20;"><i class="fas ' + cat.icon + '" style="color:' + cat.color + '; font-size:16px;"></i></div>' +
            '<div class="flex-1 min-w-0">' +
              '<div class="flex items-center gap-2">' +
                '<span class="text-sm font-bold" style="color:#E8F5F3;">' + catName + '</span>' +
                '<span class="primary-cat-dims-count" style="background:' + cat.color + '20; color:' + cat.color + ';">' + catDims.length + '</span>' +
              '</div>' +
              '<div class="flex items-center gap-3 mt-1">' +
                '<div class="flex-1 h-1.5 rounded-full overflow-hidden" style="background:' + cat.color + '15;"><div class="h-full rounded-full" style="width:' + catAvgScore + '%; background:' + cat.color + ';"></div></div>' +
                '<span class="text-xs font-bold" style="color:' + cat.color + ';">' + catAvgScore + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="flex items-center gap-2">' +
              '<span class="text-xs px-2 py-0.5 rounded-md font-bold" style="background:' + catGrade.bg + '; color:' + catGrade.color + ';">' + catGrade.grade + '</span>' +
              '<i class="fas fa-chevron-down primary-cat-arrow" style="color:' + cat.color + '; font-size:12px;"></i>' +
            '</div>' +
          '</div>' +
          '<div class="primary-cat-body">' +
            '<div class="space-y-2">' + innerDimsHtml + '</div>' +
          '</div>' +
        '</div>';
      });

      document.getElementById('detailRight').innerHTML =
        '<div class="space-y-4">' +
          // ===== V1 低可信度预警 =====
          (v1Result.lowConfidenceWarning ? '<div class="p-3 bg-[rgba(239,68,68,0.06)] rounded-xl border border-[rgba(239,68,68,0.15)] flex items-start gap-2"><i class="fas fa-exclamation-triangle text-[#f87171] mt-0.5"></i><div><p class="text-xs font-bold text-[#f87171]">' + (currentLang === 'zh' ? '低可信度预警' : 'Low Confidence Warning') + '</p><p class="text-xs text-[#ef4444]">' + (currentLang === 'zh' ? '综合可信度' + overallConfidence + '%，部分维度数据缺失，评分已做保守折扣。缺失字段: ' + v1Result.missingFields.filter(function(v,i,a){return a.indexOf(v)===i;}).slice(0,6).join(', ') : 'Overall confidence ' + overallConfidence + '%, some dimensions lack data. Missing: ' + v1Result.missingFields.filter(function(v,i,a){return a.indexOf(v)===i;}).slice(0,6).join(', ')) + '</p></div></div>' : '') +
          // ===== Contract radar assessment =====
          '<div class="bg-[#0F2E2B] rounded-2xl border border-[rgba(46,196,182,0.08)] overflow-hidden">' +
            // Header: composite score + grade + confidence
            '<div class="p-4 flex items-center justify-between" style="background: linear-gradient(135deg, rgba(46,196,182,0.04), rgba(6,182,212,0.03)); border-bottom: 1px solid rgba(46,196,182,0.08);">' +
              '<div class="flex items-center gap-3">' +
                '<div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #2EC4B6, #06b6d4); box-shadow: 0 4px 12px rgba(46,196,182,0.3);"><i class="fas fa-fingerprint text-white text-sm" style="font-size:16px;"></i></div>' +
                '<div><h3 class="text-sm font-bold text-[#E8F5F3]">' + (currentLang === 'zh' ? '\u56DE\u62A5\u00B7\u98CE\u9669\u00B7\u7BA1\u63A7\u00B7\u6536\u76CA \u8BC4\u4F30\u56FE\u8C31' : 'Return\u00B7Risk\u00B7Control\u00B7Adequacy Radar') + '</h3><p class="text-xs text-[#3D7A70]">' + (currentLang === 'zh' ? '4\u5927\u7EF4\u5EA68\u6307\u6807 \u00B7 \u53EF\u4FE1\u5EA6' + overallConfidence + '%' : '4 Dimensions 8 Indicators \u00B7 Conf. ' + overallConfidence + '%') + '</p></div>' +
              '</div>' +
              '<div class="flex items-center gap-3">' +
                '<div class="text-right">' +
                  '<p class="text-2xl font-black" style="color:' + gradeInfo.color + '; letter-spacing:-0.02em;">' + overallScore + '<span class="text-xs font-medium text-[#3D7A70]">/100</span></p>' +
                  '<p class="text-xs font-semibold" style="color:' + gradeInfo.color + ';">' + gradeInfo.label + '</p>' +
                '</div>' +
                '<div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background:' + gradeInfo.bg + '; border: 2px solid ' + gradeInfo.color + '33;">' +
                  '<span class="text-xl font-black" style="color:' + gradeInfo.color + ';">' + gradeInfo.grade + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            // Radar chart
            '<div class="flex items-center justify-center py-4 px-2">' +
              '<canvas id="radarCanvas" style="max-width:100%;"></canvas>' +
            '</div>' +
            // Dimension indicator bars — show actual values
            '<div class="px-4 pb-4">' +
              '<div class="grid grid-cols-4 gap-2">' +
                (function() {
                  var dealDisplayVals = calcDealDisplayValues(currentDeal);
                  return RADAR_DIMENSIONS.map((dim, i) => {
                    const s = radarScores[i];
                    const g = getScoreGrade(s);
                    return '<div class="text-center p-2 rounded-xl" style="background:' + dim.color + '08; border: 1px solid ' + dim.color + '15;">' +
                      '<i class="fas ' + dim.icon + '" style="color:' + dim.color + '; font-size:11px;"></i>' +
                      '<p class="text-xs font-bold mt-1" style="color:' + dim.color + ';">' + dealDisplayVals[i] + '</p>' +
                      '<p class="text-xs text-[#3D7A70] truncate" style="font-size:9px;">' + getRadarSubLabel(i) + '</p>' +
                    '</div>';
                  }).join('');
                })() +
              '</div>' +
            '</div>' +
          '</div>' +
          // ===== Dimension details — 一级标签折叠展开 =====
          '<div class="bg-[#0F2E2B] rounded-2xl p-4 border border-[rgba(46,196,182,0.08)]">' +
            '<div class="flex items-center justify-between mb-3">' +
              '<h3 class="text-sm font-bold text-[#E8F5F3]"><i class="fas fa-layer-group mr-1.5 text-[#2EC4B6]"></i>' + t('detDimDetail') + '</h3>' +
              '<button onclick="toggleAllDims()" class="text-xs text-[#3DD8CA] hover:text-[#2EC4B6] font-medium"><i class="fas fa-expand-alt mr-1"></i>' + t('detExpandAll') + '</button>' +
            '</div>' +
            '<div class="space-y-3">' + dimensionDetails + '</div>' +
          '</div>' +
          // Sieve match overview
          (hasMatch ? '<div class="bg-[#0F2E2B] rounded-2xl p-4 border border-[rgba(46,196,182,0.08)]"><h3 class="text-sm font-bold text-[#E8F5F3] mb-3"><i class="fas fa-bullseye mr-1.5" style="color:' + matchColor + ';"></i>' + t('detCurrentSieveMatch') + '</h3><div class="flex items-center gap-4"><div class="w-16 h-16 rounded-full border-4 flex items-center justify-center" style="border-color:' + matchColor + ';"><span class="text-xl font-bold" style="color:' + matchColor + ';">' + currentDeal.matchScore + '%</span></div><div class="flex-1"><p class="text-sm font-semibold text-[#B0D5CF]">' + (currentDeal.sieveName || t('dealSieve')) + '</p><p class="text-xs text-[#5A9A90] mt-1">' + (currentDeal.matchScore >= 80 ? t('detHighMatch') : currentDeal.matchScore >= 60 ? t('detMidMatch') : t('detLowMatch')) + '</p><div class="match-bar mt-2" style="height:4px;"><div class="match-bar-fill" style="width:' + currentDeal.matchScore + '%; background:' + matchColor + ';"></div></div></div></div></div>' : '') +
          // Individual sieve assessment results
          '<div class="bg-[#0F2E2B] rounded-2xl p-4 border border-[rgba(46,196,182,0.08)]"><h3 class="text-sm font-bold text-[#E8F5F3] mb-3"><i class="fas fa-filter mr-1.5 text-cyan-500"></i>' + t('detSieveEval') + '</h3><div class="space-y-2">' + sieveResults + '</div></div>' +
          // Revenue forecast
          '<div class="bg-[#0F2E2B] rounded-2xl p-4 border border-[rgba(46,196,182,0.08)]"><h3 class="text-sm font-bold text-[#E8F5F3] mb-3"><i class="fas fa-chart-line mr-1.5 text-[#2EC4B6]"></i>' + t('detIncomeTitle') + '</h3><div class="h-36 flex items-end justify-around gap-1.5">' +
          [65,78,82,70,88,92,85,90,95,88,92,98].map((v,i) => '<div class="flex flex-col items-center flex-1"><div class="w-full rounded-t-md" style="height:' + v + '%; background: linear-gradient(180deg, #5DC4B3 0%, #49A89A 100%); opacity:' + (0.5+i*0.04) + ';"></div><span class="text-xs text-[#3D7A70] mt-1" style="font-size:9px;">' + t('detMonthPrefix') + (i+1) + '</span></div>').join('') +
          '</div></div>' +
          // Project flow
          '<div class="bg-[#0F2E2B] rounded-2xl p-4 border border-[rgba(46,196,182,0.08)]"><h3 class="text-sm font-bold text-[#E8F5F3] mb-3"><i class="fas fa-route mr-1.5 text-amber-500"></i>' + t('detTimelineTitle') + '</h3><div class="space-y-3">' +
          [
            { icon: 'fa-paper-plane', bg: 'rgba(245,158,11,0.1)', ic: '#FBBF24', title: t('detTL1'), desc: getOriginatorName(currentDeal) + ' · ' + currentDeal.originateDate },
            { icon: 'fa-filter', bg: 'rgba(6,182,212,0.1)', ic: '#22D3EE', title: t('detTL2'), desc: hasMatch ? t('detTL2Desc', {match: currentDeal.matchScore + '%'}) : t('detTL2DescBasic') },
            { icon: 'fa-hand-pointer', bg: 'rgba(46,196,182,0.1)', ic: '#3DD8CA', title: t('detTL3'), desc: currentDeal.status === 'available' ? t('detTL3Wait') : (currentDeal.isMine ? t('detTL3Mine') : t('detTL3Sold')) },
            { icon: 'fa-file-contract', bg: 'rgba(100,116,139,0.1)', ic: '#94A3B8', title: t('detTL4'), desc: t('detTL4Desc') }
          ].map(t => '<div class="flex items-start space-x-3"><div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:' + t.bg + ';"><i class="fas ' + t.icon + ' text-xs" style="color:' + t.ic + ';"></i></div><div><p class="text-sm font-medium text-[#B0D5CF]">' + t.title + '</p><p class="text-xs text-[#3D7A70]">' + t.desc + '</p></div></div>').join('') +
          '</div></div>' +
        '</div>';

      // Delay draw radar chart (wait for DOM render)
      setTimeout(() => {
        drawRadarChart('radarCanvas', radarScores, { size: 320, displayValues: calcDealDisplayValues(currentDeal) });
      }, 50);

      switchPage('pageDetail');
      pushPageState('pageDetail');
    }

    function goToDashboard() { switchPage('pageDashboard'); pushPageState('pageDashboard'); renderDeals(); }

    function goBack() {
      const lastPage = window._lastPage || 'pageDashboard';
      if (lastPage === 'pageMyContracts') goToMyContracts();
      else if (lastPage === 'pageMyPortfolios') goToMyPortfolios();
      else if (lastPage === 'pageAIBuilder') goToAIBuilder();
      else goToDashboard();
    }


    function expressIntent() {
      if (!currentDeal) return;
      if (currentDeal.isMine) {
        showToast('info', t('eiMyContract'), t('eiMyContractMsg', {mcn: currentDeal.mcn}));
      } else if (currentDeal.status === 'sold') {
        showToast('warning', t('eiSold'), t('eiSoldMsg'));
      } else {
        showSubscribeModal();
      }
    }

    // Dimension detail expand/collapse
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
      // Also expand/collapse all primary categories
      document.querySelectorAll('.primary-cat-card').forEach(el => {
        var body = el.querySelector('.primary-cat-body');
        var arrow = el.querySelector('.primary-cat-arrow');
        if (body) {
          if (allDimsExpanded) { body.classList.add('expanded'); if (arrow) arrow.classList.add('rotated'); }
          else { body.classList.remove('expanded'); if (arrow) arrow.classList.remove('rotated'); }
        }
      });
    }

    // 一级标签折叠/展开
    function togglePrimaryCategory(el) {
      var card = el.closest('.primary-cat-card');
      if (!card) return;
      var body = card.querySelector('.primary-cat-body');
      var arrow = card.querySelector('.primary-cat-arrow');
      if (body) {
        body.classList.toggle('expanded');
        if (arrow) arrow.classList.toggle('rotated');
      }
    }

    function switchDetailView(view) {
      ['sieve', 'financials', 'timeline'].forEach(v => {
        const btn = document.getElementById('btn' + v.charAt(0).toUpperCase() + v.slice(1));
        if (btn) { btn.className = v === view ? 'px-2.5 py-1 rounded-md text-xs font-semibold bg-[#0F2E2B] shadow text-[#3DD8CA]' : 'px-2.5 py-1 rounded-md text-xs font-semibold text-[#8EBDB5]'; }
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
      document.getElementById('obNext').innerHTML = obStep === 3 ? t('obStartBtn') + '<i class="fas fa-check ml-2"></i>' : t('obNextBtn') + '<i class="fas fa-arrow-right ml-2"></i>';
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
        var sieveName = getSieveName(currentSieve) || (currentLang === 'en' ? 'All' : '全部');
        var responses = currentLang === 'en' ? [
          'Current sieve "' + sieveName + '" filtered ' + dealsList.length + ' opportunities. Switch sieves or manage them in Assess to adjust criteria.',
          'The "Risk Priority Sieve" suits conservative investors — requires AI score ≥8.5 and raise ≤¥8M. The "High Return Sieve" focuses on revenue share ≥12%.',
          'All opportunities originate from Originate with basic platform review. Assess sieves provide secondary screening to find your best matches.',
          'Tip: Start with the "Composite Assessment Sieve" for broad screening, then switch to "Risk Priority" for safety verification on shortlisted deals.',
          'After expressing interest, deals flow to Term for negotiation. The entire process is transparent and trackable.'
        ] : [
          'The current sieve "' + sieveName + '" found ' + dealsList.length + ' opportunities. Switch sieves or add new ones in Manage Sieves.',
          'The Risk Priority Sieve suits conservative investors — requires AI Score ≥8.5, raise ≤¥8M. The High Return Sieve focuses on revenue share ≥12%.',
          'All opportunities come from Originate with basic platform review. Assess sieves provide secondary filtering to find your best matches.',
          'Tip: Use the Composite Assessment Sieve for broad screening, then switch to Risk Priority for safety verification.',
          'After expressing interest, deals flow to Term for negotiation. The entire process is transparent and trackable.'
        ];
        msgs.innerHTML += '<div class="ai-message assistant"><div class="ai-message-avatar"><i class="fas fa-robot"></i></div><div class="ai-message-content">' + responses[Math.floor(Math.random() * responses.length)] + '</div></div>';
        msgs.scrollTop = msgs.scrollHeight;
      }, 800);
    }

    // ==================== Search Debounce ====================
    var _debounceTimer = null;
    function debounceRenderDeals() {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(renderDeals, 200);
    }

    // ==================== Number Transition Animation ====================
    function animateNumber(el, newVal) {
      if (!el) return;
      var text = typeof newVal === 'number' ? newVal.toLocaleString() : newVal;
      if (el.textContent === text) return;
      el.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
      el.style.opacity = '0.4';
      el.style.transform = 'translateY(-2px)';
      setTimeout(function() {
        el.textContent = text;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 150);
    }

    // ==================== Skeleton Loading Effect ====================
    function showDealGridSkeleton() {
      var grid = document.getElementById('dealGrid');
      if (!grid) return;
      var skeletons = '';
      for (var i = 0; i < 6; i++) {
        skeletons += '<div class="skeleton-card"><div class="skeleton-line w-60 h-6"></div><div class="skeleton-line w-80"></div><div class="skeleton-line w-40"></div><div class="flex gap-1 mt-2"><div class="skeleton-line" style="width:24%;height:40px;"></div><div class="skeleton-line" style="width:24%;height:40px;"></div><div class="skeleton-line" style="width:24%;height:40px;"></div><div class="skeleton-line" style="width:24%;height:40px;"></div></div></div>';
      }
      grid.innerHTML = skeletons;
    }

    // ==================== Init ====================
    // ==================== i18n: Refresh all dynamic texts ====================
    function refreshDashboardTexts() {
      // Update language toggle state
      var zhBtn = document.getElementById('langZH');
      var enBtn = document.getElementById('langEN');
      if (zhBtn && enBtn) {
        zhBtn.className = currentLang === 'zh' ? 'lang-btn active' : 'lang-btn';
        enBtn.className = currentLang === 'en' ? 'lang-btn active' : 'lang-btn';
      }
      // Re-render sieve selector (has dynamic text)
      if (typeof renderSieveSelector === 'function' && allDeals.length > 0) renderSieveSelector();
      // Re-render deal cards
      if (typeof renderDeals === 'function' && dealsList.length > 0) renderDeals();
      // Re-render active page content
      var activePage = document.querySelector('.page.active');
      if (activePage) {
        var pid = activePage.id;
        if (pid === 'pageMyContracts' && typeof renderMyContracts === 'function') renderMyContracts();
        if (pid === 'pageMyPortfolios' && typeof renderMyPortfolios === 'function') renderMyPortfolios();
      }
      // Update user dropdown texts
      var ddItems = document.querySelectorAll('.user-dropdown-item');
      var ddKeys = ['navProfile', 'navSievePrefs', 'navOnboarding', null, 'navLogout'];
      ddItems.forEach(function(item, idx) {
        if (ddKeys[idx]) {
          var icon = item.querySelector('i');
          var iconHtml = icon ? icon.outerHTML : '';
          item.innerHTML = iconHtml + t(ddKeys[idx]);
        }
      });
      // Update filter search placeholder
      var searchEl = document.getElementById('searchInput');
      if (searchEl) searchEl.placeholder = t('filterSearch');
      // Update filter dropdown
      var statusSelect = document.getElementById('statusFilter');
      if (statusSelect) {
        var opts = statusSelect.options;
        var statusKeys = ['filterAll', 'filterAvailable', 'filterSold', 'filterMine'];
        for (var i = 0; i < opts.length && i < statusKeys.length; i++) {
          opts[i].textContent = t(statusKeys[i]);
        }
      }
      // Page title updates
      document.title = 'Deal Connect';
      // Re-render sieve to update board showing text
      if (typeof selectSieve === 'function' && allDeals.length > 0) selectSieve(currentSieve);
      // AI Builder flow steps
      var abF1 = document.getElementById('abFlowStep1');
      var abF2 = document.getElementById('abFlowStep2');
      var abF3 = document.getElementById('abFlowStep3');
      if (abF1) abF1.textContent = t('abFlowStep1');
      if (abF2) abF2.textContent = t('abFlowStep2');
      if (abF3) abF3.textContent = t('abFlowStep3');
      // AI status text
      var abStatusEl = document.querySelector('#pageAIBuilder .text-xs.mt-2.text-center');
      if (abStatusEl) {
        var countEl = document.getElementById('abTotalContracts');
        var count = countEl ? countEl.textContent : '0';
        abStatusEl.innerHTML = t('abStatusTpl', {count: '<span id="abTotalContracts" class="font-semibold text-[#3DD8CA]">' + count + '</span>'});
      }
      // Confirm dialog
      var confTitle = document.getElementById('confirmTitle');
      var confMsg = document.getElementById('confirmMessage');
      if (confTitle) confTitle.textContent = t('confirmTitle');
      if (confMsg) confMsg.textContent = t('confirmMsg');
      // My Contracts search placeholder
      var mcSearch = document.getElementById('mcSearchInput');
      if (mcSearch) mcSearch.placeholder = t('mcSearchPlaceholder');
      // AI Chat welcome message
      var aiWelcome = document.querySelector('#aiMessages .ai-message.assistant .ai-message-content');
      if (aiWelcome) aiWelcome.textContent = t('aiChatWelcome');
      // AI Assistant input placeholder
      var aiIn = document.getElementById('aiInput');
      if (aiIn) aiIn.placeholder = t('aiAssistPlaceholder');
    }

    function initApp() {
      var bar = document.getElementById('loadingBar');
      var status = document.getElementById('loadingStatus');
      if (!bar || !status) {
        // Retry with delay when DOM not ready
        setTimeout(initApp, 50);
        return;
      }
      var steps = [
        { p: 25, t: t('loadStep1') },
        { p: 50, t: t('loadStep2') },
        { p: 75, t: t('loadStep3') },
        { p: 100, t: t('loadStep4') }
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

      // Contract data generated by loadDemoData() on demand (called on guest login)

      // Bloomberg-style real-time clock
      function updateTerminalClock() {
        var now = new Date();
        var hh = String(now.getHours()).padStart(2, '0');
        var mm = String(now.getMinutes()).padStart(2, '0');
        var ss = String(now.getSeconds()).padStart(2, '0');
        var dateStr = now.getFullYear() + '/' + String(now.getMonth()+1).padStart(2,'0') + '/' + String(now.getDate()).padStart(2,'0');
        var timeEl = document.getElementById('tickerTime');
        if (timeEl) timeEl.textContent = hh + ':' + mm + ':' + ss;
        var dateEl = document.getElementById('terminalDate');
        if (dateEl) dateEl.textContent = dateStr + ' ' + hh + ':' + mm;
      }
      updateTerminalClock();
      setInterval(updateTerminalClock, 1000);
      // Apply saved language preference
      applyLanguage();
    }

    // ==================== My Contracts Page ====================
    function getMyContracts() {
      return allDeals.filter(d => d.isMine);
    }

    function goToMyContracts() {
      renderMyContracts();
      switchPage('pageMyContracts');
      pushPageState('pageMyContracts');
    }

    function renderMyContracts() {
      const myDeals = getMyContracts();
      const search = (document.getElementById('mcSearchInput')?.value || '').toLowerCase();
      const industry = document.getElementById('mcFilterIndustry')?.value || 'all';
      const sortBy = document.getElementById('mcSortBy')?.value || 'date';

      // Populate industry filter
      const indSelect = document.getElementById('mcFilterIndustry');
      if (indSelect && indSelect.options.length <= 1) {
        const inds = [...new Set(myDeals.map(d => d.industry))];
        inds.forEach(ind => { const o = document.createElement('option'); o.value = ind; o.textContent = getIndustryName(ind); indSelect.appendChild(o); });
      }

      let filtered = myDeals.filter(d => {
        if (search && !getProjectName(d).toLowerCase().includes(search) && !d.name.toLowerCase().includes(search) && !(d.name_zh || '').toLowerCase().includes(search) && !(d.mcn || '').toLowerCase().includes(search)) return false;
        if (industry !== 'all' && d.industry !== industry) return false;
        return true;
      });

      // Sort
      if (sortBy === 'score') filtered.sort((a, b) => parseFloat(b.aiScore) - parseFloat(a.aiScore));
      else if (sortBy === 'yield') filtered.sort((a, b) => parseInt(b.revenueShare) - parseInt(a.revenueShare));
      else if (sortBy === 'project') filtered.sort((a, b) => a.projectId.localeCompare(b.projectId) || a.seqInProject - b.seqInProject);

      // Stats
      const totalInvest = myDeals.length * 1000;
      const avgScore = myDeals.length > 0 ? (myDeals.reduce((s, d) => s + parseFloat(d.aiScore), 0) / myDeals.length).toFixed(1) : '0';
      const projectCount = [...new Set(myDeals.map(d => d.projectId))].length;
      const industryCount = [...new Set(myDeals.map(d => d.industry))].length;

      document.getElementById('myContractsSubtitle').textContent = t('mcSubtitle', {count: myDeals.length.toLocaleString(), total: totalInvest.toLocaleString()});

      document.getElementById('mcStatsGrid').innerHTML =
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">' + t('mcStatHolding') + '</p><p class="stat-value">' + myDeals.length.toLocaleString() + '</p><p class="text-xs text-[#3D7A70] mt-0.5">' + t('mcStatUnit') + '</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #10b981, #059669);"><i class="fas fa-file-contract text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">' + t('mcStatInvest') + '</p><p class="stat-value">¥' + totalInvest.toLocaleString() + '</p><p class="text-xs text-[#3D7A70] mt-0.5">' + t('mcStatInvestNote') + '</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><i class="fas fa-coins text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">' + t('mcStatProjects') + '</p><p class="stat-value">' + projectCount + '</p><p class="text-xs text-[#3D7A70] mt-0.5">' + t('mcStatProjectsNote') + '</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"><i class="fas fa-briefcase text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">' + t('mcStatAvgAI') + '</p><p class="stat-value">' + avgScore + '</p><p class="text-xs text-[#3D7A70] mt-0.5">' + t('mcStatAvgAINote') + '</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #06b6d4, #0891b2);"><i class="fas fa-robot text-white text-sm"></i></div></div></div>';

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
          '<div class="flex items-center justify-between mb-2">' +
            '<div class="flex items-center gap-2">' +
              '<span class="font-mono text-xs font-bold tracking-wider px-1.5 py-0.5 rounded" style="background: rgba(46,196,182,0.08); color: #3DD8CA; border: 1px solid rgba(46,196,182,0.15); font-size: 10px;">' + (d.mcn || '') + '</span>' +
              '<span class="badge badge-success flex-shrink-0"><i class="fas fa-user-check mr-1"></i>' + (currentLang === 'zh' ? '我的' : 'MINE') + '</span>' +
            '</div>' +
            '<div class="flex items-center gap-1.5">' +
              '<canvas id="' + miniId + '" width="60" height="60" style="width:26px;height:26px;"></canvas>' +
              '<div class="text-right"><p class="font-mono text-sm font-black leading-none" style="color:' + grade.color + ';">' + overall + '</p><p class="font-mono font-bold leading-none" style="font-size:8px; color:' + grade.color + '; opacity:0.8;">' + grade.grade + '</p></div>' +
            '</div>' +
          '</div>' +
          '<div class="flex items-center space-x-2 mb-2">' +
            '<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(16,185,129,0.1);"><i class="fas fa-file-contract" style="color: #10b981; font-size:12px;"></i></div>' +
            '<div class="min-w-0 flex-1"><h3 class="font-bold text-[#E8F5F3] text-sm group-hover:text-[#3DD8CA] transition-colors truncate">' + getProjectName(d) + '</h3><p class="text-xs text-[#5A9A90]">' + getIndustryName(d.industry) + ' · ' + getCityName(d.location) + '</p></div>' +
          '</div>' +
          '<div class="grid grid-cols-4 gap-1 mb-2">' +
            '<div class="text-center p-1.5 rounded-md" style="background:rgba(46,196,182,0.05); border:1px solid rgba(46,196,182,0.08);"><p class="font-mono text-sm font-black text-[#3DD8CA]">¥1K</p><p style="font-size:8px;" class="text-[#3D7A70] uppercase tracking-wider">' + t('cardFace') + '</p></div>' +
            '<div class="text-center p-1.5 rounded-md" style="background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.08);"><p class="font-mono text-sm font-bold text-[#FBBF24]">' + d.revenueShare + '</p><p style="font-size:8px;" class="text-[#3D7A70] uppercase tracking-wider">' + t('cardYield') + '</p></div>' +
            '<div class="text-center p-1.5 rounded-md" style="background:rgba(6,182,212,0.05); border:1px solid rgba(6,182,212,0.08);"><p class="font-mono text-sm font-bold text-[#22D3EE]">' + getPeriodDisplay(d) + '</p><p style="font-size:8px;" class="text-[#3D7A70] uppercase tracking-wider">' + t('cardTerm') + '</p></div>' +
            '<div class="text-center p-1.5 rounded-md" style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.08);"><p class="font-mono text-sm font-bold text-[#34D399]">' + d.riskGrade + '</p><p style="font-size:8px;" class="text-[#3D7A70] uppercase tracking-wider">' + t('cardRisk') + '</p></div>' +
          '</div>' +
          '<div class="flex items-center justify-between pt-2 border-t border-[rgba(46,196,182,0.06)]">' +
            '<span class="font-mono text-xs font-bold text-[#B0D5CF]"><i class="fas fa-robot mr-1 text-[#2EC4B6]" style="font-size:9px;"></i>AI ' + d.aiScore + '</span>' +
            '<span class="text-xs font-semibold text-[#10B981]"><i class="fas fa-check-circle mr-1"></i>' + t('mcSubscribed') + '</span>' +
          '</div>' +
        '</div>';
      }).join('');

      setTimeout(() => {
        filtered.forEach(d => { drawMiniRadar('mcRadar_' + d.id, calcRadarScores(d)); });
      }, 50);
    }

    // ==================== My Portfolios Page ====================
    // ★ Cross-project fund portfolios — like mutual funds, configured by investment philosophy/theme/style
    // Each portfolio draws contracts from different projects, forming diversified investments

    // Portfolio style color mapping
    const PORTFOLIO_CATEGORY_STYLES = {
      'Conservative': { icon: 'fa-shield-alt', gradient: 'linear-gradient(135deg, #10b981, #059669)', color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', label: 'Conservative' },
      'Aggressive': { icon: 'fa-rocket', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: 'Aggressive' },
      'Balanced': { icon: 'fa-balance-scale', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#818cf8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)', label: 'Balanced' },
      'Thematic': { icon: 'fa-bullseye', gradient: 'linear-gradient(135deg, #ec4899, #db2777)', color: '#f472b6', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)', label: 'Thematic' },
      'Industry': { icon: 'fa-industry', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#22d3ee', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)', label: 'Sector' }
    };

    // ★ 20 predefined cross-project fund portfolios
    // projectFilter: function, takes contract and returns inclusion boolean
    const FUND_PORTFOLIOS = [
      // === Conservative (4) ===
      {
        id: 'FUND_S01', name: 'F&B Steady Income S26', category: 'Conservative', riskLevel: 'Low Risk',
        strategy: 'Select top F&B brand contracts, focus on mature stores with stable cash flow, target steady dividend income',
        targetIndustries: ['F&B'], targetReturn: '8-12%', targetPeriod: '24 months',
        filter: function(c) { return c.industry === 'F&B' && parseFloat(c.aiScore) >= 7.5 && c.riskGrade !== 'B+'; }
      },
      {
        id: 'FUND_S02', name: 'Traditional Industry Conservative', category: 'Conservative', riskLevel: 'Low Risk',
        strategy: 'Allocate F&B + Retail consumer sector contracts, prefer long operating history, A- or above rating, low volatility',
        targetIndustries: ['F&B', 'Retail'], targetReturn: '7-10%', targetPeriod: '24 months',
        filter: function(c) { return (c.industry === 'F&B' || c.industry === 'Retail') && parseFloat(c.operatingYears) >= 2.5 && c.riskGrade !== 'B+'; }
      },
      {
        id: 'FUND_S03', name: 'Healthcare Steady No.1', category: 'Conservative', riskLevel: 'Low Risk',
        strategy: 'Focus on healthcare sector, allocate premium medical and checkup leaders, capture health industry certainty dividends',
        targetIndustries: ['Healthcare'], targetReturn: '11-16%', targetPeriod: '24-30 months',
        filter: function(c) { return c.industry === 'Healthcare'; }
      },
      {
        id: 'FUND_S04', name: 'Blue Chip Value Guardian', category: 'Conservative', riskLevel: 'Low Risk',
        strategy: 'Cross-sector A+ rated blue-chip contracts only, invest in best-quality projects, safety margin as top priority',
        targetIndustries: ['All Sectors'], targetReturn: '10-15%', targetPeriod: '18-36 months',
        filter: function(c) { return c.riskGrade === 'A+' && parseFloat(c.aiScore) >= 8.5; }
      },

      // === Aggressive (4) ===
      {
        id: 'FUND_A01', name: 'All-Sector Alpha High Yield', category: 'Aggressive', riskLevel: 'High Risk',
        strategy: 'Scan all sectors for high revenue-share contracts, pursue absolute return Alpha, suitable for risk-tolerant investors',
        targetIndustries: ['All Sectors'], targetReturn: '13-18%', targetPeriod: '18-36 months',
        filter: function(c) { return parseInt(c.revenueShare) >= 12 && parseFloat(c.aiScore) >= 8.0; }
      },
      {
        id: 'FUND_A02', name: 'Tech Innovation Aggressive', category: 'Aggressive', riskLevel: 'Higher Risk',
        strategy: 'Heavy allocation in AI, smart hardware, and NEV tech contracts — betting on the next decade of technology waves',
        targetIndustries: ['Technology'], targetReturn: '12-15%', targetPeriod: '30-36 months',
        filter: function(c) { return c.industry === 'Technology'; }
      },
      {
        id: 'FUND_A03', name: 'Entertainment IP Burst', category: 'Aggressive', riskLevel: 'High Risk',
        strategy: 'Allocate top-tier IP entertainment projects, high share + short cycle, capture explosive IP economy returns',
        targetIndustries: ['Entertainment'], targetReturn: '12-18%', targetPeriod: '18-24 months',
        filter: function(c) { return c.industry === 'Entertainment'; }
      },
      {
        id: 'FUND_A04', name: 'High-Growth Newcomer Hunter', category: 'Aggressive', riskLevel: 'Higher Risk',
        strategy: 'Focus on brands <3 yrs operating, high growth for excess returns, suitable for long-term hold',
        targetIndustries: ['All Sectors'], targetReturn: '8-13%', targetPeriod: '24-30 months',
        filter: function(c) { return parseFloat(c.operatingYears) <= 3.0 && parseFloat(c.aiScore) >= 7.5; }
      },

      // === Balanced (4) ===
      {
        id: 'FUND_B01', name: 'Consumer + Tech Dual Engine', category: 'Balanced', riskLevel: 'Moderate Risk',
        strategy: '50% stable consumer (F&B, Retail) + 50% tech growth — classic offensive-defensive balanced portfolio',
        targetIndustries: ['F&B', 'Retail', 'Technology'], targetReturn: '9-14%', targetPeriod: '24-36 months',
        filter: function(c) { return (c.industry === 'F&B' || c.industry === 'Retail' || c.industry === 'Technology') && parseFloat(c.aiScore) >= 7.5; }
      },
      {
        id: 'FUND_B02', name: 'All-Weather Balanced', category: 'Balanced', riskLevel: 'Moderate Risk',
        strategy: 'Span F&B, Retail, Tech, Healthcare, Education, Entertainment — reduce volatility through diversification',
        targetIndustries: ['All Sectors'], targetReturn: '9-13%', targetPeriod: '24-30 months',
        filter: function(c) { return parseFloat(c.aiScore) >= 7.0; }
      },
      {
        id: 'FUND_B03', name: 'Tier-1 City Core Assets', category: 'Balanced', riskLevel: 'Low-Moderate Risk',
        strategy: 'Lock in top 5 tier-1 cities quality projects, capture urbanization and consumer upgrade dividends',
        targetIndustries: ['All Sectors'], targetReturn: '8-14%', targetPeriod: '24-30 months',
        filter: function(c) { return ['Beijing','Shanghai','Shenzhen','Guangzhou','Hangzhou'].indexOf(c.location) >= 0; }
      },
      {
        id: 'FUND_B04', name: 'Moderate Return Steady Growth', category: 'Balanced', riskLevel: 'Moderate Risk',
        strategy: 'Select 9-13% revenue share mid-return range, balance yield and safety, suitable for most investors',
        targetIndustries: ['All Sectors'], targetReturn: '9-13%', targetPeriod: '24-30 months',
        filter: function(c) { var rs = parseInt(c.revenueShare); return rs >= 9 && rs <= 13 && parseFloat(c.aiScore) >= 7.5; }
      },

      // === Thematic (4) ===
      {
        id: 'FUND_T01', name: 'AI Wave Thematic', category: 'Thematic', riskLevel: 'Higher Risk',
        strategy: 'Capture AI value chain: from AI Lab to Smart City to AI Education — one-click AI ecosystem allocation',
        targetIndustries: ['Technology', 'Education'], targetReturn: '10-15%', targetPeriod: '30-36 months',
        filter: function(c) { return (c.industry === 'Technology' || c.industry === 'Education') && (c.name.indexOf('AI') >= 0 || c.name.indexOf('AI') >= 0 || c.name.indexOf('Technology') >= 0); }
      },
      {
        id: 'FUND_T02', name: 'New Consumer Trend Select', category: 'Thematic', riskLevel: 'Moderate Risk',
        strategy: 'Select new tea, blind box, new retail Gen-Z consumer brands — ride the youth consumer upgrade wave',
        targetIndustries: ['F&B', 'Retail'], targetReturn: '8-13%', targetPeriod: '24-30 months',
        filter: function(c) { return (c.industry === 'F&B' || c.industry === 'Retail') && parseFloat(c.operatingYears) <= 4.0; }
      },
      {
        id: 'FUND_T03', name: 'Short-Cycle Quick Return', category: 'Thematic', riskLevel: 'Moderate Risk',
        strategy: 'Only ≤24-month short-term contracts, pursue fast capital turnover, flexibly seize market opportunities',
        targetIndustries: ['All Sectors'], targetReturn: '7-13%', targetPeriod: '≤24 months',
        filter: function(c) { var months = parseInt(c.period); return months <= 24; }
      },
      {
        id: 'FUND_T04', name: 'Large Flagship Select', category: 'Thematic', riskLevel: 'Low-Moderate Risk',
        strategy: 'Only ¥1M+ large flagship projects, capture stability premium from scale effect',
        targetIndustries: ['All Sectors'], targetReturn: '11-16%', targetPeriod: '24-36 months',
        filter: function(c) { return (c.projectTotalAmount || 0) >= 100; }
      },

      // === Industry (4) ===
      {
        id: 'FUND_I01', name: 'Deep-Rooted Education Industry Player', category: 'Industry', riskLevel: 'Moderate Risk',
        strategy: 'Deep education sector play: K12 to vocational to AI education — capture knowledge economy long-term dividends',
        targetIndustries: ['Education'], targetReturn: '9-10%', targetPeriod: '30 months',
        filter: function(c) { return c.industry === 'Education'; }
      },
      {
        id: 'FUND_I02', name: 'Retail Consumer Navigator', category: 'Industry', riskLevel: 'Low-Moderate Risk',
        strategy: 'Full retail spectrum: from blind boxes to daily goods to coffee to logistics — consumption never sleeps',
        targetIndustries: ['Retail'], targetReturn: '7-9%', targetPeriod: '24-30 months',
        filter: function(c) { return c.industry === 'Retail'; }
      },
      {
        id: 'FUND_I03', name: 'Consumer Chain ETF', category: 'Industry', riskLevel: 'Moderate Risk',
        strategy: 'F&B + Retail dual-sector synergy, from upstream brands to downstream channels — full consumer chain coverage',
        targetIndustries: ['F&B', 'Retail'], targetReturn: '7-12%', targetPeriod: '24-30 months',
        filter: function(c) { return c.industry === 'F&B' || c.industry === 'Retail'; }
      },
      {
        id: 'FUND_I04', name: 'Tech + Healthcare Future', category: 'Industry', riskLevel: 'Moderate Risk',
        strategy: 'Dual-engine: tech = efficiency revolution, healthcare = consumer upgrade — two certainty sectors combined',
        targetIndustries: ['Technology', 'Healthcare'], targetReturn: '11-16%', targetPeriod: '24-36 months',
        filter: function(c) { return c.industry === 'Technology' || c.industry === 'Healthcare'; }
      }
    ];

    // English translation map for FUND_PORTFOLIOS
    const FUND_EN = {
      FUND_S01: { name: 'F&B Steady S26', strategy: 'Curated F&B blue-chip contracts — focus on mature, cash-flow-stable outlets for consistent dividend yield' },
      FUND_S02: { name: 'Traditional Sector Conservative', strategy: 'Allocation in F&B + Retail consumer staples, prioritizing long-operating, A-rated low-volatility deals' },
      FUND_S03: { name: 'Healthcare Stable No.1', strategy: 'Focused healthcare allocation — premium medical and check-up leaders, capturing predictable health sector returns' },
      FUND_S04: { name: 'Blue-Chip Value Guardian', strategy: 'Cross-sector A+ rated blue-chip selection — investing only in top-tier deals with safety margin as first principle' },
      FUND_A01: { name: 'Alpha High-Yield Cross-Sector', strategy: 'Cross-sector scan for high revenue-share contracts, pursuing absolute Alpha returns for risk-tolerant investors' },
      FUND_A02: { name: 'Tech Innovation Aggressive', strategy: "Overweight in AI, smart hardware, and new-energy tech — betting on the next decade's technology wave" },
      FUND_A03: { name: 'Entertainment IP Growth', strategy: 'Top IP entertainment projects — high share + short cycle, capturing explosive IP economy returns' },
      FUND_A04: { name: 'High-Growth New Venture Hunter', strategy: 'Focused on brands ≤3 yrs — trading high growth for excess returns, suited for long-term holding' },
      FUND_B01: { name: 'Consumer + Tech Dual Engine', strategy: '50% stable consumer (F&B/Retail) + 50% tech growth — classic balanced allocation' },
      FUND_B02: { name: 'All-Weather Balanced', strategy: 'Six-sector diversification across F&B, Retail, Tech, Healthcare, Education, Entertainment — volatility reduction through diversification' },
      FUND_B03: { name: 'Tier-1 City Core Assets', strategy: "Lock on top-5 cities' premium deals — ride urbanization and consumption upgrade" },
      FUND_B04: { name: 'Moderate Return Steady Growth', strategy: 'Revenue share 9-13% band — balanced yield and safety, suited for most investors' },
      FUND_T01: { name: 'AI Wave Thematic', strategy: 'AI value chain: from AI Labs to smart cities to AI education — one-click AI ecosystem coverage' },
      FUND_T02: { name: 'New Consumer Trend Select', strategy: 'Curated new-gen consumer brands (tea, collectibles, new retail) — Gen-Z consumption upgrade' },
      FUND_T03: { name: 'Short-Cycle Quick-Return', strategy: 'Contracts ≤24 months only — capital velocity strategy for flexible market positioning' },
      FUND_T04: { name: 'Flagship Large-Cap Select', strategy: 'Projects with raise ≥¥1M only — scale premium stability' },
      FUND_I01: { name: 'Education Sector Deep Dive', strategy: 'Deep education allocation: K12, vocational, AI education — knowledge economy dividend' },
      FUND_I02: { name: 'Retail Consumer Navigator', strategy: 'Full-category retail: collectibles, daily goods, coffee, logistics — consumption never sleeps' },
      FUND_I03: { name: 'Consumer Chain ETF', strategy: 'F&B + Retail dual-sector synergy — upstream brands to downstream channels, full chain coverage' },
      FUND_I04: { name: 'Tech + Health Future Blend', strategy: 'Dual engine: Tech = efficiency revolution, Health = consumption upgrade — two high-conviction sectors' }
    };
    // Portfolio category EN map
    const CAT_EN = { 'Conservative': 'Conservative', 'Aggressive': 'Aggressive', 'Balanced': 'Balanced', 'Thematic': 'Thematic', 'Industry': 'Sector' };
    const RISK_EN = { 'Low Risk': 'Low Risk', 'High Risk': 'High Risk', 'Higher Risk': 'Med-High Risk', 'Moderate Risk': 'Moderate Risk', 'Low-Moderate Risk': 'Low-Med Risk' };
    function getFundName(fund) { return currentLang === 'en' && FUND_EN[fund.id] ? FUND_EN[fund.id].name : fund.name; }
    function getFundStrategy(fund) { return currentLang === 'en' && FUND_EN[fund.id] ? FUND_EN[fund.id].strategy : fund.strategy; }
    function getFundCategory(fund) { return currentLang === 'en' ? (CAT_EN[fund.category] || fund.category) : fund.category; }
    function getFundRiskLevel(fund) { return currentLang === 'en' ? (RISK_EN[fund.riskLevel] || fund.riskLevel) : fund.riskLevel; }
    // Translate targetPeriod: '24 months' → '24个月' in zh
    function getTargetPeriod(fund) {
      var p = fund.targetPeriod;
      if (currentLang === 'zh') return p.replace(/\s*months?/gi, '个月').replace('mo', '个月');
      return p;
    }
    // Translate targetIndustries array for display
    function getTargetIndustriesDisplay(fund, sep) {
      sep = sep || (currentLang === 'zh' ? ' · ' : ' · ');
      return fund.targetIndustries.map(function(ind) { return getIndustryName(ind); }).join(sep);
    }
    // Translate PORTFOLIO_CATEGORY_STYLES label
    var CAT_LABEL_ZH = { 'Conservative': '稳健型', 'Aggressive': '进取型', 'Balanced': '均衡型', 'Thematic': '主题型', 'Industry': '行业型' };
    function getCategoryLabel(key) { return currentLang === 'zh' ? (CAT_LABEL_ZH[key] || key) : (CAT_EN[key] || key); }

    let currentPortfolioFilter = 'all';

    function getMyPortfolios() {
      const myDeals = getMyContracts();
      if (myDeals.length === 0) return [];
      
      return FUND_PORTFOLIOS.map(function(fund) {
        var contracts = myDeals.filter(fund.filter);
        if (contracts.length === 0) return null;
        
        // Count projects and industries involved
        var projectSet = {};
        var industrySet = {};
        contracts.forEach(function(c) {
          projectSet[c.projectId] = { name: c.name, name_zh: c.name_zh };
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

    // Calculate portfolio weighted-average radar scores → V1 代理
    function calcPortfolioRadarScores(contracts) {
      if (!contracts || contracts.length === 0) return RADAR_DIMENSIONS.map(function() { return 50; });
      var pr = calcPortfolioRadarV1(contracts);
      // 返回8元素score数组(合约8轴的effective_value)，兼容旧调用
      return pr.contractAxes.map(function(a) { return a.effective_value; });
    }

    function goToMyPortfolios() {
      renderMyPortfolios();
      switchPage('pageMyPortfolios');
      pushPageState('pageMyPortfolios');
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
          activeBtn.style.background = 'rgba(139,92,246,0.08)';
          activeBtn.style.color = '#A78BFA';
          activeBtn.style.borderColor = 'rgba(139,92,246,0.25)';
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

      // Overall stats (based on all, unaffected by filter)
      var totalContracts = allPortfolios.reduce(function(s, p) { return s + p.contracts.length; }, 0);
      var uniqueContracts = {};
      allPortfolios.forEach(function(p) { p.contracts.forEach(function(c) { uniqueContracts[c.id] = true; }); });
      var uniqueCount = Object.keys(uniqueContracts).length;
      var totalInvest = uniqueCount * 1000;

      document.getElementById('myPortfoliosSubtitle').textContent = t('mpSubtitle', {count: allPortfolios.length, contracts: uniqueCount});

      // Portfolio stats
      var categoryCount = {};
      allPortfolios.forEach(function(p) { categoryCount[p.category] = (categoryCount[p.category] || 0) + 1; });
      var allPortScores = portfolios.map(function(p) { var s = calcPortfolioRadarScores(p.contracts); return calcOverallScore(s); });
      var avgOverall = allPortScores.length > 0 ? Math.round(allPortScores.reduce(function(a, b) { return a + b; }, 0) / allPortScores.length) : 0;
      var allIndustries = {};
      allPortfolios.forEach(function(p) { p.industries.forEach(function(ind) { allIndustries[ind] = true; }); });
      var indDisplay = Object.keys(allIndustries).map(function(i) { var m = {'F&B':'F&B','Retail':'Retail','Technology':'Tech','Education':'Edu','Healthcare':'Health','Entertainment':'Ent'}; return m[i] || i; }).join(' · ');

      document.getElementById('mpStatsGrid').innerHTML =
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">' + ('Portfolios') + '</p><p class="stat-value">' + allPortfolios.length + '</p><p class="text-xs text-[#3D7A70] mt-0.5">' + Object.keys(categoryCount).length + (' strategy types') + '</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"><i class="fas fa-object-group text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">' + ('Unique Contracts') + '</p><p class="stat-value">' + uniqueCount + '</p><p class="text-xs text-[#3D7A70] mt-0.5">¥' + totalInvest.toLocaleString() + (' invested') + '</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #10b981, #059669);"><i class="fas fa-file-contract text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">' + ('Sectors') + '</p><p class="stat-value">' + Object.keys(allIndustries).length + '</p><p class="text-xs text-[#3D7A70] mt-0.5">' + indDisplay + '</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><i class="fas fa-th-large text-white text-sm"></i></div></div></div>' +
        '<div class="stat-card"><div class="flex items-center justify-between"><div><p class="stat-label">' + ('Avg Score') + '</p><p class="stat-value">' + avgOverall + '</p><p class="text-xs text-[#3D7A70] mt-0.5">' + ('Overall portfolio score') + '</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #06b6d4, #0891b2);"><i class="fas fa-chart-line text-white text-sm"></i></div></div></div>';

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
        var catStyle = PORTFOLIO_CATEGORY_STYLES[p.category] || PORTFOLIO_CATEGORY_STYLES['Balanced'];

        return '<div class="project-card group cursor-pointer animate-fade-in" onclick="openPortfolioDetail(&#39;' + p.id + '&#39;)">' +
          // Header — fund name and type
          '<div class="flex items-center justify-between mb-3">' +
            '<div class="flex items-center gap-2 min-w-0">' +
              '<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="' + catStyle.gradient + ';"><i class="fas ' + catStyle.icon + ' text-white text-sm"></i></div>' +
              '<div class="min-w-0"><h3 class="font-bold text-[#E8F5F3] text-sm group-hover:text-[#8B5CF6] transition-colors truncate">' + getFundName(p) + '</h3><p class="text-xs text-[#5A9A90] flex items-center gap-1"><span class="px-1.5 py-0.5 rounded text-xs font-bold" style="background:' + catStyle.bg + '; color:' + catStyle.color + '; font-size:9px;">' + getFundCategory(p) + '</span><span>' + getFundRiskLevel(p) + '</span></p></div>' +
            '</div>' +
            '<div class="flex items-center gap-2 flex-shrink-0">' +
              '<canvas id="' + canvasId + '" width="60" height="60" style="width:30px;height:30px;"></canvas>' +
              '<div class="text-right"><p class="text-sm font-black leading-none" style="color:' + grade.color + ';">' + overall + '</p><p class="font-bold leading-none" style="font-size:9px; color:' + grade.color + ';">' + grade.grade + '</p></div>' +
            '</div>' +
          '</div>' +
          // Strategy description
          '<p class="text-xs text-[#3D7A70] mb-2 leading-relaxed line-clamp-2" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + getFundStrategy(p) + '</p>' +
          // Portfolio config info
          '<div class="p-3 rounded-xl mb-2" style="background:' + catStyle.bg + '; border: 1px solid ' + catStyle.border + ';">' +
            '<div class="flex items-center justify-between mb-2">' +
              '<span class="text-xs font-bold" style="color:' + catStyle.color + ';"><i class="fas fa-layer-group mr-1"></i>' + p.contracts.length + t('mpContractCountLabel') + ' · ' + p.projectCount + (currentLang === 'zh' ? ' 个项目' : ' projects') + '</span>' +
              '<span class="text-sm font-black" style="color:' + catStyle.color + ';">¥' + totalValue.toLocaleString() + '</span>' +
            '</div>' +
            '<div class="flex flex-wrap gap-1">' +
              p.industries.map(function(ind) { return '<span class="px-1.5 py-0.5 rounded text-xs font-medium bg-[#0F2E2B] border border-[rgba(46,196,182,0.08)]" style="font-size:9px; color:#5A9A90;">' + getIndustryName(ind) + '</span>'; }).join('') +
              Object.values(p.projects).slice(0, 3).map(function(proj) { var displayName = getProjectName(typeof proj === 'object' ? proj : {name: proj}); return '<span class="px-1.5 py-0.5 rounded text-xs bg-[#0F2E2B] border border-[rgba(46,196,182,0.08)]" style="font-size:9px; color:#5A9A90;">' + (displayName.length > 8 ? displayName.substring(0, 8) + '…' : displayName) + '</span>'; }).join('') +
              (p.projectCount > 3 ? '<span class="text-xs text-[#3D7A70] self-center">+' + (p.projectCount - 3) + '</span>' : '') +
            '</div>' +
          '</div>' +
          // Key metrics
          '<div class="grid grid-cols-3 gap-2 mb-2">' +
            '<div class="text-center p-2 bg-[#0B2624] rounded-lg"><p class="text-xs font-bold text-[#F59E0B]">' + p.targetReturn + '</p><p style="font-size:9px;" class="text-[#3D7A70]">' + t('mpTargetReturn') + '</p></div>' +
            '<div class="text-center p-2 bg-[#0B2624] rounded-lg"><p class="text-xs font-bold text-[#06B6D4]">' + p.targetPeriod + '</p><p style="font-size:9px;" class="text-[#3D7A70]">' + t('mpPeriod') + '</p></div>' +
            '<div class="text-center p-2 bg-[#0B2624] rounded-lg"><p class="text-xs font-bold text-[#10B981]">' + avgAI + '</p><p style="font-size:9px;" class="text-[#3D7A70]">' + t('pdAvgAI') + '</p></div>' +
          '</div>' +
          // Footer
          '<div class="flex items-center justify-between pt-2 border-t border-[rgba(46,196,182,0.08)]">' +
            '<span class="text-xs text-[#3D7A70]"><i class="fas fa-tags mr-1"></i>' + getTargetIndustriesDisplay(p) + '</span>' +
            '<span class="text-xs font-medium group-hover:text-[#A78BFA] transition-colors" style="color:' + catStyle.color + ';"><i class="fas fa-arrow-right mr-1"></i>' + t('dealViewDetail') + '</span>' +
          '</div>' +
        '</div>';
      }).join('');

      setTimeout(function() {
        portfolios.forEach(function(p, idx) {
          drawMiniRadar('mpRadar_' + idx, calcPortfolioRadarScores(p.contracts));
        });
      }, 50);

      // Initialize filter button active state
      document.querySelectorAll('.mp-filter-btn').forEach(function(btn) {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        if (btn.getAttribute('data-cat') === currentPortfolioFilter) {
          btn.classList.add('active');
          if (currentPortfolioFilter === 'all') {
            btn.style.background = 'rgba(139,92,246,0.08)';
            btn.style.color = '#A78BFA';
            btn.style.borderColor = 'rgba(139,92,246,0.25)';
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

    // ==================== Portfolio Detail Page ====================
    let currentPortfolio = null;

    function openPortfolioDetail(fundId) {
      const portfolios = getMyPortfolios();
      currentPortfolio = portfolios.find(function(p) { return p.id === fundId; });
      if (!currentPortfolio) return;

      const contracts = currentPortfolio.contracts;
      // V1 组合引擎
      const pv1 = calcPortfolioRadarV1(contracts);
      const scores = pv1.contractAxes.map(function(a) { return a.effective_value; });
      const overall = pv1.overallScore;
      const grade = getScoreGrade(overall);
      const totalValue = contracts.length * 1000;
      const avgAI = (contracts.reduce(function(s, c) { return s + parseFloat(c.aiScore); }, 0) / contracts.length).toFixed(1);
      const avgShare = (contracts.reduce(function(s, c) { return s + parseInt(c.revenueShare); }, 0) / contracts.length).toFixed(1);
      // Calculate annual yield (revenueShare is annual %, weighted avg)
      let pdTotalYield = 0;
      contracts.forEach(function(c) { var sn = parseInt(c.revenueShare) || 10; pdTotalYield += sn; });
      const pdAvgYield = (pdTotalYield / contracts.length).toFixed(1);
      // Calculate avg contract duration (months→days)
      let pdTotalMonths = 0;
      contracts.forEach(function(c) { pdTotalMonths += parseInt(c.period) || 24; });
      const pdAvgDays = Math.round((pdTotalMonths / contracts.length) * 30);
      const catStyle = PORTFOLIO_CATEGORY_STYLES[currentPortfolio.category] || PORTFOLIO_CATEGORY_STYLES['Balanced'];

      document.getElementById('pdTitle').textContent = getFundName(currentPortfolio);
      document.getElementById('pdSubtitle').textContent = t('pdSubtitle', {contracts: contracts.length, projects: currentPortfolio.projectCount});
      document.getElementById('pdGradeBadge').textContent = grade.grade + ' · ' + overall;
      document.getElementById('pdGradeBadge').style.cssText = 'background:' + grade.bg + '; color:' + grade.color + '; padding:4px 14px; border-radius:12px; font-size:13px; font-weight:700;';
      document.getElementById('pdCategoryBadge').textContent = getFundCategory(currentPortfolio);
      document.getElementById('pdCategoryBadge').style.cssText = 'background:' + catStyle.bg + '; color:' + catStyle.color + '; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:600;';
      document.getElementById('pdIconBox').style.background = catStyle.gradient;
      document.getElementById('pdIcon').className = 'fas ' + catStyle.icon + ' text-white text-sm';

      // === Left panel — portfolio overview ===
      // Display contracts grouped by project
      var projectGroups = {};
      contracts.forEach(function(c) {
        if (!projectGroups[c.projectId]) {
          projectGroups[c.projectId] = { name: c.name, name_zh: c.name_zh, industry: c.industry, location: c.location, contracts: [] };
        }
        projectGroups[c.projectId].contracts.push(c);
      });

      var projectGroupsHTML = Object.keys(projectGroups).map(function(pid) {
        var pg = projectGroups[pid];
        return '<div class="mb-3">' +
          '<div class="flex items-center gap-2 mb-1.5">' +
            '<span class="text-xs font-bold text-[#B0D5CF]"><i class="fas fa-building mr-1 text-[#3D7A70]"></i>' + getProjectName(pg) + '</span>' +
            '<span class="text-xs text-[#3D7A70]">' + getIndustryName(pg.industry) + ' · ' + getCityName(pg.location) + '</span>' +
          '</div>' +
          '<div class="space-y-1.5">' +
            pg.contracts.map(function(c) {
              var cs = calcRadarScores(c);
              var co = calcOverallScore(cs);
              var cg = getScoreGrade(co);
              return '<div class="flex items-center gap-3 p-2.5 bg-[#0B2624] rounded-xl border border-[rgba(46,196,182,0.08)] hover:border-[rgba(139,92,246,0.2)] cursor-pointer transition-all" onclick="openDetail(&#39;' + c.id + '&#39;)">' +
                '<div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(16,185,129,0.1);"><i class="fas fa-file-contract text-emerald-500" style="font-size:10px;"></i></div>' +
                '<div class="flex-1 min-w-0">' +
                  '<p class="font-mono text-xs font-bold text-[#B0D5CF] truncate">' + (c.mcn || '') + '</p>' +
                  '<p class="text-xs text-[#3D7A70]">¥1,000 · ' + c.revenueShare + ' · ' + c.riskGrade + '</p>' +
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

      // Industry allocation pie chart data
      var industryDistrib = {};
      contracts.forEach(function(c) { industryDistrib[c.industry] = (industryDistrib[c.industry] || 0) + 1; });
      var distribHTML = Object.keys(industryDistrib).map(function(ind) {
        var pct = (industryDistrib[ind] / contracts.length * 100).toFixed(1);
        var indColors = { 'F&B': '#f59e0b', 'Retail': '#06b6d4', 'Technology': '#8b5cf6', 'Education': '#10b981', 'Healthcare': '#ef4444', 'Entertainment': '#ec4899' };
        var c = indColors[ind] || '#3D7A70';
        return '<div class="flex items-center gap-2">' +
          '<div class="w-3 h-3 rounded-full flex-shrink-0" style="background:' + c + ';"></div>' +
          '<span class="text-xs text-[#8EBDB5] flex-1">' + getIndustryName(ind) + '</span>' +
          '<span class="text-xs font-bold text-[#B0D5CF]">' + industryDistrib[ind] + (currentLang === 'en' ? '' : '') + '</span>' +
          '<span class="text-xs text-[#3D7A70]">' + pct + '%</span>' +
        '</div>';
      }).join('');

      document.getElementById('pdLeft').innerHTML =
        '<div class="mb-5">' +
          // Portfolio basic info
          '<div class="p-4 rounded-2xl mb-4" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%); position: relative; overflow: hidden;">' +
            '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 30%, rgba(139,92,246,0.25) 0%, transparent 50%);pointer-events:none;"></div>' +
            '<div class="relative z-10">' +
              '<div class="flex items-center gap-2 mb-2"><span class="px-2 py-0.5 rounded text-xs font-bold" style="background:' + catStyle.color + '33; color: rgba(167,139,250,0.8);">' + getFundCategory(currentPortfolio) + '</span><span class="text-xs" style="color: rgba(255,255,255,0.4);">' + getCategoryLabel(currentPortfolio.category) + (currentLang === 'zh' ? ' 基金' : ' Fund') + '</span><span class="px-2 py-0.5 rounded text-xs" style="background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6);">' + getFundRiskLevel(currentPortfolio) + '</span></div>' +
              '<h2 class="text-lg font-bold text-white mb-1">' + getFundName(currentPortfolio) + '</h2>' +
              '<p class="text-xs mb-3" style="color: rgba(255,255,255,0.5);">' + getFundStrategy(currentPortfolio) + '</p>' +
              '<div class="grid grid-cols-4 gap-2">' +
                '<div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.08);"><p class="text-lg font-black text-white">' + contracts.length + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">' + t('mpContracts') + '</p></div>' +
                '<div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.08);"><p class="text-lg font-black text-violet-300">' + currentPortfolio.projectCount + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">' + t('mpProjects') + '</p></div>' +
                '<div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.08);"><p class="text-lg font-black text-amber-300">¥' + totalValue.toLocaleString() + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">' + t('pdInvested') + '</p></div>' +
                '<div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.08);"><p class="text-lg font-black" style="color:' + grade.color + ';">' + overall + '</p><p style="font-size:9px; color: rgba(255,255,255,0.4);">' + t('pdOverallScore') + '</p></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          // Key params — show annual yield and actual days
          '<div class="grid grid-cols-2 gap-3 mb-4">' +
            '<div class="p-3 bg-[rgba(245,158,11,0.06)] rounded-xl"><p class="text-xs text-[#5A9A90] mb-1">' + t('pdAnnualYield') + '</p><p class="text-lg font-bold text-[#F59E0B]">' + pdAvgYield + '%</p><p class="text-xs text-[#3D7A70]">' + t('pdWeightedShare') + avgShare + '%</p></div>' +
            '<div class="p-3 bg-[rgba(6,182,212,0.06)] rounded-xl"><p class="text-xs text-[#5A9A90] mb-1">' + t('pdAvgContract') + '</p><p class="text-lg font-bold text-[#06B6D4]">' + pdAvgDays + t('pdDayUnit') + '</p><p class="text-xs text-[#3D7A70]">' + t('pdAboutMonths', {n: (pdTotalMonths / contracts.length).toFixed(0)}) + '</p></div>' +
            '<div class="p-3 bg-[rgba(16,185,129,0.06)] rounded-xl"><p class="text-xs text-[#5A9A90] mb-1">' + t('pdAvgAIScore') + '</p><p class="text-lg font-bold text-[#10B981]">' + avgAI + '<span class="text-xs text-[#3D7A70]">/10</span></p></div>' +
            '<div class="p-3 bg-[rgba(139,92,246,0.06)] rounded-xl"><p class="text-xs text-[#5A9A90] mb-1">' + t('pdTargetHorizon') + '</p><p class="text-lg font-bold text-[#8B5CF6]">' + getTargetPeriod(currentPortfolio) + '</p></div>' +
          '</div>' +
          // Industry allocation
          '<div class="p-3 bg-[#0B2624] rounded-xl border border-[rgba(46,196,182,0.08)] mb-4">' +
            '<p class="text-xs font-bold text-[#B0D5CF] mb-2"><i class="fas fa-chart-pie mr-1.5 text-[#8B5CF6]"></i>' + t('pdSectorAlloc', {n: currentPortfolio.industryCount}) + '</p>' +
            '<div class="space-y-1.5">' + distribHTML + '</div>' +
          '</div>' +
          // Investment strategy description
          '<div class="p-3 bg-[rgba(139,92,246,0.06)] rounded-xl border border-[rgba(139,92,246,0.12)] mb-4">' +
            '<div class="flex items-start gap-2"><i class="fas fa-lightbulb text-[#8B5CF6] mt-0.5"></i><div><p class="text-xs font-bold text-[#A78BFA] mb-1">' + t('mpStrategy') + '</p><p class="text-xs text-[#8B5CF6] leading-relaxed">' + getFundStrategy(currentPortfolio) + '</p><p class="text-xs text-[#A78BFA] mt-1">' + t('pdSectorsLabel') + currentPortfolio.targetIndustries.map(function(ind) { return getIndustryName(ind); }).join(currentLang === 'en' ? ', ' : '、') + t('pdStrategyAcross', {projects: currentPortfolio.projectCount, contracts: contracts.length}) + '</p></div></div>' +
          '</div>' +
        '</div>' +
        // Contract list grouped by project
        '<div><h3 class="text-sm font-bold text-[#E8F5F3] mb-3"><i class="fas fa-sitemap mr-1.5 text-[#8B5CF6]"></i>' + t('pdHoldings') + ' (' + contracts.length + ')</h3>' +
        '<div>' + projectGroupsHTML + '</div>' +
        '</div>';

      // Right panel — V1 weighted radar + dimension analysis + concentration
      let dimensionDetails = '';
      pv1.contractAxes.forEach(function(axis, i) {
        var dim = RADAR_DIMENSIONS[i];
        var effVal = axis.effective_value;
        var dGrade = getScoreGrade(effVal);
        var tailGap = axis.weighted_mean - axis.tail_metric;
        var hasTailDrag = tailGap > 15;
        var groupLabel = getDimGroup(dim);
        var groupCls = getDimGroupCls(dim);
        dimensionDetails += '<div class="p-3 bg-[#0B2624] rounded-xl border border-[rgba(46,196,182,0.08)]">' +
          '<div class="flex items-center gap-3">' +
            '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + axis.color + '15;"><i class="fas ' + axis.icon + '" style="color:' + axis.color + '; font-size:13px;"></i></div>' +
            '<div class="flex-1 min-w-0">' +
              '<div class="flex items-center justify-between mb-1">' +
                '<div class="flex items-center gap-1.5">' +
                  '<span class="dim-group-tag ' + groupCls + '">' + groupLabel + '</span>' +
                  '<span class="dim-tooltip-wrap"><span class="text-xs font-bold text-[#B0D5CF]">' + getDimLabel(dim) + '</span><i class="fas fa-info-circle" style="font-size:9px;color:#3D7A70;margin-left:2px;"></i><span class="dim-tooltip-text"><b style="color:' + axis.color + ';">' + getDimLabel(dim) + '</b><br>' + getDimDesc(dim) + '</span></span>' +
                '</div>' +
                '<div class="flex items-center gap-1.5">' +
                  '<span class="text-xs text-[#3D7A70]" title="min~max">' + axis.min + '~' + axis.max + '</span>' +
                  '<span class="text-xs text-[#5A9A90]" title="P10 tail">' + (currentLang === 'zh' ? 'P10:' : 'P10:') + axis.tail_metric + '</span>' +
                  '<span class="text-xs font-bold" style="color:' + dGrade.color + ';">' + effVal + '</span>' +
                  '<span class="text-xs px-1.5 py-0.5 rounded font-bold" style="background:' + dGrade.bg + '; color:' + dGrade.color + ';">T' + v1TierFromScore(effVal) + '</span>' +
                '</div>' +
              '</div>' +
              // 双层条: weighted_mean + effective_value
              '<div class="relative h-1.5 rounded-full bg-[rgba(46,196,182,0.1)] overflow-hidden">' +
                '<div class="absolute h-full rounded-full opacity-40" style="width:' + axis.weighted_mean + '%; background:' + axis.color + ';"></div>' +
                '<div class="absolute h-full rounded-full" style="width:' + effVal + '%; background: linear-gradient(90deg, ' + axis.color + ', ' + axis.color + 'cc);"></div>' +
              '</div>' +
              (hasTailDrag ? '<p class="text-xs mt-1" style="color:#f59e0b;"><i class="fas fa-exclamation-circle mr-0.5" style="font-size:8px;"></i>' + (currentLang === 'zh' ? '\u5C3E\u90E8\u62D6\u7D2F: \u5747\u503C' + axis.weighted_mean + ' vs P10=' + axis.tail_metric : 'Tail drag: mean=' + axis.weighted_mean + ' vs P10=' + axis.tail_metric) + '</p>' : '') +
            '</div>' +
          '</div>' +
        '</div>';
      });

      // 组合新增2轴卡片 (集中度)
      var concCards = '';
      pv1.portfolioAxes.forEach(function(pa) {
        var paGrade = getScoreGrade(pa.score);
        concCards += '<div class="p-3 bg-[#0B2624] rounded-xl border border-[' + pa.color + '25]">' +
          '<div class="flex items-center gap-3">' +
            '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + pa.color + '15;"><i class="fas ' + pa.icon + '" style="color:' + pa.color + '; font-size:13px;"></i></div>' +
            '<div class="flex-1">' +
              '<div class="flex items-center justify-between mb-1">' +
                '<span class="text-xs font-bold text-[#B0D5CF]">' + pa.nameCN + '</span>' +
                '<div class="flex items-center gap-2">' +
                  '<span class="text-xs font-bold" style="color:' + paGrade.color + ';">' + pa.score + '</span>' +
                  '<span class="text-xs px-1.5 py-0.5 rounded font-bold" style="background:' + paGrade.bg + '; color:' + paGrade.color + ';">T' + pa.tier + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="h-1.5 rounded-full bg-[rgba(46,196,182,0.1)] overflow-hidden"><div class="h-full rounded-full" style="width:' + pa.score + '%; background:' + pa.color + ';"></div></div>' +
              '<p class="text-xs text-[#5A9A90] mt-1">' + pa.explanation + '</p>' +
            '</div>' +
          '</div>' +
        '</div>';
      });

      // warnings 面板
      var warningsHtml = '';
      if (pv1.warnings && pv1.warnings.length > 0) {
        warningsHtml = '<div class="p-3 bg-[rgba(245,158,11,0.06)] rounded-xl border border-[rgba(245,158,11,0.15)]">' +
          '<div class="flex items-start gap-2"><i class="fas fa-exclamation-triangle text-amber-400 mt-0.5"></i><div>' +
          '<p class="text-xs font-bold text-[#FBBF24] mb-1">' + (currentLang === 'zh' ? '\u7EC4\u5408\u98CE\u9669\u63D0\u793A' : 'Portfolio Risk Alerts') + '</p>' +
          pv1.warnings.map(function(w) { return '<p class="text-xs text-[#F59E0B] mb-0.5"><i class="fas fa-angle-right mr-1" style="font-size:9px;"></i>' + w + '</p>'; }).join('') +
          '</div></div></div>';
      }

      document.getElementById('pdRight').innerHTML =
        '<div class="space-y-4">' +
          // Warnings
          warningsHtml +
          // Portfolio radar chart
          '<div class="bg-[#0F2E2B] rounded-2xl border border-[rgba(46,196,182,0.08)] overflow-hidden">' +
            '<div class="p-4 flex items-center justify-between" style="background: linear-gradient(135deg, rgba(139,92,246,0.04), rgba(124,58,237,0.03)); border-bottom: 1px solid rgba(139,92,246,0.08);">' +
              '<div class="flex items-center gap-3">' +
                '<div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"><i class="fas fa-fingerprint text-white text-sm"></i></div>' +
                '<div><h3 class="text-sm font-bold text-[#E8F5F3]">' + (currentLang === 'zh' ? '\u7EC4\u5408\u56FE\u8C31 v1' : 'Portfolio Radar v1') + '</h3><p class="text-xs text-[#3D7A70]">' + (currentLang === 'zh' ? '8+2\u7EF4\u7EFC\u5408\u8BC4\u4F30 \u00B7 ' + currentPortfolio.projectCount + '\u9879\u76EE/' + contracts.length + '\u5408\u7EA6' : '8+2 Dim Assessment \u00B7 ' + currentPortfolio.projectCount + ' proj/' + contracts.length + ' contracts') + '</p></div>' +
              '</div>' +
              '<div class="flex items-center gap-3">' +
                '<div class="text-right">' +
                  '<p class="text-2xl font-black" style="color:' + grade.color + ';">' + overall + '<span class="text-xs font-medium text-[#3D7A70]">/100</span></p>' +
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
                pv1.contractAxes.map(function(axis, i) {
                  var g = getScoreGrade(axis.effective_value);
                  return '<div class="text-center p-2 rounded-xl" style="background:' + axis.color + '08; border: 1px solid ' + axis.color + '15;">' +
                    '<i class="fas ' + axis.icon + '" style="color:' + axis.color + '; font-size:11px;"></i>' +
                    '<p class="text-xs font-bold mt-1" style="color:' + axis.color + ';">' + axis.effective_value + (currentLang === 'zh' ? '\u5206' : 'pt') + '</p>' +
                    '<p class="text-xs text-[#3D7A70] truncate" style="font-size:9px;">' + getRadarSubLabel(i) + '</p>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          // Concentration axes (2 new)
          '<div class="bg-[#0F2E2B] rounded-2xl p-4 border border-[rgba(139,92,246,0.12)]">' +
            '<h3 class="text-sm font-bold text-[#E8F5F3] mb-3"><i class="fas fa-crosshairs mr-1.5 text-[#7c3aed]"></i>' + (currentLang === 'zh' ? '\u96C6\u4E2D\u5EA6\u8BC4\u4F30' : 'Concentration Assessment') + '</h3>' +
            '<div class="space-y-2">' + concCards + '</div>' +
          '</div>' +
          // 8-dim weighted details
          '<div class="bg-[#0F2E2B] rounded-2xl p-4 border border-[rgba(46,196,182,0.08)]">' +
            '<h3 class="text-sm font-bold text-[#E8F5F3] mb-3"><i class="fas fa-list-ul mr-1.5 text-[#8B5CF6]"></i>' + (currentLang === 'zh' ? '8\u7EF4\u52A0\u6743\u660E\u7EC6 (eff/mean/P10)' : '8-Dim Weighted Detail (eff/mean/P10)') + '</h3>' +
            '<div class="space-y-2">' + dimensionDetails + '</div>' +
          '</div>' +
          // Contract distribution
          '<div class="bg-[#0F2E2B] rounded-2xl p-4 border border-[rgba(46,196,182,0.08)]">' +
            '<h3 class="text-sm font-bold text-[#E8F5F3] mb-3"><i class="fas fa-chart-bar mr-1.5 text-[#2EC4B6]"></i>' + t('pdScoreDist') + '</h3>' +
            '<div class="h-32 flex items-end justify-around gap-1">' +
              contracts.map(function(c, i) {
                var cr = calcContractRadarV1(c); var co = cr.overallScore; var cg = getScoreGrade(co);
                return '<div class="flex flex-col items-center flex-1" title="' + (c.mcn || '') + ' \u2014 ' + co + ' pts">' +
                  '<div class="w-full rounded-t-md cursor-pointer hover:opacity-80 transition-opacity" style="height:' + co + '%; background: linear-gradient(180deg, ' + cg.color + ', ' + cg.color + '88); min-height:8px;" onclick="openDetail(&#39;' + c.id + '&#39;)"></div>' +
                  '<span class="text-xs text-[#3D7A70] mt-1" style="font-size:8px;">#' + (i + 1) + '</span>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>';

      setTimeout(() => {
        drawRadarChart('pdRadarCanvas', scores, { size: 320, displayValues: calcPortfolioDisplayValues(contracts) });
      }, 50);

      switchPage('pagePortfolioDetail');
      pushPageState('pagePortfolioDetail');
    }

    // ==================== AI Portfolio Builder ====================
    // Core Logic: multi-round dialog to gradually understand investor needs, from broad to specific
    // After each round, AI updates the right-panel recommended portfolio in real-time

    let abState = {
      step: 0,  // Dialog step: 0=initial 1=confirmed 2+=adjust
      style: null,       // Investment style
      industries: [],    // Preferred industries
      riskTolerance: null, // low / medium / high
      targetReturn: null,  // Target return
      budget: null,      // Budget (contracts)
      period: null,      // Period preference
      extraPrefs: [],    // Extra preferences (NL)
      portfolio: [],     // Current recommended contracts
      portfolioName: '', // Portfolio name
      pendingConfig: null, // Pending NLP-parsed config awaiting confirmation
    };

    // ===== NLP Parse Engine: Extract multi-dimensional investment parameters from natural language =====
    function abNLPParse(text) {
      const lower = text.toLowerCase();
      const result = { style: null, risk: null, industries: [], period: null, budget: null, returnTarget: null, confidence: 0, reasons: [] };

      // --- Style detection (zh + en) ---
      const stylePatterns = {
        conservative: { zh: ['稳健','保守','安全','低风险','稳定','安稳','稳妥','不要太激进','保本','安心'], en: ['conservative','stable','safe','safety','defensive','protect','low risk','steady'] },
        aggressive: { zh: ['进取','激进','高收益','高回报','冒险','大胆','追高','高风险','暴利','翻倍'], en: ['aggressive','high return','high yield','risky','bold','maximize','growth','high risk'] },
        balanced: { zh: ['均衡','平衡','攻守兼备','中等','适中','不偏不倚','稳中求进'], en: ['balanced','moderate','mixed','diversified','middle ground','blend'] },
        sector: { zh: ['行业','板块','赛道','集中','看好','特定','专注','聚焦'], en: ['sector','industry','focus','concentrated','bullish on','specific'] }
      };

      for (const [style, patterns] of Object.entries(stylePatterns)) {
        const allPatterns = [...patterns.zh, ...patterns.en];
        for (const p of allPatterns) {
          if (lower.includes(p.toLowerCase())) {
            result.style = style;
            result.confidence += 20;
            result.reasons.push(currentLang === 'zh' ? '检测到风格关键词「' + p + '」' : 'Detected style keyword "' + p + '"');
            break;
          }
        }
        if (result.style) break;
      }

      // --- Risk detection ---
      const riskPatterns = {
        low: { zh: ['低风险','风险小','不要风险','少风险','稳当','规避风险','风险低'], en: ['low risk','minimal risk','risk averse','no risk','less risk'] },
        high: { zh: ['高风险','风险大','能承受','能接受风险','不怕风险','愿意冒险','风险高'], en: ['high risk','risk tolerant','can handle risk','willing to risk','take risks'] },
        medium: { zh: ['中等风险','适度风险','风险平衡','风险可控','中风险'], en: ['moderate risk','balanced risk','manageable risk','medium risk'] }
      };

      for (const [risk, patterns] of Object.entries(riskPatterns)) {
        const allPatterns = [...patterns.zh, ...patterns.en];
        for (const p of allPatterns) {
          if (lower.includes(p.toLowerCase())) {
            result.risk = risk;
            result.confidence += 15;
            result.reasons.push(currentLang === 'zh' ? '检测到风险偏好「' + p + '」' : 'Detected risk preference "' + p + '"');
            break;
          }
        }
        if (result.risk) break;
      }

      // --- Return target detection ---
      const returnPatterns = {
        high: { zh: ['高收益','收益够高','收益高','回报高','赚得多','高回报','14','15','20','翻倍'], en: ['high return','high yield','maximize return','high profit','14','15','20'] },
        medium: { zh: ['中等收益','适当收益','10','11','12','13','稳定收益','合理回报'], en: ['moderate return','decent return','10','11','12','13','reasonable return'] },
        low: { zh: ['低收益','保本','7','8','9','稳定就好','少赚没关系'], en: ['low return','preserve capital','7','8','9','steady income'] }
      };

      for (const [ret, patterns] of Object.entries(returnPatterns)) {
        const allPatterns = [...patterns.zh, ...patterns.en];
        for (const p of allPatterns) {
          if (lower.includes(p.toLowerCase())) {
            result.returnTarget = ret;
            result.confidence += 15;
            result.reasons.push(currentLang === 'zh' ? '检测到收益目标「' + p + '」' : 'Detected return target "' + p + '"');
            break;
          }
        }
        if (result.returnTarget) break;
      }

      // --- Industry detection ---
      const industryPatterns = {
        'F&B': { zh: ['餐饮','美食','食品','饮食','饭店','餐厅'], en: ['f&b','food','dining','restaurant','catering'] },
        'Technology': { zh: ['科技','技术','ai','互联网','数字','软件','创新','人工智能'], en: ['tech','technology','ai','digital','software','innovation','it'] },
        'Healthcare': { zh: ['医疗','健康','医药','生物','医院','保健'], en: ['health','medical','healthcare','pharma','biotech'] },
        'Retail': { zh: ['零售','消费','购物','电商','商品','消费品'], en: ['retail','consumer','shopping','ecommerce','goods'] },
        'Education': { zh: ['教育','培训','学习','教学','学校'], en: ['education','training','learning','school','edtech'] },
        'Entertainment': { zh: ['娱乐','演艺','影视','音乐','游戏','文化'], en: ['entertainment','media','music','gaming','culture','film'] }
      };

      for (const [ind, patterns] of Object.entries(industryPatterns)) {
        const allPatterns = [...patterns.zh, ...patterns.en];
        for (const p of allPatterns) {
          if (lower.includes(p.toLowerCase())) {
            if (!result.industries.includes(ind)) {
              result.industries.push(ind);
              result.confidence += 10;
              result.reasons.push(currentLang === 'zh' ? '检测到行业偏好「' + p + '」→ ' + ind : 'Detected sector "' + p + '" → ' + ind);
            }
            break;
          }
        }
      }

      // --- Period detection ---
      const periodPatterns = {
        short: { zh: ['短期','短线','快速','24个月','两年内','1年','一年','半年','几个月'], en: ['short','short-term','quick','24 month','within 2 year','1 year','6 month'] },
        medium: { zh: ['中期','中等期限','两三年','24到30','2-3年'], en: ['medium','medium-term','2-3 year','couple years'] },
        long: { zh: ['长期','长线','30个月','三年','3年以上','长久','持久'], en: ['long','long-term','30 month','3 year','3+ year','long haul'] }
      };

      for (const [period, patterns] of Object.entries(periodPatterns)) {
        const allPatterns = [...patterns.zh, ...patterns.en];
        for (const p of allPatterns) {
          if (lower.includes(p.toLowerCase())) {
            result.period = period;
            result.confidence += 10;
            result.reasons.push(currentLang === 'zh' ? '检测到期限偏好「' + p + '」' : 'Detected horizon "' + p + '"');
            break;
          }
        }
        if (result.period) break;
      }

      // --- Budget detection ---
      const budgetMatch = text.match(/(\d+)\s*[万wWkK千]/);
      if (budgetMatch) {
        const num = parseInt(budgetMatch[0]);
        if (text.includes('万') || text.includes('W') || text.includes('w')) {
          if (num <= 2) result.budget = 10;
          else if (num <= 5) result.budget = 35;
          else result.budget = 60;
        } else if (text.includes('千') || text.includes('k') || text.includes('K')) {
          const wanVal = num / 10;
          if (wanVal <= 2) result.budget = 10;
          else if (wanVal <= 5) result.budget = 35;
          else result.budget = 60;
        }
        result.confidence += 10;
        result.reasons.push(currentLang === 'zh' ? '检测到预算信息' : 'Detected budget info');
      }
      // Also check raw number patterns like 5000, 30000, etc.
      if (!result.budget) {
        const rawNum = text.match(/[¥￥]?\s*(\d{4,})/);
        if (rawNum) {
          const val = parseInt(rawNum[1]);
          if (val <= 20000) result.budget = 10;
          else if (val <= 50000) result.budget = 35;
          else result.budget = 60;
          result.confidence += 10;
          result.reasons.push(currentLang === 'zh' ? '检测到预算金额' : 'Detected budget amount');
        }
      }
      // Budget keyword patterns
      if (!result.budget) {
        if (lower.includes('轻量') || lower.includes('少量') || lower.includes('试试') || lower.includes('small') || lower.includes('light')) {
          result.budget = 10; result.confidence += 5;
        } else if (lower.includes('重仓') || lower.includes('大量') || lower.includes('全力') || lower.includes('heavy') || lower.includes('large') || lower.includes('all in')) {
          result.budget = 60; result.confidence += 5;
        }
      }

      // --- Smart inference: fill gaps from style ---
      if (result.style && !result.risk) {
        if (result.style === 'conservative') result.risk = 'low';
        else if (result.style === 'aggressive') result.risk = 'high';
        else result.risk = 'medium';
        result.reasons.push(currentLang === 'zh' ? '根据风格推断风险偏好' : 'Risk inferred from style');
      }
      if (result.style && !result.returnTarget) {
        if (result.style === 'conservative') result.returnTarget = 'low';
        else if (result.style === 'aggressive') result.returnTarget = 'high';
        else result.returnTarget = 'medium';
        result.reasons.push(currentLang === 'zh' ? '根据风格推断收益目标' : 'Return target inferred from style');
      }
      // If we got risk but no return target
      if (result.risk && !result.returnTarget) {
        result.returnTarget = result.risk;
      }
      // If we got return but no risk
      if (result.returnTarget && !result.risk) {
        result.risk = result.returnTarget;
      }

      return result;
    }

    // ===== Build Confirm Card HTML: show parsed config for user to review/edit =====
    function abBuildConfirmCardHTML(parsed, isAdjust) {
      const styleLabels = { conservative: t('abNlpStyleConservative'), aggressive: t('abNlpStyleAggressive'), balanced: t('abNlpStyleBalanced'), sector: t('abNlpStyleSector') };
      const riskLabels = { low: t('abNlpRiskLow'), medium: t('abNlpRiskMed'), high: t('abNlpRiskHigh') };
      const riskColors = { low: '#10b981', medium: '#3b82f6', high: '#f59e0b' };
      const returnLabels = { low: t('abNlpReturnLow'), medium: t('abNlpReturnMed'), high: t('abNlpReturnHigh') };
      const periodLabels = { short: t('abNlpPeriodShort'), medium: t('abNlpPeriodMed'), long: t('abNlpPeriodLong') };
      const budgetLabels = { 10: t('abNlpBudgetSmall'), 35: t('abNlpBudgetMed'), 60: t('abNlpBudgetLarge') };
      var indNameMap = {'F&B': t('indDining'), 'Technology': t('indTech'), 'Healthcare': t('indHealth'), 'Retail': t('indRetail'), 'Education': t('indEducation'), 'Entertainment': t('indEntertainment'), 'all': t('abNlpAllIndustry')};

      var style = parsed.style || 'balanced';
      var risk = parsed.risk || 'medium';
      var ret = parsed.returnTarget || 'medium';
      var industries = parsed.industries.length > 0 ? parsed.industries : ['all'];
      var period = parsed.period || 'medium';
      var budget = parsed.budget || 35;

      var indDisplay = industries.includes('all') ? t('abNlpAllIndustry') : industries.map(function(v) { return indNameMap[v] || v; }).join(currentLang === 'en' ? ', ' : '、');

      // Build the card
      var introText = isAdjust ? t('abNlpAdjustIntro') : t('abNlpSubtitle');
      var html = '<div class="rounded-xl overflow-hidden" style="border: 1px solid rgba(46,196,182,0.2);">';

      // Header
      html += '<div class="p-3 flex items-center gap-2" style="background: rgba(46,196,182,0.08);">';
      html += '<i class="fas fa-clipboard-check" style="color: #3DD8CA;"></i>';
      html += '<span class="text-sm font-bold" style="color: #E8F5F3;">' + t('abNlpTitle') + '</span>';
      html += '</div>';

      html += '<div class="p-3" style="background: rgba(15,46,43,0.5);">';
      html += '<p class="text-xs mb-3" style="color: #5A9A90;">' + introText + '</p>';

      // Config grid - 6 dimensions
      html += '<div class="grid grid-cols-2 gap-2 mb-3">';

      // Style
      html += '<div class="p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02]" style="background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.15);" onclick="abEditConfigDim(&#39;style&#39;)">';
      html += '<p class="text-xs mb-1" style="color: #5A9A90;"><i class="fas fa-compass mr-1"></i>' + t('abNlpStyle') + '</p>';
      html += '<p class="text-sm font-bold" style="color: #E8F5F3;">' + (styleLabels[style] || style) + '</p></div>';

      // Risk
      html += '<div class="p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02]" style="background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.15);" onclick="abEditConfigDim(&#39;risk&#39;)">';
      html += '<p class="text-xs mb-1" style="color: #5A9A90;"><i class="fas fa-shield-alt mr-1"></i>' + t('abNlpRisk') + '</p>';
      html += '<p class="text-sm font-bold" style="color: ' + (riskColors[risk] || '#E8F5F3') + ';">' + (riskLabels[risk] || risk) + '</p></div>';

      // Return
      html += '<div class="p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02]" style="background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.15);" onclick="abEditConfigDim(&#39;return&#39;)">';
      html += '<p class="text-xs mb-1" style="color: #5A9A90;"><i class="fas fa-chart-line mr-1"></i>' + t('abNlpReturn') + '</p>';
      html += '<p class="text-sm font-bold" style="color: #E8F5F3;">' + (returnLabels[ret] || ret) + '</p></div>';

      // Industry
      html += '<div class="p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02]" style="background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.15);" onclick="abEditConfigDim(&#39;industry&#39;)">';
      html += '<p class="text-xs mb-1" style="color: #5A9A90;"><i class="fas fa-industry mr-1"></i>' + t('abNlpIndustry') + '</p>';
      html += '<p class="text-sm font-bold" style="color: #E8F5F3;">' + indDisplay + '</p></div>';

      // Period
      html += '<div class="p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02]" style="background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.15);" onclick="abEditConfigDim(&#39;period&#39;)">';
      html += '<p class="text-xs mb-1" style="color: #5A9A90;"><i class="fas fa-clock mr-1"></i>' + t('abNlpPeriod') + '</p>';
      html += '<p class="text-sm font-bold" style="color: #E8F5F3;">' + (periodLabels[period] || period) + '</p></div>';

      // Budget
      html += '<div class="p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02]" style="background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.15);" onclick="abEditConfigDim(&#39;budget&#39;)">';
      html += '<p class="text-xs mb-1" style="color: #5A9A90;"><i class="fas fa-wallet mr-1"></i>' + t('abNlpBudget') + '</p>';
      html += '<p class="text-sm font-bold" style="color: #E8F5F3;">' + (budgetLabels[budget] || '¥' + (budget * 1000).toLocaleString()) + '</p></div>';

      html += '</div>'; // end grid

      // Analysis reasons
      if (parsed.reasons && parsed.reasons.length > 0) {
        html += '<div class="p-2 rounded-lg mb-3" style="background: rgba(93,196,179,0.04); border: 1px solid rgba(93,196,179,0.1);">';
        html += '<p class="text-xs font-semibold mb-1" style="color: #3DD8CA;">' + t('abNlpAnalysis') + '</p>';
        parsed.reasons.slice(0, 5).forEach(function(r) {
          html += '<p class="text-xs" style="color: #5A9A90;">· ' + r + '</p>';
        });
        html += '</div>';
      }

      // Selection logic explanation
      html += abBuildFilterLogicHTML(style, risk, ret, industries, period, budget);

      html += '</div>'; // end inner padding
      html += '</div>'; // end card

      return html;
    }

    // ===== Build filter logic explanation HTML =====
    function abBuildFilterLogicHTML(style, risk, ret, industries, period, budget) {
      var totalContracts = totalVirtualContracts || allDeals.length;
      var indNameMap = {'F&B': t('indDining'), 'Technology': t('indTech'), 'Healthcare': t('indHealth'), 'Retail': t('indRetail'), 'Education': t('indEducation'), 'Entertainment': t('indEntertainment'), 'all': t('abNlpAllIndustry')};
      var indDisplay = industries.includes('all') ? t('abNlpAllIndustry') : industries.map(function(v) { return indNameMap[v] || v; }).join(currentLang === 'en' ? ', ' : '、');

      var scoreThreshold = risk === 'low' ? '8.0' : (risk === 'high' ? '6.0' : '7.0');
      var gradeReq = risk === 'low' ? 'A / A+' : (risk === 'high' ? currentLang === 'zh' ? '不限' : 'Any' : 'B+');
      var returnRange = ret === 'low' ? '7-10%' : (ret === 'high' ? '14%+' : '10-14%');
      var periodDesc = period === 'short' ? '≤24' + (currentLang === 'zh' ? '个月' : 'mo') : (period === 'long' ? '≥30' + (currentLang === 'zh' ? '个月' : 'mo') : '24-30' + (currentLang === 'zh' ? '个月' : 'mo'));
      var maxPerProject = Math.max(3, Math.ceil((budget || 25) / 5));

      var html = '<div class="p-2 rounded-lg" style="background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.15);">';
      html += '<p class="text-xs font-semibold mb-2" style="color: #a78bfa;">' + t('abNlpLogicExplain') + '</p>';

      var steps = [
        { label: t('abNlpFilterStep1'), desc: t('abNlpFilterDesc1', {total: totalContracts.toLocaleString(), industry: indDisplay}), icon: 'fa-filter', color: '#06b6d4' },
        { label: t('abNlpFilterStep2'), desc: t('abNlpFilterDesc2', {score: scoreThreshold, grade: gradeReq}), icon: 'fa-shield-alt', color: '#10b981' },
        { label: t('abNlpFilterStep3'), desc: t('abNlpFilterDesc3', {range: returnRange}), icon: 'fa-chart-line', color: '#f59e0b' },
        { label: t('abNlpFilterStep4'), desc: t('abNlpFilterDesc4', {period: periodDesc}), icon: 'fa-clock', color: '#8b5cf6' },
        { label: t('abNlpFilterStep5'), desc: t('abNlpFilterDesc5', {max: maxPerProject}), icon: 'fa-project-diagram', color: '#ec4899' },
      ];

      steps.forEach(function(s) {
        html += '<div class="flex items-start gap-2 mb-1">';
        html += '<i class="fas ' + s.icon + ' mt-0.5" style="color: ' + s.color + '; font-size: 9px; width: 12px;"></i>';
        html += '<div><p class="text-xs font-medium" style="color: rgba(255,255,255,0.7);">' + s.label + '</p>';
        html += '<p class="text-xs" style="color: #5A9A90;">' + s.desc + '</p></div>';
        html += '</div>';
      });

      html += '</div>';
      return html;
    }

    // ===== V3: Auto-build preview — every message triggers a real-time portfolio update =====
    function abAutoBuildPreview(config, options) {
      options = options || {};
      var cfg = config || abState.pendingConfig || {};

      // Apply config to abState (fill defaults for missing dimensions)
      abState.style = cfg.style || abState.style || 'balanced';
      abState.riskTolerance = cfg.risk || abState.riskTolerance || 'medium';
      abState.targetReturn = cfg.returnTarget || abState.targetReturn || 'medium';
      abState.industries = (cfg.industries && cfg.industries.length > 0) ? cfg.industries : (abState.industries.length > 0 ? abState.industries : ['all']);
      abState.period = cfg.period || abState.period || 'medium';
      abState.budget = cfg.budget || abState.budget || 35;
      abState.step = Math.max(abState.step, 5);
      abState.pendingConfig = cfg; // Keep for dim-editing

      // Build portfolio immediately
      abBuildPortfolio();

      // Trigger AI explanation in background (only on first build or significant changes)
      if (!options.skipExplain && abState.portfolio.length > 0) {
        abRequestExplanation();
      }
    }

    // ===== Show confirm card (V3: now shows config summary + immediately builds preview) =====
    function abShowConfirmCard(parsed, isAdjust) {
      var cardHTML = abBuildConfirmCardHTML(parsed, isAdjust);
      abAddAIMessage(
        cardHTML,
        [
          { text: currentLang === 'zh' ? '继续微调' : 'Continue Refining', icon: 'fa-edit', color: 'violet', action: "document.getElementById('abInput').focus();document.getElementById('abInput').placeholder='" + (currentLang === 'zh' ? '告诉我您想调整什么，如「降低风险」「加入科技」...' : 'Tell me what to adjust, e.g. \"lower risk\" \"add tech\"...') + "'" },
        ]
      );
      // V3: Immediately build portfolio preview
      abAutoBuildPreview(parsed, { skipExplain: false });
    }

    // ===== Confirm pending config (V3: kept for backward compat, now just redirects) =====
    function abConfirmConfig() {
      if (!abState.pendingConfig) return;
      abAutoBuildPreview(abState.pendingConfig);
    }

    // ===== One-click Purchase (V3 primary action) =====
    function abOneClickPurchase() {
      if (abState.portfolio.length === 0) { showToast('warning', t('abApplyEmptyTitle'), t('abApplyEmptyMsg')); return; }
      var availableCount = abState.portfolio.filter(function(c) { return c.status === 'available' && !c.isMine; }).length;
      if (availableCount === 0) { showToast('info', currentLang === 'zh' ? '已全部持有' : 'All Held', currentLang === 'zh' ? '该组合中的合约您已全部持有' : 'You already hold all contracts in this portfolio'); return; }
      showConfirm(t('abPurchaseConfirmTitle'), t('abPurchaseConfirmMsg') + ' (' + availableCount + (currentLang === 'zh' ? ' 张合约, ¥' : ' contracts, ¥') + (availableCount * 1000).toLocaleString() + ')', function() {
        abApplyPortfolio();
      });
    }

    // ===== Request AI explanation for the built portfolio =====
    function abRequestExplanation() {
      var summary = abGetPortfolioSummary();
      if (!summary) return;

      var userConfig = {
        style: abState.style,
        risk: abState.riskTolerance,
        returnTarget: abState.targetReturn,
        industries: abState.industries,
        period: abState.period,
        budget: abState.budget
      };

      fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioSummary: summary,
          userConfig: userConfig,
          lang: currentLang
        })
      })
      .then(function(res) { return res.json(); })
      .then(function(result) {
        if (result.success && result.data) {
          // Store the explanation and show it
          abConversationHistory.push({ role: 'assistant', content: JSON.stringify(result.data) });
          abHandleExplain(result.data);
        }
      })
      .catch(function(err) {
        console.warn('AI explain error:', err);
        // Silently fail — the portfolio is already built
      });
    }

    // ===== Edit a specific config dimension =====
    function abEditConfigDim(dim) {
      var cfg = abState.pendingConfig || { style: abState.style, risk: abState.riskTolerance, returnTarget: abState.targetReturn, industries: [...abState.industries], period: abState.period, budget: abState.budget, reasons: [], confidence: 50 };
      var options = [];

      if (dim === 'style') {
        options = [
          { text: t('abNlpStyleConservative'), icon: 'fa-shield-alt', color: 'emerald', action: "abSetConfigDim('style','conservative')" },
          { text: t('abNlpStyleAggressive'), icon: 'fa-rocket', color: 'amber', action: "abSetConfigDim('style','aggressive')" },
          { text: t('abNlpStyleBalanced'), icon: 'fa-balance-scale', color: 'blue', action: "abSetConfigDim('style','balanced')" },
          { text: t('abNlpStyleSector'), icon: 'fa-bullseye', color: 'pink', action: "abSetConfigDim('style','sector')" },
        ];
      } else if (dim === 'risk') {
        options = [
          { text: t('abNlpRiskLow'), icon: 'fa-shield-alt', color: 'emerald', action: "abSetConfigDim('risk','low')" },
          { text: t('abNlpRiskMed'), icon: 'fa-balance-scale', color: 'blue', action: "abSetConfigDim('risk','medium')" },
          { text: t('abNlpRiskHigh'), icon: 'fa-fire-alt', color: 'amber', action: "abSetConfigDim('risk','high')" },
        ];
      } else if (dim === 'return') {
        options = [
          { text: t('abNlpReturnLow'), icon: 'fa-seedling', color: 'emerald', action: "abSetConfigDim('returnTarget','low')" },
          { text: t('abNlpReturnMed'), icon: 'fa-chart-bar', color: 'blue', action: "abSetConfigDim('returnTarget','medium')" },
          { text: t('abNlpReturnHigh'), icon: 'fa-chart-line', color: 'amber', action: "abSetConfigDim('returnTarget','high')" },
        ];
      } else if (dim === 'industry') {
        options = [
          { text: t('abIndDining'), icon: 'fa-utensils', color: 'amber', action: "abToggleConfigIndustry('F&B')" },
          { text: t('abIndTech'), icon: 'fa-microchip', color: 'violet', action: "abToggleConfigIndustry('Technology')" },
          { text: t('abIndHealth'), icon: 'fa-heartbeat', color: 'red', action: "abToggleConfigIndustry('Healthcare')" },
          { text: t('abIndRetail'), icon: 'fa-shopping-bag', color: 'cyan', action: "abToggleConfigIndustry('Retail')" },
          { text: t('abIndEdu'), icon: 'fa-graduation-cap', color: 'emerald', action: "abToggleConfigIndustry('Education')" },
          { text: t('abIndEnter'), icon: 'fa-music', color: 'pink', action: "abToggleConfigIndustry('Entertainment')" },
          { text: t('abIndAll'), icon: 'fa-globe', color: 'gray', action: "abSetConfigDim('industries',['all'])" },
        ];
      } else if (dim === 'period') {
        options = [
          { text: t('abNlpPeriodShort'), icon: 'fa-bolt', color: 'yellow', action: "abSetConfigDim('period','short')" },
          { text: t('abNlpPeriodMed'), icon: 'fa-clock', color: 'cyan', action: "abSetConfigDim('period','medium')" },
          { text: t('abNlpPeriodLong'), icon: 'fa-hourglass-half', color: 'violet', action: "abSetConfigDim('period','long')" },
        ];
      } else if (dim === 'budget') {
        options = [
          { text: t('abNlpBudgetSmall'), icon: 'fa-seedling', color: 'emerald', action: "abSetConfigDim('budget',10)" },
          { text: t('abNlpBudgetMed'), icon: 'fa-tree', color: 'cyan', action: "abSetConfigDim('budget',35)" },
          { text: t('abNlpBudgetLarge'), icon: 'fa-landmark', color: 'violet', action: "abSetConfigDim('budget',60)" },
        ];
      }

      var dimNames = { style: t('abNlpStyle'), risk: t('abNlpRisk'), 'return': t('abNlpReturn'), industry: t('abNlpIndustry'), period: t('abNlpPeriod'), budget: t('abNlpBudget') };
      abAddAIMessage(
        '<p class="text-sm leading-relaxed" style="color: #8EBDB5;">' + (currentLang === 'zh' ? '请选择新的' : 'Select new ') + '<span class="font-bold text-[#2EC4B6]">' + (dimNames[dim] || dim) + '</span>：</p>',
        options
      );
    }

    // ===== Set a config dimension value and auto-rebuild (V3: no confirm card, direct rebuild) =====
    function abSetConfigDim(key, value) {
      if (!abState.pendingConfig) {
        abState.pendingConfig = { style: abState.style || 'balanced', risk: abState.riskTolerance || 'medium', returnTarget: abState.targetReturn || 'medium', industries: abState.industries.length > 0 ? [...abState.industries] : ['all'], period: abState.period || 'medium', budget: abState.budget || 35, reasons: [], confidence: 50 };
      }
      if (key === 'industries') {
        abState.pendingConfig.industries = Array.isArray(value) ? value : [value];
      } else {
        abState.pendingConfig[key] = value;
      }
      // Show label for user
      var displayVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
      abAddUserMessage(currentLang === 'zh' ? '修改为: ' + displayVal : 'Changed to: ' + displayVal);
      // V3: Auto-rebuild preview instead of showing confirm card
      abAutoBuildPreview(abState.pendingConfig, { skipExplain: true });
      showToast('info', t('abLivePreview'), t('abPreviewUpdated'));
    }

    // ===== Toggle an industry in pending config (V3: auto-rebuild) =====
    function abToggleConfigIndustry(ind) {
      if (!abState.pendingConfig) {
        abState.pendingConfig = { style: abState.style || 'balanced', risk: abState.riskTolerance || 'medium', returnTarget: abState.targetReturn || 'medium', industries: abState.industries.length > 0 ? [...abState.industries] : ['all'], period: abState.period || 'medium', budget: abState.budget || 35, reasons: [], confidence: 50 };
      }
      var inds = abState.pendingConfig.industries.filter(function(i) { return i !== 'all'; });
      if (inds.includes(ind)) {
        inds = inds.filter(function(i) { return i !== ind; });
      } else {
        inds.push(ind);
      }
      if (inds.length === 0) inds = ['all'];
      abState.pendingConfig.industries = inds;
      var indNameMap = {'F&B': t('indDining'), 'Technology': t('indTech'), 'Healthcare': t('indHealth'), 'Retail': t('indRetail'), 'Education': t('indEducation'), 'Entertainment': t('indEntertainment')};
      var displayNames = inds.map(function(v) { return indNameMap[v] || v; });
      abAddUserMessage(currentLang === 'zh' ? '行业选择: ' + displayNames.join('、') : 'Sectors: ' + displayNames.join(', '));
      // V3: Auto-rebuild preview instead of showing confirm card
      abAutoBuildPreview(abState.pendingConfig, { skipExplain: true });
      showToast('info', t('abLivePreview'), t('abPreviewUpdated'));
    }

    // Conversation flow steps (kept for backward compat with quick-select buttons)
    function getABFlow() { return [
      { question: t('abIndustryQ'), options: [
          { text: t('abIndDining'), icon: 'fa-utensils', color: '#f59e0b', value: 'F&B' },
          { text: t('abIndTech'), icon: 'fa-microchip', color: '#8b5cf6', value: 'Technology' },
          { text: t('abIndHealth'), icon: 'fa-heartbeat', color: '#ef4444', value: 'Healthcare' },
          { text: t('abIndRetail'), icon: 'fa-shopping-bag', color: '#06b6d4', value: 'Retail' },
          { text: t('abIndEdu'), icon: 'fa-graduation-cap', color: '#10b981', value: 'Education' },
          { text: t('abIndEnter'), icon: 'fa-music', color: '#ec4899', value: 'Entertainment' },
          { text: t('abIndAll'), icon: 'fa-globe', color: '#3D7A70', value: 'all' },
      ]},
      { question: t('abRiskQ'), options: [
          { text: t('abStep2LowD'), icon: 'fa-shield-alt', color: '#10b981', value: 'low' },
          { text: t('abStep2MidD'), icon: 'fa-balance-scale', color: '#3b82f6', value: 'medium' },
          { text: t('abStep2HighD'), icon: 'fa-fire-alt', color: '#f59e0b', value: 'high' },
      ]},
      { question: t('abPeriodQ'), options: [
          { text: t('abStep3ShortD'), icon: 'fa-bolt', color: '#eab308', value: 'short' },
          { text: t('abStep3MidD'), icon: 'fa-clock', color: '#06b6d4', value: 'medium' },
          { text: t('abStep3LongD'), icon: 'fa-hourglass-half', color: '#8b5cf6', value: 'long' },
      ]},
      { question: t('abBudgetQ'), options: [
          { text: t('abStep4SmallD'), icon: 'fa-seedling', color: '#10b981', value: '10' },
          { text: t('abStep4MidD'), icon: 'fa-tree', color: '#06b6d4', value: '35' },
          { text: t('abStep4LargeD'), icon: 'fa-landmark', color: '#8b5cf6', value: '60' },
      ]}
    ]; }

    function dismissAIHint() {
      var hint = document.getElementById('aiEntryHint');
      if (hint) {
        hint.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        hint.style.opacity = '0';
        hint.style.transform = 'translateX(-50%) translateY(8px)';
        setTimeout(function() { hint.remove(); }, 300);
        // Adjust wrapper margin
        var wrapper = document.getElementById('aiEntryWrapper');
        if (wrapper) { wrapper.style.transition = 'margin-bottom 0.4s ease'; wrapper.style.marginBottom = '20px'; }
      }
    }

    // ===== Spotlight Effect =====
    var _spotlightShown = false;

    function showSpotlight() {
      if (_spotlightShown) return;
      _spotlightShown = true;
      // Mark dashboard to elevate AI card z-index
      var dashboard = document.getElementById('pageDashboard');
      if (dashboard) dashboard.classList.add('spotlight-active');
      // Activate overlay
      var overlay = document.getElementById('spotlightOverlay');
      if (overlay) overlay.classList.add('active');
      // Show top hint label
      var label = document.getElementById('spotlightLabel');
      if (label) setTimeout(function() { label.classList.add('active'); }, 100);
      // Show bottom dismiss hint
      var dismiss = document.getElementById('spotlightDismissHint');
      if (dismiss) setTimeout(function() { dismiss.classList.add('active'); }, 100);
      // Auto-close after 10s (if user hasn't dismissed)
      setTimeout(function() { dismissSpotlight(); }, 10000);
    }

    function dismissSpotlight() {
      var overlay = document.getElementById('spotlightOverlay');
      var label = document.getElementById('spotlightLabel');
      var dismiss = document.getElementById('spotlightDismissHint');
      var dashboard = document.getElementById('pageDashboard');
      if (overlay) { overlay.classList.remove('active'); }
      if (label) { label.classList.remove('active'); }
      if (dismiss) { dismiss.classList.remove('active'); }
      // Delay class removal for transition animation
      setTimeout(function() {
        if (dashboard) dashboard.classList.remove('spotlight-active');
      }, 500);
    }

    function goToAIBuilder() {
      if (allDeals.length === 0) {
        // Ensure sieves are initialized
        if (mySieves.length === 0) initMySieves();
        loadDemoData();
        // Only set dealsList, don't render dashboard (avoid null reference)
        var models = getActiveSieveModels();
        var sieve = models['all'];
        if (sieve) dealsList = sieve.filter(allDeals);
        else dealsList = allDeals.map(function(d) { return Object.assign({}, d, { matchScore: null, sieveResult: 'all' }); });
        currentSieve = 'all';
      }
      var el = document.getElementById('abTotalContracts');
      if (el) el.textContent = (totalVirtualContracts || allDeals.length).toLocaleString();
      switchPage('pageAIBuilder');
      pushPageState('pageAIBuilder');
    }

    function resetAIBuilder() {
      abState = { step: 0, style: null, industries: [], riskTolerance: null, targetReturn: null, budget: null, period: null, extraPrefs: [], portfolio: [], portfolioName: '', pendingConfig: null };
      abSelectedIndustries = [];
      abConversationHistory = [];
      // Reset UI
      var msgs = document.getElementById('abMessages');
      if (msgs) msgs.innerHTML = '';
      var waitEl = document.getElementById('abWaitingState');
      if (waitEl) waitEl.classList.remove('hidden');
      var panelEl = document.getElementById('abPortfolioPanel');
      if (panelEl) panelEl.classList.add('hidden');
      // Regenerate welcome message with enhanced AI-first approach
      abAddAIMessage(
        '<p class="text-sm text-[#E8F5F3] leading-relaxed mb-3">' + t('abNlpWelcome1') + '</p>' +
        '<p class="text-sm leading-relaxed mb-3" style="color: #5A9A90;">' + t('abNlpWelcome2') + '</p>' +
        '<div class="p-3 rounded-xl mb-3" style="background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.15);">' +
          '<p class="text-xs font-semibold mb-2" style="color: #3DD8CA;">' + t('abNlpWelcome3') + '</p>' +
          '<p class="text-xs" style="color: #5A9A90;">' + t('abNlpWelcomeEx1') + '</p>' +
          '<p class="text-xs" style="color: #5A9A90;">' + t('abNlpWelcomeEx2') + '</p>' +
          '<p class="text-xs" style="color: #5A9A90;">' + t('abNlpWelcomeEx3') + '</p>' +
        '</div>' +
        '<p class="text-xs leading-relaxed" style="color: #5A9A90;">' + t('abNlpWelcomeHint') + '</p>',
        [
          { text: t('abResetOpt1'), icon: 'fa-shield-alt', color: 'emerald', action: "abSelectOption('" + t('abResetOpt1') + "')" },
          { text: t('abResetOpt2'), icon: 'fa-rocket', color: 'amber', action: "abSelectOption('" + t('abResetOpt2') + "')" },
          { text: t('abResetOpt3'), icon: 'fa-balance-scale', color: 'blue', action: "abSelectOption('" + t('abResetOpt3') + "')" },
          { text: t('abResetOpt4'), icon: 'fa-bullseye', color: 'pink', action: "abSelectOption('" + t('abResetOpt4') + "')" },
        ]
      );
      showToast('info', t('abResetDone'), t('abResetDoneMsg'));
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

      // Typing animation
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
            optHTML += '<button onclick="' + (opt.action || '') + '" class="ab-quick-btn"><i class="fas ' + opt.icon + ' mr-1.5 text-' + opt.color + '-500"></i>' + opt.text + '</button>';
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

    // ===== Conversation history for AI context =====
    let abConversationHistory = [];

    // ===== Helper: get platform stats for AI context =====
    function abGetPlatformStats() {
      return {
        totalContracts: totalVirtualContracts || allDeals.length,
        totalProjects: [...new Set(allDeals.map(d => d.projectId))].length,
        industries: [...new Set(allDeals.map(d => d.industry))],
        avgAIScore: allDeals.length > 0 ? (allDeals.reduce((s,d) => s + parseFloat(d.aiScore || 0), 0) / allDeals.length).toFixed(1) : 'N/A',
        avgRevenueShare: allDeals.length > 0 ? (allDeals.reduce((s,d) => s + parseInt(d.revenueShare || 0), 0) / allDeals.length).toFixed(1) + '%' : 'N/A',
      };
    }

    // ===== Helper: get portfolio summary for AI context =====
    function abGetPortfolioSummary() {
      var p = abState.portfolio;
      if (!p || p.length === 0) return null;
      var projects = [...new Set(p.map(c => c.projectId))];
      var industries = [...new Set(p.map(c => c.industry))];
      var avgScore = (p.reduce((s,c) => s + parseFloat(c.aiScore || 0), 0) / p.length).toFixed(1);
      var avgReturn = (p.reduce((s,c) => s + parseInt(c.revenueShare || 0), 0) / p.length).toFixed(1);
      var riskGrades = {};
      p.forEach(c => { riskGrades[c.riskGrade] = (riskGrades[c.riskGrade]||0) + 1; });
      return {
        contractCount: p.length,
        projectCount: projects.length,
        industries: industries,
        avgAIScore: avgScore,
        avgReturnShare: avgReturn + '%',
        totalValue: '¥' + (p.length * 1000).toLocaleString(),
        riskDistribution: riskGrades,
        topProjects: projects.slice(0, 5).map(pid => {
          var deals = p.filter(c => c.projectId === pid);
          return { id: pid, name: deals[0]?.projectName || pid, count: deals.length, industry: deals[0]?.industry };
        })
      };
    }

    // ===== Streaming text renderer =====
    function abStreamText(targetEl, text, onComplete) {
      var i = 0;
      var speed = 20; // ms per character
      targetEl.textContent = '';
      function tick() {
        if (i < text.length) {
          // Add 2-4 chars at a time for natural feel
          var chunk = text.substring(i, i + Math.floor(Math.random() * 3) + 2);
          targetEl.textContent += chunk;
          i += chunk.length;
          // Scroll parent messages container
          var msgs = document.getElementById('abMessages');
          if (msgs) msgs.scrollTop = msgs.scrollHeight;
          setTimeout(tick, speed + Math.random() * 15);
        } else {
          targetEl.textContent = text; // ensure complete
          if (onComplete) onComplete();
        }
      }
      tick();
    }

    // ===== NEW: AI-powered + NLP fallback input processing =====
    function abProcessUserInput(text) {
      var isAdjust = abState.step >= 5;

      // Add to conversation history
      abConversationHistory.push({ role: 'user', content: text });

      // Show typing indicator immediately
      var msgs = document.getElementById('abMessages');
      var typingEl = document.createElement('div');
      typingEl.className = 'ab-msg-ai';
      typingEl.id = 'abTypingIndicator';
      typingEl.innerHTML = '<div class="ab-avatar"><i class="fas fa-robot"></i></div><div class="ab-content"><div class="ab-typing"><span></span><span></span><span></span></div><p class="text-xs mt-1" style="color: #5A9A90;">' + t('abAiThinking') + '</p></div>';
      if (msgs) { msgs.appendChild(typingEl); msgs.scrollTop = msgs.scrollHeight; }

      // Build current config for context
      var currentConfig = null;
      if (isAdjust) {
        currentConfig = {
          style: abState.style,
          risk: abState.riskTolerance,
          returnTarget: abState.targetReturn,
          industries: abState.industries,
          period: abState.period,
          budget: abState.budget
        };
      }

      // Determine mode
      var mode = isAdjust ? 'adjust' : 'analyze';

      // Call AI API with full context
      fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: abConversationHistory.slice(-12),
          currentConfig: currentConfig,
          lang: currentLang,
          mode: mode,
          platformStats: abGetPlatformStats(),
          portfolioSummary: isAdjust ? abGetPortfolioSummary() : null
        })
      })
      .then(function(res) { return res.json(); })
      .then(function(result) {
        // Remove typing indicator
        var typing = document.getElementById('abTypingIndicator');
        if (typing) typing.remove();

        if (result.success && result.data) {
          var aiData = result.data;
          var responseMode = aiData.mode || 'analyze';

          // Add to conversation history
          abConversationHistory.push({ role: 'assistant', content: JSON.stringify(aiData) });

          // Route to appropriate handler based on AI response mode
          if (responseMode === 'followup') {
            abHandleFollowup(aiData);
          } else if (responseMode === 'explain') {
            abHandleExplain(aiData);
          } else {
            // analyze or adjust mode
            abHandleAnalyze(aiData, isAdjust);
          }
        } else {
          // AI API failed — fallback to local NLP
          console.warn('AI API failed, falling back to local NLP:', result.error);
          abProcessUserInputLocal(text);
        }
      })
      .catch(function(err) {
        // Network error — fallback to local NLP
        console.warn('AI API network error, falling back to local NLP:', err);
        var typing = document.getElementById('abTypingIndicator');
        if (typing) typing.remove();
        abProcessUserInputLocal(text);
      });
    }

    // ===== Handle AI "followup" mode — AI wants to ask more questions (V3: also builds preview) =====
    function abHandleFollowup(aiData) {
      var partialConfig = aiData.partialConfig || {};
      var questions = aiData.questions || [];
      var missingDims = aiData.missingDims || [];
      var analysis = aiData.analysis || t('abAiFollowupIntro');

      // Build the followup card HTML
      var html = '';

      // AI analysis text (streamed in)
      html += '<div class="mb-3">';
      html += '<p class="text-sm leading-relaxed ab-stream-text" style="color: #8EBDB5;">' + analysis + '</p>';
      html += '</div>';

      // Show identified partial config as mini-card
      var hasPartial = partialConfig.style || partialConfig.risk || partialConfig.returnTarget || 
                       (partialConfig.industries && partialConfig.industries.length > 0 && !partialConfig.industries.includes('all'));
      if (hasPartial) {
        html += '<div class="p-2 rounded-lg mb-3" style="background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.15);">';
        html += '<p class="text-xs font-semibold mb-1.5" style="color: #34d399;"><i class="fas fa-check-circle mr-1"></i>' + t('abAiPartialConfig') + '</p>';
        html += '<div class="flex flex-wrap gap-1.5">';
        var indNameMap = {'F&B': t('indDining'), 'Technology': t('indTech'), 'Healthcare': t('indHealth'), 'Retail': t('indRetail'), 'Education': t('indEducation'), 'Entertainment': t('indEntertainment')};
        var styleLabels = { conservative: t('abNlpStyleConservative'), aggressive: t('abNlpStyleAggressive'), balanced: t('abNlpStyleBalanced'), sector: t('abNlpStyleSector') };
        var riskLabels = { low: t('abNlpRiskLow'), medium: t('abNlpRiskMed'), high: t('abNlpRiskHigh') };
        if (partialConfig.style) html += '<span class="px-2 py-0.5 rounded text-xs" style="background:rgba(93,196,179,0.15);color:#3DD8CA;">' + (styleLabels[partialConfig.style] || partialConfig.style) + '</span>';
        if (partialConfig.risk) html += '<span class="px-2 py-0.5 rounded text-xs" style="background:rgba(93,196,179,0.15);color:#3DD8CA;">' + (riskLabels[partialConfig.risk] || partialConfig.risk) + '</span>';
        if (partialConfig.industries && partialConfig.industries.length > 0 && !partialConfig.industries.includes('all')) {
          partialConfig.industries.forEach(function(ind) {
            html += '<span class="px-2 py-0.5 rounded text-xs" style="background:rgba(93,196,179,0.15);color:#3DD8CA;">' + (indNameMap[ind] || ind) + '</span>';
          });
        }
        html += '</div></div>';
      }

      // Show missing dimensions hint
      if (missingDims.length > 0) {
        html += '<div class="p-2 rounded-lg mb-3" style="background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.15);">';
        html += '<p class="text-xs font-semibold mb-1.5" style="color: #fbbf24;"><i class="fas fa-exclamation-triangle mr-1"></i>' + t('abAiMissingHint') + '</p>';
        html += '<div class="flex flex-wrap gap-1.5">';
        var dimNames = { risk: t('abNlpRisk'), period: t('abNlpPeriod'), budget: t('abNlpBudget'), returnTarget: t('abNlpReturn'), style: t('abNlpStyle'), industries: t('abNlpIndustry') };
        missingDims.forEach(function(dim) {
          html += '<span class="px-2 py-0.5 rounded text-xs cursor-pointer hover:opacity-80" style="background:rgba(245,158,11,0.15);color:#fbbf24;" onclick="abEditConfigDim(&#39;' + (dim === 'returnTarget' ? 'return' : dim) + '&#39;)">' + (dimNames[dim] || dim) + ' <i class="fas fa-edit" style="font-size:9px;"></i></span>';
        });
        html += '</div></div>';
      }

      // Show questions from AI
      if (questions.length > 0) {
        html += '<div class="p-3 rounded-xl" style="background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.15);">';
        html += '<p class="text-xs font-semibold mb-2" style="color: #a78bfa;"><i class="fas fa-question-circle mr-1"></i>' + t('abAiFollowupQ') + '</p>';
        questions.forEach(function(q, idx) {
          html += '<p class="text-xs mb-1.5" style="color: #8EBDB5;">' + (idx + 1) + '. ' + q + '</p>';
        });
        html += '</div>';
      }

      // Store partial config so manual dim edits can fill it in
      var previewConfig = {
        style: partialConfig.style || null,
        risk: partialConfig.risk || null,
        returnTarget: partialConfig.returnTarget || null,
        industries: (partialConfig.industries && partialConfig.industries.length > 0) ? partialConfig.industries : ['all'],
        period: partialConfig.period || null,
        budget: partialConfig.budget || null,
        confidence: aiData.confidence || 40,
        reasons: [],
        aiAnalysis: analysis,
      };
      abState.pendingConfig = previewConfig;
      abState.step = Math.max(abState.step, 1);

      abAddAIMessage(
        html,
        [
          { text: currentLang === 'zh' ? '继续补充' : 'Tell More', icon: 'fa-comment-dots', color: 'violet', action: "document.getElementById('abInput').focus();document.getElementById('abInput').placeholder='" + (currentLang === 'zh' ? '继续描述您的投资需求...' : 'Continue describing your needs...') + "'" },
        ]
      );

      // V3: Auto-build preview with defaults for missing dims
      var previewCfg = {
        style: previewConfig.style || 'balanced',
        risk: previewConfig.risk || 'medium',
        returnTarget: previewConfig.returnTarget || 'medium',
        industries: previewConfig.industries,
        period: previewConfig.period || 'medium',
        budget: previewConfig.budget || 35,
      };
      abAutoBuildPreview(previewCfg, { skipExplain: true });
    }

    // ===== Force confirm partial config (V3: fill defaults and auto-build) =====
    function abForceConfirmPartial() {
      if (!abState.pendingConfig) return;
      var cfg = abState.pendingConfig;
      // Fill defaults for missing dimensions
      cfg.style = cfg.style || 'balanced';
      cfg.risk = cfg.risk || 'medium';
      cfg.returnTarget = cfg.returnTarget || cfg.risk || 'medium';
      cfg.period = cfg.period || 'medium';
      cfg.budget = cfg.budget || 35;
      if (!cfg.industries || cfg.industries.length === 0) cfg.industries = ['all'];
      cfg.confidence = Math.max(cfg.confidence || 50, 50);

      // V3: Auto-build directly
      abAutoBuildPreview(cfg, { skipExplain: false });
    }

    // ===== Handle AI "analyze" / "adjust" mode (V3: auto-build preview, no confirm gate) =====
    function abHandleAnalyze(aiData, isAdjust) {
      var config = aiData.config || {};

      // Build parsed object compatible with confirm card
      var parsed = {
        style: config.style || 'balanced',
        risk: config.risk || 'medium',
        returnTarget: config.returnTarget || 'medium',
        industries: config.industries || ['all'],
        period: config.period || 'medium',
        budget: config.budget || 35,
        confidence: aiData.confidence || 70,
        reasons: aiData.logic || [],
        aiAnalysis: aiData.analysis || '',
        followUp: aiData.followUp || ''
      };

      // Store pending config
      abState.pendingConfig = parsed;
      abState.step = Math.max(abState.step, 1);
      if (isAdjust) abState.extraPrefs.push('adjust');

      // V3: Show config summary + auto-build portfolio immediately
      abShowAIConfirmCard(parsed, isAdjust);
    }

    // ===== Handle AI "explain" mode — portfolio explanation =====
    function abHandleExplain(aiData) {
      var html = '';

      // Title
      html += '<p class="text-sm font-bold mb-2" style="color: #E8F5F3;"><i class="fas fa-chart-pie mr-1.5" style="color:#8B5CF6;"></i>' + t('abAiExplainTitle') + '</p>';

      // Analysis
      if (aiData.analysis) {
        html += '<p class="text-sm leading-relaxed mb-3 ab-stream-text" style="color: #8EBDB5;">' + aiData.analysis + '</p>';
      }

      // Highlights
      if (aiData.highlights && aiData.highlights.length > 0) {
        html += '<div class="p-2 rounded-lg mb-2" style="background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.15);">';
        html += '<p class="text-xs font-semibold mb-1.5" style="color: #34d399;">' + t('abAiHighlights') + '</p>';
        aiData.highlights.forEach(function(h) {
          html += '<p class="text-xs mb-1" style="color: #8EBDB5;">• ' + h + '</p>';
        });
        html += '</div>';
      }

      // Risks
      if (aiData.risks && aiData.risks.length > 0) {
        html += '<div class="p-2 rounded-lg mb-2" style="background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15);">';
        html += '<p class="text-xs font-semibold mb-1.5" style="color: #f87171;">' + t('abAiRisks') + '</p>';
        aiData.risks.forEach(function(r) {
          html += '<p class="text-xs mb-1" style="color: #8EBDB5;">• ' + r + '</p>';
        });
        html += '</div>';
      }

      // Suggestion
      if (aiData.suggestion) {
        html += '<div class="p-2 rounded-lg" style="background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.15);">';
        html += '<p class="text-xs font-semibold mb-1" style="color: #fbbf24;">' + t('abAiSuggestion') + '</p>';
        html += '<p class="text-xs" style="color: #8EBDB5;">' + aiData.suggestion + '</p>';
        html += '</div>';
      }

      abAddAIMessage(
        html,
        [
          { text: currentLang === 'zh' ? '继续微调' : 'Keep Refining', icon: 'fa-edit', color: 'violet', action: "document.getElementById('abInput').focus()" },
          { text: t('abReduceRisk'), icon: 'fa-shield-alt', color: 'blue', action: "abSelectOption('" + t('abReduceRisk') + "')" },
          { text: t('abAddTech'), icon: 'fa-microchip', color: 'cyan', action: "abSelectOption('" + t('abAddTech') + "')" },
        ]
      );
    }

    // ===== Show AI-enhanced confirm card with analysis (V3: auto-build, no confirm button) =====
    function abShowAIConfirmCard(parsed, isAdjust) {
      // Build the card HTML with AI analysis
      var cardHTML = '';

      // AI natural language analysis (with streaming effect)
      if (parsed.aiAnalysis) {
        cardHTML += '<div class="p-3 rounded-xl mb-3" style="background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.15);">';
        cardHTML += '<p class="text-xs font-semibold mb-1.5" style="color: #3DD8CA;"><i class="fas fa-brain mr-1"></i>' + (currentLang === 'zh' ? 'AI 分析' : 'AI Analysis') + '</p>';
        cardHTML += '<p class="text-sm leading-relaxed ab-stream-text" style="color: #8EBDB5;">' + parsed.aiAnalysis + '</p>';
        cardHTML += '</div>';
      }

      // Confidence indicator
      if (parsed.confidence) {
        var confColor = parsed.confidence >= 80 ? '#10b981' : (parsed.confidence >= 60 ? '#f59e0b' : '#ef4444');
        var confLabel = parsed.confidence >= 80 ? (currentLang === 'zh' ? '高置信度' : 'High confidence') : (parsed.confidence >= 60 ? (currentLang === 'zh' ? '中置信度' : 'Medium confidence') : (currentLang === 'zh' ? '低置信度' : 'Low confidence'));
        cardHTML += '<div class="flex items-center gap-2 mb-3">';
        cardHTML += '<div class="flex-1 h-1.5 rounded-full" style="background:rgba(46,196,182,0.1);"><div class="h-full rounded-full" style="width:' + parsed.confidence + '%; background:' + confColor + ';"></div></div>';
        cardHTML += '<span class="text-xs font-bold" style="color:' + confColor + ';">' + confLabel + ' ' + parsed.confidence + '%</span>';
        cardHTML += '</div>';
      }

      // Confirm card (reuse existing function)
      cardHTML += abBuildConfirmCardHTML(parsed, isAdjust);

      // Follow-up question from AI
      if (parsed.followUp) {
        cardHTML += '<div class="p-2 rounded-lg mt-3" style="background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.15);">';
        cardHTML += '<p class="text-xs" style="color: #fbbf24;"><i class="fas fa-lightbulb mr-1"></i>' + parsed.followUp + '</p>';
        cardHTML += '</div>';
      }

      // V3: Live preview tag
      cardHTML += '<div class="flex items-center gap-2 mt-3 p-2 rounded-lg" style="background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.15);">';
      cardHTML += '<div class="w-2 h-2 rounded-full" style="background:#10b981; animation: pulse 2s infinite;"></div>';
      cardHTML += '<p class="text-xs" style="color: #34d399;"><i class="fas fa-sync-alt mr-1"></i>' + (currentLang === 'zh' ? '右侧组合已实时更新 → 满意后点击「确认认购」' : 'Portfolio preview updated → Click "Confirm & Subscribe" when ready') + '</p>';
      cardHTML += '</div>';

      abAddAIMessage(
        cardHTML,
        [
          { text: currentLang === 'zh' ? '继续微调' : 'Keep Refining', icon: 'fa-edit', color: 'violet', action: "document.getElementById('abInput').focus();document.getElementById('abInput').placeholder='" + (currentLang === 'zh' ? '告诉我您想修改什么...' : 'Tell me what to change...') + "'" },
          { text: currentLang === 'zh' ? '降低风险' : 'Lower Risk', icon: 'fa-shield-alt', color: 'blue', action: "abSelectOption('" + t('abReduceRisk') + "')" },
          { text: currentLang === 'zh' ? '加入科技' : 'Add Tech', icon: 'fa-microchip', color: 'cyan', action: "abSelectOption('" + t('abAddTech') + "')" },
        ]
      );

      // V3: Auto-build portfolio immediately
      abAutoBuildPreview(parsed, { skipExplain: false });
    }

    // ===== Local NLP fallback (when AI API is unavailable) =====
    function abProcessUserInputLocal(text) {
      var parsed = abNLPParse(text);
      var isAdjust = abState.step >= 5;

      if (isAdjust) {
        if (!parsed.style && abState.style) parsed.style = abState.style;
        if (!parsed.risk && abState.riskTolerance) parsed.risk = abState.riskTolerance;
        if (!parsed.returnTarget && abState.targetReturn) parsed.returnTarget = abState.targetReturn;
        if (parsed.industries.length === 0 && abState.industries.length > 0) parsed.industries = [...abState.industries];
        if (!parsed.period && abState.period) parsed.period = abState.period;
        if (!parsed.budget && abState.budget) parsed.budget = abState.budget;

        var lower = text.toLowerCase();
        if ((lower.includes('减少') || lower.includes('去掉') || lower.includes('remove') || lower.includes('reduce')) && (lower.includes('餐饮') || lower.includes('f&b') || lower.includes('food'))) {
          parsed.industries = parsed.industries.filter(function(i) { return i !== 'F&B'; });
          if (parsed.industries.length === 0) parsed.industries = ['all'];
        }
        if ((lower.includes('减少') || lower.includes('降低') || lower.includes('lower') || lower.includes('reduce')) && (lower.includes('风险') || lower.includes('risk'))) {
          parsed.risk = 'low';
        }
        if ((lower.includes('提高') || lower.includes('增加') || lower.includes('higher') || lower.includes('increase')) && (lower.includes('收益') || lower.includes('回报') || lower.includes('return'))) {
          parsed.returnTarget = 'high';
          parsed.risk = parsed.risk === 'low' ? 'medium' : 'high';
        }
        abState.extraPrefs.push(text);
      }

      if (parsed.confidence < 10 && !parsed.style && !parsed.risk && parsed.industries.length === 0) {
        abAddAIMessage(
          '<p class="text-sm leading-relaxed mb-2" style="color: #8EBDB5;">' + t('abNlpNoMatch') + '</p>' +
          '<div class="p-3 rounded-xl" style="background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.15);">' +
            '<p class="text-xs whitespace-pre-line" style="color: #5A9A90;">' + t('abNlpExamples') + '</p>' +
          '</div>',
          [
            { text: t('abResetOpt1'), icon: 'fa-shield-alt', color: 'emerald', action: "abSelectOption('" + t('abResetOpt1') + "')" },
            { text: t('abResetOpt2'), icon: 'fa-rocket', color: 'amber', action: "abSelectOption('" + t('abResetOpt2') + "')" },
            { text: t('abResetOpt3'), icon: 'fa-balance-scale', color: 'blue', action: "abSelectOption('" + t('abResetOpt3') + "')" },
          ]
        );
        return;
      }

      if (!parsed.style) parsed.style = parsed.risk === 'low' ? 'conservative' : (parsed.risk === 'high' ? 'aggressive' : 'balanced');
      if (!parsed.risk) parsed.risk = 'medium';
      if (!parsed.returnTarget) parsed.returnTarget = parsed.risk;
      if (!parsed.period) parsed.period = 'medium';
      if (!parsed.budget) parsed.budget = 35;
      if (parsed.industries.length === 0) parsed.industries = ['all'];

      abState.pendingConfig = parsed;
      abState.step = Math.max(abState.step, 1);

      // V3: Show config card and auto-build preview
      abShowConfirmCard(parsed, isAdjust);
    }

    // Industry selection (supports multi-select, kept for backward compat)
    let abSelectedIndustries = [];
    function abSelectIndustry(value) {
      abToggleConfigIndustry(value);
    }

    function abSelectRisk(value) {
      abSetConfigDim('risk', value);
    }

    function abSelectPeriod(value) {
      abSetConfigDim('period', value);
    }

    function abSelectBudget(value) {
      abSetConfigDim('budget', parseInt(value));
    }

    function abParseIndustryInput(text) {
      // Kept for backward compat but now handled by NLP engine
      var parsed = abNLPParse(text);
      if (parsed.industries.length > 0) abState.industries = parsed.industries;
      else abState.industries = ['all'];
    }

    // ★ Core: Build portfolio from all contracts based on current state
    function abBuildPortfolio() {
      let pool = allDeals.filter(d => d.status === 'available' || d.isMine);

      // 1. Industry filter
      if (abState.industries.length > 0 && !abState.industries.includes('all')) {
        pool = pool.filter(c => abState.industries.includes(c.industry));
      }

      // 2. Risk filter
      if (abState.riskTolerance === 'low') {
        pool = pool.filter(c => parseFloat(c.aiScore) >= 8.0 && (c.riskGrade === 'A+' || c.riskGrade === 'A'));
      } else if (abState.riskTolerance === 'high') {
        pool = pool.filter(c => parseInt(c.revenueShare) >= 11);
      } else {
        pool = pool.filter(c => parseFloat(c.aiScore) >= 7.0);
      }

      // 3. Duration filter
      if (abState.period === 'short') {
        pool = pool.filter(c => parseInt(c.period) <= 24);
      } else if (abState.period === 'long') {
        pool = pool.filter(c => parseInt(c.period) >= 30);
      }

      // 4. Sort (by AI score desc + diversity)
      pool.sort((a, b) => parseFloat(b.aiScore) - parseFloat(a.aiScore));

      // 5. Budget limit & diversity selection
      const budget = abState.budget || 25;
      const selected = [];
      const projectSeen = {};
      for (const c of pool) {
        if (selected.length >= budget) break;
        // Max N contracts per project for diversity
        const maxPerProject = Math.max(3, Math.ceil(budget / 5));
        if (!projectSeen[c.projectId]) projectSeen[c.projectId] = 0;
        if (projectSeen[c.projectId] >= maxPerProject) continue;
        projectSeen[c.projectId]++;
        selected.push(c);
      }

      abState.portfolio = selected;

      // Generate portfolio name
      const styleNames = { conservative: t('abStyleConservative'), aggressive: t('abStyleAggressive'), balanced: t('abStyleBalanced'), sector: t('abStyleSector') };
      var indNameMap = {'F&B': t('indDining'), 'Technology': t('indTech'), 'Healthcare': t('indHealth'), 'Retail': t('indRetail'), 'Education': t('indEducation'), 'Entertainment': t('indEntertainment'), 'all': t('abStep1All')};
      var indDisplay = abState.industries.includes('all') ? t('abStep1All') : abState.industries.map(function(v) { return indNameMap[v] || v; }).join('+');
      abState.portfolioName = (styleNames[abState.style] || t('abStyleAIDefault')) + ' · ' + indDisplay + ' S26';

      // Update right panel
      abRenderPortfolio();
    }

    function abRenderPortfolio() {
      const p = abState.portfolio;
      if (p.length === 0) return;

      // Show panel (safety check)
      var waitEl = document.getElementById('abWaitingState');
      var panelEl = document.getElementById('abPortfolioPanel');
      if (waitEl) waitEl.classList.add('hidden');
      if (panelEl) {
        panelEl.classList.remove('hidden');
        panelEl.classList.add('ab-portfolio-evolve');
        setTimeout(function() { panelEl.classList.remove('ab-portfolio-evolve'); }, 600);
      }

      // Calculate stats
      const scores = calcPortfolioRadarScores(p);
      const overall = calcOverallScore(scores);
      const grade = getScoreGrade(overall);
      const projects = [...new Set(p.map(c => c.projectId))];
      const totalValue = p.length * 1000;
      const avgShare = (p.reduce((s, c) => s + parseInt(c.revenueShare), 0) / p.length).toFixed(1);
      // Calculate annual yield (revenueShare is annual %, weighted avg)
      let abTotalYield = 0;
      p.forEach(c => { const sn = parseInt(c.revenueShare) || 10; abTotalYield += sn; });
      const abAvgYield = (abTotalYield / p.length).toFixed(1);

      // Header
      document.getElementById('abPortfolioName').textContent = abState.portfolioName;
      document.getElementById('abPortfolioDesc').textContent = t('abPortfolioDescTpl', {total: allDeals.length});
      document.getElementById('abPortfolioMeta').textContent = t('abPortfolioMetaTpl', {step: Math.min(abState.step, 5)});
      document.getElementById('abGradeBadge').textContent = grade.grade + ' · ' + overall + ' pts';
      document.getElementById('abGradeBadge').style.cssText = 'background:' + grade.bg + '; color:' + grade.color + '; padding:4px 14px; border-radius:12px; font-size:13px; font-weight:700;';

      // Core numbers
      document.getElementById('abStatContracts').textContent = p.length;
      document.getElementById('abStatProjects').textContent = projects.length;
      document.getElementById('abStatValue').textContent = '¥' + totalValue.toLocaleString();
      document.getElementById('abStatReturn').textContent = abAvgYield + '%';

      // Radar chart
      setTimeout(() => { drawRadarChart('abRadarCanvas', scores, { size: 300, displayValues: calcPortfolioDisplayValues(p) }); }, 100);

      // Dimension grid — show actual values, not scores, for instant investor comprehension
      const displayVals = calcPortfolioDisplayValues(p);
      document.getElementById('abDimGrid').innerHTML = RADAR_DIMENSIONS.map((dim, i) => {
        const s = scores[i]; const g = getScoreGrade(s);
        var groupLabel = getDimGroup(dim);
        var groupCls = getDimGroupCls(dim);
        return '<div class="text-center p-2 rounded-xl dim-tooltip-wrap" style="background:' + dim.color + '10; border: 1px solid ' + dim.color + '22; cursor:help;">' +
          '<span class="dim-group-tag ' + groupCls + '" style="margin-bottom:2px;">' + groupLabel + '</span>' +
          '<i class="fas ' + dim.icon + '" style="color:' + dim.color + '; font-size:11px;"></i>' +
          '<p class="text-xs font-bold mt-1" style="color:' + dim.color + ';">' + displayVals[i] + '</p>' +
          '<p class="text-xs truncate" style="font-size:9px; color: rgba(255,255,255,0.35);">' + getRadarSubLabel(i) + '</p>' +
          '<span class="dim-tooltip-text" style="bottom:auto;top:calc(100% + 8px);"><b style="color:' + dim.color + ';">' + getDimLabel(dim) + '</b><br>' + getDimDesc(dim) + '</span>' +
        '</div>';
      }).join('');

      // Industry allocation
      const industryDistrib = {};
      p.forEach(c => { industryDistrib[c.industry] = (industryDistrib[c.industry] || 0) + 1; });
      const indColors = { 'F&B': '#f59e0b', 'Retail': '#06b6d4', 'Technology': '#8b5cf6', 'Education': '#10b981', 'Healthcare': '#ef4444', 'Entertainment': '#ec4899' };
      document.getElementById('abIndustryDistrib').innerHTML = Object.keys(industryDistrib).map(ind => {
        const count = industryDistrib[ind];
        const pct = (count / p.length * 100).toFixed(1);
        const c = indColors[ind] || '#3D7A70';
        return '<div class="flex items-center gap-3">' +
          '<div class="w-3 h-3 rounded-full flex-shrink-0" style="background:' + c + ';"></div>' +
          '<span class="text-xs flex-1" style="color: rgba(255,255,255,0.6);">' + getIndustryName(ind) + '</span>' +
          '<div class="flex-1 h-2 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.06);"><div class="h-full rounded-full transition-all" style="width:' + pct + '%; background:' + c + ';"></div></div>' +
          '<span class="text-xs font-bold" style="color: #8EBDB5;">' + count + t('abContractUnit') + '</span>' +
          '<span class="text-xs" style="color: #5A9A90;">' + pct + '%</span>' +
        '</div>';
      }).join('');

      // Contract list
      document.getElementById('abContractCount').textContent = p.length + ('');
      document.getElementById('abContractList').innerHTML = p.slice(0, 30).map(c => {
        const cs = calcRadarScores(c); const co = calcOverallScore(cs); const cg = getScoreGrade(co);
        return '<div class="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ab-contract-item" onclick="openDetail(&#39;' + c.id + '&#39;)">' +
          '<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + (indColors[c.industry] || '#3D7A70') + '18;"><i class="fas fa-file-contract" style="color:' + (indColors[c.industry] || '#3D7A70') + '; font-size:10px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-xs font-bold text-[#E8F5F3] truncate">' + getProjectName(c) + '</p>' +
            '<p class="text-xs text-[#3D7A70]"><span class="font-mono">' + (c.mcn || '').substring(0, 16) + '</span> · ' + getIndustryName(c.industry) + ' · ' + c.revenueShare + '</p>' +
          '</div>' +
          '<div class="text-right flex-shrink-0">' +
            '<p class="text-xs font-bold" style="color:' + cg.color + ';">' + co + '</p>' +
            '<p style="font-size:9px; color:' + cg.color + ';">' + cg.grade + '</p>' +
          '</div>' +
        '</div>';
      }).join('') + (p.length > 30 ? '<p class="text-xs text-center py-2 text-[#3D7A70]">... ' + (p.length - 30) + t('abContractUnitMore') + '</p>' : '');
    }

    function abApplyPortfolio() {
      if (abState.portfolio.length === 0) { showToast('warning', t('abApplyEmptyTitle'), t('abApplyEmptyMsg')); return; }
      const userName = currentUser ? (currentUser.displayName || currentUser.username) : (currentLang === 'en' ? 'Guest' : '游客');
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
      showToast('success', t('abPurchaseSuccess'), t('abPurchaseSuccessMsg', {count: count, total: (count * 1000).toLocaleString()}));
      // Also add a success message in chat
      abAddAIMessage(
        '<div class="p-4 rounded-xl text-center" style="background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1)); border: 1px solid rgba(16,185,129,0.3);">' +
          '<i class="fas fa-check-circle text-2xl mb-2" style="color: #34d399;"></i>' +
          '<p class="text-sm font-bold mb-1" style="color: #E8F5F3;">' + t('abPurchaseSuccess') + '</p>' +
          '<p class="text-xs" style="color: #5A9A90;">' + t('abPurchaseSuccessMsg', {count: count, total: (count * 1000).toLocaleString()}) + '</p>' +
        '</div>',
        []
      );
      abBuildPortfolio(); // Refresh panel
    }

    function abRefine() {
      document.getElementById('abInput').focus();
      showToast('info', t('abRefineTitle'), t('abRefineMsg'));
    }

    // ==================== Initialization Entry ====================
    // Initialize immediately (no DOMContentLoaded needed, script is at body end)
    initApp();
  </script>
  <!-- Tailwind CSS CDN loaded last, async to not block rendering -->
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
