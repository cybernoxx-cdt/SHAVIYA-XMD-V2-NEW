// plugins/cricket.js — SHAVIYA-XMD V2
// .cricket — Live Cricket Scores

'use strict';

const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: 'cricket',
    alias: ['cric', 'score', 'cricketlive', 'sl'],
    desc: 'Live cricket scores & match info',
    category: 'utility',
    react: '🏏',
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        await conn.sendPresenceUpdate('composing', from);

        let matchData = null;

        // Primary: cricbuzz free API
        try {
            const res = await axios.get('https://api.cricapi.com/v1/currentMatches?apikey=a52ea237-09e7-41e5-96da-37c69f480f0f&offset=0', { timeout: 15000 });
            if (res.data?.data?.length > 0) {
                matchData = res.data.data;
            }
        } catch (_) {}

        // Fallback: Ruhend scraper (already in your bot)
        if (!matchData) {
            try {
                const res2 = await axios.get('https://api2.dark-yasiya-api.site/cricket', { timeout: 15000 });
                if (res2.data?.status && res2.data?.result) {
                    matchData = res2.data.result;
                }
            } catch (_) {}
        }

        // Fallback 2: scrape cricbuzz
        if (!matchData) {
            try {
                const res3 = await axios.get('https://unofficial-cricbuzz.p.rapidapi.com/matches/list', {
                    headers: { 'X-RapidAPI-Host': 'unofficial-cricbuzz.p.rapidapi.com' },
                    timeout: 10000
                });
                if (res3.data) matchData = res3.data;
            } catch (_) {}
        }

        if (!matchData || (Array.isArray(matchData) && matchData.length === 0)) {
            return reply(
                `🏏 *CRICKET SCORES*\n\n` +
                `❌ No live matches found right now.\n\n` +
                `Try again later or check:\n` +
                `🌐 https://www.cricbuzz.com\n` +
                `🌐 https://www.espncricinfo.com\n\n` +
                `> 🏏 *SHAVIYA-XMD V2 · Cricket*`
            );
        }

        let output = `🏏 *LIVE CRICKET SCORES*\n`;
        output += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

        if (Array.isArray(matchData)) {
            const liveMatches = matchData.slice(0, 5); // max 5 matches
            liveMatches.forEach((match, i) => {
                output += `🔴 *Match ${i + 1}*\n`;
                // Handle different API response shapes
                const name = match.name || match.matchDescription || match.series || 'Match';
                const status = match.status || match.matchState || 'Live';
                const team1 = match.teamInfo?.[0]?.name || match.t1 || 'Team 1';
                const team2 = match.teamInfo?.[1]?.name || match.t2 || 'Team 2';
                const score1 = match.score?.[0]?.r ? `${match.score[0].r}/${match.score[0].w} (${match.score[0].o} ov)` : '';
                const score2 = match.score?.[1]?.r ? `${match.score[1].r}/${match.score[1].w} (${match.score[1].o} ov)` : '';

                output += `📌 ${name}\n`;
                output += `🏳️ ${team1}${score1 ? ': ' + score1 : ''}\n`;
                output += `🏴 ${team2}${score2 ? ': ' + score2 : ''}\n`;
                output += `📊 Status: ${status}\n`;
                output += `─────────────────────\n`;
            });
        } else {
            output += `📊 ${JSON.stringify(matchData).slice(0, 500)}\n`;
        }

        output += `\n> 🏏 *SHAVIYA-XMD V2 · Cricket Live*`;

        await conn.sendMessage(from, { text: output }, { quoted: mek });

    } catch (e) {
        console.error('[cricket] error:', e.message);
        reply('❌ Failed to fetch cricket scores. Please try again.');
    }
});
