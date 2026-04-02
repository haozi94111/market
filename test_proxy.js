// Test codetabs proxy with different Yahoo symbols
const symbols = {
    'BRENT': 'BZ=F',
    'GOLD': 'GC=F',
    'NASDAQ': '^IXIC',
    'SP500': '^GSPC',
    'HSI': '^HSI',
    'VIX': '^VIX'
};

for (const [name, code] of Object.entries(symbols)) {
    const url = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(code) + '?interval=1d&range=5d')}`;
    try {
        const resp = await fetch(url);
        const text = await resp.text();
        if (resp.ok) {
            const data = JSON.parse(text);
            const meta = data.chart?.result?.[0]?.meta;
            console.log(`✅ ${name}: ${meta?.regularMarketPrice} (prev: ${meta?.chartPreviousClose})`);
        } else {
            console.log(`❌ ${name}: HTTP ${resp.status} - ${text.substring(0, 100)}`);
        }
    } catch (e) {
        console.log(`❌ ${name}: ${e.message}`);
    }
    // Wait 500ms between requests
    await new Promise(r => setTimeout(r, 500));
}