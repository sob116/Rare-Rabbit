const { Collection, EmbedBuilder } = require("discord.js");
const Client = require("./rabbit/RabbitClient.js");
const config = require("./config");
const fs = require("fs");
const path = require("path");
const { QuickDB } = require("quick.db");
const mongoose = require("mongoose");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const TicketHandler = require("./events/tickethandler");
const { Connectors } = require("shoukaku");
const { Kazagumo, Plugins } = require("kazagumo");
const KazagumoFilter = require("kazagumo-filter");
const ytsr = require("@distube/ytsr");
const SEARCH_DEFAULT = "youtube";
const nodes = (config.nodes || [])
  .filter((node) => node.host && node.port && node.password)
  .map((node) => ({
    name: node.identifier || node.host,
    url: `${node.host}:${node.port}`,
    auth: node.password,
    secure: Boolean(node.secure),
  }));
// Initialize the client
const client = new Client();
module.exports = client;

// Function to setup databases
function setupDatabases(client) {
  client.db = new QuickDB({ filePath: "./database/antinuke.sqlite" });
  client.db1 = new QuickDB({ filePath: "./database/autorole.sqlite" });
  client.db2 = new QuickDB({ filePath: "./database/badges.sqlite" });
  client.db3 = new QuickDB({ filePath: "./database/customroles.sqlite" });
  client.db4 = new QuickDB({ filePath: "./database/noprefix.sqlite" });
  client.db5 = new QuickDB({ filePath: "./database/automod.sqlite" });
  client.db7 = new QuickDB({ filePath: "./database/voiceroles.sqlite" });
  client.db8 = new QuickDB({ filePath: "./database/guild.sqlite" });
  client.db9 = new QuickDB({ filePath: "./database/welcome.sqlite" });
  client.db10 = new QuickDB({ filePath: "./database/ignore.sqlite" });
  client.db11 = new QuickDB({ filePath: "./database/extra.sqlite" });
  client.db12 = new QuickDB({ filePath: "./database/premium.sqlite" });
  client.db13 = new QuickDB({ filePath: "./database/users.sqlite" });
  client.db14 = new QuickDB({ filePath: "./database/mediachannel.sqlite" });
  client.db15 = new QuickDB({ filePath: "./database/nightmode.sqlite" });
  client.db24_7 = new QuickDB({ filePath: "./database/24-7.sqlite" }); // Add this line
}

// Function to setup collections
function setupCollections(client) {
  client.commands = new Collection();
  client.aliases = new Collection();
  client.events = new Collection();
  client.slashCommands = new Collection();
  client.categories = fs.readdirSync("./commands");
}

client.ticketHandler = new TicketHandler(client);

client.manager = new Kazagumo(
  {
    defaultSearchEngine: "Youtube",
    plugins: [new Plugins.PlayerMoved(client), new KazagumoFilter()],
    send: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) guild.shard.send(payload);
    },
  },
  new Connectors.DiscordJS(client),
  nodes,
);

// Function to load handlers
function loadHandlers(client) {
  ["command", "slashCommand", "shoukaku"].forEach((handler) => {
    require(`./handler/${handler}`)(client);
  });
}

// Function to load client accessories
function loadClientAccessories(client) {
  ["clientUtils"].forEach((accessories) => {
    require(`./handler/${accessories}`)(client);
  });
}

// Function to setup the client
function setupClient(client) {
  setupDatabases(client);
  setupCollections(client);
  loadHandlers(client);
  loadClientAccessories(client);
}

// Registering Slash Commands
const commands = [];
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command); // Register the command
  commands.push(command.data.toJSON());
}

(async () => {
  if (!config.token || !config.clientId || !config.guildId) {
    console.warn("Skipping guild slash command refresh; Discord token/client/guild config is missing.");
    return;
  }

  try {
    const rest = new REST({ version: "9" }).setToken(config.token);
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands },
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

// Client ready event
client.once('ready', async () => {
  setupClient(client);
  console.log(`Kronix | Made by akshat`);
  console.log(`Kronix | Logged in as ${client.user.tag}`);

  function loadStickies() {
    const filePath = path.join(__dirname, './commands/sticky/stickies.json');
    let stickies = {};

    try {
      const data = fs.readFileSync(filePath, 'utf8');
      stickies = JSON.parse(data);
    } catch (error) {
      console.error('Error reading stickies.json:', error);
    }

    return stickies;
  }

  client.on('messageCreate', (message) => {
    if (message.author.bot) return; // Ignore bot messages

    const stickies = loadStickies();

    const sticky = stickies[message.channel.id];
    if (sticky) {
      const embed = new EmbedBuilder()
        .setColor(sticky.color || '#000000') // Default to black if no color provided
        .setDescription(sticky.message);

      message.channel.send({  embeds: [embed] });
    }
  });
  
  // Reconnect to saved voice channels
  const guilds = client.guilds.cache.map(guild => guild.id);
  for (const guildId of guilds) {
    const channelId = await client.db24_7.get(`24-7_${guildId}`);
    if (channelId) {
      const guild = client.guilds.cache.get(guildId);
      const channel = guild.channels.cache.get(channelId);

      if (channel) {
        try {
          const player = await client.manager.createPlayer({
            guildId: guild.id,
            textId: channel.id, // You may want to store and use a text channel ID for player messages
            voiceId: channel.id,
            volume: 100,
            deaf: true,
          });

          if (!player.playing && !player.paused) player.play();

          console.log(`Reconnected to voice channel ${channel.name} in guild ${guild.name}`);
        } catch (error) {
          console.error(`Failed to reconnect to voice channel ${channel.name} in guild ${guild.name}: ${error.message}`);
        }
      }
    }
  }
});

// Snipe Command
const snipes = new Map();
client.on("messageDelete", (deletedMessage) => {
  snipes.set(deletedMessage.channel.id, deletedMessage);
});

if (config.mongo) {
  mongoose
    .connect(config.mongo, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Kronix | Mongoose connected to MongoDB");
    })
    .catch((error) => {
      console.error("Error: Failed to connect to MongoDB.", error);
    });
} else {
  console.warn("Skipping MongoDB connection; MONGO_URI/config.mongo is missing.");
}

client.on("guildMemberAdd", async (member) => {
  const welcomeSettingsPath = path.join(
    __dirname,
    "slashCommands",
    "welcome",
    "welcomeSettings.json",
  );

  const guildId = member.guild.id;

  fs.readFile(welcomeSettingsPath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading welcome settings file: ${err}`);
      return;
    }

    const welcomeSettings = JSON.parse(data);

    if (welcomeSettings[guildId]) {
      const { channelId, message, imageUrl } = welcomeSettings[guildId];

      const embed = new EmbedBuilder()
        .setTitle("Welcome!")
        .setDescription(
          message
            .replace(/{servername}/g, member.guild.name)
            .replace(/{user_mention}/g, `<@${member.id}>`)
            .replace(/{user_tag}/g, member.user.tag)
            .replace(/{membercount}/g, member.guild.memberCount)
            .replace(/{\n}/g, "\n"),
        )
        .setImage(imageUrl)
        .setFooter({
          text: `Welcome to ${member.guild.name}`,
          iconURL: `${member.guild.iconURL()}`,
        })
        .setColor("#00FF00");

      const channel = member.guild.channels.cache.get(channelId);
      if (channel) {
        channel.send({ content: `Welcome <@${member.id}>`, embeds: [embed] });
      } else {
        console.error(
          `Channel with ID ${channelId} not found in guild ${guildId}`,
        );
      }
    } else {
      console.log(`No welcome settings found for guild ${guildId}`);
    }
  });
});

// Login to Discord
if (!config.token) {
  throw new Error("DISCORD_TOKEN/config.token is required to start the bot.");
}

client.login(config.token);

client.manager.shoukaku.on("ready", (name) =>
  console.log(`Lavalink ${name}: Ready!`),
);
client.manager.shoukaku.on("error", (name, error) =>
  console.error(`Lavalink ${name}: Error Caught,`, error),
);
client.manager.shoukaku.on("close", (name, code, reason) =>
  console.warn(
    `Lavalink ${name}: Closed, Code ${code}, Reason ${reason || "No reason"}`,
  ),
);

client.manager.shoukaku.on("disconnect", (name, players, moved) => {
  if (moved) return;
  players.map((player) => player.connection.disconnect());
  console.warn(`Lavalink ${name}: Disconnected`);
});
