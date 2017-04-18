/* globals fifthSpells, fifthMonsters */
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

var versionCompare = function (v1, v2) {
    'use strict';

    if (v1 === v2) {
        return 0;
    }
    else if (v1 === undefined || v1 === null) {
        return -1;
    }
    else if (v2 === undefined || v2 === null) {
        return 1;
    }

    var v1parts = v1.split('.');
    var v2parts = v2.split('.');

    var isValidPart = function (x) {
        return /^\d+$/.test(x);
    };

    if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
        return NaN;
    }

    v1parts = _.map(v1parts, Number);
    v2parts = _.map(v2parts, Number);

    for (var i = 0; i < v1parts.length; ++i) {
        if (v2parts.length === i) {
            return 1;
        }

        if (v1parts[i] > v2parts[i]) {
            return 1;
        } else if (v1parts[i] < v2parts[i]) {
            return -1;
        }
    }

    if (v1parts.length !== v2parts.length) {
        return -1;
    }

    return 0;
};

roll20.on('ready', function () {
    'use strict';
    if (typeof fifthMonsters !== 'undefined') {
        if (versionCompare(fifthMonsters.version, '0.1') >= 0) {
            //noinspection JSUnresolvedVariable
            entityLookup.addEntities(logger, 'monster', fifthMonsters.monsters);
        }
        else {
            roll20.sendChat('Shaped Scripts', '/w gm Incompatible version of monster data file used, please upgrade to the latest version');
        }
    }
    if (typeof fifthSpells !== 'undefined') {
        if (versionCompare(fifthSpells.version, '0.1') >= 0) {
            entityLookup.addEntities(logger, 'spell', fifthSpells.spells);
        }
        else {
            roll20.sendChat('Shaped Scripts', '/w gm Incompatible version of spell data file used, please upgrade to the latest version');
        }
    }
    shaped.checkInstall();
    shaped.registerEventHandlers();
});
