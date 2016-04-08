'use strict';
var roll20 = require('./roll20.js');
var parseModule = require('./parser');
var mmFormat = require('../resources/mmFormatSpec.json');
var myState = roll20.getState('ShapedScripts');
var logger = require('./logger')(myState.config);
var EntityLookup = require('./entity-lookup');
var JSONValidator = require('./json-validator');
var el = new EntityLookup();
var Reporter = require('./reporter');
var reporter = new Reporter(roll20, 'Shaped Scripts');
var ShapedScripts = require('./shaped-script');
var shaped = new ShapedScripts(logger, myState, roll20, parseModule.getParser(mmFormat, logger), el, reporter);
var _ = require('underscore');

//logger.wrapModule(el);
logger.wrapModule(roll20);

var jsonValidator = new JSONValidator(require('../resources/mmFormatSpec.json'));
el.configureEntity('monsters', [EntityLookup.jsonValidatorAsEntityProcessor(jsonValidator), el.getSpellHydrator()], EntityLookup.jsonValidatorAsVersionChecker(jsonValidator));
el.configureEntity('spells', [el.getMonsterSpellUpdater()], EntityLookup.getVersionChecker('0.2'));

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
            var result = el.addEntities(entities);
            var summary = _.mapObject(result, function (resultObject, type) {
                if (type === 'errors') {
                    return resultObject.length;
                }
                else {
                    return _.mapObject(resultObject, function (operationResultArray) {
                        return operationResultArray.length;
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

                reporter.reportError('JSON import error:<ul>' + message + '</ul>');
            }
        }
        catch (e) {
            reporter.reportError('JSON parse error, please see log for more information');
            logger.error(e.toString());
            logger.error(e.stack);
        }
    }
};
