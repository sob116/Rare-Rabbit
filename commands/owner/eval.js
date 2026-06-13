const { EmbedBuilder } = require("discord.js");
const { inspect } = require("util");
const { EvalAccess } = require('../../dev.json');
const config = require('../../config');

const EVAL_ENABLED = process.env.ENABLE_EVAL_COMMAND === "true";

function collectSecretValues(value, secrets = []) {
  if (!value) return secrets;

  if (typeof value === "string") {
    if (value.length >= 8) secrets.push(value);
    return secrets;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSecretValues(item, secrets));
    return secrets;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectSecretValues(item, secrets));
  }

  return secrets;
}

function redactSecrets(output) {
  const envSecrets = Object.entries(process.env)
    .filter(([key, value]) => /(TOKEN|SECRET|PASSWORD|WEBHOOK|MONGO|URI|KEY)/i.test(key) && value?.length >= 8)
    .map(([, value]) => value);
  const secrets = [...collectSecretValues(config), ...envSecrets];

  return secrets.reduce((redacted, secret) => redacted.split(secret).join("[REDACTED]"), String(output));
}

function truncateForEmbed(output) {
  const redacted = redactSecrets(output);
  return redacted.length > 3900 ? `${redacted.slice(0, 3900)}...` : redacted;
}

module.exports = {
  name: "eval",
  voteOnly: false,
  BotPerms: ['EmbedLinks'],
  run: async (client, message, args) => {
    function isBotOwner(user) {
      return EvalAccess.includes(user.id);
    }

    async function evaluateCode(code) {
      try {
        const asyncWrapper = eval(`(async () => { return ${code} })();`);
        const evaled = await asyncWrapper;
        if (typeof evaled !== "string") {
          return inspect(evaled, { depth: 0 });
        }
        return evaled;
      } catch (err) {
        return err;
      }
    }

    async function createEvalEmbed(message, code, output) {
      const embed1 = new EmbedBuilder()
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(`\`\`\`js\n${truncateForEmbed(code)}\n\`\`\``)
        .setColor(client.color);

      const embed2 = new EmbedBuilder()
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(`\`\`\`js\n${truncateForEmbed(output)}\n\`\`\``)
        .setColor(client.color);

      await message.channel.send({ embeds: [embed1, embed2] });
    }

    if (!isBotOwner(message.author)) {
      return message.channel.send("This command is limited to the bot owner only!");
    }

    if (!EVAL_ENABLED) {
      return message.channel.send("Eval is disabled for this deployment.");
    }

    const code = args.join(" ");
    if (!code) {
      return message.channel.send("Please provide code to evaluate.");
    }

    const output = await evaluateCode(code);
    await createEvalEmbed(message, code, output);
  },
};
