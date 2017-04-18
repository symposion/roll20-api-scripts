/* globals unescape */
var _ = require('underscore');
var srdConverter = require('./srd-converter');
var parseModule = require('./parser');
var cp = require('./command-parser');
var utils = require('./utils');

var version        = '0.2.2',
    schemaVersion  = 0.2,
    configDefaults = {
        logLevel: 'INFO',
        tokenSettings: {
            number: false,
            bar1: {
                attribute: 'HP',
                max: true,
                link: false,
                showPlayers: false
            },
            bar2: {
                attribute: '',
                max: false,
                link: false,
                showPlayers: false
            },
            bar3: {
                attribute: '',
                max: false,
                link: false,
                showPlayers: false
            },
            showName: true,
            showNameToPlayers: false
        },
        newCharSettings: {
            sheetOutput: '@{output_to_all}',
            deathSaveOutput: '@{output_to_all}',
            initiativeOutput: '@{output_to_all}',
            showNameOnRollTemplate: '@{show_character_name_yes}',
            rollOptions: '@{roll_2}',
            initiativeRoll: '@{normal_initiative}',
            initiativeToTracker: '@{initiative_to_tracker_yes}',
            breakInitiativeTies: '@{initiative_tie_breaker_var}',
            showTargetAC: '@{attacks_vs_target_ac_yes}',
            showTargetName: '@{attacks_vs_target_name_yes}',
            autoAmmo: '@{ammo_auto_use_var}'
        },
        rollHPOnDrop: true
    };

var configToAttributeLookup = {
    sheetOutput: 'output_option',
    deathSaveOutput: 'death_save_output_option',
    initiativeOutput: 'initiative_output_option',
    showNameOnRollTemplate: 'show_character_name',
    rollOptions: 'roll_setting',
    initiativeRoll: 'initiative_roll',
    initiativeToTracker: 'initiative_to_tracker',
    breakInitiativeTies: 'initiative_tie_breaker',
    showTargetAC: 'attacks_vs_target_ac',
    showTargetName: 'attacks_vs_target_name',
    autoAmmo: 'ammo_auto_use'
};

var booleanValidator     = function (value) {
        'use strict';
        var converted = value === 'true' || (value === 'false' ? false : value);
        return {
            valid: typeof value === 'boolean' || value === 'true' || value === 'false',
            converted: converted
        };
    },

    stringValidator      = function (value) {
        'use strict';
        return {
            valid: true,
            converted: value
        };
    },

    getOptionList        = function (options) {
        'use strict';
        return function (value) {
            return {
                converted: options[value],
                valid: options[value] !== undefined
            };
        };
    },

    sheetOutputValidator = getOptionList({
        public: '@{output_to_all}',
        whisper: '@{output_to_gm}'
    }),
    barValidator         = {
        attribute: stringValidator,
        max: booleanValidator,
        link: booleanValidator,
        showPlayers: booleanValidator
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
 * @returns {{handleInput: function, configOptionsSpec: object, configure: function, importStatblock: function, importMonstersFromJson: function, importSpellsFromJson: function, createNewCharacter: function, getImportDataWrapper: function, handleAddToken: function, handleChangeToken: function, rollHPForToken: function, checkForAmmoUpdate: function, checkForDeathSave: function, getRollTemplateOptions: function, processInlinerolls: function, checkInstall: function, registerEventHandlers: function, logWrap: string}}
 */
module.exports = function (logger, myState, roll20, parser, entityLookup) {
    'use strict';
    var sanitise = logger.wrapFunction('sanitise', require('./sanitise'), '');
    var addedTokenIds = [];
    var report = function (heading, text) {
        //Horrible bug with this at the moment - seems to generate spurious chat
        //messages when noarchive:true is set
        //sendChat('ShapedScripts', '' + msg, null, {noarchive:true});

        roll20.sendChat('',
          '/w gm <div style="border: 1px solid black; background-color: white; padding: 3px 3px;">' +
          '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">' +
          'Shaped Scripts ' + heading +
          '</div>' +
          text +
          '</div>');
    };

    var reportError = function (text) {
        roll20.sendChat('',
          '/w gm <div style="border: 1px solid black; background-color: white; padding: 3px 3px;">' +
          '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;color:red;">' +
          'Shaped Scripts Error' +
          '</div>' +
          text +
          '</div>');
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
              .option('overwrite', booleanValidator)
              .withSelection({
                  graphic: {
                      min: 0,
                      max: 1
                  }
              })
              .addCommand('import-spell', this.importSpellsFromJson.bind(this))
              .optionLookup('spells', entityLookup.findEntity.bind(entityLookup, 'spell'))
              .withSelection({
                  character: {
                      min: 1,
                      max: 1
                  }
              })
              .addCommand('token-defaults', this.applyTokenDefaults.bind(this))
              .withSelection({
                  graphic: {
                      min: 1,
                      max: Infinity
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
                    reportError(e);
                    logger.error('Error: $$$', e.toString());
                }
                else {
                    logger.error(e.toString());
                    logger.error(e.stack);
                    reportError('An error occurred. Please see the log for more details.');
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
            tokenSettings: {
                number: booleanValidator,
                bar1: barValidator,
                bar2: barValidator,
                bar3: barValidator,
                showName: booleanValidator,
                showNameToPlayers: booleanValidator
            },
            newCharSettings: {
                sheetOutput: sheetOutputValidator,
                deathSaveOutput: sheetOutputValidator,
                initiativeOutput: sheetOutputValidator,
                showNameOnRollTemplate: getOptionList({
                    true: '@{show_character_name_yes}',
                    false: '@{show_character_name_no}'
                }),
                rollOptions: getOptionList({
                    normal: '@{roll_1}',
                    advantage: '@{roll_advantage}',
                    disadvantage: '@{roll_disadvantage}',
                    two: '@{roll_2}'
                }),
                initiativeRoll: getOptionList({
                    normal: '@{normal_initiative}',
                    advantage: '@{advantage_on_initiative}',
                    disadvantage: '@{disadvantage_on_initiative}'
                }),
                initiativeToTracker: getOptionList({
                    true: '@{initiative_to_tracker_yes}',
                    false: '@{initiative_to_tracker_no}'
                }),
                breakInitiativeTies: getOptionList({
                    true: '@{initiative_tie_breaker_var}',
                    false: ''
                }),
                showTargetAC: getOptionList({
                    true: '@{attacks_vs_target_ac_yes}',
                    false: '@{attacks_vs_target_ac_no}'
                }),
                showTargetName: getOptionList({
                    true: '@{attacks_vs_target_name_yes}',
                    false: '@{attacks_vs_target_name_no}'
                }),
                autoAmmo: getOptionList({
                    true: '@{ammo_auto_use_var}',
                    false: ''
                })
            },
            rollHPOnDrop: booleanValidator
        },

        /////////////////////////////////////////
        // Command handlers
        /////////////////////////////////////////
        configure: function (options) {
            utils.deepExtend(myState.config, options);
            report('Configuration', 'Configuration is now: ' + JSON.stringify(myState.config));
        },

        applyTokenDefaults: function (options) {
            var self = this;
            _.each(options.selected.graphic, function (token) {
                var represents = token.get('represents');
                var character = roll20.getObj('character', represents);
                if (character) {
                    self.setTokenDefaults(token, character);
                }
            });
        },

        importStatblock: function (options) {

            logger.info('Importing statblocks for tokens $$$', options.selected.graphic);
            var self = this;
            _.each(options.selected.graphic, function (token) {
                var text = token.get('gmnotes');
                if (text) {
                    text = sanitise(unescape(text), logger);
                    //noinspection JSUnresolvedVariable
                    var character = self.createNewCharacter(parser.parse(text).npc, token, options.overwrite);
                    if (character) {
                        character.set('gmnotes', text.replace(/\n/g, '<br>'));
                        report('Import Success', 'Character [' + character.get('name') + '] successfully created.');
                    }
                }
            });
        },

        importMonstersFromJson: function (options) {
            var self = this;
            var token = options.selected.graphic;
            if (token && _.size(options.monsters) > 1) {
                reportError('Cannot have a token selected when importing more than one monster');
                return;
            }
            var importedList = _.chain(options.monsters)
              .map(function (monsterData) {
                  var character = self.createNewCharacter(monsterData, token, options.overwrite);
                  return character && character.get('name');
              })
              .compact()
              .value();

            if (!_.isEmpty(importedList)) {
                var monsterList = importedList.join('</li><li>');
                report('Import Success', 'Added the following monsters: <ul><li>' + monsterList + '</li></ul>');
            }


        },

        importSpellsFromJson: function (options) {

            var gender = roll20.getAttrByName(options.selected.character.id, 'gender') || 'male';

            //TODO: not sure how comfortable I am with a) only supporting male/female and b) defaulting to male
            gender = gender.match(/f|female|girl|woman|feminine/gi) ? 'female' : 'male';


            var importData = {
                spells: srdConverter.convertSpells(options.spells, gender)
            };
            this.getImportDataWrapper(options.selected.character).mergeImportData(importData);
            report('Import Success', 'Added the following spells:  <ul><li>' + _.map(importData.spells, function (spell) {
                  return spell.name;
              }).join('</li><li>') + '</li></ul>');
        },

        createNewCharacter: function (monsterData, token, overwrite) {
            var converted = srdConverter.convertMonster(monsterData);
            var character;
            if (token && token.get('represents')) {
                character = roll20.getObj('character', token.get('represents'));
                if (character) {
                    if (!overwrite) {
                        reportError('Found character "' + character.get('name') + '" for token already but overwrite was not set. Try again with --overwrite if you wish to replace this character');
                        return;
                    }
                    else {
                        var oldAttrs = roll20.findObjs({type: 'attribute', characterid: character.id});
                        character.set('name', converted.character_name);// jshint ignore:line
                        _.invoke(oldAttrs, 'remove');
                    }
                }
            }

            logger.debug('Converted monster data: $$$', converted);
            if (!character) {
                character = roll20.createObj('character', {
                    name: converted.character_name, // jshint ignore:line
                    avatar: token ? token.get('imgsrc') : ''
                });
            }


            if (!character) {
                logger.error('Failed to create character for converted monsterData $$$', converted);
                throw 'Failed to create new character';
            }

            if (token) {
                this.setTokenDefaults(token, character);
            }
            this.getImportDataWrapper(character).setNewImportData({npc: converted});
            this.setCharacterDefaults(character);
            return character;

        },

        setCharacterDefaults: function (character) {
            _.each(myState.config.newCharSettings, function (value, key) {
                var attribute = {
                    name: configToAttributeLookup[key],
                    current: _.isBoolean(value) ? (value ? 1 : 0) : value,
                    characterid: character.id
                };
                roll20.createObj('attribute', attribute);
            });
        },

        setTokenDefaults: function (token, character) {
            token.set('represents', character.id);
            token.set('name', character.get('name'));
            var settings = myState.config.tokenSettings;
            if (settings.number && token.get('name').indexOf('%%NUMBERED%%') === -1) {
                token.set('name', token.get('name') + ' %%NUMBERED%%');
            }

            _.chain(settings)
              .pick(['bar1', 'bar2', 'bar3'])
              .each(function (bar, barName) {
                  var attribute = roll20.getOrCreateAttr(character.id, bar.attribute);
                  if (attribute) {
                      token.set(barName + '_value', attribute.get('current'));
                      if (bar.max) {
                          token.set(barName + '_max', attribute.get('max'));
                      }
                      if (bar.showPlayers) {
                          token.set('showplayers_' + barName);
                      }
                      if (bar.link) {
                          token.set(barName + '_link', attribute.id);
                      }
                  }
              });

            token.set('showname', settings.showName);
            token.set('showplayers_name', settings.showNameToPlayers);
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

            //URGH. Thanks Roll20.
            setTimeout((function (id, self) {
                return function () {
                    var token = roll20.getObj('graphic', id);
                    if (token) {
                        self.handleChangeToken(token);
                    }
                };
            }(token.id, this)), 100);
        },

        handleChangeToken: function (token) {
            if (_.contains(addedTokenIds, token.id)) {
                addedTokenIds = _.without(addedTokenIds, token.id);
                this.rollHPForToken(token);
            }
        },

        getHPBar: function () {
            return _.chain(myState.config.tokenSettings)
              .pick('bar1', 'bar2', 'bar3')
              .findKey({attribute: 'HP'})
              .value();
        },

        rollHPForToken: function (token) {
            var hpBar = this.getHPBar();
            logger.debug('HP bar is $$$', hpBar);
            if (!hpBar || !myState.config.rollHPOnDrop) {
                return;
            }

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

            var options = this.getRollTemplateOptions(msg);
            if (options.ammoName && options.characterName) {
                var character = roll20.findObjs({
                    _type: 'character',
                    name: options.characterName
                })[0];

                if (!roll20.getAttrByName(character.id, 'ammo_auto_use')) {
                    return;
                }

                var ammoAttr = _.chain(roll20.findObjs({type: 'attribute', characterid: character.id}))
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
                  .find(function (attribute) {
                      return attribute.get('name').match(/.*qty$/);
                  })
                  .value();


                var ammoUsed = 1;
                if (options.ammo) {
                    var rollRef = options.ammo.match(/\$\[\[(\d+)\]\]/);
                    if (rollRef) {
                        var rollExpr = msg.inlinerolls[rollRef[1]].expression;
                        var match = rollExpr.match(/\d+-(\d+)/);
                        if (match) {
                            ammoUsed = match[1];
                        }
                    }

                }

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

        /**
         *
         * @returns {*}
         */
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
                    case 0.1:
                        _.extend(myState, {
                            version: schemaVersion,
                            config: JSON.parse(JSON.stringify(configDefaults))
                        });
                        break;
                    default:
                        if (!myState.version) {
                            _.defaults(myState, {
                                version: schemaVersion,
                                config: JSON.parse(JSON.stringify(configDefaults))
                            });
                            logger.info('Making new state object $$$', myState);
                        }
                        else {
                            logger.error('Unknown schema version for state $$$', myState);
                            reportError('Serious error attempting to upgrade your global state, please see log for details. ' +
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




