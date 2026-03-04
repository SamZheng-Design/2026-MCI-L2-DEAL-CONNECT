#!/usr/bin/env python3
"""
Batch 3: Fix remaining HTML Chinese + set default lang to EN + fix JS logic Chinese
"""
import re

with open('src/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ===== PART A: Fix remaining HTML elements =====
html_fixes = [
    # Default language
    ("let currentLang = localStorage.getItem('dc_lang') || 'zh';", "let currentLang = localStorage.getItem('dc_lang') || 'en';"),
    
    # Portfolio detail page subtitle  
    ('>张合约 · 0 个项目 · 总投入', '>contracts · 0 projects · Total investment'),
    
    # Portfolio detail tabs (these may have already been caught but with different context)
    ('>组合概览</button>', '>Overview</button>'),
    
    # AI Builder page
    ('<!-- ==================== Page: AI 组合构建器 ==================== -->', '<!-- ==================== Page: AI Portfolio Builder ==================== -->'),
    ('>AI 智能组合构建器</div>', '>AI Portfolio Builder</div>'),
    ('>与AI对话，一键构建投资组合</div>', '>Chat with AI, build portfolios in one click</div>'),
    ('>Deal Connect AI 助手</span>', '>Deal Connect AI Assistant</span>'),
    ('>您好！我是参与通AI助手。您可以问我关于筛子模型、项目评估、参与流程等问题。</div>', '>Hello! I am the Deal Connect AI Assistant. Ask me about sieve models, project assessments, or the participation process.</div>'),
    ('placeholder="例如：哪个筛子适合我？"', 'placeholder="e.g., Which sieve suits me?"'),
    
    # Builder quick options (line 1062-1065)
    ("'>稳健型</span>", "'>Conservative</span>"),
    ("'>进取型</span>", "'>Aggressive</span>"),
    ("'>平衡型</span>", "'>Balanced</span>"),
    ("'>行业型</span>", "'>Industry</span>"),
    
    # Builder input placeholder
    ('placeholder="输入您的投资需求或偏好…"', 'placeholder="Describe your investment needs or preferences..."'),
    
    # AI Builder FAB  
    ('<!-- ==================== AI Builder 全局浮动入口 ==================== -->', '<!-- ==================== AI Builder Global FAB ==================== -->'),
    
    # Various HTML comments
    ('<!-- 左对话 + 右组合 双栏 -->', '<!-- Left chat + Right portfolio dual panel -->'),
    ('<!-- 左侧: AI 对话区 -->', '<!-- Left: AI Chat Area -->'),
    ('<!-- 对话消息区 -->', '<!-- Chat Messages Area -->'),
    ('<!-- 初始欢迎 -->', '<!-- Initial Welcome -->'),
    ('<!-- 快捷选项 -->', '<!-- Quick Options -->'),
    ('<!-- 输入区 -->', '<!-- Input Area -->'),
    ('<!-- 右侧: 实时组合面板 -->', '<!-- Right: Real-time Portfolio Panel -->'),
    ('<!-- 组合未生成时的等待状态 -->', '<!-- Waiting state before portfolio generation -->'),
    ('<!-- 组合结果面板（初始隐藏） -->', '<!-- Portfolio Result Panel (initially hidden) -->'),
    ('<!-- 固定顶部：仅认购按钮 -->', '<!-- Fixed top: Subscribe button -->'),
    ('<!-- 可滚动区域：Header + 雷达图 + 行业配比 + 合约清单 -->', '<!-- Scrollable: Header + Radar + Sector Mix + Contracts -->'),
    ('<!-- 组合 header -->', '<!-- Portfolio header -->'),
    ('<!-- 核心数字 -->', '<!-- Core Numbers -->'),
    ('<!-- 雷达图 -->', '<!-- Radar Chart -->'),
    ('<!-- 行业配比 -->', '<!-- Sector Mix -->'),
    ('<!-- 合约清单 -->', '<!-- Contract List -->'),
    ('<!-- 全局浮动入口 -->', '<!-- Global FAB -->'),
    ('<!-- 移动端底部导航 -->', '<!-- Mobile Bottom Nav -->'),
    
    # Remaining scattered HTML fixes
    ('>组合构建器</span>', '>Portfolio Builder</span>'),
    ('>推荐组合</h3>', '>Recommended Portfolio</h3>'),
    ('>组合雷达评估</h4>', '>Portfolio Radar Assessment</h4>'),
    ('>维度量化</h4>', '>Dimension Metrics</h4>'),
    ('>行业配比</h4>', '>Sector Allocation</h4>'),
    ('>推荐合约清单</h4>', '>Recommended Contracts</h4>'),
    ('>智能组合构建器</span>', '>AI Portfolio Builder</span>'),
    ('>助手</span>', '>Assistant</span>'),
    ('>构建</span>', '>Building</span>'),
    ('>实时生成</span>', '>Real-time</span>'),
    ('>试点功能</span>', '>PILOT</span>'),
    ('>重新选择</button>', '>Start Over</button>'),
]

for old, new in html_fixes:
    if old in content:
        content = content.replace(old, new)

print("Part A done: HTML fixes applied")

# ===== PART B: Fix JS logic Chinese (AFTER the en: block) =====
# These are in the JavaScript functions, data definitions, etc.

js_fixes = [
    # Data model: project names and descriptions in Chinese need English equivalents
    # These appear in the JS data arrays as hard-coded strings
    
    # Common JS strings
    ("'参与通'", "'Deal Connect'"),
    ("'发起通'", "'Originate'"),
    ("'评估通'", "'Assess'"),
    ("'条款通'", "'Terms Connect'"),
    ("'合约通'", "'Contract Connect'"),
    
    # Industries
    ("'餐饮'", "'F&B'"),
    ("'零售'", "'Retail'"),
    ("'科技'", "'Technology'"),
    ("'教育'", "'Education'"),
    ("'健康'", "'Healthcare'"),
    ("'演艺'", "'Entertainment'"),
    ("'医疗'", "'Healthcare'"),
    ("'物流'", "'Logistics'"),
    ("'地产'", "'Real Estate'"),
    ("'金融'", "'Finance'"),
    ("'农业'", "'Agriculture'"),
    ("'潮玩'", "'Trendy Toys'"),
    ("'互联网'", "'Internet'"),
    ("'人工智能'", "'AI'"),
    
    # Cities
    ("'杭州'", "'Hangzhou'"),
    ("'北京'", "'Beijing'"),
    ("'上海'", "'Shanghai'"),
    ("'深圳'", "'Shenzhen'"),
    ("'广州'", "'Guangzhou'"),
    ("'成都'", "'Chengdu'"),
    ("'天津'", "'Tianjin'"),
    ("'香港'", "'Hong Kong'"),
    ("'澳门'", "'Macau'"),
    
    # Provinces  
    ("'浙江'", "'Zhejiang'"),
    ("'安徽'", "'Anhui'"),
    
    # Portfolio categories in JS data
    ("'稳健型'", "'Conservative'"),
    ("'进取型'", "'Aggressive'"),
    ("'平衡型'", "'Balanced'"),
    ("'主题型'", "'Thematic'"),
    ("'行业型'", "'Industry'"),
    
    # Risk levels
    ("'低风险'", "'Low Risk'"),
    ("'中等风险'", "'Moderate Risk'"),
    ("'较高风险'", "'Higher Risk'"),
    ("'高风险'", "'High Risk'"),
    ("'中低风险'", "'Low-Moderate Risk'"),
    ("'中风险'", "'Moderate Risk'"),
    
    # Investment styles
    ("'保守'", "'Conservative'"),
    ("'稳健'", "'Steady'"),
    ("'平衡'", "'Balanced'"),
    ("'进取'", "'Aggressive'"),
    ("'激进'", "'Aggressive'"),
    
    # Status
    ("'生效中'", "'Active'"),
    ("'待生效'", "'Pending'"),
    ("'已签约'", "'Signed'"),
    ("'已售'", "'Sold'"),
    ("'待售'", "'Available'"),
    
    # Common terms
    ("'个月'", "'months'"),
    ("'万'", "'0K'"),
    ("'亿'", "'00M'"),
    ("'年'", "'yrs'"),
    ("'天'", "'days'"),
    ("'月'", "'mo'"),
    ("'张'", "''"),
    ("'位'", "''"),
    ("'个'", "''"),
    ("'人'", "''"),
    ("'台'", "''"),
    ("'家'", "''"),
    ("'元'", "''"),
    ("'份'", "''"),
    
    # Dimension names
    ("'收益率'", "'Yield'"),
    ("'期限'", "'Duration'"),
    ("'稳定性'", "'Stability'"),
    ("'风控'", "'Risk Mgmt'"),
    ("'流动性'", "'Liquidity'"),
    ("'团队'", "'Team'"),
    ("'市场'", "'Market'"),
    
    # Business names - translate project names
    ("'星巴克杭州西溪天堂店'", "'Starbucks Hangzhou Xixi Paradise'"),
    ("'星巴克'", "'Starbucks'"),
    ("'杭州星巴克运营有限公司'", "'Hangzhou Starbucks Operations Co., Ltd.'"),
    ("'喜茶上海南京西路概念店'", "'HEYTEA Shanghai Nanjing W Rd Concept Store'"),
    ("'喜茶'", "'HEYTEA'"),
    ("'深圳市品道餐饮管理有限公司'", "'Shenzhen Pindao F&B Management Co., Ltd.'"),
    ("'奈雪的茶深圳万象城旗舰店'", "'Nayuki Shenzhen MixC Flagship'"),
    ("'奈雪'", "'Nayuki'"),
    ("'深圳美西西餐饮管理有限公司'", "'Shenzhen Meixi F&B Management Co., Ltd.'"),
    ("'瑞幸咖啡深圳科技园集群店'", "'Luckin Coffee Shenzhen Tech Park Cluster'"),
    ("'瑞幸咖啡'", "'Luckin Coffee'"),
    ("'海底捞成都春熙路旗舰店'", "'Haidilao Chengdu Chunxi Rd Flagship'"),
    ("'海底捞成都运营总部'", "'Haidilao Chengdu Operations HQ'"),
    ("'海底捞西南区旗舰店'", "'Haidilao Southwest Flagship'"),
    ("'太二酸菜鱼广州天河城店'", "'Tai Er Fish Guangzhou Tianhe City'"),
    ("'太二餐饮管理有限公司'", "'Tai Er F&B Management Co., Ltd.'"),
    ("'九毛九旗下网红品牌'", "'Jiumaojiu Group Internet-Famous Brand'"),
    ("'名创优品上海环球港店'", "'MINISO Shanghai Global Harbor'"),
    ("'名创优品集团控股有限公司'", "'MINISO Group Holdings Ltd.'"),
    ("'全球化零售品牌'", "'Global Retail Brand'"),
    ("'泡泡玛特北京三里屯旗舰店'", "'Pop Mart Beijing Sanlitun Flagship'"),
    ("'泡泡玛特国际集团'", "'Pop Mart International Group'"),
    ("'盲盒零售标杆门店'", "'Blind Box Retail Benchmark Store'"),
    ("'顺丰同城急送杭州运营中心'", "'SF Same-City Express Hangzhou Center'"),
    ("'顺丰同城急送有限公司'", "'SF Same-City Express Co., Ltd.'"),
    ("'同城配送头部品牌'", "'Leading Same-City Delivery Brand'"),
    ("'新东方教育科技集团'", "'New Oriental Education & Technology Group'"),
    ("'新东方'", "'New Oriental'"),
    ("'猿辅导天津线下中心'", "'Yuanfudao Tianjin Offline Center'"),
    ("'北京猿力教育科技有限公司'", "'Beijing Yuanli Education Technology Co., Ltd.'"),
    ("'教育产业深耕者'", "'Deep-Rooted Education Industry Player'"),
    ("'和睦家北京'", "'United Family Hospital Beijing'"),
    ("'和睦家医疗集团'", "'United Family Healthcare Group'"),
    ("'高端私立医疗品牌'", "'Premium Private Healthcare Brand'"),
    ("'美年大健康上海浦东旗舰中心'", "'Meinian Onehealth Shanghai Pudong Flagship'"),
    ("'美年大健康产业控股股份有限公司'", "'Meinian Onehealth Industry Holdings Co., Ltd.'"),
    ("'高端体检'", "'Premium Health Check'"),
    ("'微医互联网医院杭州中心'", "'WeDoctor Internet Hospital Hangzhou Center'"),
    ("'微医集团'", "'WeDoctor Group'"),
    ("'蔚来汽车成都交付中心'", "'NIO Chengdu Delivery Center'"),
    ("'蔚来汽车科技'", "'NIO Technology'"),
    ("'新能源汽车交付'", "'NEV Delivery'"),
    ("'大疆创新农业无人机项目'", "'DJI Agriculture Drone Project'"),
    ("'深圳市大疆创新科技有限公司'", "'Shenzhen DJI Innovation Technology Co., Ltd.'"),
    ("'农业植保无人机'", "'Agricultural Protection Drone'"),
    ("'商汤科技智慧城市项目'", "'SenseTime Smart City Project'"),
    ("'商汤科技集团股份有限公司'", "'SenseTime Group Inc.'"),
    ("'大模型商业化项目'", "'Large Model Commercialization'"),
    ("'开心麻花全国巡演项目'", "'Mahua FunAge National Tour Project'"),
    ("'北京开心麻花娱乐文化传媒'", "'Beijing Mahua FunAge Entertainment & Culture Media'"),
    ("'话剧'", "'Theater'"),
    ("'周杰伦'", "'Jay Chou'"),
    ("'全球巡回演唱会'", "'World Concert Tour'"),
    ("'杰威尔音乐有限公司'", "'JVR Music Co., Ltd.'"),
    ("'字节跳动投融资管理部'", "'ByteDance Investment Management'"),
    ("'字节跳动'", "'ByteDance'"),
    
    # Portfolio names and descriptions
    ("'蓝筹价值守护者'", "'Blue Chip Value Guardian'"),
    ("'科技创新进取号'", "'Tech Innovation Aggressive'"),
    ("'健康未来组合'", "'Health Future Portfolio'"),
    ("'大消费产业链'", "'Consumer Industry Chain'"),
    ("'零售消费领航者'", "'Retail Consumer Navigator'"),
    ("'高成长新锐猎手'", "'High-Growth Newcomer Hunter'"),
    ("'智能浪潮主题'", "'AI Wave Theme'"),
    ("'新消费趋势精选'", "'New Consumer Trend Select'"),
    ("'餐饮稳健'", "'F&B Steady'"),
    ("'医疗健康稳健'", "'Healthcare Steady'"),
    ("'短周期快回收'", "'Short-Cycle Quick Return'"),
    ("'大额旗舰项目精选'", "'Large Flagship Select'"),
    
    # Strategy descriptions
    ("'精选头部餐饮品牌合约，聚焦现金流稳定的成熟门店'", "'Select top F&B brand contracts, focusing on mature stores with stable cash flow'"),
    ("'配置高端医疗和体检龙头，享受大健康产业的确定性红利'", "'Allocate to premium healthcare leaders, capturing definitive returns from the health industry'"),
    ("'追求资金快速周转'", "'Seeking rapid capital turnover'"),
    ("'聚焦分成期限'", "'Focus on revenue share duration'"),
    ("'筛选投资金额'", "'Filter by investment amount'"),
    
    # Common action/status terms in JS
    ("'加载中...'", "'Loading...'"),
    ("'加载中'", "'Loading'"),
    ("'暂无'", "'N/A'"),
    ("'确认'", "'Confirm'"),
    ("'取消'", "'Cancel'"),
    ("'完成'", "'Done'"),
    ("'关闭弹窗'", "'Close'"),
    ("'注册'", "'Register'"),
    ("'登录'", "'Login'"),
    ("'密码'", "'Password'"),
    ("'邮箱'", "'Email'"),
    ("'用户'", "'User'"),
    ("'投资者'", "'Investor'"),
    ("'管理者'", "'Manager'"),
    ("'游客'", "'Guest'"),
    ("'收藏'", "'Bookmark'"),
    ("'分享'", "'Share'"),
    ("'排序'", "'Sort'"),
    ("'筛选'", "'Filter'"),
    ("'搜索'", "'Search'"),
    ("'返回'", "'Back'"),
    ("'添加'", "'Add'"),
    ("'移除'", "'Remove'"),
    ("'全部'", "'All'"),
    ("'通过'", "'Pass'"),
    ("'未通过'", "'Fail'"),
    
    # Score grades
    ("'卓越'", "'Excellent'"),
    ("'优秀'", "'Outstanding'"),
    ("'良好'", "'Good'"),
    ("'中等'", "'Average'"),
    ("'偏低'", "'Below Avg'"),
    ("'风险'", "'Risk'"),
    
    # Unit strings
    ("'面值'", "'Face Value'"),
    ("'分成'", "'Rev. Share'"),
    ("'认购'", "'Subscribe'"),
    
    # Radar dimension names
    ("'收入稳定性'", "'Income Stability'"),
    ("'团队实力'", "'Team Strength'"),
    ("'市场潜力'", "'Market Potential'"),
    ("'风控评级'", "'Risk Rating'"),
]

for old, new in js_fixes:
    if old in content:
        content = content.replace(old, new)

print("Part B done: JS logic fixes applied")

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
