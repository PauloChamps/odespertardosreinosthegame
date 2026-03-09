const rules = require('../shared/rules');
const { createDeck } = require('../shared/cards');

function createPlayer({ socketId, name }) {
  const deck = createDeck();
  const hand = [];
  for (let i = 0; i < 5; i += 1) {
    if (deck.length) hand.push(deck.pop());
  }

  return {
    id: socketId,
    name,
    hp: rules.START_HP,
    florims: 0,
    xp: 0,
    level: 1,
    deck,
    hand,
    field: {
      characters: [],
      magics: []
    },
    weapons: [],
    eliminated: false,
    stats: {
      totalBossDamage: 0
    }
  };
}

function grantFlorims(player, amount) {
  player.florims += amount;
  player.xp += amount;
  player.level = Math.floor(player.xp / rules.XP_PER_LEVEL) + 1;
}

function applyDamage(player, amount) {
  player.hp = Math.max(0, player.hp - amount);
  if (player.hp === 0) {
    player.eliminated = true;
  }
}

function heal(player, amount) {
  player.hp = Math.min(rules.START_HP, player.hp + amount);
}

module.exports = {
  createPlayer,
  grantFlorims,
  applyDamage,
  heal
};
