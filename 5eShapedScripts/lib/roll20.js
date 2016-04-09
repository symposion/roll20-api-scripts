/* globals state, createObj, findObjs, filterObjs, getObj, getAttrByName, sendChat, on, log, Campaign, playerIsGM, spawnFx, spawnFxBetweenPoints */
'use strict';
var _ = require('underscore');
//noinspection JSUnusedGlobalSymbols
module.exports = {

    getState: function (module) {
        if (!state[module]) {
            state[module] = {};
        }
        return state[module];
    },

    createObj: function (type, attributes) {
        return createObj(type, attributes);
    },

    findObjs: function (attributes) {
        return findObjs(attributes);
    },
    
    filterObjs: function (callback) {
        return filterObjs(callback);
    },

    getObj: function (type, id) {
        return getObj(type, id);
    },

    getOrCreateObj: function (type, attributes) {
        var newAttributes = _.extend(_.clone(attributes), {type: type});
        var existing = this.findObjs(newAttributes);
        switch (existing.length) {
            case 0:
                return this.createObj(type, newAttributes);
            case 1:
                return existing[0];
            default:
                throw new Error('Asked for a single ' + type + ' but more than 1 was found matching attributes: ' + JSON.stringify(attributes));
        }
    },

    getAttrByName: function (character, attrName) {
        return getAttrByName(character, attrName);
    },

    getAttrObjectByName: function (character, attrName) {
        var attr = this.findObjs({type: 'attribute', characterid: character, name: attrName});
        return attr && attr.length > 0 ? attr[0] : null;
    },

    getOrCreateAttr: function (characterId, attrName) {
        return this.getOrCreateObj('attribute', {characterid: characterId, name: attrName});
    },

    setAttrByName: function (characterId, attrName, value) {
        this.getOrCreateAttr(characterId, attrName).set('current', value);
    },

    processAttrValue: function (characterId, attrName, cb) {
        var attribute = this.getOrCreateAttr(characterId, attrName);
        attribute.set('current', cb(attribute.get('current')));
    },

    getRepeatingSectionAttrs: function (characterId, sectionName) {
        var prefix = 'repeating_' + sectionName;
        return _.filter(this.findObjs({type: 'attribute', characterid: characterId}), function (attr) {
            return attr.get('name').indexOf(prefix) === 0;
        });
    },

    getRepeatingSectionItemIdsByName: function (characterId, sectionName) {
        var re = new RegExp('repeating_' + sectionName + '_([^_]+)_name$');
        return _.reduce(this.getRepeatingSectionAttrs(characterId, sectionName),
          function (lookup, attr) {
              var match = attr.get('name').match(re);
              if (match) {
                  lookup[attr.get('current').toLowerCase()] = match[1];
              }
              return lookup;
          }, {});
    },

    getCurrentPage: function (playerId) {
        var pageId;
        if (this.playerIsGM(playerId)) {
            pageId = this.getObj('player', playerId).get('lastpage');
        }
        else {
            pageId = this.getCampaign().get('playerspecificpages')[playerId] || this.getCampaign().get('playerpageid');
        }
        return pageId ? this.getObj('page', pageId) : null;
    },

    spawnFx: function (pointsArray, fxType, pageId) {
        switch (pointsArray.length) {
            case 1:
                spawnFx(pointsArray[0].x, pointsArray[0].y, fxType, pageId);
                break;
            case 2:
                spawnFxBetweenPoints(pointsArray[0], pointsArray[1], fxType, pageId);
                break;
            default:
                throw new Error('Wrong number of points supplied to spawnFx: $$$', pointsArray);
        }
    },

    playerIsGM: function (playerId) {
        return playerIsGM(playerId);
    },

    getCampaign: function () {
        return Campaign(); //jshint ignore: line
    },

    sendChat: function (sendAs, message, callback, options) {
        return sendChat(sendAs, message, callback, options);
    },

    on: function (event, callback) {
        return on(event, callback);
    },

    log: function (msg) {
        return log(msg);
    },

    logWrap: 'roll20'
};
