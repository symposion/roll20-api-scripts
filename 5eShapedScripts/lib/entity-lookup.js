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
            var key = entity.name.toLowerCase();
            if (!entities[type][key] || overwrite) {
                entities[type][key] = entity;
                entities[type][key.replace(/\s+/g, '')] = entity;
                addedCount++;
            }
        });
        logger.info('Added $$$ entities of type $$$ to the lookup', addedCount, type);
        logger.info(this);
    },
    findEntity: function (type, name, tryWithoutWhitespace) {
        'use strict';
        var key = name.toLowerCase();
        if (!entities[type]) {
            throw 'Unrecognised entity type ' + type;
        }
        var found = entities[type][key];
        if (!found && tryWithoutWhitespace) {
            found = entities[type][key.replace(/\s+/g, '')];
        }
        return found && JSON.parse(JSON.stringify(found));
    },
    logWrap: 'entityLookup',
    toJSON: function () {
        'use strict';
        return {monsterCount: _.size(entities.monster), spellCount: _.size(entities.spell)};
    }
};
