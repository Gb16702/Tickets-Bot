const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const drawSessions = require("../utils/drawSessions");

module.exports = {
  customId: "lurk-giveaway",

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const title = interaction.fields.getTextInputValue("title");
      const numberOfWinners = interaction.fields.getTextInputValue("numberOfWinners");
      let description = interaction.fields.getTextInputValue("description");

      const lurkRole = interaction.guild.roles.cache.get(process.env.LURK_ROLE_ID);
      if (!lurkRole) {
        return interaction.editReply({
          content: `Le rôle <@&${process.env.LURK_ROLE_ID}> n'a pas été trouvé.`,
          ephemeral: true,
        });
      }

      const members = await interaction.guild.members.fetch();
      const participantsCount = members.filter((member) => member.roles.cache.has(lurkRole.id)).size;
      const participantsNeeded = parseInt(numberOfWinners);

      if (participantsCount < participantsNeeded) {
        return interaction.editReply({
          content: `Tu n'as pas assez de membres pour lancer ce giveaway. Il faut au moins **${participantsNeeded}** membres avec le rôle adéquat.`,
          ephemeral: true,
        });
      }

      description = description && description.trim() !== "" ? description : "Ce giveaway n'a pas de description.";

      drawSessions.createSession(interaction.id, numberOfWinners);

      const probability = Math.ceil((numberOfWinners / participantsCount) * 100);

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .addFields({
          name: "\u200B",
          value: `
          - **Hôte** du Giveaway : <@${interaction.user.id}>\n
- Les **${participantsCount.toString()}** membres possédant le rôle <@&${process.env.LURK_ROLE_ID}> y sont éligibles\n
- **${numberOfWinners}** tirage${numberOfWinners > 1 ? "s" : ""}, soit **${probability}%** de chance d'être tiré au sort`,
          inline: false,
        })
        .setFooter({
          text: `Créé le ${new Date().toLocaleString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}`,
        })
        .setColor("#5764F2");

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("draw-winner").setLabel("Tirer au sort").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("show-participants").setLabel("Afficher les participants").setStyle(ButtonStyle.Secondary)
      );

      const replyMessage = await interaction.editReply({
        embeds: [embed],
        components: [button],
        fetchReply: true,
      });

      drawSessions.createSession(replyMessage.id, numberOfWinners);
    } catch (error) {
      console.error("Erreur lors de l'exécution de la modale :", error);
      await interaction.editReply({
        content: "Une erreur est survenue lors de la création du giveaway. Réessayez plus tard.",
        ephemeral: true,
      });
    }
  },
};
