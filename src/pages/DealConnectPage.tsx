/**
 * ===================================================================
 * DealConnectPage.tsx -- 参与通完整独立页面 (V20)
 * ===================================================================
 *
 * 参与通是投资者的统一项目看板——展示通过评估通和风控通筛选后的融资项目，
 * 投资者在此主动参与投资。
 *
 * Y型流程中的位置:
 *   身份通(1) → 评估通(3) → 风控通(4) → 【参与通(5)】→ 条款通(6) → ...
 *
 * --- 页面结构(从上到下, 12个Section) ---
 *
 * 1.  面包屑导航     — 首页 > 产品入口 > 参与通
 * 2.  Hero区         — ProductLogo + 状态徽章 + 标题 + CTA
 * 3.  KPI概览卡片    — 筛后项目/全量项目/投资意向/平均评分
 * 4.  筛选控制条     — 搜索 + 全量/筛后切换 + 排序 + 视图切换
 * 5.  项目看板       — 卡片视图 / 列表视图 (核心功能区)
 * 6.  对比浮层       — 底部固定，选择≥2个项目时显示
 * 7.  智能推荐区     — 横向滚动推荐卡片
 * 8.  投资意向汇总   — 已标记意向的项目列表
 * 9.  数据管道可视化 — 发起通→评估通→风控通→参与通
 * 10. 空状态设计     — 筛后无匹配时的引导
 * 11. 前后步骤导航   — 风控通(←) / 条款通(→)
 * 12. Footer         — 共享Footer组件
 *
 * --- Props ---
 * @param lang - 当前语言 ('zh' | 'en')
 *
 * --- 数据 ---
 * 使用页面内 Mock 数据（不修改 data.ts）
 * 所有翻译使用页面内 TEXT 对象（不修改 i18n.ts）
 */
import type { FC } from 'hono/jsx'
import { products, getProductUrl, isExternalProduct } from '../data'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { ProductLogo } from '../components/Logos'
import type { Lang } from '../i18n'
import { langLink, tt, t, getProductName, getProductDesc, getProductFeatures, getCategoryName, getStatusLabel, getRoleLabel } from '../i18n'

// ═══════════════════════════════════════════════════════════════
// Mock 数据 & 类型定义
// ═══════════════════════════════════════════════════════════════

/** 行业数据映射 */
const INDUSTRIES = {
  catering: { zh: '餐饮', en: 'Catering', color: '#F59E0B', icon: 'fa-utensils' },
  retail: { zh: '零售', en: 'Retail', color: '#3B82F6', icon: 'fa-store' },
  beauty: { zh: '医美', en: 'Beauty', color: '#EC4899', icon: 'fa-spa' },
  education: { zh: '教育', en: 'Education', color: '#8B5CF6', icon: 'fa-graduation-cap' },
  fitness: { zh: '健身', en: 'Fitness', color: '#10B981', icon: 'fa-dumbbell' },
  healthcare: { zh: '大健康', en: 'Healthcare', color: '#06B6D4', icon: 'fa-heartbeat' },
} as const

type IndustryKey = keyof typeof INDUSTRIES

/** 融资项目数据接口 */
interface MockDeal {
  id: string
  name: { zh: string; en: string }
  industryKey: IndustryKey
  location: { zh: string; en: string }
  monthlyRevenue: number
  grossMargin: number
  operatingYears: number
  storeCount: number
  aiScore: number
  assessPassed: boolean
  riskPassed: boolean
  requestAmount: number
  revenueShareRate: number
  description: { zh: string; en: string }
  submittedAt: string
  status: 'active' | 'reviewing' | 'intent-marked'
}

/** 8条Mock项目数据 */
const MOCK_DEALS: MockDeal[] = [
  {
    id: 'deal-001',
    name: { zh: '张记川菜连锁', en: "Zhang's Sichuan Cuisine" },
    industryKey: 'catering',
    location: { zh: '成都', en: 'Chengdu' },
    monthlyRevenue: 68,
    grossMargin: 42,
    operatingYears: 5,
    storeCount: 12,
    aiScore: 8.6,
    assessPassed: true,
    riskPassed: true,
    requestAmount: 500,
    revenueShareRate: 8,
    description: { zh: '成都地区知名川菜品牌，5年稳健经营，12家直营门店', en: 'Well-known Sichuan cuisine brand in Chengdu, 5 years of stable operations, 12 direct-operated stores' },
    submittedAt: '2026-02-15',
    status: 'active',
  },
  {
    id: 'deal-002',
    name: { zh: '优品生鲜超市', en: 'UPin Fresh Market' },
    industryKey: 'retail',
    location: { zh: '深圳', en: 'Shenzhen' },
    monthlyRevenue: 120,
    grossMargin: 28,
    operatingYears: 3,
    storeCount: 8,
    aiScore: 7.9,
    assessPassed: true,
    riskPassed: true,
    requestAmount: 800,
    revenueShareRate: 6,
    description: { zh: '深圳社区生鲜连锁，聚焦最后一公里', en: 'Shenzhen community fresh food chain, focusing on last-mile delivery' },
    submittedAt: '2026-02-12',
    status: 'active',
  },
  {
    id: 'deal-003',
    name: { zh: '悦颜医美诊所', en: 'YueYan MedSpa' },
    industryKey: 'beauty',
    location: { zh: '上海', en: 'Shanghai' },
    monthlyRevenue: 95,
    grossMargin: 55,
    operatingYears: 4,
    storeCount: 3,
    aiScore: 8.2,
    assessPassed: true,
    riskPassed: true,
    requestAmount: 600,
    revenueShareRate: 10,
    description: { zh: '上海高端医美诊所，客单价高，复购率强', en: 'Shanghai premium medical aesthetics clinic, high AOV, strong repeat rate' },
    submittedAt: '2026-02-10',
    status: 'active',
  },
  {
    id: 'deal-004',
    name: { zh: '智学教育科技', en: 'SmartLearn EdTech' },
    industryKey: 'education',
    location: { zh: '北京', en: 'Beijing' },
    monthlyRevenue: 45,
    grossMargin: 62,
    operatingYears: 2,
    storeCount: 5,
    aiScore: 7.5,
    assessPassed: true,
    riskPassed: false,
    requestAmount: 300,
    revenueShareRate: 7,
    description: { zh: '在线+线下融合教育品牌，主攻K12素质教育', en: 'Online-offline hybrid education brand, focused on K12 quality education' },
    submittedAt: '2026-02-08',
    status: 'reviewing',
  },
  {
    id: 'deal-005',
    name: { zh: '乐活健身工厂', en: 'LOHAS Fitness Factory' },
    industryKey: 'fitness',
    location: { zh: '杭州', en: 'Hangzhou' },
    monthlyRevenue: 38,
    grossMargin: 48,
    operatingYears: 3,
    storeCount: 6,
    aiScore: 7.8,
    assessPassed: true,
    riskPassed: true,
    requestAmount: 250,
    revenueShareRate: 9,
    description: { zh: '杭州连锁健身品牌，会员留存率85%', en: 'Hangzhou chain fitness brand, 85% member retention rate' },
    submittedAt: '2026-02-05',
    status: 'active',
  },
  {
    id: 'deal-006',
    name: { zh: '康源大药房', en: 'KangYuan Pharmacy' },
    industryKey: 'healthcare',
    location: { zh: '广州', en: 'Guangzhou' },
    monthlyRevenue: 85,
    grossMargin: 35,
    operatingYears: 7,
    storeCount: 20,
    aiScore: 9.1,
    assessPassed: true,
    riskPassed: true,
    requestAmount: 1000,
    revenueShareRate: 5,
    description: { zh: '广州连锁药房，20家门店，政府医保定点', en: 'Guangzhou chain pharmacy, 20 stores, government medical insurance designated' },
    submittedAt: '2026-02-01',
    status: 'active',
  },
  {
    id: 'deal-007',
    name: { zh: '鲜茶道', en: 'FreshTea Way' },
    industryKey: 'catering',
    location: { zh: '长沙', en: 'Changsha' },
    monthlyRevenue: 52,
    grossMargin: 65,
    operatingYears: 2,
    storeCount: 15,
    aiScore: 8.0,
    assessPassed: true,
    riskPassed: true,
    requestAmount: 400,
    revenueShareRate: 8,
    description: { zh: '长沙新式茶饮品牌，15家门店覆盖核心商圈', en: 'Changsha new-style tea brand, 15 stores covering key commercial areas' },
    submittedAt: '2026-01-28',
    status: 'active',
  },
  {
    id: 'deal-008',
    name: { zh: '潮童乐园', en: 'TrendyKids Park' },
    industryKey: 'education',
    location: { zh: '南京', en: 'Nanjing' },
    monthlyRevenue: 30,
    grossMargin: 58,
    operatingYears: 1,
    storeCount: 2,
    aiScore: 6.8,
    assessPassed: true,
    riskPassed: false,
    requestAmount: 150,
    revenueShareRate: 12,
    description: { zh: '儿童室内游乐+早教综合体，坪效优秀', en: "Children indoor play + early education complex, excellent space efficiency" },
    submittedAt: '2026-01-25',
    status: 'reviewing',
  },
]

// ═══════════════════════════════════════════════════════════════
// 页面内双语翻译
// ═══════════════════════════════════════════════════════════════

const TEXT = {
  heroTitle: { zh: '参与通', en: 'Deal Connect' },
  heroSubtitle: { zh: '投资者统一项目看板', en: 'Unified Investor Deal Dashboard' },
  heroDesc: { zh: '浏览通过评估通和风控通筛选后的融资项目，主动参与投资决策。若未设置筛子，可浏览全量项目。', en: 'Browse borrower projects that passed Assess and Risk screening, and actively participate in investment decisions. If no filters are set, all projects are displayed.' },
  ctaViewBoard: { zh: '查看项目看板', en: 'View Deal Board' },
  ctaBrowseAll: { zh: '浏览全量项目', en: 'Browse All Deals' },
  // KPI 区
  kpiFilteredDeals: { zh: '筛后项目', en: 'Filtered Deals' },
  kpiTotalPipeline: { zh: '全量项目', en: 'Total Pipeline' },
  kpiIntents: { zh: '投资意向', en: 'Intents Marked' },
  kpiAvgScore: { zh: '平均AI评分', en: 'Avg AI Score' },
  kpiFilteredTrend: { zh: '较上月', en: 'vs last month' },
  kpiNewThisMonth: { zh: '本月新增', en: 'new this month' },
  kpiMarked: { zh: '已标记', en: 'marked' },
  kpiOutOf10: { zh: '满分10', en: 'out of 10' },
  // 筛选控制条
  filterSearch: { zh: '搜索项目名称、行业...', en: 'Search deal name, industry...' },
  filterAll: { zh: '全量', en: 'All' },
  filterFiltered: { zh: '筛后', en: 'Filtered' },
  sortLabel: { zh: '排序', en: 'Sort' },
  sortScore: { zh: 'AI评分', en: 'AI Score' },
  sortRevenue: { zh: '月流水', en: 'Revenue' },
  sortRecent: { zh: '最新', en: 'Recent' },
  viewCard: { zh: '卡片', en: 'Cards' },
  viewList: { zh: '列表', en: 'List' },
  // 项目卡片
  cardMonthlyRev: { zh: '月均流水', en: 'Monthly Rev.' },
  cardGrossMargin: { zh: '毛利率', en: 'Gross Margin' },
  cardYears: { zh: '经营年限', en: 'Years' },
  cardStores: { zh: '门店数', en: 'Stores' },
  cardAiScore: { zh: 'AI评分', en: 'AI Score' },
  cardRequestAmt: { zh: '融资金额', en: 'Funding Request' },
  cardRevenueShare: { zh: '分成比例', en: 'Rev. Share' },
  cardAssessPassed: { zh: '评估通过', en: 'Assess ✓' },
  cardRiskPassed: { zh: '风控通过', en: 'Risk ✓' },
  cardAssessPending: { zh: '评估中', en: 'Assessing' },
  cardRiskPending: { zh: '风控中', en: 'Reviewing' },
  cardMarkIntent: { zh: '标记意向', en: 'Mark Intent' },
  cardMarked: { zh: '已标记', en: 'Marked' },
  cardViewDetail: { zh: '查看详情', en: 'View Details' },
  cardCompare: { zh: '对比', en: 'Compare' },
  unitWan: { zh: '万', en: 'K' },
  unitYear: { zh: '年', en: 'yr' },
  unitStore: { zh: '家', en: '' },
  // 对比浮层
  compareSelected: { zh: '已选', en: 'Selected' },
  compareUnit: { zh: '个项目', en: 'deals' },
  compareStart: { zh: '开始对比', en: 'Compare' },
  compareClear: { zh: '清空', en: 'Clear' },
  // 智能推荐
  recommendTitle: { zh: '智能推荐', en: 'Smart Recommendations' },
  recommendSubtitle: { zh: '基于您的投资偏好和历史行为，AI为您推荐', en: 'AI recommendations based on your investment preferences' },
  recommendTopRated: { zh: '高评分', en: 'Top Rated' },
  recommendIndustryMatch: { zh: '行业匹配', en: 'Industry Match' },
  recommendGrowth: { zh: '增长强劲', en: 'Strong Growth' },
  // 投资意向汇总
  intentTitle: { zh: '投资意向汇总', en: 'Investment Intent Summary' },
  intentSubtitle: { zh: '您已标记投资意向的项目', en: 'Projects you have marked with investment intent' },
  intentEmpty: { zh: '暂未标记投资意向，浏览项目后点击❤️标记', en: 'No intents marked yet. Browse deals and click ❤️ to mark.' },
  intentNextStep: { zh: '进入条款协商', en: 'Proceed to Terms' },
  intentRemove: { zh: '移除', en: 'Remove' },
  // 数据管道可视化
  pipelineTitle: { zh: '数据管道', en: 'Data Pipeline' },
  pipelineSubtitle: { zh: '从发起通到参与通的完整筛选流程', en: 'Complete screening flow from Originate to Deal Connect' },
  pipelineOriginate: { zh: '发起通', en: 'Originate' },
  pipelineAssess: { zh: '评估通', en: 'Assess' },
  pipelineRisk: { zh: '风控通', en: 'Risk' },
  pipelineDeal: { zh: '参与通', en: 'Deal' },
  pipelineTotal: { zh: '总申请', en: 'Applications' },
  pipelinePassed: { zh: '通过', en: 'Passed' },
  pipelineRejected: { zh: '淘汰', en: 'Filtered' },
  pipelineNoFilter: { zh: '无筛子 = 展示全部项目', en: 'No filters = All projects displayed' },
  // 空状态
  emptyTitle: { zh: '暂无符合条件的项目', en: 'No Matching Deals Found' },
  emptyDesc: { zh: '尝试调整筛选条件，或浏览全量项目', en: 'Try adjusting your filters, or browse all projects' },
  emptyCtaAll: { zh: '浏览全量项目', en: 'Browse All Deals' },
  emptyCtaFilter: { zh: '修改筛子设置', en: 'Modify Filter Settings' },
  // 列表视图表头
  colNo: { zh: '#', en: '#' },
  colName: { zh: '项目名称', en: 'Deal Name' },
  colIndustry: { zh: '行业', en: 'Industry' },
  colRevenue: { zh: '月流水', en: 'Monthly Rev.' },
  colMargin: { zh: '毛利率', en: 'Margin' },
  colScore: { zh: 'AI评分', en: 'AI Score' },
  colStatus: { zh: '状态', en: 'Status' },
  colAction: { zh: '操作', en: 'Action' },
} as const

// ═══════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════

/** 金额格式化: 中文 ¥68万, 英文 ¥680K */
function formatAmount(wan: number, l: Lang): string {
  if (l === 'en') return `¥${wan * 10}K`
  return `¥${wan}万`
}

/** 获取行业信息 */
function getIndustry(key: IndustryKey) {
  return INDUSTRIES[key]
}

// ═══════════════════════════════════════════════════════════════
// 主页面组件
// ═══════════════════════════════════════════════════════════════

export const DealConnectPage: FC<{ lang?: Lang }> = ({ lang = 'zh' }) => {
  const l = lang
  const ll = (href: string) => langLink(href, l)

  // 从全局产品数据中获取参与通信息
  const product = products.find(p => p.id === 'opportunity')!
  const status = getStatusLabel(product.status, l)
  const role = getRoleLabel(product.role, l)
  const category = getCategoryName(product.category, l)
  const desc = getProductDesc(product.id, l) || product.description
  const pName = getProductName(product.id, l)

  // 前后步骤导航
  const sortedProducts = [...products].sort((a, b) => a.flowOrder - b.flowOrder)
  const currentIdx = sortedProducts.findIndex(p => p.id === 'opportunity')
  const prevProduct = currentIdx > 0 ? sortedProducts[currentIdx - 1] : null
  const nextProduct = currentIdx < sortedProducts.length - 1 ? sortedProducts[currentIdx + 1] : null

  // 数据统计
  const filteredDeals = MOCK_DEALS.filter(d => d.assessPassed && d.riskPassed)
  const totalDeals = MOCK_DEALS.length
  const intentCount = MOCK_DEALS.filter(d => d.status === 'intent-marked').length
  const avgScore = (MOCK_DEALS.reduce((sum, d) => sum + d.aiScore, 0) / totalDeals).toFixed(1)

  return (
    <div class="min-h-screen">
      <Navbar active="" lang={l} />

      {/* ═══ Section 1: 面包屑导航 ═══ */}
      <div class="bg-gray-50 border-b border-gray-100">
        <div class="max-w-4xl mx-auto px-4 py-3">
          <nav class="flex items-center gap-2 text-xs text-gray-400">
            <a href={ll('/')} class="hover:text-[#5DC4B3] transition-colors no-underline"><i class="fas fa-home text-[10px]"></i></a>
            <i class="fas fa-chevron-right text-[8px] text-gray-300"></i>
            <a href={ll('/portal')} class="hover:text-[#5DC4B3] transition-colors no-underline">{tt(t.placeholder.breadPortal, l)}</a>
            <i class="fas fa-chevron-right text-[8px] text-gray-300"></i>
            <span class="text-[#1d1d1f] font-semibold">{pName}</span>
          </nav>
        </div>
      </div>

      {/* ═══ Section 2: Hero区 ═══ */}
      <section class="relative overflow-hidden pt-16 pb-12 bg-gradient-to-br from-white via-gray-50 to-[#10B981]/5">
        <div class="absolute inset-0 dot-pattern opacity-20"></div>
        <div class="max-w-4xl mx-auto px-4 relative text-center">
          {/* ProductLogo */}
          <div class="mb-6 flex justify-center reveal">
            <ProductLogo name={product.name} englishShort={product.englishShort} size={96} />
          </div>

          {/* 状态徽章 */}
          <div class="reveal stagger-1">
            <span class={`inline-flex items-center text-xs px-3 py-1 rounded-full border font-medium mb-4 ${status.class}`}>
              {status.text}
            </span>
          </div>

          {/* 主标题 */}
          <h1 class="text-3xl md:text-4xl font-extrabold text-[#1d1d1f] mb-1 reveal stagger-2">{pName}</h1>

          {/* 英文副标题 */}
          <p class="text-sm text-gray-400 mb-2 reveal stagger-2">{tt(TEXT.heroSubtitle, l)}</p>

          {/* 描述 */}
          <p class="text-base text-gray-500 max-w-lg mx-auto leading-relaxed mb-4 reveal stagger-3">{tt(TEXT.heroDesc, l)}</p>

          {/* 标签行 */}
          <div class="flex justify-center gap-2 mb-6 reveal stagger-3">
            <span class="inline-flex items-center text-xs px-3 py-1 rounded-lg font-semibold bg-[#5DC4B3]/10 text-[#5DC4B3] border border-[#5DC4B3]/20">
              <i class="fas fa-layer-group mr-1.5"></i>{category}
            </span>
            {role && (
              <span class={`inline-flex items-center text-xs px-3 py-1 rounded-lg font-semibold border ${role.class}`}>
                <i class={`fas ${role.icon} mr-1.5`}></i>{role.text}
              </span>
            )}
          </div>

          {/* CTA 按钮 */}
          <div class="flex justify-center gap-3 reveal stagger-4">
            <a href="#deal-board" class="inline-flex items-center px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl shadow-lg shadow-[#10B981]/25 transition-all no-underline">
              <i class="fas fa-th-large mr-2"></i>{tt(TEXT.ctaViewBoard, l)}
            </a>
            <a href="#deal-board" onclick="switchFilterMode('all')" class="inline-flex items-center px-6 py-3 border border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/5 font-bold rounded-xl transition-all no-underline">
              <i class="fas fa-database mr-2"></i>{tt(TEXT.ctaBrowseAll, l)}
            </a>
          </div>
        </div>
      </section>

      {/* ═══ Section 3: KPI概览卡片 ═══ */}
      <section class="py-10 bg-white">
        <div class="max-w-6xl mx-auto px-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 reveal">
            {/* KPI 1: 筛后项目 */}
            <div class="bg-white rounded-xl border border-gray-100 p-5 stagger-1 hover:shadow-md transition-shadow">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                  <i class="fas fa-filter text-[#10B981] text-sm"></i>
                </div>
                <span class="text-xs text-[#6e6e73]">{tt(TEXT.kpiFilteredDeals, l)}</span>
              </div>
              <div class="flex items-end gap-2">
                <span id="kpi-filtered" class="text-2xl font-extrabold text-[#1d1d1f] font-mono">{filteredDeals.length}</span>
                <span class="text-xs text-green-500 font-semibold mb-0.5"><i class="fas fa-arrow-up text-[8px] mr-0.5"></i>12%</span>
              </div>
              <p class="text-[10px] text-[#86868b] mt-1">{tt(TEXT.kpiFilteredTrend, l)}</p>
            </div>

            {/* KPI 2: 全量项目 */}
            <div class="bg-white rounded-xl border border-gray-100 p-5 stagger-2 hover:shadow-md transition-shadow">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <i class="fas fa-database text-blue-500 text-sm"></i>
                </div>
                <span class="text-xs text-[#6e6e73]">{tt(TEXT.kpiTotalPipeline, l)}</span>
              </div>
              <div class="flex items-end gap-2">
                <span class="text-2xl font-extrabold text-[#1d1d1f] font-mono">238</span>
                <span class="text-xs text-blue-500 font-semibold mb-0.5">+18</span>
              </div>
              <p class="text-[10px] text-[#86868b] mt-1">{tt(TEXT.kpiNewThisMonth, l)}</p>
            </div>

            {/* KPI 3: 投资意向 */}
            <div class="bg-white rounded-xl border border-gray-100 p-5 stagger-3 hover:shadow-md transition-shadow">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <i class="fas fa-heart text-red-400 text-sm"></i>
                </div>
                <span class="text-xs text-[#6e6e73]">{tt(TEXT.kpiIntents, l)}</span>
              </div>
              <div class="flex items-end gap-2">
                <span id="kpi-intents" class="text-2xl font-extrabold text-[#1d1d1f] font-mono">12</span>
              </div>
              <p class="text-[10px] text-[#86868b] mt-1">{tt(TEXT.kpiMarked, l)}</p>
            </div>

            {/* KPI 4: 平均评分 */}
            <div class="bg-white rounded-xl border border-gray-100 p-5 stagger-4 hover:shadow-md transition-shadow">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <i class="fas fa-star text-amber-500 text-sm"></i>
                </div>
                <span class="text-xs text-[#6e6e73]">{tt(TEXT.kpiAvgScore, l)}</span>
              </div>
              <div class="flex items-end gap-2">
                <span class="text-2xl font-extrabold text-[#1d1d1f] font-mono">{avgScore}</span>
                <span class="text-xs text-[#86868b] font-semibold mb-0.5">/10</span>
              </div>
              <p class="text-[10px] text-[#86868b] mt-1">{tt(TEXT.kpiOutOf10, l)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Section 4: 筛选控制条 ═══ */}
      <div class="sticky top-[56px] z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100 py-3">
        <div class="max-w-6xl mx-auto px-4">
          <div class="flex flex-col md:flex-row items-center gap-3">
            {/* 搜索框 */}
            <div class="relative flex-1 w-full md:w-auto">
              <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#aeaeb2] text-xs"></i>
              <input
                type="text"
                id="deal-search"
                placeholder={tt(TEXT.filterSearch, l)}
                class="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 transition-all outline-none"
                oninput="filterDeals()"
              />
            </div>

            {/* 全量/筛后切换 */}
            <div class="flex bg-gray-100 rounded-lg p-0.5">
              <button id="filter-all" onclick="switchFilterMode('all')" class="px-4 py-2 text-xs font-semibold rounded-md transition-all bg-[#10B981] text-white">
                {tt(TEXT.filterAll, l)} <span class="ml-1 opacity-80">238</span>
              </button>
              <button id="filter-filtered" onclick="switchFilterMode('filtered')" class="px-4 py-2 text-xs font-semibold rounded-md transition-all text-[#6e6e73]">
                {tt(TEXT.filterFiltered, l)} <span class="ml-1 opacity-80" id="filter-count">{filteredDeals.length}</span>
              </button>
            </div>

            {/* 排序 */}
            <select id="deal-sort" onchange="sortDeals()" class="px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-[#6e6e73] focus:border-[#10B981] outline-none cursor-pointer">
              <option value="score">{tt(TEXT.sortScore, l)}</option>
              <option value="revenue">{tt(TEXT.sortRevenue, l)}</option>
              <option value="recent">{tt(TEXT.sortRecent, l)}</option>
            </select>

            {/* 视图切换 */}
            <div class="flex bg-gray-100 rounded-lg p-0.5">
              <button id="view-card" onclick="switchView('card')" class="px-3 py-2 rounded-md transition-all bg-white text-[#10B981] shadow-sm" title={tt(TEXT.viewCard, l)}>
                <i class="fas fa-th-large text-xs"></i>
              </button>
              <button id="view-list" onclick="switchView('list')" class="px-3 py-2 rounded-md transition-all text-[#86868b]" title={tt(TEXT.viewList, l)}>
                <i class="fas fa-list text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Section 5: 项目看板 (核心功能区) ═══ */}
      <section id="deal-board" class="py-8 bg-gray-50/50 min-h-[400px]">
        <div class="max-w-6xl mx-auto px-4">

          {/* 5A: 卡片视图 (默认显示) */}
          <div id="card-view" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {MOCK_DEALS.map((deal, idx) => {
              const ind = getIndustry(deal.industryKey)
              const passed = deal.assessPassed && deal.riskPassed
              return (
                <div
                  class={`card-hover bg-white rounded-xl border border-gray-100 overflow-hidden reveal stagger-${Math.min(idx + 1, 8)}`}
                  data-deal-id={deal.id}
                  data-filtered={passed ? 'true' : 'false'}
                  data-industry={deal.industryKey}
                  data-score={deal.aiScore}
                  data-revenue={deal.monthlyRevenue}
                  data-date={deal.submittedAt}
                >
                  {/* 顶部色条 */}
                  <div class="h-1" style={`background: linear-gradient(90deg, ${ind.color}, ${ind.color}88)`}></div>

                  <div class="p-5">
                    {/* 行业标签 + 日期 */}
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-xs px-2 py-0.5 rounded-md font-medium" style={`background: ${ind.color}15; color: ${ind.color}`}>
                        <i class={`fas ${ind.icon} mr-1 text-[10px]`}></i>{l === 'zh' ? ind.zh : ind.en}
                      </span>
                      <span class="text-[10px] text-[#aeaeb2]">{deal.submittedAt}</span>
                    </div>

                    {/* 项目名称 + 地点 */}
                    <h3 class="text-base font-bold text-[#1d1d1f] mb-1">{tt(deal.name, l)}</h3>
                    <p class="text-xs text-[#86868b] mb-1"><i class="fas fa-map-marker-alt mr-1 text-[10px]"></i>{tt(deal.location, l)}</p>
                    <p class="text-xs text-[#6e6e73] mb-3 line-clamp-2">{tt(deal.description, l)}</p>

                    {/* 关键指标 2x2 */}
                    <div class="grid grid-cols-2 gap-2 mb-3">
                      <div class="bg-gray-50 rounded-lg p-2">
                        <div class="text-[10px] text-[#86868b]">{tt(TEXT.cardMonthlyRev, l)}</div>
                        <div class="text-sm font-bold text-[#1d1d1f]">{formatAmount(deal.monthlyRevenue, l)}</div>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-2">
                        <div class="text-[10px] text-[#86868b]">{tt(TEXT.cardGrossMargin, l)}</div>
                        <div class="text-sm font-bold text-[#1d1d1f]">{deal.grossMargin}%</div>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-2">
                        <div class="text-[10px] text-[#86868b]">{tt(TEXT.cardYears, l)}</div>
                        <div class="text-sm font-bold text-[#1d1d1f]">{deal.operatingYears}{l === 'zh' ? '年' : 'yr'}</div>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-2">
                        <div class="text-[10px] text-[#86868b]">{tt(TEXT.cardStores, l)}</div>
                        <div class="text-sm font-bold text-[#1d1d1f]">{deal.storeCount}{l === 'zh' ? '家' : ''}</div>
                      </div>
                    </div>

                    {/* AI评分条 */}
                    <div class="flex items-center gap-2 mb-3">
                      <div class="text-xs font-bold text-[#10B981]">AI {deal.aiScore}</div>
                      <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-[#10B981] to-[#34d399] rounded-full" style={`width:${deal.aiScore * 10}%`}></div>
                      </div>
                    </div>

                    {/* 筛选通过徽章 */}
                    <div class="flex gap-1.5 mb-3">
                      {deal.assessPassed ? (
                        <span class="text-[10px] px-2 py-0.5 rounded-md bg-green-50 text-green-600 border border-green-100">
                          <i class="fas fa-check-circle mr-0.5"></i>{tt(TEXT.cardAssessPassed, l)}
                        </span>
                      ) : (
                        <span class="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
                          <i class="fas fa-clock mr-0.5"></i>{tt(TEXT.cardAssessPending, l)}
                        </span>
                      )}
                      {deal.riskPassed ? (
                        <span class="text-[10px] px-2 py-0.5 rounded-md bg-green-50 text-green-600 border border-green-100">
                          <i class="fas fa-shield-alt mr-0.5"></i>{tt(TEXT.cardRiskPassed, l)}
                        </span>
                      ) : (
                        <span class="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
                          <i class="fas fa-clock mr-0.5"></i>{tt(TEXT.cardRiskPending, l)}
                        </span>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div class="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        id={`intent-btn-${deal.id}`}
                        onclick={`toggleIntent('${deal.id}')`}
                        class="flex-1 text-xs py-2 rounded-lg bg-[#10B981] text-white font-semibold hover:bg-[#059669] transition-colors"
                      >
                        <i class="far fa-heart mr-1"></i>{tt(TEXT.cardMarkIntent, l)}
                      </button>
                      <button
                        id={`compare-btn-${deal.id}`}
                        onclick={`toggleCompare('${deal.id}')`}
                        class="text-xs px-3 py-2 rounded-lg border border-gray-200 text-[#6e6e73] hover:border-[#10B981] hover:text-[#10B981] transition-colors"
                        title={tt(TEXT.cardCompare, l)}
                      >
                        <i class="fas fa-balance-scale"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 5B: 列表视图 (默认隐藏) */}
          <div id="list-view" class="hidden">
            <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table class="w-full">
                <thead>
                  <tr class="bg-gray-50">
                    <th class="text-left text-[10px] uppercase tracking-wider text-[#86868b] font-semibold px-4 py-3">{tt(TEXT.colNo, l)}</th>
                    <th class="text-left text-[10px] uppercase tracking-wider text-[#86868b] font-semibold px-4 py-3">{tt(TEXT.colName, l)}</th>
                    <th class="text-left text-[10px] uppercase tracking-wider text-[#86868b] font-semibold px-4 py-3">{tt(TEXT.colIndustry, l)}</th>
                    <th class="text-left text-[10px] uppercase tracking-wider text-[#86868b] font-semibold px-4 py-3">{tt(TEXT.colRevenue, l)}</th>
                    <th class="text-left text-[10px] uppercase tracking-wider text-[#86868b] font-semibold px-4 py-3">{tt(TEXT.colMargin, l)}</th>
                    <th class="text-left text-[10px] uppercase tracking-wider text-[#86868b] font-semibold px-4 py-3">{tt(TEXT.colScore, l)}</th>
                    <th class="text-left text-[10px] uppercase tracking-wider text-[#86868b] font-semibold px-4 py-3">{tt(TEXT.colStatus, l)}</th>
                    <th class="text-left text-[10px] uppercase tracking-wider text-[#86868b] font-semibold px-4 py-3">{tt(TEXT.colAction, l)}</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_DEALS.map((deal, idx) => {
                    const ind = getIndustry(deal.industryKey)
                    const passed = deal.assessPassed && deal.riskPassed
                    return (
                      <tr
                        class="border-b border-gray-100 hover:bg-[#D1FAE5]/10 transition-colors"
                        data-deal-row={deal.id}
                        data-filtered={passed ? 'true' : 'false'}
                      >
                        <td class="px-4 py-3 text-xs text-[#86868b] font-mono">{String(idx + 1).padStart(2, '0')}</td>
                        <td class="px-4 py-3">
                          <div class="text-sm font-semibold text-[#1d1d1f]">{tt(deal.name, l)}</div>
                          <div class="text-[10px] text-[#aeaeb2]">{tt(deal.location, l)}</div>
                        </td>
                        <td class="px-4 py-3">
                          <span class="text-xs px-2 py-0.5 rounded-md font-medium" style={`background: ${ind.color}15; color: ${ind.color}`}>
                            {l === 'zh' ? ind.zh : ind.en}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-sm font-semibold text-[#1d1d1f] font-mono">{formatAmount(deal.monthlyRevenue, l)}</td>
                        <td class="px-4 py-3 text-sm text-[#1d1d1f]">{deal.grossMargin}%</td>
                        <td class="px-4 py-3">
                          <span class="text-sm font-bold text-[#10B981]">{deal.aiScore}</span>
                        </td>
                        <td class="px-4 py-3">
                          {passed ? (
                            <span class="text-[10px] px-2 py-0.5 rounded-md bg-green-50 text-green-600"><i class="fas fa-check mr-0.5"></i>{l === 'zh' ? '已通过' : 'Passed'}</span>
                          ) : (
                            <span class="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-600"><i class="fas fa-clock mr-0.5"></i>{l === 'zh' ? '审核中' : 'Reviewing'}</span>
                          )}
                        </td>
                        <td class="px-4 py-3">
                          <div class="flex gap-1">
                            <button onclick={`toggleIntent('${deal.id}')`} class="text-[10px] px-2 py-1 rounded-md bg-[#10B981] text-white hover:bg-[#059669] transition-colors">
                              <i class="far fa-heart mr-0.5"></i>{l === 'zh' ? '意向' : 'Intent'}
                            </button>
                            <button onclick={`toggleCompare('${deal.id}')`} class="text-[10px] px-2 py-1 rounded-md border border-gray-200 text-[#6e6e73] hover:text-[#10B981] hover:border-[#10B981] transition-colors">
                              <i class="fas fa-balance-scale"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 10: 空状态 (默认隐藏，筛后无匹配时显示) */}
          <div id="empty-state" class="hidden py-20 text-center">
            <i class="fas fa-search text-gray-200 text-6xl mb-6"></i>
            <h3 class="text-xl font-bold text-[#86868b] mb-2">{tt(TEXT.emptyTitle, l)}</h3>
            <p class="text-sm text-[#aeaeb2] mb-8 max-w-md mx-auto">{tt(TEXT.emptyDesc, l)}</p>
            <div class="flex justify-center gap-3">
              <a href={ll('/assess')} class="inline-flex items-center px-5 py-2.5 border border-gray-200 text-[#6e6e73] hover:border-[#5DC4B3] hover:text-[#5DC4B3] font-semibold rounded-xl transition-all no-underline text-sm">
                <i class="fas fa-sliders-h mr-2"></i>{tt(TEXT.emptyCtaFilter, l)}
              </a>
              <button onclick="switchFilterMode('all')" class="inline-flex items-center px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-xl transition-all text-sm">
                <i class="fas fa-database mr-2"></i>{tt(TEXT.emptyCtaAll, l)}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Section 6: 项目对比浮层 ═══ */}
      <div id="compare-bar" class="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl shadow-2xl border-t border-gray-200 py-3 px-4 transform translate-y-full transition-transform duration-300">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <i class="fas fa-balance-scale text-[#10B981]"></i>
            <span class="text-sm font-semibold text-[#1d1d1f]">
              {tt(TEXT.compareSelected, l)} <span id="compare-count" class="text-[#10B981]">0</span> {tt(TEXT.compareUnit, l)}
            </span>
            <div id="compare-names" class="hidden md:flex gap-2"></div>
          </div>
          <div class="flex gap-2">
            <button onclick="clearCompare()" class="text-xs px-4 py-2 rounded-lg border border-gray-200 text-[#6e6e73] hover:text-red-500 hover:border-red-200 transition-colors">
              {tt(TEXT.compareClear, l)}
            </button>
            <button onclick="startCompare()" class="text-xs px-4 py-2 rounded-lg bg-[#10B981] text-white font-semibold hover:bg-[#059669] transition-colors">
              <i class="fas fa-columns mr-1"></i>{tt(TEXT.compareStart, l)}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Section 7: 智能推荐区 ═══ */}
      <section class="py-16 bg-white">
        <div class="max-w-6xl mx-auto px-4">
          <div class="text-center mb-8 reveal">
            <h2 class="text-xl font-extrabold text-[#1d1d1f] mb-2">{tt(TEXT.recommendTitle, l)}</h2>
            <p class="text-sm text-[#6e6e73]">{tt(TEXT.recommendSubtitle, l)}</p>
          </div>
          <div class="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory reveal stagger-1" style="-webkit-overflow-scrolling: touch; scrollbar-width: none;">
            {/* 推荐卡片1: 高评分 */}
            {[
              { deal: MOCK_DEALS[5], reason: TEXT.recommendTopRated, reasonIcon: 'fa-star', reasonColor: '#F59E0B' },
              { deal: MOCK_DEALS[0], reason: TEXT.recommendIndustryMatch, reasonIcon: 'fa-bullseye', reasonColor: '#10B981' },
              { deal: MOCK_DEALS[2], reason: TEXT.recommendGrowth, reasonIcon: 'fa-chart-line', reasonColor: '#3B82F6' },
            ].map((rec) => {
              const ind = getIndustry(rec.deal.industryKey)
              return (
                <div class="flex-shrink-0 w-72 snap-start card-hover bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div class="p-5">
                    {/* 推荐原因标签 */}
                    <span class="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md font-semibold mb-3" style={`background: ${rec.reasonColor}15; color: ${rec.reasonColor}`}>
                      <i class={`fas ${rec.reasonIcon} mr-1`}></i>{tt(rec.reason, l)}
                    </span>
                    <h4 class="text-sm font-bold text-[#1d1d1f] mb-1">{tt(rec.deal.name, l)}</h4>
                    <p class="text-[10px] text-[#86868b] mb-2">
                      <span class="mr-2" style={`color: ${ind.color}`}><i class={`fas ${ind.icon} mr-0.5`}></i>{l === 'zh' ? ind.zh : ind.en}</span>
                      <i class="fas fa-map-marker-alt mr-0.5"></i>{tt(rec.deal.location, l)}
                    </p>
                    <div class="flex items-center gap-2 mb-3">
                      <span class="text-xs font-bold text-[#10B981]">AI {rec.deal.aiScore}</span>
                      <div class="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-[#10B981] to-[#34d399] rounded-full" style={`width:${rec.deal.aiScore * 10}%`}></div>
                      </div>
                    </div>
                    <div class="flex justify-between text-[10px] text-[#86868b]">
                      <span>{tt(TEXT.cardMonthlyRev, l)}: <strong class="text-[#1d1d1f]">{formatAmount(rec.deal.monthlyRevenue, l)}</strong></span>
                      <span>{tt(TEXT.cardRequestAmt, l)}: <strong class="text-[#1d1d1f]">{formatAmount(rec.deal.requestAmount, l)}</strong></span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ Section 8: 投资意向汇总 ═══ */}
      <section class="py-12 bg-gray-50">
        <div class="max-w-6xl mx-auto px-4">
          <div class="mb-6 reveal">
            <h2 class="text-xl font-extrabold text-[#1d1d1f] mb-1">{tt(TEXT.intentTitle, l)}</h2>
            <p class="text-sm text-[#6e6e73]">{tt(TEXT.intentSubtitle, l)}</p>
          </div>

          {/* 意向列表区域 */}
          <div id="intent-list" class="reveal stagger-1">
            {/* 空状态 */}
            <div id="intent-empty" class="text-center py-12">
              <i class="far fa-heart text-gray-200 text-4xl mb-4"></i>
              <p class="text-sm text-[#aeaeb2]">{tt(TEXT.intentEmpty, l)}</p>
            </div>
            {/* 意向项目(通过JS动态填充) */}
            <div id="intent-items" class="hidden flex flex-wrap gap-3 mb-4"></div>
          </div>

          {/* 进入条款通 CTA */}
          <div id="intent-cta" class="hidden mt-6 text-center reveal stagger-2">
            <a href={ll('/terms')} class="inline-flex items-center px-6 py-3 bg-[#5DC4B3] hover:bg-[#3D8F83] text-white font-bold rounded-xl shadow-lg shadow-[#5DC4B3]/25 transition-all no-underline">
              <i class="fas fa-arrow-right mr-2"></i>{tt(TEXT.intentNextStep, l)}
            </a>
          </div>
        </div>
      </section>

      {/* ═══ Section 9: 数据管道可视化 ═══ */}
      <section class="py-20 bg-white">
        <div class="max-w-6xl mx-auto px-4">
          <div class="text-center mb-12 reveal">
            <h2 class="text-xl font-extrabold text-[#1d1d1f] mb-2">{tt(TEXT.pipelineTitle, l)}</h2>
            <p class="text-sm text-[#6e6e73]">{tt(TEXT.pipelineSubtitle, l)}</p>
          </div>

          {/* 管道节点 */}
          <div class="reveal-scale stagger-1">
            {/* 桌面端: 横向 */}
            <div class="hidden md:flex items-center justify-center gap-0">
              {/* 节点1: 发起通 */}
              <a href={ll('/application')} class="flex flex-col items-center p-4 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:shadow-lg hover:border-amber-300 transition-all no-underline group min-w-[140px]">
                <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <i class="fas fa-upload text-amber-600 text-sm"></i>
                </div>
                <div class="text-xs font-bold text-amber-700">{tt(TEXT.pipelineOriginate, l)}</div>
                <div class="text-lg font-extrabold text-amber-800 font-mono">238</div>
                <div class="text-[10px] text-amber-600">{tt(TEXT.pipelineTotal, l)}</div>
              </a>

              {/* 箭头 */}
              <div class="flex flex-col items-center px-2">
                <i class="fas fa-chevron-right text-gray-300"></i>
                <span class="text-[9px] text-gray-400 mt-1">-110</span>
              </div>

              {/* 节点2: 评估通 */}
              <a href={ll('/assess')} class="flex flex-col items-center p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50 hover:shadow-lg hover:border-indigo-300 transition-all no-underline group min-w-[140px]">
                <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <i class="fas fa-chart-bar text-indigo-600 text-sm"></i>
                </div>
                <div class="text-xs font-bold text-indigo-700">{tt(TEXT.pipelineAssess, l)}</div>
                <div class="text-lg font-extrabold text-indigo-800 font-mono">128</div>
                <div class="text-[10px] text-indigo-600">{tt(TEXT.pipelinePassed, l)}</div>
              </a>

              {/* 箭头 */}
              <div class="flex flex-col items-center px-2">
                <i class="fas fa-chevron-right text-gray-300"></i>
                <span class="text-[9px] text-gray-400 mt-1">-56</span>
              </div>

              {/* 节点3: 风控通 */}
              <a href={ll('/risk')} class="flex flex-col items-center p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50 hover:shadow-lg hover:border-indigo-300 transition-all no-underline group min-w-[140px]">
                <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <i class="fas fa-shield-alt text-indigo-600 text-sm"></i>
                </div>
                <div class="text-xs font-bold text-indigo-700">{tt(TEXT.pipelineRisk, l)}</div>
                <div class="text-lg font-extrabold text-indigo-800 font-mono">72</div>
                <div class="text-[10px] text-indigo-600">{tt(TEXT.pipelinePassed, l)}</div>
              </a>

              {/* 箭头 */}
              <div class="flex flex-col items-center px-2">
                <i class="fas fa-chevron-right text-[#10B981]"></i>
              </div>

              {/* 节点4: 参与通 (当前，高亮) */}
              <div class="flex flex-col items-center p-4 rounded-2xl border-2 border-[#10B981] bg-[#D1FAE5] shadow-lg shadow-[#10B981]/15 min-w-[140px] glow-pulse relative">
                <div class="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center mb-2">
                  <i class="fas fa-th-large text-white text-sm"></i>
                </div>
                <div class="text-xs font-bold text-[#10B981]">{tt(TEXT.pipelineDeal, l)}</div>
                <div class="text-lg font-extrabold text-[#065F46] font-mono">47</div>
                <div class="text-[10px] text-[#10B981] font-semibold">{tt(TEXT.kpiFilteredDeals, l)}</div>
              </div>
            </div>

            {/* 移动端: 垂直排列 */}
            <div class="md:hidden flex flex-col items-center gap-0">
              {/* 节点1 */}
              <a href={ll('/application')} class="flex items-center gap-3 w-full p-3 rounded-xl border border-amber-200 bg-amber-50 no-underline mb-1">
                <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-upload text-amber-600 text-xs"></i>
                </div>
                <div class="flex-1">
                  <div class="text-xs font-bold text-amber-700">{tt(TEXT.pipelineOriginate, l)}</div>
                  <div class="text-[10px] text-amber-600">{tt(TEXT.pipelineTotal, l)}</div>
                </div>
                <div class="text-base font-extrabold text-amber-800 font-mono">238</div>
              </a>
              <i class="fas fa-chevron-down text-gray-300 text-xs my-1"></i>

              {/* 节点2 */}
              <a href={ll('/assess')} class="flex items-center gap-3 w-full p-3 rounded-xl border border-indigo-200 bg-indigo-50 no-underline mb-1">
                <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-chart-bar text-indigo-600 text-xs"></i>
                </div>
                <div class="flex-1">
                  <div class="text-xs font-bold text-indigo-700">{tt(TEXT.pipelineAssess, l)}</div>
                  <div class="text-[10px] text-indigo-600">{tt(TEXT.pipelinePassed, l)} 128 · {tt(TEXT.pipelineRejected, l)} 110</div>
                </div>
                <div class="text-base font-extrabold text-indigo-800 font-mono">128</div>
              </a>
              <i class="fas fa-chevron-down text-gray-300 text-xs my-1"></i>

              {/* 节点3 */}
              <a href={ll('/risk')} class="flex items-center gap-3 w-full p-3 rounded-xl border border-indigo-200 bg-indigo-50 no-underline mb-1">
                <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-shield-alt text-indigo-600 text-xs"></i>
                </div>
                <div class="flex-1">
                  <div class="text-xs font-bold text-indigo-700">{tt(TEXT.pipelineRisk, l)}</div>
                  <div class="text-[10px] text-indigo-600">{tt(TEXT.pipelinePassed, l)} 72 · {tt(TEXT.pipelineRejected, l)} 56</div>
                </div>
                <div class="text-base font-extrabold text-indigo-800 font-mono">72</div>
              </a>
              <i class="fas fa-chevron-down text-[#10B981] text-xs my-1"></i>

              {/* 节点4: 参与通 */}
              <div class="flex items-center gap-3 w-full p-3 rounded-xl border-2 border-[#10B981] bg-[#D1FAE5] shadow-lg shadow-[#10B981]/15">
                <div class="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-th-large text-white text-xs"></i>
                </div>
                <div class="flex-1">
                  <div class="text-xs font-bold text-[#10B981]">{tt(TEXT.pipelineDeal, l)}</div>
                  <div class="text-[10px] text-[#10B981]">{tt(TEXT.kpiFilteredDeals, l)}</div>
                </div>
                <div class="text-base font-extrabold text-[#065F46] font-mono">47</div>
              </div>
            </div>

            {/* 无筛子注释 */}
            <p class="text-center text-xs text-[#aeaeb2] mt-6">
              <i class="fas fa-info-circle mr-1"></i>{tt(TEXT.pipelineNoFilter, l)}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ Section 11: 前后步骤导航 ═══ */}
      <section class="py-8 bg-white border-t border-gray-100">
        <div class="max-w-4xl mx-auto px-4">
          <div class="flex items-stretch gap-4">
            <div class="flex-1">
              {prevProduct ? (
                <a href={ll(getProductUrl(prevProduct))} target={isExternalProduct(prevProduct) ? "_blank" : undefined} rel={isExternalProduct(prevProduct) ? "noopener noreferrer" : undefined} class="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#5DC4B3]/30 hover:shadow-md transition-all no-underline group h-full">
                  <i class="fas fa-chevron-left text-xs text-gray-300 group-hover:text-[#5DC4B3] transition-colors"></i>
                  <div class="min-w-0">
                    <div class="text-[10px] text-gray-400 mb-0.5">{tt(t.placeholder.prevStep, l)}</div>
                    <div class="text-sm font-bold text-[#1d1d1f] group-hover:text-[#5DC4B3] transition-colors truncate">{getProductName(prevProduct.id, l)}</div>
                    <div class="text-[10px] text-gray-400">{prevProduct.englishShort}</div>
                  </div>
                </a>
              ) : <div />}
            </div>
            <div class="flex-1">
              {nextProduct ? (
                <a href={ll(getProductUrl(nextProduct))} target={isExternalProduct(nextProduct) ? "_blank" : undefined} rel={isExternalProduct(nextProduct) ? "noopener noreferrer" : undefined} class="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#5DC4B3]/30 hover:shadow-md transition-all no-underline group h-full justify-end text-right">
                  <div class="min-w-0">
                    <div class="text-[10px] text-gray-400 mb-0.5">{tt(t.placeholder.nextStep, l)}</div>
                    <div class="text-sm font-bold text-[#1d1d1f] group-hover:text-[#5DC4B3] transition-colors truncate">{getProductName(nextProduct.id, l)}</div>
                    <div class="text-[10px] text-gray-400">{nextProduct.englishShort}</div>
                  </div>
                  <i class="fas fa-chevron-right text-xs text-gray-300 group-hover:text-[#5DC4B3] transition-colors"></i>
                </a>
              ) : <div />}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Section 12: Footer ═══ */}
      <Footer lang={l} />

      {/* ═══ 客户端交互脚本 ═══ */}
      <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var lang = window.__LANG__ || 'zh';
  var intentSet = new Set();
  var compareSet = new Set();
  var currentFilter = 'all';

  // ── 滚动渐现 ──
  document.addEventListener('DOMContentLoaded', function() {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale').forEach(function(el) { io.observe(el); });
  });

  // ── 筛选模式切换 ──
  window.switchFilterMode = function(mode) {
    currentFilter = mode;
    var btnAll = document.getElementById('filter-all');
    var btnFiltered = document.getElementById('filter-filtered');
    if (mode === 'all') {
      btnAll.className = 'px-4 py-2 text-xs font-semibold rounded-md transition-all bg-[#10B981] text-white';
      btnFiltered.className = 'px-4 py-2 text-xs font-semibold rounded-md transition-all text-[#6e6e73]';
    } else {
      btnAll.className = 'px-4 py-2 text-xs font-semibold rounded-md transition-all text-[#6e6e73]';
      btnFiltered.className = 'px-4 py-2 text-xs font-semibold rounded-md transition-all bg-[#10B981] text-white';
    }
    updateVisibleCards();
  };

  // ── 视图切换 ──
  window.switchView = function(view) {
    var cardView = document.getElementById('card-view');
    var listView = document.getElementById('list-view');
    var btnCard = document.getElementById('view-card');
    var btnList = document.getElementById('view-list');
    if (view === 'card') {
      cardView.style.display = '';
      listView.classList.add('hidden');
      btnCard.className = 'px-3 py-2 rounded-md transition-all bg-white text-[#10B981] shadow-sm';
      btnList.className = 'px-3 py-2 rounded-md transition-all text-[#86868b]';
    } else {
      cardView.style.display = 'none';
      listView.classList.remove('hidden');
      btnCard.className = 'px-3 py-2 rounded-md transition-all text-[#86868b]';
      btnList.className = 'px-3 py-2 rounded-md transition-all bg-white text-[#10B981] shadow-sm';
    }
  };

  // ── 搜索过滤 ──
  window.filterDeals = function() {
    updateVisibleCards();
  };

  // ── 排序 ──
  window.sortDeals = function() {
    // SSR mock - 真实场景需要DOM重排序
  };

  // ── 更新可见卡片 ──
  function updateVisibleCards() {
    var query = (document.getElementById('deal-search').value || '').toLowerCase();
    var cards = document.querySelectorAll('[data-deal-id]');
    var rows = document.querySelectorAll('[data-deal-row]');
    var visibleCount = 0;

    cards.forEach(function(card) {
      var filtered = card.getAttribute('data-filtered') === 'true';
      var text = card.textContent.toLowerCase();
      var matchSearch = !query || text.indexOf(query) !== -1;
      var matchFilter = currentFilter === 'all' || filtered;
      var show = matchSearch && matchFilter;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    rows.forEach(function(row) {
      var filtered = row.getAttribute('data-filtered') === 'true';
      var text = row.textContent.toLowerCase();
      var matchSearch = !query || text.indexOf(query) !== -1;
      var matchFilter = currentFilter === 'all' || filtered;
      row.style.display = (matchSearch && matchFilter) ? '' : 'none';
    });

    // 空状态
    var emptyState = document.getElementById('empty-state');
    var cardView = document.getElementById('card-view');
    if (visibleCount === 0) {
      emptyState.classList.remove('hidden');
      cardView.style.display = 'none';
    } else {
      emptyState.classList.add('hidden');
      if (document.getElementById('view-card').classList.contains('bg-white')) {
        cardView.style.display = '';
      }
    }
  }

  // ── 标记意向 ──
  window.toggleIntent = function(dealId) {
    var btn = document.getElementById('intent-btn-' + dealId);
    if (!btn) return;
    if (intentSet.has(dealId)) {
      intentSet.delete(dealId);
      btn.innerHTML = '<i class="far fa-heart mr-1"></i>' + (lang === 'zh' ? '标记意向' : 'Mark Intent');
      btn.className = 'flex-1 text-xs py-2 rounded-lg bg-[#10B981] text-white font-semibold hover:bg-[#059669] transition-colors';
    } else {
      intentSet.add(dealId);
      btn.innerHTML = '<i class="fas fa-heart mr-1"></i>' + (lang === 'zh' ? '已标记' : 'Marked');
      btn.className = 'flex-1 text-xs py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors';
    }
    updateIntentSection();
  };

  function updateIntentSection() {
    var emptyEl = document.getElementById('intent-empty');
    var itemsEl = document.getElementById('intent-items');
    var ctaEl = document.getElementById('intent-cta');
    if (intentSet.size > 0) {
      emptyEl.classList.add('hidden');
      itemsEl.classList.remove('hidden');
      itemsEl.className = 'flex flex-wrap gap-3 mb-4';
      ctaEl.classList.remove('hidden');
      // 简化: 显示ID列表
      var html = '';
      intentSet.forEach(function(id) {
        var card = document.querySelector('[data-deal-id="' + id + '"]');
        var name = card ? card.querySelector('h3').textContent : id;
        html += '<span class="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm">' +
          '<i class="fas fa-heart text-red-400 text-xs"></i>' +
          '<span class="font-medium text-[#1d1d1f]">' + name + '</span>' +
          '<button onclick="toggleIntent(\\'' + id + '\\')" class="text-[#aeaeb2] hover:text-red-400 text-xs ml-1"><i class="fas fa-times"></i></button>' +
          '</span>';
      });
      itemsEl.innerHTML = html;
    } else {
      emptyEl.classList.remove('hidden');
      itemsEl.classList.add('hidden');
      ctaEl.classList.add('hidden');
    }
    // 更新KPI
    var kpiEl = document.getElementById('kpi-intents');
    if (kpiEl) kpiEl.textContent = 12 + intentSet.size;
  }

  // ── 对比选择 ──
  window.toggleCompare = function(dealId) {
    var btn = document.getElementById('compare-btn-' + dealId);
    if (compareSet.has(dealId)) {
      compareSet.delete(dealId);
      if (btn) {
        btn.className = 'text-xs px-3 py-2 rounded-lg border border-gray-200 text-[#6e6e73] hover:border-[#10B981] hover:text-[#10B981] transition-colors';
      }
    } else {
      compareSet.add(dealId);
      if (btn) {
        btn.className = 'text-xs px-3 py-2 rounded-lg border-2 border-[#10B981] text-[#10B981] bg-[#D1FAE5]/30 font-semibold transition-colors';
      }
    }
    updateCompareBar();
  };

  window.clearCompare = function() {
    compareSet.forEach(function(id) {
      var btn = document.getElementById('compare-btn-' + id);
      if (btn) btn.className = 'text-xs px-3 py-2 rounded-lg border border-gray-200 text-[#6e6e73] hover:border-[#10B981] hover:text-[#10B981] transition-colors';
    });
    compareSet.clear();
    updateCompareBar();
  };

  window.startCompare = function() {
    if (compareSet.size < 2) return;
    alert((lang === 'zh' ? '对比功能开发中，已选: ' : 'Comparison coming soon. Selected: ') + Array.from(compareSet).join(', '));
  };

  function updateCompareBar() {
    var bar = document.getElementById('compare-bar');
    var countEl = document.getElementById('compare-count');
    countEl.textContent = compareSet.size;
    if (compareSet.size >= 2) {
      bar.style.transform = 'translateY(0)';
    } else {
      bar.style.transform = 'translateY(100%)';
    }
  }
})();
      ` }} />
    </div>
  )
}
