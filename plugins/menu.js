// ============================================================
//  menu.js — SHAVIYA-XMD V2
//  Restyled by CDT — WhiteShadow Style
//  Auto-synced with all 161 unique commands (deep scan report)
// ============================================================

const { cmd } = require('../command');

const BOT_NAME   = 'Sʜᴀᴠɪʏᴀ Xᴍᴅ';
const VERSION    = 'V2';
const OWNER_NAME = 'ꜱᴀᴠᴇɴᴅʀᴀ ᴅᴀᴍᴘʀɪʏᴀ';
const OWNER_NUM  = '94707085822';
const POSTER_URL = 'https://whiteshadow-uploder.zone.id/files/so2y.jpg';
const PREFIX     = '.';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD\nORG:SHAVIYA BOT;\nTEL;type=CELL;type=VOICE;waid=${OWNER_NUM}:+${OWNER_NUM}\nEND:VCARD`
        }
    }
};

const CTX = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '@newsletter',
        newsletterName: '© Mr Savendra',
        serverMessageId: 143
    }
};

const REACTS = ['👑','💎','🔥','⚡','🌟','✨','🚀','💫','🏆','🎯','🔠','🔱'];
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];

// ══════════════════════════════════════════════════════════════
//  COMMAND DATA — auto-synced with deep scan (161 unique cmds)
// ══════════════════════════════════════════════════════════════
const MENUS = {
    download: {
        icon: '📥',
        label: 'ᴅᴏᴡɴʟᴏᴀᴅᴇʀs',
        num: 1,
        commands: [
            { p: '.apk',           d: 'Search and download APK' },
            { p: '.download',      d: 'Download with original file name, thumbnail and footer.' },
            { p: '.fb',            d: 'FB Video Downloader' },
            { p: '.gdrive',        d: 'Download Google Drive files or folders (folder → ZIP).' },
            { p: '.mediafire',     d: 'To download MediaFire files' },
            { p: '.mega',          d: 'MEGA ultra-fast download — file or folder' },
            { p: '.megaget',       d: 'Download a specific file from a MEGA folder' },
            { p: '.megalist',      d: 'List files inside a MEGA folder' },
            { p: '.song',          d: 'YouTube Song Downloader (Multi Reply + Voice Note Fixed)' },
            { p: '.song2',         d: 'YouTube Song Downloader (Multi Reply + Voice Note Fixed)' },
            { p: '.tiktok',        d: 'HD/SD Multi-Reply TikTok Downloader' },
            { p: '.twitter',       d: 'Download Twitter videos' },
            { p: '.xnxx',          d: 'Search & download xnxx.com videos (18+).' },
            { p: '.yt',            d: 'Download YouTube videos or audio by name/link' },
            { p: '.yt2',           d: 'Download YouTube videos in multiple qualities' },
            { p: '.ytlist',        d: 'YouTube Playlist එකක Songs Download කරන්න' },
        ]
    },
    movie: {
        icon: '🎬',
        label: 'ᴍᴏᴠɪᴇ & ᴀɴɪᴍᴇ',
        num: 2,
        commands: [
            { p: '.anime',         d: 'SL Anime Club Downloader | 0 = All Episodes' },
            { p: '.anime2',        d: '🎌 SL Anime Club වෙතින් anime episodes search සහ download කරන්න' },
            { p: '.baiscope',      d: 'Baiscopes.lk Downloader' },
            { p: '.cartoonlatest', d: 'SinhalaCartoons.com Latest Uploads' },
            { p: '.cinejid',       d: 'CineSubz GDrive downloader with Full Details & Logs' },
            { p: '.cmovie',        d: 'Download movies & TV series from CineSubz' },
            { p: '.cz',            d: 'CineSubz downloader' },
            { p: '.cz2',           d: 'Search and Download movies from Cinesubz (720p)' },
            { p: '.cz3',           d: 'Search CineSubz using WhiteShadow API' },
            { p: '.cz_dl',         d: 'Download movie from a direct link (internal)' },
            { p: '.dinka',         d: 'Drive File + Other Link Only Hybrid' },
            { p: '.kdrama',        d: 'Search and Download Korean Dramas' },
            { p: '.lakvision',     d: 'LakVision TV - Movies & TV Episodes Downloader' },
            { p: '.movie',         d: 'Ultimate Multi-reply movie engine' },
            { p: '.moviesub',      d: 'Download Movies & TV Series (All Fixed Version)' },
            { p: '.moviesublk',    d: 'moviesublk.com වෙතින් Sinhala Sub සමඟ Movies & Series Download' },
            { p: '.pirate',        d: 'Search Pirate movies + info card + Mega qualities + auto download +...' },
            { p: '.piratelk',      d: 'PirateLK Auto Download (UsersDrive + Puppeteer)' },
            { p: '.pupilmv',       d: '🎥 Search Sinhala subbed movies with Brand Thumbnail & Infinity Reply' },
            { p: '.sayura',        d: 'Search and Download Movies/Series from SayuraCinema' },
            { p: '.sinhalacartoon', d: 'SinhalaCartoons.com Search / Latest / Download' },
            { p: '.sinhalasubw',   d: 'SinhalaSub.lk (WhiteShadow API) Search / Details / Download' },
            { p: '.ud',            d: 'UsersDrive direct link extract & download' },
        ]
    },
    ai: {
        icon: '🧠',
        label: 'ᴀɪ & ꜰᴜɴ',
        num: 3,
        commands: [
            { p: '.deepseek',      d: 'DeepSeek AI' },
            { p: '.emix',          d: 'Combine two emojis into a sticker.' },
            { p: '.meme',          d: 'Generate meme with custom text' },
            { p: '.poem',          d: 'AI Poem generator (Sinhala/English)' },
            { p: '.rmeme',         d: 'Get a random meme from Reddit' },
            { p: '.story',         d: 'AI Short Story Generator' },
            { p: '.sudu',          d: 'Chat with AI (Zanta AI Wife)' },
            { p: '.suduclear',     d: 'Clear your AI chat memory' },
            { p: '.text2img',      d: 'Generate AI Images and send the actual image' },
            { p: '.vchange',       d: 'Change a voice note into alvin, hulk, robot, baby, or deep voice' },
        ]
    },
    sticker: {
        icon: '🎭',
        label: 'sᴛɪᴄᴋᴇʀ & ᴍᴇᴅɪᴀ',
        num: 4,
        commands: [
            { p: '.aya',           d: 'Convert image or video to animated sticker' },
            { p: '.convert',       d: 'Convert sticker to image' },
            { p: '.sticker',       d: 'Create sticker from image/video' },
            { p: '.take',          d: 'Create sticker with custom pack name' },
        ]
    },
    tools: {
        icon: '🛠️',
        label: 'ᴛᴏᴏʟs & ᴜᴛɪʟɪᴛʏ',
        num: 5,
        commands: [
            { p: '.batchupload',   d: 'Upload multiple files at once (Max 5)' },
            { p: '.fetch',         d: 'Fetch data from a provided URL or API' },
            { p: '.fileinfo',      d: 'Get detailed information about a file' },
            { p: '.getvoice',      d: 'Convert replied video/audio or URL to WhatsApp Voice Note' },
            { p: '.hd',            d: 'Photo HD enhance' },
            { p: '.imgbb',         d: 'Upload images to ImgBB and get direct link' },
            { p: '.location',      d: 'Search location and get Google Maps link + pin' },
            { p: '.lyrics',        d: 'Get song lyrics' },
            { p: '.npm',           d: 'Search for a package on npm.' },
            { p: '.numinfo',       d: 'Sri Lanka number details & carrier info' },
            { p: '.qr',            d: 'Generate QR code from text or link' },
            { p: '.qrscan',        d: 'Scan/Read QR code from image' },
            { p: '.readmore',      d: 'WhatsApp Read More hidden message generator' },
            { p: '.remini',        d: 'Photo HD/UHD enhance' },
            { p: '.removebg',      d: 'Remove Image Background' },
            { p: '.send',          d: 'Forwards quoted message back to your DM or current chat' },
            { p: '.sinhala',       d: 'සිංහල Text to Voice Note' },
            { p: '.smooth',        d: 'Video 60fps smooth convert' },
            { p: '.sotp',          d: 'Spam OTP using verified endpoints (global + 62 + 94) – actual OTP d...' },
            { p: '.ss2',           d: '🎬 සිංහල උපසිරැසි චිත්‍රපට සොයා ගන්න' },
            { p: '.sss',           d: 'Download screenshot of a given link.' },
            { p: '.stt',           d: 'Transcribe voice note to text' },
            { p: '.tiktoksearch',  d: 'Search for TikTok videos using a query.' },
            { p: '.tomp3',         d: 'Convert media to audio' },
            { p: '.toptt',         d: 'Convert media to voice message' },
            { p: '.trt',           d: '🌍 Translate text between languages' },
            { p: '.ts2',           d: 'TikTok videos search' },
            { p: '.tts',           d: 'Text to Speech voice note' },
            { p: '.tts2',          d: 'English Text to Voice Note' },
            { p: '.vv',            d: 'Open / reveal a view-once message (reply to it)' },
            { p: '.vv2',           d: 'Retrieve view-once message back to user' },
            { p: '.web2zip',       d: 'Convert Website To ZIP' },
            { p: '.yts',           d: 'YouTube Video Downloader — fast menu, API called only on download' },
            { p: '.yts2',          d: 'Search and get details from youtube.' },
        ]
    },
    news: {
        icon: '📰',
        label: 'ɴᴇᴡs',
        num: 6,
        commands: [
            { p: '.bbc',           d: 'Latest BBC Sinhala News' },
            { p: '.news3',         d: 'Get latest Sirasa news.' },
        ]
    },
    group: {
        icon: '👥',
        label: 'ɢʀᴏᴜᴘ ᴍɢᴍᴛ',
        num: 7,
        commands: [
            { p: '.add',           d: 'Add a member to the group. Sends invite link if add fails.' },
            { p: '.antilink',      d: 'Anti-link protection for groups on/off' },
            { p: '.cancelkick',    d: 'Stop running kickall' },
            { p: '.demote',        d: 'Demote an admin to member' },
            { p: '.gban',          d: 'Add 150+ registered random numbers to suspend the group.' },
            { p: '.gid',           d: 'Get Group info from invite link with profile picture' },
            { p: '.groupinfo',     d: 'Show group information' },
            { p: '.gst',           d: 'Send a text or media status visible to all group members.' },
            { p: '.hidetag',       d: 'To Tag all Members for Any Message/Media' },
            { p: '.kick',          d: 'Remove a member from the group' },
            { p: '.kickall',       d: 'Remove ALL members from group instantly (admins + members)' },
            { p: '.kickstatus',    d: 'Live kickall progress' },
            { p: '.mute',          d: 'Lock group (only admins can send messages)' },
            { p: '.online',        d: 'Check who is online in the group' },
            { p: '.promote',       d: 'Promote a member to admin' },
            { p: '.tagall',        d: 'Tag all group members' },
            { p: '.unmute',        d: 'Unlock group (everyone can send messages)' },
            { p: '.welcome',       d: 'Toggle welcome/goodbye messages in groups' },
        ]
    },
    owner: {
        icon: '⚙️',
        label: 'ᴏᴡɴᴇʀ & sᴇᴛᴛɪɴɢs',
        num: 8,
        commands: [
            { p: '.addpremium',    d: 'Add premium user' },
            { p: '.alwaysoffline', d: 'Bot always offline/invisible mode (MongoDB saved)' },
            { p: '.anticall',      d: 'Block all incoming calls automatically' },
            { p: '.antidelete',    d: 'Toggle anti-delete messages on/off' },
            { p: '.autolike',      d: 'Toggle auto react to statuses + change emoji' },
            { p: '.autostatus',    d: 'Toggle auto status view' },
            { p: '.autovoice',     d: 'Auto Voice + Sticker + Reply toggle' },
            { p: '.autovv',        d: 'Turn auto view-once capture ON/OFF' },
            { p: '.ban',           d: 'Ban a user' },
            { p: '.block',         d: 'Blocks a person' },
            { p: '.botinfo',       d: 'Show full bot configuration and env vars' },
            { p: '.button',        d: 'Toggle button mode' },
            { p: '.creact',        d: 'Multi-Node Mass Reaction' },
            { p: '.delsudo',       d: 'Remove a temporary owner' },
            { p: '.forward',       d: 'Reply කළ message forward කිරීම (JIDs 20ක් දක්වා)' },
            { p: '.forwardoff',    d: 'Disable auto-forward' },
            { p: '.forwardon',     d: 'Enable auto-forward' },
            { p: '.fulldp',        d: 'Set FULL profile picture — entire image visible, no crop (Owner Only)' },
            { p: '.fwdstatus',     d: 'Show forward configuration' },
            { p: '.getpp',         d: 'Send profile picture by phone number' },
            { p: '.jid',           d: 'Get the JID of the current chat' },
            { p: '.listpremium',   d: 'List premium users' },
            { p: '.listsudo',      d: 'List all temporary owners' },
            { p: '.mention',       d: 'Mention all group members with a message (Owner/Sudo only)' },
            { p: '.moviedoc',      d: 'Toggle movie poster as thumbnail' },
            { p: '.moviesettings', d: 'View current movie plugin settings' },
            { p: '.msg',           d: 'Send a message multiple times (Owner/Sudo only)' },
            { p: '.ownermenu',     d: 'Owner control panel — toggle all features' },
            { p: '.pair',          d: 'Get pairing code for SHAVIYA-XMD V4 bot' },
            { p: '.plugin',        d: 'Toggle a plugin ON or OFF by number' },
            { p: '.plugins',       d: 'Show all bot plugins with ON/OFF status' },
            { p: '.removepremium', d: 'Remove premium user' },
            { p: '.resetbot',      d: 'Reset all bot settings to default' },
            { p: '.restart',       d: 'Restart the bot with GIF (owner only)' },
            { p: '.set',           d: 'Quick toggle any setting by key' },
            { p: '.setfilepre',    d: 'Set file name prefix' },
            { p: '.setfname',      d: 'Set file name prefix' },
            { p: '.setfooter',     d: 'Set bot name used in footer' },
            { p: '.setforward',    d: 'Set auto-forward destination number/JID' },
            { p: '.setmode',       d: 'Bot access mode set' },
            { p: '.setname',       d: 'Set bot display name' },
            { p: '.setprefix',     d: 'Set document caption prefix' },
            { p: '.setsudo',       d: 'Add a temporary owner' },
            { p: '.setthumb',      d: 'Set default thumbnail URL' },
            { p: '.settings',      d: 'Full interactive bot settings menu' },
            { p: '.toggle',        d: 'Toggle bot feature on/off by number' },
            { p: '.unban',         d: 'Unban a user' },
            { p: '.unblock',       d: 'Unblocks a person' },
            { p: '.update',        d: 'Redeploy bot from GitHub to Heroku' },
        ]
    },
    system: {
        icon: '⚡',
        label: 'sʏsᴛᴇᴍ & ᴍᴀɪɴ',
        num: 9,
        commands: [
            { p: '.alive',         d: 'Check bot online status' },
            { p: '.menu',          d: 'WhiteShadow interactive menu' },
            { p: '.owner',         d: 'Get owner contact details' },
            { p: '.ping',          d: 'Check bot response speed' },
            { p: '.system',        d: 'Show bot system statistics' },
        ]
    }
};

const TOTAL_COMMANDS = 161;

// ══════════════════════════════════════════════════════════════
//  BUILD FUNCTIONS — Shaviya Xmd Style
// ══════════════════════════════════════════════════════════════

function buildMainMenu(name, prefix) {
    const now = new Date();
    const time = now.toLocaleString('en-US', {
        timeZone: 'Asia/Colombo',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    const date = now.toLocaleString('en-US', {
        timeZone: 'Asia/Colombo',
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });

    let m = '';
    m += `🌟 *ʜᴇʟʟᴏ* *${name}* *👋*\n`;
    m += `*ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Sʜᴀᴠɪʏᴀ Xᴍᴅ ᴀʟʟ ꜰᴇᴀᴛᴜʀᴇ ʙᴏᴛ*\n\n`;

    m += `╭─── [ *🤖 ʙᴏᴛ ɪɴғᴏ* ] ────\n`;
    m += `│ 👤 *ᴏᴡɴᴇʀ:* ${OWNER_NAME}\n`;
    m += `│ 👋 *ᴜsᴇʀ:* ${name}\n`;
    m += `│ ⚡ *ᴘʀᴇғɪx:* [ ${prefix} ]\n`;
    m += `│ ⏰ *ᴛɪᴍᴇ:* ${time}\n`;
    m += `│ 📅 *ᴅᴀᴛᴇ:* ${date}\n`;
    m += `│ 🚀 *ᴠᴇʀsɪᴏɴ:* ${VERSION} (beta)\n`;
    m += `│ 📊 *ᴄᴏᴍᴍᴀɴᴅs:* ${TOTAL_COMMANDS} total\n`;
    m += `╰──────────────────\n\n`;

    m += `╭─── [ *📂 ᴄᴀᴛᴇɢᴏʀɪᴇs* ] ───\n`;
    for (const key of Object.keys(MENUS)) {
        const sec = MENUS[key];
        m += `│ ${sec.icon} *${sec.num}.* ${sec.label} (${sec.commands.length})\n`;
    }
    m += `╰──────────────────\n\n`;

    m += `> 💬 *Reply with number 1–${Object.keys(MENUS).length} to see commands*\n`;
    m += `> ⏳ *Menu active for 5 minutes*\n\n`;
    m += `> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴠɪʏᴀ Xᴍᴅ*`;
    return m;
}

function buildSubMenu(key, prefix) {
    const sec = MENUS[key];
    if (!sec) return null;

    let m = '';
    m += `╭── [ *${sec.icon} ${sec.label}* ] ──\n`;
    for (const c of sec.commands) {
        m += `│ \`${c.p}\` — ${c.d}\n`;
    }
    m += `╰──────────────────\n\n`;
    m += `> ⚡ *Prefix:* [ ${prefix} ] · *${sec.commands.length} commands*\n`;
    m += `> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴠɪʏᴀ-Xᴍᴅ*`;
    return m;
}

// ══════════════════════════════════════════════════════════════
//  .menu command
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'menu',
    alias:    ['panel', 'help', 'commands', 'cmds'],
    desc:     'WhiteShadow interactive menu',
    category: 'main',
    react:    '〽️',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const name   = m.pushName || 'User';
        const prefix = '.';

        // Fire react instantly — no await, no sleep
        conn.sendMessage(from, {
            react: { text: rnd(REACTS), key: mek.key }
        }).catch(() => {});

        const mainText = buildMainMenu(name, prefix);

        let sentMsg;
        try {
            sentMsg = await conn.sendMessage(from, {
                image: { url: POSTER_URL },
                caption: mainText,
                contextInfo: { ...CTX, mentionedJid: [sender] }
            }, { quoted: FakeVCard });
        } catch (_) {
            sentMsg = await conn.sendMessage(from, {
                text: mainText,
                contextInfo: { ...CTX, mentionedJid: [sender] }
            }, { quoted: FakeVCard });
        }

        const menuMsgId = sentMsg?.key?.id;
        const menuKeys  = Object.keys(MENUS);
        const numMap    = {};
        menuKeys.forEach(k => { numMap[String(MENUS[k].num)] = k; });

        const handler = async (msgData) => {
            try {
                const rcv = msgData.messages?.[0];
                if (!rcv?.message) return;

                const ctxId = rcv.message?.extendedTextMessage?.contextInfo?.stanzaId;
                if (ctxId !== menuMsgId) return;

                const txt = (
                    rcv.message.conversation ||
                    rcv.message.extendedTextMessage?.text || ''
                ).trim();

                const jid = rcv.key.remoteJid;
                if (!txt || !numMap[txt]) return;

                conn.sendMessage(jid, {
                    react: { text: rnd(REACTS), key: rcv.key }
                }).catch(() => {});

                const subText = buildSubMenu(numMap[txt], prefix);
                if (!subText) return;

                try {
                    await conn.sendMessage(jid, {
                        image: { url: POSTER_URL },
                        caption: subText,
                        contextInfo: CTX
                    }, { quoted: FakeVCard });
                } catch (_) {
                    await conn.sendMessage(jid, {
                        text: subText,
                        contextInfo: CTX
                    }, { quoted: FakeVCard });
                }

            } catch (e) {
                console.error('[MENU HANDLER]', e.message);
            }
        };

        conn.ev.on('messages.upsert', handler);

        setTimeout(() => {
            try { conn.ev.off('messages.upsert', handler); } catch (_) {}
        }, 5 * 60 * 1000);

    } catch (e) {
        console.error('[MENU CMD ERROR]', e);
        reply('❌ Menu error: ' + e.message);
    }
});

// ══════════════════════════════════════════════════════════════
//  Quick sub-menu shortcuts
// ══════════════════════════════════════════════════════════════

const shortcuts = [
    { p: 'downloadmenu', a: ['dlmenu','dmenu'],   key: 'download', react: '📥' },
    { p: 'moviemenu',    a: ['movmenu','mmenu'],  key: 'movie',    react: '🎬' },
    { p: 'aimenu',       a: ['funmenu'],          key: 'ai',       react: '🧠' },
    { p: 'stickermenu',  a: ['smenu'],            key: 'sticker',  react: '🎭' },
    { p: 'toolsmenu',    a: ['toolmenu'],         key: 'tools',    react: '🛠️' },
    { p: 'newsmenu',     a: ['nmenu'],            key: 'news',     react: '📰' },
    { p: 'groupmenu',    a: ['gmenu','groupcmd'], key: 'group',    react: '👥' },
    { p: 'ownermenu2',   a: ['omenu','botpanel'], key: 'owner',    react: '⚙️' },
    { p: 'systemmenu',   a: ['sysmenu','sysm'],   key: 'system',   react: '⚡' },
];

for (const s of shortcuts) {
    cmd({
        pattern:  s.p,
        alias:    s.a,
        desc:     `Show ${s.key} menu`,
        category: 'main',
        react:    s.react,
        filename: __filename
    },
    async (conn, mek, m, { from, sender, reply }) => {
        try {
            conn.sendMessage(from, { react: { text: s.react, key: mek.key } }).catch(() => {});

            const text = buildSubMenu(s.key, '.');
            try {
                await conn.sendMessage(from, {
                    image: { url: POSTER_URL },
                    caption: text,
                    contextInfo: { ...CTX, mentionedJid: [sender] }
                }, { quoted: FakeVCard });
            } catch (_) {
                await conn.sendMessage(from, {
                    text,
                    contextInfo: { ...CTX, mentionedJid: [sender] }
                }, { quoted: FakeVCard });
            }
        } catch (e) {
            reply('❌ ' + e.message);
        }
    });
}
