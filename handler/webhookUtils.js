const { WebhookClient } = require("discord.js");

function createWebhookClient(options) {
  const hasUrl = typeof options?.url === "string" && options.url.length > 0;
  const hasIdToken = options?.id && options?.token;

  if (!hasUrl && !hasIdToken) {
    return null;
  }

  try {
    return new WebhookClient(options);
  } catch (error) {
    console.warn(`Webhook disabled: ${error.message}`);
    return null;
  }
}

async function sendWebhookMessage(webhookClient, payload) {
  if (!webhookClient) return;

  try {
    await webhookClient.send(payload);
  } catch {
    // Webhook logging is best-effort and should never break moderation flows.
  }
}

module.exports = {
  createWebhookClient,
  sendWebhookMessage,
};
