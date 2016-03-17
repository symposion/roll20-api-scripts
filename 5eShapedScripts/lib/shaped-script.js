var _ = require('underscore');
var getParser = require('./parser');
var sanitise = require('./sanitise');
var roll20 = require('./roll20');
var mmFormat = require('../resources/mmFormatSpec.json');
var myState = roll20.getState('ShapedScripts');
var logger = require('./logger')(myState.config);

var version = '0.1',
    schemaVersion = 0.1,
    hpBar = 'bar1',

    booleanValidator = function (value) {
        'use strict';
        var converted = value === 'true' || (value === 'false' ? false : value);
        return {
            valid: typeof value === 'boolean' || value === 'true' || value === 'false',
            converted: converted
        };
    },

    report = function (msg) {
        'use strict';
        //Horrible bug with this at the moment - seems to generate spurious chat
        //messages when noarchive:true is set
        //sendChat('ShapedScripts', '' + msg, null, {noarchive:true});
        roll20.sendChat('ShapedScripts', '/w gm ' + msg);
    },

    parser = getParser(mmFormat, logger);

/**
 * @typedef {Object} ChatMessage
 * @property {string} content
 * @property {string} type
 * @property {SelectedItem[]} selected
 * @property {string} rolltemplate
 */

/**
 *
 * @typedef {Object} SelectedItem
 * @property {string} _id
 * @property (string _type
 */

const shapedModule = (function () {
    'use strict';
    return {
        /**
         *
         * @param {ChatMessage} msg
         */
        handleInput: function (msg) {
            try {
                logger.debug(msg);
                if (msg.type !== 'api') {
                    this.checkForAmmoUpdate(msg);
                    return;
                }
                var args = msg.content.split(/\s+--/);
                var command = args.shift();
                switch (command) {
                    case '!5es-config':
                        this.configure(this.makeOpts(args, this.configOptionsSpec));
                        break;
                    case '!5es-import':
                        this.importStatblock(this.processSelection(msg, {
                            graphic: {
                                min: 1,
                                max: Infinity
                            }
                        }).graphic);
                }
            }
            catch (e) {
                if (typeof e === 'string') {
                    report('An error occurred: ' + e);
                    logger.error('Error: $$$', e);
                }
                else {
                    logger.error('Error: ' + e.toString());
                    logger.error(e.stack);
                    report('An error occurred. Please see the log for more details.');
                }
            }
            finally {
                logger.prefixString = '';
            }
        },

        configOptionsSpec: {
            logLevel: function (value) {
                var converted = value.toUpperCase();
                return {valid: _.has(logger, converted), converted: converted};
            },
            updateAmmo: booleanValidator
        },

        makeOpts: function (args, spec) {
            return _.reduce(args, function (options, arg) {
                var parts = arg.split(/\s+/);
                if (parts.length <= 2) {
                    //Allow for bare switches
                    var value = parts.length === 2 ? parts[1] : true;
                    var validator = spec[parts[0]];
                    if (validator) {
                        var result = validator(value);
                        if (result.valid) {
                            options[parts[0]] = result.converted;
                            return options;
                        }
                    }
                }
                logger.error('Unrecognised or poorly formed option [$$$]', arg);
                report('ERROR: unrecognised or poorly formed option --' + arg + '');
                return options;
            }, {});
        },

        /**
         *
         * @param {ChatMessage} msg
         * @param constraints
         * @returns {*}
         */
        processSelection: function (msg, constraints) {
            var selection = msg.selected ? msg.selected : [];
            return _.reduce(constraints, function (result, constraintDetails, type) {
                var objects = _.chain(selection)
                    .where({_type: type})
                    .map(function (selected) {
                        return roll20.getObj(selected._type, selected._id);
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
        },

        /////////////////////////////////////////
        // Command handlers
        /////////////////////////////////////////
        configure: function (options) {
            _.each(options, function (value, key) {
                logger.info('Setting configuration option $$$ to $$$', key, value);
                myState.config[key] = value;
            });

            report('Configuration is now: ' + JSON.stringify(myState.config));
        },

        importStatblock: function (graphics) {
            logger.info('Importing statblocks for tokens $$$', graphics);
            _.each(graphics, function (token) {
                var text = token.get('gmnotes');
                if (text) {
                    try {
                        var jsonObject = parser.parse(sanitise(text));

                        var represents = token.get('represents');
                        var character;
                        if (!represents) {
                            character = roll20.createObj('character', {name: jsonObject.name});
                            represents = character.id;
                        }
                        else {
                            character = roll20.getObj('character', represents);
                        }

                        if (character) {
                            _.each(jsonObject, function (fieldValue, fieldName) {
                                var attrs = roll20.findObjs({
                                    type: 'attribute',
                                    name: fieldName,
                                    characterid: represents
                                });
                                if (attrs && attrs.length === 1) {
                                    attrs[0].set('current', fieldValue);
                                }
                            });
                        }
                        else {
                            //ToDO handle error better
                            roll20.log('Couldn\'t make character for new npc');
                        }
                    }
                    catch (e) {
                        logger.error(e);
                    }
                }
            });
        },

        addedTokenIds: [],

        /////////////////////////////////////////////////
        // Event Handlers
        /////////////////////////////////////////////////
        handleAddToken: function (token) {
            var represents = token.get('represents');
            if (_.isEmpty(represents)) {
                return;
            }
            var character = roll20.getObj('character', represents);
            if (!character) {
                return;
            }
            this.addedTokenIds.push(token.id);
        },

        handleChangeToken: function (token) {
            if (_.contains(this.addedTokenIds, token.id)) {
                this.addedTokenIds = _.without(this.addedTokenIds, token.id);
                this.rollHPForToken(token);
            }
        },

        rollHPForToken: function (token) {
            var represents = token.get('represents');
            if (!represents) {
                return;
            }
            var character = roll20.getObj('character', represents);
            if (!character) {
                return;
            }
            var hpBarLink = token.get(hpBar + '_link');
            if (hpBarLink) {
                return;
            }
            var formula = roll20.getAttrByName(represents, 'hp_formula');
            if (!formula) {
                return;
            }

            var that = this;
            roll20.sendChat('', '%{' + character.get('name') + '|npc_hp}', function (results) {
                if (results && results.length === 1) {
                    var message = that.processInlinerolls(results[0]);
                    var total = results[0].inlinerolls[0].results.total;
                    roll20.sendChat('HP Roller', '/w GM &{template:5e-shaped} ' + message);
                    token.set(hpBar + '_value', total);
                    token.set(hpBar + '_max', total);
                }
            });
        },

        /**
         *
         * @param {ChatMessage} msg
         */
        checkForAmmoUpdate: function (msg) {
            if (myState.config.updateAmmo && msg.rolltemplate === '5e-shaped' && msg.content.indexOf('{{ammo=') !== -1) {
                var match;
                var characterName;
                var attackId;
                var regex = /\{\{(.*?)\}\}/g;

                while (!!(match = regex.exec(msg.content))) {
                    if (match[1]) {
                        var splitAttr = match[1].split('=');
                        if (splitAttr[0] === 'character_name') {
                            characterName = splitAttr[1];
                        }
                        if (splitAttr[0] === 'attack_id') {
                            attackId = splitAttr[1];
                        }
                    }
                }
                if (attackId && characterName) {
                    var character = roll20.findObjs({
                        _type: 'character',
                        name: characterName
                    })[0];
                    var attr = roll20.findObjs({
                        type: 'attribute',
                        characterid: character.id,
                        name: 'repeating_attack_' + attackId + '_ammo'
                    }, {caseInsensitive: true})[0];

                    var val = parseInt(attr.get('current'), 10) || 0;
                    attr.set({current: val - 1});
                }

            }
        },


        processInlinerolls: function (msg) {
            if (_.has(msg, 'inlinerolls')) {
                return _.chain(msg.inlinerolls)
                    .reduce(function (previous, current, index) {
                        previous['$[[' + index + ']]'] = current.results.total || 0;
                        return previous;
                    }, {})
                    .reduce(function (previous, current, index) {
                        return previous.replace(index, current);
                    }, msg.content)
                    .value();
            } else {
                return msg.content;
            }
        },


        checkInstall: function () {
            logger.info('-=> ShapedScripts v$$$ <=-', version);
            if (myState.version !== schemaVersion) {
                logger.info('  > Updating Schema to v$$$ from $$$<', schemaVersion, myState && myState.version);
                logger.info('Preupgrade state: $$$', myState);
                switch (myState && myState.version) {
                    default:
                        if (!myState.version) {
                            _.defaults(myState, {
                                version: schemaVersion,
                                config: {
                                    logLevel: 'INFO',
                                    updateAmmo: false
                                }
                            });
                            logger.info('Making new state object $$$', myState);
                        }
                        else {
                            logger.error('Unknown schema version for state $$$', myState);
                            report('Serious error attempting to upgrade your global state, please see log for details. ' +
                                'ShapedScripts will not function correctly until this is fixed');
                            myState = undefined;
                        }
                        break;
                }
                logger.info('Upgraded state: $$$', myState);
            }
        },

        registerEventHandlers: function () {
            roll20.on('chat:message', this.handleInput.bind(this));
            roll20.on('add:token', this.handleAddToken.bind(this));
            roll20.on('change:token', this.handleChangeToken.bind(this));
        },

        logWrap: 'shapedModule'
    };
})(roll20);

logger.wrapModule(shapedModule);


module.exports = {
    checkInstall: shapedModule.checkInstall,
    registerEventHandlers: shapedModule.registerEventHandlers
};



