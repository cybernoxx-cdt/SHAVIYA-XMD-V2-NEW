// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   lib/settings.js — SHAVIYA-XMD V2
//
//   ✅ PER-SESSION isolation — each bot session has own settings
//   ✅ MongoDB PRIMARY save  (survives restarts)
//   ✅ Local file FALLBACK   (works without MongoDB)
//   ✅ RAM cache per session  (zero DB reads per command)
//   ✅ FIX: Model init retried after mongoose connects
//   ✅ FIX: setSetting always saves to both MongoDB + file
//   ✅ FIX: Delayed retry closure captures sessionId correctly
//   Priority: MongoDB → file → env → hardcoded default
//
//   HOW TO USE (per-session):
//     getSetting(key, sessionId)
//     setSetting(key, value, sessionId)
//     loadSettingsFromDB(sessionId)
//
//   Backward compatible — sessionId defaults to 'main' if omitted
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Env helpers ──────────────────────────────────────────────
function envBool(key, fallback = false) {
    const v = process.env[key];
    if (v === undefined || v === null || v === '') return fallback;
    if (v === 'false' || v === '0') return false;
    return v === 'true' || v === '1';
}
function envStr(key, fallback = '') {
    return process.env[key] || fallback;
}

// ── Defaults ─────────────────────────────────────────────────
const DEFAULTS = {
    mode:           envStr('MODE', 'public'),
    prefix:         envStr('PREFIX', '.'),
    autoVoice:      envBool('AUTO_VOICE'),
    autoAI:         envBool('AUTO_AI'),
    autoReadStatus: true,
    autoStatusRead: true,
    autoStatusLike: envBool('AUTO_REACT_STATUS', true),
    autoStatusEmoji: '❤️',
    autoReadCmd:    envBool('AUTO_READ_CMD', true),
    antiLink:       envBool('ANTILINK'),
    antiBot:        envBool('ANTI_BOT'),
    antidelete:     envBool('ANTI_DELETE'),
    antiBadWords:   envBool('ANTI_BAD_WORDS_ENABLED'),
    badWordList:    envStr('ANTI_BAD_WORDS', '').split(',').filter(Boolean),
    alwaysOffline:  false,
    antiCall:       envBool('ANTI_CALL'),
    autoViewOnce:   envBool('AUTO_VIEW_ONCE', true),
    welcome:        envBool('WELCOME', false),
    adminEvents:    envBool('ADMIN_EVENTS', false),
    button:         false,
    buttonStyle:    'default',
    footer:         'Powered By Sʜᴀᴠɪʏᴀ-Xᴍᴅ 💎',
    thumb:          '',
    fname:          '',
    moviedoc:       false,
    premiumUsers:   [],
    sudoUsers:      [],
    bannedUsers:    [],
    allowedGroups:  [],
    lastUpdated:    Date.now(),
};

// ── MongoDB model ─────────────────────────────────────────────
let _SettingsModel = null;

function getModel() {
    if (_SettingsModel) return _SettingsModel;
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) return null;
        const schema = new mongoose.Schema(
            { _id: String, data: mongoose.Schema.Types.Mixed },
            { collection: 'bot_settings' }
        );
        _SettingsModel = mongoose.models.BotSettings ||
                         mongoose.model('BotSettings', schema);
        return _SettingsModel;
    } catch (_) {
        return null;
    }
}

// ── Per-session RAM cache ─────────────────────────────────────
// _cache['main'] = {...}, _cache['session2'] = {...}
const _cache = {};

// ── Session-aware file path ───────────────────────────────────
function getSettingsFile(sessionId) {
    return path.join(DATA_DIR, `settings_${sessionId}.json`);
}

// ── Load from MongoDB ─────────────────────────────────────────
async function loadFromMongo(sessionId) {
    try {
        const Model = getModel();
        if (!Model) return null;
        const doc = await Model.findById(`settings_${sessionId}`).lean();
        if (doc && doc.data && typeof doc.data === 'object') {
            return doc.data;
        }
        return null;
    } catch (e) {
        console.log(`[SETTINGS][${sessionId}] MongoDB load error:`, e.message);
        return null;
    }
}

// ── Save to MongoDB ───────────────────────────────────────────
async function saveToMongo(sessionId, settings) {
    const docId = `settings_${sessionId}`;

    const tryMongo = async (sid, data) => {
        const Model = getModel();
        if (!Model) return false;
        await Model.findByIdAndUpdate(
            sid,
            { $set: { data } },
            { upsert: true, new: true }
        );
        return true;
    };

    try {
        const saved = await tryMongo(docId, settings);
        if (!saved) {
            // MongoDB not ready — retry with correct closure
            const _id  = docId;
            const _dat = JSON.parse(JSON.stringify(settings));
            setTimeout(async () => {
                try {
                    const ok = await tryMongo(_id, _dat);
                    if (ok) console.log(`[SETTINGS][${sessionId}] ✅ Delayed MongoDB save OK`);
                } catch (e) {
                    console.log(`[SETTINGS][${sessionId}] Delayed save error:`, e.message);
                }
            }, 3000);
        }
        return saved;
    } catch (e) {
        console.log(`[SETTINGS][${sessionId}] MongoDB save error:`, e.message);
        return false;
    }
}

// ── Load from local file ──────────────────────────────────────
function loadFromFile(sessionId) {
    try {
        // Try session-specific file first
        const sessionFile = getSettingsFile(sessionId);
        if (fs.existsSync(sessionFile)) {
            return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        }
        // Fallback: legacy global settings.json (migration support)
        if (sessionId === 'main') {
            const legacyFile = path.join(DATA_DIR, 'settings.json');
            if (fs.existsSync(legacyFile)) {
                return JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
            }
        }
    } catch (e) {
        console.log(`[SETTINGS][${sessionId}] File load error:`, e.message);
    }
    return null;
}

// ── Save to local file ────────────────────────────────────────
function saveToFile(sessionId, settings) {
    try {
        fs.writeFileSync(getSettingsFile(sessionId), JSON.stringify(settings, null, 2));
        return true;
    } catch (e) {
        console.log(`[SETTINGS][${sessionId}] File save error:`, e.message);
        return false;
    }
}

// ── Boot loader — call once at startup per session ───────────
async function loadSettingsFromDB(sessionId = 'main') {
    try {
        const mongoData = await loadFromMongo(sessionId);
        if (mongoData) {
            _cache[sessionId] = { ...DEFAULTS, ...mongoData };
            saveToFile(sessionId, _cache[sessionId]);
            console.log(`[SETTINGS][${sessionId}] ✅ Loaded from MongoDB`);
            return _cache[sessionId];
        }
    } catch (_) {}

    const fileData = loadFromFile(sessionId);
    if (fileData) {
        _cache[sessionId] = { ...DEFAULTS, ...fileData };
        await saveToMongo(sessionId, _cache[sessionId]).catch(() => {});
        console.log(`[SETTINGS][${sessionId}] ✅ Loaded from file → synced to MongoDB`);
        return _cache[sessionId];
    }

    _cache[sessionId] = { ...DEFAULTS };
    await saveToMongo(sessionId, _cache[sessionId]).catch(() => {});
    saveToFile(sessionId, _cache[sessionId]);
    console.log(`[SETTINGS][${sessionId}] ✅ Loaded defaults → saved`);
    return _cache[sessionId];
}

// ── Sync load (RAM cache only — hot path) ────────────────────
function loadSettings(sessionId = 'main') {
    if (_cache[sessionId]) return _cache[sessionId];
    const fileData = loadFromFile(sessionId);
    _cache[sessionId] = { ...DEFAULTS, ...(fileData || {}) };
    return _cache[sessionId];
}

// ── Save (MongoDB + file + RAM) ──────────────────────────────
async function saveSettings(settings, sessionId = 'main') {
    settings.lastUpdated = Date.now();
    _cache[sessionId] = settings;
    saveToFile(sessionId, settings);
    await saveToMongo(sessionId, settings).catch(() => {});
    return true;
}

// ── Public API ────────────────────────────────────────────────
function getSetting(key, sessionId = 'main') {
    return loadSettings(sessionId)[key];
}

async function setSetting(key, value, sessionId = 'main') {
    const settings = loadSettings(sessionId);
    settings[key]  = value;
    await saveSettings(settings, sessionId);
    return true;
}

async function setSettings(obj, sessionId = 'main') {
    const settings = loadSettings(sessionId);
    Object.assign(settings, obj);
    await saveSettings(settings, sessionId);
    return true;
}

async function resetSetting(key, sessionId = 'main') {
    return setSetting(key, DEFAULTS[key], sessionId);
}

async function resetAllSettings(sessionId = 'main') {
    delete _cache[sessionId];
    await saveSettings({ ...DEFAULTS }, sessionId);
    return true;
}

function reloadSettings(sessionId = 'main') {
    delete _cache[sessionId];
    return loadSettings(sessionId);
}

function getAllSettings(sessionId = 'main') {
    return { ...loadSettings(sessionId) };
}

// ── Config bridge ─────────────────────────────────────────────
function getConfig(key, sessionId = 'main') {
    const dynamicKeys = {
        AUTO_VOICE:             'autoVoice',
        AUTO_READ_STATUS:       'autoReadStatus',
        AUTO_READ_CMD:          'autoReadCmd',
        AUTO_AI:                'autoAI',
        ANTILINK:               'antiLink',
        ANTI_BOT:               'antiBot',
        ANTI_DELETE:            'antidelete',
        ANTI_BAD_WORDS_ENABLED: 'antiBadWords',
        MODE:                   'mode',
        PREFIX:                 'prefix',
    };
    if (dynamicKeys[key] !== undefined) {
        return getSetting(dynamicKeys[key], sessionId);
    }
    const config = require('../config');
    return config[key];
}

module.exports = {
    loadSettings,
    loadSettingsFromDB,
    saveSettings,
    getSetting,
    setSetting,
    setSettings,
    resetSetting,
    resetAllSettings,
    reloadSettings,
    getAllSettings,
    getConfig,
    DEFAULTS,
};
