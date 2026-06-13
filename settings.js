const config = require("./config");

const prefix = process.env.BOT_PREFIX || process.env.prefix || "?";
const clientId = config.clientId || "YOUR_CLIENT_ID";
const status = `${prefix}help`;

module.exports = {
  bot: {
    info: {
      prefix,
      token: config.token,
      invLink:
        process.env.BOT_INVITE_LINK ||
        `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`,
      privacy: process.env.PRIVACY_URL || 'https://discord.gg/teamkronix',
      terms: process.env.TERMS_URL || 'https://discord.gg/teamkronix',
    },
    presence: {
      name: status,
      type: 'Listening',
      url: process.env.PRESENCE_URL || 'https://discord.gg/teamkronix'
    },
    credits: {
      developerId: process.env.DEVELOPER_ID || '747321055319949312',
      supportServer: process.env.SUPPORT_SERVER_URL || 'https://discord.gg/teamkronix'
    },
  }
}
