const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to the JSON file
const settingsPath = path.join(__dirname, 'welcomeSettings.json');

// Function to read the settings from the JSON file
function readSettings() {
    if (!fs.existsSync(settingsPath)) {
        return {};
    }
    const data = fs.readFileSync(settingsPath, 'utf-8');
    return JSON.parse(data);
}

// Function to write the settings to the JSON file
function writeSettings(settings) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Set up welcome settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup welcome system in your server.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('variables')
                .setDescription('Variables for welcome embed.')
        ),
    async execute(client, interaction) {
        if (!interaction.isChatInputCommand()) return;

        const guildId = interaction.guild.id;
        const settings = readSettings();

        if (interaction.commandName === 'welcome' && interaction.options.getSubcommand() === 'setup') {
            await interaction.deferReply({ ephemeral: true });
            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                await interaction.editReply("You don't have permission to use this command.");
                return;
            }
              const firstDropdown = new StringSelectMenuBuilder()
              .setCustomId('welcome_options')
              .setPlaceholder('Select this to Make changes in Welcome Embed !!')
              .addOptions(
                  new StringSelectMenuOptionBuilder()
                      .setLabel('Channel For Welcome')
                      .setValue('channel')
                      .setDescription('Enable/Disable/Set Channel For Welcome!')
                      .setEmoji('<:nwave:1222077151734403134>'),

                  new StringSelectMenuOptionBuilder()
                      .setLabel('Message On Welcome')
                      .setValue('message')
                      .setDescription('Enable/Disable/Set Message For Welcome!')
                      .setEmoji('<:eg_mail:1243485812373590016>'),
                  new StringSelectMenuOptionBuilder()
                      .setLabel('Image For Welcome')
                      .setValue('image')
                      .setDescription('Set an image for welcome message')
                      .setEmoji('<:eg_art:1243485763707076670>')
              );

                const secondDropdown = new StringSelectMenuBuilder()
                    .setCustomId('save_reset')
                    .setPlaceholder('Select an option to Save !!')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Save Settings')
                            .setValue('save')
                            .setDescription('Save the current configuration settings')
                            .setEmoji('<:tick_icon:1249756052464078858>'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Reset ALL')
                            .setValue('reset')
                            .setDescription('Delete all custom data')
                            .setEmoji('<:nwrong:1222291009073971326>') // Replace with emotes.del if using a custom emoji
                    );

                const row1 = new ActionRowBuilder().addComponents(firstDropdown);
                const row2 = new ActionRowBuilder().addComponents(secondDropdown);
                const welcomeembed = new EmbedBuilder()
                .setTitle("Welcome Embed Setup")
                .setDescription("**Select an option from the following list to get started!**\n\n> *Join Our [**Discord**](https://discord.com/invite/) or dm [@Devansh Yadav](https://discord.com/users/) if you need help!*")

                await interaction.editReply({
                    content:"Welcome Setup",
                    embeds:[welcomeembed],
                    components: [row1, row2]
                });

                // Create a message component collector for the dropdowns
                const filter = i => i.user.id === interaction.user.id;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

                collector.on('collect', async i => {
                    if (i.customId === 'welcome_options') {
                        const selectedOption = i.values[0];
                        let modal;
                        let modalCustomId;

                        if (selectedOption === 'channel') {
                            modalCustomId = 'channel_modal';
                            modal = new ModalBuilder()
                                .setCustomId(modalCustomId)
                                .setTitle('Set Welcome Channel')
                                .addComponents(
                                    new ActionRowBuilder().addComponents(
                                        new TextInputBuilder()
                                            .setCustomId('channel_input')
                                            .setLabel('Enter the channel ID')
                                            .setStyle(TextInputStyle.Short)
                                    )
                                );
                        } else if (selectedOption === 'message') {
                            modalCustomId = 'message_modal';
                            modal = new ModalBuilder()
                                .setCustomId(modalCustomId)
                                .setTitle('Set Welcome Message')
                                .addComponents(
                                    new ActionRowBuilder().addComponents(
                                        new TextInputBuilder()
                                            .setCustomId('message_input')
                                            .setLabel('Enter the welcome message')
                                            .setStyle(TextInputStyle.Paragraph)
                                    )
                                );
                        } else if (selectedOption === 'image') {
                            modalCustomId = 'image_modal';
                            modal = new ModalBuilder()
                                .setCustomId(modalCustomId)
                                .setTitle('Set Welcome Image')
                                .addComponents(
                                    new ActionRowBuilder().addComponents(
                                        new TextInputBuilder()
                                            .setCustomId('image_input')
                                            .setLabel('Enter the image URL (GIF, PNG, JPEG, JPG)')
                                            .setStyle(TextInputStyle.Short)
                                    )
                                );
                        }

                        await i.showModal(modal);
                        const modalInteraction = await i.awaitModalSubmit({
                            filter: submitted => submitted.user.id === interaction.user.id && submitted.customId === modalCustomId,
                            time: 60000,
                        }).catch(() => null);

                        if (!modalInteraction) return;

                        if (modalInteraction.customId === 'channel_modal') {
                            const channelId = modalInteraction.fields.getTextInputValue('channel_input');
                            settings[guildId] = settings[guildId] || {};
                            settings[guildId].channelId = channelId;
                            writeSettings(settings);
                            await modalInteraction.reply({ content: `Welcome channel set to: <#${channelId}>`, ephemeral: true });
                        } else if (modalInteraction.customId === 'message_modal') {
                            const message = modalInteraction.fields.getTextInputValue('message_input');
                            settings[guildId] = settings[guildId] || {};
                            settings[guildId].message = message;
                            writeSettings(settings);
                            await modalInteraction.reply({ content: `Welcome message set to: ${message}`, ephemeral: true });
                        } else if (modalInteraction.customId === 'image_modal') {
                            const imageUrl = modalInteraction.fields.getTextInputValue('image_input');
                            const validExtensions = ['gif', 'png', 'jpeg', 'jpg'];
                            const extension = imageUrl.split('.').pop().toLowerCase();

                            if (!validExtensions.includes(extension)) {
                                await modalInteraction.reply({ content: 'Invalid file type. Please provide a URL to a GIF, PNG, JPEG, or JPG image.', ephemeral: true });
                                return;
                            }

                            settings[guildId] = settings[guildId] || {};
                            settings[guildId].imageUrl = imageUrl;
                            writeSettings(settings);
                            await modalInteraction.reply({ content: `Welcome image set to: ${imageUrl}`, ephemeral: true });
                        }
                    } else if (i.customId === 'save_reset') {
                        const action = i.values[0];
                        if (action === 'save') {
                            // Save the current settings to the JSON file
                            settings[guildId] = settings[guildId] || {};
                            writeSettings(settings);
                            await i.update({ content: 'Settings have been saved.', components: [] });
                        } else if (action === 'reset') {
                            // Reset the settings for the current guild
                            delete settings[guildId];
                            writeSettings(settings);
                            await i.update({ content: 'Settings have been reset.', components: [] });
                        }
                    }
                });

                collector.on('end', collected => {
                    if (collected.size === 0) {
                        interaction.editReply({ content: 'Interaction timed out.', components: [] });
                    }
                });
            }

        if (interaction.commandName === 'welcome' && interaction.options.getSubcommand() === 'variables') {
            const vara = new EmbedBuilder()
            .setTitle("Welcome Variables")
            .setColor("Random")
                .addFields(
                    { name: '{servername}', value: 'The name of the server', inline: true },
                    { name: '{user_mention}', value: 'The mention of the user', inline: true },
                    { name: '{user_tag}', value: 'The tag of the user', inline: true },
                    { name: '{membercount}', value: 'The number of members in the server', inline: true },
                    { name: '{n}', value: 'This is a newline character', inline: true }
                )

            interaction.reply({embeds: [vara]})
        }
    }
};
