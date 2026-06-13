function env(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return "";
}

function envNumber(defaultValue, ...names) {
  const value = env(...names);
  if (!value) return defaultValue;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function envBoolean(defaultValue, ...names) {
  const value = env(...names);
  if (!value) return defaultValue;

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const clientId = env("DISCORD_CLIENT_ID", "CLIENT_ID");

module.exports = {
  token: env("DISCORD_TOKEN", "BOT_TOKEN"),
  mongo: env("MONGO_URI", "MONGODB_URI"),
  clientId,
  guildId: env("DISCORD_GUILD_ID", "GUILD_ID"),
  application_id: env("DISCORD_APPLICATION_ID", "APPLICATION_ID") || clientId,
  webhook: env("LOG_WEBHOOK_URL", "WEBHOOK_URL"),
  joinwebhook: env("JOIN_WEBHOOK_URL"),
  webid: env("SECURITY_WEBHOOK_ID", "WEBHOOK_ID"),
  webtoken: env("SECURITY_WEBHOOK_TOKEN", "WEBHOOK_TOKEN"),
  voiceWebhookId: env("VOICE_WEBHOOK_ID"),
  voiceWebhookToken: env("VOICE_WEBHOOK_TOKEN"),
  giveawayWebhookUrl: env("GIVEAWAY_WEBHOOK_URL"),
  voice: env("DEFAULT_VOICE_CHANNEL_ID", "VOICE_CHANNEL_ID"),
  nodes: [
    {
      host: env("LAVALINK_HOST") || "localhost",
      port: envNumber(2333, "LAVALINK_PORT"),
      password: env("LAVALINK_PASSWORD") || "youshallnotpass",
      identifier: env("LAVALINK_IDENTIFIER") || "Rabbit",
      retryAmount: envNumber(1000, "LAVALINK_RETRY_AMOUNT"),
      retrydelay: envNumber(10000, "LAVALINK_RETRY_DELAY"),
      resumeStatus: envBoolean(true, "LAVALINK_RESUME_STATUS"),
      resumeTimeout: envNumber(1000, "LAVALINK_RESUME_TIMEOUT"),
      secure: envBoolean(false, "LAVALINK_SECURE"),
    },
  ],
};
