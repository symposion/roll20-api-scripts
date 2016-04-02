var _ = require('underscore');

module.exports = {
    deepExtend: function (original, newValues) {
        'use strict';
        var self = this;
        if (!original) {
            original = _.isArray(newValues) ? [] : {};
        }
        _.each(newValues, function (value, key) {
            if (_.isArray(original[key])) {
                if (!_.isArray(value)) {
                    original[key].push(value);
                }
                else {
                    original[key] = _.map(value, function (item, index) {
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

    createObjectFromPath: function (pathString, value) {
        'use strict';
        var newObject = {};
        _.reduce(pathString.split(/\./), function (object, pathPart, index, pathParts) {
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

    deepClone: function (object) {
        'use strict';
        return JSON.parse(JSON.stringify(object));
    }
};
