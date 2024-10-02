let drawSessions = {};

module.exports = {
  getSession(giveawayId) {
    return drawSessions[giveawayId] || null;
  },
  createSession(giveawayId, numberOfWinners) {
    drawSessions[giveawayId] = {
      remaining: numberOfWinners,
      winners: [],
    };
  },
  decrementSession(giveawayId) {
    if (drawSessions[giveawayId]) {
      drawSessions[giveawayId].remaining--;
    }
  },
  addWinner(giveawayId, winnerId) {
    if (drawSessions[giveawayId]) {
      drawSessions[giveawayId].winners.push(winnerId);
    }
  },
  deleteSession(giveawayId) {
    delete drawSessions[giveawayId];
  },
};
