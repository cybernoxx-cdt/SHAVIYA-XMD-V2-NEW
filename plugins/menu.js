// ============================================================
//  menu.js — SHAVIYA-XMD V2
//  Premium Interactive Menu — CDT Crash Delta Team
//  100% Real Commands Only — Plugin Verified
// ============================================================

const { cmd } = require('../command');

const BOT_NAME   = 'SHAVIYA-XMD';
const VERSION    = 'V2';
const OWNER_NUM  = '94707085822';
const POSTER_URL = 'https://files.catbox.moe/f18ceb.jpg';
const YEAR       = '2026';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const FakeVCard = {
    key: { fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
    message: {
        contactMessage: {
            displayName: '© Mr Savendra',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V2\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=${OWNER_NUM}:+${OWNER_NUM}\nEND:VCARD`
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

// ── Reaction pool ──
const REACTS = ['👑','💎','🔥','⚡','🌟','✨','🚀','💫','🏆','🎯','💠','🔱'];
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];

// ══════════════════════════════════════════════════════════════
//  VERIFIED COMMAND DATA — Only real plugin commands
// ══════════════════════════════════════════════════════════════
const MENUS = {

    download: {
        icon: '📥',
        label: '𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗛𝗨𝗕',
        num: 1,
        commands: [
            { p: '.song',          a: 'play',           d: 'YouTube Song Download'      },
            { p: '.song2',         a: 'so',             d: 'YouTube Song v2'            },
            { p: '.video',         a: 'ytv, ytdown',    d: 'YouTube Video Download'     },
            { p: '.tiktok',        a: 'tt, ttdl',       d: 'TikTok Download'            },
            { p: '.tiktoksearch',  a: 'tts, ttts',      d: 'TikTok Search'              },
            { p: '.fb',            a: 'fbdl, facebook', d: 'Facebook Download'          },
            { p: '.fprofile',      a: 'fbprofile',      d: 'Facebook Profile Info'      },
            { p: '.twitter',       a: 'twdl, tweet',    d: 'Twitter/X Download'         },
            { p: '.mediafire',     a: 'mf',             d: 'MediaFire Download'         },
            { p: '.apk',           a: 'android, af',    d: 'APK Download'               },
            { p: '.gdrive',        a: 'gd',             d: 'Google Drive Download'      },
            { p: '.mega',          a: 'megadl',         d: 'Mega.nz Download'           },
            { p: '.megalist',      a: 'megafiles',      d: 'Mega Folder List'           },
            { p: '.download',      a: 'downurl',        d: 'Universal URL Download'     },
            { p: '.ud',            a: 'udrive',         d: 'UsersDrive Download'        },
            { p: '.imgbb',         a: 'img2url',        d: 'Image → ImgBB URL'          },
            { p: '.fileinfo',      a: 'mediainfo',      d: 'File Info / Media Details'  },
            { p: '.batchupload',   a: 'multiupload',    d: 'Batch File Upload'          },
            { p: '.getvoice',      a: 'gv',             d: 'Get Voice Note'             },
        ]
    },

    movie: {
        icon: '🎬',
        label: '𝗠𝗢𝗩𝗜𝗘 𝗛𝗨𝗕',
        num: 2,
        commands: [
            { p: '.movie',       a: 'cinesubz, cinetv', d: 'Main Movie Download'       },
            { p: '.pirate',      a: 'piratebay',         d: 'Pirate Movies'             },
            { p: '.piratelk',    a: 'plk',               d: 'PirateLK Movies'           },
            { p: '.dinka',       a: 'dk, movie1',        d: 'Dinka Movies'              },
            { p: '.sinhalasub',  a: 'ss',                d: 'Sinhala Sub Movies'        },
            { p: '.moviesub',    a: 'ms, submovie',      d: 'MovieSub'                  },
            { p: '.moviesublk',  a: 'msub',              d: 'MovieSubLK'                },
            { p: '.pupilmv',     a: 'pupil',             d: 'PupilMV Movies'            },
            { p: '.baiscope',    a: 'bs',                d: 'Baiscope Movies'           },
            { p: '.lakvision',   a: 'laktv, lk',         d: 'LakVision TV'              },
            { p: '.sayura',      a: 'sc, movie8',        d: 'Sayura Cinema'             },
            { p: '.anime',       a: 'ac2, slanime',      d: 'SL Anime Club'             },
            { p: '.cinejid',     a: 'cinegroup',         d: 'Get Cine Group JID'        },
        ]
    },

    ai: {
        icon: '🤖',
        label: '𝗔𝗜 & 𝗧𝗢𝗢𝗟𝗦',
        num: 3,
        commands: [
            { p: '.ai',         a: 'ask, gpt, chatgpt', d: 'AI Assistant (Multi-API)'  },
            { p: '.copilot',    a: 'cop, ai2',           d: 'Microsoft Copilot AI'      },
            { p: '.poem',       a: 'kaviya, kavi',       d: 'AI Poem Generator'         },
            { p: '.story',      a: 'aistory, tale',      d: 'AI Story Generator'        },
            { p: '.meme',       a: 'makememe, memegen',  d: 'Meme Generator'            },
            { p: '.randmeme',   a: 'rmeme, tkmeme',      d: 'Random Meme'               },
            { p: '.text2img',   a: 'genimg, imagine',    d: 'Text → Image (AI)'         },
            { p: '.sss',        a: 'ssweb',              d: 'Website Screenshot'        },
            { p: '.ocr',        a: 'readtext, img2text', d: 'Image → Text (OCR)'        },
            { p: '.stt',        a: 'voice2text, v2t',    d: 'Voice Note → Text'         },
            { p: '.qr',         a: 'qrcode, genqr',      d: 'QR Code Generator'         },
            { p: '.qrscan',     a: 'readqr, scanqr',     d: 'QR Code Scanner'           },
            { p: '.compress',   a: 'comp, compimg',      d: 'Image/Video Compressor'    },
            { p: '.cricket',    a: 'cric, score',        d: 'Live Cricket Scores 🏏'    },
            { p: '.trt',        a: 'translate',          d: 'Translate Text'            },
            { p: '.tts',        a: 'speak, voice',       d: 'Text to Speech'            },
            { p: '.tts2',       a: 'sitts, sivoice',     d: 'Sinhala TTS'               },
            { p: '.location',   a: 'loc, maps',          d: 'Location Finder'           },
            { p: '.lyrics',     a: 'ly',                 d: 'Song Lyrics Search'        },
            { p: '.readmore',   a: 'rm, rmore',          d: 'WhatsApp Read More Msg'    },
            { p: '.gplink',     a: 'bypass, bl',         d: 'GPLink Bypass'             },
            { p: '.emix',       a: 'emix',               d: 'Emoji Mixer'               },
            { p: '.npm',        a: 'npm',                d: 'NPM Package Search'        },
            { p: '.news3',      a: 'sirasa',             d: 'Sirasa News'               },
            { p: '.jid',        a: 'getjid',             d: 'Get WhatsApp JID'          },
            { p: '.getpp',      a: 'fullpp, getdp',      d: 'Get Profile Picture'       },
            { p: '.fulldp',     a: 'fullpp, setdp',      d: 'Full Display Picture'      },
            { p: '.vv',         a: 'viewonce, retrieve', d: 'View Once Open'            },
            { p: '.forward',    a: 'fw, fwd',            d: 'Forward Message'           },
            { p: '.send',       a: 'sendme, save',       d: 'Save/Send Status'          },
            { p: '.creact',     a: 'massreact, chr',     d: 'Mass React'                },
            { p: '.sticker',    a: 's, stickergif',      d: 'Create Sticker'            },
            { p: '.gst',        a: 'gstatus, gsx',       d: 'Group Status'              },
        ]
    },

    group: {
        icon: '👥',
        label: '𝗚𝗥𝗢𝗨𝗣 𝗠𝗚𝗠𝗧',
        num: 4,
        commands: [
            { p: '.add',       a: 'invite',      d: 'Add Member to Group'       },
            { p: '.kick',      a: 'remove',      d: 'Kick Member'               },
            { p: '.promote',   a: 'setadmin',    d: 'Promote to Admin'          },
            { p: '.demote',    a: 'unadmin',     d: 'Demote Admin'              },
            { p: '.tagall',    a: 'everyone',    d: 'Tag All Members'           },
            { p: '.hidetag',   a: 'tag, h',      d: 'Silent Tag All'            },
            { p: '.mute',      a: 'mute',        d: 'Mute Group Chat'           },
            { p: '.unmute',    a: 'unmute',      d: 'Unmute Group Chat'         },
            { p: '.groupinfo', a: 'ginfo',       d: 'Group Info & Stats'        },
            { p: '.gid',       a: 'groupid',     d: 'Get Group JID'             },
            { p: '.antilink',  a: 'antilnk',     d: 'Anti Link Protection'      },
            { p: '.welcome',   a: 'setwelcome',  d: 'Set Welcome Message'       },
        ]
    },

    settings: {
        icon: '⚙️',
        label: '𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦',
        num: 5,
        commands: [
            { p: '.setting',     a: 'settings, config',  d: 'Bot Settings Panel'       },
            { p: '.set',         a: 'botset, bsettings', d: 'Quick Settings Toggle'    },
            { p: '.toggle',      a: 'tgl',               d: 'Feature Toggle'           },
            { p: '.antidelete',  a: 'antidel',           d: 'Anti Delete Toggle'       },
            { p: '.autovoice',   a: 'autovc',            d: 'Auto Voice Toggle'        },
            { p: '.button',      a: 'btnmode',           d: 'Button Mode Toggle'       },
            { p: '.setfooter',   a: 'botname',           d: 'Set Bot Footer Name'      },
            { p: '.setthumb',    a: 'thumburl',          d: 'Set Thumbnail URL'        },
            { p: '.setprefix',   a: 'docprefix',         d: 'Set Caption Prefix'       },
            { p: '.setfname',    a: 'filenamepre',       d: 'Set File Name Prefix'     },
            { p: '.moviedoc',    a: 'posterthumb',       d: 'Movie Poster as Thumb'    },
            { p: '.moviesettings', a: 'msettings',       d: 'Movie Settings View'      },
            { p: '.setforward',  a: 'forwarddest',       d: 'Set Auto Forward Target'  },
        ]
    },

    access: {
        icon: '💎',
        label: '𝗔𝗖𝗖𝗘𝗦𝗦 𝗖𝗧𝗥𝗟',
        num: 6,
        commands: [
            { p: '.setmode',      a: 'mode',      d: 'Set Bot Mode (public/private)'  },
            { p: '.addpremium',   a: 'ap',        d: 'Add Premium User'               },
            { p: '.removepremium',a: 'rp',        d: 'Remove Premium User'            },
            { p: '.listpremium',  a: 'lp',        d: 'List Premium Users'             },
            { p: '.ban',          a: 'ban',       d: 'Ban User from Bot'              },
            { p: '.unban',        a: 'unban',     d: 'Unban User'                     },
            { p: '.setsudo',      a: 'addsudo',   d: 'Add Sudo User'                  },
            { p: '.delsudo',      a: 'removesudo',d: 'Remove Sudo User'               },
            { p: '.listsudo',     a: 'listowner', d: 'List Sudo Users'                },
            { p: '.plugins',      a: 'pluginlist',d: 'Plugin Manager'                 },
        ]
    },

    owner: {
        icon: '👑',
        label: '𝗢𝗪𝗡𝗘𝗥 𝗣𝗔𝗡𝗘𝗟',
        num: 7,
        commands: [
            { p: '.owner',      a: 'ownerinfo',   d: 'Owner Information'          },
            { p: '.block',      a: 'block',        d: 'Block User'                 },
            { p: '.unblock',    a: 'unblock',      d: 'Unblock User'               },
            { p: '.pair',       a: 'getpair',      d: 'Get New Session Code'       },
            { p: '.restart',    a: 'reboot, rst',  d: 'Restart Bot'                },
            { p: '.update',     a: 'botupdate',    d: 'Check & Update Bot'         },
            { p: '.ownermenu',  a: 'omenu',        d: 'Owner Control Panel'        },
            { p: '.setforward', a: 'forwarddest',  d: 'Auto Forward Config'        },
        ]
    },

    system: {
        icon: '⚡',
        label: '𝗦𝗬𝗦𝗧𝗘𝗠',
        num: 8,
        commands: [
            { p: '.alive',   a: 'hyshavi, shavi',  d: 'Bot Alive Check'              },
            { p: '.ping',    a: 'speed, pong',      d: 'Ping — Animated Loader'       },
            { p: '.ping2',   a: 'p2, latency',      d: 'Ping — Ultra Minimal'         },
            { p: '.system',  a: 'botinfo',          d: 'System Stats & RAM'           },
            { p: '.menu',    a: 'panel, help',      d: 'Show This Menu'               },
        ]
    }
};

// ══════════════════════════════════════════════════════════════
//  BUILD FUNCTIONS
// ══════════════════════════════════════════════════════════════

function buildMainMenu(name, prefix) {
    const now = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Colombo',
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    let m = '';
    m += `✦ ─────────────────── ✦\n`;
    m += `  🔮 *𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 ${VERSION}* 🔮\n`;
    m += `✦ ─────────────────── ✦\n\n`;
    m += `> 👤 *${name}* · 🕐 *${now}*\n`;
    m += `> ⚙️ *Prefix:* [ ${prefix} ] · 🟢 *Online*\n\n`;
    m += `✦ ─────────────────── ✦\n`;
    m += `  📂 *𝗦𝗘𝗟𝗘𝗖𝗧 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬*\n`;
    m += `✦ ─────────────────── ✦\n\n`;

    for (const key of Object.keys(MENUS)) {
        const sec = MENUS[key];
        m += `⊹ *${sec.num}.* ${sec.icon} *${sec.label}*\n`;
    }

    m += `\n✦ ─────────────────── ✦\n`;
    m += `> 💬 *Reply with number 1–8*\n`;
    m += `> ⏳ *Menu active: 5 minutes*\n`;
    m += `✦ ─────────────────── ✦\n`;
    m += `> 💎 *𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 Sʜᴀᴠɪʏᴀ* 🔥`;
    return m;
}

function buildSubMenu(key, prefix) {
    const sec = MENUS[key];
    if (!sec) return null;

    let m = '';
    m += `✦ ─────────────────── ✦\n`;
    m += `  ${sec.icon} *${sec.label}*\n`;
    m += `✦ ─────────────────── ✦\n\n`;

    for (const c of sec.commands) {
        m += `⊹ *${c.p}*`;
        if (c.a) m += `  ›  _${c.a}_`;
        m += `\n   📌 ${c.d}\n`;
    }

    m += `\n✦ ─────────────────── ✦\n`;
    m += `> 📝 *Prefix:* [ ${prefix} ]  ·  *${sec.commands.length} commands*\n`;
    m += `> 💎 *𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 ${VERSION}* 🔥`;
    return m;
}

// ══════════════════════════════════════════════════════════════
//  .menu — Main interactive menu
// ══════════════════════════════════════════════════════════════
cmd({
    pattern:  'menu',
    alias:    ['panel', 'help', 'commands', 'cmds'],
    desc:     'Premium interactive menu',
    category: 'main',
    react:    '〽️',
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const name   = m.pushName || 'User';
        const prefix = '.';

        // React immediately
        await conn.sendMessage(from, {
            react: { text: rnd(REACTS), key: mek.key }
        });

        // Typing presence
        await conn.sendPresenceUpdate('composing', from);
        await sleep(800);
        await conn.sendPresenceUpdate('available', from);

        const mainText = buildMainMenu(name, prefix);

        // Send main menu with image
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

        // ── Sub-menu reply handler ──
        const handler = async (msgData) => {
            try {
                const rcv = msgData.messages?.[0];
                if (!rcv?.message) return;

                // Must be a reply to this menu message
                const ctxId = rcv.message?.extendedTextMessage?.contextInfo?.stanzaId;
                if (ctxId !== menuMsgId) return;

                const txt = (
                    rcv.message.conversation ||
                    rcv.message.extendedTextMessage?.text || ''
                ).trim();

                const jid = rcv.key.remoteJid;
                if (!txt || !numMap[txt]) return;

                // React to selection
                await conn.sendMessage(jid, {
                    react: { text: rnd(REACTS), key: rcv.key }
                });

                await conn.sendPresenceUpdate('composing', jid);
                await sleep(600);
                await conn.sendPresenceUpdate('available', jid);

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

        // Auto-remove listener after 5 min
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
    { p: 'toolsmenu',    a: ['toolmenu','aimenu'],   key: 'ai',       react: '🤖' },
    { p: 'ownermenu',    a: ['omenu','botpanel'],    key: 'owner',    react: '👑' },
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
            await conn.sendMessage(from, { react: { text: s.react, key: mek.key } });
            await conn.sendPresenceUpdate('composing', from);
            await sleep(500);
            await conn.sendPresenceUpdate('available', from);

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
