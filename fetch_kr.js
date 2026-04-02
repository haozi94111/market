const https = require('https');
const fs = require('fs');

function fetchYahoo(symbol) {
    return new Promise((resolve, reject) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const result = json.chart.result[0];
                    const meta = result.meta;
                    const price = meta.regularMarketPrice;
                    const prevClose = meta.chartPreviousClose || meta.previousClose;
                    const change = price - prevClose;
                    const pct = (change / prevClose) * 100;
                    resolve({ price, change, pct: Math.round(pct * 100) / 100 });
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function main() {
    const symbols = {
        SKHYNIX: '000660.KS',
        SAMSUNG: '005930.KS'
    };
    const result = { timestamp: new Date().toISOString() };

    for (const [key, sym] of Object.entries(symbols)) {
        try {
            const data = await fetchYahoo(sym);
            result[key] = data;
            console.log(`✅ ${key}: ${data.price} (${data.pct >= 0 ? '+' : ''}${data.pct}%)`);
        } catch (e) {
            console.log(`❌ ${key}: ${e.message}`);
            result[key] = { error: true };
        }
    }

    fs.writeFileSync('kr_data.json', JSON.stringify(result, null, 2), 'utf-8');
    console.log('\nSaved to kr_data.json');
}

main();
