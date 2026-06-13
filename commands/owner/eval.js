module.exports = {
  name: "eval",
  voteOnly: false,
  BotPerms: ['EmbedLinks'],
  run: async (client, message, args) => {
    return message.channel.send("The eval command has been disabled for safety.");
  },
};
