const https = require('https');
const fs = require('fs');

function fetchNaver(code) {
    return new Promise((resolve, reject) => {
        const url = `https://m.stock.naver.com/api/stock/${code}/basic`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const price = parseInt((json.closePrice || '0').replace(/,/g, ''));
                    const change = parseInt((json.compareToPreviousClosePrice || '0').replace(/,/g, ''));
                    const pct = parseFloat(json.fluctuationsRatio || '0');
                    if (!price) throw new Error('no price data');
                    resolve({ price, change, pct });
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function main() {
    const symbols = {
        SKHYNIX: '000660',
        SAMSUNG: '005930'
    };
    const result = { timestamp: new Date().toISOString() };

    for (const [key, code] of Object.entries(symbols)) {
        try {
            const data = await fetchNaver(code);
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