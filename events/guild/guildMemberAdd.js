const { Events, EmbedBuilder } = require("discord.js");

const getRandomWelcomeMessage = (member) => {
  const messages = [
    `Bienvenue dans la communauté, <@${member.user.id}>`,
    `Salut <@${member.user.id}> ! Installe-toi bien et profite.`,
    `Bienvenue <@${member.user.id}> ! On est ravis de t'avoir parmi nous !`,
    `Wouhou ! <@${member.user.id}> est arrivé(e) !`,
    `C'est un plaisir de te voir ici, <@${member.user.id}> !`,
    `Contents de te voir, <@${member.user.id}> !`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
};

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(client, member) {
    await updateMemberCount(client);
    console.log(`[Guild Member Add] => ${member.user.username} vient de rejoindre le serveur.`);

    if (member.user.bot) return;
    const welcomeChannel = client.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
    if (!welcomeChannel) {
      return console.error("Le salon spécifié pour les nouveaux membres n'a pas été trouvé.");
    }

    const welcomeEmbed = new EmbedBuilder()
      .setColor("#51FC17")
      .setTitle("Nouveau membre !")
      .setDescription(
        `${getRandomWelcomeMessage(member)}\n\n Pense à lire les **règles du serveur** dans <#${
          process.env.RULES_CHANNEL_ID ?? "1280355481524768771"
        }>\n\n**Une question ?** N'hésite pas à contacter un de nos <@&${process.env.MOD_ROLE_ID}> **ou** <@&${
          process.env.ADMIN_ROLE_ID
        }>. Tu peux également ouvrir un **ticket** dans <#${
          process.env.TICKET_CHANNEL_ID
        }>.\n\nNous organisons souvent des **événements**, reste à l'affut des **annonces** dans <#${
          process.env.ANNOUNCEMENT_CHANNEL_ID
        }>.\n\nEnfin, rends-toi dans le salon <#${process.env.STREAMS_ALERTS_CHANNEL_ID}> pour être informé des **streams** en cours.`
      );

    try {
      await welcomeChannel.send({ embeds: [welcomeEmbed] });
    } catch (error) {
      console.error("Erreur lors de la création de l'embed de bienvenue :", error);
    }
  },
};
