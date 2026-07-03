// ============================================================
//  always-offline.js — SHAVIYA-XMD V2
//  👻 Always Offline / Invisible Mode Plugin
//  ✅ MongoDB persistence — state saved after restart
//  ✅ File fallback — saves to data/offline_state.json
//  ✅ Startup hook — presence applied immediately on bot start
//  © Mr Savendra · Crash Delta Team (CDT)
// ============================================================

const { cmd } = require('../command');
const fs      = require('fs');
const path    = require('path');

// ─── FILE FALLBACK PATH ──────────────────────────────────────
const DATA_DIR      = path.join(__dirname, '../data');
function getFallbackFile(sid) { return path.join(DATA_DIR, `offline_state_${sid}.json`); }

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
async function readState(sessionId = 'main') {
    // 1. MongoDB first
    try {
        const Model = getModel();
        if (Model) {
            const doc = await Model.findById(sessionId);
            if (doc) return doc.value;
        }
    } catch (e) {
        console.error('[OFFLINE] MongoDB read error:', e.message);
    }

    // 2. File fallback
    try {
        const ff = getFallbackFile(sessionId);
        if (fs.existsSync(ff)) {
            const raw = fs.readFileSync(ff, 'utf-8');
            return JSON.parse(raw).alwaysOffline === true;
        }
    } catch (_) {}

    return false; // default = off
}

// ─── WRITE STATE ─────────────────────────────────────────────
async function writeState(value, sessionId = 'main') {
    // 1. MongoDB
    try {
        const Model = getModel();
        if (Model) {
            await Model.findByIdAndUpdate(
                sessionId,
                { value },
                { upsert: true, new: true }
            );
        }
    } catch (e) {
        console.error('[OFFLINE] MongoDB write error:', e.message);
    }

    // 2. File fallback (always write — double safety)
    try {
        fs.writeFileSync(getFallbackFile(sessionId), JSON.stringify({ alwaysOffline: value }, null, 2));
    } catch (e) {
        console.error('[OFFLINE] File write error:', e.message);
    }
}

// ─── GLOBAL STATE ────────────────────────────────────────────
if (!global._alwaysOfflineMap) global._alwaysOfflineMap = {};
// Helper
function isOffline(sid) { return global._alwaysOfflineMap[sid] === true; }
function setOffline(sid, val) { global._alwaysOfflineMap[sid] = val; }

// ─── PRESENCE HOOK ───────────────────────────────────────────
// Registered once — keeps bot offline on every incoming message
let _hookRegistered = false;

function registerOfflineHook(conn) {
    if (_hookRegistered) return;
    _hookRegistered = true;

    conn.ev.on('messages.upsert', async ({ messages }) => {
        const _sid = global._activeConns
            ? [...(global._activeConns.entries() || [])].find(([, cc]) => cc === conn)?.[0] || 'main'
            : 'main';
        if (!isOffline(_sid)) return;
        for (const msg of messages) {
            if (!msg.key?.remoteJid) continue;
            try {
                await conn.sendPresenceUpdate('unavailable', msg.key.remoteJid);
            } catch (_) {}
        }
    });

    console.log('[OFFLINE] Presence hook registered');
}

// ─── STARTUP LOAD ────────────────────────────────────────────
// Load saved state from MongoDB/file on bot start
// 4s delay — wait for mongoose + global._activeConns to be ready
setTimeout(async () => {
    try {
        // Load state for each active session
        const connMap = global._activeConns;
        if (connMap) {
            for (const [sid, conn2] of connMap) {
                const saved = await readState(sid);
                setOffline(sid, saved);
                if (saved) {
                    registerOfflineHook(conn2);
                    try { await conn2.sendPresenceUpdate('unavailable'); } catch (_) {}
                } else {
                    try { await conn2.sendPresenceUpdate('available'); } catch (_) {}
                }
            }
        }
    } catch (e) {
        console.error('[OFFLINE] Startup load error:', e.message);
    }
}, 4000);

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
async (conn, mek, m, { from, q, reply, sessionId }) => {

    // Register hook on first command use
    registerOfflineHook(conn);

    const arg = (q || '').trim().toLowerCase();

    // ── ON ──
    if (arg === 'on') {
        setOffline(sessionId, true);
        await writeState(true, sessionId);
        await conn.sendPresenceUpdate('unavailable');
        return reply(
            '👻 *Always Offline Mode — ON*\n\n'
            + '✅ _Saved to MongoDB_\n'
            + '✅ _Stays ON after restart_\n\n'
            + '_Bot will now appear Offline/Invisible in all chats._\n\n'
            + '> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮'
        );
    }

    // ── OFF ──
    if (arg === 'off') {
        setOffline(sessionId, false);
        await writeState(false, sessionId);
        await conn.sendPresenceUpdate('available');
        return reply(
            '✅ *Always Offline Mode — OFF*\n\n'
            + '✅ _Saved to MongoDB_\n'
            + '✅ _Stays OFF after restart_\n\n'
            + '_Bot will now appear with normal Online status._\n\n'
            + '> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮'
        );
    }

    // ── STATUS ──
    const status = isOffline(sessionId)
        ? '👻 *ON* — Offline / Invisible'
        : '🟢 *OFF* — Normal Online';

    reply(
        '👻 *Always Offline Mode*\n\n'
        + `📡 *Current Status:* ${status}\n\n`
        + '━━━━━━━━━━━━━━━━━━━━━\n'
        + '*Usage:*\n'
        + '`.alwaysoffline on` — Enable offline mode\n'
        + '`.alwaysoffline off` — Disable offline mode\n'
        + '`.alwaysoffline` — Check current status\n\n'
        + '💡 _State saved to MongoDB — survives restarts_\n\n'
        + '> © Mr Savendra · 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮'
    );
});
