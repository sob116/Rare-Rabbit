const client = require("../index");
const { ownerIDS } = require("../dev.json");

function isServerOwnerOrBotOwner(interaction) {
  return (
    interaction.member.id === interaction.guild?.ownerId ||
    ownerIDS.includes(interaction.member.id)
  );
}

function getReadablePermissions(permissions = []) {
  return permissions.map((perm) => `\`${perm}\``).join(", ");
}

function isUserAboveBotRole(interaction) {
  const botRolePosition = interaction.guild.members.me.roles.highest.position;
  const userRolePosition = interaction.member.roles.highest.position;
  return userRolePosition > botRolePosition;
}

async function isUserInBlacklist(client, id) {
  const data = await client.db4.get(`members_bl`);
  return Array.isArray(data?.blacklist) && data.blacklist.includes(id);
}

async function replyWithCommandError(interaction, content) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content, ephemeral: true });
  }

  return interaction.reply({ content, ephemeral: true });
}

async function handleSlashCommand(client, interaction) {
  const slashCommand = client.slashCommands.get(interaction.commandName);
  if (!slashCommand || interaction.member.bot) return;

  const extraOwner =
    (await client.db11.get(`${interaction.guild.id}_eo.extraownerlist`)) || [];
  const extraAdmin =
    (await client.db11.get(`${interaction.guild.id}_ea.extraadminlist`)) || [];
  const ignoreChannels =
    (await client.db10.get(`${interaction.guild.id}_ic.ignorechannellist`)) || [];
  const ignoreBypass =
    (await client.db10.get(`${interaction.guild.id}_ic.ignorebypasslist`)) || [];
  const mediaChannels =
    (await client.db14.get(
      `${interaction.guild.id}_mediachannels.mediachannellist`,
    )) || [];
  const missingUserPerms = slashCommand.UserPerms || [];
  const missingBotPerms = slashCommand.BotPerms || [];
  const isBotOwner = ownerIDS.includes(interaction.member.id);
  const isPrivilegedUser =
    isServerOwnerOrBotOwner(interaction) ||
    extraOwner.includes(interaction.member.id) ||
    extraAdmin.includes(interaction.member.id);

  if (mediaChannels.includes(interaction.channel.id)) {
    return;
  }

  if (
    ignoreChannels.includes(interaction.channel.id) &&
    !ignoreBypass.includes(interaction.member.id)
  ) {
    return replyWithCommandError(
      interaction,
      "This channel is in my ignore list. You cannot use commands here.",
    );
  }

  if (slashCommand.botOwner && !isBotOwner) {
    return replyWithCommandError(
      interaction,
      "This command can only be used by the bot owner.",
    );
  }

  if (
    slashCommand.serverOwnerOnly &&
    !isServerOwnerOrBotOwner(interaction) &&
    !extraOwner.includes(interaction.member.id)
  ) {
    return replyWithCommandError(
      interaction,
      "This command can only be used by the server owner or extra owners.",
    );
  }

  if (
    missingBotPerms.length > 0 &&
    !interaction.guild.members.me.permissions.has(missingBotPerms)
  ) {
    return replyWithCommandError(
      interaction,
      `I need ${getReadablePermissions(
        missingBotPerms,
      )} permission(s) to execute this command.`,
    );
  }

  if (
    !isPrivilegedUser &&
    missingUserPerms.length > 0 &&
    !interaction.member.permissions.has(missingUserPerms)
  ) {
    return replyWithCommandError(
      interaction,
      `You need ${getReadablePermissions(
        missingUserPerms,
      )} permission(s) to use this command.`,
    );
  }

  if (
    slashCommand.aboveRole &&
    !isPrivilegedUser &&
    !isUserAboveBotRole(interaction)
  ) {
    return replyWithCommandError(
      interaction,
      "You need a role higher than the bot's role to use this command.",
    );
  }

  await slashCommand.execute(client, interaction);
}

function isBotOrDM(interaction) {
  return !interaction.guild || interaction.user?.bot;
}

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    const slashCommand = client.slashCommands.get(interaction.commandName);
    if (!slashCommand?.autocomplete) return;

    try {
      await slashCommand.autocomplete(interaction);
    } catch (error) {
      console.error(error);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  if (isBotOrDM(interaction)) return;

  if (
    !interaction.guild.members.me
      .permissionsIn(interaction.channel)
      .has("SendMessages")
  ) {
    return;
  }

  const isBlacklisted = await isUserInBlacklist(client, interaction.member.id);
  if (isBlacklisted) return;

  try {
    await handleSlashCommand(client, interaction);
  } catch (error) {
    console.error(error);
    await replyWithCommandError(
      interaction,
      "There was an error while executing this command!",
    );
  }
});
