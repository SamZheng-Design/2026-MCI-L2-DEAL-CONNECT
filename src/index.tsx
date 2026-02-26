/**
 * ===================================================================
 * index.tsx -- 参与通(Deal Connect)独立应用入口 (V20)
 * ===================================================================
 *
 * 本项目专注于参与通页面的开发与迭代。
 *
 * 路由:
 *   /              → DealConnectPage (参与通首页)
 *   /opportunity   → 同上(别名，兼容主站链接)
 *
 * 语言切换: ?lang=en
 */
import { Hono } from 'hono'
import { renderer } from './renderer'
import { getLangFromQuery } from './i18n'
import { DealConnectPage } from './pages/DealConnectPage'

const app = new Hono()

// 注册JSX渲染中间件 — 提供HTML外壳(head/meta/CSS/字体/Tailwind配置)
app.use(renderer)

/** 参与通页面渲染 */
function renderDealConnect(c: any) {
  const lang = getLangFromQuery(c.req.url)
  return c.render(<DealConnectPage lang={lang} />, {
    title: lang === 'en' ? 'Deal Connect - Micro Connect' : '参与通 - Micro Connect 滴灌通',
    lang,
  })
}

// 首页即参与通
app.get('/', renderDealConnect)

// 兼容主站 URL
app.get('/opportunity', renderDealConnect)

export default app
