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

    getAttrObjectByName: function (character, attrName) {
        'use strict';
        var attr = this.findObjs({type: 'attribute', characterid: character, name: attrName});
        return attr && attr.length > 0 ? attr[0] : null;
    },

    getOrCreateAttr: function (characterId, attrName) {
        'use strict';
        var attrSpec = {type: 'attribute', characterid: characterId, name: attrName};
        var attribute = this.findObjs(attrSpec);
        switch (attribute.length) {
            case 0:
                return this.createObj('attribute', attrSpec);
            case 1:
                return attribute[0];
            default:
                throw new Error('Asked for a single attribute [' + attrName + '] for character [' + characterId + '] but more than one found');
        }
    },

    setAttrByName: function (characterId, attrName, value) {
        'use strict';
        this.getOrCreateAttr(characterId, attrName).set('current', value);
    },

    processAttrValue: function (characterId, attrName, cb) {
        'use strict';
        var attribute = this.getOrCreateAttr(characterId, attrName);
        attribute.set('current', cb(attribute.get('current')));
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
