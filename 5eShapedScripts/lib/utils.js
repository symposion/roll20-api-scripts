'use strict';
var _ = require('underscore');

module.exports = {
  deepExtend: function(original, newValues) {
    var self = this;
    if (!original) {
      original = _.isArray(newValues) ? [] : {};
    }
    _.each(newValues, function(value, key) {
      if (_.isArray(original[key])) {
        if (!_.isArray(value)) {
          original[key].push(value);
        }
        else {
          original[key] = _.map(value, function(item, index) {
            if (_.isObject(item)) {
              return self.deepExtend(original[key][index], item);
            }
            else {
              return item !== undefined ? item : original[key][index];
            }
          });
        }
      }
      else if (_.isObject(original[key])) {
        original[key] = self.deepExtend(original[key], value);
      }
      else {
        original[key] = value;
      }

    });
    return original;
  },

  createObjectFromPath: function(pathString, value) {
    var newObject = {};
    _.reduce(pathString.split(/\./), function(object, pathPart, index, pathParts) {
      var match = pathPart.match(/([^.\[]*)(?:\[(\d+)\])?/);
      var newVal = index === pathParts.length - 1 ? value : {};

      if (match[2]) {
        object[match[1]] = [];
        object[match[1]][match[2]] = newVal;
      }
      else {
        object[match[1]] = newVal;
      }
      return newVal;

    }, newObject);
    return newObject;
  },

  getObjectFromPath: function(obj, path) {
    path = path.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    path = path.replace(/^\./, '');           // strip a leading dot
    var a = path.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
      var k = a[i];
      if (k in obj) {
        obj = obj[k];
      } else {
        return;
      }
    }
    return obj;
  },

  deepClone: function(object) {
    return JSON.parse(JSON.stringify(object));
  },

  executor: function() {
    switch (arguments.length) {
      case 0:
        return;
      case 1:
        return arguments[0]();
      default:
        var args = Array.apply(null, arguments).slice(2);
        args.unshift(arguments[0]);
        return arguments[1].apply(null, args);
    }
  },

  /**
   * Gets a string as 'Title Case' capitalizing the first letter of each word (i.e. 'the grapes of wrath' -> 'The Grapes Of Wrath')
   * @param {string} s - The string to be converted
   * @return {string} the supplied string in title case
   */
  toTitleCase: function(s) {
    return s.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  },

  versionCompare: function(v1, v2) {

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

    var isValidPart = function(x) {
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
  }

};
