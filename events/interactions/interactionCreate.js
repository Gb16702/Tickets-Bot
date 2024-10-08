const { Events, InteractionType, EmbedBuilder, userMention, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const drawSessions = require("../../utils/drawSessions");
const { giveaways } = require("../../utils/giveawayData");

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
        await interaction.deferReply();

        const modRole = interaction.guild.roles.cache.get(process.env.MOD_ROLE_ID);

        if (interaction.member.roles.highest.comparePositionTo(modRole) < 0) {
          return interaction.editReply({
            content: "Tu n'as pas la permission de faire ça",
            ephemeral: true,
          });
        }

        const giveawayId = interaction.message.id;
        const drawSession = drawSessions.getSession(giveawayId);

        const excludedUserId = process.env.ME;

        if (!drawSession) {
          return interaction.editReply({
            content: "Aucune session de tirage n'est active",
            ephemeral: true,
          });
        }

        if (drawSession.remaining <= 0) {
          return interaction.editReply({
            content: "Le giveaway est terminé. Tous les gagnants ont été sélectionnés",
            ephemeral: true,
          });
        }

        const lurkRole = interaction.guild.roles.cache.get(process.env.LURK_ROLE_ID);
        let remainingParticipants = lurkRole.members.filter((member) => {
          return member.roles.cache.has(process.env.LURK_ROLE_ID) && !drawSession.winners.includes(member.id) && member.id !== excludedUserId;
        });

        if (remainingParticipants.size === 0) {
          return interaction.followUp({
            content: "Il n'y a plus de participants à tirer au sort",
            ephemeral: true,
          });
        }

        await interaction.editReply({
          content: `> Un membre parmi les **${remainingParticipants.size}** participants élligibles${
            drawSession.winners.length > 0 ? " restants" : ""
          } va être tiré au sort...`,
        });

        setTimeout(async () => {
          const winner = remainingParticipants.random();
          drawSessions.addWinner(giveawayId, winner.id);
          drawSessions.decrementSession(giveawayId);

          let ordinalNumber;
          drawSession.remaining === 0 ? (ordinalNumber = "dernier") : (ordinalNumber = ordinalSuffix(drawSession.winners.length));

          await interaction.editReply({
            content: `>>> # Un membre a été **tiré** au sort :\n\n
**\nID** de l'utilisateur: ||${userMention(winner.id)}||\n
**Nom** de l'utilisateur : ||${winner.displayName}||\n
**Tag** de l'utilisateur : ||${winner.user.tag}||\n
Il s'agit du **${ordinalNumber}** gagnant. ${
              drawSession.remaining > 0 ? `Il reste **${drawSession.remaining}** membre${drawSession.remaining > 1 ? "s" : ""} à tirer au sort` : ""
            }`,
          });

          if (drawSession.remaining <= 0) {
            const embedEdit = EmbedBuilder.from(interaction.message.embeds[0]).setColor("#51FC17");
            const winners = drawSession.winners.map((winnerId, i) => {
              const member = interaction.guild.members.cache.get(winnerId);
              return {
                index: i + 1,
                id: member ? member.id : winnerId,
                username: member.displayName ?? "Inconnu",
                tag: member.user.tag ?? "Inconnu",
              };
            });

            const embed = new EmbedBuilder()
              .setTitle(`Le Giveaway est terminé !`)
              .setDescription(
                `Il y a **${drawSession.winners.length}** gagnant${
                  drawSession.winners.length > 1 ? "s" : ""
                }. Voici un récapitulatif de ce Giveaway :`
              )
              .addFields(
                {
                  name: "\u200B",
                  value: ` **ID**\n\n ${winners.map((winner) => `${userMention(winner.id)}`).join("\n\n")}`,
                  inline: true,
                },
                {
                  name: "\u200B",
                  value: `\u00A0**Nom**\n\n ${winners.map((winner) => `${winner.username}`).join("\n\n")}`,
                  inline: true,
                },
                {
                  name: "\u200B",
                  value: `\u00A0**Tag**\n\n ${winners.map((winner) => `${winner.tag}`).join("\n\n")}`,
                  inline: true,
                }
              )
              .addFields({
                name: "\u200B",
                value: `\n -# ${drawSession.prize ? `Le prix à la clé : **${drawSession.prize}**` : "Le prix de ce giveaway n'a **pas** été défini"}`,
              })
              .setColor("#51FC17");

            await Promise.all([interaction.message.edit({ components: [], embeds: [embedEdit] }), interaction.followUp({ embeds: [embed] })]);

            drawSessions.deleteSession(giveawayId);
          }
        }, 1750);
      }

      if (interaction.customId === "show-participants") {
        await interaction.deferReply({ ephemeral: true });

        const lurkRole = interaction.guild.roles.cache.get(process.env.LURK_ROLE_ID);
        const members = await interaction.guild.members.fetch({ force: true });
        const participants = members.filter((member) => member.roles.cache.has(lurkRole.id));

        if (participants.size === 0) {
          return interaction.followUp({
            content: "Aucun membre trouvé.",
            ephemeral: true,
          });
        }

        const participantList = Array.from(participants.values()).map((member, i) => `**${i + 1}.** ${member.displayName}`);
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

      if (interaction.customId === "giveaway-join") {
        const { id: userId } = interaction.user;
        const giveawayId = `giveaway-${interaction.message.id}`;
        let participants = giveaways.get(giveawayId);

        if (!participants) {
          participants = new Set();
          giveaways.set(giveawayId, participants);
        }

        if (participants.has(userId)) {
          const leaveButton = new ButtonBuilder().setCustomId("giveaway-leave").setLabel("Se désinscrire").setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(leaveButton);

          return interaction.reply({
            content: "Tu participes déjà au Giveaway\n\n",
            components: [row],
            ephemeral: true,
          });
        }

        participants.add(userId);

        const embed = interaction.message.embeds[0];
        const participantsCount = participants.size;

        const updatedEmbed = EmbedBuilder.from(embed).setColor("#5764F2").setTitle(embed.title).setDescription(`${embed.description}`);

        const fields = updatedEmbed.data.fields;
        const participantFieldIndex = fields.findIndex((f) => f.value.includes("Participants"));

        if (participantFieldIndex !== -1) {
          fields[participantFieldIndex].value = `- Nombre de **Participants** : Il y a actuellement **${participantsCount}** participant${
            participantsCount > 1 ? "s" : ""
          }`;
        }

        await interaction.update({
          embeds: [updatedEmbed],
        });

        await interaction.followUp({
          content: ">>> Tu as bien été inscrit au Giveaway",
          ephemeral: true,
        });
      }
    }
  },
};
