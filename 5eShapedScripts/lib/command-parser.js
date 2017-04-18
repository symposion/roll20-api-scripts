var _ = require('underscore');
var roll20 = require('./roll20');
var utils = require('./utils');


var getParser = function (optionString, validator) {
    'use strict';
    return function (arg, errors, options) {
        var argParts = arg.split(/\s+/);
        if (argParts[0].toLowerCase() === optionString.toLowerCase()) {
            if (argParts.length <= 2) {
                //Allow for bare switches
                var value = argParts.length === 2 ? argParts[1] : true;
                var result = validator(value);
                if (result.valid) {
                    options[argParts[0]] = result.converted;
                }
                else {
                    errors.push('Invalid value [' + value + '] for option [' + argParts[0] + ']');
                }
            }
            return true;
        }
        return false;
    };
};

var getObjectParser = function (specObject) {
    'use strict';
    return function (arg, errors, options) {
        var argParts = arg.split(/\s+/);
        var newObject = utils.createObjectFromPath(argParts[0], argParts.slice(1).join(' '));

        var comparison = {spec: specObject, actual: newObject};
        while (comparison.spec) {
            var key = _.keys(comparison.actual)[0];
            var spec = comparison.spec[key];
            if (!spec) {
                return false;
            }
            if (_.isFunction(comparison.spec[key])) {
                var result = comparison.spec[key](comparison.actual[key]);
                if (result.valid) {
                    comparison.actual[key] = result.converted;
                    utils.deepExtend(options, newObject);
                }
                else {
                    errors.push('Invalid value [' + comparison.actual[key] + '] for option [' + argParts[0] + ']');
                }
                return true;
            }
            else if (_.isArray(comparison.actual[key])) {
                var newVal = [];
                newVal[comparison.actual[key].length - 1] = comparison.spec[key][0];
                comparison.spec = newVal;
                comparison.actual = comparison.actual[key];
            }
            else {
                comparison.spec = comparison.spec[key];
                comparison.actual = comparison.actual[key];
            }
        }
    };
};

/**
 * @constructor
 */
function Command(root, handler) {
    'use strict';
    this.root = root;
    this.handler = handler;
    this.parsers = [];
}


Command.prototype.option = function (optionString, validator) {
    'use strict';
    if (_.isFunction(validator)) {
        this.parsers.push(getParser(optionString, validator));
    }
    else if (_.isObject(validator)) {
        var dummy = {};
        dummy[optionString] = validator;
        this.parsers.push(getObjectParser(dummy));
    }
    else {
        throw new Error('Bad validator [' + validator + '] specified for option ' + optionString);
    }

    return this;
};

Command.prototype.options = function (optsSpec) {
    'use strict';
    var self = this;
    _.each(optsSpec, function (validator, key) {
        self.option(key, validator);
    });
    return this;
};

Command.prototype.optionLookup = function (groupName, lookupFunction) {
    'use strict';
    this.parsers.push(function (arg, errors, options) {
        options[groupName] = options[groupName] || [];
        var name = arg.toLowerCase();
        var resolved = lookupFunction(name);
        if (resolved) {
            options[groupName].push(resolved);
            return true;
        }
        return false;
    });
    return this;
};

Command.prototype.handle = function (args, selection) {
    'use strict';
    var self = this;
    var options = _.reduce(args, function (options, arg) {
        var parser = _.find(self.parsers, function (parser) {
            return parser(arg, options.errors, options);
        });
        if (!parser) {
            options.errors.push('Unrecognised or poorly formed option ' + arg);
        }

        return options;
    }, {errors: []});
    if (options.errors.length > 0) {
        throw options.errors.join('\n');
    }
    delete options.errors;
    options.selected = this.selectionSpec && processSelection(selection || [], this.selectionSpec);
    this.handler(options);
};

Command.prototype.withSelection = function (selectionSpec) {
    'use strict';
    this.selectionSpec = selectionSpec;
    return this;
};


Command.prototype.addCommand = function (cmdString, handler) {
    'use strict';
    return this.root.addCommand(cmdString, handler);
};

Command.prototype.end = function () {
    'use strict';
    return this.root;
};


function processSelection(selection, constraints) {
    'use strict';
    return _.reduce(constraints, function (result, constraintDetails, type) {

        var objects = _.chain(selection)
          .where({_type: type === 'character' ? 'graphic' : type})
          .map(function (selected) {
              return roll20.getObj(selected._type, selected._id);
          })
          .map(function (object) {
              if (type === 'character' && object) {
                  var represents = object.get('represents');
                  if (represents) {
                      return roll20.getObj('character', represents);
                  }
              }
              return object;
          })
          .compact()
          .value();
        if (_.size(objects) < constraintDetails.min || _.size(objects) > constraintDetails.max) {
            throw 'Wrong number of objects of type [' + type + '] selected, should be between ' + constraintDetails.min + ' and ' + constraintDetails.max;
        }
        switch (_.size(objects)) {
            case 0:
                break;
            case 1:
                if (constraintDetails.max === 1) {
                    result[type] = objects[0];
                }
                else {
                    result[type] = objects;
                }
                break;
            default:
                result[type] = objects;
        }
        return result;
    }, {});
}

module.exports = function (rootCommand) {
    'use strict';

    var commands = {};
    return {
        addCommand: function (cmdString, handler) {
            var command = new Command(this, handler);
            commands[cmdString] = command;
            return command;
        },

        processCommand: function (msg) {
            var prefix = '!' + rootCommand + '-';
            if (msg.type === 'api' && msg.content.indexOf(prefix) === 0) {
                var cmdString = msg.content.slice(prefix.length);
                var parts = cmdString.split(/\s+--/);
                var cmdName = parts.shift();
                var cmd = commands[cmdName];
                if (!cmd) {
                    throw 'Unrecognised command ' + prefix + cmdName;
                }
                cmd.handle(parts, msg.selected);
            }
        }

    };


};
