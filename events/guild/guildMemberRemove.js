const { Events } = require("discord.js");
const updateMemberCount = require("../../utils/updateMemberCount");

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(client, member) {
    await updateMemberCount(client);
    console.log(`[Guild Member Remove] => ${member.user.username} a quitté le serveur.`);
  },
};
