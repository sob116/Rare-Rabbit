const Discord = require("discord.js");

module.exports = {
  name: "nitro",
  run: async (client, message) => {
    const button = new Discord.ButtonBuilder()
      .setCustomId('brrrrr')
      .setLabel('ㅤㅤㅤㅤㅤㅤClaimㅤㅤㅤㅤㅤㅤ')
      .setStyle('Success');

    const row = new Discord.ActionRowBuilder().addComponents([button]);

    const sent = await message.channel.send({
      content: `https://media.discordapp.net/attachments/1018504362290581625/1018504402757222420/11111unknown.png?ex=65916424&is=657eef24&hm=9a49a03e3dcf73c64cb7edb41d1a9882b9cb24dc7c625867744cd101bc95fb39&=&format=webp&quality=lossless&width=1021&height=258`,
      components: [row],
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on('collect', async (interaction) => {
      if (!interaction.isButton() || interaction.customId !== 'brrrrr') return;
      await interaction.reply({
        content: `https://tenor.com/view/rickroll-roll-rick-never-gonna-give-you-up-never-gonna-gif-22954713`,
        ephemeral: true,
      });
    });

    collector.on('end', () => {
      button.setDisabled(true);
      sent.edit({ components: [new Discord.ActionRowBuilder().addComponents([button])] }).catch(() => {});
    });
  },
};
