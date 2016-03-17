var shaped = require('./shaped-script');
var roll20 = require('./roll20.js');

roll20.on('ready', function () {
    'use strict';
    shaped.checkInstall();
    shaped.registerEventHandlers();
});
