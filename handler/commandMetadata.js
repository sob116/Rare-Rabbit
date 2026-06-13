const { PermissionsBitField } = require("discord.js");

const permissionEntries = Object.entries(PermissionsBitField.Flags);

const normalizedPermissionLookup = new Map(
  permissionEntries.map(([name]) => [
    name.replace(/[^a-z]/gi, "").toLowerCase(),
    name,
  ]),
);

const permissionNameByValue = new Map(
  permissionEntries.map(([name, value]) => [value.toString(), name]),
);

// Support legacy discord.js permission labels that still appear in command files.
normalizedPermissionLookup.set(
  "manageemojis",
  "ManageGuildExpressions",
);
normalizedPermissionLookup.set(
  "manageemojisandstickers",
  "ManageGuildExpressions",
);

function normalizePermissions(permissions = []) {
  const entries = Array.isArray(permissions) ? permissions : [permissions];

  return entries.map((permission) => {
    if (typeof permission === "bigint" || typeof permission === "number") {
      return permissionNameByValue.get(permission.toString()) ?? permission;
    }

    if (typeof permission !== "string") {
      return permission;
    }

    const lookupKey = permission.replace(/[^a-z]/gi, "").toLowerCase();
    return normalizedPermissionLookup.get(lookupKey) ?? permission;
  });
}

function getCommandPermissions(command = {}) {
  return {
    userPerms: normalizePermissions(command.UserPerms ?? command.userPerms ?? []),
    botPerms: normalizePermissions(command.BotPerms ?? command.botPerms ?? []),
  };
}

module.exports = {
  getCommandPermissions,
  normalizePermissions,
};
