var _            = require('underscore');
var srdConverter = require('./srd-converter');

var version          = '0.1',
    schemaVersion    = 0.1,
    hpBar            = 'bar1',

    booleanValidator = function (value) {
        'use strict';
        var converted = value === 'true' || (value === 'false' ? false : value);
        return {
            valid: typeof value === 'boolean' || value === 'true' || value === 'false',
            converted: converted
        };
    };


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

/**
 *
 * @param logger
 * @param myState
 * @param roll20
 * @param parser
 * @param entityLookup
 * @returns {{handleInput: function, configOptionsSpec: {Object}, options: function, processSelection: function, configure: function, importStatblock: function, importMonstersFromJson: function, importSpellsFromJson: function, createNewCharacter: function, getImportDataWrapper: function, handleAddToken: function, handleChangeToken: function, rollHPForToken: function, checkForAmmoUpdate: function, processInlinerolls: function, checkInstall: function, registerEventHandlers: function, logWrap: string}}
 */
module.exports = function (logger, myState, roll20, parser, entityLookup) {
    'use strict';
    var sanitise      = logger.wrapFunction('sanitise', require('./sanitise'), '');
    var addedTokenIds = [];
    var report        = function (msg) {
        //Horrible bug with this at the moment - seems to generate spurious chat
        //messages when noarchive:true is set
        //sendChat('ShapedScripts', '' + msg, null, {noarchive:true});
        roll20.sendChat('ShapedScripts', '/w gm ' + msg);
    };

    var shapedModule = {
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
                var args    = msg.content.split(/\s+--/);
                var command = args.shift();
                switch (command) {
                    case '!shaped-config':
                        this.configure(this.options().addOpts(this.configOptionsSpec).parse(args));
                        break;
                    case '!shaped-import-statblock':
                        this.importStatblock(this.processSelection(msg, {
                            graphic: {
                                min: 1,
                                max: Infinity
                            }
                        }).graphic, this.options().addOpt('overwrite', booleanValidator).parse(args));
                        break;
                    case '!shaped-import-monster':
                        this.importMonstersFromJson(_.values(this.options().addLookUp(entityLookup.findEntity.bind(entityLookup, 'monster')).parse(args)));
                        break;
                    case '!shaped-import-spell':
                        this.importSpellsFromJson(this.processSelection(msg, {
                            character: {
                                min: 1,
                                max: 1
                            }
                        }).character, _.values(this.options().addLookUp(entityLookup.findEntity.bind(entityLookup, 'spell')).parse(args)));
                        break;
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

        options: function () {
            var parsers = [];
            return {
                parse: function (args) {
                    return _.reduce(args, function (options, arg) {
                        var errors = [];
                        var parser = _.find(parsers, function (parser) {
                            return parser(arg.split(/\s+/), errors, options);
                        });
                        if (!parser) {
                            logger.error('Unrecognised or poorly formed option [$$$]', arg);
                            report('ERROR: unrecognised or poorly formed option --' + arg + '');
                        }
                        _.each(errors, report);
                        return options;
                    }, {});
                },
                addOpts: function (optsSpec) {
                    var self = this;
                    _.each(optsSpec, function (validator, key) {
                        self.addOpt(key, validator);
                    });
                    return this;
                },
                addOpt: function (optionString, validator) {
                    parsers.push(function (argParts, errors, options) {
                        if (argParts[0].toLowerCase() === optionString.toLowerCase()) {
                            if (argParts.length <= 2) {
                                //Allow for bare switches
                                var value  = argParts.length === 2 ? argParts[1] : true;
                                var result = validator(value);
                                if (result.valid) {
                                    options[argParts[0]] = result.converted;
                                    return options;
                                }
                                else {
                                    errors.push('Invalid value [' + value + '] for option [' + argParts[0] + ']');
                                }
                            }
                            return true;
                        }
                        return false;
                    });
                    return this;
                },
                addLookUp: function (lookupFunction) {
                    parsers.push(function (argParts, errors, options) {
                        var name     = argParts[0].toLowerCase();
                        var resolved = lookupFunction(name);
                        if (resolved) {
                            options[argParts[0]] = resolved;
                            return true;
                        }
                        return false;
                    });
                    return this;
                },
                logWrap: 'options'
            };
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

        importStatblock: function (graphics, overwrite) {
            logger.info('Importing statblocks for tokens $$$', graphics);
            _.each(graphics, function (token) {
                var text = token.get('gmnotes');
                if (text) {
                    text = sanitise(_.unescape(decodeURIComponent(text)), logger);
                    //noinspection JSUnresolvedVariable
                    this.createNewCharacter(parser.parse(text), token, overwrite);
                }
            });
        },

        importMonstersFromJson: function (monsters) {
            _.each(monsters, function (monsterData) {
                this.createNewCharacter(monsterData);
            });
        },

        importSpellsFromJson: function (character, spells) {
            var importData = {
                spells: srdConverter.convertSpells(spells)
            };
            this.getImportDataWrapper(character).mergeImportData(importData);
        },

        createNewCharacter: function (monsterData, token, overwrite) {
            var converted = srdConverter.convertMonster(monsterData);
            if (token && token.get('represents')) {
                var oldCharacter = roll20.getObj('character', token.get('represents'));
                if (oldCharacter) {
                    if (!overwrite) {
                        report('Found character "' + oldCharacter.get('name') + '" for token already but overwrite was not set. Try again with --overwrite if you wish to replace this character');
                        return;
                    }
                    else {
                        oldCharacter.remove();
                    }
                }
            }

            var character = roll20.createObj('character', {
                name: monsterData.character_name, // jshint ignore:line
                avatar: token ? token.get('imgsrc') : undefined
            });


            if (!character) {
                logger.error('Failed to create character for monsterData $$$', monsterData);
                throw 'Failed to create new character';
            }

            this.getImportDataWrapper(character).setNewImportData(converted);
            return character;

        },

        getImportDataWrapper: function (character) {
            var attribute          = {
                    type: 'attribute',
                    name: 'import_data',
                    characterid: character.id
                },

                getImportAttribute = function () {
                    var attrs = roll20.findObjs(attribute);
                    if (attrs && attrs.length === 1) {
                        return attrs[0];
                    }
                    else {
                        var attr = roll20.createObj('attribute', attribute);
                        if (!attr) {
                            logger.error('Failed to set character import data on new character object.');
                            throw 'Failed to set import data on character';
                        }
                        return attr;
                    }
                };


            return {
                setNewImportData: function (importData) {
                    getImportAttribute().set('current', JSON.stringify(importData));
                },
                mergeImportData: function (importData) {
                    var attr    = getImportAttribute();
                    var current = {};
                    try {
                        if (!_.isEmpty(attr.get('current').trim())) {
                            current = JSON.parse(attr.get('current'));
                        }
                    }
                    catch (e) {
                        logger.warn('Existing import_data attribute value was not valid JSON: [$$$]', attr.get('current'));
                    }
                    _.each(importData, function (value, key) {
                        var currentVal = current[key];
                        if (currentVal) {
                            if (!_.isArray(currentVal)) {
                                current[key] = [currentVal];
                            }
                            currentVal.push(value);
                        }
                        else {
                            current[key] = value;
                        }

                    });
                    logger.debug('Setting import data to $$$', current);
                    attr.set('current', JSON.stringify(current));
                    return current;
                },

                logWrap: 'importDataWrapper'
            };
        },

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
            addedTokenIds.push(token.id);
        },

        handleChangeToken: function (token) {
            if (_.contains(addedTokenIds, token.id)) {
                addedTokenIds = _.without(addedTokenIds, token.id);
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
                    var total   = results[0].inlinerolls[0].results.total;
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
            if (myState.config.updateAmmo && msg.rolltemplate === '5e-shaped' && msg.content.indexOf('{{ammo_name=') !== -1) {
                var match;
                var characterName;
                var ammoName;
                var regex = /\{\{(.*?)\}\}/g;

                while (!!(match = regex.exec(msg.content))) {
                    if (match[1]) {
                        var splitAttr = match[1].split('=');
                        if (splitAttr[0] === 'character_name') {
                            characterName = splitAttr[1];
                        }
                        if (splitAttr[0] === 'ammo_name') {
                            ammoName = splitAttr[1];
                        }
                    }
                }
                if (ammoName && characterName) {
                    var character = roll20.findObjs({
                        _type: 'character',
                        name: characterName
                    })[0];

                    var ammoAttr = _.chain(roll20.findObjs({type: 'attribute', characterid: character.id}))
                      .filter(function (attribute) {
                          return attribute.get('name').startsWith('repeating_ammo');
                      })
                      .groupBy(function (attribute) {
                          return attribute.get('name').replace(/(repeating_ammo_[^_]+).*/, '$1');
                      })
                      .find(function (attributes) {
                          return _.find(attributes, function (attribute) {
                              return attribute.get('name').endsWith('name') && attribute.get('current') === ammoName;
                          });
                      })
                      .find(function (attribute) {
                          return attribute.get('name').endsWith('qty');
                      })
                      .value();

                    var val = parseInt(ammoAttr.get('current'), 10) || 0;
                    ammoAttr.set('current', Math.max(0, val - 1));
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
                      return previous.replace(index.toString(), current);
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

    logger.wrapModule(shapedModule);
    return shapedModule;
};




