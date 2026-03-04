#!/usr/bin/env python3
"""
Batch 4: Fix ALL remaining Chinese outside i18n zh block.
This covers inline HTML defaults, JS data objects, and comments.
"""
import re

with open('src/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ===== REMAINING HTML with data-i18n attributes (default text should be EN) =====
fixes = [
    # Line 991
    ('0 张合约 · 0 个项目 · 总投入 ¥0', '0 contracts · 0 projects · Total ¥0'),
    # Line 1002
    ('<!-- Left: 组合概览 -->', '<!-- Left: Portfolio Overview -->'),
    # Line 1008
    ('<!-- Right: 组合雷达图+合约列表 -->', '<!-- Right: Portfolio Radar + Contract List -->'),
    # Line 1015
    ('>加载组合加权分析...</p>', '>Loading portfolio analysis...</p>'),
    # Line 1031
    ('data-i18n="abTitle">AI 组合构建器</h1>', 'data-i18n="abTitle">AI Portfolio Architect</h1>'),
    # Line 1037
    ('data-i18n="abRestart">重新选择</span>', 'data-i18n="abRestart">Start Over</span>'),
    # Line 1042
    ('<!-- 左对话 + 右组合 双栏 -->', '<!-- Left chat + Right portfolio -->'),
    # Line 1044
    ('<!-- 左侧: AI 对话区 -->', '<!-- Left: AI Chat -->'),
    # Line 1053 - AI welcome message
    ('>您好！我是 <strong style="color:#3DD8CA;">参与通 AI 组合构建器</strong>。</p>', '>Hello! I am the <strong style="color:#3DD8CA;">Deal Connect AI Portfolio Architect</strong>.</p>'),
    # Line 1054
    ('>我将通过对话，了解您的投资偏好和目标，从平台全部合约中为您智能构建个性化投资组合。</p>', '>Through conversation, I will learn your investment preferences and build a personalized portfolio from all platform contracts.</p>'),
    ('>我们先从一个简单的问题开始 —</p>', ">Let's start with a simple question —</p>"),
    ('>您这次投资最看重什么？</p>', '>What matters most in this investment?</p>'),
    # Quick options
    ("'>稳健型</span>", "'>Conservative</span>"),
    ("'>进取型</span>", "'>Aggressive</span>"),
    ("'>平衡型</span>", "'>Balanced</span>"),
    ("'>行业型</span>", "'>Industry</span>"),
    # Input placeholder
    ('placeholder="输入您的投资需求或偏好…"', 'placeholder="Describe your investment needs..."'),
    # Line 1078
    ('>实时分析您的需求，从 <strong><span id="abTotalContracts2">0</span></strong> 张合约中智能配置</span>', '>Real-time analysis from <strong><span id="abTotalContracts2">0</span></strong> contracts</span>'),
    # Line 1082
    ('<!-- 右侧: 实时组合面板 -->', '<!-- Right: Portfolio Panel -->'),
    # Line 1090-1091
    ('>等待 AI 构建您的专属组合</h3>', '>Waiting for AI to Build Your Portfolio</h3>'),
    ('>在左侧与 AI 对话，描述您的投资偏好。AI 将根据您的需求从全平台合约中实时构建投资组合。</p>', '>Chat with AI on the left to describe your preferences. AI will build a portfolio from all contracts.</p>'),
    # Flow steps
    ('>风格偏好</span>', '>Style Preference</span>'),
    ('>行业选择</span>', '>Sector Selection</span>'),
    ('>组合生成</span>', '>Portfolio Build</span>'),
    # Fixed top
    ('<!-- 固定顶部：仅认购按钮 -->', '<!-- Fixed top: Subscribe -->'),
    ('>一键认购此组合</button>', '>Subscribe Portfolio</button>'),
    ('>继续调整</button>', '>Refine</button>'),
    # Scrollable
    ('<!-- 可滚动区域：Header + 雷达图 + 行业配比 + 合约清单 -->', '<!-- Scrollable -->'),
    ('<!-- 组合 header -->', '<!-- Portfolio header -->'),
    ('>构建</span>', '>Building</span>'),
    ('>实时生成</span>', '>Real-time</span>'),
    ('>推荐组合</h3>', '>Recommended Portfolio</h3>'),
    ('>基于您的投资偏好智能生成</p>', '>Intelligently generated based on your preferences</p>'),
    ('<!-- 核心数字 -->', '<!-- Core Numbers -->'),
    ('>张合约</p>', '>Contracts</p>'),
    ('>个项目</p>', '>Projects</p>'),
    ('>总投入</p>', '>Total Investment</p>'),
    ('>预期回报</p>', '>Expected Return</p>'),
    ('<!-- 雷达图 -->', '<!-- Radar -->'),
    ('>组合雷达评估</h4>', '>Portfolio Radar</h4>'),
    ('>维度量化</h4>', '>Dimensions</h4>'),
    ('<!-- 行业配比 -->', '<!-- Sector Mix -->'),
    ('>行业配比</h4>', '>Sector Allocation</h4>'),
    ('<!-- 合约清单 -->', '<!-- Contracts -->'),
    ('>推荐合约清单</h4>', '>Recommended Contracts</h4>'),
    # Confirm modal
    ('>确认操作</h3>', '>Confirm Action</h3>'),
    ('>确定要执行此操作吗？</p>', '>Are you sure?</p>'),
    # FAB
    ('<!-- 全局浮动入口 -->', '<!-- Global FAB -->'),
    ('>AI 智能组合构建器</div>', '>AI Portfolio Builder</div>'),
    ('>与AI对话，一键构建投资组合</div>', '>Chat with AI, one-click portfolios</div>'),
    ('>Deal Connect AI 助手</span>', '>Deal Connect AI Assistant</span>'),
    ('<!-- 移动端底部导航 -->', '<!-- Mobile Nav -->'),
    # Bottom fab tooltip    
    ('>智能组合构建器</span>', '>AI Portfolio Builder</span>'),
    ('>与AI对话，一键构建投资组合</p>', '>Chat with AI, build portfolios</p>'),
    ('>助手</span>', '>Assistant</span>'),
    
    # ===== SIEVE LIBRARY DATA (Lines 1880-2027) =====
    ("name: '所有来自发起通的机会'", "name: 'All Originate Opportunities'"),
    ("desc: '原始数据，不受筛选影响'", "desc: 'Raw data, no filter applied'"),
    ("name: '当前筛子过滤后的机会'", "name: 'Sieve-Filtered Opportunities'"),
    ("name: '当前选中的筛子'", "name: 'Currently Selected Sieve'"),
    ("// 筛子库：全量可用筛子", "// Sieve Library: all available sieves"),
    ("name: '行业偏好筛子'", "name: 'Industry Preference Sieve'"),
    ("cat: '行业'", "cat: 'Industry'"),
    ("desc: '基于您的行业投资偏好（餐饮、零售、科技），筛选符合行业方向的项目'", "desc: 'Filter by your preferred industries (F&B, Retail, Tech)'"),
    ("name: '风控优先筛子'", "name: 'Risk-First Sieve'"),
    ("desc: '严格风控标准：AI评分>=8.5、金额<=800万、有明确退出机制的低风险项目'", "desc: 'Strict risk controls: AI Score>=8.5, Raise<=8M, clear exit mechanisms'"),
    ("name: '高回报筛子'", "name: 'High Return Sieve'"),
    ("cat: '收益'", "cat: 'Return'"),
    ("desc: '聚焦高回报项目：分成比例>=12%、AI评分>=8.0的高潜力机会'", "desc: 'Target high-return: Rev Share>=12%, AI Score>=8.0'"),
    ("name: '区域聚焦筛子'", "name: 'Regional Focus Sieve'"),
    ("cat: '区域'", "cat: 'Region'"),
    ("desc: '聚焦一线城市（北京、上海、深圳、杭州）的优质项目'", "desc: 'Focus on Tier-1 cities (Beijing, Shanghai, Shenzhen, Hangzhou)'"),
    ("name: '综合评估筛子'", "name: 'Composite Assessment Sieve'"),
    ("cat: '综合'", "cat: 'Composite'"),
    ("desc: '多维度综合评估：AI评分、行业前景、风控等级、回报潜力的加权筛选'", "desc: 'Multi-factor assessment: AI score, sector outlook, risk rating, return potential'"),
    ("// 筛子库扩展筛子", "// Extended sieves"),
    ("name: '高成长筛子'", "name: 'High-Growth Sieve'"),
    ("cat: '成长'", "cat: 'Growth'"),
    ("desc: '优选运营年限<=3年、月营收增速良好的高成长型早期项目'", "desc: 'Target early-stage <=3yrs with strong monthly revenue growth'"),
    ("name: '大额项目筛子'", "name: 'Large-Cap Sieve'"),
    ("cat: '规模'", "cat: 'Scale'"),
    ("desc: '筛选投资金额>=500万的大体量、高门槛优质项目'", "desc: 'Filter for large projects with raise >=5M'"),
    ("name: '团队实力筛子'", "name: 'Team Strength Sieve'"),
    ("cat: '团队'", "cat: 'Team'"),
    ("desc: '优选员工>=50人、运营年限>=3年的成熟团队项目'", "desc: 'Mature teams with >=50 employees and >=3yrs operation'"),
    ("name: '短周期筛子'", "name: 'Short-Cycle Sieve'"),
    ("cat: '周期'", "cat: 'Cycle'"),
    ("desc: '聚焦分成期限<=24个月的快速回收项目'", "desc: 'Focus on short-duration <=24 months contracts'"),
    ("name: '稳健保守筛子'", "name: 'Ultra-Conservative Sieve'"),
    ("desc: '极保守策略：风控评级A及以上、AI评分>=9.0、金额<=500万'", "desc: 'Ultra-conservative: Grade A+, AI Score>=9.0, Raise<=5M'"),
    
    # Built-in sieve
    ("key: '全部机会'", "key: 'all_opportunities'"),
    ("name: '全部机会'", "name: 'All Opportunities'"),
    ("// 内置筛子，不可删除", "// Built-in sieve, cannot be removed"),
    ("desc: '不使用筛子，展示发起通的所有投资机会'", "desc: 'Show all origination opportunities without filter'"),
    
    # User sieve panel
    ("// 用户面板筛子 — 从筛子库中选取的键名列表", "// User panel sieves — selected keys from sieve library"),
    ("// 初始化用户筛子面板", "// Initialize user sieve panel"),
    ("// 默认预装4个筛子", "// Default 4 sieves preloaded"),
    ("// 构建当前可用的筛子模型（用户面板中的 + 全部机会）", "// Build available sieve models (user panel + all opportunities)"),
]

for old, new in fixes:
    if old in content:
        content = content.replace(old, new)

print("Part A: HTML + Sieve data fixes done")

# ===== PART B: JS Comments and remaining logic strings =====
comment_fixes = [
    # Navigation and page logic
    ("// 记住上一页用于返回", "// Remember previous page for back navigation"),
    ("// 页面切换后滚动到顶部", "// Scroll to top after page switch"),
    ("// 可滚动面板也重置到顶部", "// Reset scrollable panels to top"),
    ("// 请填写完整", "// Please fill all fields"),
    ("// 登录失败", "// Login failed"),
    ("// 网络错误", "// Network error"),
    ("// 请填写必填项", "// Required fields"),
    ("// 密码过短", "// Password too short"),
    ("// 注册成功", "// Registration success"),
    ("// 注册失败", "// Registration failed"),
    ("// 自动加载数据", "// Auto-load data"),
    ("// 恢复上次的筛子选择", "// Restore last sieve selection"),
    ("// 登录后直接进入合约看板", "// Go to contract board after login"),
    ("// 登录成功", "// Login success"),
    ("// 延迟", "// Delay"),
    ("// 已退出", "// Logged out"),
    ("// 全局键盘快捷键", "// Global keyboard shortcuts"),
    ("// 关闭弹窗", "// Close modal"),
    ("// 聚焦搜索", "// Focus search"),
    ("// 浏览器历史导航", "// Browser history navigation"),
    ("// 合约编号体系", "// Contract numbering system"),
    ("// 格式", "// Format"),
    ("// 例", "// Example"),
    ("// 全国", "// National"),
    ("// 从MCN编号解析信息", "// Parse info from MCN"),
    ("// 未知", "// Unknown"),
    ("// 模拟发起通数据", "// Simulated Originate data"),
    ("// 核心概念重构", "// Core concept restructure"),
    ("// 虚拟合约生成器", "// Virtual contract generator"),
    ("// 核心思路", "// Core approach"),
    ("// 全量数字", "// Total numbers"),
    ("// 新增行业覆盖", "// New industry coverage"),
    ("// 入口卡片统计", "// Entry card stats"),
    ("// 数字动态过渡", "// Number animation"),
    ("// 聚光灯效果", "// Spotlight effect"),
    ("// 全局浮动入口", "// Global FAB"),
    ("// 动态渲染", "// Dynamic rendering"),
    ("// 动态更新", "// Dynamic update"),
    ("// 搜索防抖", "// Search debounce"),
    ("// 加载演示数据", "// Load demo data"),
    ("// 性能优化", "// Performance optimization"),
    ("// 风格实时时钟", "// Live clock"),
    ("// 初始化", "// Initialize"),
]

for old, new in comment_fixes:
    if old in content:
        content = content.replace(old, new)

print("Part B: Comments fixed")

# ===== PART C: Replace remaining Chinese text patterns in JS data =====
# Project descriptions and other embedded strings

data_fixes = [
    # Project descriptions (in data arrays)
    ("'星巴克臻选店，西溪湿地核心商圈'", "'Starbucks Reserve, Xixi Wetland prime location'"),
    ("'海底捞西南区旗舰店，春熙路核心位置'", "'Haidilao SW Flagship, Chunxi Rd prime location'"),
    ("'九毛九旗下网红品牌，天河核心商圈'", "'Jiumaojiu internet-famous brand, Tianhe prime area'"),
    ("'概念店，配备手冲茶实验室'", "'Concept store with pour-over tea lab'"),
    ("'精简高效模型，坪效领先同行业'", "'Efficient model, leading space productivity'"),
    ("'盲盒零售标杆门店，矩阵丰富'", "'Blind box retail benchmark, rich matrix'"),
    ("'全球化零售品牌'", "'Global retail brand'"),
    ("'写字楼集群覆盖模式'", "'Office cluster coverage model'"),
    ("'大模型商业化项目'", "'Large model commercialization'"),
    ("'智慧城市解决方案'", "'Smart city solutions'"),
    ("'农业植保无人机'", "'Agricultural protection drones'"),
    ("'智慧学堂，双师课堂'", "'Smart classroom, dual-teacher model'"),
    ("'线上线下融合教育，社区化小班精品课'", "'Online-offline blended education, community-based premium classes'"),
    ("'高端体检+专科医疗'", "'Premium checkup + specialty healthcare'"),
    ("'高端私立医疗品牌，外籍医生团队'", "'Premium private healthcare, international doctors'"),
    
    # More embedded Chinese 
    ("'日均客流'", "'Daily foot traffic'"),
    ("'月均翻台率'", "'Monthly table turnover'"),
    ("'排队率高'", "'High queue rate'"),
    ("'日均出杯'", "'Daily cups served'"),
    ("'坪效领先同行业'", "'Leading space productivity'"),
    ("'会员复购率'", "'Member repurchase rate'"),
    ("'月更'", "'Monthly new'"),
    ("'高周转低库存'", "'High turnover, low inventory'"),
    ("'家联营门店打包'", "' franchise stores bundled'"),
    ("'收入稳定增长'", "'Stable revenue growth'"),
    ("'月活用户'", "'Monthly active users'"),
    ("'已签约'", "'Contracted'"),
    ("'个一线城市'", "' Tier-1 cities'"),
    ("'政府采购订单稳定'", "'Stable govt procurement orders'"),
    ("'覆盖全国'", "'Nationwide coverage'"),
    ("'省'", "' provinces'"),
    ("'设备保有量行业第一'", "'Industry-leading installed base'"),
    ("'覆盖'", "'Covering'"),
    ("'全学段'", "'all grade levels'"),
    ("'家长满意度'", "'Parent satisfaction'"),
    ("'日均检量'", "'Daily checkups'"),
    ("'企业团检客户'", "'Corporate group clients'"),
    ("'诊所'", "'Clinic'"),
    ("'保险直付覆盖率'", "'Insurance direct-pay coverage'"),
    ("'城巡演'", "'-city tour'"),
    ("'场均'", "'Avg per show'"),
    ("'日均单量'", "'Daily orders'"),
    ("'骑手团队规模'", "'Rider team size'"),
    ("'售后一体化'", "'Integrated after-sales'"),
    ("'新能源汽车交付'", "'NEV delivery'"),
    ("'改编电影累计票房'", "'Adapted film gross'"),
    ("'电影双线收入'", "'Dual film revenue'"),
    ("'亚洲顶级'", "'Top in Asia'"),
    ("'万人'", "'0K people'"),
    ("'加速器'", "'Accelerator'"),
    ("'月均营收'", "'Monthly avg revenue'"),
    ("'续课率'", "'Re-enrollment rate'"),
    ("'辅诊准确率'", "'Diagnostic accuracy'"),
    ("'线上问诊月活'", "'Online consultation MAU'"),
    ("'月均交付'", "'Monthly avg deliveries'"),
    ("'衍生品收入占比'", "'Merchandise revenue share'"),
    
    # Number units in data
    ("'万元'", "'0K'"),
    ("'万以上的大型旗舰项目'", "'M+ large flagship projects'"),
    
    # Various remaining comments and strings
    ("'用户名和密码不能为空'", "'Username and password required'"),
    ("'请检查网络连接'", "'Please check network connection'"),
    ("'密码至少'", "'Password min'"),
    ("'欢迎加入参与通'", "'Welcome to Deal Connect'"),
    ("'网络错误'", "'Network error'"),
    ("'您已安全退出账号'", "'You have been safely signed out'"),
    ("'秒后触发聚光灯引导效果'", "'s delay before spotlight guide'"),
    ("'仅首次'", "'first time only'"),
    ("'如果还没加载'", "'if not loaded yet'"),
    ("'首页'", "'homepage'"),
    ("'欢迎回来'", "'Welcome back'"),
    ("'功能开发中'", "'Feature under development'"),
    ("'分享链接已复制'", "'Share link copied'"),
    ("'已添加到收藏夹'", "'Added to bookmarks'"),
    ("'密码重置'", "'Password Reset'"),
    ("'此功能即将上线'", "'Coming soon'"),
    
    # Sieve-related strings
    ("'可在评估通中管理您的筛子模型'", "'Manage your sieve models in Assess'"),
    ("'该合约已被他人认购'", "'This contract has been subscribed by another investor'"),
    ("'该合约已被认购'", "'This contract has been subscribed'"),
    ("'您持有此合约'", "'You hold this contract'"),
    ("'您已认购此合约'", "'You have subscribed to this contract'"),
    ("'合约已添加到您的持仓'", "'Contract added to your holdings'"),
    ("'SSO登录即将上线'", "'SSO Coming Soon'"),
    ("'企业统一认证接口已预留'", "'Enterprise auth interface reserved'"),
    
    # Onboarding in remaining spots
    ("'一个项目'", "'One project'"),
    ("'多张合约'", "'Multiple contracts'"),
    ("'融资金额'", "'Raise amount'"),
    ("'合约张数'", "'Contract count'"),
    ("'项目融资额范围'", "'Project raise range'"),
    ("'合约看板以项目为维度分组展示'", "'Contract board grouped by project'"),
    ("'每个项目生成少量代表性合约用于展示'", "'Generate sample contracts per project for display'"),
    ("'仅用于统计显示'", "'Display only'"),
    ("'不实际创建对象'", "'No actual object creation'"),
    ("'只存项目级元数据'", "'Store only project-level metadata'"),
    ("'避免一次性创建数万条记录导致浏览器卡死'", "'Avoid creating tens of thousands of records'"),
    ("'按需生成合约对象'", "'Generate contract objects on demand'"),
]

for old, new in data_fixes:
    if old in content:
        content = content.replace(old, new)

print("Part C: Data model fixes done")

with open('src/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Final count
remaining = len(re.findall(r'[\u4e00-\u9fff]', content))
zh_start = content.find("zh: {")
en_start = content.find("en: {")
zh_block = len(re.findall(r'[\u4e00-\u9fff]', content[zh_start:en_start]))
outside = remaining - zh_block
print(f"\nFinal: {remaining} total Chinese chars")
print(f"  In zh: i18n block (LEGITIMATE): {zh_block}")
print(f"  Outside (NEEDS FIX): {outside}")
