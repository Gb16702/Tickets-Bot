const { Events, InteractionType, EmbedBuilder } = require("discord.js");
const drawSessions = require("../../utils/drawSessions");

const ordinalSuffix = (n) => {
  const ordinals = [
    "premier",
    "deuxième",
    "troisième",
    "quatrième",
    "cinquième",
    "sixième",
    "septième",
    "huitième",
    "neuvième",
    "dixième",
    "onzième",
    "douzième",
    "treizième",
    "quatorzième",
    "quinzième",
    "seizième",
    "dix-septième",
    "dix-huitième",
    "dix-neuvième",
    "vingtième",
  ];

  return ordinals[n - 1] || `${n}ème`;
};

module.exports = {
  name: Events.InteractionCreate,

  async execute(client, interaction) {
    if (interaction.type === InteractionType.ApplicationCommand) {
      const command = client.commands.get(interaction.commandName);
      command.execute(interaction);
    }

    if (interaction.type === InteractionType.ModalSubmit) {
      const modal = client.modals.get(interaction.customId);
      if (modal) {
        modal.execute(interaction);
      } else {
        console.error(`Modale non reconnue : ${interaction.customId}`);
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "draw-winner") {
        const giveawayId = interaction.message.id;
        const drawSession = drawSessions.getSession(giveawayId);

        const excludedUserId = process.env.ME;

        if (!drawSession) {
          return interaction.reply({
            content: "Aucune session de tirage n'est active",
            ephemeral: true,
          });
        }

        if (drawSession.remaining <= 0) {
          return interaction.reply({
            content: "Le giveaway est terminé. Tous les gagnants ont été sélectionnés.",
            ephemeral: true,
          });
        }

        const loadingMessage = await interaction.reply({
          content: `Un membre va être tiré au sort...`,
        });

        setTimeout(async () => {
          const lurkRole = interaction.guild.roles.cache.get(process.env.LURK_ROLE_ID);
          const members = await interaction.guild.members.fetch();
          let participants = members.filter((member) => member.roles.cache.has(lurkRole.id) && !drawSession.winners.includes(member.id));

          participants = participants.filter((member) => member.id !== excludedUserId);

          if (participants.size === 0) {
            return interaction.followUp({
              content: "Il n'y a plus de participants à tirer au sort.",
              ephemeral: true,
            });
          }

          const winner = participants.random();
          drawSessions.addWinner(giveawayId, winner.id);
          drawSessions.decrementSession(giveawayId);

          let ordinalNumber;
          if (drawSession.remaining === 0) {
            ordinalNumber = "dernier";
          } else {
            ordinalNumber = ordinalSuffix(drawSession.winners.length);
          }

          const congratulationsEmbed = new EmbedBuilder()
            .setTitle("Nouveau Gagnant !")
            .setDescription(`||<@${winner.id}>|| a été tiré au sort ! Il s'agit du **${ordinalNumber}** gagnant.`)
            .setColor("#51FC17");

          await interaction.followUp({
            embeds: [congratulationsEmbed],
            ephemeral: false,
          });

          await loadingMessage.delete();

          if (drawSession.remaining <= 0) {
            console.log(drawSession.remaining);

            await interaction.message.edit({
              components: [],
            });

            const embed = new EmbedBuilder()
              .setTitle(`Le Giveaway est terminé !`)
              .setDescription(
                `Il y a **${drawSession.winners.length}** gagnant${
                  drawSession.winners.length > 1 ? "s" : ""
                }. Voici un récapitulatif de ce Giveaway :`
              )
              .addFields({
                name: "\u200B",
                value: `${drawSession.winners.map((winnerId, i) => `**${i + 1}.**  <@${winnerId}>`).join("\n\n")}`,
              })
              .setColor("#51FC17");

            await interaction.followUp({
              embeds: [embed],
            });

            drawSessions.deleteSession(giveawayId);
          }
        }, 2000);
      }

      if (interaction.customId === "show-participants") {
        await interaction.deferReply({ ephemeral: true });

        const lurkRole = interaction.guild.roles.cache.get(process.env.LURK_ROLE_ID);
        const members = await interaction.guild.members.fetch();
        const participants = members.filter((member) => member.roles.cache.has(lurkRole.id));

        if (participants.size === 0) {
          return interaction.followUp({
            content: "Aucun membre trouvé.",
            ephemeral: true,
          });
        }

        const participantList = Array.from(participants.values()).map((member, i) => `**${i + 1}.** <@${member.id}>`);
        const fields = [];

        for (let i = 0; i < participantList.length; i += 3) {
          fields.push({
            name: "\u200B",
            value: participantList.slice(i, i + 3).join("\u00A0\u00A0\u00A0"),
            inline: false,
          });
        }

        const participantsEmbed = new EmbedBuilder()
          .setTitle("Liste des participants")
          .setDescription(`La liste des participants éligibles au Giveaway <@&${process.env.LURK_ROLE_ID}>`)
          .addFields(fields)
          .setColor("#51FC17");

        await interaction.followUp({
          embeds: [participantsEmbed],
          ephemeral: true,
        });
      }
    }
  },
};
