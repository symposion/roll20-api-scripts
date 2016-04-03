'use strict';
var _ = require('underscore');

var levelStrings = ['Cantrips ', '1st level ', '2nd level ', '3rd level '];
_.each(_.range(4, 10), function (level) {
    levelStrings[level] = level + 'th level ';
});

var spellcastingHandler = {
    splitRegex: /(Cantrips|(?:1st|2nd|3rd|[4-9]th)\s*level)\.?\s*\(([^\)]+)\)\s*:/i,

    makeLevelDetailsObject: function (match) {
        var levelMatch = match[1].match(/\d/);
        return {
            level: levelMatch ? parseInt(levelMatch[0]) : 0,
            slots: match[2]
        };
    },

    setLevelDetailsString: function (levelDetails) {
        levelDetails.newText = levelStrings[levelDetails.level] + '(' + levelDetails.slots + '): ';
        levelDetails.newText += levelDetails.spells.join(', ');
    }

};

var innateHandler = {
    splitRegex: /(At\s?will|\d\s?\/\s?day)(?:\s?each)?\s?:/i,

    makeLevelDetailsObject: function (match) {
        var usesMatch = match[1].match(/\d/);
        return {
            uses: usesMatch ? parseInt(usesMatch[0]) : 0,
            slots: match[2]
        };
    },

    setLevelDetailsString: function (levelDetails) {
        levelDetails.newText = levelDetails.uses === 0 ? 'At will' : levelDetails.uses + '/day';
        if (levelDetails.spells.length > 1) {
            levelDetails.newText += ' each';
        }
        levelDetails.newText += ': ';
        levelDetails.newText += levelDetails.spells.join(', ');
    }

};


function processSpellcastingTrait(monster, traitName, traitHandler, entityLookup) {
    var trait = _.findWhere(monster.traits, {name: traitName});
    if (trait) {
        var spellList = trait.text.substring(trait.text.indexOf(':') + 1).replace('\n', ' ');
        var castingDetails = trait.text.substring(0, trait.text.indexOf(':'));
        var levelDetails = [];
        var match;
        while ((match = traitHandler.splitRegex.exec(spellList)) !== null) {
            if (_.last(levelDetails)) {
                _.last(levelDetails).spells = spellList.slice(0, match.index);
            }
            levelDetails.push(traitHandler.makeLevelDetailsObject(match));
            spellList = spellList.slice(match.index + match[0].length);
        }
        if (_.last(levelDetails)) {
            _.last(levelDetails).spells = spellList;
        }

        var hasCastBeforeCombat = false;
        var spellDetailsByLevel = _.chain(levelDetails)
          .each(function (levelDetails) {
              levelDetails.spells = _.chain(levelDetails.spells.replace(',*', '*,').split(','))
                .map(_.partial(_.result, _, 'trim'))
                .map(function (spellName) {
                    var match = spellName.match(/([^\(\*]+)(?:\(([^\)]+)\))?(\*)?/);
                    hasCastBeforeCombat = hasCastBeforeCombat || !!match[3];
                    return {
                        name: match[1].trim(),
                        restriction: match[2],
                        castBeforeCombat: !!match[3],
                        toString: function () {
                            return this.name +
                              (this.restriction ? ' (' + this.restriction + ')' : '') +
                              (this.castBeforeCombat ? '*' : '');
                        },
                        toSpellArrayItem: function () {
                            return this.name;
                        }
                    };
                })
                .each(function (spell) {
                    spell.object = entityLookup.findEntity('spell', spell.name, true);
                    if (spell.object) {
                        spell.name = spell.object.name;
                        spell.toSpellArrayItem = function () {
                            return this.object;
                        };
                    }
                })
                .value();
          })
          .each(traitHandler.setLevelDetailsString)
          .value();


        trait.text = castingDetails + ':\n' + _.pluck(spellDetailsByLevel, 'newText').join('\n');
        if (hasCastBeforeCombat) {
            trait.text += '\n* The ' + monster.name.toLowerCase() + ' casts these spells on itself before combat.';
        }
        var spells = _.chain(spellDetailsByLevel)
          .pluck('spells')
          .flatten()
          .map(_.partial(_.result, _, 'toSpellArrayItem'))
          .union(monster.spells ? monster.spells : [])
          .sortBy('name')
          .sortBy('level')
          .value();

        if (!_.isEmpty(spells)) {
            monster.spells = spells;
        }
    }
    return [];
}


module.exports = function (monster, entityLookup) {
    processSpellcastingTrait(monster, 'Spellcasting', spellcastingHandler, entityLookup);
    processSpellcastingTrait(monster, 'Innate Spellcasting', innateHandler, entityLookup);
    return monster;
};

