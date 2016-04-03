/* globals unescape */
'use strict';
var _ = require('underscore');
var srdConverter = require('./srd-converter');
var parseModule = require('./parser');
var cp = require('./command-parser');
var utils = require('./utils');
var mpp = require('./monster-post-processor');

var version        = '0.4.1',
    schemaVersion  = 0.4,
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
                attribute: 'speed',
                max: false,
                link: true,
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
            rollOptions: '@{normal}',
            initiativeRoll: '@{normal_initiative}',
            initiativeToTracker: '@{initiative_to_tracker_yes}',
            breakInitiativeTies: '@{initiative_tie_breaker_var}',
            showTargetAC: '@{attacks_vs_target_ac_no}',
            showTargetName: '@{attacks_vs_target_name_no}',
            autoAmmo: '@{ammo_auto_use_var}'
        },
        rollHPOnDrop: true,
        genderPronouns: [
            {
                matchPattern: '^f$|female|girl|woman|feminine',
                nominative: 'she',
                accusative: 'her',
                possessive: 'her',
                reflexive: 'herself'
            },
            {
                matchPattern: '^m$|male|boy|man|masculine',
                nominative: 'he',
                accusative: 'him',
                possessive: 'his',
                reflexive: 'himself'
            },
            {
                matchPattern: '^n$|neuter|none|construct|thing|object',
                nominative: 'it',
                accusative: 'it',
                possessive: 'its',
                reflexive: 'itself'
            }
        ],
        defaultGenderIndex: 2

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
        var converted = value === 'true' || (value === 'false' ? false : value);
        return {
            valid: typeof value === 'boolean' || value === 'true' || value === 'false',
            converted: converted
        };
    },

    stringValidator      = function (value) {
        return {
            valid: true,
            converted: value
        };
    },

    getOptionList        = function (options) {
        return function (value) {
            if (value === undefined) {
                return options;
            }
            return {
                converted: options[value],
                valid: options[value] !== undefined
            };
        };
    },

    integerValidator     = function (value) {
        var parsed = parseInt(value);
        return {
            converted: parsed,
            valid: !isNaN(parsed)
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
    },
    regExpValidator      = function (value) {
        try {
            new RegExp(value, 'i').test('');
            return {
                converted: value,
                valid: true
            };
        }
        catch (e) {
        }
        return {
            converted: null,
            valid: false
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
 * @returns {{handleInput: function, configOptionsSpec: {}, configure: function, applyTokenDefaults: function, importStatblock: function, importMonstersFromJson: function, importMonsters: function, importSpellsFromJson: function, addSpellsToCharacter:function, hydrateSpellList: function, monsterDataPopulator: function, getTokenRetrievalStrategy: function, nameRetrievalStrategy: function, creationRetrievalStrategy: function, getTokenConfigurer: function, getImportDataWrapper: function, handleAddToken: function, handleChangeToken: function, getHPBar: function, rollHPForToken: function, checkForAmmoUpdate: function, checkForDeathSave: function, getRollTemplateOptions: function, processInlinerolls: function, checkInstall: function, registerEventHandlers: function, logWrap: string}}
 */
module.exports = function (logger, myState, roll20, parser, entityLookup) {
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
              .option('replace', booleanValidator)
              .withSelection({
                  graphic: {
                      min: 1,
                      max: Infinity
                  }
              })
              .addCommand('import-monster', this.importMonstersFromJson.bind(this))
              .option('all', booleanValidator)
              .optionLookup('monsters', entityLookup.findEntity.bind(entityLookup, 'monster'))
              .option('overwrite', booleanValidator)
              .option('replace', booleanValidator)
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
            rollHPOnDrop: booleanValidator,
            genderPronouns: [
                {
                    matchPattern: regExpValidator,
                    nominative: stringValidator,
                    accusative: stringValidator,
                    possessive: stringValidator,
                    reflexive: stringValidator
                }
            ],
            defaultGenderIndex: integerValidator
        },

        /////////////////////////////////////////
        // Configuration UI
        /////////////////////////////////////////
        configUI: {
            getConfigOptions: function (options, optionsSpec) {
                return this.getConfigOptionGroupGeneral(options, optionsSpec) +
                  this.getConfigOptionGroupTokens(options, optionsSpec) +
                  this.getConfigOptionGroupNewCharSettings(options, optionsSpec);
            },

            getConfigOptionGroupGeneral: function (options, optionsSpec) {
                return '<div><h3>General Options:</h3><dl style="margin-top: 0;">' +
                  this.generalOptions.logLevel(options, optionsSpec) +
                  '</dl></div>';
            },

            getConfigOptionGroupTokens: function (options, optionsSpec) {
                return '<div><h3>Token Options:</h3><dl style="margin-top: 0;">' +
                  this.tokenOptions.numbered(options, optionsSpec) +
                  this.tokenOptions.showName(options, optionsSpec) +
                  this.tokenOptions.showNameToPlayers(options, optionsSpec) +
                  this.tokenOptions.bars(options, optionsSpec) +
                  '</dl></div>';
            },

            getConfigOptionGroupNewCharSettings: function (options, optionsSpec) {
                return '<div><h3>New Characters:</h3><dl>' +
                  this.newCharOptions.sheetOutput(options, optionsSpec) +
                  this.newCharOptions.deathSaveOutput(options, optionsSpec) +
                  this.newCharOptions.initiativeOutput(options, optionsSpec) +
                  this.newCharOptions.showNameOnRollTemplate(options, optionsSpec) +
                  this.newCharOptions.rollOptions(options, optionsSpec) +
                  this.newCharOptions.initiativeRoll(options, optionsSpec) +
                  this.newCharOptions.initiativeToTracker(options, optionsSpec) +
                  this.newCharOptions.breakInitiativeTies(options, optionsSpec) +
                  this.newCharOptions.showTargetAC(options, optionsSpec) +
                  this.newCharOptions.showTargetName(options, optionsSpec) +
                  this.newCharOptions.autoAmmo(options, optionsSpec) +
                  '</dl></div>';
            },

            generalOptions: {
                logLevel: function (options, optionsSpec) {
                    return '<dt>Log Level</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --logLevel ?{Logging Level? (use with care)?|INFO|ERROR|WARN|DEBUG|TRACE}">' +
                      options.logLevel + '</dd>';
                }
            },

            tokenOptions: {
                numbered: function (options, optionsSpec) {
                    return '<dt>Numbered Tokens</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --tokenSettings.number ?{Make Numbered Tokens (for TNN script)?|Yes,true|No,false}">' +
                      options.tokenSettings.number + '</a></dd>';
                },

                showName: function (options, optionsSpec) {
                    return '<dt>Show Name Tag</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --tokenSettings.showName ?{Show Name Tag?|Yes,true|No,false}">' +
                      options.tokenSettings.showName + '</a></dd>';
                },

                showNameToPlayers: function (options, optionsSpec) {
                    return '<dt>Show Name to Players</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --tokenSettings.showNameToPlayers ?{Show Name Tag To Players?|Yes,true|No,false}">' +
                      options.tokenSettings.showNameToPlayers + '</a></dd>';
                },

                bars: function (options, optionsSpec) {
                    var settings = options.tokenSettings;
                    var res = '';

                    _.chain(settings).pick(['bar1', 'bar2', 'bar3']).each(function (bar, barName) {
                        var attribute = bar.attribute;
                        if (!bar.attribute) {
                            attribute = '[not set]';
                        }
                        res += '<dt>Options for ' + barName + '</dt>' +
                          '<dd style="margin-bottom: 9px"><table style="font-size: 1em;">' +
                          '<tr><td>Attribute:</td><td><a href="!shaped-config --tokenSettings.' + barName + '.attribute ?{Attribute for bar? (leave empty to clear)}">' + attribute + '</a></td></tr>' +
                          '<tr><td>Set Max:</td><td><a href="!shaped-config --tokenSettings.' + barName + '.max ?{Set bar max value?|Yes,true|No,false}">' + bar.max + '</td></tr>' +
                          '<tr><td>Link Bar:</td><td><a href="!shaped-config --tokenSettings.' + barName + '.link ?{Keep bar linked?|Yes,true|No,false}">' + bar.link + '</a></td></tr > ' +
                          '<tr><td>Show to Players:</td><td><a href="!shaped-config --tokenSettings.' + barName + '.showPlayers ?{Show bar to players?|Yes,true|No,false}">' + bar.showPlayers + '</td></tr>' +
                          '</table></dd>';
                    });

                    return res;
                }
            },

            newCharOptions: {
                sheetOutput: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.sheetOutput())[options.newCharSettings.sheetOutput];
                    return '<dt>Sheet Output</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.sheetOutput ?{Sheet Output?|Public,public|Whisper to GM,whisper}">' +
                      optVal + '</a></dd>';
                },

                deathSaveOutput: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.deathSaveOutput())[options.newCharSettings.deathSaveOutput];
                    return '<dt>Death Save Output</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.deathSaveOutput ?{Death Save Output?|Public,public|Whisper to GM,whisper}">' +
                      optVal + '</a></dd>';
                },

                initiativeOutput: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.initiativeOutput())[options.newCharSettings.initiativeOutput];
                    return '<dt>Initiative Output</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.initiativeOutput ?{Initiative Output?|Public,public|Whisper to GM,whisper}">' +
                      optVal + '</a></dd>';
                },

                showNameOnRollTemplate: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.showNameOnRollTemplate())[options.newCharSettings.showNameOnRollTemplate];
                    return '<dt>Show Name on Roll Template</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.showNameOnRollTemplate ?{Show Name on Roll Template?|Yes,true|No,false}">' +
                      optVal + '</a></dd>';
                },

                rollOptions: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.rollOptions())[options.newCharSettings.rollOptions];
                    return '<dt>Roll Option</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.rollOptions ?{Roll Option?|Normal,normal|Advantage,advantage|Disadvantage,disadvantage|Roll Two,two}">' +
                      optVal + '</a></dd>';
                },

                initiativeRoll: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.initiativeRoll())[options.newCharSettings.initiativeRoll];
                    return '<dt>Init Roll</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.initiativeRoll ?{Initiative Roll?|Normal,normal|Advantage,advantage|Disadvantage,disadvantage}">' +
                      optVal + '</a></dd>';
                },

                initiativeToTracker: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.initiativeToTracker())[options.newCharSettings.initiativeToTracker];
                    return '<dt>Init To Tracker</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.initiativeToTracker ?{Initiative Sent To Tracker?|Yes,true|No,false}">' +
                      optVal + '</a></dd>';
                },

                breakInitiativeTies: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.breakInitiativeTies())[options.newCharSettings.breakInitiativeTies];
                    return '<dt>Break Init Ties</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.breakInitiativeTies ?{Break Initiative Ties?|Yes,true|No,false}">' +
                      optVal + '</a></dd>';
                },

                showTargetAC: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.showTargetAC())[options.newCharSettings.showTargetAC];
                    return '<dt>Show Target AC</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.showTargetAC ?{Show Target AC?|Yes,true|No,false}">' +
                      optVal + '</a></dd>';
                },

                showTargetName: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.showTargetName())[options.newCharSettings.showTargetName];
                    return '<dt>Show Target Name</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.showTargetName ?{Show Target Name?|Yes,true|No,false}">' +
                      optVal + '</a></dd>';
                },

                autoAmmo: function (options, optionsSpec) {
                    var optVal = _.invert(optionsSpec.newCharSettings.autoAmmo())[options.newCharSettings.autoAmmo];
                    return '<dt>Auto Use Ammo</dt><dd style="margin-bottom: 9px">' +
                      '<a href="!shaped-config --newCharSettings.autoAmmo ?{Auto use Ammo?|Yes,true|No,false}">' +
                      optVal + '</a></dd>';
                }
            }
        },

        /////////////////////////////////////////
        // Command handlers
        /////////////////////////////////////////
        configure: function (options) {
            utils.deepExtend(myState.config, options);
            report('Configuration', this.configUI.getConfigOptions(myState.config, this.configOptionsSpec));
        },

        applyTokenDefaults: function (options) {
            var self = this;
            _.each(options.selected.graphic, function (token) {
                var represents = token.get('represents');
                var character = roll20.getObj('character', represents);
                if (character) {
                    self.getTokenConfigurer(token)(character);
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
                    var processedNpc = mpp(parser.parse(text).npc, entityLookup);
                    self.importMonsters([processedNpc], options, token, [function (character) {
                        character.set('gmnotes', text.replace(/\n/g, '<br>'));
                    }]);
                }
            });
        },

        importMonstersFromJson: function (options) {
            var characterProcessors = [];
            characterProcessors.push(this.hydrateSpellList.bind(this));
            if (options.all) {
                options.monsters = entityLookup.getAll('monster');
                delete options.all;
            }


            this.importMonsters(options.monsters.slice(0, 20), options, options.selected.graphic, characterProcessors);
            options.monsters = options.monsters.slice(20);
            var self = this;
            if (!_.isEmpty(options.monsters)) {
                setTimeout(function () {
                    self.importMonstersFromJson(options);
                }, 200);
            }

        },

        importMonsters: function (monsters, options, token, characterProcessors) {
            var characterRetrievalStrategies = [];

            if (token) {
                characterProcessors.push(this.getAvatarCopier(token).bind(this));
                if (_.size(monsters) === 1) {
                    characterProcessors.push(this.getTokenConfigurer(token).bind(this));
                    if (options.replace || options.overwrite) {
                        characterRetrievalStrategies.push(this.getTokenRetrievalStrategy(token).bind(this));
                    }
                }
            }
            if (options.replace) {
                characterRetrievalStrategies.push(this.nameRetrievalStrategy);
            }

            characterRetrievalStrategies.push(this.creationRetrievalStrategy.bind(this));
            characterProcessors.push(this.monsterDataPopulator.bind(this));

            var errors = [];
            var importedList = _.chain(monsters)
              .map(function (monsterData) {

                  var character = _.reduce(characterRetrievalStrategies, function (result, strategy) {
                      return result || strategy(monsterData.name, errors);
                  }, null);

                  if (!character) {
                      logger.error('Failed to find or create character for monster $$$', monsterData.name);
                      return null;
                  }

                  var oldAttrs = roll20.findObjs({type: 'attribute', characterid: character.id});
                  _.invoke(oldAttrs, 'remove');
                  character.set('name', monsterData.name);

                  _.each(characterProcessors, function (proc) {
                      proc(character, monsterData);
                  });
                  return character && character.get('name');
              })
              .compact()
              .value();

            if (!_.isEmpty(importedList)) {
                var monsterList = importedList.join('</li><li>');
                report('Import Success', 'Added the following monsters: <ul><li>' + monsterList + '</li></ul>');
            }
            if (!_.isEmpty(errors)) {
                var errorList = errors.join('</li><li>');
                reportError('The following errors occurred on import:  <ul><li>' + errorList + '</li></ul>');
            }
        },

        importSpellsFromJson: function (options) {
            this.addSpellsToCharacter(options.selected.character, options.spells);
        },

        addSpellsToCharacter: function (character, spells, noreport) {
            var gender = roll20.getAttrByName(character.id, 'gender');

            var defaultIndex = Math.min(myState.config.defaultGenderIndex, myState.config.genderPronouns.length);
            var defaultPronounInfo = myState.config.genderPronouns[defaultIndex];
            var pronounInfo = _.clone(_.find(myState.config.genderPronouns, function (pronounDetails) {
                  return new RegExp(pronounDetails.matchPattern, 'i').test(gender);
              }) || defaultPronounInfo);

            _.defaults(pronounInfo, defaultPronounInfo);


            var importData = {
                spells: srdConverter.convertSpells(spells, pronounInfo)
            };
            this.getImportDataWrapper(character).mergeImportData(importData);
            if (!noreport) {
                report('Import Success', 'Added the following spells:  <ul><li>' + _.map(importData.spells, function (spell) {
                      return spell.name;
                  }).join('</li><li>') + '</li></ul>');
            }
        },

        hydrateSpellList: function (character, monster) {
            if (!monster.spells) {
                return;
            }
            monster.spells = _.map(monster.spells.split(', '), function (spellName) {
                return entityLookup.findEntity('spell', spellName) || spellName;
            });
        },


        monsterDataPopulator: function (character, monsterData) {
            _.each(myState.config.newCharSettings, function (value, key) {
                var attribute = roll20.getOrCreateAttr(character.id, configToAttributeLookup[key]);
                attribute.set('current', _.isBoolean(value) ? (value ? 1 : 0) : value);
            });

            var converted = srdConverter.convertMonster(monsterData);
            logger.debug('Converted monster data: $$$', converted);
            var expandedSpells = converted.spells;
            delete converted.spells;
            this.getImportDataWrapper(character).setNewImportData({npc: converted});
            if (expandedSpells) {
                this.addSpellsToCharacter(character, expandedSpells, true);
            }
            return character;

        },

        getTokenRetrievalStrategy: function (token) {
            return function (name, errors) {
                return token && roll20.getObj('character', token.get('represents'));
            };
        },

        nameRetrievalStrategy: function (name, errors) {
            var chars = roll20.findObjs({type: 'character', name: name});
            if (chars.length > 1) {
                errors.push('More than one existing character found with name "' + name + '". Can\'t replace');
            }
            else {
                return chars[0];
            }
        },

        creationRetrievalStrategy: function (name, errors) {
            if (!_.isEmpty(roll20.findObjs({type: 'character', name: name}))) {
                errors.push('Can\'t create new character with name "' + name + '" because one already exists with that name. Perhaps you want --replace?');
            }
            else {
                return roll20.createObj('character', {name: name});
            }
        },

        getAvatarCopier: function (token) {
            return function (character) {
                character.set('avatar', token.get('imgsrc'));
            };
        },

        getTokenConfigurer: function (token) {
            return function (character) {
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
                          token.set('showplayers_' + barName, bar.showPlayers);
                          if (bar.link) {
                              token.set(barName + '_link', attribute.id);
                          }
                      }
                  });

                token.set('showname', settings.showName);
                token.set('showplayers_name', settings.showNameToPlayers);
            };
        },

        getImportDataWrapper: function (character) {


            return {
                setNewImportData: function (importData) {
                    if (_.isEmpty(importData)) {
                        return;
                    }
                    roll20.setAttrByName(character.id, 'import_data', JSON.stringify(importData));
                    roll20.setAttrByName(character.id, 'import_data_present', 'on');
                },
                mergeImportData: function (importData) {
                    if (_.isEmpty(importData)) {
                        return;
                    }
                    var attr = roll20.getOrCreateAttr(character.id, 'import_data');
                    var dataPresentAttr = roll20.getOrCreateAttr(character.id, 'import_data_present');
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

            var self = this;
            roll20.sendChat('', '%{' + character.get('name') + '|npc_hp}', function (results) {
                if (results && results.length === 1) {
                    var message = self.processInlinerolls(results[0]);
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
                    case 0.2:
                    case 0.3:
                        _.extend(myState.config.genderPronouns, utils.deepClone(configDefaults.genderPronouns));
                        _.defaults(myState.config, utils.deepClone(configDefaults));
                        myState.version = schemaVersion;
                        break;
                    default:
                        if (!myState.version) {
                            _.defaults(myState, {
                                version: schemaVersion,
                                config: utils.deepClone(configDefaults)
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




