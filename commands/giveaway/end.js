const { MessageEmbed } = require("discord.js");
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

function saveGiveaways(data) {
    const filePath = path.join(__dirname, 'giveaways.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    name: 'gcancel',
    aliases: ['gcancel'],
    userPerms: ['Manage_Guild'],
    botPerms: ['Embed_Links', 'Manage_Messages'],
    run: async (client, message, args) => {
        const giveaways = loadGiveaways();
        const guildId = message.guild.id;

        // Check if the guild has any giveaways
        if (giveaways[guildId]) {
            // Check if the user has provided a specific giveaway ID to end
            const giveawayId = args[0];
            if (!giveawayId) {
                return message.reply("Please provide the ID of the giveaway you want to end.");
            }

            // Check if the giveaway ID exists in the guild's giveaways
            if (!giveaways[guildId][giveawayId]) {
                return message.reply("The specified giveaway ID does not exist.");
            }

            // Retrieve the user IDs from the giveaway
            const participants = giveaways[guildId][giveawayId];

            // End the giveaway by removing it from the giveaways object
            delete giveaways[guildId][giveawayId];
            saveGiveaways(giveaways);

            // Optionally, you can perform other actions here, such as announcing the winner(s) or sending a message confirming the end of the giveaway.
            return message.reply(`The giveaway with ID ${giveawayId} has been ended.`);
        } else {
            return message.reply("There are no active giveaways in this server.");
        }
    }
};
