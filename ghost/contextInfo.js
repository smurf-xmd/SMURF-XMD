const { getSetting } = require("./database/settings");

async function getContextInfo(mentionedJid = []) {
    const botName = await getSetting("BOT_NAME") || "𓅓 𝐃𝐀𝐑𝐊 𝐋𝐎𝐑𝐃𓅣._XMD";
    const channelJid = await getSetting("NEWSLETTER_JID") || "120363404552894723@newsletter";
    return {
        mentionedJid,
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: channelJid,
            newsletterName: botName,
            serverMessageId: -1
        }
    };
}

module.exports = { getContextInfo };
