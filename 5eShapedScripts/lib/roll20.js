/* globals state, createObj, findObjs, getObj, getAttrByName, sendChat, on, log */
//noinspection JSUnusedGlobalSymbols
module.exports = {

    getState: function (module) {
        'use strict';
        if (!state[module]) {
            state[module] = {};
        }
        return state[module];
    },

    createObj: function (type, attributes) {
        'use strict';
        return createObj(type, attributes);
    },

    findObjs: function (attributes) {
        'use strict';
        return findObjs(attributes);
    },

    getObj: function (type, id) {
        'use strict';
        return getObj(type, id);
    },

    getAttrByName: function (character, attrName) {
        'use strict';
        return getAttrByName(character, attrName);
    },

    sendChat: function (sendAs, message, callback, options) {
        'use strict';
        return sendChat(sendAs, message, callback, options);
    },

    on: function (event, callback) {
        'use strict';
        return on(event, callback);
    },

    log: function (msg) {
        'use strict';
        return log(msg);
    },

    logWrap: 'roll20'
};
