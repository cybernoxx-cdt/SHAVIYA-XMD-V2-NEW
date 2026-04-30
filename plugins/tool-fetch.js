const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');

// Fake vCard
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© Mr Shaviya",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=94707085822:+94707085822
END:VCARD`
        }
    }
};

// ✅ Build key-value table from JSON object
function buildTableFromJson(obj, title = 'Response Data') {
    const entries = Object.entries(obj).slice(0, 10);
    return {
        title,
        table: [
            { isHeading: true, items: ['Key', 'Value'] },
            ...entries.map(([key, val]) => ({
                isHeading: false,
                items: [
                    String(key),
                    typeof val === 'object' ? JSON.stringify(val).slice(0, 80) : String(val)
                ]
            }))
        ]
    };
}

cmd({
    pattern: "fetch",
    alias: ["get", "api"],
    desc: "Fetch data from a provided URL or API",
    category: "main",
    react: "🌐",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        const q = args.join(' ').trim();
        if (!q) return reply('❌ Please provide a valid URL or query.');
        if (!/^https?:\/\//.test(q)) return reply('❌ URL must start with http:// or https://.');

        const data = await fetchJson(q);
        const content = JSON.stringify(data, null, 2);
        const preview = content.slice(0, 1200);

        // ✅ Fetch result එක richResponse example format එකටම wrap කරනවා
        const richSections = [
            { text: '🌐 *API Fetch Result*' },
            { text: `📎 *URL:* ${q}` },
            {
                language: 'json',
                code: [{
                    highlightType: 0,
                    codeContent: preview
                }]
            },
            { text: content.length > 1200 ? `⚠️ Truncated — Full size: ${content.length} chars` : '✅ Full response shown above' }
        ];

        // Object නම් → key-value table add කරනවා
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            richSections.push({ text: '📊 *Response Overview:*' });
            richSections.push(buildTableFromJson(data, 'Fetched Data'));
        } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
            richSections.push({ text: `📊 *First Item (${data.length} total):*` });
            richSections.push(buildTableFromJson(data[0], 'Item [0]'));
        }

        richSections.push({ text: '> Powered by *Sʜᴀᴠɪʏᴀ Xᴍᴅ*' });

        await conn.sendMessage(from, {
            richResponse: richSections
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in fetch command:", e);
        reply(`❌ An error occurred:\n${e.message}`);
    }
});
