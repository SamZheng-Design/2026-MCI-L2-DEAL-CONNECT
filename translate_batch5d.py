#!/usr/bin/env python3
"""Batch 5D: Translate ALL remaining Chinese comments to English."""
import re

with open('src/index.tsx', 'r') as f:
    content = f.read()

count = 0
def rep(old, new):
    global content, count
    if old in content:
        content = content.replace(old, new)
        count += 1

# ====== Sieve section ======
rep("// ---- 筛子库扩展筛子 ----", "// ---- Extended sieves from library ----")
rep("// 「全部机会」内置筛子（不可删除）", "// 'All opportunities' built-in sieve (cannot delete)")
rep("// 用户面板筛子（从筛子库中选取的键名列表）", "// User panel sieves (selected sieve keys from library)")
rep("// 默认预装3个筛子", "// Default 3 pre-installed sieves")
rep("// 构建当前可用的筛子模型（all + mySieves中的）", "// Build available sieve models (all + user's mySieves)")

# ====== Keyboard shortcuts ======
rep("// ==================== 全局键盘快捷键 ====================", "// ==================== Global Keyboard Shortcuts ====================")
rep("// Escape 关闭弹窗", "// Escape to close modal")
rep("// Cmd/Ctrl + K 聚焦搜索", "// Cmd/Ctrl + K to focus search")

# ====== Browser history ======
rep("// ==================== 浏览器历史导航 ====================", "// ==================== Browser History Navigation ====================")

# ====== MCN system ======
rep("// ==================== MCN 合约编号体系 ====================", "// ==================== MCN Contract Numbering System ====================")
rep("// Format: MCN-{行业2位}-{城市2位}-{年月4位}-{序号4位}", "// Format: MCN-{Industry2}-{City2}-{YYMM4}-{Seq4}")

# ====== Contract generation ======
rep("// 只生成 actualGen 张合约（均匀采样）", "// Only generate actualGen contracts (uniform sampling)")
rep("// 均匀采样：从虚拟总数中按比例选取序号", "// Uniform sampling: select by proportion from virtual total")
rep("// 覆盖 seqInProject 为采样序号+1，保留 totalInProject 为虚拟总数", "// Override seqInProject as sampled index+1, keep totalInProject as virtual total")
rep("// 不再写入 localStorage（19K+ 对象会超过 5MB 配额导致卡死）", "// Skip localStorage (19K+ objects exceed 5MB quota and freeze browser)")

# ====== Radar scoring system ======
rep("// ==================== 合约多维度评估体系 ====================", "// ==================== Contract Multi-Dimension Assessment System ====================")
rep("// 8个维度：YITO年化收益率、合约时长适配度、收入稳定性、风控评级、流动性、团队实力、市场潜力、AI综合评分", "// 8 dimensions: Annual Yield, Duration Fit, Income Stability, Risk Control, Liquidity, Team Strength, Market Potential, AI Composite Score")
rep("// 根据deal数据计算各维度分数 (0-100)", "// Calculate dimension scores from deal data (0-100)")
rep("// 1. YITO年化收益率 — revenueShare 直接就是年化收益率(%)", "// 1. Annual Yield — revenueShare directly maps to annual yield (%)")
rep("// 2. Duration适配度 — 12-30个月为最优，偏离扣分", "// 2. Duration Fit — 12-30 months optimal, penalty for deviation")
rep("// 3. 收入稳定性 — 用月营收和行业推算", "// 3. Income Stability — from monthly revenue and industry")
rep("// 4. Risk Control — 直接映射", "// 4. Risk Control — direct mapping")
rep("// 5. Liquidity — 基于合约状态和项目热度", "// 5. Liquidity — based on contract status and project popularity")

# Portfolio calc comments
rep("// 1. Annual Yield（加权平均，面值相同故等于简单平均）", "// 1. Annual Yield (weighted avg, equal face values = simple avg)")
rep("// 2. 平均合约时长（月→天，加权平均）", "// 2. Avg duration (months→days, weighted avg)")
rep("// 3. 组合每月预估收入 — 所有底层合约预估月收的加总", "// 3. Portfolio est. monthly income — sum of all underlying contract income")
rep("// 每张合约月收 = 项目月营收(万) × 10000 × 分成比例(%) / 100 / 项目总合约数", "// Per-contract monthly = project revenue(10K) × 10000 × share(%) / 100 / total contracts")
rep("// 4. Risk Control — 取众数", "// 4. Risk Control — mode")
rep("// 5. Liquidity — 已售比例", "// 5. Liquidity — sold ratio")
rep("// 6. 平均运营年限", "// 6. Avg operating years")
rep("// 7. 行业分布", "// 7. Industry distribution")
rep("// 8. 平均AI评分", "// 8. Avg AI score")

# Score grading
rep("// 评分等级判定", "// Score grade determination")

# ====== Canvas radar chart ======
rep("// ==================== Canvas 雷达图绘制 ====================", "// ==================== Canvas Radar Chart Drawing ====================")
rep("// 清空", "// Clear")
rep("// 绘制背景网格（5层）", "// Draw background grid (5 layers)")
rep("// 20/40/60/80/100 标注", "// 20/40/60/80/100 labels")
rep("// 绘制轴线", "// Draw axis lines")
rep("// 绘制数据区域（渐变填充）", "// Draw data area (gradient fill)")
rep("// 渐变填充", "// Gradient fill")
rep("// 描边", "// Stroke")
rep("// 绘制数据点", "// Draw data points")
rep("// 外圈", "// Outer circle")
rep("// 内点", "// Inner dot")
rep("// 绘制维度标签", "// Draw dimension labels")
rep("// 显示实际值（优先）或分数", "// Show actual value (preferred) or score")
rep("// 标签名", "// Label name")
rep("// 对于左右两侧的标签，文字对齐方式调整", "// Adjust text alignment for left/right labels")

# Mini radar
rep("// 小型雷达图（用于卡片预览）", "// Mini radar chart (for card preview)")
rep("// 背景网格", "// Background grid")
rep("// 数据", "// Data")

# ====== Sieve selector rendering ======
rep("// ==================== 动态渲染筛子选择器 ====================", "// ==================== Dynamic Sieve Selector Rendering ====================")
rep("// 移除旧弹窗", "// Remove old modal")
rep("// Body — 双栏", "// Body — two columns")
rep("// 左栏：筛子库", "// Left column: sieve library")
rep("// 右栏：我的筛子", "// Right column: my sieves")

# ====== Sieve selection ======
rep("// ==================== 筛子选择 ====================", "// ==================== Sieve Selection ====================")
rep("// 持久化筛子选择", "// Persist sieve selection")
rep("// 更新UI（安全处理，因为可能从非 dashboard 页面调用）", "// Update UI (safe handling, may be called from non-dashboard pages)")
rep("// 获取当前可用筛子模型", "// Get current available sieve models")
rep("// 更新筛子说明（安全null检查）", "// Update sieve description (safe null check)")
rep("// 更新标签", "// Update labels")

# ====== Dashboard stats ======
rep("// Update stats — 客观维度总结（不做任何预设判断）", "// Update stats — objective dimension summary (no preset judgments)")
rep("// 我的组合 = 基金型跨项目组合数量", "// My portfolios = cross-project fund portfolio count")
rep("// Bloomberg Ticker 同步更新", "// Bloomberg Ticker sync update")
rep("// 更新AI入口卡片统计", "// Update AI entry card stats")
rep("// 更新AI统计卡片", "// Update AI stats cards")
rep("// Dynamic update欢迎副标题", "// Dynamic update welcome subtitle")

# ====== Deal card rendering ======
rep("// 计算雷达评分用于卡片展示", "// Calculate radar scores for card display")
rep("// Delay绘制卡片上的小雷达图", "// Delay draw mini radars on cards")

# ====== Subscribe modal ======
rep("// ==================== 认购弹窗 (单张合约) ====================", "// ==================== Subscribe Modal (Single Contract) ====================")
rep("// 更新数据：这张合约归当前用户", "// Update data: assign this contract to current user")
rep("// 同步回 allDeals", "// Sync back to allDeals")
rep("// 更新 projectSummaries 中对应项目的 mine 计数", "// Update mine count in projectSummaries for this project")
rep("// 更新参与按钮", "// Update subscribe button")

# ====== Deal detail ======
rep("// Left panel — 项目信息（来自发起通）", "// Left panel — project info (from Originate)")
rep("// MCN 编号卡片", "// MCN code card")
rep("// ==== 单张合约核心信息 ====", "// ==== Single contract core info ====")
rep("// Right panel — 雷达图评估 + 筛子结果", "// Right panel — radar assessment + sieve results")
rep("// 计算雷达评分", "// Calculate radar scores")
rep("// 生成各筛子的评估结果", "// Generate assessment results for each sieve")
rep("// 维度详细列表 HTML", "// Dimension detail list HTML")
rep("// ===== 合约雷达图评估 =====", "// ===== Contract radar assessment =====")
rep("// 头部：综合评分 + 等级", "// Header: composite score + grade")
rep("// 雷达图", "// Radar chart")
rep("// 维度缩略指标条 — 显示实际值", "// Dimension indicator bars — show actual values")
rep("// ===== 维度详解（可展开） =====", "// ===== Dimension details (expandable) =====")
rep("// 筛子匹配概览", "// Sieve match overview")
rep("// 各筛子评估结果", "// Individual sieve assessment results")
rep("// 收入预测", "// Revenue forecast")
rep("// 项目流向", "// Project flow")
rep("// Delay绘制雷达图（等DOM渲染完成）", "// Delay draw radar chart (wait for DOM render)")

# Dimension expand/collapse
rep("// 维度详解展开/折叠", "// Dimension detail expand/collapse")

# ====== Skeleton loading ======
rep("// ==================== 骨架屏加载效果 ====================", "// ==================== Skeleton Loading Effect ====================")
rep("// DOM 未就绪时延迟重试", "// Retry with delay when DOM not ready")
rep("// 合约数据由 loadDemoData() 按需生成（游客登录时调用）", "// Contract data generated by loadDemoData() on demand (called on guest login)")
rep("// Bloomberg风格实时时钟", "// Bloomberg-style real-time clock")

# ====== My Contracts page ======
rep("// ==================== 「我的合约」页面 ====================", "// ==================== My Contracts Page ====================")
rep("// 填充行业筛选", "// Populate industry filter")
rep("// 排序", "// Sort")
rep("// 统计\n", "// Stats\n")

# ====== My Portfolios page ======
rep("// ==================== 「我的组合」页面 ====================", "// ==================== My Portfolios Page ====================")
rep("// ★ 全新设计：跨项目基金型组合 — 像公募基金一样，按投资理念/主题/风格配置", "// ★ Cross-project fund portfolios — like mutual funds, configured by investment philosophy/theme/style")
rep("// 每个组合从不同项目中抽取合约，形成多元化投资组合", "// Each portfolio draws contracts from different projects, forming diversified investments")
rep("// 组合风格色彩映射", "// Portfolio style color mapping")
rep("// 统计涉及的项目和行业", "// Count projects and industries involved")
rep("// 计算组合的加权平均雷达评分", "// Calculate portfolio weighted-average radar scores")
rep("// 总统计（基于全部，不受筛选影响）", "// Overall stats (based on all, unaffected by filter)")
rep("// 组合统计", "// Portfolio stats")
rep("// Header — 基金名称和类型", "// Header — fund name and type")
rep("// 策略说明", "// Strategy description")
rep("// 组合配置信息", "// Portfolio config info")
rep("// 关键指标", "// Key metrics")
rep("// Initialize筛选按钮激活状态", "// Initialize filter button active state")

# ====== Portfolio detail page ======
rep("// ==================== 组合详情页 ====================", "// ==================== Portfolio Detail Page ====================")
rep("// 计算年化收益率（revenueShare 本身就是年化%，加权平均）", "// Calculate annual yield (revenueShare is annual %, weighted avg)")
rep("// 计算平均合约时长（月→天）", "// Calculate avg contract duration (months→days)")
rep("// === Left panel — 组合概览 ===", "// === Left panel — portfolio overview ===")
rep("// 按项目分组展示合约", "// Display contracts grouped by project")
rep("// 行业配比饼图数据", "// Industry allocation pie chart data")
rep("// 组合基本信息", "// Portfolio basic info")
rep("// 关键参数 — 显示年化收益率和实际天数", "// Key params — show annual yield and actual days")
rep("// 行业配比", "// Industry allocation")
rep("// 投资策略说明", "// Investment strategy description")
rep("// 按项目分组的合约清单", "// Contract list grouped by project")
rep("// Right panel — 加权雷达图 + 维度分析", "// Right panel — weighted radar + dimension analysis")
rep("// 各合约在此维度的分数", "// Each contract's score in this dimension")
rep("// 组合雷达图", "// Portfolio radar chart")
rep("// 维度详解", "// Dimension details")
rep("// 合约分布", "// Contract distribution")

# ====== AI Builder ======
rep("// Core Logic:通过多轮对话逐步了解投资者需求，从宽泛到具体", "// Core Logic: multi-round dialog to gradually understand investor needs, from broad to specific")
rep("// 每轮对话后，AI 实时更新右侧推荐组合", "// After each round, AI updates the right-panel recommended portfolio in real-time")
rep("// 对话引导流程", "// Conversation flow steps")
rep("// Step 0: 投资风格（已通过初始快捷选项触发）", "// Step 0: Investment style (triggered by initial quick-select)")
rep("// Step 1: 行业偏好", "// Step 1: Industry preference")
rep("// Step 2: 风险与回报参数", "// Step 2: Risk and return parameters")
rep("// Step 3: 投资期限", "// Step 3: Investment horizon")
rep("// Step 4: 预算规模", "// Step 4: Budget scale")
rep("// 调整wrapper的margin", "// Adjust wrapper margin")

# Spotlight
rep("// ===== 聚光灯效果 =====", "// ===== Spotlight Effect =====")
rep("// 给 dashboard 加标记让 AI卡片z-index提高", "// Mark dashboard to elevate AI card z-index")
rep("// 激活遮罩", "// Activate overlay")
rep("// 显示顶部提示标签", "// Show top hint label")
rep("// 显示底部 dismiss 提示", "// Show bottom dismiss hint")
rep("// 10秒后自动关闭（如果用户没手动关）", "// Auto-close after 10s (if user hasn't dismissed)")
rep("// Delay移除 class，让过渡动画完成", "// Delay class removal for transition animation")
rep("// 确保筛子已初始化", "// Ensure sieves are initialized")
rep("// 只设置 dealsList，不渲染 dashboard（避免 null 引用）", "// Only set dealsList, don't render dashboard (avoid null reference)")
rep("// 重置UI", "// Reset UI")
rep("// 重新生成欢迎消息", "// Regenerate welcome message")
rep("// 打字动画", "// Typing animation")
rep("// 移除当前快捷按钮（已点击）", "// Remove current quick buttons (already clicked)")
rep("// 解析用户选择并推进对话", "// Parse user selection and advance dialog")
rep("// Step 0: 解析投资风格 (support both zh + en keywords)", "// Step 0: Parse investment style (supports both zh + en keywords)")
rep("// Step 5+: 自由调整阶段", "// Step 5+: Free adjustment phase")
rep("// 行业选择（支持多选）", "// Industry selection (supports multi-select)")

# ====== Portfolio building ======
rep("// ★ 核心：根据当前状态从全部合约中构建组合", "// ★ Core: Build portfolio from all contracts based on current state")
rep("// 1. 行业筛选", "// 1. Industry filter")
rep("// 2. 风险筛选", "// 2. Risk filter")
rep("// 3. 期限筛选", "// 3. Duration filter")
rep("// 4. 排序（按 AI 评分降序 + 多样性）", "// 4. Sort (by AI score desc + diversity)")
rep("// 5. 预算限制 & 多样性选择", "// 5. Budget limit & diversity selection")
rep("// 每个项目最多选 N 张，保证多样性", "// Max N contracts per project for diversity")
rep("// 生成组合名称", "// Generate portfolio name")
rep("// 更新右侧面板", "// Update right panel")
rep("// 显示面板（安全检查）", "// Show panel (safety check)")
rep("// 计算统计", "// Calculate stats")
rep("// 计算年化收益率（revenueShare 本身就是年化%，加权平均）", "// Calculate annual yield (revenueShare = annual %, weighted avg)")
rep("// 核心数字", "// Core numbers")
rep("// 雷达图\n", "// Radar chart\n")
rep("// 维度网格 — 显示实际值而非评分，让投资者一眼看懂组合画像", "// Dimension grid — show actual values, not scores, for instant investor comprehension")
rep("// 行业配比\n", "// Industry allocation\n")
rep("// 合约清单\n", "// Contract list\n")

# ====== Init ======
rep("// ==================== 初始化入口 ====================", "// ==================== Initialization Entry ====================")
rep("// 立即启动初始化（不等待 DOMContentLoaded，因为 script 在 body 末尾）", "// Initialize immediately (no DOMContentLoaded needed, script is at body end)")

print(f'Applied {count} replacements')

with open('src/index.tsx', 'w') as f:
    f.write(content)

print('Batch 5D complete!')
