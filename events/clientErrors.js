const client = require("../index.js");
const config = require("../config");
const { createWebhookClient } = require("../handler/webhookUtils");

const webhookUrl = config.webhook;
const webhookClient = createWebhookClient({ url: webhookUrl });

client.on("error", (error) => {
  console.log(error);
});

process.on("uncaughtException", (error) => {
  console.log(error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.log(reason);
});

// async function console.log(error) {
//   const errorMessage = error instanceof Error ? error.stack || error.toString() : JSON.stringify(error);
//   await sendErrorMessage(errorMessage);
// }

// async function sendErrorMessage(errorMessage) {
//   try {
//     await webhookClient.send({ content: `\`\`\`js\n${errorMessage}\n\`\`\`` });
//   } catch (error) {
//     console.error('Failed to send error message:', error);
//   }
// }
