var _ = require('underscore');

var entities = {
    monster: {},
    spell: {}
};

module.exports = {

    addEntities: function (logger, type, entityArray, overwrite) {
        'use strict';
        if (!entities[type]) {
            throw 'Unrecognised entity type ' + type;
        }
        var addedCount = 0;
        _.each(entityArray, function (entity) {
            if (!entities[type][entity.name.toLowerCase()] || overwrite) {
                entities[type][entity.name.toLowerCase()] = entity;
                addedCount++;
            }
        });
        logger.info('Added $$$ entities of type $$$ to the lookup', addedCount, type);
        logger.info(this);
    },
    findEntity: function (type, name) {
        'use strict';
        if (!entities[type]) {
            throw 'Unrecognised entity type ' + type;
        }
        return entities[type][name.toLowerCase()];
    },
    logWrap: 'entityLookup',
    toJSON: function () {
        'use strict';
        return {monsterCount: _.size(entities.monster), spellCount: _.size(entities.spell)};
    }
};
