const client = require('../index');
const { ownerIDS } = require('../dev.json');
const { WebhookClient, AuditLogEvent, Events } = require('discord.js');
const config = require('../config.json');

const webhookClient = new WebhookClient({
  id: config.webid,
  token: config.webtoken
});

const WEBHOOK_ACTIONS = [
  { type: AuditLogEvent.WebhookCreate, toggleKey: 'antiwebhookcreate', reason: 'Webhook Create | Not Whitelisted' },
  { type: AuditLogEvent.WebhookDelete, toggleKey: 'antiwebhookdelete', reason: 'Webhook Delete | Not Whitelisted' },
  { type: AuditLogEvent.WebhookUpdate, toggleKey: 'antiwebhookupdate', reason: 'Webhook Update | Not Whitelisted' }
];

async function handleRateLimit() {
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

function isExceptionalCase(executorId, ownerId) {
  return executorId === ownerId || executorId === client.user.id;
}

async function punishExecutor(guild, executorId, reason) {
  if (!guild.members.me.permissions.has('BanMembers')) {
    sendWebhookError('Bot lacks necessary permissions for ban actions.');
    return false;
  }

  const executorMember = await guild.members.fetch(executorId).catch(() => null);
  if (!executorMember) return false;

  const botMember = guild.members.me;
  if (executorMember.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) return false;

  await guild.members.ban(executorMember.id, { reason });
  return true;
}

async function processWebhookAction(channel, action) {
  const auditLog = await channel.guild.fetchAuditLogs({ limit: 1, type: action.type });
  const entry = auditLog.entries.first();
  if (!entry) return;

  const entryAgeMs = Date.now() - entry.createdTimestamp;
  if (entryAgeMs > 15000) return;

  const { executor, target } = entry;
  if (!executor) return;

  const whitelistData = await client.db.get(`${channel.guild.id}_wl`);
  const trusted = Array.isArray(whitelistData?.whitelisted) && whitelistData.whitelisted.includes(executor.id);
  const extraOwner = (await client.db11.get(`${channel.guild.id}_eo.extraownerlist`)) || [];
  const antinuke = await client.db.get(`${channel.guild.id}_${action.toggleKey}`);
  const autorecovery = await client.db.get(`${channel.guild.id}_autorecovery`);

  if (
    isExceptionalCase(executor.id, channel.guild.ownerId) ||
    ownerIDS.includes(executor.id) ||
    extraOwner.includes(executor.id) ||
    antinuke !== true ||
    trusted === true
  ) {
    return;
  }

  if (!channel.guild.members.me.permissions.has('ManageWebhooks')) {
    sendWebhookError('Bot lacks necessary permissions for webhook actions.');
    return;
  }

  const punished = await punishExecutor(channel.guild, executor.id, action.reason);
  if (!punished) return;

  if (autorecovery === true && action.type === AuditLogEvent.WebhookCreate && target?.id) {
    const hooks = await channel.fetchWebhooks().catch(() => null);
    const createdHook = hooks?.get(target.id);
    if (createdHook) {
      await createdHook.delete('Anti Webhook Create').catch(() => { });
    }
  }
}

async function handleWebhooksUpdate(channel) {
  if (!channel.guild.members.me.permissions.has('ViewAuditLog')) {
    return;
  }

  for (const action of WEBHOOK_ACTIONS) {
    try {
      await processWebhookAction(channel, action);
    } catch (err) {
      if (err.code === 429) {
        await handleRateLimit();
        continue;
      }
      sendWebhookError(err);
    }
  }
}

function sendWebhookError(error) {
  webhookClient.send(String(error)).catch(() => { });
}

client.on(Events.WebhooksUpdate, async (channel) => handleWebhooksUpdate(channel));
