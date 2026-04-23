// ================================================================
//   plugins/update.js — SHAVIYA-XMD V2
//   .update — GitHub sync + Heroku redeploy + changelog display
//   Owner only | CDT
// ================================================================

'use strict';

const { cmd }        = require('../command');
const { Octokit }    = require('@octokit/rest');
const axios          = require('axios');
const fs             = require('fs');
const path           = require('path');

// ── Config from ENV ─────────────────────────────────────────────
// Add these to your Heroku config vars:
//   GITHUB_TOKEN      → your GitHub personal access token
//   GITHUB_REPO_OWNER → your GitHub username  (e.g. "shaviyatech")
//   GITHUB_REPO_NAME  → your repo name        (e.g. "SHAVIYA-XMD-V2")
//   GITHUB_BRANCH     → branch to track       (default: "main")
//   HEROKU_APP_NAME   → your Heroku app name  (e.g. "shaviya-bot")
//   HEROKU_API_KEY    → Heroku API key (Account → API Key)
// ────────────────────────────────────────────────────────────────

const GH_TOKEN    = process.env.GITHUB_TOKEN;
const GH_OWNER    = process.env.GITHUB_REPO_OWNER || 'cybernoxx-cdt';
const GH_REPO     = process.env.GITHUB_REPO_NAME || 'SHAVIYA-XMD-V2-NEW';
const GH_BRANCH   = process.env.GITHUB_BRANCH || 'main';
const HK_APP      = process.env.HEROKU_APP_NAME || 'shaviya-xmd-2';
const HK_KEY      = process.env.HEROKU_API_KEY;

// ── Helpers ──────────────────────────────────────────────────────

function missingEnv() {
    const missing = [];
    if (!GH_TOKEN)  missing.push('GITHUB_TOKEN');
    if (!HK_KEY)    missing.push('HEROKU_API_KEY');
    return missing;
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0)  return `${d}d ago`;
    if (h > 0)  return `${h}h ago`;
    if (m > 0)  return `${m}m ago`;
    return 'just now';
}

async function getLatestCommits(octokit, count = 5) {
    const { data } = await octokit.repos.listCommits({
        owner: GH_OWNER,
        repo:  GH_REPO,
        sha:   GH_BRANCH,
        per_page: count
    });
    return data;
}

async function getCurrentDeployedSHA() {
    // Read from local file written after each deploy
    const shaFile = path.join(__dirname, '../.deployed_sha');
    try {
        return fs.readFileSync(shaFile, 'utf8').trim();
    } catch {
        return null;
    }
}

async function saveDeployedSHA(sha) {
    const shaFile = path.join(__dirname, '../.deployed_sha');
    try { fs.writeFileSync(shaFile, sha); } catch {}
}

async function triggerHerokuBuild() {
    // Trigger a rebuild by hitting Heroku Build API
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
                'Content-Type':    'application/json',
                'Accept':          'application/vnd.heroku+json; version=3',
                'Authorization':   `Bearer ${HK_KEY}`
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

// ── CMD: .update ─────────────────────────────────────────────────

cmd({
    pattern:  'update',
    alias:    ['botupdate', 'checkupdate', 'redeploy'],
    desc:     'Check for updates, show changelog & redeploy on Heroku',
    category: 'owner',
    react:    '🔄',
    filename: __filename
},
async (conn, mek, m, { from, isOwner, args, reply }) => {

    if (!isOwner) return reply(
        `╔══════════════════════╗\n` +
        `║   ⛔  ACCESS DENIED  ║\n` +
        `╚══════════════════════╝\n\n` +
        `This command is *owner only*.`
    );

    // ── Check ENV ──
    const missing = missingEnv();
    if (missing.length > 0) return reply(
        `❌ *Missing Config Vars!*\n\n` +
        `Add these to Heroku Config Vars:\n` +
        missing.map(v => `• \`${v}\``).join('\n') +
        `\n\n_Settings → Heroku Dashboard → Config Vars_`
    );

    const subCmd = (args[0] || '').toLowerCase();

    // ── .update check — just show changelog ──
    if (subCmd === 'check' || subCmd === '') {
        await reply('🔍 Checking GitHub for updates...');

        try {
            const octokit = new Octokit({ auth: GH_TOKEN });
            const commits  = await getLatestCommits(octokit, 5);
            const current  = await getCurrentDeployedSHA();
            const latest   = commits[0].sha;
            const isUpToDate = current && latest.startsWith(current.substring(0, 7));

            let log = commits.map((c, i) => {
                const sha     = c.sha.substring(0, 7);
                const msg     = c.commit.message.split('\n')[0].substring(0, 60);
                const author  = c.commit.author.name;
                const when    = timeAgo(c.commit.author.date);
                const marker  = i === 0 ? '🆕' : '📌';
                return `${marker} \`${sha}\` ${msg}\n    👤 ${author} · ${when}`;
            }).join('\n\n');

            const statusLine = isUpToDate
                ? `✅ *Bot is up to date!*`
                : `⚡ *New updates available!*\n_Use \`.update deploy\` to redeploy_`;

            await conn.sendMessage(from, {
                text:
                    `╔══════════════════════════════╗\n` +
                    `║  🔄  *SHAVIYA-XMD V2 UPDATE*  ║\n` +
                    `╚══════════════════════════════╝\n\n` +
                    `📦 *Repo:* ${GH_OWNER}/${GH_REPO}\n` +
                    `🌿 *Branch:* ${GH_BRANCH}\n` +
                    `🔖 *Current:* \`${current ? current.substring(0, 7) : 'unknown'}\`\n` +
                    `🆕 *Latest:*  \`${latest.substring(0, 7)}\`\n\n` +
                    `${statusLine}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📋 *Recent Commits:*\n\n` +
                    `${log}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> 🔄 *SHAVIYA-XMD V2 · Update System*`
            }, { quoted: mek });

        } catch (e) {
            console.error('[update check] error:', e.message);
            reply(`❌ Failed to fetch updates.\n\nError: ${e.message}`);
        }

        return;
    }

    // ── .update deploy — full redeploy ──
    if (subCmd === 'deploy') {
        await reply('⚡ Starting Heroku redeploy from GitHub...\n\n_This may take 2-3 minutes. Bot will restart._');

        try {
            const octokit = new Octokit({ auth: GH_TOKEN });
            const commits  = await getLatestCommits(octokit, 3);
            const latest   = commits[0];
            const latestSHA = latest.sha;

            // Trigger Heroku build
            const build = await triggerHerokuBuild();
            const buildId = build.id;

            // Save new SHA
            await saveDeployedSHA(latestSHA);

            // Build recent commits list
            const recentLog = commits.slice(0, 3).map((c, i) => {
                const sha  = c.sha.substring(0, 7);
                const msg  = c.commit.message.split('\n')[0].substring(0, 55);
                const when = timeAgo(c.commit.author.date);
                return `${i === 0 ? '🆕' : '📌'} \`${sha}\` ${msg} · ${when}`;
            }).join('\n');

            await conn.sendMessage(from, {
                text:
                    `╔════════════════════════════════╗\n` +
                    `║  🚀  *HEROKU REDEPLOY STARTED*  ║\n` +
                    `╚════════════════════════════════╝\n\n` +
                    `📦 *Repo:* ${GH_OWNER}/${GH_REPO}\n` +
                    `🌿 *Branch:* ${GH_BRANCH}\n` +
                    `🔖 *Deploying:* \`${latestSHA.substring(0, 7)}\`\n` +
                    `🏗️ *Build ID:* \`${buildId ? buildId.substring(0, 8) : 'N/A'}\`\n\n` +
                    `📋 *What's new:*\n${recentLog}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `⏳ Build in progress on Heroku...\n` +
                    `🔄 Bot will restart automatically\n` +
                    `✅ Back online in ~2-3 minutes\n\n` +
                    `> 🚀 *SHAVIYA-XMD V2 · Auto Deploy*`
            }, { quoted: mek });

            // Poll build status for 3 minutes
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
                                text:
                                    `╔══════════════════════════════╗\n` +
                                    `║  ✅  *DEPLOY SUCCESSFUL!*     ║\n` +
                                    `╚══════════════════════════════╝\n\n` +
                                    `🔖 *Deployed:* \`${latestSHA.substring(0, 7)}\`\n` +
                                    `🏗️ *Build:* \`${buildId.substring(0, 8)}\`\n` +
                                    `⏱️ *Time:* ~${attempts * 10}s\n\n` +
                                    `🔄 Heroku is restarting dynos...\n` +
                                    `✅ Bot will be back shortly!\n\n` +
                                    `> ✅ *SHAVIYA-XMD V2 · Deploy Done*`
                            }, { quoted: mek });
                        } else if (status.status === 'failed') {
                            clearInterval(poll);
                            await conn.sendMessage(from, {
                                text:
                                    `╔══════════════════════╗\n` +
                                    `║  ❌  *BUILD FAILED!*  ║\n` +
                                    `╚══════════════════════╝\n\n` +
                                    `Check Heroku dashboard for build logs.\n` +
                                    `https://dashboard.heroku.com/apps/${HK_APP}/activity\n\n` +
                                    `> ❌ *SHAVIYA-XMD V2 · Deploy Failed*`
                            }, { quoted: mek });
                        }
                    } catch {}
                    if (attempts >= maxAttempts) clearInterval(poll);
                }, 10000);
            }

        } catch (e) {
            console.error('[update deploy] error:', e.message);
            let errMsg = e.message;
            if (e.response?.status === 401) errMsg = 'Invalid HEROKU_API_KEY';
            if (e.response?.status === 404) errMsg = 'App not found. Check HEROKU_APP_NAME';
            reply(`❌ Redeploy failed!\n\nError: ${errMsg}`);
        }

        return;
    }

    // ── Help ──
    reply(
        `🔄 *UPDATE COMMANDS*\n\n` +
        `• \`.update\` — Check for new commits\n` +
        `• \`.update check\` — Show changelog\n` +
        `• \`.update deploy\` — Redeploy from GitHub\n\n` +
        `> 🔄 *SHAVIYA-XMD V2 · Update System*`
    );
});
