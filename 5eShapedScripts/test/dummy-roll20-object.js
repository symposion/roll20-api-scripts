'use strict';
var _ = require('underscore');

/**
 * @constructor
 */
function Roll20Object(type) {
    this.props = {};
    this.id = _.uniqueId();
    this.type = type;
}

//noinspection JSUnusedGlobalSymbols
Roll20Object.prototype.get = function (propName) {
    return this.props[propName];
};

Roll20Object.prototype.set = function (propName, value) {
    this.props[propName] = value;
};

module.exports = Roll20Object;
