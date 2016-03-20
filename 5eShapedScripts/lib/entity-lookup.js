var _ = require('underscore');

module.exports = {
    monsters: {},
    spells: {},
    addMonsters: function (monsterArray, overwrite) {
        "use strict";
        _.each(monsterArray, function (monster) {
            if (!this.monsters[monster.name] || overwrite) {
                this.monsters[monster.name] = monster;
            }
        });
    },
    addSpells: function (spellArray, overwrite) {
        "use strict";
        _.each(spellArray, function (spell) {
            if (!this.spells[spell.name] || overwrite) {
                this.spells[spell.name] = spell;
            }
        });
    }
};
