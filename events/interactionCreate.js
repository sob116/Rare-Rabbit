const { InteractionType, PermissionsBitField } = require("discord.js");
const client = require("../index");
const { ownerIDS } = require("../dev.json");
const { getCommandPermissions } = require("../handler/commandMetadata");

function isServerOwnerOrBotOwner(interaction) {
  return (
    interaction.user.id === interaction.guild?.ownerId ||
    ownerIDS.includes(interaction.user.id)
  );
}

function getReadablePermissions(permissions) {
  return permissions.map((perm) => `\`${perm}\``).join(", ");
}

function isUserAboveBotRole(interaction) {
  const botRolePosition = interaction.guild.members.me.roles.highest.position;
  const userRolePosition = interaction.member.roles.highest.position;
  return userRolePosition > botRolePosition;
}

async function isUserInBlacklist(client, ID) {
  const data = await client.db4.get(`members_bl`);
  return !!data && !!data.blacklist && data.blacklist.includes(ID);
}

async function handleCommand(client, interaction) {
  const slashCommand = client.slashCommands.get(interaction.commandName);
  if (!slashCommand || interaction.user.bot) return;

  const { userPerms: missingUserPerms, botPerms: missingBotPerms } =
    getCommandPermissions(slashCommand);
  const extraOwner =
    (await client.db11.get(`${interaction.guild.id}_eo.extraownerlist`)) || [];
  const extraAdmin =
    (await client.db11.get(`${interaction.guild.id}_ea.extraadminlist`)) || [];
  const channelId = interaction.channel.id;
  const ignoreChannels =
    (await client.db10.get(`${interaction.guild.id}_ic.ignorechannellist`)) || [];
  const ignoreBypass =
    (await client.db10.get(`${interaction.guild.id}_ic.ignorebypasslist`)) || [];
  const mediaChannels =
    (await client.db14.get(
      `${interaction.guild.id}_mediachannels.mediachannellist`,
    )) || [];

  if (
    slashCommand.serverOwnerOnly &&
    !isServerOwnerOrBotOwner(interaction) &&
    !extraOwner.includes(interaction.user.id)
  ) {
    return interaction.reply(
      "This command can only be used by the server owner or extra owners.",
    );
  }

  if (
    missingBotPerms.length > 0 &&
    !interaction.guild.members.me.permissions.has(missingBotPerms)
  ) {
    return interaction.reply(
      `I need ${getReadablePermissions(
        missingBotPerms,
      )} permission(s) to execute this command.`,
    );
  }

  if (
    !isServerOwnerOrBotOwner(interaction) &&
    !extraOwner.includes(interaction.user.id) &&
    !extraAdmin.includes(interaction.user.id) &&
    missingUserPerms.length > 0 &&
    !interaction.member.permissions.has(missingUserPerms)
  ) {
    return interaction.reply(
      `You need ${getReadablePermissions(
        missingUserPerms,
      )} permission(s) to use this command.`,
    );
  }

  if (
    slashCommand.aboveRole &&
    !isUserAboveBotRole(interaction) &&
    !isServerOwnerOrBotOwner(interaction) &&
    !extraOwner.includes(interaction.user.id)
  ) {
    return interaction.reply(
      "You need a role higher than the bot's role to use this command.",
    );
  }

  if (mediaChannels.includes(channelId)) return;

  if (
    ignoreChannels.includes(channelId) &&
    !ignoreBypass.includes(interaction.user.id)
  ) {
    const ignoreMessage = await interaction.reply(
      "This channel is in my ignore list. You cannot use commands here.",
    );
    setTimeout(() => ignoreMessage.delete().catch(console.error), 5000);
    return;
  }

  await slashCommand.execute(client, interaction);
}

function isBotOrDM(interaction) {
  return interaction.user?.bot || !interaction.guild;
}

client.on("interactionCreate", async (interaction) => {
  const isAutocomplete =
    interaction.type === InteractionType.ApplicationCommandAutocomplete;

  if (!interaction.isChatInputCommand() && !isAutocomplete) return;
  if (isBotOrDM(interaction)) return;

  if (
    !interaction.guild.members.me
      .permissionsIn(interaction.channel)
      .has(PermissionsBitField.Flags.SendMessages)
  ) {
    return;
  }

  const isBlacklisted = await isUserInBlacklist(client, interaction.user.id);
  if (isBlacklisted) return;

  try {
    const slashCommand = client.slashCommands.get(interaction.commandName);
    if (!slashCommand) return;

    if (isAutocomplete) {
      if (typeof slashCommand.autocomplete === "function") {
        await slashCommand.autocomplete(interaction);
      }
      return;
    }

    await handleCommand(client, interaction);
  } catch (error) {
    console.error(error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});
