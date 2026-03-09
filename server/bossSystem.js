const { BOSS_LIBRARY } = require('../shared/bosses');
const { shuffle, getWeaponRewards } = require('../shared/cards');
const rules = require('../shared/rules');

function spawnBoss(round) {
  const source = BOSS_LIBRARY[(Math.floor(round / rules.BOSS_SPAWN_EVERY_ROUNDS) - 1) % BOSS_LIBRARY.length];
  return {
    id: `${source.id}_${Date.now()}`,
    name: source.name,
    hp: source.maxHp,
    maxHp: source.maxHp,
    attacks: source.attacks,
    damageByPlayer: {}
  };
}

function recordBossDamage(boss, playerId, damage) {
  boss.damageByPlayer[playerId] = (boss.damageByPlayer[playerId] || 0) + damage;
}

function getTopBossDamager(boss, players) {
  let winner = null;
  let bestDamage = -1;
  Object.entries(boss.damageByPlayer).forEach(([playerId, damage]) => {
    if (damage > bestDamage) {
      bestDamage = damage;
      winner = players.find((p) => p.id === playerId);
    }
  });
  return winner;
}

function giveRandomWeapon(player) {
  const rewards = shuffle(getWeaponRewards());
  if (rewards.length) {
    player.weapons.push(rewards[0]);
    return rewards[0];
  }
  return null;
}

module.exports = {
  spawnBoss,
  recordBossDamage,
  getTopBossDamager,
  giveRandomWeapon
};
