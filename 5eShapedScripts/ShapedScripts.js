/******/
(function (modules) { // webpackBootstrap
	/******/ 	// The module cache
	/******/
	var installedModules = {};

	/******/ 	// The require function
	/******/
	function __webpack_require__(moduleId) {

		/******/ 		// Check if module is in cache
		/******/
		if (installedModules[moduleId])
		/******/            return installedModules[moduleId].exports;

		/******/ 		// Create a new module (and put it into the cache)
		/******/
		var module = installedModules[moduleId] = {
			/******/            exports: {},
			/******/            id: moduleId,
			/******/            loaded: false
			/******/
		};

		/******/ 		// Execute the module function
		/******/
		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

		/******/ 		// Flag the module as loaded
		/******/
		module.loaded = true;

		/******/ 		// Return the exports of the module
		/******/
		return module.exports;
		/******/
	}


	/******/ 	// expose the modules object (__webpack_modules__)
	/******/
	__webpack_require__.m = modules;

	/******/ 	// expose the module cache
	/******/
	__webpack_require__.c = installedModules;

	/******/ 	// __webpack_public_path__
	/******/
	__webpack_require__.p = "";

	/******/ 	// Load entry module and return exports
	/******/
	return __webpack_require__(0);
	/******/
})
/************************************************************************/
/******/([
	/* 0 */
	/***/ function (module, exports, __webpack_require__) {

		/* globals FifthSpells, FifthMonsters */
		var roll20       = __webpack_require__(1);
		var getParser    = __webpack_require__(2);
		var mmFormat     = __webpack_require__(4);
		var myState      = roll20.getState('ShapedScripts');
		var logger       = __webpack_require__(5)(myState.config);
		var entityLookup = __webpack_require__(6);
		var shaped       = __webpack_require__(7)(logger, myState, roll20, getParser(mmFormat, logger), entityLookup);


		logger.wrapModule(entityLookup);
		logger.wrapModule(roll20);

		roll20.on('ready', function () {
			'use strict';
			if (typeof FifthMonsters !== 'undefined') {
				entityLookup.addEntities(logger, 'monster', FifthMonsters);
			}
			if (typeof FifthSpells !== 'undefined') {
				entityLookup.addEntities(logger, 'spell', FifthSpells);
			}
			shaped.checkInstall();
			shaped.registerEventHandlers();
		});


		/***/
	},
	/* 1 */
	/***/ function (module, exports) {

		/* globals state, createObj, findObjs, getObj, getAttrByName, sendChat, on, log */
		//noinspection JSUnusedGlobalSymbols
		module.exports = {

			getState: function (module) {
				'use strict';
				if (!state[module]) {
					state[module] = {};
				}
				return state[module];
			},

			createObj: function (type, attributes) {
				'use strict';
				return createObj(type, attributes);
			},

			findObjs: function (attributes) {
				'use strict';
				return findObjs(attributes);
			},

			getObj: function (type, id) {
				'use strict';
				return getObj(type, id);
			},

			getAttrByName: function (character, attrName) {
				'use strict';
				return getAttrByName(character, attrName);
			},

			sendChat: function (sendAs, message, callback, options) {
				'use strict';
				return sendChat(sendAs, message, callback, options);
			},

			on: function (event, callback) {
				'use strict';
				return on(event, callback);
			},

			log: function (msg) {
				'use strict';
				return log(msg);
			},

			logWrap: 'roll20'
		};


		/***/
	},
	/* 2 */
	/***/ function (module, exports, __webpack_require__) {

		var _ = __webpack_require__(3);

		/**
		 * A specification of a field that can appear
		 * in the format that this parser processes
		 * @typedef {Object} FieldSpec
		 * @property {FieldSpec[]} [contentModel] - list of child fieldSpecs for complex content
		 * @property {boolean} [bare] - if true this field appears as a bare value with no parseToken in front of it
		 * @property {string} [parseToken] - the token that defines the beginning of this field (usually case insensitive). Not used for bare tokens.
		 * @property {string} [pattern] - a pattern that defines the value of this field. For bare properties this will determine
		 *                                  if the field matches at all, whereas for normal ones this will just be used to validate them
		 * @property {number} [forNextMatchGroup] - the 1-based index of the match group from the supplied pattern that will contain text that
		 *                                          should be handed to the next parser rather than used as part of this field.
		 * @property {number} [forPreviousMatchGroup] - the 1-based index of the match group from the supplied pattern that will contain text that
		 *                                          should be handed to the previous parser to complete its value rather than used as part of this field.
		 *                                          Only applicable to
		 *                                          bare properties, since ones with a token have a clearly defined start based on the parseToken
		 * @property {number} [matchGroup=0] - the index of the capturing group in the supplied pattern to use as the value for this field. If left at the
		 *                                      default of 0, the whole match will be used.
		 * @property {boolean} [caseSensitive=false] - If true, the pattern used for the value of this field will be made case sensitive. Note
		 *                                        that parseToken matching is always case insensitive.
		 * @property {string} type - the type of this field. Currently valid values are [orderedContent, unorderedContent, string, enumType, integer, abililty]
		 * @property {string[]} enumValues - an array of valid values for this field if the type is enumType
		 * @property {number} [minOccurs=1] - the minimum number of times this field should occur in the parent content model.
		 * @property {number} [maxOccurs=1] - the maximum number of times this field should occur in the parent content model.
		 */


		/**
		 *
		 * @param {FieldSpec} formatSpec - Root format specification for this parser
		 * @param logger - Logger object to use for reporting errors etc.
		 * @returns {{parse:parse}} - A parser that will process text in the format specified by the supplied formatSpec into JSON objects
		 */
		function getParser(formatSpec, logger) {
			'use strict';

			//noinspection JSUnusedGlobalSymbols
			var parserModule = {

				makeContentModelParser: function (fieldSpec, ordered) {
					var module = this;
					return {

						parse: function (stateManager, textLines, resume) {

							var parseState = stateManager.enterChildParser(this, resume),
								someMatch  = false,
								canContinue,
								stopParser = null;

							parseState.subParsers = parseState.subParsers || module.makeParserList(fieldSpec.contentModel);


							if (parseState.resumeParser) {
								if (!parseState.resumeParser.resumeParse(stateManager, textLines)) {
									stateManager.leaveChildParser(this);
									return false;
								}

								someMatch = true;

							}

							var parseRunner = function (parser, index, parsers) {

								if (!parser.parse(stateManager, textLines)) {

									if (parser.required === 0 || !ordered) {
										//No match but it's ok to keep looking
										//through the rest of the content model for one
										return false;
									}

									//No match but one was required here by the content model
								}
								else {
									parser.justMatched = true;
									if (parser.required > 0) {
										parser.required--;
									}
									parser.allowed--;
									if (ordered) {
										//Set all the previous parsers to be exhausted since we've matched
										//this one and we're in a strictly ordered content model.
										_.each(parsers.slice(0, index), _.partial(_.extend, _, {allowed: 0}));
									}
								}
								return true;
							};

							do {

								stopParser = _.find(parseState.subParsers, parseRunner);
								logger.debug('Stopped at parser $$$', stopParser);
								canContinue = stopParser && stopParser.justMatched;
								if (stopParser) {
									someMatch              = someMatch || stopParser.justMatched;
									stopParser.justMatched = false;
								}

								//Lose any parsers that have used up all their cardinality already
								parseState.subParsers = _.reject(parseState.subParsers, {allowed: 0});

							} while (!_.isEmpty(parseState.subParsers) && !_.isEmpty(textLines) && canContinue);

							stateManager.leaveChildParser(this, someMatch ? parseState : undefined);

							return someMatch;
						},

						resumeParse: function (stateManager, textLines) {
							return this.parse(stateManager, textLines, true);
						},
						complete: function (parseState, finalText) {
							var missingContent = _.filter(parseState.subParsers, 'required');
							if (!_.isEmpty(missingContent)) {
								throw 'Incomplete content model error for parser ' + JSON.stringify(this) + '. Missing content: ' + JSON.stringify(missingContent);
							}
						}
					};
				},

				matchParseToken: function (myParseState, textLines) {
					if (_.isEmpty(textLines) || this.bare) {
						return !_.isEmpty(textLines);
					}

					var re    = new RegExp('^(.*?)(' + this.parseToken + ')(?:[\\s.]+|$)', 'i');
					var match = textLines[0].match(re);
					if (match) {
						logger.debug('Found match $$$', match[0]);
						myParseState.forPrevious = match[1];
						myParseState.text        = '';
						textLines[0]             = textLines[0].slice(match[0].length).trim();
						if (!textLines[0]) {
							textLines.shift();
						}
					}

					return !!match;
				},

				matchValue: function (myParseState, textLines) {
					if (this.pattern && this.bare) {
						//If this is not a bare value then we can take all the text up to next
						//token and just validate it at the end. If it is, then the pattern itself
						//defines whether this field matches and we must run it immediately.

						if (_.isEmpty(textLines)) {
							return false;
						}
						textLines[0] = textLines[0].trim();

						var matchGroup = this.matchGroup || 0;
						var re         = new RegExp(this.pattern, this.caseSensitive ? '' : 'i');
						logger.debug('$$$ attempting to match value [$$$] against regexp $$$', this.name, textLines[0], re.toString());
						var match = textLines[0].match(re);

						if (match) {
							logger.debug('Successful match! $$$', match);
							myParseState.text = match[matchGroup];
							if (!myParseState.forPrevious && this.forPreviousMatchGroup) {
								logger.debug('Setting forPrevious to  $$$', match[this.forPreviousMatchGroup]);
								myParseState.forPrevious = match[this.forPreviousMatchGroup];
							}
							textLines[0] = textLines[0].slice(match.index + match[0].length);
							if (this.forNextMatchGroup && match[this.forNextMatchGroup]) {
								textLines[0] = match[this.forNextMatchGroup] + textLines[0];
							}

							if (!textLines[0]) {
								myParseState.text += '\n';
								textLines.shift();
							}
							return true;
						}
						else {
							logger.debug('Match failed');
						}
						return false;
					}
					else {
						logger.debug('$$$ standard string match, not using pattern', this.name);
						myParseState.text = '';
						return true;
					}

				},

				orderedContent: function (fieldSpec) {
					return this.makeContentModelParser(fieldSpec, true);
				},

				unorderedContent: function (fieldSpec) {
					return this.makeContentModelParser(fieldSpec, false);
				},

				string: function (fieldSpec) {
					return this.makeSimpleValueParser();
				},


				enumType: function (fieldSpec) {
					var parser = this.makeSimpleValueParser();

					if (fieldSpec.bare) {
						parser.matchValue = function (myParseState, textLines) {
							var parser     = this;
							var firstMatch = _.chain(fieldSpec.enumValues)
							.map(function (enumValue) {
								logger.debug('Attempting to parse as enum property $$$', enumValue);
								var pattern = '^(.*?)(' + enumValue + ')(?:[\\s.]+|$)';
								var re      = new RegExp(pattern, parser.caseSensitive ? '' : 'i');
								return textLines[0].match(re);
							})
							.compact()
							.sortBy(function (match) {
								return match[1].length;
							})
							.first()
							.value();


							if (firstMatch) {
								logger.debug('Finished trying to parse as enum property, match: $$$', firstMatch);
								myParseState.text        = firstMatch[2];
								myParseState.forPrevious = firstMatch[1];
								textLines[0]             = textLines[0].slice(firstMatch.index + firstMatch[0].length);
								if (!textLines[0]) {
									textLines.shift();
								}
								return true;
							}
							return false;

						};
					}
					return parser;
				},

				number: function (fieldSpec) {
					var parser         = this.makeSimpleValueParser();
					parser.typeConvert = function (textValue) {
						var parts = textValue.split('/');
						var intVal;
						if (parts.length > 1) {
							intVal = parts[0] / parts[1];
						}
						else {
							intVal = parseInt(textValue);
						}

						if (_.isNaN(intVal)) {
							throw 'Invalid integer value for field ' + fieldSpec.name + ' [' + textValue + ']';
						}
						return intVal;
					};
					return parser;
				},


				ability: function (fieldSpec) {
					var parser        = this.number();
					parser.matchValue = function (parseState, textLines) {
						if (_.isEmpty(textLines)) {
							return false;
						}
						var re = new RegExp('^([\\sa-z\\(\\)]*)(\\d+(?:\\s?\\([\\-+\\d]+\\))?)', 'i');
						logger.debug('Attempting to match value [$$$] against regexp $$$', textLines[0].trim(), re.toString());
						var match = textLines[0].trim().match(re);

						if (match) {
							logger.debug('Successful match $$$', match);
							parseState.text = match[2];
							textLines[0]    = match[1] + textLines[0].slice(match.index + match[0].length);
							if (!textLines[0]) {
								textLines.shift();
							}
							return true;
						}
						return false;
					};

					return parser;
				},

				heading: function (fieldSpec) {
					fieldSpec.bare    = true;
					var parser        = this.makeSimpleValueParser();
					parser.skipOutput = true;
					return parser;
				},

				makeSimpleValueParser: function () {
					var module = this;
					return {
						parse: function (stateManager, textLines) {
							var parseState = stateManager.enterChildParser(this);
							var match      = this.matchParseToken(parseState, textLines) &&
							this.matchValue(parseState, textLines);
							if (match) {
								stateManager.completeCurrentStack(parseState.forPrevious);
								delete parseState.forPrevious;
								stateManager.leaveChildParser(this, parseState);
							}
							else {
								stateManager.leaveChildParser(this);
							}
							return match;
						},
						complete: function (parseState, finalText) {
							parseState.text += finalText ? finalText : '';
							if (parseState.text) {
								parseState.value = this.extractValue(parseState.text);
								parseState.value = this.typeConvert(parseState.value);
								parseState.setOutputValue();
							}
						},
						extractValue: function (text) {
							text = text.trim();
							if (this.pattern && !this.bare) {


								var regExp = new RegExp(this.pattern, this.caseSensitive ? '' : 'i');
								var match  = text.match(regExp);
								if (match) {
									var matchGroup = this.matchGroup || 0;
									return match[matchGroup];
								}
								else {
									throw 'Invalid value [' + text + '] against pattern ' + regExp + ' for field [' + this.name + '] ';
								}
							}
							else {
								return text;
							}
						},
						typeConvert: function (textValue) {
							return textValue;
						},
						resumeParse: function (stateManager, textLines) {
							if (_.isEmpty(textLines)) {
								return false;
							}
							var parseState = stateManager.enterChildParser(this, true);
							parseState.text += textLines.shift() + '\n';
							stateManager.leaveChildParser(this, parseState);
							return true;
						},
						matchParseToken: module.matchParseToken,
						matchValue: module.matchValue
					};
				},

				makeBaseParseState: function (skipOutput, propertyPath, outputObject, completedObjects) {
					return {
						text: '',
						getObjectValue: function () {
							var value    = outputObject;
							var segments = _.clone(propertyPath);
							while (segments.length) {
								var prop = segments.shift();
								if (prop.flatten) {
									continue;
								}
								value = value[prop.name];
								if (_.isArray(value)) {
									value = _.last(value);
								}
							}
							return value;
						},
						setOutputValue: function () {
							if (skipOutput) {
								return;
							}
							var outputTo = outputObject;
							var segments = _.clone(propertyPath);
							while (segments.length > 0) {
								var prop = segments.shift();
								if (prop.flatten) {
									continue;
								}

								var currentValue = outputTo[prop.name];
								var newValue     = segments.length === 0 ? this.value : {};

								if (_.isUndefined(currentValue) && prop.allowed > 1) {
									currentValue        = [];
									outputTo[prop.name] = currentValue;
								}

								if (_.isArray(currentValue)) {
									var arrayItem = _.find(currentValue, _.partial(_.negate(_.contains), completedObjects));
									if (!arrayItem) {
										currentValue.push(newValue);
										arrayItem = _.last(currentValue);
									}
									newValue = arrayItem;
								}
								else if (_.isUndefined(currentValue)) {
									outputTo[prop.name] = newValue;
								}
								else if (segments.length === 0) {
									throw 'Simple value property somehow already had value when we came to set it';
								}
								else {
									newValue = currentValue;
								}

								outputTo = newValue;
							}
						},
						logWrap: 'parseState[' + _.pluck(propertyPath, 'name').join('/') + ']',
						toJSON: function () {
							return _.extend(_.clone(this), {propertyPath: propertyPath});
						}
					};
				},


				makeParseStateManager: function () {
					var incompleteParserStack = [];
					var currentPropertyPath   = [];
					var completedObjects      = [];
					var module                = this;
					return {
						outputObject: {},
						leaveChildParser: function (parser, state) {
							currentPropertyPath.pop();
							if (state) {
								state.resumeParser = _.isEmpty(incompleteParserStack) ? null : _.last(incompleteParserStack).parser;
								incompleteParserStack.push({parser: parser, state: state});
							}
						},
						completeCurrentStack: function (finalText) {
							while (!_.isEmpty(incompleteParserStack)) {
								var incomplete = incompleteParserStack.shift();
								incomplete.parser.complete(incomplete.state, finalText);
								var value = incomplete.state.getObjectValue();
								if (_.isObject(value)) {
									//Crude but this list is unlikely to get that big
									completedObjects.push(value);
								}
							}
						},
						enterChildParser: function (parser, resume) {
							currentPropertyPath.push({
								name: parser.attribute,
								allowed: parser.allowed,
								flatten: parser.flatten
							});

							if (!resume || _.isEmpty(incompleteParserStack) || parser !== _.last(incompleteParserStack).parser) {
								return module.makeBaseParseState(parser.skipOutput, _.clone(currentPropertyPath), this.outputObject, completedObjects);
							}

							return incompleteParserStack.pop().state;
						},
						logWrap: 'parserState',
						toJSON: function () {
							return _.extend(_.clone(this), {
								incompleteParsers: incompleteParserStack,
								propertyPath: currentPropertyPath
							});
						}

					};
				},

				parserId: 0,
				parserAttributes: ['attribute', 'forPreviousMatchGroup', 'forNextMatchGroup',
					'parseToken', 'flatten', 'pattern', 'matchGroup', 'bare', 'caseSensitive',
					'name', 'skipOutput'],
				getParserFor: function (fieldSpec) {
					logger.debug('Making parser for field $$$', fieldSpec);
					var parserBuilder = this[fieldSpec.type];
					if (!parserBuilder) {
						throw 'Can\'t make parser for type ' + fieldSpec.type;
					}
					var parser      = parserBuilder.call(this, fieldSpec);
					parser.required = _.isUndefined(fieldSpec.minOccurs) ? 1 : fieldSpec.minOccurs;
					parser.allowed  = _.isUndefined(fieldSpec.maxOccurs) ? 1 : fieldSpec.maxOccurs;
					_.extend(parser, _.pick(fieldSpec, this.parserAttributes));
					_.defaults(parser, {
						attribute: parser.name,
						parseToken: parser.name
					});
					parser.id      = this.parserId++;
					parser.logWrap = 'parser[' + parser.name + ']';
					return parser;
				},


				makeParserList: function (contentModelArray) {
					var module = this;
					return _.chain(contentModelArray)
					.reject('noParse')
					.reduce(function (parsers, fieldSpec) {
						parsers.push(module.getParserFor(fieldSpec));
						return parsers;
					}, [])
					.value();
				},

				logWrap: 'parseModule'
			};

			logger.wrapModule(parserModule);

			var parser = parserModule.getParserFor(formatSpec);
			return {
				parse: function (text) {
					logger.debug('Text: $$$', text);

					var textLines = _.chain(text.split('\n'))
					.invoke('trim')
					.compact()
					.value();
					logger.debug(parser);
					var stateManager = parserModule.makeParseStateManager();
					var success      = parser.parse(stateManager, textLines);
					while (success && !_.isEmpty(textLines)) {
						parser.resumeParse(stateManager, textLines);
					}

					stateManager.completeCurrentStack(textLines.join('\n'));

					if (success && textLines.length === 0) {
						logger.info(stateManager.outputObject);
						return stateManager.outputObject;
					}
					return null;
				}
			};

		}

		module.exports = getParser;


		/***/
	},
	/* 3 */
	/***/ function (module, exports) {

		module.exports = _;

		/***/
	},
	/* 4 */
	/***/ function (module, exports) {

		module.exports = {
			"name": "npc",
			"type": "orderedContent",
			"bare": true,
			"contentModel": [
				{
					"name": "coreInfo",
					"type": "orderedContent",
					"flatten": true,
					"contentModel": [
						{
							"name": "name",
							"attribute": "character_name",
							"type": "string",
							"bare": "true"
						},
						{
							"name": "size",
							"enumValues": [
								"Tiny",
								"Small",
								"Medium",
								"Large",
								"Huge",
								"Gargantuan"
							],
							"type": "enumType",
							"bare": "true"
						},
						{
							"name": "type",
							"type": "string",
							"bare": "true",
							"pattern": "^([\\w\\s\\(\\)]+),",
							"matchGroup": 1
						},
						{
							"name": "alignment",
							"type": "enumType",
							"enumValues": [
								"lawful good",
								"lawful neutral",
								"lawful evil",
								"neutral good",
								"neutral evil",
								"neutral",
								"chaotic good",
								"chaotic neutral",
								"chaotic evil",
								"unaligned",
								"any alignment",
								"any good alignment",
								"any evil alignment",
								"any lawful alignment",
								"any chaotic alignment"
							],
							"bare": true
						}
					]
				},
				{
					"name": "attributes",
					"type": "unorderedContent",
					"flatten": true,
					"contentModel": [
						{
							"name": "ac",
							"attribute": "ac_srd",
							"parseToken": "armor class",
							"pattern": "\\d+\\s*(?:\\([^)]*\\))?",
							"type": "string"
						},
						{
							"name": "hp",
							"parseToken": "hit points",
							"attribute": "hp_srd",
							"type": "string",
							"pattern": "\\d+(?:\\s?\\(\\s?\\d+d\\d+(?:\\s?[-+]\\s?\\d+)?\\s?\\))?"
						},
						{
							"name": "speed",
							"minOccurs": 0,
							"attribute": "npc_speed",
							"type": "string",
							"pattern": "^\\d+\\s?ft[\\.]?(,\\s?(fly|swim|burrow|climb)\\s\\d+\\s?ft[\\.]?)*(\\s?\\(hover\\))?$"
						},
						{
							"name": "strength",
							"parseToken": "str",
							"type": "ability"
						},
						{
							"name": "dexterity",
							"parseToken": "dex",
							"type": "ability"
						},
						{
							"name": "constitution",
							"parseToken": "con",
							"type": "ability"
						},
						{
							"name": "intelligence",
							"parseToken": "int",
							"type": "ability"
						},
						{
							"name": "wisdom",
							"parseToken": "wis",
							"type": "ability"
						},
						{
							"name": "charisma",
							"parseToken": "cha",
							"type": "ability"
						},
						{
							"name": "savingThrows",
							"minOccurs": 0,
							"attribute": "saving_throws_srd",
							"parseToken": "saving throws",
							"type": "string",
							"pattern": "(?:(?:^|,\\s*)(?:Str|Dex|Con|Int|Wis|Cha)\\s+[\\-\\+]\\d+)+"
						},
						{
							"name": "skills",
							"minOccurs": 0,
							"attribute": "skills_srd",
							"type": "string",
							"pattern": "(?:(?:^|,\\s*)(?:Acrobatics|Animal Handling|Arcana|Athletics|Deception|History|Insight|Intimidation|Investigation|Medicine|Nature|Perception|Performance|Persuasion|Religion|Slight of Hand|Stealth|Survival)\\s+[\\-\\+]\\d+)+"
						},
						{
							"attribute": "damage_vulnerabilities",
							"minOccurs": 0,
							"type": "string",
							"name": "vulnerabilties",
							"parseToken": "damage vulnerabilities"
						},
						{
							"attribute": "damage_resistances",
							"minOccurs": 0,
							"type": "string",
							"name": "resistances",
							"parseToken": "damage resistances"
						},
						{
							"attribute": "damage_immunities",
							"minOccurs": 0,
							"type": "string",
							"name": "immunities",
							"parseToken": "damage immunities"
						},
						{
							"attribute": "condition_immunities",
							"minOccurs": 0,
							"type": "string",
							"name": "conditionImmunities",
							"parseToken": "condition immunities"
						},
						{
							"name": "senses",
							"type": "string",
							"minOccurs": 0,
							"pattern": "(?:(?:^|,\\s*)(?:blindsight|darkvision|tremorsense|truesight)\\s+\\d+\\s*ft[\\.]?)+"
						},
						{
							"name": "passivePerception",
							"parseToken": ",?\\s*passive Perception",
							"minOccurs": 0,
							"type": "number",
							"skipOutput": true
						},
						{
							"name": "languages",
							"minOccurs": 0,
							"type": "string"
						}
					]
				},
				{
					"name": "challenge",
					"type": "number",
					"pattern": "^\\s*(\\d+(?:\\s*\\/\\s*\\d)?)\\s*(?:\\(\\s*[\\d,]+\\s*XP\\s*\\)\\s*)?$",
					"matchGroup": 1
				},
				{
					"name": "spellBook",
					"attribute": "spells_srd",
					"type": "string",
					"minOccurs": 0
				},
				{
					"name": "traitSection",
					"type": "orderedContent",
					"minOccurs": 0,
					"maxOccurs": 1,
					"flatten": true,
					"contentModel": [
						{
							"name": "traits",
							"type": "orderedContent",
							"minOccurs": 1,
							"maxOccurs": "Infinity",
							"contentModel": [
								{
									"name": "name",
									"type": "string",
									"pattern": "(^|.*?[a-z]\\.\\s?)([A-Z][\\w\\-']+(?:\\s(?:[A-Z][\\w\\-']+|of|and|or|a)+)*)(\\s?\\([^\\)]+\\))?\\.(?!$)",
									"matchGroup": 2,
									"forPreviousMatchGroup": 1,
									"forNextMatchGroup": 3,
									"bare": true,
									"caseSensitive": true
								},
								{
									"name": "recharge",
									"type": "string",
									"pattern": "^\\(([^\\)]+)\\)",
									"bare": true,
									"matchGroup": 1,
									"minOccurs": 0
								},
								{
									"name": "text",
									"bare": true,
									"type": "string"
								}
							]
						}
					]
				},
				{
					"name": "actionSection",
					"type": "orderedContent",
					"minOccurs": 0,
					"maxOccurs": 1,
					"flatten": true,
					"contentModel": [
						{
							"name": "actionHeader",
							"type": "heading",
							"bare": true,
							"pattern": "^Actions$"
						},
						{
							"name": "actions",
							"type": "orderedContent",
							"minOccurs": 1,
							"maxOccurs": "Infinity",
							"contentModel": [
								{
									"name": "name",
									"type": "string",
									"pattern": "(^|.*?[a-z]\\.\\s?)([A-Z][\\w\\-']+(?:\\s(?:[A-Z][\\w\\-']+|of|and|or|a)+)*)(\\s?\\([^\\)]+\\))?\\.(?!$)",
									"matchGroup": 2,
									"forPreviousMatchGroup": 1,
									"forNextMatchGroup": 3,
									"bare": true,
									"caseSensitive": true
								},
								{
									"name": "recharge",
									"type": "string",
									"bare": true,
									"pattern": "^\\(([^\\)]+)\\)",
									"matchGroup": 1,
									"minOccurs": 0
								},
								{
									"name": "text",
									"bare": true,
									"type": "string"
								}
							]
						}
					]
				},
				{
					"name": "reactionSection",
					"type": "orderedContent",
					"minOccurs": 0,
					"maxOccurs": 1,
					"flatten": true,
					"contentModel": [
						{
							"name": "reactionHeader",
							"type": "heading",
							"bare": true,
							"pattern": "^Reactions$"
						},
						{
							"name": "reactions",
							"type": "orderedContent",
							"minOccurs": 1,
							"maxOccurs": "Infinity",
							"contentModel": [
								{
									"name": "name",
									"type": "string",
									"pattern": "(^|.*?[a-z]\\.\\s?)([A-Z][\\w\\-']+(?:\\s(?:[A-Z][\\w\\-']+|of|and|or|a)+)*)(\\s?\\([^\\)]+\\))?\\.(?!$)",
									"matchGroup": 2,
									"forPreviousMatchGroup": 1,
									"forNextMatchGroup": 3,
									"bare": true,
									"caseSensitive": true
								},
								{
									"name": "recharge",
									"type": "string",
									"bare": true,
									"pattern": "^\\(([^\\)]+)\\)",
									"matchGroup": 1,
									"minOccurs": 0
								},
								{
									"name": "text",
									"bare": true,
									"type": "string"
								}
							]
						}
					]
				},
				{
					"name": "legendaryActionSection",
					"type": "orderedContent",
					"minOccurs": 0,
					"maxOccurs": 1,
					"flatten": true,
					"contentModel": [
						{
							"name": "actionHeader",
							"type": "heading",
							"bare": true,
							"pattern": "^Legendary Actions$"
						},
						{
							"name": "legendaryPoints",
							"type": "number",
							"bare": true,
							"pattern": "^The[ \\w]+can take (\\d+) legendary actions.*?start of its turn[.]?",
							"matchGroup": 1
						},
						{
							"name": "legendaryActions",
							"type": "orderedContent",
							"minOccurs": 1,
							"maxOccurs": "Infinity",
							"contentModel": [
								{
									"name": "name",
									"type": "string",
									"bare": true,
									"pattern": "(^|.*?[a-z]\\.\\s?)([A-Z][\\w\\-']+(?:\\s(?:[A-Z][\\w\\-']+|of|and|or|a)+)*)(\\s?\\([^\\)]+\\))?\\.(?!$)",
									"matchGroup": 2,
									"forPreviousMatchGroup": 1,
									"forNextMatchGroup": 3,
									"caseSensitive": true
								},
								{
									"name": "cost",
									"type": "number",
									"bare": true,
									"pattern": "^\\s*\\(\\s*costs (\\d+) actions\\s*\\)",
									"matchGroup": 1,
									"minOccurs": 0
								},
								{
									"name": "text",
									"bare": true,
									"type": "string"
								}
							]
						}
					]
				},
				{
					"name": "lairActions",
					"type": "orderedContent",
					"minOccurs": 0,
					"maxOccurs": 1,
					"flatten": true,
					"contentModel": [
						{
							"name": "actionHeader",
							"type": "heading",
							"bare": true,
							"pattern": "^Lair Actions$"
						},
						{
							"name": "lairActions",
							"type": "orderedContent",
							"minOccurs": 1,
							"maxOccurs": "Infinity",
							"contentModel": [
								{
									"name": "name",
									"type": "string",
									"bare": true,
									"pattern": "^([A-Z][\\w\\-']+(?:\\s(?:[A-Z][\\w\\-']+|of|and|or|a)+)*)\\s?\\.(?!$)",
									"matchGroup": 2,
									"forPreviousMatchGroup": 1,
									"caseSensitive": true
								},
								{
									"name": "text",
									"bare": true,
									"type": "string"
								}
							]
						}
					]
				}
			]
		};

		/***/
	},
	/* 5 */
	/***/ function (module, exports, __webpack_require__) {

		var _      = __webpack_require__(3);
		var roll20 = __webpack_require__(1);

		/**
		 *
		 * @param config
		 * @returns {{debug:function, error:function, info:function, trace:function, warn:function}}
		 */
		module.exports = function (config) {
			'use strict';

			var logger    = {
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
					message  = stringify(message);
					if (message) {
						message = message.replace(/\$\$\$/g, function () {
							return stringify(args.shift());
						});
					}
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
						var origFunc        = modToWrap[funcName];
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
						var retVal          = func.apply(this, arguments);
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


		/***/
	},
	/* 6 */
	/***/ function (module, exports, __webpack_require__) {

		var _ = __webpack_require__(3);

		var entities = {
			monster: {},
			spell: {}
		};

		module.exports = {

			addEntities: function (logger, type, entityArray, overwrite) {
				'use strict';
				if (!entities[type]) {
					throw 'Unrecognised entity type ' + type;
				}
				var addedCount = 0;
				_.each(entityArray, function (entity) {
					if (!entities[type][entity.name.toLowerCase()] || overwrite) {
						entities[type][entity.name.toLowerCase()] = entity;
						addedCount++;
					}
				});
				logger.info('Added $$$ entities of type $$$ to the lookup', addedCount, type);
				logger.info(this);
			},
			findEntity: function (type, name) {
				'use strict';
				if (!entities[type]) {
					throw 'Unrecognised entity type ' + type;
				}
				return entities[type][name.toLowerCase()];
			},
			logWrap: 'entityLookup',
			toJSON: function () {
				'use strict';
				return {monsterCount: _.size(entities.monster), spellCount: _.size(entities.spell)};
			}
		};


		/***/
	},
	/* 7 */
	/***/ function (module, exports, __webpack_require__) {

		var _            = __webpack_require__(3);
		var srdConverter = __webpack_require__(8);

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
			var sanitise      = logger.wrapFunction('sanitise', __webpack_require__(9), '');
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


		/***/
	},
	/* 8 */
	/***/ function (module, exports, __webpack_require__) {

		var _ = __webpack_require__(3);

		/* jshint camelcase : false */
		function getRenameMapper(newName) {
			'use strict';
			return function (key, value, output) {
				output[newName] = value;
			};
		}

		var identityMapper     = function (key, value, output) {
				'use strict';
				output[key] = value;
			},
			booleanMapper      = function (key, value, output) {
				'use strict';
				if (value) {
					output[key] = 'Yes';
				}
			},
			camelCaseFixMapper = function (key, value, output) {
				'use strict';
				var newKey     = key.replace(/([A-Z])/g, function (letter) {
					return '_' + letter.toLowerCase();
				});
				output[newKey] = value;
			},
			castingStatMapper  = function (key, value, output) {
				'use strict';
				if (value) {
					output.add_casting_modifier = 'Yes';
				}
			},
			componentMapper    = function (key, value, output) {
				'use strict';
				output.components = _.chain(value)
				.map(function (value, key) {
					if (key !== 'materialMaterial') {
						return key.toUpperCase().slice(0, 1);
					}
					else {
						output.materials = value;
					}

				})
				.compact()
				.value()
				.join(' ');
			},
			saveAttackMappings = {
				ability: getRenameMapper('save'),
				damage: identityMapper,
				damageBonus: camelCaseFixMapper,
				damageType: camelCaseFixMapper,
				saveSuccess: getRenameMapper('saving_throw_success'),
				saveFailure: getRenameMapper('saving_throw_failure'),
				higherLevelDice: camelCaseFixMapper,
				higherLevelDie: camelCaseFixMapper,
				secondaryDamage: getRenameMapper('second_damage'),
				secondaryDamageBonus: getRenameMapper('second_damage_bonus'),
				secondaryDamageType: getRenameMapper('second_damage_type'),
				higherLevelSecondaryDice: getRenameMapper('second_higher_level_dice'),
				higherLevelSecondaryDie: getRenameMapper('second_higher_level_die'),
				condition: getRenameMapper('saving_throw_condition'),
				castingStat: castingStatMapper
			}
		;

		function getObjectMapper(mappings) {
			'use strict';
			return function (key, value, output) {
				_.each(value, function (propVal, propName) {
					var mapper = mappings[propName];
					if (!mapper) {
						throw 'Unrecognised property when attempting to convert to srd format: [' + propName + '] ' + JSON.stringify(output);
					}
					mapper(propName, propVal, output);
				});
			};
		}

		var spellMapper = getObjectMapper({
			name: identityMapper,
			duration: identityMapper,
			level: getRenameMapper('spell_level'),
			school: identityMapper,
			emote: identityMapper,
			range: identityMapper,
			castingTime: camelCaseFixMapper,
			target: identityMapper,
			description: function (key, value, output) {
				'use strict';
				output.content = value + (output.content ? '\n' + output.content : '');
			},
			higherLevel: function (key, value, output) {
				'use strict';
				//TODO make this configurable
				output.content = (output.content ? output.content + '\n' : '') + value;
			},
			ritual: booleanMapper,
			concentration: booleanMapper,
			save: getObjectMapper(saveAttackMappings),
			attack: getObjectMapper(saveAttackMappings),
			damage: getObjectMapper(saveAttackMappings),
			heal: getObjectMapper({
				amount: getRenameMapper('heal'),
				castingStat: castingStatMapper,
				higherLevelDice: camelCaseFixMapper,
				higherLevelDie: camelCaseFixMapper,
				higherLevelAmount: getRenameMapper('higher_level_heal'),
				bonus: getRenameMapper('heal_bonus')
			}),
			components: componentMapper,
			classes: _.noop,
			aoe: _.noop,
			source: _.noop,
			effects: _.noop,
			domains: _.noop,
			oaths: _.noop,
			circles: _.noop,
			patrons: _.noop
		});

		module.exports = {

			convertMonster: function (npcObject) {
				'use strict';

				var output = _.clone(npcObject);

				var actionTraitTemplate = _.template('**<%=data.name%><% if(data.recharge) { print(" (" + data.recharge + ")") } %>**: <%=data.text%>', {variable: 'data'});
				var legendaryTemplate   = _.template('**<%=data.name%><% if(data.cost && data.cost > 1){ print(" (Costs " + data.cost + " actions)") }%>**: <%=data.text%>', {variable: 'data'});

				var simpleSectionTemplate    = _.template('<%=data.title%>\n<% print(data.items.join("\\n")); %>', {variable: 'data'});
				var legendarySectionTemplate = _.template('<%=data.title%>\nThe <%=data.name%> can take <%=data.legendaryPoints%> legendary actions, ' +
				'choosing from the options below. It can take only one legendary action at a time and only at the end of another creature\'s turn.' +
				' The <%=data.name%> regains spent legendary actions at the start of its turn.\n<% print(data.items.join("\\n")) %>', {variable: 'data'});

				var srdContentSections = [
					{prop: 'traits', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
					{prop: 'actions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
					{prop: 'reactions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
					{
						prop: 'legendaryActions',
						itemTemplate: legendaryTemplate,
						sectionTemplate: legendarySectionTemplate
					}
				];

				var makeDataObject = function (propertyName, itemList) {
					return {
						title: propertyName.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, function (letter) {
							return letter.toUpperCase();
						}),
						name: output.character_name,
						legendaryPoints: output.legendaryPoints,
						items: itemList
					};
				};

				output.is_npc    = 1;
				output.edit_mode = 'off';

				output.content_srd = _.chain(srdContentSections)
				.map(function (sectionSpec) {
					var items = output[sectionSpec.prop];
					delete output[sectionSpec.prop];
					return _.map(items, sectionSpec.itemTemplate);
				})
				.map(function (sectionItems, sectionIndex) {
					var sectionSpec = srdContentSections[sectionIndex];
					if (!_.isEmpty(sectionItems)) {
						return sectionSpec.sectionTemplate(makeDataObject(sectionSpec.prop, sectionItems));
					}

					return null;
				})
				.compact()
				.value()
				.join('\n');

				delete output.legendaryPoints;

				return output;

			},


			convertSpells: function (spellObjects) {
				'use strict';

				return _.map(spellObjects, function (spellObject) {
					var converted = {};
					spellMapper(null, spellObject, converted);
					return converted;
				});
			}
			/* jshint camelcase : true */
		};


		/***/
	},
	/* 9 */
	/***/ function (module, exports) {

		function sanitise(statblock, logger) {
			'use strict';

			statblock = statblock
			.replace(/\s+([\.,;:])/g, '$1')
			.replace(/\n+/g, '#')
			.replace(/–/g, '-')
			.replace(/<br[^>]*>/g, '#')
			.replace(/#+/g, '#')
			.replace(/\s*#\s*/g, '#')
			.replace(/(<([^>]+)>)/gi, '')
			.replace(/legendary actions/gi, 'Legendary Actions')
			.replace(/(\S)\sACTIONS/, '$1#ACTIONS')
			.replace(/#(?=[a-z]|DC)/g, ' ')
			.replace(/\s+/g, ' ')
			.replace(/#Hit:/gi, 'Hit:')
			.replace(/Hit:#/gi, 'Hit: ')
			.replace(/#Each /gi, 'Each ')
			.replace(/#On a successful save/gi, 'On a successful save')
			.replace(/DC#(\d+)/g, 'DC $1')
			.replace('LanguagesChallenge', 'Languages -\nChallenge')
			.replace('\' Speed', 'Speed')
			.replace(/(\w+) s([\s\.,])/g, '$1s$2')
			.replace(/#Medium or/gi, ' Medium or')
			.replace(/take#(\d+)/gi, 'take $1')
			.replace(/#/g, '\n');

			logger.debug('First stage cleaned statblock: $$$', statblock);

			//Sometimes the texts ends up like 'P a r a l y z i n g T o u c h . M e l e e S p e l l A t t a c k : + 1 t o h i t
			//In this case we can fix the title case stuff, because we can find the word boundaries. That will at least meaning
			//that the core statblock parsing will work. If this happens inside the lowercase body text, however, there's nothing
			//we can do about it because you need to understand the natural language to reinsert the word breaks properly.
			statblock = statblock.replace(/([A-Z])(\s[a-z]){2,}/g, function (match, p1) {
				return p1 + match.slice(1).replace(/\s([a-z])/g, '$1');
			});


			//Conversely, sometimes words get mushed together. Again, we can only fix this for title case things, but that's
			//better than nothing
			statblock = statblock.replace(/([A-Z][a-z]+)(?=[A-Z])/g, '$1 ');

			//This covers abilites that end up as 'C O N' or similar
			statblock = statblock.replace(/^[A-Z]\s?[A-Z]\s?[A-Z](?=\s|$)/mg, function (match) {
				return match.replace(/\s/g, '');
			});

			statblock = statblock
			.replace(/,\./gi, ',')
			.replace(/(^| )l /gm, '$11 ')
			.replace(/ft\s\./gi, 'ft.')
			.replace(/ft\.\s,/gi, 'ft')
			.replace(/ft\./gi, 'ft')
			.replace(/(\d+) ft\/(\d+) ft/gi, '$1/$2 ft')
			.replace(/lOd/g, '10d')
			.replace(/dl0/gi, 'd10')
			.replace(/dlO/gi, 'd10')
			.replace(/dl2/gi, 'd12')
			.replace(/S(\d+)d(\d+)/gi, '5$1d$2')
			.replace(/l(\d+)d(\d+)/gi, '1$1d$2')
			.replace(/l(\d+)d\s+(\d+)/gi, '1$1d$2')
			.replace(/(\d+)d\s+(\d+)/gi, '$1d$2')
			.replace(/(\d+)\s+d(\d+)/gi, '$1d$2')
			.replace(/(\d+)\s+d(\d+)/gi, '$1d$2')
			.replace(/(\d+)d(\d)\s(\d)/gi, '$1d$2$3')
			.replace(/(\d+)j(?:Day|day)/gi, '$1/Day')
			.replace(/(\d+)f(?:Day|day)/gi, '$1/Day')
			.replace(/(\d+)j(\d+)/gi, '$1/$2')
			.replace(/(\d+)f(\d+)/gi, '$1/$2')
			.replace(/{/gi, '(')
			.replace(/}/gi, ')')
			.replace(/(\d+)\((\d+) ft/gi, '$1/$2 ft')
			.replace(/• /gi, '')
			.replace(/’/gi, '\'');


			statblock      = statblock.replace(/(\d+)\s*?plus\s*?((?:\d+d\d+)|(?:\d+))/gi, '$2 + $1');
			var replaceObj = {
				'jday': '/day',
				'abol eth': 'aboleth',
				'ACT IONS': 'ACTIONS',
				'Afrightened': 'A frightened',
				'Alesser': 'A lesser',
				'Athl etics': 'Athletics',
				'blindn ess': 'blindness',
				'blind sight': 'blindsight',
				'bofh': 'both',
				'brea stplate': 'breastplate',
				'Can trips': 'Cantrips',
				'choos in g': 'choosing',
				'com muni cate': 'communicate',
				'Constituti on': 'Constitution',
				'creatu re': 'creature',
				'darkvi sion': 'darkvision',
				'dea ls': 'deals',
				'di sease': 'disease',
				'di stance': 'distance',
				'fa lls': 'falls',
				'fe et': 'feet',
				'exha les': 'exhales',
				'ex istence': 'existence',
				'lfthe': 'If the',
				'Ifthe': 'If the',
				'ifthe': 'if the',
				'lnt': 'Int',
				'magica lly': 'magically',
				'Med icine': 'Medicine',
				'minlilte': 'minute',
				'natura l': 'natural',
				'ofeach': 'of each',
				'ofthe': 'of the',
				'on\'e': 'one',
				'on ly': 'only',
				'0n': 'on',
				'pass ive': 'passive',
				'Perce ption': 'Perception',
				'radi us': 'radius',
				'ra nge': 'range',
				'rega ins': 'regains',
				'rest.oration': 'restoration',
				'savin g': 'saving',
				'si lvery': 'silvery',
				's lashing': 'slashing',
				'slas hing': 'slashing',
				'slash in g': 'slashing',
				'slash ing': 'slashing',
				'Spel/casting': 'Spellcasting',
				'successfu l': 'successful',
				'ta rget': 'target',
				' Th e ': ' The ',
				't_urns': 'turns',
				'unti l': 'until',
				'withi n': 'within'
			};
			var re         = new RegExp(Object.keys(replaceObj).join('|'), 'g');
			statblock      = statblock.replace(re, function (matched) {
				return replaceObj[matched];
			});

			logger.debug('Final stage cleaned statblock: $$$', statblock);
			return statblock;

		}

		module.exports = sanitise;


		/***/
	}
	/******/]);
