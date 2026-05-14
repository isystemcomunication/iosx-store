cat > server.js << 'EOF'
const express = require('express');
const gplay   = require('google-play-scraper');
const axios   = require('axios');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;
const cache = new Map();

app.use(cors());
app.use(express.json());

function cached(key, fn) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < 10 * 60 * 1000) return Promise.resolve(hit.data);
    return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

function getLang(req) {
    const accept = req.headers['accept-language'] || 'en';
    return accept.startsWith('ru') ? 'ru' : 'en';
}

app.get('/ping', (_, res) => res.json({ ok: true }));

app.get('/top', async (req, res) => {
    try {
        const { category = 'APPLICATION', collection = 'TOP_FREE', num = 30 } = req.query;
        const lang = getLang(req);
        const key  = `top:${category}:${collection}:${num}:${lang}`;
        const results = await cached(key, () => gplay.list({
            category:   gplay.category[category]    || gplay.category.APPLICATION,
            collection: gplay.collection[collection] || gplay.collection.TOP_FREE,
            num: parseInt(num),
            country: lang === 'ru' ? 'ru' : 'us',
            lang
        }));
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/search', async (req, res) => {
    try {
        const { q, num = 30 } = req.query;
        if (!q) return res.json([]);
        const lang = getLang(req);
        const key  = `search:${q}:${num}:${lang}`;
        const results = await cached(key, () => gplay.search({
            term: q, num: parseInt(num),
            country: lang === 'ru' ? 'ru' : 'us', lang
        }));
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/app', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'id required' });
        const lang = getLang(req);
        const key  = `app:${id}:${lang}`;
        const result = await cached(key, () => gplay.app({
            appId: id, country: lang === 'ru' ? 'ru' : 'us', lang
        }));
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/similar', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.json([]);
        const lang = getLang(req);
        const key  = `similar:${id}:${lang}`;
        const results = await cached(key, () => gplay.similar({
            appId: id, country: lang === 'ru' ? 'ru' : 'us', lang
        }));
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/download', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'id required' });
        const url = `https://d.apkpure.com/b/APK/${id}?version=latest`;
        res.json({ url, source: 'apkpure' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/categories', (req, res) => {
    const lang = getLang(req);
    const ru = [
        { id: 'APPLICATION', name: 'Приложения' },
        { id: 'GAME', name: 'Игры' },
        { id: 'PRODUCTIVITY', name: 'Продуктивность' },
        { id: 'SOCIAL', name: 'Социальные' },
        { id: 'ENTERTAINMENT', name: 'Развлечения' },
        { id: 'PHOTOGRAPHY', name: 'Фото и видео' },
        { id: 'MUSIC_AND_AUDIO', name: 'Музыка' },
        { id: 'TOOLS', name: 'Утилиты' }
    ];
    const en = [
        { id: 'APPLICATION', name: 'Apps' },
        { id: 'GAME', name: 'Games' },
        { id: 'PRODUCTIVITY', name: 'Productivity' },
        { id: 'SOCIAL', name: 'Social' },
        { id: 'ENTERTAINMENT', name: 'Entertainment' },
        { id: 'PHOTOGRAPHY', name: 'Photo & Video' },
        { id: 'MUSIC_AND_AUDIO', name: 'Music' },
        { id: 'TOOLS', name: 'Utilities' }
    ];
    res.json(lang === 'ru' ? ru : en);
});

app.listen(PORT, '0.0.0.0', () => console.log(`✅ iOSx Store API :${PORT}`));
EOF
