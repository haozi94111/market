const https = require('https');
const fs = require('fs');

function fetchVIX() {
    return new Promise((resolve, reject) => {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d';
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const meta = json.chart.result[0].meta;
                    const price = meta.regularMarketPrice;
                    const prev = meta.chartPreviousClose || meta.previousClose;
                    const change = Math.round((price - prev) * 100) / 100;
                    const pct = Math.round((change / prev) * 10000) / 100;
                    resolve({ price, change, pct });
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        const data = await fetchVIX();
        const result = { timestamp: new Date().toISOString(), ...data };
        fs.writeFileSync('vix_data.json', JSON.stringify(result, null, 2), 'utf-8');
        console.log(`✅ VIX: ${data.price} (${data.pct >= 0 ? '+' : ''}${data.pct}%)`);
    } catch (e) {
        console.log(`❌ VIX: ${e.message}`);
    }
}

main();