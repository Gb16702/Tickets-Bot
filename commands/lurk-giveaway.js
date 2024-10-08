const { ModalBuilder, TextInputBuilder, SlashCommandBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("lurk-giveaway").setDescription("Crée une nouvelle session de Giveaway pour le rôle lurk"),

  async execute(interaction) {
    const { member } = interaction;
    const allowedChannelId = process.env.LURK_CHANNEL_ID;
    const modRole = interaction.guild.roles.cache.get(process.env.MOD_ROLE_ID);

    if (interaction.channel.id !== allowedChannelId) {
      return interaction.reply({
        content: "Tu ne te trouves pas dans le salon permettant de lancer cette commande.",
        ephemeral: true,
      });
    }

    if (member.roles.highest.comparePositionTo(modRole) < 0) {
      return interaction.reply({
        content: "Tu n'as pas la permission de faire ça.",
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder().setCustomId("lurk-giveaway").setTitle("Créer un giveaway");

    const titleInput = new TextInputBuilder()
      .setCustomId("title")
      .setLabel("Titre")
      .setPlaceholder("Le titre du giveaway")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(30)
      .setStyle(TextInputStyle.Short);

    const descriptionInput = new TextInputBuilder()
      .setCustomId("description")
      .setLabel("Description")
      .setPlaceholder("La description du giveaway")
      .setRequired(false)
      .setMaxLength(200)
      .setStyle(TextInputStyle.Paragraph);

    const prizeInput = new TextInputBuilder()
      .setCustomId("prize")
      .setLabel("Prix")
      .setPlaceholder("Le prix du giveaway")
      .setRequired(false)
      .setMaxLength(200)
      .setStyle(TextInputStyle.Paragraph);

    const numberOfWinnersInput = new TextInputBuilder()
      .setCustomId("numberOfWinners")
      .setLabel("Nombre de gagnants")
      .setRequired(true)
      .setValue("1")
      .setMinLength(1)
      .setMaxLength(2)
      .setStyle(TextInputStyle.Short);

    const firstRow = new ActionRowBuilder().addComponents(titleInput);
    const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
    const thirdRow = new ActionRowBuilder().addComponents(prizeInput);
    const fourthRow = new ActionRowBuilder().addComponents(numberOfWinnersInput);

    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

    await interaction.showModal(modal);
  },
};
