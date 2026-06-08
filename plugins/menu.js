// ============================================================
//  menu.js — SHAVIYA-XMD V2
//  Restyled by CDT — WhiteShadow Style
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

const REACTS = ['👑','💎','🔥','⚡','🌟','✨','🚀','💫','🏆','🎯','💠','🔱'];
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];

// ══════════════════════════════════════════════════════════════
//  COMMAND DATA
// ══════════════════════════════════════════════════════════════
const MENUS = {

    download: {
        icon: '📥',
        label: 'ᴅᴏᴡɴʟᴏᴀᴅᴇʀs',
        num: 1,
        commands: [
            { p: '.song',          d: 'YouTube Song Download'      },
            { p: '.video',         d: 'YouTube Video Download'     },
            { p: '.spotify',       d: 'Spotify Download'           },
            { p: '.tiktok',        d: 'TikTok Download'            },
            { p: '.fb',            d: 'Facebook Download'          },
            { p: '.insta',         d: 'Instagram Download'         },
            { p: '.mediafire',     d: 'MediaFire Download'         },
            { p: '.apk',           d: 'APK Download'               },
            { p: '.gdrive',        d: 'Google Drive Download'      },
            { p: '.pastpaper',     d: 'Past Paper Download'        },
            { p: '.web2zip',       d: 'Web to ZIP'                 },
        ]
    },

    movie: {
        icon: '🎬',
        label: 'ᴍᴏᴠɪᴇ ʜᴜʙ',
        num: 2,
        commands: [
            { p: '.movie',       d: 'Main Movie Download'       },
            { p: '.pirate',      d: 'Pirate Movies'             },
            { p: '.dinka',       d: 'Dinka Movies'              },
            { p: '.sinhalasub',  d: 'Sinhala Sub Movies'        },
            { p: '.cz2',    d: 'CineSubz Movies'                  },
            { p: '.baiscope',    d: 'Baiscope Movies'           },
            { p: '.lakvision',   d: 'LakVision TV'              },
            { p: '.anime',       d: 'SL Anime Club'             },
        ]
    },

    ai: {
        icon: '🧠',
        label: 'sᴇᴀʀᴄʜ & ᴀɪ',
        num: 3,
        commands: [
            { p: '.ai',         d: 'AI Assistant'              },
            { p: '.gen',        d: 'AI Image Generator'        },
            { p: '.lyrics',     d: 'Song Lyrics Search'        },
            { p: '.google',     d: 'Google Search'             },
            { p: '.getpp',      d: 'Get Profile Picture'       },
            { p: '.sps',        d: 'Spotify Search'            },
            { p: '.yts',        d: 'YouTube Search'            },
            { p: '.ts',         d: 'TikTok Search'             },
            { p: '.img',        d: 'Image Search'              },
            { p: '.fancy',      d: 'Fancy Text Generator'      },
            { p: '.math',       d: 'Math Calculator'           },
        ]
    },

    tools: {
        icon: '🛠️',
        label: 'ᴛᴏᴏʟs',
        num: 4,
        commands: [
            { p: '.fetch',      d: 'Website Fetch'             },
            { p: '.sticker',    d: 'Create Sticker'            },
            { p: '.take',       d: 'Sticker to Image'          },
            { p: '.ping2',      d: 'Ultra Ping'                },
            { p: '.ginfo',      d: 'Group Info'                },
            { p: '.readmore',   d: 'Read More Message'         },
        ]
    },

    news: {
        icon: '📰',
        label: 'ɴᴇᴡs & ᴜᴘᴅᴀᴛᴇs',
        num: 5,
        commands: [
            { p: '.worldnews',   d: 'World News'               },
            { p: '.sinhalanews', d: 'Sinhala News'             },
            { p: '.derana',      d: 'Derana News'              },
            { p: '.news1st',     d: 'News 1st'                 },
        ]
    },

    group: {
        icon: '👥',
        label: 'ɢʀᴏᴜᴘ ᴍɢᴍᴛ',
        num: 6,
        commands: [
            { p: '.add',       d: 'Add Member'               },
            { p: '.kick',      d: 'Kick Member'              },
            { p: '.promote',   d: 'Promote to Admin'         },
            { p: '.demote',    d: 'Demote Admin'             },
            { p: '.tagall',    d: 'Tag All Members'          },
            { p: '.hidetag',   d: 'Silent Tag All'           },
            { p: '.mute',      d: 'Mute Group'               },
            { p: '.unmute',    d: 'Unmute Group'             },
            { p: '.antilink',  d: 'Anti Link Protection'     },
            { p: '.welcome',   d: 'Set Welcome Message'      },
        ]
    },

    owner: {
        icon: '⚙️',
        label: 'ᴍᴀɪɴ & ᴏᴡɴᴇʀ',
        num: 7,
        commands: [
            { p: '.pair',       d: 'Get Session Pair Code'    },
            { p: '.ping',       d: 'Bot Ping'                 },
            { p: '.ping2',      d: 'Ultra Ping'               },
            { p: '.hidetag',    d: 'Silent Tag'               },
            { p: '.alive',      d: 'Bot Alive Check'          },
            { p: '.jid',        d: 'Get JID'                  },
            { p: '.owner',      d: 'Owner Info'               },
            { p: '.setting',    d: 'Bot Settings'             },
            { p: '.block',      d: 'Block User'               },
            { p: '.unblock',    d: 'Unblock User'             },
            { p: '.vv',         d: 'View Once Open'           },
            { p: '.save',       d: 'Save Status'              },
            { p: '.grouplist',  d: 'Group List'               },
            { p: '.join',       d: 'Join Group'               },
            { p: '.leave',      d: 'Leave Group'              },
            { p: '.upload',     d: 'Upload File'              },
            { p: '.csong',      d: 'Custom Song'              },
        ]
    },

    system: {
        icon: '⚡',
        label: 'sʏsᴛᴇᴍ',
        num: 8,
        commands: [
            { p: '.alive',   d: 'Bot Alive Check'              },
            { p: '.ping',    d: 'Ping'                         },
            { p: '.ping2',   d: 'Ultra Ping'                   },
            { p: '.system',  d: 'System Stats'                 },
            { p: '.menu',    d: 'Show This Menu'               },
        ]
    }
};

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
    m += `╰──────────────────\n\n`;

    m += `╭─── [ *📂 ᴄᴀᴛᴇɢᴏʀɪᴇs* ] ───\n`;
    for (const key of Object.keys(MENUS)) {
        const sec = MENUS[key];
        m += `│ ${sec.icon} *${sec.num}.* ${sec.label}\n`;
    }
    m += `╰──────────────────\n\n`;

    m += `> 💬 *Reply with number 1–8 to see commands*\n`;
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
    { p: 'downloadmenu', a: ['dlmenu','dmenu'],     key: 'download', react: '📥' },
    { p: 'moviemenu',    a: ['movmenu','mmenu'],     key: 'movie',    react: '🎬' },
    { p: 'groupmenu',    a: ['gmenu','groupcmd'],    key: 'group',    react: '👥' },
    { p: 'toolsmenu',    a: ['toolmenu','aimenu'],   key: 'ai',       react: '🧠' },
    { p: 'ownermenu',    a: ['omenu','botpanel'],    key: 'owner',    react: '⚙️' },
    { p: 'systemmenu',   a: ['sysmenu','sysm'],      key: 'system',   react: '⚡' },
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
