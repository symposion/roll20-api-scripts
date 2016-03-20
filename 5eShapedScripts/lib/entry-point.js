/* globals FifthSpells, FifthMonsters */
var roll20 = require('./roll20.js');
var getParser = require('./parser');
var mmFormat = require('../resources/mmFormatSpec.json');
var myState = roll20.getState('ShapedScripts');
var logger = require('./logger')(myState.config);
var entityLookup = require('./entity-lookup');
var shaped = require('./shaped-script')(logger, myState, roll20, getParser(mmFormat, logger), entityLookup);


roll20.on('ready', function () {
    'use strict';
    shaped.checkInstall();
    shaped.registerEventHandlers();

    if (FifthSpells) {
        entityLookup.addSpells(FifthSpells);
    }

    if (FifthMonsters) {
        entityLookup.addMonsters(FifthMonsters);
    }
});
