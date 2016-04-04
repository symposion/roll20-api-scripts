'use strict';
var roll20 = require('./roll20.js');
var parseModule = require('./parser');
var mmFormat = require('../resources/mmFormatSpec.json');
var myState = roll20.getState('ShapedScripts');
var logger = require('./logger')(myState.config);
var entityLookup = require('./entity-lookup');
var shaped = require('./shaped-script')(logger, myState, roll20, parseModule.getParser(mmFormat, logger), entityLookup);
var _ = require('underscore');

logger.wrapModule(entityLookup);
logger.wrapModule(roll20);

var jsonValidator = require('./json-validator')(require('../resources/mmFormatSpec.json'));

entityLookup.configureEntity('monsters', [entityLookup.wrapJsonValidator(jsonValidator), entityLookup.spellHydrator.bind(entityLookup)]);
entityLookup.configureEntity('spells', [entityLookup.monsterSpellUpdater.bind(entityLookup)]);

roll20.on('ready', function () {
    shaped.checkInstall();
    shaped.registerEventHandlers();
});

module.exports = {
    addEntities: function (entities) {
        try {
            if (typeof entities === 'string') {
                entities = JSON.parse(entities);
            }
            var result = entityLookup.addEntities(entities);
            var summary = _.mapObject(result, function (propVal, propName) {
                if (propName === 'errors') {
                    return propVal.length;
                }
                else {
                    return _.mapObject(propVal, function (array) {
                        return array.length;
                    });
                }
            });
            logger.info('Summary of adding entities to the lookup: $$$', summary);
            logger.info('Details: $$$', result);
            if (!_.isEmpty(result.errors)) {
                var message = _.chain(result.errors)
                  .groupBy('entity')
                  .mapObject(function (entityErrors) {
                      return _.chain(entityErrors)
                        .pluck('errors')
                        .flatten()
                        .value();
                  })
                  .map(function (errors, entityName) {
                      return '<li>' + entityName + ':<ul><li>' + errors.join('</li><li>') + '</li></ul></li>';
                  })
                  .value();

                roll20.sendChat('ShapedScripts', '/w gm <div><h3>Errors occurred importing information from JSON files:</h3> <ul>' + message + '</ul></div>');
            }
        }
        catch (e) {
            roll20.sendChat('Shaped Scripts', '/w gm Error adding spells or monsters: ' + e);
            logger.error(e.toString());
            logger.error(e.stack);
        }
    }
};
