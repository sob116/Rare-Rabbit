const { ownerIDS } = require('../dev.json');
const client = require('../index.js');
const { WebhookClient, AuditLogEvent, Events } = require('discord.js');
const config  = require('../config.json');

const webhookClient = new WebhookClient({
  id: config.webid,
  token: config.webtoken
});

let globalCooldown = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleRateLimit() {
  globalCooldown = true;
  await sleep(5000);
  globalCooldown = false;
}

async function handleGuildBanAdd(ban) {
  try {
    if (globalCooldown) {
      await handleRateLimit();
    }

    const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
    const logs = auditLogs.entries.first();

    if (!logs) return;

    const { executor, target } = logs;

    const whitelistData = await client.db.get(`${ban.guild.id}_wl`);
    const trusted = Array.isArray(whitelistData?.whitelisted) && whitelistData.whitelisted.includes(executor.id);
    const extraOwner = (await client.db11.get(`${ban.guild.id}_eo.extraownerlist`)) || [];
    const antinuke = await client.db.get(`${ban.guild.id}_antiban`);
    const autorecovery = await client.db.get(`${ban.guild.id}_autorecovery`);

    if (
      isExceptionalCase(executor.id, ban.guild.ownerId) ||
      extraOwner.includes(executor.id) ||
      ownerIDS.includes(executor.id) ||
      antinuke !== true ||
      trusted === true
    ) return;

    if (!ban.guild.members.me.permissions.has('ManageRoles')) {
      sendWebhookError('Bot lacks necessary permissions for member create actions.');
      return;
    }

    if (!ban.guild.members.me.permissions.has('BanMembers')) {
      sendWebhookError('Bot lacks necessary permissions for ban actions.');
      return;
    }

    const executorMember = await ban.guild.members.fetch(executor.id);
    if (!executorMember) return;

    const botMember = ban.guild.members.me;
    if (executorMember.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) return;

    await ban.guild.members.ban(executorMember.id, { reason: 'Member Delete | Not Whitelisted' });

    if (autorecovery === true) {
      await ban.guild.members.unban(target.id).catch((_) => { });
    }
  } catch (err) {
    if (err.code === 429) {
      await handleRateLimit();
      return;
    }
    sendWebhookError(err);
  }
}

async function handleGuildBanRemove(ban) {
  try {
    if (globalCooldown) {
      await handleRateLimit();
    }

    const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove });
    const logs = auditLogs.entries.first();

    if (!logs) return;

    const { executor, target } = logs;

    const whitelistData = await client.db.get(`${ban.guild.id}_wl`);
    const trusted = Array.isArray(whitelistData?.whitelisted) && whitelistData.whitelisted.includes(executor.id);
    const extraOwner = (await client.db11.get(`${ban.guild.id}_eo.extraownerlist`)) || [];
    const antinuke = await client.db.get(`${ban.guild.id}_antiunban`);
    const autorecovery = await client.db.get(`${ban.guild.id}_autorecovery`);

    if (
      isExceptionalCase(executor.id, ban.guild.ownerId) ||
      extraOwner.includes(executor.id) ||
      ownerIDS.includes(executor.id) ||
      antinuke !== true ||
      trusted === true
    ) return;

    if (!ban.guild.members.me.permissions.has('ManageRoles')) {
      sendWebhookError('Bot lacks necessary permissions for member create actions.');
      return;
    }

    if (!ban.guild.members.me.permissions.has('BanMembers')) {
      sendWebhookError('Bot lacks necessary permissions for ban actions.');
      return;
    }

    const executorMember = await ban.guild.members.fetch(executor.id);
    if (!executorMember) return;

    const botMember = ban.guild.members.me;
    if (executorMember.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) return;

    await ban.guild.members.ban(executorMember.id, { reason: 'Member Delete | Not Whitelisted' });

    if (autorecovery === true) {
      await ban.guild.members.ban(target.id, {
        reason: 'Anti Member Unban'
      }).catch((_) => { });
    }
  } catch (err) {
    if (err.code === 429) {
      await handleRateLimit();
      return;
    }
    sendWebhookError(err);
  }
}

async function handleGuildMemberAdd(joinedMember) {
  try {
    if (globalCooldown) {
      await handleRateLimit();
    }

    const auditLogs = await joinedMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.BotAdd });
    const logs = auditLogs.entries.first();

    if (!logs) return;

    const { executor, target } = logs;

    const whitelistData = await client.db.get(`${joinedMember.guild.id}_wl`);
    const trusted = Array.isArray(whitelistData?.whitelisted) && whitelistData.whitelisted.includes(executor.id);
    const extraOwner = (await client.db11.get(`${joinedMember.guild.id}_eo.extraownerlist`)) || [];
    const antinuke = await client.db.get(`${joinedMember.guild.id}_antibot`);
    const autorecovery = await client.db.get(`${joinedMember.guild.id}_autorecovery`);

    if (
      isExceptionalCase(executor.id, joinedMember.guild.ownerId) ||
      extraOwner.includes(executor.id) ||
      ownerIDS.includes(executor.id) ||
      !target.bot ||
      antinuke !== true ||
      trusted === true ||
      target.id !== joinedMember.id
    ) return;

    if (!joinedMember.guild.members.me.permissions.has('ManageRoles')) {
      sendWebhookError('Bot lacks necessary permissions for member create actions.');
      return;
    }

    if (!joinedMember.guild.members.me.permissions.has('BanMembers')) {
      sendWebhookError('Bot lacks necessary permissions for ban actions.');
      return;
    }

    const executorMember = await joinedMember.guild.members.fetch(executor.id);
    if (!executorMember) return;

    const botMember = joinedMember.guild.members.me;
    if (executorMember.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) return;

    await joinedMember.guild.members.ban(executorMember.id, { reason: 'Member Delete | Not Whitelisted' });

    if (autorecovery === true) {
      await joinedMember.guild.members.ban(target.id, {
        reason: 'Illegal Bot | Not Whitelisted'
      }).catch((_) => { });
    }
  } catch (err) {
    if (err.code === 429) {
      await handleRateLimit();
      return;
    }
    sendWebhookError(err);
  }
}

async function handleGuildMemberRemove(removedMember) {
  try {
    if (globalCooldown) {
      await handleRateLimit();
    }

    const auditLogs = await removedMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
    const logs = auditLogs.entries.first();

    if (!logs) return;

    const { executor, target } = logs;

    const whitelistData = await client.db.get(`${removedMember.guild.id}_wl`);
    const trusted = Array.isArray(whitelistData?.whitelisted) && whitelistData.whitelisted.includes(executor.id);
    const extraOwner = (await client.db11.get(`${removedMember.guild.id}_eo.extraownerlist`)) || [];
    const antinuke = await client.db.get(`${removedMember.guild.id}_antikick`);

    if (
      isExceptionalCase(executor.id, removedMember.guild.ownerId) ||
      extraOwner.includes(executor.id) ||
      ownerIDS.includes(executor.id) ||
      removedMember.id !== target.id ||
      antinuke !== true ||
      trusted === true
    ) return;

    if (!removedMember.guild.members.me.permissions.has('ManageRoles')) {
      sendWebhookError('Bot lacks necessary permissions for member create actions.');
      return;
    }

    if (!removedMember.guild.members.me.permissions.has('BanMembers')) {
      sendWebhookError('Bot lacks necessary permissions for ban actions.');
      return;
    }

    const executorMember = await removedMember.guild.members.fetch(executor.id);
    if (!executorMember) return;

    const botMember = removedMember.guild.members.me;
    if (executorMember.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) return;

    await removedMember.guild.members.ban(executorMember.id, { reason: 'Member Delete | Not Whitelisted' });

  } catch (err) {
    if (err.code === 429) {
      await handleRateLimit();
      return;
    }
    sendWebhookError(err);
  }
}

async function handleGuildMemberPrune(chunk) {

  if (!chunk.guild.members.me.permissions.has('ViewAuditLog')) {
    return;
  }

  try {
    const auditLogs = await chunk.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberPrune });
    const logs = auditLogs.entries.first();

    if (!logs) return;

    const { executor } = logs;

    const antinuke = await client.db.get(`${chunk.guild.id}_antiprune`);
    const extraOwner = (await client.db11.get(`${chunk.guild.id}_eo.extraownerlist`)) || [];

    if (
      isExceptionalCase(executor.id, chunk.guild.ownerId) ||
      extraOwner.includes(executor.id) ||
      ownerIDS.includes(executor.id) ||
      antinuke !== true
    ) return;

    if (!chunk.guild.members.me.permissions.has('ManageRoles')) {
      sendWebhookError('Bot lacks necessary permissions for member create actions.');
      return;
    }

    if (!chunk.guild.members.me.permissions.has('BanMembers')) {
      sendWebhookError('Bot lacks necessary permissions for ban actions.');
      return;
    }

    const executorMember = await chunk.guild.members.fetch(executor.id);
    if (!executorMember) return;

    const botMember = chunk.guild.members.me;
    if (executorMember.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) return;

    await chunk.guild.members.ban(executorMember.id, { reason: 'Member Delete | Not Whitelisted' });

  } catch (err) {
    sendWebhookError(err);
  }
}

async function handleGuildMemberUpdate(oldMember, newMember) {
  try {
    const auditLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
    const logs = auditLogs.entries.first();

    if (!logs) return;

    const { executor, target } = logs;

    const whitelistData = await client.db.get(`${newMember.guild.id}_wl`);
    const trusted = Array.isArray(whitelistData?.whitelisted) && whitelistData.whitelisted.includes(executor.id);
    const extraOwner = (await client.db11.get(`${newMember.guild.id}_eo.extraownerlist`)) || [];
    const antinuke = await client.db.get(`${newMember.guild.id}_antimemberupdate`);
    const autorecovery = await client.db.get(`${newMember.guild.id}_autorecovery`);
    const executorMember = newMember.guild.members.cache.get(executor.id);

    if (
      !executorMember ||
      (!executorMember.permissions.has('ManageRoles') && !executorMember.permissions.has('Administrator'))
    ) {
      return;
    }

    if (
      isExceptionalCase(executor.id, newMember.guild.ownerId) ||
      extraOwner.includes(executor.id) ||
      ownerIDS.includes(executor.id) ||
      antinuke !== true ||
      trusted === true
    ) return;

    if (!newMember.guild.members.me.permissions.has('ManageRoles')) {
      sendWebhookError('Bot lacks necessary permissions for member create actions.');
      return;
    }

    if (!newMember.guild.members.me.permissions.has('BanMembers')) {
      sendWebhookError('Bot lacks necessary permissions for ban actions.');
      return;
    }

    const member = await newMember.guild.members.fetch(executor.id);
    if (!member) return;

    const botMember = newMember.guild.members.me;
    if (member.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) return;

    await newMember.guild.members.ban(member.id, { reason: 'Member Delete | Not Whitelisted' });

    if (autorecovery === true && !newMember.roles.cache.equals(oldMember.roles.cache)) {
      await newMember.roles.set(oldMember.roles.cache).catch((_) => { });
    }
  } catch (err) {
    sendWebhookError(err);
  }
}

function isExceptionalCase(executorId, ownerId) {
  return executorId === ownerId || executorId === client.user.id;
}

function sendWebhookError(error) {
  webhookClient.send(String(error)).catch(() => { });
}

client.on(Events.GuildBanAdd, async (member) => handleGuildBanAdd(member));
client.on(Events.GuildBanRemove, async (member) => handleGuildBanRemove(member));
client.on(Events.GuildMemberAdd, async (member) => handleGuildMemberAdd(member));
client.on(Events.GuildMemberRemove, async (member) => handleGuildMemberRemove(member));
client.on(Events.GuildMembersChunk, async (member) => handleGuildMemberPrune(member));
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => handleGuildMemberUpdate(oldMember, newMember));
