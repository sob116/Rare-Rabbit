const prefix = process.env.prefix || '?'
const status = `${prefix}help`;

module.exports = {
  bot: {
    info: {
      prefix: '?',
      token: 'YOUR_BOT_TOKEN',
      invLink: 'https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands',
      privacy: 'https://discord.gg/teamkronix',
      terms: 'https://discord.gg/teamkronix',
    },
    presence: {
      name: status,
      type: 'Listening',
      url: 'https://discord.gg/teamkronix'
    },
    credits: {
      developerId: '747321055319949312',
      supportServer: 'https://discord.gg/teamkronix'
    },
  }
}
