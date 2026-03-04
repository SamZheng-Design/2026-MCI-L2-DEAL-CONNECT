#!/usr/bin/env python3
"""Batch 5B+C: Translate portfolio funds + remaining scattered Chinese."""
import re

with open('src/index.tsx', 'r') as f:
    content = f.read()

count = 0
def rep(old, new):
    global content, count
    if old in content:
        content = content.replace(old, new)
        count += 1

# ====== FUND PORTFOLIOS ======

# --- Conservative (S01-S04) ---
rep("name: '餐饮稳健S26'", "name: 'F&B Steady Income S26'")
rep("strategy: '精选头部餐饮品牌合约，聚焦现金流稳定的成熟门店，追求稳定分红收益'", 
    "strategy: 'Select top F&B brand contracts, focus on mature stores with stable cash flow, target steady dividend income'")
rep("targetPeriod: '24个月',\n        filter: function(c) { return c.industry === 'F&B' && parseFloat(c.aiScore) >= 7.5 && c.riskGrade !== 'B+'; }", 
    "targetPeriod: '24 months',\n        filter: function(c) { return c.industry === 'F&B' && parseFloat(c.aiScore) >= 7.5 && c.riskGrade !== 'B+'; }")

rep("name: '传统行业保守型'", "name: 'Traditional Industry Conservative'")
rep("strategy: '配置餐饮+零售等传统消费行业合约，优选运营年限长、评级A-以上的低波动项目'",
    "strategy: 'Allocate F&B + Retail consumer sector contracts, prefer long operating history, A- or above rating, low volatility'")
rep("targetPeriod: '24个月',\n        filter: function(c) { return (c.industry === 'F&B' || c.industry === 'Retail') && parseFloat(c.operatingYears) >= 2.5 && c.riskGrade !== 'B+'; }",
    "targetPeriod: '24 months',\n        filter: function(c) { return (c.industry === 'F&B' || c.industry === 'Retail') && parseFloat(c.operatingYears) >= 2.5 && c.riskGrade !== 'B+'; }")

rep("name: '医疗健康稳健1号'", "name: 'Healthcare Steady No.1'")
rep("strategy: '聚焦医疗健康赛道，配置高端医疗和体检龙头，享受大健康产业的确定性红利'",
    "strategy: 'Focus on healthcare sector, allocate premium medical and checkup leaders, capture health industry certainty dividends'")
rep("targetPeriod: '24-30个月',\n        filter: function(c) { return c.industry === 'Healthcare'; }",
    "targetPeriod: '24-30 months',\n        filter: function(c) { return c.industry === 'Healthcare'; }")

rep("strategy: '全行业精选A+评级蓝筹合约，只投最优质项目，以安全边际为第一原则'",
    "strategy: 'Cross-sector A+ rated blue-chip contracts only, invest in best-quality projects, safety margin as top priority'")
rep("targetIndustries: ['全行业'], targetReturn: '10-15%', targetPeriod: '18-36个月',\n        filter: function(c) { return c.riskGrade === 'A+' && parseFloat(c.aiScore) >= 8.5; }",
    "targetIndustries: ['All Sectors'], targetReturn: '10-15%', targetPeriod: '18-36 months',\n        filter: function(c) { return c.riskGrade === 'A+' && parseFloat(c.aiScore) >= 8.5; }")

# --- Aggressive (A01-A04) ---
rep("name: '全行业Alpha高收益型'", "name: 'All-Sector Alpha High Yield'")
rep("strategy: '全行业扫描高分成比例合约，追求绝对回报Alpha，适合风险承受能力强的投资者'",
    "strategy: 'Scan all sectors for high revenue-share contracts, pursue absolute return Alpha, suitable for risk-tolerant investors'")
rep("targetIndustries: ['全行业'], targetReturn: '13-18%', targetPeriod: '18-36个月',\n        filter: function(c) { return parseInt(c.revenueShare) >= 12 && parseFloat(c.aiScore) >= 8.0; }",
    "targetIndustries: ['All Sectors'], targetReturn: '13-18%', targetPeriod: '18-36 months',\n        filter: function(c) { return parseInt(c.revenueShare) >= 12 && parseFloat(c.aiScore) >= 8.0; }")

rep("strategy: '重仓AI、智能硬件、新能源科技合约，押注下一个十年的技术浪潮'",
    "strategy: 'Heavy allocation in AI, smart hardware, and NEV tech contracts — betting on the next decade of technology waves'")
rep("targetPeriod: '30-36个月',\n        filter: function(c) { return c.industry === 'Technology'; }",
    "targetPeriod: '30-36 months',\n        filter: function(c) { return c.industry === 'Technology'; }")

rep("name: '演艺IP爆发型'", "name: 'Entertainment IP Burst'")
rep("strategy: '配置顶流IP演艺项目，高分成+短周期，博取IP经济的爆发性收益'",
    "strategy: 'Allocate top-tier IP entertainment projects, high share + short cycle, capture explosive IP economy returns'")
rep("targetPeriod: '18-24个月',\n        filter: function(c) { return c.industry === 'Entertainment'; }",
    "targetPeriod: '18-24 months',\n        filter: function(c) { return c.industry === 'Entertainment'; }")

rep("strategy: '聚焦运营3年内的新锐品牌，以高成长性换取超额收益，适合长期持有'",
    "strategy: 'Focus on brands <3 yrs operating, high growth for excess returns, suitable for long-term hold'")
rep("targetIndustries: ['全行业'], targetReturn: '8-13%', targetPeriod: '24-30个月',\n        filter: function(c) { return parseFloat(c.operatingYears) <= 3.0 && parseFloat(c.aiScore) >= 7.5; }",
    "targetIndustries: ['All Sectors'], targetReturn: '8-13%', targetPeriod: '24-30 months',\n        filter: function(c) { return parseFloat(c.operatingYears) <= 3.0 && parseFloat(c.aiScore) >= 7.5; }")

# --- Balanced (B01-B04) ---
rep("name: '消费+科技双轮驱动'", "name: 'Consumer + Tech Dual Engine'")
rep("strategy: '50%配置稳定消费类（餐饮零售）+ 50%科技成长类，攻守兼备的经典组合'",
    "strategy: '50% stable consumer (F&B, Retail) + 50% tech growth — classic offensive-defensive balanced portfolio'")
rep("targetPeriod: '24-36个月',\n        filter: function(c) { return (c.industry === 'F&B' || c.industry === 'Retail' || c.industry === 'Technology') && parseFloat(c.aiScore) >= 7.5; }",
    "targetPeriod: '24-36 months',\n        filter: function(c) { return (c.industry === 'F&B' || c.industry === 'Retail' || c.industry === 'Technology') && parseFloat(c.aiScore) >= 7.5; }")

rep("name: '全天候均衡配置'", "name: 'All-Weather Balanced'")
rep("strategy: '横跨餐饮、零售、科技、健康、教育、演艺六大行业，通过分散化降低波动'",
    "strategy: 'Span F&B, Retail, Tech, Healthcare, Education, Entertainment — reduce volatility through diversification'")
rep("targetIndustries: ['全行业'], targetReturn: '9-13%', targetPeriod: '24-30个月',\n        filter: function(c) { return parseFloat(c.aiScore) >= 7.0; }",
    "targetIndustries: ['All Sectors'], targetReturn: '9-13%', targetPeriod: '24-30 months',\n        filter: function(c) { return parseFloat(c.aiScore) >= 7.0; }")

rep("name: '一线城市核心资产'", "name: 'Tier-1 City Core Assets'")
rep("strategy: '锁定北上广深杭五大核心城市优质项目，享受城市化和消费升级红利'",
    "strategy: 'Lock in top 5 tier-1 cities quality projects, capture urbanization and consumer upgrade dividends'")
rep("targetIndustries: ['全行业'], targetReturn: '8-14%', targetPeriod: '24-30个月',\n        filter: function(c) { return ['Beijing','Shanghai','Shenzhen','Guangzhou','Hangzhou'].indexOf(c.location) >= 0; }",
    "targetIndustries: ['All Sectors'], targetReturn: '8-14%', targetPeriod: '24-30 months',\n        filter: function(c) { return ['Beijing','Shanghai','Shenzhen','Guangzhou','Hangzhou'].indexOf(c.location) >= 0; }")

rep("name: '中等回报稳增长'", "name: 'Moderate Return Steady Growth'")
rep("strategy: '筛选分成比例9-13%的中等回报区间，兼顾收益与安全，适合大多数投资者'",
    "strategy: 'Select 9-13% revenue share mid-return range, balance yield and safety, suitable for most investors'")
rep("targetIndustries: ['全行业'], targetReturn: '9-13%', targetPeriod: '24-30个月',\n        filter: function(c) { var rs = parseInt(c.revenueShare); return rs >= 9 && rs <= 13 && parseFloat(c.aiScore) >= 7.5; }",
    "targetIndustries: ['All Sectors'], targetReturn: '9-13%', targetPeriod: '24-30 months',\n        filter: function(c) { var rs = parseInt(c.revenueShare); return rs >= 9 && rs <= 13 && parseFloat(c.aiScore) >= 7.5; }")

# --- Thematic (T01-T04) ---
rep("name: 'AI智能浪潮主题'", "name: 'AI Wave Thematic'")
rep("strategy: '捕捉AI产业链机会：从AI Lab到智慧城市到AI教育，一键布局人工智能全生态'",
    "strategy: 'Capture AI value chain: from AI Lab to Smart City to AI Education — one-click AI ecosystem allocation'")
rep("targetPeriod: '30-36个月',\n        filter: function(c) { return (c.industry === 'Technology' || c.industry === 'Education') && (c.name.indexOf('AI') >= 0 || c.name.indexOf('AI') >= 0 || c.name.indexOf('Technology') >= 0); }",
    "targetPeriod: '30-36 months',\n        filter: function(c) { return (c.industry === 'Technology' || c.industry === 'Education') && (c.name.indexOf('AI') >= 0 || c.name.indexOf('AI') >= 0 || c.name.indexOf('Technology') >= 0); }")

rep("strategy: '精选新茶饮、潮玩、新零售等Z世代消费品牌，把握年轻人消费升级浪潮'",
    "strategy: 'Select new tea, blind box, new retail Gen-Z consumer brands — ride the youth consumer upgrade wave'")
rep("targetPeriod: '24-30个月',\n        filter: function(c) { return (c.industry === 'F&B' || c.industry === 'Retail') && parseFloat(c.operatingYears) <= 4.0; }",
    "targetPeriod: '24-30 months',\n        filter: function(c) { return (c.industry === 'F&B' || c.industry === 'Retail') && parseFloat(c.operatingYears) <= 4.0; }")

rep("strategy: '仅配置24个月及以下短期合约，追求资金快速周转，灵活把握市场机会'",
    "strategy: 'Only ≤24-month short-term contracts, pursue fast capital turnover, flexibly seize market opportunities'")
rep("targetIndustries: ['全行业'], targetReturn: '7-13%', targetPeriod: '≤24个月',\n        filter: function(c) { var months = parseInt(c.period); return months <= 24; }",
    "targetIndustries: ['All Sectors'], targetReturn: '7-13%', targetPeriod: '≤24 months',\n        filter: function(c) { var months = parseInt(c.period); return months <= 24; }")

rep("strategy: '只配置融资额100万以上的大型旗舰项目，规模效应带来的稳定性溢价'",
    "strategy: 'Only ¥1M+ large flagship projects, capture stability premium from scale effect'")
rep("targetIndustries: ['全行业'], targetReturn: '11-16%', targetPeriod: '24-36个月',\n        filter: function(c) { return (c.projectTotalAmount || 0) >= 100; }",
    "targetIndustries: ['All Sectors'], targetReturn: '11-16%', targetPeriod: '24-36 months',\n        filter: function(c) { return (c.projectTotalAmount || 0) >= 100; }")

# --- Industry (I01-I04) ---
rep("strategy: '深度布局教育赛道，从K12到职教到AI教育，享受知识经济长期红利'",
    "strategy: 'Deep education sector play: K12 to vocational to AI education — capture knowledge economy long-term dividends'")
rep("targetPeriod: '30个月',\n        filter: function(c) { return c.industry === 'Education'; }",
    "targetPeriod: '30 months',\n        filter: function(c) { return c.industry === 'Education'; }")

rep("strategy: '布局零售消费全品类：从潮玩到日用到咖啡到物流，消费永不眠'",
    "strategy: 'Full retail spectrum: from blind boxes to daily goods to coffee to logistics — consumption never sleeps'")
rep("targetPeriod: '24-30个月',\n        filter: function(c) { return c.industry === 'Retail'; }",
    "targetPeriod: '24-30 months',\n        filter: function(c) { return c.industry === 'Retail'; }")

rep("name: '大消费产业链ETF'", "name: 'Consumer Chain ETF'")
rep("strategy: '餐饮+零售双行业联动，从上游品牌到下游渠道，覆盖消费产业全链条'",
    "strategy: 'F&B + Retail dual-sector synergy, from upstream brands to downstream channels — full consumer chain coverage'")
rep("targetPeriod: '24-30个月',\n        filter: function(c) { return c.industry === 'F&B' || c.industry === 'Retail'; }",
    "targetPeriod: '24-30 months',\n        filter: function(c) { return c.industry === 'F&B' || c.industry === 'Retail'; }")

rep("name: '科技+健康未来组合'", "name: 'Tech + Healthcare Future'")
rep("strategy: '双引擎驱动：科技代表效率革命，健康代表消费升级，两大确定性赛道叠加'",
    "strategy: 'Dual-engine: tech = efficiency revolution, healthcare = consumer upgrade — two certainty sectors combined'")
rep("targetIndustries: ['Technology', 'Healthcare'], targetReturn: '11-16%', targetPeriod: '24-36个月',",
    "targetIndustries: ['Technology', 'Healthcare'], targetReturn: '11-16%', targetPeriod: '24-36 months',")

# ====== Section comments for funds ======
rep("// ★ 20个预定义的跨项目基金型组合", "// ★ 20 predefined cross-project fund portfolios")
rep("// projectFilter: 函数，接收合约返回是否纳入该组合", "// projectFilter: function, takes contract and returns inclusion boolean")
rep("// === 稳健型 (4个) ===", "// === Conservative (4) ===")
rep("// === 进取型 (4个) ===", "// === Aggressive (4) ===")
rep("// === 平衡型 (4个) ===", "// === Balanced (4) ===")
rep("// === 主题型 (4个) ===", "// === Thematic (4) ===")
rep("// === 行业型 (4个) ===", "// === Industry (4) ===")

# ====== CITY_CODES: '全国' ======
rep("'全国': 'CN'", "'Nationwide': 'CN'")

# ====== Score '分' suffix in portfolio detail ======
# title="MCN — xx分"  
rep("co + '分\">'", "co + ' pts\">'")

# ====== Remaining ternary patterns with Chinese fallback ======
# '还有' fallback in AI builder contract list
rep("'还有 ' + (p.length - 30)", "'... ' + (p.length - 30)")

# ====== '全行业' in targetIndustries (remaining ones) ======
content = content.replace("targetIndustries: ['全行业']", "targetIndustries: ['All Sectors']")

print(f'Applied {count} replacements')

with open('src/index.tsx', 'w') as f:
    f.write(content)

print('Batch 5B+C complete!')
