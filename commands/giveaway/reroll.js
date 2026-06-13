const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const Settings = require('../../settings.js');
const fs = require('fs');
const path = require('path');

function loadGiveaways() {
    const filePath = path.join(__dirname, 'giveaways.json');
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        try {
            return JSON.parse(fileContent);
        } catch (error) {
            console.error('Error parsing giveaways.json:', error);
            return {};
        }
    } else {
        return {};
    }
}

module.exports = {
    name: 'reroll',
    aliases: ['rr'],
    userPerms: ['Manage_Guild'],
    botPerms: ['Embed_Links', 'Manage_Messages'],
    run: async (client, message, args) => {
        const prefix = await client.db8.get(`${message.guild.id}_prefix`) || Settings.bot.info.prefix;

        // Load existing giveaways
        const giveaways = loadGiveaways();
        const guildId = message.guild.id;

        // Check if the guild has any giveaways
        if (giveaways[guildId]) {
            // Check if the user has provided a specific giveaway ID to reroll
            const giveawayId = args[0];
            if (!giveawayId) {
                return message.reply("Please provide the ID of the giveaway you want to reroll.");
            }

            // Check if the giveaway ID exists in the guild's giveaways
            if (!giveaways[guildId][giveawayId]) {
                return message.reply("The specified giveaway ID does not exist.");
            }

            // Select a new winner
            const participants = giveaways[guildId][giveawayId];
            const newWinnerIndex = Math.floor(Math.random() * participants.length);
            const newWinnerId = participants[newWinnerIndex];

            // Fetch the giveaway message
            message.channel.messages.fetch(giveawayId)
                .then(giveawayMessage => {
                    // Announce the new winner in the giveaway message
                    giveawayMessage.reply(`<a:Tada:1248895248457793577> Congratulations <@${newWinnerId}>, you are the new winner of the giveaway!`);
                })
                .catch(error => {
                    console.error('Error fetching giveaway message:', error);
                    message.reply("An error occurred while fetching the giveaway message.");
                });
        } else {
            message.reply("There are no active giveaways in this server.");
        }
    }
};
