var roll20 = require('./roll20.js');
var getParser = require('./parser');
var mmFormat = require('../resources/mmFormatSpec.json');
var myState = roll20.getState('ShapedScripts');
var logger = require('./logger')(myState.config);
var shaped = require('./shaped-script')(logger, myState, roll20, getParser(mmFormat, logger));


roll20.on('ready', function () {
    'use strict';
    shaped.checkInstall();
    shaped.registerEventHandlers();
});
