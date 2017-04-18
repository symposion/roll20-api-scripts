var _ = require('underscore');
var roll20 = require('./roll20');

/**
 *
 * @param config
 * @returns {{debug:function, error:function, info:function, trace:function, warn:function}}
 */
module.exports = function (config) {
    'use strict';

    var logger = {
            OFF: 0,
            ERROR: 1,
            WARN: 2,
            INFO: 3,
            DEBUG: 4,
            TRACE: 5,
            prefixString: ''
        },

        stringify = function (object) {
            if (object === undefined) {
                return object;
            }

            return typeof object === 'string' ? object : JSON.stringify(object, function (key, value) {
                if (key !== 'logWrap' && key !== 'isLogWrapped') {
                    return value;
                }
            });
        },

        shouldLog = function (level) {
            var logLevel = logger.INFO;
            if (config && config.logLevel) {
                logLevel = logger[config.logLevel];
            }

            return level <= logLevel;
        },

        outputLog = function (level, message) {

            if (!shouldLog(level)) {
                return;
            }

            var args = arguments.length > 2 ? _.toArray(arguments).slice(2) : [];
            message = stringify(message);
            if (message) {
                message = message.replace(/\$\$\$/g, function () {
                    return stringify(args.shift());
                });
            }
            //noinspection NodeModulesDependencies
            roll20.log('ShapedScripts ' + Date.now() + ' ' + logger.getLabel(level) + ' : ' +
                (shouldLog(logger.TRACE) ? logger.prefixString : '') +
                message);
        };

    logger.getLabel = function (logLevel) {
        var logPair = _.chain(this).pairs().find(function (pair) {
            return pair[1] === logLevel;
        }).value();
        return logPair ? logPair[0] : 'UNKNOWN';
    };

    _.each(logger, function (level, levelName) {
        logger[levelName.toLowerCase()] = _.partial(outputLog.bind(logger), level);
    });

    logger.wrapModule = function (modToWrap) {
        if (shouldLog(logger.TRACE)) {
            _.chain(modToWrap)
                .functions()
                .each(function (funcName) {
                    var origFunc = modToWrap[funcName];
                    modToWrap[funcName] = logger.wrapFunction(funcName, origFunc, modToWrap.logWrap);
                });
            modToWrap.isLogWrapped = true;
        }
    };

    logger.wrapFunction = function (name, func, moduleName) {
        if (shouldLog(logger.TRACE)) {
            if (name === 'toJSON' || moduleName === 'roll20' && name === 'log') {
                return func;
            }
            return function () {
                logger.trace('$$$.$$$ starting with this value: $$$ and args $$$', moduleName, name, this, arguments);
                logger.prefixString = logger.prefixString + '  ';
                var retVal = func.apply(this, arguments);
                logger.prefixString = logger.prefixString.slice(0, -2);
                logger.trace('$$$.$$$ ending with return value $$$', moduleName, name, retVal);
                if (retVal && retVal.logWrap && !retVal.isLogWrapped) {
                    logger.wrapModule(retVal);
                }
                return retVal;
            };
        }
        return func;
    };
    //noinspection JSValidateTypes
    return logger;
};
