/* globals fifthSpells, fifthMonsters */
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
    if (typeof fifthMonsters !== 'undefined') {
        logger.debug(fifthMonsters.version);
        if (fifthMonsters.version === '0.1.0') {
            //noinspection JSUnresolvedVariable
            entityLookup.addEntities(logger, 'monster', fifthMonsters.monsters);
        }
        else {
            roll20.sendChat('Shaped Scripts', '/w gm Incompatible version of monster data file used, please upgrade to the latest version');
        }
    }
    if (typeof fifthSpells !== 'undefined') {
        if (fifthSpells.version === '0.1.0') {
            entityLookup.addEntities(logger, 'spell', fifthSpells.spells);
        }
        else {
            roll20.sendChat('Shaped Scripts', '/w gm Incompatible version of spell data file used, please upgrade to the latest version');
        }
    }
    shaped.checkInstall();
    shaped.registerEventHandlers();
});
