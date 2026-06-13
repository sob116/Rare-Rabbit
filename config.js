const fs = require("fs");
const path = require("path");

const defaults = require("./config.json");

function loadLocalConfig() {
  const localPath = path.join(__dirname, "config.local.json");
  if (!fs.existsSync(localPath)) return {};

  try {
    return JSON.parse(fs.readFileSync(localPath, "utf8"));
  } catch (error) {
    console.warn(`Failed to read config.local.json: ${error.message}`);
    return {};
  }
}

function readConfigValue(config, key, envName) {
  return process.env[envName] || config[key] || "";
}

const local = loadLocalConfig();
const merged = {
  ...defaults,
  ...local,
};

module.exports = {
  ...merged,
  token: readConfigValue(merged, "token", "DISCORD_TOKEN"),
  mongo: readConfigValue(merged, "mongo", "MONGO_URI"),
  clientId: readConfigValue(merged, "clientId", "DISCORD_CLIENT_ID"),
  guildId: readConfigValue(merged, "guildId", "DISCORD_GUILD_ID"),
  application_id: readConfigValue(merged, "application_id", "DISCORD_APPLICATION_ID"),
  webhook: readConfigValue(merged, "webhook", "ERROR_WEBHOOK_URL"),
  joinwebhook: readConfigValue(merged, "joinwebhook", "GUILD_LOG_WEBHOOK_URL"),
  webid: readConfigValue(merged, "webid", "ANTINUKE_WEBHOOK_ID"),
  webtoken: readConfigValue(merged, "webtoken", "ANTINUKE_WEBHOOK_TOKEN"),
  voice: readConfigValue(merged, "voice", "VOICE_LOG_CHANNEL_ID"),
};
