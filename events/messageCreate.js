const client = require("../index.js");
const st = require("../settings").bot;
const { ownerIDS } = require("../dev.json");
function isServerOwnerOrBotOwner(message) {
  return (
    message.author.id === message.guild?.ownerId ||
    ownerIDS.includes(message.author.id)
  );
}

function getReadablePermissions(permissions = []) {
  return permissions.map((perm) => `\`${perm}\``).join(", ");
}

function isUserAboveBotRole(message) {
  const botRolePosition = message.guild.members.me.roles.highest.position;
  const userRolePosition = message.member.roles.highest.position;
  return userRolePosition > botRolePosition;
}

async function isUserInBlacklist(client, id) {
  const data = await client.db4.get(`members_bl`);
  if (!data || !Array.isArray(data.blacklist)) return false;
  return data.blacklist.includes(id);
}

async function getNoPrefixUsers(client) {
  const data = await client.db4.get(`members_np`);
  return Array.isArray(data?.noprefixlist) ? data.noprefixlist : [];
}

async function handleCommand(client, message, args) {
  const cmd = args.shift()?.toLowerCase();
  if (!cmd) return;

  const command =
    client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));

  if (message.author.bot || !command) return;

  const extraOwner =
    (await client.db11.get(`${message.guild.id}_eo.extraownerlist`)) || [];
  const extraAdmin =
    (await client.db11.get(`${message.guild.id}_ea.extraadminlist`)) || [];
  const ignoreChannels =
    (await client.db10.get(`${message.guild.id}_ic.ignorechannellist`)) || [];
  const ignoreBypass =
    (await client.db10.get(`${message.guild.id}_ic.ignorebypasslist`)) || [];
  const mediaChannels =
    (await client.db14.get(
      `${message.guild.id}_mediachannels.mediachannellist`,
    )) || [];
  const missingBotPerms = command.BotPerms || [];
  const missingUserPerms = command.UserPerms || [];
  const isBotOwner = ownerIDS.includes(message.author.id);
  const isPrivilegedUser =
    isServerOwnerOrBotOwner(message) ||
    extraOwner.includes(message.author.id) ||
    extraAdmin.includes(message.author.id);

  if (mediaChannels.includes(message.channel.id)) {
    return;
  }

  if (
    ignoreChannels.includes(message.channel.id) &&
    !ignoreBypass.includes(message.author.id)
  ) {
    const ignoreMessage = await message.channel.send(
      "This channel is in my ignore list. You cannot use commands here.",
    );
    setTimeout(() => ignoreMessage.delete().catch(console.error), 5000);
    return;
  }

  if (command.botOwner && !isBotOwner) {
    return message.channel.send(
      "This command can only be used by the bot owner.",
    );
  }

  if (
    command.serverOwnerOnly &&
    !isServerOwnerOrBotOwner(message) &&
    !extraOwner.includes(message.author.id)
  ) {
    return message.channel.send(
      "This command can only be used by the server owner or extra owners.",
    );
  }

  if (
    missingBotPerms.length > 0 &&
    !message.guild.members.me.permissions.has(missingBotPerms)
  ) {
    return message.channel.send(
      `I need ${getReadablePermissions(
        missingBotPerms,
      )} permission(s) to execute this command.`,
    );
  }

  if (
    !isPrivilegedUser &&
    missingUserPerms.length > 0 &&
    !message.member.permissions.has(missingUserPerms)
  ) {
    return message.channel.send(
      `You need ${getReadablePermissions(
        missingUserPerms,
      )} permission(s) to use this command.`,
    );
  }

  if (
    command.aboveRole &&
    !isPrivilegedUser &&
    !isUserAboveBotRole(message)
  ) {
    return message.channel.send(
      "You need a role higher than the bot's role to use this command.",
    );
  }

  await command.run(client, message, args);
}

async function getPrefix(guildId) {
  return (await client.db8.get(`${guildId}_prefix`)) || st.info.prefix;
}

function isBotOrDM(message) {
  return message.author.bot || !message.guild;
}

function getCommandAndArgs(message, prefix, noprefixed) {
  const regex = new RegExp(`^<@!?${client.user.id}>`);
  const pre = message.content.match(regex)
    ? message.content.match(regex)[0]
    : prefix;

  if (
    !noprefixed.includes(message.author.id) &&
    !message.content.startsWith(pre)
  )
    return null;

  return noprefixed.includes(message.author.id) &&
    !message.content.startsWith(pre)
    ? message.content.trim().split(/ +/)
    : message.content.slice(pre.length).trim().split(/ +/);
}

client.on("messageCreate", async (message) => {
  try {
    if (isBotOrDM(message)) return;

    if (!message.guild.members.me.permissionsIn(message.channel).has("SendMessages")) {
      return;
    }

    const isBlacklisted = await isUserInBlacklist(client, message.author.id);
    if (isBlacklisted) return;

    const prefix = await getPrefix(message.guild.id);
    const noprefixed = await getNoPrefixUsers(client);

    const args = getCommandAndArgs(message, prefix, noprefixed);
    if (args) {
      await handleCommand(client, message, args);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
});