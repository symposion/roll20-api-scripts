'use strict';
var _ = require('underscore');
var utils = require('./utils');


module.exports = EntityLookup;


function EntityLookup() {
  var entities = {},
    noWhiteSpaceEntities = {},
    entityProcessors = {},
    versionCheckers = {},
    self = this;

  this.configureEntity = function (entityName, processors, versionChecker) {
    entities[entityName] = {};
    noWhiteSpaceEntities[entityName] = {};
    entityProcessors[entityName] = processors;
    versionCheckers[entityName] = versionChecker;
  };

  this.addEntities = function (entitiesObject) {
    var results = {
      errors: []
    };


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
          results.errors.push({ entity: 'general', errors: ['Unrecognised entity type ' + type] });
          return;
        }

        if (!versionCheckers[type](entitiesObject.version, results.errors)) {
          return;
        }


        _.each(entityArray, function (entity) {
          var key = entity.name.toLowerCase();
          var operation = !!entities[type][key] ? (entitiesObject.patch ? 'patched' : 'skipped') : 'added';

          if (operation === 'patched') {
            entity = patchEntity(entities[type][key], entity);
            if (!entity) {
              operation = 'deleted';
              delete entities[type][key];
              delete noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
            }

          }

          if (_.contains(['patched', 'added'], operation)) {
            var processed = _.reduce(entityProcessors[type], utils.executor, {
              entity: entity,
              type: type,
              version: entitiesObject.version,
              errors: []
            });
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
  };

  this.findEntity = function (type, name, tryWithoutWhitespace) {
    var key = name.toLowerCase();
    if (!entities[type]) {
      throw new Error('Unrecognised entity type ' + type);
    }
    var found = entities[type][key];
    if (!found && tryWithoutWhitespace) {
      found = noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
    }
    return found && utils.deepClone(found);
  };

  this.getAll = function (type) {
    if (!entities[type]) {
      throw new Error('Unrecognised entity type: ' + type);
    }
    return utils.deepClone(_.values(entities[type]));
  };

  /**
   * Gets all of the keys for the specified entity type
   * @param {string} type - The entity type to retrieve keys for (either 'monster' or 'spell')
   * @param {boolean} sort - True if the returned array should be sorted alphabetically; false otherwise
   * @function
   * @public
   * @name EntityLookup#getKeys
   * @return {Array} An array containing all keys for the specified entity type
   */
  this.getKeys = function (type, sort) {
    if (!entities[type]) {
      throw new Error('Unrecognised entity type: ' + type);
    }
    var keys = _.keys(entities[type]);
    if (sort) {
      keys.sort();
    }
    return keys;
  };


  /**
   * Gets spell hydrator
   * @function
   * @public
   * @name EntityLookup#getSpellHydrator
   * @return {function}
   */
  this.getSpellHydrator = function () {
    return function (monsterInfo) {
      var monster = monsterInfo.entity;
      if (monster.spells) {
        monster.spells = _.map(monster.spells.split(', '), function (spellName) {
          return self.findEntity('spells', spellName) || spellName;
        });
      }
      return monsterInfo;
    };
  };

  this.getMonsterSpellUpdater = function () {
    return function (spellInfo) {
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
    };
  };


  this.toJSON = function () {
    return { monsterCount: _.size(entities.monsters), spellCount: _.size(entities.spells) };
  };

}

EntityLookup.prototype.logWrap = 'entityLookup';
EntityLookup.jsonValidatorAsEntityProcessor = function (jsonValidator) {
  return function (entityInfo) {
    var wrapper = {
      version: entityInfo.version
    };
    wrapper[entityInfo.type] = [entityInfo.entity];
    var errors = jsonValidator.validate(wrapper);
    var flattenedErrors = _.chain(errors).values().flatten().value();
    entityInfo.errors = entityInfo.errors.concat(flattenedErrors);
    return entityInfo;
  };
};
EntityLookup.jsonValidatorAsVersionChecker = function (jsonValidator) {
  return EntityLookup.getVersionChecker(jsonValidator.getVersionNumber());
};
EntityLookup.getVersionChecker = function (requiredVersion) {
  return function (version, errorsArray) {
    var valid = version === requiredVersion;
    if (!valid) {
      errorsArray.push({
        entity: 'general',
        errors: ['Incorrect entity objects version: [' + version + ']. Required is: ' + requiredVersion]
      });
    }
    return valid;
  };
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



