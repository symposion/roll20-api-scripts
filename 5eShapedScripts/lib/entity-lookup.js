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

module.exports = {

    addEntities: function (logger, type, entityArray, overwrite) {
        if (!entities[type]) {
            throw 'Unrecognised entity type ' + type;
        }
        var addedCount = 0;
        _.each(entityArray, function (entity) {
            var key = entity.name.toLowerCase();
            if (!entities[type][key] || overwrite) {
                entities[type][key] = entity;
                noWhiteSpaceEntities[type][key.replace(/\s+/g, '')] = entity;
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
    logWrap: 'entityLookup',
    toJSON: function () {
        return {monsterCount: _.size(entities.monster), spellCount: _.size(entities.spell)};
    }
};
