// plugins/bbc.js — SHAVIYA-XMD V2 | BBC News Plugin
// API: https://bbc-whiteshadow.vercel.app/?limit=5
// Usage: .bbc | .bbc 10 | .news | .news world

'use strict';

const { cmd } = require('../command');
const axios   = require('axios');

// ── Config ─────────────────────────────────────────────────────
const BBC_API   = 'https://bbc-whiteshadow.vercel.app/';
const MAX_LIMIT = 5;   // max news count per request
const DEF_LIMIT = 1;    // default

// ── React helper ───────────────────────────────────────────────
async function react(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch (_) {}
}

// ── Extract articles from API response ────────────────────────
// API possible shapes:
//   Array of articles  →  [ { title, description, url, image, publishedAt, ... }, ... ]
//   Object with array  →  { articles: [...] } | { news: [...] } | { data: [...] } | { results: [...] }
function extractArticles(data) {
    if (Array.isArray(data))              return data;
    if (Array.isArray(data?.articles))    return data.articles;
    if (Array.isArray(data?.news))        return data.news;
    if (Array.isArray(data?.data))        return data.data;
    if (Array.isArray(data?.results))     return data.results;
    if (Array.isArray(data?.items))       return data.items;
    if (Array.isArray(data?.posts))       return data.posts;
    return [];
}

// ── Safely get field from article ─────────────────────────────
function get(article, ...keys) {
    for (const k of keys) {
        if (article[k] && typeof article[k] === 'string' && article[k].trim())
            return article[k].trim();
    }
    return null;
}

// ── Format date ────────────────────────────────────────────────
function formatDate(raw) {
    if (!raw) return null;
    try {
        return new Date(raw).toLocaleString('en-US', {
            timeZone:    'Asia/Colombo',
            year:        'numeric',
            month:       'short',
            day:         '2-digit',
            hour:        '2-digit',
            minute:      '2-digit'
        });
    } catch (_) { return raw; }
}

// ── Build single article text block ───────────────────────────
function buildArticleBlock(article, index) {
    const title   = get(article, 'title', 'headline', 'name')             || 'No Title';
    const desc    = get(article, 'description', 'summary', 'excerpt', 'body', 'content') || '';
    const url     = get(article, 'url', 'link', 'href', 'articleUrl')     || '';
    const date    = formatDate(get(article, 'publishedAt', 'date', 'pubDate', 'published', 'time'));
    const source  = get(article, 'source', 'author', 'category', 'section') || 'BBC News';

    // Truncate description to 200 chars
    const shortDesc = desc.length > 200 ? desc.slice(0, 197) + '...' : desc;

    let block = `*${index}.* 📰 *${title}*\n`;
    if (date)      block += `   🕐 ${date}\n`;
    if (source)    block += `   🏷️ ${source}\n`;
    if (shortDesc) block += `   📝 ${shortDesc}\n`;
    if (url)       block += `   🔗 ${url}\n`;

    return block;
}

// ── Main handler ───────────────────────────────────────────────
async function bbcHandler(conn, mek, m, { from, q, reply, args }) {

    // Parse limit from args (e.g., .bbc 8)
    let limit = DEF_LIMIT;
    const argStr = (Array.isArray(q) ? q.join(' ') : q || '').trim();
    const numArg = parseInt(argStr);
    if (!isNaN(numArg) && numArg > 0) {
        limit = Math.min(numArg, MAX_LIMIT);
    }

    await react(conn, from, mek.key, '📰');
    await reply(`📡 BBC News fetch කරනවා... (limit: ${limit})`);

    try {
        const res = await axios.get(BBC_API, {
            params:  { limit },
            timeout: 30000,
            headers: {
                'Accept':     'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36'
            }
        });

        const data     = res.data;
        const articles = extractArticles(data);

        if (!articles || articles.length === 0) {
            await react(conn, from, mek.key, '❌');
            return reply(
                '❌ BBC News API වලින් articles ලැබුණේ නෑ.\n\n' +
                '_Raw:_ `' + JSON.stringify(data).slice(0, 300) + '`'
            );
        }

        const count = Math.min(articles.length, limit);

        // ── Try to get thumbnail from first article ──
        let thumbUrl = null;
        for (const a of articles.slice(0, 3)) {
            const img = get(a, 'image', 'thumbnail', 'urlToImage', 'imageUrl', 'img', 'picture', 'photo');
            if (img && /^https?:\/\//i.test(img)) { thumbUrl = img; break; }
        }

        // ── Build full message ──
        const header =
            '╔══════════════════════╗\n' +
            '║   📺 *BBC NEWS LIVE*   ║\n' +
            '╚══════════════════════╝\n\n' +
            `📊 *Showing ${count} of ${articles.length} articles*\n` +
            `🕐 *Updated:* ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}\n` +
            '━━━━━━━━━━━━━━━━━━━━━━\n\n';

        const footer =
            '\n━━━━━━━━━━━━━━━━━━━━━━\n' +
            '📌 *More news:* https://bbc.com/news\n' +
            '_Powered by SHAVIYA-XMD V2_';

        let newsBody = '';
        for (let i = 0; i < count; i++) {
            newsBody += buildArticleBlock(articles[i], i + 1) + '\n';
        }

        const fullMsg = header + newsBody + footer;

        // ── Send with thumbnail if available ──
        if (thumbUrl) {
            try {
                await conn.sendMessage(from, {
                    image:   { url: thumbUrl },
                    caption: fullMsg
                }, { quoted: mek });
            } catch (_) {
                // Thumbnail fail → send as text
                await conn.sendMessage(from, { text: fullMsg }, { quoted: mek });
            }
        } else {
            await conn.sendMessage(from, { text: fullMsg }, { quoted: mek });
        }

        await react(conn, from, mek.key, '✅');

    } catch (err) {
        console.error('[bbc-news] Error:', err?.message || err);
        await react(conn, from, mek.key, '❌');

        const status = err?.response?.status;
        let errMsg   = '❌ *BBC News* load කරන්න බැරි වුණා.\n\n';

        if (status === 429)
            errMsg += '⚠️ Rate limit. ටිකක් ඉඳලා try කරන්න.';
        else if (status === 500 || status === 503)
            errMsg += '⚠️ API server error. Later try කරන්න.';
        else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout'))
            errMsg += '⚠️ Timeout. Internet check කරලා retry කරන්න.';
        else if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED')
            errMsg += '⚠️ API unreachable. Server down විය හැකියි.';
        else
            errMsg += 'Error: ' + (err?.message || 'Unknown');

        reply(errMsg);
    }
}

// ── Register Commands ──────────────────────────────────────────
cmd({
    pattern:  'bbc',
    react:    '📰',
    category: 'news',
    fromMe:   false,
    desc:     'Get latest BBC News (usage: .bbc or .bbc 10)',
    filename: __filename
}, bbcHandler);

cmd({
    pattern:  'news',
    react:    '📰',
    category: 'news',
    fromMe:   false,
    desc:     'Get latest news from BBC (alias)',
    filename: __filename
}, bbcHandler);

cmd({
    pattern:  'bbcnews',
    react:    '📰',
    category: 'news',
    fromMe:   false,
    desc:     'BBC News full alias',
    filename: __filename
}, bbcHandler);
