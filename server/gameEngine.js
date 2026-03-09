const rules = require('../shared/rules');
const { createPlayer, applyDamage, heal, grantFlorims } = require('./playerSystem');
const { spawnBoss, recordBossDamage, getTopBossDamager, giveRandomWeapon } = require('./bossSystem');

class GameEngine {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.started = false;
    this.round = 1;
    this.turnIndex = 0;
    this.turnState = this.newTurnState();
    this.currentBoss = null;
    this.log = [];
    this.winnerId = null;
  }

  newTurnState() {
    return {
      canAttack: this.round > 1,
      characterSummons: 0,
      magicActivations: 0,
      attacked: false
    };
  }

  addPlayer({ socketId, name }) {
    if (this.started) return { error: 'Partida já iniciada.' };
    if (this.players.length >= rules.MAX_PLAYERS) return { error: 'Sala lotada (máximo 4).' };

    const existing = this.players.find((p) => p.id === socketId);
    if (existing) return { player: existing };

    const player = createPlayer({ socketId, name });
    this.players.push(player);
    this.logEvent(`${name} entrou na sala.`);
    return { player };
  }

  removePlayer(socketId) {
    const idx = this.players.findIndex((p) => p.id === socketId);
    if (idx === -1) return;

    const [removed] = this.players.splice(idx, 1);
    this.logEvent(`${removed.name} saiu da partida.`);

    if (!this.players.length) return;

    if (idx < this.turnIndex) this.turnIndex -= 1;
    if (this.turnIndex >= this.players.length) this.turnIndex = 0;

    this.evaluateEndGame();
  }

  startGame() {
    if (this.started) return { error: 'Partida já iniciada.' };
    if (this.players.length < rules.MIN_PLAYERS) return { error: 'Mínimo de 2 jogadores.' };

    this.started = true;
    this.round = 1;
    this.turnIndex = 0;
    this.turnState = this.newTurnState();
    this.drawForCurrentPlayer();
    this.logEvent('Partida iniciada!');
    return { ok: true };
  }

  getCurrentPlayer() {
    return this.players[this.turnIndex];
  }

  drawForCurrentPlayer() {
    const player = this.getCurrentPlayer();
    if (!player || player.eliminated) return;

    for (let i = 0; i < rules.CARDS_PER_TURN_DRAW; i += 1) {
      if (!player.deck.length) {
        player.eliminated = true;
        this.logEvent(`${player.name} foi eliminado por ficar sem deck.`);
        break;
      }
      player.hand.push(player.deck.pop());
    }
  }

  playCard({ playerId, cardIndex, targetPlayerId }) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return { error: 'Não é seu turno.' };

    const card = player.hand[cardIndex];
    if (!card) return { error: 'Carta inválida.' };

    if (card.type === 'character') {
      if (this.turnState.characterSummons >= rules.CHARACTER_SUMMONS_PER_TURN) {
        return { error: 'Você só pode invocar 1 personagem por rodada.' };
      }
      if (player.field.characters.length >= rules.MAX_CHARACTERS_FIELD) {
        return { error: 'Campo de personagens cheio.' };
      }
      player.field.characters.push(card);
      this.turnState.characterSummons += 1;
      this.logEvent(`${player.name} invocou ${card.name}.`);
    }

    if (card.type === 'magic') {
      if (this.turnState.magicActivations >= rules.MAGIC_ACTIVATIONS_PER_TURN) {
        return { error: 'Você só pode ativar 1 magia por rodada.' };
      }
      if (player.field.magics.length >= rules.MAX_MAGIC_FIELD) {
        return { error: 'Campo de magias cheio.' };
      }

      this.turnState.magicActivations += 1;
      player.field.magics.push(card);

      if (card.effect === 'heal') {
        heal(player, card.value);
      } else {
        const target = this.players.find((p) => p.id === targetPlayerId && !p.eliminated);
        if (!target) return { error: 'Alvo inválido para magia.' };
        if (card.effect === 'damage') applyDamage(target, card.value);
        if (card.effect === 'drain') {
          applyDamage(target, card.value);
          heal(player, Math.floor(card.value / 2));
        }
        if (card.effect === 'shield') {
          heal(player, Math.floor(card.value / 2));
        }
      }

      this.logEvent(`${player.name} ativou magia ${card.name}.`);
    }

    player.hand.splice(cardIndex, 1);
    this.handleEliminations(player.id);
    return { ok: true };
  }

  attack({ playerId, targetPlayerId, attackValue }) {
    const attacker = this.getCurrentPlayer();
    if (!attacker || attacker.id !== playerId) return { error: 'Não é seu turno.' };
    if (!this.turnState.canAttack) return { error: 'Ataques são bloqueados na primeira rodada.' };
    if (this.turnState.attacked) return { error: 'Você já atacou nesta rodada.' };

    const base = Number(attackValue) || 0;
    const weaponBonus = attacker.weapons.reduce((acc, item) => acc + (item.attackBonus || 0), 0);
    const totalDamage = Math.max(0, base + weaponBonus);
    this.turnState.attacked = true;

    if (this.currentBoss && targetPlayerId === 'boss') {
      this.currentBoss.hp = Math.max(0, this.currentBoss.hp - totalDamage);
      recordBossDamage(this.currentBoss, attacker.id, totalDamage);
      attacker.stats.totalBossDamage += totalDamage;
      this.logEvent(`${attacker.name} causou ${totalDamage} ao Boss ${this.currentBoss.name}.`);
      if (this.currentBoss.hp === 0) {
        this.resolveBossDefeat();
      }
      return { ok: true };
    }

    const target = this.players.find((p) => p.id === targetPlayerId && !p.eliminated);
    if (!target) return { error: 'Jogador alvo inválido.' };

    applyDamage(target, totalDamage);
    this.logEvent(`${attacker.name} atacou ${target.name} e causou ${totalDamage}.`);
    this.handleEliminations(attacker.id);
    return { ok: true };
  }

  bossAttack({ playerId, attackId }) {
    const acting = this.getCurrentPlayer();
    if (!acting || acting.id !== playerId) return { error: 'Não é seu turno.' };
    if (!this.currentBoss) return { error: 'Não há boss ativo.' };

    const attack = this.currentBoss.attacks.find((a) => a.id === attackId);
    if (!attack) return { error: 'Ataque de boss inválido.' };

    applyDamage(acting, attack.damage);
    this.logEvent(`Boss ${this.currentBoss.name} usou ${attack.name} em ${acting.name} (${attack.damage} de dano).`);
    this.handleEliminations();
    return { ok: true };
  }

  resolveBossDefeat() {
    const topDamager = getTopBossDamager(this.currentBoss, this.players);
    this.players.filter((p) => !p.eliminated).forEach((p) => {
      grantFlorims(p, rules.REWARDS.BOSS_DEFEAT_ALL);
    });

    let rewardCard = null;
    if (topDamager) {
      grantFlorims(topDamager, rules.REWARDS.TOP_BOSS_DAMAGE);
      rewardCard = giveRandomWeapon(topDamager);
      this.logEvent(`${topDamager.name} foi o maior dano no Boss e ganhou recompensa.`);
    }

    this.logEvent(`Boss ${this.currentBoss.name} foi derrotado.`);
    this.currentBoss = null;

    return { topDamager: topDamager ? topDamager.id : null, rewardCard };
  }

  handleEliminations(lastAttackerId = null) {
    this.players.forEach((p) => {
      if (!p.eliminated && p.hp <= 0) p.eliminated = true;
    });

    const eliminated = this.players.filter((p) => p.eliminated);
    if (eliminated.length && lastAttackerId) {
      this.players
        .filter((p) => !p.eliminated)
        .forEach((p) => grantFlorims(p, rules.REWARDS.ELIMINATION_ALL_EXCEPT_DEFEATED));
    }

    this.evaluateEndGame();
  }

  nextTurn() {
    if (!this.started || this.winnerId) return { error: 'Partida não ativa.' };

    let loops = 0;
    do {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
      loops += 1;
      if (loops > this.players.length + 1) break;
    } while (this.players[this.turnIndex]?.eliminated);

    if (this.turnIndex === 0) {
      this.round += 1;
      if (this.round % rules.BOSS_SPAWN_EVERY_ROUNDS === 0 && !this.currentBoss) {
        this.currentBoss = spawnBoss(this.round);
        this.logEvent(`Um Boss apareceu: ${this.currentBoss.name}!`);
      }
    }

    this.turnState = this.newTurnState();
    this.drawForCurrentPlayer();
    this.handleEliminations();

    return { ok: true };
  }

  evaluateEndGame() {
    const alive = this.players.filter((p) => !p.eliminated);
    if (alive.length === 1 && this.started) {
      this.winnerId = alive[0].id;
      grantFlorims(alive[0], rules.REWARDS.WIN_MATCH);
      this.players.filter((p) => p.id !== this.winnerId).forEach((p) => grantFlorims(p, rules.REWARDS.LOSE_MATCH));
      this.logEvent(`${alive[0].name} venceu a partida!`);
    }
  }

  logEvent(message) {
    this.log.unshift(`[R${this.round}] ${message}`);
    this.log = this.log.slice(0, 25);
  }

  serializeForPlayer(playerId) {
    return {
      roomId: this.roomId,
      started: this.started,
      round: this.round,
      turnPlayerId: this.getCurrentPlayer()?.id || null,
      turnState: this.turnState,
      currentBoss: this.currentBoss,
      winnerId: this.winnerId,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        hp: p.hp,
        florims: p.florims,
        xp: p.xp,
        level: p.level,
        handCount: p.id === playerId ? p.hand.length : undefined,
        hand: p.id === playerId ? p.hand : undefined,
        deckCount: p.deck.length,
        characters: p.field.characters,
        magics: p.field.magics,
        weapons: p.weapons,
        eliminated: p.eliminated
      })),
      log: this.log
    };
  }
}

module.exports = GameEngine;
