#!/usr/bin/env python3
"""Batch 5: Translate ALL remaining Chinese text outside the zh i18n block."""
import re

with open('src/index.tsx', 'r') as f:
    content = f.read()

# Track replacements
count = 0

def rep(old, new):
    global content, count
    if old in content:
        content = content.replace(old, new)
        count += 1

# ========== 1. Sieve categories (used as data keys) ==========
# These are category values in SIEVE_LIBRARY
rep("category: '行业'", "category: 'Industry'")
rep("category: '收益'", "category: 'Return'")
rep("category: '区域'", "category: 'Location'")
rep("category: '综合'", "category: 'Composite'")
rep("category: '成长'", "category: 'Growth'")
rep("category: '规模'", "category: 'Scale'")
rep("category: '周期'", "category: 'Cycle'")

# Sieve category map in getSieveCat
rep("'行业': 'sieveCatIndustry'", "'Industry': 'sieveCatIndustry'")
rep("'收益': 'sieveCatReturn'", "'Return': 'sieveCatReturn'")
rep("'综合': 'sieveCatComposite'", "'Composite': 'sieveCatComposite'")
rep("'区域': 'sieveCatLocation'", "'Location': 'sieveCatLocation'")
rep("'成长': 'sieveCatGrowth'", "'Growth': 'sieveCatGrowth'")
rep("'规模': 'sieveCatScale'", "'Scale': 'sieveCatScale'")
rep("'周期': 'sieveCatCycle'", "'Cycle': 'sieveCatCycle'")

# ========== 2. showToast messages ==========
rep("showToast('warning', '请填写完整', 'Username and password required')", "showToast('warning', 'Incomplete', 'Username and password required')")
rep("showToast('error', '登录失败', data.message)", "showToast('error', 'Login Failed', data.message)")
rep("showToast('warning', '请填写必填项')", "showToast('warning', 'Required fields missing')")
rep("showToast('warning', '密码过短', '密码至少6位')", "showToast('warning', 'Password too short', 'Minimum 6 characters')")
rep("showToast('success', '注册成功', '欢迎加入参与通！')", "showToast('success', 'Registration Successful', 'Welcome to Deal Connect!')")
rep("showToast('error', '注册失败', data.message)", "showToast('error', 'Registration Failed', data.message)")
rep("showToast('success', '登录成功', '欢迎回来，' + name)", "showToast('success', 'Login Successful', 'Welcome back, ' + name)")
rep("showToast('info', '已退出', 'You have been safely signed out')", "showToast('info', 'Signed Out', 'You have been safely signed out')")
rep("showToast('success', '已添加', SIEVE_LIBRARY[key].name + ' 已添加到您的筛子面板')", "showToast('success', 'Added', SIEVE_LIBRARY[key].name + ' has been added to your sieve panel')")
rep("showToast('info', '已移除', SIEVE_LIBRARY[key].name + ' 已从您的面板移除')", "showToast('info', 'Removed', SIEVE_LIBRARY[key].name + ' has been removed from your panel')")

# ========== 3. MCN parser fallback ==========
rep("|| '未知';", "|| 'Unknown';")

# ========== 4. HOLDER_NAMES (investor placeholders) ==========
rep("const HOLDER_NAMES = ['张三', '李四', '王五', '赵六', '陈七', '机构A', '基金B', '投资人C', '信托D', '私募E', '家办F', '资管G']",
    "const HOLDER_NAMES = ['J. Smith', 'L. Chen', 'W. Zhang', 'M. Liu', 'K. Yang', 'Inst. Alpha', 'Fund Beta', 'Investor C', 'Trust Delta', 'PE Epsilon', 'FO Foxtrot', 'AM Golf']")

# ========== 5. Project descriptions (desc field) ==========
rep("desc: '星巴克臻选店，西溪湿地核心商圈，日均客流8000+'", "desc: 'Starbucks Reserve store, Xixi Wetland prime district, 8,000+ daily footfall'")
rep("desc: '海底捞西南区旗舰店，春熙路核心位置，月均翻台率4.2'", "desc: 'Haidilao SW flagship, prime Chunxi Rd location, 4.2 avg monthly table turnover'")
rep("desc: '九毛九旗下网红品牌，天河核心商圈，排队率高'", "desc: 'Jiumaojiu sub-brand, Tianhe prime district, high queue rate'")
rep("desc: '喜茶LAB概念店，配备手冲茶实验室，日均出杯2000+'", "desc: 'HEYTEA LAB concept store with hand-brew tea lab, 2,000+ cups daily'")
rep("desc: '奈雪PRO店型，精简高效模型，坪效领先同行业'", "desc: 'Nayuki PRO format, lean & efficient model, industry-leading revenue per sqft'")
rep("desc: '盲盒零售标杆门店，IP矩阵丰富，会员复购率65%'", "desc: 'Benchmark blind-box retail store, rich IP portfolio, 65% member repurchase rate'")
rep("desc: '全球化零售品牌，超200SKU月更，高周转低库存'", "desc: 'Global retail brand, 200+ SKU monthly refresh, high turnover low inventory'")
rep("desc: '写字楼集群覆盖模式，3家联营门店打包，日均单量800+'", "desc: 'Office cluster coverage model, 3 franchise stores bundled, 800+ daily orders'")
rep("desc: 'AI大模型商业化项目，ToB SaaS收入稳定增长，月活用户500万+'", "desc: 'AI large model commercialization, stable B2B SaaS revenue growth, 5M+ MAU'")
rep("desc: '智慧城市解决方案，已签约12个一线城市，政府采购订单稳定'", "desc: 'Smart city solutions, contracted with 12 tier-1 cities, stable govt procurement'")
rep("desc: '农业植保无人机，覆盖全国15省，设备保有量行业第一'", "desc: 'Agricultural drones, covering 15 provinces nationwide, #1 fleet size in industry'")
rep("desc: 'AI双师课堂，覆盖K12全学段，续课率85%，月增学员3000+'", "desc: 'AI dual-teacher classroom, K12 full coverage, 85% renewal rate, 3,000+ new students/month'")
rep("desc: 'OMO线上线下融合教育，社区化小班精品课，家长满意度92%'", "desc: 'OMO blended education, community-based boutique classes, 92% parent satisfaction'")
rep("desc: '高端体检+专科医疗，日均检量350人，企业团检客户200+'", "desc: 'Premium checkup + specialty care, 350 daily exams, 200+ corporate clients'")
rep("desc: '高端私立医疗品牌，外籍医生团队，保险直付覆盖率95%'", "desc: 'Premium private healthcare brand, expat physician team, 95% direct insurance coverage'")
rep("desc: '互联网+医疗，线上问诊月活120万，AI辅诊准确率92%'", "desc: 'Internet + healthcare, 1.2M monthly online consultations, 92% AI-assisted diagnosis accuracy'")
rep("desc: '亚洲顶级IP，20城巡演，场均4万人，衍生品收入占比30%'", "desc: 'Top Asian IP, 20-city tour, avg 40K per show, 30% merch revenue share'")
rep("desc: '话剧+电影双线收入，全国30城巡演，IP改编电影累计票房50亿+'", "desc: 'Theater + film dual revenue, 30-city national tour, IP film adaptations CNY 5B+ total box office'")
rep("desc: '同城配送头部品牌，日均单量12万，骑手团队规模5000+'", "desc: 'Leading same-city delivery brand, 120K daily orders, 5,000+ rider fleet'")
rep("desc: '新能源汽车交付+售后一体化，月均交付300台，NPS行业领先'", "desc: 'NEV delivery + after-sales integration, 300 monthly deliveries, industry-leading NPS'")

# ========== 6. Project names still in Chinese ==========
rep("name: '字节跳动AI Lab加速器'", "name: 'ByteDance AI Lab Accelerator'")
rep("name: '新东方AI智慧学堂'", "name: 'New Oriental AI Smart School'")
rep("name: '和睦家北京CBD诊所'", "name: 'United Family Beijing CBD Clinic'")
rep("name: '周杰伦2026全球巡回演唱会'", "name: 'Jay Chou 2026 World Tour'")

# ========== 7. Originator names still in Chinese ==========
rep("originator: '瑞幸咖啡(中国)有限公司'", "originator: 'Luckin Coffee (China) Co., Ltd.'")
rep("originator: '微医集团(浙江)有限公司'", "originator: 'WeDoctor Group (Zhejiang) Co., Ltd.'")
rep("originator: '蔚来汽车科技(安徽)有限公司'", "originator: 'NIO Technology (Anhui) Co., Ltd.'")

# ========== 8. Location '全国' ==========
rep("location: '全国'", "location: 'Nationwide'")
rep("'全国': 11", "'Nationwide': 11")

# ========== 9. Deal description template ==========
rep("description: '由「' + proj.originator + '」通过发起通发行的' + proj.industry + '行业标准合约。面值 ¥1,000 · 收益分享合约(RSN)。项目融资总额 ¥' + proj.totalAmount + '万（' + totalContracts + '张合约）。'",
    "description: 'Standard ' + proj.industry + ' sector contract issued by \"' + proj.originator + '\" via Originate. Face value ¥1,000 · Revenue Share Note (RSN). Project total raise ¥' + proj.totalAmount + '0K (' + totalContracts + ' contracts).'")

# ========== 10. Display values - Chinese units ==========
rep("dealIncomeStr + '/月'", "dealIncomeStr + '/mo'")
rep("incomeDisplay + '/月'", "incomeDisplay + '/mo'")
rep("deal.status === 'sold' ? 'Sold' : '可购'", "deal.status === 'sold' ? 'Sold' : 'Available'")
rep("soldPct + '%已售'", "soldPct + '% sold'")
rep("topIndustry + '等' + indCount + '业'", "topIndustry + ' +' + (indCount-1) + ' more'")

# ========== 11. Page title ternary ==========
rep("document.title = currentLang === 'en' ? 'Deal Connect' : '参与通 Deal Connect'", "document.title = 'Deal Connect'")

# ========== 12. Sieve count display ==========
rep("mySieves.length + ' 个已添加'", "mySieves.length + ' added'")

# ========== 13. Radar weight comment ==========
rep("// 权重：收益>风控>稳定性>AI>团队=市场>时长=流动", "// Weights: Yield>Risk>Stability>AI>Team=Market>Duration=Liquidity")

# ========== 14. Score grade '分' ==========
# In the title attribute
rep("co + '分'", "co + ' pts'")

# ========== 15. 参与通 in page title ==========
rep("'参与通 Deal Connect'", "'Deal Connect'")

# ========== 16. My portfolios stats ternary Chinese fallbacks ==========
rep("currentLang === 'en' ? 'Portfolios' : '组合数量'", "'Portfolios'")
rep("currentLang === 'en' ? ' strategy types' : ' 种策略类型'", "' strategy types'")
rep("currentLang === 'en' ? 'Unique Contracts' : '去重合约'", "'Unique Contracts'")
rep("currentLang === 'en' ? ' invested' : ' 总投入'", "' invested'")
rep("currentLang === 'en' ? 'Sectors' : '覆盖行业'", "'Sectors'")
rep("currentLang === 'en' ? 'Avg Score' : '平均评分'", "'Avg Score'")
rep("currentLang === 'en' ? 'Overall portfolio score' : '组合综合评分'", "'Overall portfolio score'")

# ========== 17. Industry display ternary ==========
rep("currentLang === 'en' ? Object.keys(allIndustries).map(function(i) { var m = {'F&B':'F&B','Retail':'Retail','Technology':'Tech','Education':'Edu','Healthcare':'Health','Entertainment':'Ent'}; return m[i] || i; }).join(' · ') : Object.keys(allIndustries).join('·')",
    "Object.keys(allIndustries).map(function(i) { var m = {'F&B':'F&B','Retail':'Retail','Technology':'Tech','Education':'Edu','Healthcare':'Health','Entertainment':'Ent'}; return m[i] || i; }).join(' · ')")

# ========== 18. contract count suffix (张) in AI builder ==========
rep("currentLang === 'en' ? '' : ' 张'", "''")

# ========== 19. Login success page  ==========
rep("// Auto-load data（如果还没加载）", "// Auto-load data if not loaded yet")
rep("// Go to contract board after login（首页）", "// Go to contract board after login")
rep("// Delay1.2秒后触发聚光灯引导效果（仅首次）", "// Delay 1.2s for spotlight onboarding (first time only)")

# ========== 20. Comment-style inline Chinese in code ==========
# These are code-inline comments that appear after //
# Handled by the comment batch but some are in-line

# ========== 21. AI Builder grade badge ==========
rep("grade.grade + ' · ' + overall + '分'", "grade.grade + ' · ' + overall + ' pts'")

# ========== 22. AI Builder contract count with 张 suffix ==========
# In abContractCount  
rep("p.length + (currentLang === 'en' ? '' : ' 张')", "p.length")

# ========== 23. AI Builder unlisted contract text ==========
# Handle the complex expression
content = re.sub(
    r"p\.length > 30 \? '<p class=\"text-xs text-center py-2 text-\[#3D7A70\]\">' \+ \(currentLang === 'en' \? \(p\.length - 30\) \+ t\('abContractUn",
    lambda m: m.group(0),  # keep as is for now, will handle specific strings
    content
)

# ========== 24. Portfolio fund data - will be in batch 5B ==========

# ========== 25. Radar comment labels ==========
rep("// YITO年化收益率", "// Annual yield")
rep("// 合约时长（转天数）", "// Duration (in days)")
rep("// 收入 → 每张合约每月预估收入", "// Income — est. monthly income per contract")
rep("// 风控评级", "// Risk grade")
rep("// 流动性", "// Liquidity")
rep("// 团队实力 → 运营年限", "// Team strength — operating years")
rep("// 市场潜力 → 行业", "// Market potential — industry")
rep("// AI综合评分", "// AI composite score")

rep("// 年化收益\n", "// Annual yield\n")
rep("// 合约时长\n", "// Duration\n")
rep("// 收入（基于合约面值×分成的每月预估收入）", "// Income (est. monthly based on face value × share)")
rep("// 风控评级\n", "// Risk grade\n")
rep("// 流动性\n", "// Liquidity\n")
rep("// 团队（运营年限）", "// Team (operating years)")
rep("// 市场\n", "// Market\n")
rep("// AI评分\n", "// AI score\n")

# ========== 26. More inline comments with Chinese ==========
rep("// 所有来自发起通的机会（原始数据）", "// All opportunities from Originate (raw data)")
rep("// 当前筛子过滤后的机会", "// Filtered by current sieve")
rep("// 当前选中的筛子", "// Currently selected sieve")
rep("// 每项目实际生成的合约上限（用于展示和交互）", "// Max contracts generated per project (for display)")
rep("// 项目级汇总缓存（用于快速统计）", "// Project-level summary cache")
rep("// 全部项目的虚拟合约总数（真实融资额 × 10）", "// Total virtual contracts across all projects")
rep("// 虚拟总数（真实融资额映射）", "// Virtual total (mapped from real raise amount)")
rep("// 实际生成数", "// Actual generated count")
rep("// 统计虚拟总分布（确定性计算，不需要生成全部对象）", "// Deterministic virtual distribution calc")
rep("// 显示骨架屏加载效果", "// Show skeleton loading")
rep("// 如果移除的是当前选中的筛子，回到全部", "// If removed sieve is current, reset to all")
rep("// 项目月营收（万元）", "// Monthly revenue (10K CNY)")
rep("// 分成比例(%)", "// Revenue share (%)")
rep("// 项目融资总额（万元）", "// Project total raise (10K CNY)")
rep("// 项目总合约数（每张¥1000）", "// Total contracts (¥1,000 each)")
rep("// revenueShare 本身就是年化收益率(%)", "// revenueShare is the annual yield (%)")
rep("// revenueShare 本身就是年化收益率", "// revenueShare is the annual yield")
rep("// 单张合约预估月收 = 基于项目实际月营收推算", "// Per-contract est. monthly income from project revenue")
rep("// 维度卡片的副标签（简短描述实际值的含义）", "// Dimension card sub-labels")
rep("// 计算综合得分（加权平均）", "// Calculate composite score (weighted avg)")
rep("// 安全检查：非 dashboard 页面时不渲染", "// Safety check: skip if not on dashboard page")
rep("// 刷新详情", "// Refresh details")
rep("// 刷新面板", "// Refresh panel")

rep("// 全部项目的虚拟合约总数", "// Total virtual contracts")

# ========== 27. Contract builder description comment ==========
rep("// ★ 虚拟合约生成器 — 按需生成合约对象，避免一次性创建数万条记录导致浏览器卡死", "// ★ Virtual contract generator — on-demand to avoid creating tens of thousands of records")
rep("// Total numbers（如 19,110 张）仅用于统计显示，不实际创建对象", "// Total numbers (e.g., 19,110) for statistics display only, no actual objects created")
rep("// Core approach：只存项目级元数据 + 每个项目生成少量代表性合约用于展示", "// Core approach: store project metadata + generate limited representative contracts for display")

# ========== 28. Demo data section comments ==========
rep("// ==================== Demo Data (模拟发起通数据) ====================", "// ==================== Demo Data (Simulated Originate Data) ====================")
rep("// ★ 核心概念重构：", "// ★ Core concept:")
rep("//   一个项目 = 多张合约，融资金额 = 合约张数 × ¥1,000/张", "//   One project = multiple contracts, Raise = # contracts × ¥1,000/each")
rep("//   项目融资额范围：30万~200万（即300~2000张合约）", "//   Project raise range: ¥300K~¥2M (i.e. 300~2,000 contracts)")
rep("//   合约看板以项目为维度分组展示", "//   Board displays grouped by project")
rep("// ——— 餐饮 F&B ———", "// ——— F&B ———")
rep("// ——— 零售 RT ———", "// ——— Retail ———")
rep("// ——— 科技 TC ———", "// ——— Technology ———")
rep("// ——— 教育 ED ———", "// ——— Education ———")
rep("// ——— 健康 HC ———", "// ——— Healthcare ———")
rep("// ——— 演艺 EN ———", "// ——— Entertainment ———")
rep("// ——— 新增行业覆盖 ———", "// ——— Additional Industry Coverage ———")

# ========== 29. Calculation comments ==========
rep("// ★ 性能优化：每个项目只生成 MAX_CONTRACTS_PER_PROJECT 张代表性合约", "// ★ Performance: only generate MAX_CONTRACTS_PER_PROJECT representative contracts per project")
rep("//   项目的真实合约总数 = totalAmount × 10（仅用于统计展示）", "//   Real total = totalAmount × 10 (for stats display only)")
rep("//   例：星巴克80万 = 虚拟800张，但实际只生成60张供浏览", "//   e.g., Starbucks ¥800K = virtual 800, but only 60 generated for browsing")
rep("// 每张合约月收 = 月营收(万) × 10000 × 分成(%) / 100 / 总合约数", "// Per-contract monthly = revenue(10K) × 10000 × share(%) / 100 / total contracts")
rep("// 计算单张合约的预估月收（基于项目实际月营收 × 分成比例 ÷ 项目总合约数）", "// Calculate per-contract est. monthly income (project monthly rev × share ÷ total contracts)")
rep("// 计算单个合约的实际展示值（用于维度卡片 — 让投资者一眼看懂组合长什么样）", "// Calculate per-contract display values (for dimension cards)")
rep("// 计算组合级别的实际展示值（加权汇总 — 投资者一眼看懂组合画像）", "// Calculate portfolio-level display values (weighted aggregation)")

# ========== 30. Radar score function comments ==========
rep("// 1. 年化收益率", "// 1. Annual Yield")
rep("// 2. 合约时长", "// 2. Duration")
rep("// 3. 稳定性", "// 3. Stability")
rep("// 4. 风控评级", "// 4. Risk Control")
rep("// 5. 流动性", "// 5. Liquidity")
rep("// 6. 团队实力 — 员工数+运营年限", "// 6. Team Strength — headcount + operating years")
rep("// 7. 市场潜力 — 行业+城市", "// 7. Market Potential — industry + city")
rep("// 8. AI综合评分 — 直接用aiScore*10", "// 8. AI Composite Score — aiScore × 10")

# ========== 31. revenueShare/yield comments ==========
rep("// revenueShare 本身就是年化收益率\n", "// revenueShare is the annual yield\n")
rep("// YITO年化收益率(%)", "// Annual yield (%)")

# Display value inline comments
rep("// 合约时长（转天数）\n", "// Duration (in days)\n")
rep("// 风控评级\n", "// Risk grade\n")

# ========== 32. Scattered misc ==========
rep("// 从顶部开始", "// Start from top")
rep("// 实际值标签（如 \"12.0%\", \"540天\"）", "// Actual display labels (e.g., \"12.0%\", \"540days\")")
rep("// 总交易（已售出）", "// Total deals (sold)")
rep("// 对话阶段: 0=风格 1=行业 2=参数 3=生成完成 4=调整", "// Dialog step: 0=style 1=industry 2=params 3=generated 4=adjust")
rep("// 投资风格: conservative / aggressive / balanced / sector", "// Investment style")
rep("// 偏好行业列表", "// Preferred industries")
rep("// 目标回报", "// Target return")
rep("// 预算（张数）", "// Budget (contracts)")
rep("// 期限偏好", "// Period preference")
rep("// 额外偏好（自然语言记录）", "// Extra preferences (NL)")
rep("// 当前推荐的合约列表", "// Current recommended contracts")
rep("// 组合名称", "// Portfolio name")

# ========== 33. Sieve library section header ==========
rep("// ==================== 筛子库（全量可用筛子）====================", "// ==================== Sieve Library (All Available Sieves) ====================")
rep("// ==================== 筛子管理弹窗 ====================", "// ==================== Sieve Manager Modal ====================")
rep("// ==================== 搜索防抖 ====================", "// ==================== Search Debounce ====================")
rep("// ==================== 数字动态过渡 ====================", "// ==================== Number Transition Animation ====================")

# ========== 34. Portfolio fund section comments ==========
rep("// ==================== AI 组合构建器 (Portfolio Architect) ====================", "// ==================== AI Portfolio Builder ====================")

# ========== 35. Inline Chinese in annotation text ==========
rep("// 年化收益率（加权平均，面值相同故等于简单平均）", "// Annual yield (weighted avg, equal face values = simple avg)")
rep("// 平均合约时长（月→天，加权平均）", "// Avg duration (months→days, weighted avg)")
rep("// 组合每月预估收入 — 所有底层合约预估月收的加总", "// Portfolio est. monthly income — sum of all underlying contracts")
rep("// 风控评级 — 取众数", "// Risk grade — mode")
rep("// 流动性 — 已售比例", "// Liquidity — sold ratio")
rep("// 平均运营年限", "// Avg operating years")
rep("// 行业分布", "// Industry distribution")
rep("// 平均AI评分", "// Avg AI score")

# ========== 36. AI assistant responses in zh ==========
# The zh responses in the ternary (lines 3505-3509) are in the Chinese branch of the ternary, 
# but since default is now 'en', they should still be translated for completeness
rep("'当前筛子「' + sieveName + '」筛选出 ' + dealsList.length + ' 个机会。如需调整标准，可切换其他筛子模型或在「管理筛子」中添加新筛子。'",
    "'The current sieve \"' + sieveName + '\" found ' + dealsList.length + ' opportunities. Switch sieves or add new ones in Manage Sieves.'")
rep("'「风控优先筛子」适合保守型投资者，它要求AI评分>=8.5、金额<=800万。「高回报筛子」则聚焦分成>=12%的高潜力项目。'",
    "'The Risk Priority Sieve suits conservative investors — requires AI Score ≥8.5, raise ≤¥8M. The High Return Sieve focuses on revenue share ≥12%.'")
rep("'所有机会均来自发起通，经过平台基础审核。评估通筛子在此基础上做二次精筛，帮您找到最匹配的项目。'",
    "'All opportunities come from Originate with basic platform review. Assess sieves provide secondary filtering to find your best matches.'")
rep("'建议先用「综合评估筛子」做全面筛选，再针对感兴趣的项目切换「风控优先」做安全性验证。'",
    "'Tip: Use the Composite Assessment Sieve for broad screening, then switch to Risk Priority for safety verification.'")
rep("'表达参与意向后，项目将流向条款通进行交易条款协商。整个过程透明可追踪。'",
    "'After expressing interest, deals flow to Term for negotiation. The entire process is transparent and trackable.'")

# ========== 37. NLP keyword detection Chinese terms (in AI builder) ==========
rep("lower.includes('稳定')", "lower.includes('stable')")
rep("lower.includes('安全')", "lower.includes('safe')")
rep("lower.includes('高回报')", "lower.includes('high return')")
rep("lower.includes('均衡')", "lower.includes('balanced')")
rep("lower.includes('攻守')", "lower.includes('balanced')")
rep("lower.includes('行业')", "lower.includes('sector')")
rep("lower.includes('集中')", "lower.includes('concentrate')")
rep("lower.includes('看好')", "lower.includes('bullish')")
rep("lower.includes('低')", "lower.includes('low')")
rep("lower.includes('承受')", "lower.includes('tolerate')")
rep("lower.includes('短')", "lower.includes('short')")
rep("lower.includes('快')", "lower.includes('quick')")
rep("lower.includes('长')", "lower.includes('long')")
rep("lower.includes('以上')", "lower.includes('above')")
rep("lower.includes('大')", "lower.includes('large')")
rep("lower.includes('美食')", "lower.includes('food')")
rep("lower.includes('减少风险')", "lower.includes('reduce risk')")
rep("lower.includes('降低风险')", "lower.includes('lower risk')")
rep("lower.includes('更安全')", "lower.includes('safer')")
rep("lower.includes('提高回报')", "lower.includes('higher return')")
rep("lower.includes('更激进')", "lower.includes('more aggressive')")
rep("lower.includes('更高')", "lower.includes('higher')")
rep("lower.includes('减少')", "lower.includes('reduce')")
rep("lower.includes('短期')", "lower.includes('short term')")
rep("lower.includes('快速')", "lower.includes('quick')")
rep("lower.includes('娱乐')", "lower.includes('entertainment')")
rep("lower.includes('高')", "lower.includes('high')")

# Industry mapping for AI builder
rep("'美食': 'F&B'", "'food': 'F&B'")

# ========== 38. Tailwind CDN comment ==========
rep("<!-- Tailwind CSS CDN 放在最后异步加载，不阻塞页面渲染和JS执行 -->", "<!-- Tailwind CSS CDN loaded last, async to not block rendering -->")

# ========== 39. My Portfolios page ternary fallbacks ==========
# Additional ternary patterns
rep("currentLang === 'en' ? (p.length - 30) + t('abContractUn", "(p.length - 30) + t('abContractUn")

# Fix the sieve name filter function with Chinese
rep("c.name.indexOf('智')", "c.name.indexOf('AI')")

# ========== 40. Additional comment translations ==========
rep("// 全局键盘快捷键", "// Global keyboard shortcuts")
rep("// 关闭弹窗", "// Close modal")
rep("// 聚焦搜索", "// Focus search")
rep("// 浏览器历史导航", "// Browser history navigation")
rep("// 合约编号体系", "// Contract numbering system")
rep("// 行业(2位) + 城市(2位) + 年月(4位)", "// Industry(2) + City(2) + YYMM(4)")
rep("// 全国", "// Nationwide")

# MCN description
rep("// 请填写完整", "// Incomplete fields")
rep("// 登录失败", "// Login failed")
rep("// 请填写必填项", "// Required fields")
rep("// 密码过短", "// Password too short")

print(f'Applied {count} replacements')

with open('src/index.tsx', 'w') as f:
    f.write(content)

print('Batch 5A complete!')
