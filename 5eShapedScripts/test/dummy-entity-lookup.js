var entityLookup = require('../lib/entity-lookup');
var _ = require('underscore');

var spells = [
    {name: 'Mage Hand', level: 0},
    {name: 'Prestidigitation', level: 0},
    {name: 'Ray of Frost', level: 0},
    {name: 'Detect Magic', level: 1},
    {name: 'Magic Missile', level: 1},
    {name: 'Shield', level: 1},
    {name: 'Thunderwave', level: 1},
    {name: 'Detect Thoughts', level: 2},
    {name: 'Invisibility', level: 2},
    {name: 'Melf\'s Acid Arrow', level: 2},
    {name: 'Mirror Image', level: 2},
    {name: 'Animate Dead', level: 3},
    {name: 'Counterspell', level: 3},
    {name: 'Dispel Magic', level: 3},
    {name: 'Fireball', level: 3},
    {name: 'Blight', level: 4},
    {name: 'Dimension Door', level: 4},
    {name: 'Cloudkill', level: 5},
    {name: 'Scrying', level: 5},
    {name: 'Disintegrate', level: 6},
    {name: 'Globe of Invulnerability', level: 6},
    {name: 'Finger of Death', level: 7},
    {name: 'Planeshift', level: 7},
    {name: 'Dominate Monster', level: 8},
    {name: 'Power Word Stun', level: 8},
    {name: 'Power Word Kill', level: 9},
    {name: 'Dancing Lights', level: 0},
    {name: 'Darkness', level: 1},
    {name: 'Faerie Fire', level: 1},
    {name: 'Levitate', level: 1},
    {name: 'Command', level: 1},
    {name: 'Compelled Duel', level: 1},
    {name: 'Searing Smite', level: 1},
    {name: 'Hold Person', level: 2},
    {name: 'Magic Weapon', level: 2},
    {name: 'Dispel Magic', level: 3},
    {name: 'Elemental Weapon', level: 3},
    {name: 'Banishment', level: 4},
    {name: 'Staggering Smite', level: 4},
    {name: 'Destructive Wave', level: 5},
    {name: 'Fight', level: 0},
    {name: 'Sacred Flame', level: 0},
    {name: 'Thaumaturgy', level: 0},
    {name: 'Cure Wounds', level: 1},
    {name: 'Guiding Bolt', level: 1},
    {name: 'Sanctuary', level: 1},
    {name: 'Lesser Restoration', level: 2},
    {name: 'Spiritual Weapon', level: 2},
    {name: 'Spirit Guardians', level: 3}
];

entityLookup.addEntities({info: _.noop}, 'spell', spells);

module.exports = {
    spells: spells,
    entityLookup: entityLookup
};
