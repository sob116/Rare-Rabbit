const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require("discord.js");
const Settings = require('../../settings.js');
const config = require('../../config');
const { TimestampBuilder } = require('discord-timestamp-generator');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'gcreate',
    aliases: ['giveaway create'],
    userPerms: [PermissionFlagsBits.ManageGuild], // Required permission
    botPerms: ['Embed_Links', 'Manage_Messages', 'Add_Reactions', 'Read_Message_History'],
    run: async (client, message, args) => {
        const prefix = await client.db8.get(`${message.guild.id}_prefix`) || Settings.bot.info.prefix;

        // Check if the user has the required permissions
        const userPermissions = message.member.permissions;
        if (!userPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply(`You need the \`Manage_Guild\` permission to create a giveaway.`);
        }

        const webhookURL = config.giveawayWebhookUrl;

        // Function to send logs to Discord webhook
        async function sendToWebhook(logMessage) {
            if (!webhookURL) return;

            try {
                await axios.post(webhookURL, { content: logMessage });
            } catch (error) {
                console.error('Error sending message to webhook:', error);
            }
        }

        if (args.length < 3) {
            sendToWebhook(`Usage: \`${prefix}gcreate <time> <prize> <winners>\``);
            return message.channel.send(`Usage: \`${prefix}gcreate <time> <prize> <winners>\``);
        }

        const timeInput = args.shift().toLowerCase();
        const time = parseTime(timeInput);

        if (!time) {
            sendToWebhook('Invalid time format. Please use a valid time format (e.g., 1d, 2h, 30m).');
            return message.channel.send('Invalid time format. Please use a valid time format (e.g., 1d, 2h, 30m).');
        }

        const prize = args.slice(0, -1).join(' ');
        const winners = parseInt(args[args.length - 1]);

        if (isNaN(winners)) {
            sendToWebhook('The number of winners must be a valid number.');
            return message.channel.send('The number of winners must be a valid number.');
        }

        const endDate = new Date(Date.now() + time * 1000);
        const timestamp = new TimestampBuilder()
            .setTime(Math.floor(endDate.getTime() / 1000))
            .generate();

        const embed = new EmbedBuilder()
            .setTitle(`<a:Tada:1248895248457793577> ${prize} <a:Tada:1248895248457793577>`)
            .setDescription(`<:arrow_2077:1248896042414379018> **Winners:** ${winners}\n<:arrow_2077:1248896042414379018> **Ends At:** ${timestamp} \n <:arrow_2077:1248896042414379018> **Hosted By:** ${message.author} \n <:arrow_2077:1248896042414379018> Vote Me On [Top.gg](https://top.gg/bot/1027828697828433980/vote) For 2x Entries`)
            .setImage('https://github.com/akshew/image-hosting/blob/main/rabbit-banner.png?raw=true')
            .setColor('#FF0000')
            .setFooter({ text: 'Good luck!' })
            .setTimestamp();

        // Logging exported winners count
        const exportedWinnersCount = winners;
        sendToWebhook(`Exported winners count: ${exportedWinnersCount}`);

        const sentMessage = await message.channel.send({ embeds: [embed] });
        await sentMessage.react("<a:Tada:1248895248457793577>");

        const filter = (reaction, user) => {
            return reaction.emoji.name === 'Tada' && !user.bot;
        };

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
                // File doesn't exist or is empty, return an empty object
                return {};
            }
        }

        function saveGiveaways(data) {
            const filePath = path.join(__dirname, 'giveaways.json');
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        }

        const collector = sentMessage.createReactionCollector({ filter, time: time * 1000 });

        collector.on('collect', (reaction, user) => {
            sendToWebhook(`Collected ${reaction.emoji.name} from ${user.id}`);

            let giveaways = loadGiveaways();
            const guildId = reaction.message.guild.id;
            const messageId = reaction.message.id;

            if (!giveaways[guildId]) {
                giveaways[guildId] = {};
            }
            if (!giveaways[guildId][messageId]) {
                giveaways[guildId][messageId] = [];
            }

            if (!giveaways[guildId][messageId].includes(user.id)) {
                giveaways[guildId][messageId].push(user.id);
            }

            saveGiveaways(giveaways);
        });

        client.on('messageReactionRemove', async (reaction, user) => {
            if (reaction.message.id !== sentMessage.id) return;

            sendToWebhook(`Removed ${reaction.emoji.name} from ${user.id}`);

            let giveaways = loadGiveaways();
            const guildId = reaction.message.guild.id;
            const messageId = reaction.message.id;

            if (giveaways[guildId] && giveaways[guildId][messageId]) {
                giveaways[guildId][messageId] = giveaways[guildId][messageId].filter(participant => participant !== user.id);

                saveGiveaways(giveaways);
            }
        });

        collector.on('end', collected => {
            sendToWebhook('Collector has ended.');

            const giveaways = loadGiveaways();
            const guildId = message.guild.id;
            const messageId = sentMessage.id;

            if (giveaways[guildId] && giveaways[guildId][messageId]) {
                const participants = giveaways[guildId][messageId];
                if (participants.length > 0) {
                    let winnersCount = Math.min(winners, participants.length);

                    let winnersList = [];
                    for (let i = 0; i < winnersCount; i++) {
                        let randomIndex = Math.floor(Math.random() * participants.length);
                        winnersList.push(participants.splice(randomIndex, 1)[0]);
                    }

                    // Update the description of the embed with the new winners list
                    embed.setDescription(`**Prize:** ${prize}\n**Winners:** ${winnersList.map(tag => `<@${tag}>`).join(', ')}\n**Ended At:** ${timestamp}`);

                    // Edit the giveaway message with the updated embed
                    sentMessage.edit({ embeds: [embed] });

                    sentMessage.reply(`<a:Tada:1248895248457793577> Congratulations ${winnersList.map(tag => `<@${tag}>`).join(', ')}, you won the giveaway!`);
                } else {
                    sentMessage.reply("No participants in this giveaway.");
                }
            } else {
                sendToWebhook('No data found for this giveaway.');
                console.log('No data found for this giveaway.');
                sentMessage.reply("No participants in this giveaway.");
            }
        });
    }
}

function parseTime(timeInput) {
    const timeRegex = /^(\d+)(s|m|h|d|w|M|y)$/;
    const matches = timeInput.match(timeRegex);

    if (!matches) {
        return null;
    }

    const [, value, unit] = matches;
    const secondsPerUnit = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
        w: 604800,
        M: 2592000,
        y: 31536000,
    };

    return parseInt(value) * secondsPerUnit[unit];
}
