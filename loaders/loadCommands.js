const { readdirSync } = require("fs");
const { REST, Routes } = require("discord.js");

module.exports = async (client) => {
  let count = 0;
  const files = readdirSync(`./commands`).filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const command = require(`../commands/${file}`);
    client.commands.set(command.data.name, command);
    count++;
  }

  console.log(`[Commands] => ${count} commands loaded`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    console.log("Déploiement des commandes en cours...");

    await rest.put(
        Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID),
        {
          body: client.commands.map((command) => command.data.toJSON()),
        }
    );

    console.log("Commandes déployées avec succès !");
  } catch (error) {
    console.error("Erreur lors du déploiement des commandes :", error);
  }
};
