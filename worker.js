// Cloudflare Worker: Yahoo Finance API 代理
// 部署到 Cloudflare Workers (免费)
// 每天 100,000 次请求免费额度

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 允许跨域
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(request.url)
  const symbol = url.searchParams.get('symbol')
  const interval = url.searchParams.get('interval') || '1d'
  const range = url.searchParams.get('range') || '5d'

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'Missing symbol parameter' }), {
      status: 400, headers: corsHeaders
    })
  }

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`
    const resp = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const data = await resp.text()
    return new Response(data, { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: corsHeaders
    })
  }
}
