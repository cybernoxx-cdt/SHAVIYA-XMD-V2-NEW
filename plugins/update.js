// ================================================================
//   plugins/update.js — SHAVIYA-XMD V2
//   .update / .up — Heroku redeploy | Owner only
//   Powered By Sʜᴀᴠɪʏᴀ Xᴍᴅ
// ================================================================

'use strict';

const { cmd }     = require('../command');
const { Octokit } = require('@octokit/rest');
const axios       = require('axios');
const fs          = require('fs');
const path        = require('path');

const GH_TOKEN  = process.env.GITHUB_TOKEN;
const GH_OWNER  = process.env.GITHUB_REPO_OWNER || 'cybernoxx-cdt';
const GH_REPO   = process.env.GITHUB_REPO_NAME  || 'SHAVIYA-XMD-V2-NEW';
const GH_BRANCH = process.env.GITHUB_BRANCH     || 'main';
const HK_APP    = process.env.HEROKU_APP_NAME   || 'shaviya-xmd-1';
const HK_KEY    = process.env.HEROKU_API_KEY;

function saveDeployedSHA(sha) {
    try { fs.writeFileSync(path.join(__dirname, '../.deployed_sha'), sha); } catch {}
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

// ── CMD: .update / .up ───────────────────────────────────────────

cmd({
    pattern:  'update',
    alias:    ['up'],
    desc:     'Redeploy bot from GitHub to Heroku',
    category: 'owner',
    react:    '🔄',
    filename: __filename
},
async (conn, mek, m, { from, isOwner }) => {

    if (!isOwner) return;

    if (!GH_TOKEN || !HK_KEY) return;

    try {
        // Get latest commit + changed files
        const octokit = new Octokit({ auth: GH_TOKEN });

        const { data: commits } = await octokit.repos.listCommits({
            owner: GH_OWNER, repo: GH_REPO, sha: GH_BRANCH, per_page: 1
        });
        const latestSHA = commits[0].sha;

        const { data: commitDetail } = await octokit.repos.getCommit({
            owner: GH_OWNER, repo: GH_REPO, ref: latestSHA
        });

        const changedFiles = (commitDetail.files || []).map(f => f.filename);
        const latestFile   = changedFiles[0] || 'unknown';
        const fileCount    = changedFiles.length;

        // Trigger Heroku build
        const build   = await triggerHerokuBuild();
        const buildId = build.id;
        saveDeployedSHA(latestSHA);

        // ✅ React to .update message
        await conn.sendMessage(from, {
            react: { text: '✅', key: mek.key }
        });

        // Single message — latest changed file only
        const LINE = '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰';
        const fileDisplay = fileCount > 1
            ? `\`${latestFile}\` +${fileCount - 1} more`
            : `\`${latestFile}\``;

        await conn.sendMessage(from, {
            text:
                `${LINE}\n` +
                `   🚀  *Update Successfully*\n` +
                `${LINE}\n\n` +
                `📄  *Latest Change*\n` +
                `     ╰ ${fileDisplay}\n\n` +
                `🔖  \`${latestSHA.substring(0, 7)}\`  ·  🔄 Redeploying...\n\n` +
                `${LINE}\n` +
                `   🌟 𝙋𝙤𝙬𝙚𝙧𝙚𝙙 𝘽𝙮 Sʜᴀᴠɪʏᴀ Xᴍᴅ\n` +
                `${LINE}`
        }, { quoted: mek });

        // Silent poll — ❌ react only if build fails
        if (buildId) {
            let attempts = 0;
            const poll = setInterval(async () => {
                attempts++;
                try {
                    const status = await getHerokuBuildStatus(buildId);
                    if (status.status === 'succeeded' || status.status === 'failed') {
                        clearInterval(poll);
                        if (status.status === 'failed') {
                            await conn.sendMessage(from, {
                                react: { text: '❌', key: mek.key }
                            });
                        }
                    }
                } catch {}
                if (attempts >= 18) clearInterval(poll);
            }, 10000);
        }

    } catch (e) {
        console.error('[update] error:', e.message);
        await conn.sendMessage(from, {
            react: { text: '❌', key: mek.key }
        });
    }
});
