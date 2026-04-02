const https = require('https');
const fs = require('fs');

function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', reject);
    });
}

// 东方财富 (服务端无CORS限制)
async function fetchDFCF(secid) {
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f57,f58,f59,f60,f169,f170&ut=fa5fd1943c7b386f172d6893dbbd1`;
    const { body } = await httpGet(url);
    const json = JSON.parse(body);
    const d = json.data;
    if (!d || !d.f43 || d.f43 === '-') throw new Error('no data for ' + secid);
    const dec = (d.f59 != null && d.f59 !== '-') ? d.f59 : 2;
    const dv = Math.pow(10, dec);
    return { price: d.f43 / dv, change: d.f169 / dv, pct: d.f170 / 100 };
}

// 新浪外盘 (商品)
async function fetchSina(code) {
    const url = `https://hq.sinajs.cn/list=${code}`;
    const { body } = await httpGet(url);
    const match = body.match(/"(.+)"/);
    if (!match) throw new Error('no sina data for ' + code);
    const parts = match[1].split(',');
    const price = parseFloat(parts[0]);
    const prevClose = parseFloat(parts[2]);
    if (!price || !prevClose) throw new Error('bad sina data');
    const chg = price - prevClose;
    const pct = (chg / prevClose) * 100;
    return { price, change: Math.round(chg * 100) / 100, pct: Math.round(pct * 100) / 100 };
}

// Naver 韩股
async function fetchNaver(code) {
    const url = `https://m.stock.naver.com/api/stock/${code}/basic`;
    const { body } = await httpGet(url);
    const json = JSON.parse(body);
    const price = parseInt((json.closePrice || '0').replace(/,/g, ''));
    const change = parseInt((json.compareToPreviousClosePrice || '0').replace(/,/g, ''));
    const pct = parseFloat(json.fluctuationsRatio || '0');
    if (!price) throw new Error('no naver data');
    return { price, change, pct };
}

// Yahoo (VIX)
async function fetchYahoo(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const { body } = await httpGet(url);
    const json = JSON.parse(body);
    const meta = json.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose;
    const chg = price - prev;
    const pct = (chg / prev) * 100;
    return { price, change: Math.round(chg * 100) / 100, pct: Math.round(pct * 100) / 100 };
}

async function main() {
    const result = { timestamp: new Date().toISOString() };

    const tasks = [
        // 商品 - 新浪 → 东财 → Yahoo
        { key: 'BRENT', fn: () => fetchSina('hf_OIL').catch(() => fetchDFCF('112.B00Y')).catch(() => fetchYahoo('BZ=F')) },
        { key: 'GOLD', fn: () => fetchSina('hf_GC').catch(() => fetchDFCF('101.GC00Y')).catch(() => fetchYahoo('GC=F')) },
        // VIX - Yahoo
        { key: 'VIX', fn: () => fetchYahoo('^VIX') },
        // 美股 - 东财 → Yahoo
        { key: 'NASDAQ', fn: () => fetchDFCF('100.NDX').catch(() => fetchYahoo('^IXIC')) },
        { key: 'SP500', fn: () => fetchDFCF('100.SPX').catch(() => fetchYahoo('^GSPC')) },
        // 港股 - 东财 → Yahoo
        { key: 'HSI', fn: () => fetchDFCF('100.HSI').catch(() => fetchYahoo('^HSI')) },
        { key: 'HSTECH', fn: () => fetchDFCF('124.HSTECH').catch(() => fetchYahoo('HSTECH.HK')) },
        // 韩国 - 东财/Naver → Yahoo
        { key: 'KOSPI', fn: () => fetchDFCF('100.KS11').catch(() => fetchYahoo('^KS11')) },
        { key: 'SKHYNIX', fn: () => fetchNaver('000660').catch(() => fetchYahoo('000660.KS')) },
        { key: 'SAMSUNG', fn: () => fetchNaver('005930').catch(() => fetchYahoo('005930.KS')) },
        // A股 - 东财 → Yahoo
        { key: 'SSEC', fn: () => fetchDFCF('1.000001').catch(() => fetchYahoo('000001.SS')) },
        { key: 'CSI500', fn: () => fetchDFCF('1.000905').catch(() => fetchYahoo('000905.SS')) },
    ];

    let ok = 0;
    for (const t of tasks) {
        try {
            result[t.key] = await t.fn();
            const d = result[t.key];
            console.log(`✅ ${t.key}: ${d.price} (${d.pct >= 0 ? '+' : ''}${d.pct}%)`);
            ok++;
        } catch (e) {
            console.log(`❌ ${t.key}: ${e.message}`);
            result[t.key] = { error: true, msg: e.message };
        }
    }

    fs.writeFileSync('market_data.json', JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\n✅ Saved market_data.json (${ok}/${tasks.length} success)`);
}

main();