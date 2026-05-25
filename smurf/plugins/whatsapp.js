const { gmd } = require("../../dark");
const {
    getLidMapping,
    getGroupMetadata,
} = require("../../dark/connection/groupCache");

function getUserName(jid) {
    return jid.split("@")[0];
}

function normalizeUserJid(jid) {
    if (!jid || typeof jid !== "string") return "";

    if (jid.endsWith("@lid")) {
        const mapped = getLidMapping(jid);
        if (mapped) return mapped;
    }

    let normalized = jid.split(":")[0].split("/")[0];
    if (!normalized.includes("@")) {
        normalized += "@s.whatsapp.net";
    }

    if (normalized.endsWith("@lid")) {
        const mapped = getLidMapping(normalized);
        if (mapped) return mapped;
    }

    return normalized;
}

gmd(
    {
        pattern: "onwa",
        aliases: ["onwhatsapp", "checkwa", "checknumber"],
        react: "🔍",
        category: "utility",
        description: "Check if a phone number is registered on WhatsApp",
    },
    async (from, Gifted, conText) => {
        const { sender, mek, reply, react, q, botPrefix } = conText;

        if (!q || q.trim() === "") {
            await react("❌");
            return reply(`❌ Please provide a phone number.

*Usage:* ${botPrefix}onwa <number>
*Example:* ${botPrefix}onwa 254712345678

_Include country code without + or spaces_`);
        }

        const num = q.trim().replace(/[^0-9]/g, "");

        if (num.length < 7 || num.length > 15) {
            await react("❌");
            return reply(`❌ Invalid phone number format.

Please provide a valid number with country code.
*Example:* .onwa 254712345678`);
        }

        await react("⏳");

        try {
            const [result] = await Gifted.onWhatsApp(num);

            if (result && result.exists) {
                await react("✅");
                return reply(`✅ *Number Found on WhatsApp*

📞 *Number:* ${num}
🆔 *JID:* ${result.jid}

_This number is registered on WhatsApp._`);
            } else {
                await react("❌");
                return reply(`❌ *Not on WhatsApp*

📞 *Number:* ${num}

_This number is not registered on WhatsApp._`);
            }
        } catch (err) {
            await react("⚠️");
            return reply(`⚠️ Could not verify if ${num} is on WhatsApp.

Error: ${err.message}

_Please try again later._`);
        }
    },
);

gmd(
    {
        pattern: "vcf",
        aliases: ["contacts", "savecontact", "scontact", "savecontacts"],
        react: "📇",
        category: "group",
        description: "Export all group participants as VCF contact file",
        isGroup: true,
    },
    async (from, Gifted, conText) => {
        const { sender, mek, reply, react } = conText;

        await react("⏳");

        try {
            const groupMetadata = await getGroupMetadata(Gifted, from);
            const participants = groupMetadata?.participants || [];
            const groupName = groupMetadata?.subject || "Group";

            if (participants.length === 0) {
                await react("❌");
                return reply("❌ No participants found in this group.");
            }

            let vcfContent = "";
            let index = 1;

            for (const member of participants) {
                const jid = member.jid || member.pn || member.id;
                if (!jid || typeof jid !== "string") continue;

                const phoneJid = jid.includes("@s.whatsapp.net")
                    ? jid
                    : normalizeUserJid(jid);
                if (!phoneJid || !phoneJid.includes("@s.whatsapp.net"))
                    continue;

                const id = phoneJid.split("@")[0];
                vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:[${index++}] +${id}\nTEL;type=CELL;type=VOICE;waid=${id}:+${id}\nEND:VCARD\n`;
            }

            const count = index - 1;

            if (count === 0) {
                await react("❌");
                return reply(
                    "❌ Could not extract any valid contacts from this group.",
                );
            }

            const fileName = `${groupName}.vcf`;

            await Gifted.sendMessage(
                from,
                {
                    document: Buffer.from(vcfContent.trim(), "utf-8"),
                    mimetype: "text/vcard",
                    fileName: fileName,
                    caption: `Done saving.\nGroup Name: *${groupName}*\nContacts: *${count}*`,
                },
                { quoted: mek },
            );

            await react("✅");
        } catch (err) {
            await react("❌");
            return reply(`❌ Failed to export contacts: ${err.message}`);
        }
    },
);

gmd(
    {
        pattern: "remind",
        aliases: ["setreminder", "remindme"],
        react: "⏰",
        category: "utility",
        description: "Set a reminder for yourself or the group",
    },
    async (from, Gifted, conText) => {
        const { mek, reply, react, q, botPrefix, sender } = conText;

        if (!q || q.trim() === "") {
            await react("❌");
            return reply(`❌ Please provide a reminder message and time.

*Usage:* ${botPrefix}remind <minutes> <message>
*Example:* ${botPrefix}remind 10 Check the oven

_Reminder will be sent after the specified minutes._`);
        }

        const parts = q.trim().split(" ");
        const minutes = parseInt(parts[0]);
        const message = parts.slice(1).join(" ");

        if (isNaN(minutes) || minutes <= 0) {
            await react("❌");
            return reply(`❌ Please provide a valid number of minutes as the first argument.

*Example:* ${botPrefix}remind 10 Check the oven`);
        }

        if (!message) {
            await react("❌");
            return reply(`❌ Please provide a reminder message after the minutes.

*Example:* ${botPrefix}remind 10 Check the oven`);
        }

        await react("✅");
        await reply(`⏰ *Reminder Set!*

📝 *Message:* ${message}
⏱️ *Time:* ${minutes} minute(s)

_I'll remind you when the time is up!_`);

        setTimeout(async () => {
            try {
                await Gifted.sendMessage(
                    from,
                    {
                        text: `⏰ *REMINDER*\n\n📝 ${message}\n\n_Reminder set by @${sender.split("@")[0]}_`,
                        mentions: [sender],
                    },
                    { quoted: mek }
                );
            } catch (err) {
                console.error("Reminder error:", err);
            }
        }, minutes * 60 * 1000);
    }
);

gmd(
    {
        pattern: "remind2",
        aliases: ["remind2me", "quickremind"],
        react: "🔔",
        category: "utility",
        description: "Set a quick reminder using hours and minutes",
    },
    async (from, Gifted, conText) => {
        const { mek, reply, react, q, botPrefix, sender } = conText;

        if (!q || q.trim() === "") {
            await react("❌");
            return reply(`❌ Please provide time and message.

*Usage:* ${botPrefix}remind2 <hours>h<minutes>m <message>
*Example:* ${botPrefix}remind2 1h30m Meeting with team
*Example:* ${botPrefix}remind2 0h45m Take medicine

_Format: Xh = hours, Xm = minutes_`);
        }

        const parts = q.trim().split(" ");
        const timeStr = parts[0];
        const message = parts.slice(1).join(" ");

        const hoursMatch = timeStr.match(/(\d+)h/i);
        const minsMatch = timeStr.match(/(\d+)m/i);

        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
        const totalMs = (hours * 60 + mins) * 60 * 1000;

        if (totalMs <= 0) {
            await react("❌");
            return reply(`❌ Invalid time format.

*Example:* ${botPrefix}remind2 1h30m Meeting with team`);
        }

        if (!message) {
            await react("❌");
            return reply(`❌ Please provide a message after the time.

*Example:* ${botPrefix}remind2 1h30m Meeting with team`);
        }

        await react("✅");
        const timeLabel = `${hours > 0 ? hours + "h " : ""}${mins > 0 ? mins + "m" : ""}`.trim();
        await reply(`🔔 *Reminder Set!*

📝 *Message:* ${message}
⏱️ *Time:* ${timeLabel}

_I'll remind you when the time is up!_`);

        setTimeout(async () => {
            try {
                await Gifted.sendMessage(
                    from,
                    {
                        text: `🔔 *REMINDER*\n\n📝 ${message}\n\n_Reminder set by @${sender.split("@")[0]}_`,
                        mentions: [sender],
                    },
                    { quoted: mek }
                );
            } catch (err) {
                console.error("Remind2 error:", err);
            }
        }, totalMs);
    }
);

gmd(
    {
        pattern: "reminder",
        aliases: ["remindlist", "myreminders"],
        react: "📋",
        category: "utility",
        description: "Show reminder usage and info for SMURF-XMD",
        dontAddCommandList: false,
    },
    async (from, Gifted, conText) => {
        const { mek, reply, react, botPrefix, sender } = conText;
        const newsletterJid = "120363404552894723@newsletter";
        const groupJid = "HRdlOPWj9lyBIEfLC3PPU6@g.us";
        const botImage = "https://files.catbox.moe/w9qqg3.jpg";

        await react("📋");

        try {
            await Gifted.sendMessage(
                from,
                {
                    image: { url: botImage },
                    caption: `📋 *SMURF-XMD REMINDER INFO*

╭━━━━❮ *𝚄𝚃𝙸𝙻𝙸𝚃𝚈* ❯━⊷
┃◇ ${botPrefix}onwa — Check WhatsApp number
┃◇ ${botPrefix}remind — Set reminder (minutes)
┃◇ ${botPrefix}remind2 — Set reminder (Xh Xm format)
┃◇ ${botPrefix}reminder — This info panel
╰━━━━━━━━━━━━━━━━━━━⊷

> *©2025 SMURF XMD V5*`,
                    contextInfo: {
                        mentionedJid: [sender],
                        forwardingScore: 5,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: newsletterJid,
                            newsletterName: "SMURF XMD",
                            serverMessageId: 143,
                        },
                    },
                },
                { quoted: mek }
            );
        } catch (err) {
            await reply(`📋 *SMURF-XMD Reminder Commands*\n\n${botPrefix}remind <min> <msg>\n${botPrefix}remind2 <Xh Xm> <msg>\n${botPrefix}reminder — this panel\n\n> ©2025 SMURF XMD V5`);
        }

        await react("✅");
    }
);
