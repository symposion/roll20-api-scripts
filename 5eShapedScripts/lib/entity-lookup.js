'use strict';
var _ = require('underscore');
var utils = require('./utils');

var currentVersion = '0.2';

var entities = {};

var noWhiteSpaceEntities = {};


var entityProcessors = {};

module.exports = {

    configureEntity: function (entityName, processors) {
        entities[entityName] = {};
        noWhiteSpaceEntities[entityName] = {};
        entityProcessors[entityName] = processors;
    },

    addEntities: function (entitiesObject) {
        var results = {
            errors: []
        };
        //TODO: Do semver properly
        if (utils.versionCompare(currentVersion, entitiesObject.version) !== 0) {
            results.errors.push({
                entity: 'general',
                errors: ['Invalid JSON version [' + entitiesObject.version + ']. Script supports version: [' + currentVersion + ']']
            });
            return results;
        }

        _.chain(entitiesObject)
          .omit('version', 'patch')
          .each(function (entityArray, type) {
              results[type] = {
                  withErrors: [],
                  skipped: [],
                  deleted: [],
                  patched: [],
                  added: []
              };

              if (!entities[type]) {
                  results.errors.push({entity: 'general', errors: ['Unrecognised entity type ' + type]});
                  return;
              }


              _.each(entityArray, function (entity) {
                  var key = entity.name.toLowerCase();
                  var operation = !!entities[type][key] ? (entitiesObject.patch ? 'patched' : 'skipped') : 'added';

                  //noinspection FallThroughInSwitchStatementJS
                  if (operation === 'patched') {
                      entity = patchEntity(entities[type][key], entity);
                      if (!entity) {
                          operation = 'deleted';
                          delete entities[type][key];
                          delete noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
                      }

                  }

                  if (_.contains(['patched', 'added'], operation)) {
                      var processed = _.reduce(entityProcessors[type], utils.executor, {entity: entity, errors: []});
                      if (!_.isEmpty(processed.errors)) {
                          processed.entity = processed.entity.name;
                          results.errors.push(processed);
                          operation = 'withErrors';
                      }
                      else {
                          if (processed.entity.name.toLowerCase() !== key) {
                              results[type].deleted.push(key);
                              delete entities[type][key];
                              delete noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
                              key = processed.entity.name.toLowerCase();
                          }
                          entities[type][key] = processed.entity;
                          noWhiteSpaceEntities[type][key.replace(/\s+/g, '')] = processed.entity;
                      }
                  }


                  results[type][operation].push(key);
              });
          });

        return results;
    },
    findEntity: function (type, name, tryWithoutWhitespace) {
        var key = name.toLowerCase();
        if (!entities[type]) {
            throw new Error('Unrecognised entity type ' + type);
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

    spellHydrator: function (monsterInfo) {
        var monster = monsterInfo.entity;
        var self = this;
        if (monster.spells) {
            monster.spells = _.map(monster.spells.split(', '), function (spellName) {
                return self.findEntity('spells', spellName) || spellName;
            });
        }
        return monsterInfo;
    },

    monsterSpellUpdater: function (spellInfo) {
        var spell = spellInfo.entity;
        _.chain(entities.monsters)
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
        return spellInfo;
    },

    wrapJsonValidator: function (jsonValidator) {
        return function (entityInfo) {
            var result = jsonValidator(entityInfo.entity);
            entityInfo.errors = entityInfo.errors.concat(result.errors);
            return entityInfo;
        };
    },

    logWrap: 'entityLookup',
    toJSON: function () {
        return {monsterCount: _.size(entities.monster), spellCount: _.size(entities.spell)};
    }
};

function patchEntity(original, patch) {
    if (patch.remove) {
        return undefined;
    }
    return _.mapObject(original, function (propVal, propName) {
        if (propName === 'name' && patch.newName) {
            return patch.newName;
        }
        return patch[propName] || propVal;

    });
}



