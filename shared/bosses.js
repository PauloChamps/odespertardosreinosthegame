const BOSS_LIBRARY = [
  {
    id: 'boss_golem',
    name: 'Golem Ancestral',
    maxHp: 2000,
    attacks: [
      { id: 'smash', name: 'Esmagamento Sísmico', damage: 180 },
      { id: 'quake', name: 'Abalo de Pedra', damage: 220 },
      { id: 'roar', name: 'Rugido Petrificante', damage: 160 },
      { id: 'fall', name: 'Queda de Colosso', damage: 260 }
    ]
  },
  {
    id: 'boss_hidra',
    name: 'Hidra Rubra',
    maxHp: 2300,
    attacks: [
      { id: 'bite', name: 'Mordida Múltipla', damage: 190 },
      { id: 'venom', name: 'Névoa Venenosa', damage: 240 },
      { id: 'tail', name: 'Chicote da Cauda', damage: 170 },
      { id: 'inferno', name: 'Sopro Infernal', damage: 280 }
    ]
  }
];

module.exports = {
  BOSS_LIBRARY
};
