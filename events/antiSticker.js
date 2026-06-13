const { ownerIDS } = require('../dev.json');
const client = require('../index.js');
const { WebhookClient, AuditLogEvent, Events } = require('discord.js');
const config = require('../config.json');

const webhookClient = new WebhookClient({
  id: config.webid,
  token: config.webtoken
});

async function handleRateLimit() {
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

function isExceptionalCase(executorId, ownerId) {
  return executorId === ownerId || executorId === client.user.id;
}

async function canActAgainstExecutor(guild, executorId) {
  const executorMember = await guild.members.fetch(executorId).catch(() => null);
  if (!executorMember) return null;

  const botMember = guild.members.me;
  if (executorMember.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) {
    return null;
  }

  return executorMember;
}

async function shouldSkipStickerAction(guild, executorId, toggleKey) {
  const whitelistData = await client.db.get(`${guild.id}_wl`);
  const trusted = Array.isArray(whitelistData?.whitelisted) && whitelistData.whitelisted.includes(executorId);
  const extraOwner = (await client.db11.get(`${guild.id}_eo.extraownerlist`)) || [];
  const antinuke = await client.db.get(`${guild.id}_${toggleKey}`);

  return (
    isExceptionalCase(executorId, guild.ownerId) ||
    ownerIDS.includes(executorId) ||
    extraOwner.includes(executorId) ||
    antinuke !== true ||
    trusted === true
  );
}

async function punishExecutor(guild, executorId, reason) {
  if (!guild.members.me.permissions.has('BanMembers')) {
    sendWebhookError('Bot lacks necessary permissions for ban actions.');
    return false;
  }

  const executorMember = await canActAgainstExecutor(guild, executorId);
  if (!executorMember) return false;

  await guild.members.ban(executorMember.id, { reason });
  return true;
}

async function handleStickerCreate(sticker) {
  try {
    const auditLogs = await sticker.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.StickerCreate });
    const logs = auditLogs.entries.first();
    if (!logs) return;

    const { executor } = logs;
    const shouldSkip = await shouldSkipStickerAction(sticker.guild, executor.id, 'antistickercreate');
    if (shouldSkip) return;

    if (!sticker.guild.members.me.permissions.has('ManageEmojisAndStickers')) {
      sendWebhookError('Bot lacks necessary permissions for sticker actions.');
      return;
    }

    const punished = await punishExecutor(sticker.guild, executor.id, 'Sticker Create | Not Whitelisted');
    if (!punished) return;

    const autorecovery = await client.db.get(`${sticker.guild.id}_autorecovery`);
    if (autorecovery === true) {
      await sticker.delete().catch(() => { });
    }
  } catch (err) {
    if (err.code === 429) {
      await handleRateLimit();
      return;
    }
    sendWebhookError(err);
  }
}

async function handleStickerDelete(sticker) {
  try {
    const auditLogs = await sticker.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.StickerDelete });
    const logs = auditLogs.entries.first();
    if (!logs) return;

    const { executor } = logs;
    const shouldSkip = await shouldSkipStickerAction(sticker.guild, executor.id, 'antistickerdelete');
    if (shouldSkip) return;

    if (!sticker.guild.members.me.permissions.has('ManageEmojisAndStickers')) {
      sendWebhookError('Bot lacks necessary permissions for sticker actions.');
      return;
    }

    const punished = await punishExecutor(sticker.guild, executor.id, 'Sticker Delete | Not Whitelisted');
    if (!punished) return;

    const autorecovery = await client.db.get(`${sticker.guild.id}_autorecovery`);
    if (autorecovery === true && sticker.url) {
      await sticker.guild.stickers.create({
        file: sticker.url,
        name: sticker.name,
        tags: sticker.tags || 'sticker',
        description: sticker.description || undefined,
        reason: 'Anti Sticker Delete'
      }).catch(() => { });
    }
  } catch (err) {
    if (err.code === 429) {
      await handleRateLimit();
      return;
    }
    sendWebhookError(err);
  }
}

async function handleStickerUpdate(oldSticker, newSticker) {
  try {
    const auditLogs = await newSticker.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.StickerUpdate });
    const logs = auditLogs.entries.first();
    if (!logs) return;

    const { executor } = logs;
    const shouldSkip = await shouldSkipStickerAction(newSticker.guild, executor.id, 'antistickerupdate');
    if (shouldSkip) return;

    if (!newSticker.guild.members.me.permissions.has('ManageEmojisAndStickers')) {
      sendWebhookError('Bot lacks necessary permissions for sticker actions.');
      return;
    }

    const punished = await punishExecutor(newSticker.guild, executor.id, 'Sticker Update | Not Whitelisted');
    if (!punished) return;

    const autorecovery = await client.db.get(`${newSticker.guild.id}_autorecovery`);
    if (autorecovery === true) {
      await newSticker.edit({
        name: oldSticker.name,
        description: oldSticker.description,
        tags: oldSticker.tags
      }).catch(() => { });
    }
  } catch (err) {
    if (err.code === 429) {
      await handleRateLimit();
      return;
    }
    sendWebhookError(err);
  }
}

function sendWebhookError(error) {
  webhookClient.send(String(error)).catch(() => { });
}

client.on(Events.GuildStickerCreate, async (sticker) => handleStickerCreate(sticker));
client.on(Events.GuildStickerDelete, async (sticker) => handleStickerDelete(sticker));
client.on(Events.GuildStickerUpdate, async (oldSticker, newSticker) => handleStickerUpdate(oldSticker, newSticker));
