/**
 * Catálogo base de cartas.
 * Cada carta pode ser de personagem, magia ou arma/recompensa.
 */
const CARD_LIBRARY = [
  { id: 'char_guardiao', name: 'Guardião de Aço', type: 'character', attack: 300, defense: 200 },
  { id: 'char_maga', name: 'Maga da Aurora', type: 'character', attack: 250, defense: 150 },
  { id: 'char_cavaleiro', name: 'Cavaleiro Esmeralda', type: 'character', attack: 350, defense: 250 },
  { id: 'char_assassina', name: 'Assassina Lunar', type: 'character', attack: 400, defense: 100 },
  { id: 'char_druida', name: 'Druida Ancestral', type: 'character', attack: 200, defense: 300 },
  { id: 'magic_fogo', name: 'Chuva de Fogo', type: 'magic', effect: 'damage', value: 250 },
  { id: 'magic_cura', name: 'Fonte Vital', type: 'magic', effect: 'heal', value: 300 },
  { id: 'magic_escudo', name: 'Barreira Arcana', type: 'magic', effect: 'shield', value: 200 },
  { id: 'magic_dreno', name: 'Dreno Sombrio', type: 'magic', effect: 'drain', value: 200 },
  { id: 'weapon_reino', name: 'Lâmina do Reino', type: 'weapon', attackBonus: 150 },
  { id: 'weapon_dragao', name: 'Arco do Dragão', type: 'weapon', attackBonus: 120 },
  { id: 'weapon_trovao', name: 'Martelo do Trovão', type: 'weapon', attackBonus: 180 }
];

function getCardById(id) {
  return CARD_LIBRARY.find((card) => card.id === id) || null;
}

function cloneCard(card) {
  return JSON.parse(JSON.stringify(card));
}

function createDeck() {
  // Deck simples misturando cópias do catálogo de cartas base.
  const base = CARD_LIBRARY.filter((card) => card.type !== 'weapon');
  const deck = [];
  for (let i = 0; i < 4; i += 1) {
    base.forEach((card) => deck.push(cloneCard(card)));
  }
  return shuffle(deck);
}

function getWeaponRewards() {
  return CARD_LIBRARY.filter((card) => card.type === 'weapon').map(cloneCard);
}

function shuffle(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = {
  CARD_LIBRARY,
  createDeck,
  getCardById,
  getWeaponRewards,
  shuffle
};
