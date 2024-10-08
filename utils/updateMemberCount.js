const { ActivityType } = require("discord.js");

module.exports = async (client) => {
  try {
    await client.guilds.cache.first().members.fetch();
    const memberCount = client.guilds.cache.first().memberCount;
    client.channels.cache.get(process.env.MEMBER_COUNT_CHANNEL_ID).setName(`Membres : ${memberCount}`);
    client.user.setActivity(`${memberCount} membres`, { type: ActivityType.Watching });
  } catch (error) {
    console.error(`[Erreur] lors de la mise à jour du nombre de membres :`, error);
  }
};
