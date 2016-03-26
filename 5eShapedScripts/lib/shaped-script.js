var _ = require('underscore');
var srdConverter = require('./srd-converter');
var parseModule = require('./parser');
var cp = require('./command-parser');

var version       = '0.1.2',
    schemaVersion = 0.1,
    hpBar         = 'bar1';

var booleanValidator = function (value) {
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
 * @returns {{handleInput: function, configOptionsSpec: {Object}, options: function, processSelection: function, configure: function, importStatblock: function, importMonstersFromJson: function, importSpellsFromJson: function, createNewCharacter: function, getImportDataWrapper: function, handleAddToken: function, handleChangeToken: function, rollHPForToken: function, checkForAmmoUpdate: function, processInlinerolls: function, checkInstall: function, registerEventHandlers: function, getRollTemplateOptions:function, checkForDeathSave:function, logWrap: string}}
 */
module.exports = function (logger, myState, roll20, parser, entityLookup) {
    'use strict';
    var sanitise = logger.wrapFunction('sanitise', require('./sanitise'), '');
    var addedTokenIds = [];
    var report = function (msg) {
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
            var commandProcessor = cp('shaped')
              .addCommand('config', this.configure.bind(this))
              .options(this.configOptionsSpec)
              .addCommand('import-statblock', this.importStatblock.bind(this))
              .option('overwrite', booleanValidator)
              .withSelection({
                  graphic: {
                      min: 1,
                      max: Infinity
                  }
              })
              .addCommand('import-monster', this.importMonstersFromJson.bind(this))
              .optionLookup('monsters', entityLookup.findEntity.bind(entityLookup, 'monster'))
              .addCommand('import-spell', this.importSpellsFromJson.bind(this))
              .optionLookup('spells', entityLookup.findEntity.bind(entityLookup, 'spell'))
              .withSelection({
                  character: {
                      min: 1,
                      max: 1
                  }
              })
              .end();

            try {
                logger.debug(msg);
                if (msg.type !== 'api') {
                    this.checkForAmmoUpdate(msg);
                    this.checkForDeathSave(msg);
                    return;
                }

                commandProcessor.processCommand(msg);

            }
            catch (e) {
                if (typeof e === 'string' || e instanceof parseModule.ParserError) {
                    report('An error occurred: ' + e);
                    logger.error('Error: $$$', e.toString());
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
            }
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

        importStatblock: function (options) {

            logger.info('Importing statblocks for tokens $$$', options.selected.graphic);
            var self = this;
            _.each(options.selected.graphic, function (token) {
                var text = token.get('gmnotes');
                if (text) {
                    text = sanitise(_.unescape(decodeURIComponent(text)), logger);
                    //noinspection JSUnresolvedVariable
                    self.createNewCharacter(parser.parse(text).npc, token, options.overwrite);
                }
            });
        },

        //TODO: Monster JSON format needs adjustingxx
        importMonstersFromJson: function (options) {
            var self = this;
            _.each(options.monsters, function (monsterData) {
                self.createNewCharacter(monsterData);
            });
            report('Added the following monsters: ' + _.reduce(options.monsters, function (memo, spell) {
                  memo += spell.name;
                  return memo;
              }, ''));

        },

        importSpellsFromJson: function (options) {

            var gender = roll20.getAttrByName(options.selected.character.id, 'gender');

            //TODO: not sure how comfortable I am with a) only supporting male/female and b) defaulting to male
            gender = gender.match(/f|female|girl|woman|feminine/gi) ? 'female' : 'male';


            var importData = {
                spells: srdConverter.convertSpells(options.spells, gender)
            };
            this.getImportDataWrapper(options.selected.character).mergeImportData(importData);
            report('Added the following spells:\n' + _.map(importData.spells, function (spell) {
                  return spell.name;
              }).join('\n'));
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

            logger.debug('Converted monster data: $$$', converted);
            var character = roll20.createObj('character', {
                name: converted.character_name, // jshint ignore:line
                avatar: token ? token.get('imgsrc') : ''
            });


            if (!character) {
                logger.error('Failed to create character for converted monsterData $$$', converted);
                throw 'Failed to create new character';
            }

            if (token) {
                token.set('represents', character.id);
            }
            this.getImportDataWrapper(character).setNewImportData({npc: converted});
            report('Character [' + converted.character_name + '] successfully created.'); // jshint ignore:line
            return character;

        },

        getImportDataWrapper: function (character) {
            var getOrCreateAttribute = function (name) {
                var attribute = {
                    type: 'attribute',
                    name: name,
                    characterid: character.id
                };
                var attrs = roll20.findObjs(attribute);
                if (attrs && attrs.length === 1) {
                    return attrs[0];
                }
                else {
                    var attr = roll20.createObj('attribute', attribute);
                    if (!attr) {
                        logger.error('Failed to create attribute $$$ on character $$$', name, character.get('name'));
                        throw 'Failed to set import data on character';
                    }
                    return attr;
                }
            };


            return {
                setNewImportData: function (importData) {
                    if (_.isEmpty(importData)) {
                        return;
                    }
                    getOrCreateAttribute('import_data').set('current', JSON.stringify(importData));
                    getOrCreateAttribute('import_data_present').set('current', 'on');
                },
                mergeImportData: function (importData) {
                    if (_.isEmpty(importData)) {
                        return;
                    }
                    var attr = getOrCreateAttribute('import_data');
                    var dataPresentAttr = getOrCreateAttribute('import_data_present');
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
                            current[key] = current[key].concat(value);
                        }
                        else {
                            current[key] = value;
                        }

                    });
                    logger.debug('Setting import data to $$$', current);
                    attr.set('current', JSON.stringify(current));
                    dataPresentAttr.set('current', 'on');
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
            //TODO check for auto ammo attribute

            var options = this.getRollTemplateOptions(msg);
            if (options.ammoName && options.characterName) {
                var character = roll20.findObjs({
                    _type: 'character',
                    name: options.characterName
                })[0];

                var ammoAttrGroup = _.chain(roll20.findObjs({type: 'attribute', characterid: character.id}))
                  .filter(function (attribute) {
                      return attribute.get('name').indexOf('repeating_ammo') === 0;
                  })
                  .groupBy(function (attribute) {
                      return attribute.get('name').replace(/(repeating_ammo_[^_]+).*/, '$1');
                  })
                  .find(function (attributes) {
                      return _.find(attributes, function (attribute) {
                          return attribute.get('name').match(/.*name$/) && attribute.get('current') === options.ammoName;
                      });
                  })
                  .value();

                logger.debug('Ammo attributes: $$$', ammoAttrGroup);

                var ammoAttr = _.find(ammoAttrGroup, function (attribute) {
                    return attribute.get('name').match(/.*qty$/);
                });

                var ammoUsedAttr = _.find(ammoAttrGroup, function (attribute) {
                    return attribute.get('name').match(/.*used$/);
                });

                var ammoUsed = ammoUsedAttr ? ammoUsedAttr.get('current') : 1;

                var val = parseInt(ammoAttr.get('current'), 10) || 0;
                ammoAttr.set('current', Math.max(0, val - ammoUsed));
            }

        },

        checkForDeathSave: function (msg) {
            var options = this.getRollTemplateOptions(msg);
            if (options.deathSavingThrow && options.characterName && options.roll1) {
                var character = roll20.findObjs({
                    _type: 'character',
                    name: options.characterName
                })[0];

                //TODO: Could we output a chat button maybe in the roll_2 case?
                //TODO: Do we want to output text on death/recovery?
                var increment = function (val) {
                    return ++val;
                };
                if (roll20.getAttrByName(character.id, 'roll_setting') !== '@{roll_2}') {
                    var rollIndex = options.roll1.match(/\$\[\[(\d+)\]\]/)[1];
                    var result = msg.inlinerolls[rollIndex].results.total;
                    var attributeToIncrement = result >= 10 ? 'death_saving_throw_successes' : 'death_saving_throw_failures';
                    roll20.processAttrValue(character.id, attributeToIncrement, increment);
                }
            }
        },

        getRollTemplateOptions: function (msg) {
            if (msg.rolltemplate === '5e-shaped') {
                var regex = /\{\{(.*?)\}\}/g;
                var match;
                var options = {};
                while (!!(match = regex.exec(msg.content))) {
                    if (match[1]) {
                        var splitAttr = match[1].split('=');
                        var propertyName = splitAttr[0].replace(/_([a-z])/g, function (match, letter) {
                            return letter.toUpperCase();
                        });
                        options[propertyName] = splitAttr.length === 2 ? splitAttr[1] : '';
                    }
                }
                return options;
            }
            return {};
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
                                    logLevel: 'INFO'
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




