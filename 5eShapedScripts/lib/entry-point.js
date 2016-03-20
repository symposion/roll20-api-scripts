/* globals FifthSpells, FifthMonsters */
var roll20       = require('./roll20.js');
var parseModule = require('./parser');
var mmFormat     = require('../resources/mmFormatSpec.json');
var myState      = roll20.getState('ShapedScripts');
var logger       = require('./logger')(myState.config);
var entityLookup = require('./entity-lookup');
var shaped = require('./shaped-script')(logger, myState, roll20, parseModule.getParser(mmFormat, logger), entityLookup);


logger.wrapModule(entityLookup);
logger.wrapModule(roll20);

roll20.on('ready', function () {
    'use strict';
    if (typeof FifthMonsters !== 'undefined') {
        entityLookup.addEntities(logger, 'monster', FifthMonsters);
    }
    if (typeof FifthSpells !== 'undefined') {
        entityLookup.addEntities(logger, 'spell', FifthSpells);
    }
    shaped.checkInstall();
    shaped.registerEventHandlers();
});
