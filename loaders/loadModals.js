const { readdirSync } = require("fs");

module.exports = (client) => {
  client.modals = new Map();

  const modalFiles = readdirSync(`./modals`).filter((file) => file.endsWith(".js"));

  for (const file of modalFiles) {
    const modal = require(`../modals/${file}`);
    client.modals.set(modal.customId, modal);
  }

  console.log(`[Modals] => ${modalFiles.length} modals loaded`);
};
