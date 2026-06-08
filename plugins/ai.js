const { cmd } = require("../command");
const { fetchJson } = require("../lib/functions");

cmd({
    pattern: "ds",
    react: "🧠",
    desc: "DeepSeek AI Assistant",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { q, reply }) => {

try {

if (!q) return reply("❌ Please ask something!\nExample: .ds What is Node.js?");

await conn.sendPresenceUpdate("composing", m.chat); // typing effect

let api = `https://whiteshadow-x-api.vercel.app/api/ai/deepseekv4?q=${encodeURIComponent(q)}&apitoken=e76n2P`;

let res = await fetchJson(api);

console.log(res);

// Check if response is valid
if (!res) {
    return reply("❌ API not responding properly!");
}

// Extract response based on common possible structures
let answer = res.result || res.response || res.message || res.reply || JSON.stringify(res);

// Optional: Add model info if available
let modelInfo = res.model ? `📌 Model: ${res.model}\n\n` : "";
let footer = "\n\n✨ _DeepSeek Assistant_";

return reply(modelInfo + answer + footer);

} catch (e) {

console.log(e);
reply("❌ Error occurred while fetching AI response!");

}

});
