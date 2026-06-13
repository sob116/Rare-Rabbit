const { WebhookClient } = require("discord.js");

function createWebhookClient(options) {
  if (options?.url) {
    return new WebhookClient({ url: options.url });
  }

  if (options?.id && options?.token) {
    return new WebhookClient({ id: options.id, token: options.token });
  }

  return null;
}

function formatWebhookMessage(message) {
  if (message instanceof Error) {
    return message.stack || message.message;
  }

  if (typeof message === "string") {
    return message;
  }

  return JSON.stringify(message);
}

async function sendWebhookMessage(webhookClient, message) {
  if (!webhookClient) return;

  const content = formatWebhookMessage(message).slice(0, 1900);
  await webhookClient.send({ content }).catch(() => {});
}

module.exports = {
  createWebhookClient,
  sendWebhookMessage,
};
