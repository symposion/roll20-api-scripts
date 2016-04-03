'use strict';
var _ = require('underscore');
var utils = require('./utils');

var entities = {
    monster: {},
    spell: {}
};

var noWhiteSpaceEntities = {
    monster: {},
    spell: {}
};

var entityProcessors = {
    monster: [
        spellHydrator
    ],
    spell: [
        monsterSpellUpdater
    ]
};

module.exports = {

    addEntities: function (logger, type, entityArray, overwrite) {
        if (!entities[type]) {
            throw 'Unrecognised entity type ' + type;
        }
        var addedCount = 0;
        _.each(entityArray, function (entity) {
            var key = entity.name.toLowerCase();
            if (!entities[type][key] || overwrite) {
                var processed = _.reduce(entityProcessors[type], utils.executor, entity);
                entities[type][key] = processed;
                noWhiteSpaceEntities[type][key.replace(/\s+/g, '')] = processed;
                addedCount++;
            }
        });
        logger.info('Added $$$ entities of type $$$ to the lookup', addedCount, type);
        logger.info(this);
    },
    findEntity: function (type, name, tryWithoutWhitespace) {
        var key = name.toLowerCase();
        if (!entities[type]) {
            throw 'Unrecognised entity type ' + type;
        }
        var found = entities[type][key];
        if (!found && tryWithoutWhitespace) {
            found = noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
        }
        return found && utils.deepClone(found);
    },
    getAll: function (type) {
        return utils.deepClone(_.values(entities[type]));
    },
    
    /**
     * Gets all of the keys for the specified entity type
     * @param {string} type - The entity type to retrieve keys for (either 'monster' or 'spell')
     * @param {boolean} sort - True if the returned array should be sorted alphabetically; false otherwise
     * @return {Array} An array containing all keys for the specified entity type
     */
    getKeys: function (type, sort) {
        var keys = _.keys(entities[type]);
        if (sort) {
            keys.sort();
        }
        return keys;
    },

    logWrap: 'entityLookup',
    toJSON: function () {
        return {monsterCount: _.size(entities.monster), spellCount: _.size(entities.spell)};
    }
};

function spellHydrator(monster) {
    if (monster.spells) {
        monster.spells = _.map(monster.spells.split(', '), function (spellName) {
            return module.exports.findEntity('spell', spellName) || spellName;
        });
    }
    return monster;
}

function monsterSpellUpdater(spell) {
    _.chain(entities.monster)
      .pluck('spells')
      .compact()
      .each(function (spellArray) {
          var spellIndex = _.findIndex(spellArray, function (monsterSpell) {
              if (typeof monsterSpell === 'string') {
                  return monsterSpell.toLowerCase() === spell.name.toLowerCase();
              }
              else {
                  return monsterSpell !== spell && monsterSpell.name.toLowerCase() === spell.name.toLowerCase();
              }
          });
          if (spellIndex !== -1) {
              spellArray[spellIndex] = spell;
          }
      });
    return spell;
}
