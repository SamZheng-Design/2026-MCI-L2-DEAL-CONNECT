#!/usr/bin/env python3
"""
Complete Chinese → English translation for Deal Connect.
Batch 2: All remaining HTML elements and JS logic.
"""
import re

with open('src/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ==================== BATCH 2: HTML Elements (lines 748-1230) ====================
replacements = [
    # AI Entry card stats
    ('data-i18n="aiEntryContractsLabel">可选合约</p>', 'data-i18n="aiEntryContractsLabel">Available Contracts</p>'),
    ('data-i18n="aiEntryProjectsLabel">覆盖项目</p>', 'data-i18n="aiEntryProjectsLabel">Projects Covered</p>'),
    ('<!-- 指引提示气泡 -->', '<!-- Guide hint bubble -->'),
    ('data-i18n="aiEntryHint">点击体验 AI 构建您的专属组合</span>', 'data-i18n="aiEntryHint">Click to experience AI building your portfolio</span>'),
    
    # Sieve selector section (lines 772-792)
    ('<!-- ===== 筛子选择器 (核心新功能) ===== -->', '<!-- ===== Sieve Selector (Core Feature) ===== -->'),
    ('data-i18n="sieveTitle">评估通 · AI筛子</h3>', 'data-i18n="sieveTitle">Assess · AI Sieves</h3>'),
    ('data-i18n="sieveSub">选择筛子模型过滤机会，不选则展示全部</p>', 'data-i18n="sieveSub">Select a sieve model to filter opportunities, or view all</p>'),
    ('>管理筛子</button>', '>Manage Sieves</button>'),
    ('<!-- 动态渲染 by renderSieveSelector() -->', '<!-- Dynamically rendered by renderSieveSelector() -->'),
    ('<!-- 筛子说明 -->', '<!-- Sieve description -->'),
    ('>选择筛子后查看说明</span>', '>Select a sieve to view description</span>'),
    
    # Contract Board (lines 797-809)
    ('>合约看板</h2>', '>Contract Board</h2>'),
    ('>· 展示全部</span>', '>· Showing all</span>'),
    ('placeholder="搜索项目名称…"', 'placeholder="Search project name..."'),
    ('>全部状态</option>', '>All Status</option>'),
    ('>可买</option>', '>Available</option>'),
    ('>已售出</option>', '>Sold</option>'),
    ('>我的</option>', '>Mine</option>'),
    
    # Empty State (lines 819-846)
    ('>等待发起通的投资机会</h3>', '>Awaiting Investment Opportunities from Originate</h3>'),
    ('>机会由融资方通过发起通上传，经评估通筛子过滤后展示于此</p>', '>Opportunities are uploaded by fundraisers via Originate, filtered by Assess sieves and displayed here</p>'),
    ('>加载演示数据</h4>', '>Load Demo Data</h4>'),
    ('>体验完整功能，查看模拟的发起通项目经筛子过滤后的效果</p>', '>Experience full features with simulated Originate projects filtered by sieves</p>'),
    ('>配置您的筛子</h4>', '>Configure Your Sieves</h4>'),
    ('>在评估通中设置您的AI筛选标准，让参与通自动展示匹配机会</p>', '>Set your AI filtering criteria in Assess to automatically display matching opportunities</p>'),
    ('>数据流向</h4>', '>Data Flow</h4>'),
    ('>发起通</span></div>', '>Originate</span></div>'),
    ('>评估通筛子</span></div>', '>Assess Sieves</span></div>'),
    ('>参与通（此页）</span></div>', '>Deal Connect (This Page)</span></div>'),
    ('>条款通</span></div>', '>Terms Connect</span></div>'),
    ('>首次使用？<button', '>First time? <button'),
    ('>查看新手引导</button>', '>View user guide</button>'),
    
    # Detail page (lines 858-890)
    ('>返回</span></button>', '>Back</span></button>'),
    ('>项目名称</h1>', '>Project Name</h1>'),
    ('>待参与</span>', '>Pending</span>'),
    ('source-originate"><i class="fas fa-paper-plane"></i>发起通</span>', 'source-originate"><i class="fas fa-paper-plane"></i>Originate</span>'),
    ('>行业</span>', '>Industry</span>'),
    ('>日期</span>', '>Date</span>'),
    ("showToast('info','分享','分享链接已复制')", "showToast('info','Share','Share link copied')"),
    ('data-tip="分享"', 'data-tip="Share"'),
    ("showToast('info','收藏','已添加到收藏夹')", "showToast('info','Bookmark','Added to bookmarks')"),
    ('data-tip="收藏"', 'data-tip="Bookmark"'),
    ('>我要参与</button>', '>Express Interest</button>'),
    ('>加载中...</p>', '>Loading...</p>'),
    ('<!-- Right: Analysis (筛子评估结果) -->', '<!-- Right: Analysis (Sieve Assessment Results) -->'),
    ('>合约评估</span>', '>Contract Assessment</span>'),
    ('>雷达评估</button>', '>Radar Assessment</button>'),
    ('>财务</button>', '>Financials</button>'),
    ('>时间线</button>', '>Timeline</button>'),
    ('>选择一个项目查看筛子评估报告</p>', '>Select a contract to view sieve assessment report</p>'),
    
    # My Contracts page (lines 896-936)
    ('<!-- ==================== Page: 我的合约 ==================== -->', '<!-- ==================== Page: My Contracts ==================== -->'),
    ('>返回看板</span></button>', '>Back to Board</span></button>'),
    ('>我的合约</h1>', '>My Contracts</h1>'),
    ('>已认购 0 张 · 总投入 ¥0</p>', '>Subscribed 0 contracts · Total investment ¥0</p>'),
    ('placeholder="搜索合约名称/MCN…"', 'placeholder="Search contract/MCN..."'),
    ('>全部行业</option>', '>All Industries</option>'),
    ('>按认购时间</option>', '>By subscription date</option>'),
    ('>按AI评分</option>', '>By AI score</option>'),
    ('>按分成比例</option>', '>By revenue share</option>'),
    ('>按项目分组</option>', '>By project</option>'),
    ('<!-- 统计概览 -->', '<!-- Stats Overview -->'),
    ('<!-- 合约列表 -->', '<!-- Contract List -->'),
    ('<!-- 空状态 -->', '<!-- Empty State -->'),
    ('>暂无合约</h3>', '>No Contracts Yet</h3>'),
    ('>您还没有认购任何合约，去合约看板挑选吧</p>', '>You have not subscribed to any contracts yet. Browse the contract board to find opportunities.</p>'),
    ('>去认购</button>', '>Subscribe Now</button>'),
    
    # My Portfolios page (lines 938-974)
    ('<!-- ==================== Page: 我的组合 ==================== -->', '<!-- ==================== Page: My Portfolios ==================== -->'),
    ('>我的组合</h1>', '>My Portfolios</h1>'),
    ('>共 0 个组合 · 0 张合约 · 总投入 ¥0</p>', '>0 portfolios · 0 contracts · Total investment ¥0</p>'),
    ('>跨项目基金型组合 · 按投资理念和主题智能配置</div>', '>Cross-project fund portfolios · Intelligently configured by investment philosophy and theme</div>'),
    ('<!-- 组合筛选栏 -->', '<!-- Portfolio Filter Bar -->'),
    ('>全部</button>', '>All</button>'),
    ("filterPortfoliosByCategory('稳健型')", "filterPortfoliosByCategory('Conservative')"),
    ('data-cat="稳健型"', 'data-cat="Conservative"'),
    ('>稳健型</button>', '>Conservative</button>'),
    ("filterPortfoliosByCategory('进取型')", "filterPortfoliosByCategory('Aggressive')"),
    ('data-cat="进取型"', 'data-cat="Aggressive"'),
    ('>进取型</button>', '>Aggressive</button>'),
    ("filterPortfoliosByCategory('平衡型')", "filterPortfoliosByCategory('Balanced')"),
    ('data-cat="平衡型"', 'data-cat="Balanced"'),
    ('>平衡型</button>', '>Balanced</button>'),
    ("filterPortfoliosByCategory('主题型')", "filterPortfoliosByCategory('Thematic')"),
    ('data-cat="主题型"', 'data-cat="Thematic"'),
    ('>主题型</button>', '>Thematic</button>'),
    ("filterPortfoliosByCategory('行业型')", "filterPortfoliosByCategory('Industry')"),
    ('data-cat="行业型"', 'data-cat="Industry"'),
    ('>行业型</button>', '>Industry</button>'),
    ('<!-- 组合统计 -->', '<!-- Portfolio Stats -->'),
    ('<!-- 组合列表 -->', '<!-- Portfolio List -->'),
    ('>暂无组合</h3>', '>No Portfolios Yet</h3>'),
    ('>认购合约后自动生成投资组合</p>', '>Portfolios are automatically generated after subscribing to contracts</p>'),
    ('>去认购合约</button>', '>Subscribe to Contracts</button>'),
    
    # Portfolio Detail page (lines 980-1015)
    ('<!-- ==================== Page: 组合详情 ==================== -->', '<!-- ==================== Page: Portfolio Detail ==================== -->'),
    ('>返回组合</span></button>', '>Back to Portfolios</span></button>'),
    ('>组合名称</h1>', '>Portfolio Name</h1>'),
    ('>稳健型</span>', '>Conservative</span>'),
    ('>张合约 · 0 个项目 · 总投入', '>contracts · 0 projects · Total investment'),
    
    # Portfolio detail tabs
    ('>组合概览</button>', '>Portfolio Overview</button>'),
    ('>组合雷达图</button>', '>Portfolio Radar</button>'),
    ('>合约列表</button>', '>Contract List</button>'),
    ('>组合加权分析</span>', '>Portfolio Weighted Analysis</span>'),
    ('>跨项目合约等权重加权</span>', '>Cross-project equal-weight analysis</span>'),
    ('>加载组合加权分析</p>', '>Loading portfolio weighted analysis</p>'),
    
    # AI Builder page (lines 1021-1172)
    ('<!-- ==================== Page: AI 组合构建器 ==================== -->', '<!-- ==================== Page: AI Portfolio Builder ==================== -->'),
    ('>返回看板</span>', '>Back to Board</span>'),
    ('>组合构建器</span>', '>Portfolio Builder</span>'),
    ('>试点功能</span>\n', '>PILOT</span>\n'),
    ('>重新选择</button>', '>Start Over</button>'),
    
    # AI Builder layout comments  
    ('<!-- 左对话 + 右组合 双栏 -->', '<!-- Left chat + Right portfolio dual panel -->'),
    ('<!-- 左侧: AI 对话区 -->', '<!-- Left: AI Chat Area -->'),
    ('<!-- 对话消息区 -->', '<!-- Chat Messages Area -->'),
    ('<!-- 初始欢迎 -->', '<!-- Initial Welcome -->'),
    
    # AI Builder welcome message
    ('>您好！我是 <strong style="color:#3DD8CA;">参与通 AI 组合构建器</strong>。</p>', '>Hello! I am the <strong style="color:#3DD8CA;">Deal Connect AI Portfolio Builder</strong>.</p>'),
    ('>我将通过对话，了解您的投资偏好和目标，从平台全部合约中为您智能构建个性化投资组合。</p>', '>Through our conversation, I will understand your investment preferences and goals, and intelligently build a personalized portfolio from all platform contracts.</p>'),
    ('>我们先从一个简单的问题开始 —</p>', '>Let\'s start with a simple question —</p>'),
    ('>您这次投资最看重什么？</p>', '>What matters most to you in this investment?</p>'),
    
    # Quick options
    ('<!-- 快捷选项 -->', '<!-- Quick Options -->'),
    
    # Input area
    ('<!-- 输入区 -->', '<!-- Input Area -->'),
    ('placeholder="输入您的投资需求或偏好…"', 'placeholder="Describe your investment needs or preferences..."'),
    ('>实时分析您的需求，从 <strong><span id="abTotalContracts2">0</span></strong> 张合约中智能配置</span>', '>Analyzing your needs in real-time, intelligently configuring from <strong><span id="abTotalContracts2">0</span></strong> contracts</span>'),
    
    # Right panel
    ('<!-- 右侧: 实时组合面板 -->', '<!-- Right: Real-time Portfolio Panel -->'),
    ('<!-- 组合未生成时的等待状态 -->', '<!-- Waiting state before portfolio generation -->'),
    
    # Portfolio waiting state
    ('>等待 AI 构建您的专属组合</h3>', '>Waiting for AI to Build Your Portfolio</h3>'),
    ('>在左侧与 AI 对话，描述您的投资偏好。AI 将根据您的需求从全平台合约中实时构建投资组合。</p>', '>Chat with AI on the left to describe your investment preferences. AI will build a portfolio from all platform contracts based on your needs.</p>'),
    ('>风格偏好</span>', '>Style Preference</span>'),
    ('>行业选择</span>', '>Industry Selection</span>'),
    ('>组合生成</span>', '>Portfolio Generation</span>'),
    
    # Portfolio result panel
    ('<!-- 组合结果面板（初始隐藏） -->', '<!-- Portfolio Result Panel (initially hidden) -->'),
    ('<!-- 固定顶部：仅认购按钮 -->', '<!-- Fixed top: Subscribe button only -->'),
    ('>一键认购此组合</button>', '>Subscribe to This Portfolio</button>'),
    ('>继续调整</button>', '>Continue Adjusting</button>'),
    ('<!-- 可滚动区域：Header + 雷达图 + 行业配比 + 合约清单 -->', '<!-- Scrollable area: Header + Radar + Industry Mix + Contract List -->'),
    
    # Portfolio header in builder
    ('<!-- 组合 header -->', '<!-- Portfolio header -->'),
    ('>构建</span>', '>Building</span>'),
    ('>实时生成</span>', '>Real-time Generation</span>'),
    
    # Result panel details
    ('>推荐组合</h3>', '>Recommended Portfolio</h3>'),
    ('>基于您的投资偏好智能生成</p>', '>Intelligently generated based on your investment preferences</p>'),
    ('<!-- 核心数字 -->', '<!-- Core Numbers -->'),
    ('>张合约</p>', '>Contracts</p>'),
    ('>个项目</p>', '>Projects</p>'),
    ('>总投入</p>', '>Total Investment</p>'),
    ('>预期回报</p>', '>Expected Return</p>'),
    
    # Radar chart section
    ('<!-- 雷达图 -->', '<!-- Radar Chart -->'),
    ('>组合雷达评估</h4>', '>Portfolio Radar Assessment</h4>'),
    ('>维度量化</h4>', '>Dimension Metrics</h4>'),
    
    # Industry mix
    ('<!-- 行业配比 -->', '<!-- Industry Mix -->'),
    ('>行业配比</h4>', '>Industry Mix</h4>'),
    
    # Contract list in builder
    ('<!-- 合约清单 -->', '<!-- Contract List -->'),
    ('>推荐合约清单</h4>', '>Recommended Contract List</h4>'),
    
    # Confirm modal
    ('>确认操作</h3>', '>Confirm Action</h3>'),
    ('>确定要执行此操作吗？</p>', '>Are you sure you want to proceed?</p>'),
    ('>取消</button>', '>Cancel</button>'),
    ('>确认</button>', '>Confirm</button>'),
    
    # FAB (Floating Action Button)
    ('<!-- 全局浮动入口 -->', '<!-- Global Floating Entry -->'),
    ('>智能组合构建器</span>', '>AI Portfolio Builder</span>'),
    ('>与AI对话，一键构建投资组合</p>', '>Chat with AI, build portfolios in one click</p>'),
    
    # Mini chat
    ('>助手</span>', '>Assistant</span>'),
    ('>您好！我是参与通AI助手。您可以问我关于筛子模型、项目评估、参与流程等问题。</p>', '>Hello! I am the Deal Connect AI assistant. You can ask me about sieve models, project assessments, participation processes and more.</p>'),
    ('>例如：哪个筛子适合我？</span>', '>Example: Which sieve is right for me?</span>'),
    
    # Mobile nav (line 1229)
    ('<!-- 移动端底部导航 -->', '<!-- Mobile Bottom Nav -->'),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        # print(f"✅ {old[:50]}...")
    else:
        # Some may fail - that's OK, we'll catch them later
        pass

# Count
remaining = len(re.findall(r'[\u4e00-\u9fff]', content))
print(f"After batch 2 HTML: {remaining} Chinese chars remaining")

with open('src/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Batch 2 written successfully")
