const { cmd } = require("../command");
const { fetchJson } = require("../lib/functions");

cmd({
    pattern: "ai",
    react: "🤖",
    desc: "SHAVIYA Movie AI",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { q, reply }) => {

try {

if (!q) return reply("❌ Please ask something!\nExample: .ai Hello How Are You");

await conn.sendPresenceUpdate("composing", m.chat); // typing effect

let api = `https://gemini-ai-gold-eta.vercel.app/ai?q=${encodeURIComponent(q)}`;

let res = await fetchJson(api);

console.log(res);

if (!res || res.status !== true) {
    return reply("❌ AI not responding properly!");
}

let model = res.model ? `📌 Model: ${res.model}\n\n` : "";

let answer = res.result || "❌ No response from AI.";

let footer = "\n\n🤖 SHAVIYA-XMD V2 AI";

return reply(model + answer + footer);

} catch (e) {

console.log(e);
reply("❌ Error occurred while fetching AI!");

}

});
