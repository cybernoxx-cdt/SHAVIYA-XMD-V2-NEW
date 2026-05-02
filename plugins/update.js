// ================================================================
//   plugins/update.js — SHAVIYA-XMD V2
//   .update — GitHub sync + Heroku redeploy + changelog display
//   Owner only | Powered By Sʜᴀᴠɪʏᴀ Xᴍᴅ
// ================================================================

'use strict';

const { cmd }     = require('../command');
const { Octokit } = require('@octokit/rest');
const axios       = require('axios');
const fs          = require('fs');
const path        = require('path');

// ── Config from ENV ─────────────────────────────────────────────
//   GITHUB_TOKEN        → GitHub personal access token
//   GITHUB_REPO_OWNER   → GitHub username  (e.g. "cybernoxx-cdt")
//   GITHUB_REPO_NAME    → repo name        (e.g. "SHAVIYA-XMD-V2-NEW")
//   GITHUB_BRANCH       → branch to track  (default: "main")
//   HEROKU_APP_NAME     → Heroku app name  (e.g. "shaviya-xmd-2")
//   HEROKU_API_KEY      → Heroku API key
// ────────────────────────────────────────────────────────────────

const GH_TOKEN  = process.env.GITHUB_TOKEN;
const GH_OWNER  = process.env.GITHUB_REPO_OWNER || 'cybernoxx-cdt';
const GH_REPO   = process.env.GITHUB_REPO_NAME  || 'SHAVIYA-XMD-V2-NEW';
const GH_BRANCH = process.env.GITHUB_BRANCH     || 'main';
const HK_APP    = process.env.HEROKU_APP_NAME   || 'shaviya-xmd-2';
const HK_KEY    = process.env.HEROKU_API_KEY;

// ── Design tokens ────────────────────────────────────────────────
const LINE  = '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰';
const SLINE = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';
const BOT   = '𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟮';
const CDT   = '🌟 𝙋𝙤𝙬𝙚𝙧𝙚𝙙 𝘽𝙮 Sʜᴀᴠɪʏᴀ Xᴍᴅ';

// ── Helpers ──────────────────────────────────────────────────────

function missingEnv() {
    const m = [];
    if (!GH_TOKEN) m.push('GITHUB_TOKEN');
    if (!HK_KEY)   m.push('HEROKU_API_KEY');
    return m;
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return 'just now';
}

function commitTypeIcon(msg) {
    const lower = msg.toLowerCase();
    if (lower.startsWith('fix'))      return '🔧';
    if (lower.startsWith('feat'))     return '✨';
    if (lower.startsWith('add'))      return '➕';
    if (lower.startsWith('remove') || lower.startsWith('del')) return '🗑️';
    if (lower.startsWith('update') || lower.startsWith('upd')) return '🔄';
    if (lower.startsWith('refactor')) return '♻️';
    if (lower.startsWith('style'))    return '🎨';
    if (lower.startsWith('doc'))      return '📝';
    if (lower.startsWith('perf'))     return '⚡';
    return '📌';
}

async function getLatestCommits(octokit, count = 5) {
    const { data } = await octokit.repos.listCommits({
        owner: GH_OWNER, repo: GH_REPO, sha: GH_BRANCH, per_page: count
    });
    return data;
}

function getCurrentDeployedSHA() {
    const shaFile = path.join(__dirname, '../.deployed_sha');
    try { return fs.readFileSync(shaFile, 'utf8').trim(); } catch { return null; }
}

function saveDeployedSHA(sha) {
    const shaFile = path.join(__dirname, '../.deployed_sha');
    try { fs.writeFileSync(shaFile, sha); } catch {}
}

async function triggerHerokuBuild() {
    const res = await axios.post(
        `https://api.heroku.com/apps/${HK_APP}/builds`,
        {
            source_blob: {
                url: `https://github.com/${GH_OWNER}/${GH_REPO}/archive/refs/heads/${GH_BRANCH}.tar.gz`,
                version: GH_BRANCH
            }
        },
        {
            headers: {
                'Content-Type':  'application/json',
                'Accept':        'application/vnd.heroku+json; version=3',
                'Authorization': `Bearer ${HK_KEY}`
            },
            timeout: 20000
        }
    );
    return res.data;
}

async function getHerokuBuildStatus(buildId) {
    const res = await axios.get(
        `https://api.heroku.com/apps/${HK_APP}/builds/${buildId}`,
        {
            headers: {
                'Accept':        'application/vnd.heroku+json; version=3',
                'Authorization': `Bearer ${HK_KEY}`
            },
            timeout: 10000
        }
    );
    return res.data;
}

// ── Message builders ─────────────────────────────────────────────

function buildCheckMsg(commits, current, latest) {
    const isUpToDate = current && latest.startsWith(current.substring(0, 7));

    const commitLines = commits.map((c, i) => {
        const sha    = c.sha.substring(0, 7);
        const rawMsg = c.commit.message.split('\n')[0];
        const msg    = rawMsg.length > 55 ? rawMsg.substring(0, 55) + '…' : rawMsg;
        const author = c.commit.author.name;
        const when   = timeAgo(c.commit.author.date);
        const icon   = i === 0 ? '🆕' : commitTypeIcon(rawMsg);
        return `${icon}  \`${sha}\`  ${msg}\n     ╰ 👤 ${author}  ·  🕐 ${when}`;
    }).join('\n\n');

    const statusBlock = isUpToDate
        ? `✅  *Bot is fully up to date!*`
        : `🔔  *New updates available!*\n     ╰ Reply *.update deploy* to redeploy`;

    return (
        `${LINE}\n` +
        `   🛸  *${BOT} — UPDATE CHECK*\n` +
        `${LINE}\n\n` +
        `📦  *Repo*    »  \`${GH_OWNER}/${GH_REPO}\`\n` +
        `🌿  *Branch*  »  \`${GH_BRANCH}\`\n` +
        `🔖  *Current* »  \`${current ? current.substring(0, 7) : 'unknown'}\`\n` +
        `🆕  *Latest*  »  \`${latest.substring(0, 7)}\`\n\n` +
        `${statusBlock}\n\n` +
        `${SLINE}\n` +
        `   📋  *Recent Commits*\n` +
        `${SLINE}\n\n` +
        `${commitLines}\n\n` +
        `${LINE}\n` +
        `   ${CDT}\n` +
        `${LINE}`
    );
}

function buildDeployStartMsg(latestSHA, buildId, commits) {
    const recentLog = commits.slice(0, 3).map((c, i) => {
        const sha  = c.sha.substring(0, 7);
        const raw  = c.commit.message.split('\n')[0];
        const msg  = raw.length > 50 ? raw.substring(0, 50) + '…' : raw;
        const when = timeAgo(c.commit.author.date);
        const icon = i === 0 ? '🆕' : commitTypeIcon(raw);
        return `${icon}  \`${sha}\`  ${msg}\n     ╰ 🕐 ${when}`;
    }).join('\n\n');

    return (
        `${LINE}\n` +
        `   🚀  *${BOT} — DEPLOY STARTED*\n` +
        `${LINE}\n\n` +
        `📦  *Repo*     »  \`${GH_OWNER}/${GH_REPO}\`\n` +
        `🌿  *Branch*   »  \`${GH_BRANCH}\`\n` +
        `🔖  *Deploying* »  \`${latestSHA.substring(0, 7)}\`\n` +
        `🏗️  *Build ID*  »  \`${buildId ? buildId.substring(0, 8) : 'N/A'}\`\n\n` +
        `${SLINE}\n` +
        `   📋  *What's Included*\n` +
        `${SLINE}\n\n` +
        `${recentLog}\n\n` +
        `${SLINE}\n` +
        `⏳  Build running on Heroku...\n` +
        `🔄  Bot will restart automatically\n` +
        `✅  Back online in ~ 2–3 minutes\n` +
        `${LINE}\n` +
        `   ${CDT}\n` +
        `${LINE}`
    );
}

function buildDeploySuccessMsg(latestSHA, buildId, elapsedSec) {
    return (
        `${LINE}\n` +
        `   ✅  *${BOT} — DEPLOY COMPLETE*\n` +
        `${LINE}\n\n` +
        `🔖  *Deployed SHA* »  \`${latestSHA.substring(0, 7)}\`\n` +
        `🏗️  *Build ID*     »  \`${buildId.substring(0, 8)}\`\n` +
        `⏱️  *Build Time*   »  ${elapsedSec}s\n\n` +
        `🔄  Heroku dynos restarting...\n` +
        `⚡  Bot is back online shortly!\n\n` +
        `${LINE}\n` +
        `   ${CDT}\n` +
        `${LINE}`
    );
}

function buildDeployFailMsg(buildId) {
    return (
        `${LINE}\n` +
        `   ❌  *${BOT} — BUILD FAILED*\n` +
        `${LINE}\n\n` +
        `🏗️  *Build ID* »  \`${buildId ? buildId.substring(0, 8) : 'N/A'}\`\n\n` +
        `📋  Check Heroku build logs:\n` +
        `🔗  https://dashboard.heroku.com/apps/${HK_APP}/activity\n\n` +
        `${LINE}\n` +
        `   ${CDT}\n` +
        `${LINE}`
    );
}



function buildMissingEnvMsg(missing) {
    return (
        `${LINE}\n` +
        `   ⚠️  *CONFIG VARS MISSING*\n` +
        `${LINE}\n\n` +
        `Add these to *Heroku → Settings → Config Vars:*\n\n` +
        missing.map(v => `  ❌  \`${v}\``).join('\n') +
        `\n\n${LINE}\n` +
        `   ${CDT}\n` +
        `${LINE}`
    );
}

// ── CMD: .update ─────────────────────────────────────────────────

cmd({
    pattern:  'update',
    alias:    [".up"],
    desc:     'Check for updates & redeploy on Heroku',
    category: 'owner',
    react:    '🔄',
    filename: __filename
},
async (conn, mek, m, { from, isOwner }) => {

    if (!isOwner) return conn.sendMessage(from, {
        text:
            `${LINE}\n` +
            `   ⛔  *ACCESS DENIED*\n` +
            `${LINE}\n\n` +
            `🔒  This command is *owner only*.\n\n` +
            `${LINE}\n` +
            `   ${CDT}\n` +
            `${LINE}`
    }, { quoted: mek });

    const missing = missingEnv();
    if (missing.length > 0) return conn.sendMessage(from, {
        text: buildMissingEnvMsg(missing)
    }, { quoted: mek });

    // ── Step 1: Check ─────────────────────────────────────────────
    await conn.sendMessage(from, {
        text:
            `${LINE}\n` +
            `   🔍  *CHECKING FOR UPDATES...*\n` +
            `${LINE}`
    }, { quoted: mek });

    let commits, current, latest, latestSHA;
    try {
        const octokit = new Octokit({ auth: GH_TOKEN });
        commits  = await getLatestCommits(octokit, 5);
        current  = getCurrentDeployedSHA();
        latest   = commits[0].sha;
        latestSHA = latest;

        await conn.sendMessage(from, {
            text: buildCheckMsg(commits, current, latest)
        }, { quoted: mek });

    } catch (e) {
        console.error('[update check] error:', e.message);
        return conn.sendMessage(from, {
            text:
                `${LINE}\n` +
                `   ❌  *FETCH FAILED*\n` +
                `${LINE}\n\n` +
                `Error: ${e.message}\n\n` +
                `${LINE}\n   ${CDT}\n${LINE}`
        }, { quoted: mek });
    }

    // ── Step 2: Auto Redeploy ─────────────────────────────────────
    await conn.sendMessage(from, {
        text:
            `${LINE}\n` +
            `   ⚡  *INITIATING HEROKU REDEPLOY...*\n` +
            `${LINE}\n\n` +
            `⏳  Connecting to Heroku...\n` +
            `🔄  Bot will restart after deploy.\n\n` +
            `${LINE}\n   ${CDT}\n${LINE}`
    }, { quoted: mek });

    try {
        const build   = await triggerHerokuBuild();
        const buildId = build.id;

        saveDeployedSHA(latestSHA);

        await conn.sendMessage(from, {
            text: buildDeployStartMsg(latestSHA, buildId, commits.slice(0, 3))
        }, { quoted: mek });

        // Poll build status for up to 3 minutes
        if (buildId) {
            let attempts = 0;
            const maxAttempts = 18; // 18 × 10s = 3 min
            const poll = setInterval(async () => {
                attempts++;
                try {
                    const status = await getHerokuBuildStatus(buildId);

                    if (status.status === 'succeeded') {
                        clearInterval(poll);
                        await conn.sendMessage(from, {
                            text: buildDeploySuccessMsg(latestSHA, buildId, attempts * 10)
                        }, { quoted: mek });

                    } else if (status.status === 'failed') {
                        clearInterval(poll);
                        await conn.sendMessage(from, {
                            text: buildDeployFailMsg(buildId)
                        }, { quoted: mek });
                    }
                } catch {}

                if (attempts >= maxAttempts) clearInterval(poll);
            }, 10000);
        }

    } catch (e) {
        console.error('[update deploy] error:', e.message);
        let errMsg = e.message;
        if (e.response?.status === 401) errMsg = 'Invalid HEROKU_API_KEY — check Heroku Config Vars.';
        if (e.response?.status === 404) errMsg = 'App not found — check HEROKU_APP_NAME.';

        conn.sendMessage(from, {
            text:
                `${LINE}\n` +
                `   ❌  *REDEPLOY FAILED*\n` +
                `${LINE}\n\n` +
                `Error: ${errMsg}\n\n` +
                `${LINE}\n   ${CDT}\n${LINE}`
        }, { quoted: mek });
    }
});
