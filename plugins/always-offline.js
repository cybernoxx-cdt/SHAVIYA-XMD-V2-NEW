// ============================================================
//  always-offline.js — SHAVIYA-XMD V2
//  👻 Always Offline / Invisible Mode Plugin
//  ✅ MongoDB persistence — restart ෙකන් පස්සෙත් state save වෙනවා
//  ✅ File fallback — MongoDB නැතත් data/offline_state.json ෙල save
//  © Mr Savendra · Crash Delta Team (CDT)
// ============================================================

const { cmd } = require('../command');
const fs      = require('fs');
const path    = require('path');

// ─── FILE FALLBACK PATH ──────────────────────────────────────
const DATA_DIR    = path.join(__dirname, '../data');
const FALLBACK_FILE = path.join(DATA_DIR, 'offline_state.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── MONGOOSE MODEL ──────────────────────────────────────────
let _OfflineModel = null;

function getModel() {
    if (_OfflineModel) return _OfflineModel;
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) return null;
        const schema = new mongoose.Schema(
            { _id: String, value: Boolean },
            { collection: 'bot_offline_state' }
        );
        _OfflineModel = mongoose.models.BotOfflineState ||
                        mongoose.model('BotOfflineState', schema);
        return _OfflineModel;
    } catch (_) {
        return null;
    }
}

// ─── READ STATE ──────────────────────────────────────────────
async function readState() {
    // 1. MongoDB try
    try {
        const Model = getModel();
        if (Model) {
            const doc = await Model.findById('alwaysOffline');
            if (doc) return doc.value;
        }
    } catch (e) {
        console.error('[OFFLINE] MongoDB read error:', e.message);
    }

    // 2. File fallback
    try {
        if (fs.existsSync(FALLBACK_FILE)) {
            const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8');
            return JSON.parse(raw).alwaysOffline === true;
        }
    } catch (_) {}

    return false; // default = off
}

// ─── WRITE STATE ─────────────────────────────────────────────
async function writeState(value) {
    // 1. MongoDB try
    try {
        const Model = getModel();
        if (Model) {
            await Model.findByIdAndUpdate(
                'alwaysOffline',
                { value },
                { upsert: true, new: true }
            );
        }
    } catch (e) {
        console.error('[OFFLINE] MongoDB write error:', e.message);
    }

    // 2. File fallback (always write — double safety)
    try {
        fs.writeFileSync(FALLBACK_FILE, JSON.stringify({ alwaysOffline: value }, null, 2));
    } catch (e) {
        console.error('[OFFLINE] File write error:', e.message);
    }
}

// ─── GLOBAL STATE INIT ───────────────────────────────────────
if (global._alwaysOffline === undefined) global._alwaysOffline = false;

// ─── PRESENCE HOOK ───────────────────────────────────────────
let _hookRegistered = false;

function registerOfflineHook(conn) {
    if (_hookRegistered) return;
    _hookRegistered = true;

    conn.ev.on('messages.upsert', async ({ messages }) => {
        if (!global._alwaysOffline) return;
        for (const msg of messages) {
            if (!msg.key?.remoteJid) continue;
            try {
                await conn.sendPresenceUpdate('unavailable', msg.key.remoteJid);
            } catch (_) {}
        }
    });
}

// ─── STARTUP LOAD ────────────────────────────────────────────
// Bot start වෙද්දී MongoDB / file ෙකන් state load කරගන්නවා
// mongoose connection ready වෙන්න ටිකක් ගත වෙන නිසා 3s delay
setTimeout(async () => {
    try {
        const saved = await readState();
        global._alwaysOffline = saved;
        if (saved) {
            console.log('[OFFLINE] ✅ Always Offline mode loaded from DB — ON');
        }
    } catch (e) {
        console.error('[OFFLINE] Startup load error:', e.message);
    }
}, 3000);

// ─────────────────────────────────────────────────────────────
// CMD — .alwaysoffline on / off / status
// ─────────────────────────────────────────────────────────────
cmd({
    pattern:  'alwaysoffline',
    alias:    ['aoffline', 'offlinemode'],
    react:    '👻',
    desc:     'Bot always offline/invisible mode (MongoDB saved)',
    category: 'owner',
    fromMe:   true,
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {

    // Hook register
    registerOfflineHook(conn);

    const arg = (q || '').trim().toLowerCase();

    if (arg === 'on') {
        global._alwaysOffline = true;
        await writeState(true);
        await conn.sendPresenceUpdate('unavailable', from);
        return reply(
            '👻 *Always Offline Mode — ON*\n\n'
            + '✅ _MongoDB ෙල Save විය_\n'
            + '✅ _Restart ෙකන් පස්සෙත් ON ෙවනවා_\n\n'
            + '_Bot දැන් සෑම Chat ෙකදීම Offline/Invisible ෙලස පෙනෙනවා._'
        );
    }

    if (arg === 'off') {
        global._alwaysOffline = false;
        await writeState(false);
        await conn.sendPresenceUpdate('available', from);
        return reply(
            '✅ *Always Offline Mode — OFF*\n\n'
            + '✅ _MongoDB ෙල Save විය_\n\n'
            + '_Bot දැන් සාමාන්‍ය Online status ෙලස පෙනෙනවා._'
        );
    }

    // Status
    const status = global._alwaysOffline
        ? '👻 *ON* — Offline/Invisible'
        : '🟢 *OFF* — Normal Online';

    reply(
        '👻 *Always Offline Mode*\n\n'
        + `📡 *Current:* ${status}\n\n`
        + '*Usage:*\n'
        + '`.alwaysoffline on` — Enable\n'
        + '`.alwaysoffline off` — Disable\n\n'
        + '> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮'
    );
});
