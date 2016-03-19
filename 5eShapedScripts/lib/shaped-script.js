var _ = require('underscore');
var srdConverter = require('./srd-converter');

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
 * @returns {{handleInput: function, configOptionsSpec: {Object}, makeOpts: function, processSelection: function, configure: function, importStatblock: function, handleAddToken: function, handleChangeToken: function, rollHPForToken: function, checkForAmmoUpdate: function, processInlinerolls: function, checkInstall: function, registerEventHandlers: function, logWrap: string}}
 */
module.exports = function (logger, myState, roll20, parser) {
    var sanitise = logger.wrapFunction('sanitise', require('./sanitise'), '');
    var addedTokenIds = [];
    'use strict';
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
                        text = sanitise(_.unescape(decodeURIComponent(text)), logger);
                        //noinspection JSUnresolvedVariable
                        var jsonObject = srdConverter(parser.parse(text).npc);

                        var represents = token.get('represents');
                        var character;
                        if (!represents) {
                            //noinspection JSUnresolvedVariable
                            character = roll20.createObj('character', {
                                name: jsonObject.character_name,
                                avatar: token.get('imgsrc')
                            });
                            represents = character.id;
                        }
                        else {
                            character = roll20.getObj('character', represents);
                        }

                        if (character) {

                            var attribute = {
                                type: 'attribute',
                                name: 'import_data',
                                characterid: represents
                            };
                            var attrs = roll20.findObjs(attribute);
                            if (attrs.length === 1) {
                                attrs[0].set('current', JSON.stringify(jsonObject));
                            }
                            else {
                                roll20.createObj('attribute', _.extend(attribute, {current: JSON.stringify(jsonObject)}));
                            }
                        }
                        else {
                            //ToDO handle error better
                            roll20.log('Couldn\'t make character for new npc');
                        }
                    }
                    catch (e) {
                        logger.error(e.toString());
                    }
                }
            });
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




