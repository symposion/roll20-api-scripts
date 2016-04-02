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

		/* globals fifthSpells, fifthMonsters */
		var roll20 = __webpack_require__(1);
		var parseModule = __webpack_require__(2);
		var mmFormat = __webpack_require__(4);
		var myState = roll20.getState('ShapedScripts');
		var logger = __webpack_require__(5)(myState.config);
		var entityLookup = __webpack_require__(6);
		var shaped = __webpack_require__(7)(logger, myState, roll20, parseModule.getParser(mmFormat, logger), entityLookup);
		var _ = __webpack_require__(3);

		logger.wrapModule(entityLookup);
		logger.wrapModule(roll20);

		var versionCompare = function (v1, v2) {
			'use strict';

			if (v1 === v2) {
				return 0;
			}
			else if (v1 === undefined || v1 === null) {
				return -1;
			}
			else if (v2 === undefined || v2 === null) {
				return 1;
			}

			var v1parts = v1.split('.');
			var v2parts = v2.split('.');

			var isValidPart = function (x) {
				return /^\d+$/.test(x);
			};

			if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
				return NaN;
			}

			v1parts = _.map(v1parts, Number);
			v2parts = _.map(v2parts, Number);

			for (var i = 0; i < v1parts.length; ++i) {
				if (v2parts.length === i) {
					return 1;
				}

				if (v1parts[i] > v2parts[i]) {
					return 1;
				} else if (v1parts[i] < v2parts[i]) {
					return -1;
				}
			}

			if (v1parts.length !== v2parts.length) {
				return -1;
			}

			return 0;
		};

		roll20.on('ready', function () {
			'use strict';
			if (typeof fifthMonsters !== 'undefined') {
				if (versionCompare(fifthMonsters.version, '0.1') >= 0) {
					//noinspection JSUnresolvedVariable
					entityLookup.addEntities(logger, 'monster', fifthMonsters.monsters);
				}
				else {
					roll20.sendChat('Shaped Scripts', '/w gm Incompatible version of monster data file used, please upgrade to the latest version');
				}
			}
			if (typeof fifthSpells !== 'undefined') {
				if (versionCompare(fifthSpells.version, '0.1') >= 0) {
					entityLookup.addEntities(logger, 'spell', fifthSpells.spells);
				}
				else {
					roll20.sendChat('Shaped Scripts', '/w gm Incompatible version of spell data file used, please upgrade to the latest version');
				}
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

			getAttrObjectByName: function (character, attrName) {
				'use strict';
				var attr = this.findObjs({type: 'attribute', characterid: character, name: attrName});
				return attr && attr.length > 0 ? attr[0] : null;
			},

			getOrCreateAttr: function (characterId, attrName) {
				'use strict';
				var attrSpec = {type: 'attribute', characterid: characterId, name: attrName};
				var attribute = this.findObjs(attrSpec);
				switch (attribute.length) {
					case 0:
						return this.createObj('attribute', attrSpec);
					case 1:
						return attribute[0];
					default:
						throw new Error('Asked for a single attribute [' + attrName + '] for character [' + characterId + '] but more than one found');
				}
			},

			setAttrByName: function (characterId, attrName, value) {
				'use strict';
				this.getOrCreateAttr(characterId, attrName).set('current', value);
			},

			processAttrValue: function (characterId, attrName, cb) {
				'use strict';
				var attribute = this.getOrCreateAttr(characterId, attrName);
				attribute.set('current', cb(attribute.get('current')));
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
									someMatch = someMatch || stopParser.justMatched;
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
								throw new MissingContentError(missingContent);
							}
						}
					};
				},

				matchParseToken: function (myParseState, textLines) {
					if (_.isEmpty(textLines) || this.bare) {
						return !_.isEmpty(textLines);
					}

					var re = new RegExp('^(.*?)(' + this.parseToken + ')(?:[\\s.]+|$)', 'i');
					var match = textLines[0].match(re);
					if (match) {
						logger.debug('Found match $$$', match[0]);
						myParseState.forPrevious = match[1];
						myParseState.text = '';
						textLines[0] = textLines[0].slice(match[0].length).trim();
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
						var re = new RegExp(this.pattern, this.caseSensitive ? '' : 'i');
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
							var parser = this;
							var firstMatch = _.chain(fieldSpec.enumValues)
							.map(function (enumValue) {
								logger.debug('Attempting to parse as enum property $$$', enumValue);
								var pattern = '^(.*?)(' + enumValue + ')(?:[\\s.]+|$)';
								var re = new RegExp(pattern, parser.caseSensitive ? '' : 'i');
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
								myParseState.text = firstMatch[2];
								myParseState.forPrevious = firstMatch[1];
								textLines[0] = textLines[0].slice(firstMatch.index + firstMatch[0].length);
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
					var parser = this.makeSimpleValueParser();
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
							throw new BadValueError(fieldSpec.name, textValue, '[Integer]');
						}
						return intVal;
					};
					return parser;
				},


				ability: function (fieldSpec) {
					var parser = this.number();
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
							textLines[0] = match[1] + textLines[0].slice(match.index + match[0].length);
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
					fieldSpec.bare = true;
					var parser = this.makeSimpleValueParser();
					parser.skipOutput = true;
					return parser;
				},

				makeSimpleValueParser: function () {
					var module = this;
					return {
						parse: function (stateManager, textLines) {
							var parseState = stateManager.enterChildParser(this);
							var match = this.matchParseToken(parseState, textLines) &&
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
								var match = text.match(regExp);
								if (match) {
									var matchGroup = this.matchGroup || 0;
									return match[matchGroup];
								}
								else {
									throw new BadValueError(this.name, text, regExp);
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
							var value = outputObject;
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
								var newValue = segments.length === 0 ? this.value : {};

								if (_.isUndefined(currentValue) && prop.allowed > 1) {
									currentValue = [];
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
									throw new Error('Simple value property somehow already had value when we came to set it');
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
					var currentPropertyPath = [];
					var completedObjects = [];
					var module = this;
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
								name: parser.name,
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
				parserAttributes: ['forPreviousMatchGroup', 'forNextMatchGroup',
					'parseToken', 'flatten', 'pattern', 'matchGroup', 'bare', 'caseSensitive',
					'name', 'skipOutput'],
				getParserFor: function (fieldSpec) {
					logger.debug('Making parser for field $$$', fieldSpec);
					var parserBuilder = this[fieldSpec.type];
					if (!parserBuilder) {
						throw new Error('Can\'t make parser for type ' + fieldSpec.type);
					}
					var parser = parserBuilder.call(this, fieldSpec);
					parser.required = _.isUndefined(fieldSpec.minOccurs) ? 1 : fieldSpec.minOccurs;
					parser.allowed = _.isUndefined(fieldSpec.maxOccurs) ? 1 : fieldSpec.maxOccurs;
					_.extend(parser, _.pick(fieldSpec, this.parserAttributes));
					_.defaults(parser, {
						parseToken: parser.name
					});
					parser.id = this.parserId++;
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
					var success = parser.parse(stateManager, textLines);
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

		/**
		 * @constructor
		 */
		function ParserError(message) {
			'use strict';
			this.message = message;
		}

		ParserError.prototype = new Error();

		/**
		 * @constructor
		 */
		function MissingContentError(missingFieldParsers) {
			'use strict';
			this.missingFieldParsers = missingFieldParsers;
			this.message = _.reduce(this.missingFieldParsers, function (memo, parser) {
				return memo + '<li>Field ' + parser.parseToken + ' should have appeared ' + parser.required + ' more times</li>';
			}, '<ul>') + '</ul>';
		}

		MissingContentError.prototype = new ParserError();

		/**
		 * @constructor
		 */
		function BadValueError(name, value, pattern) {
			'use strict';
			this.name = name;
			this.value = value;
			this.pattern = pattern;
			this.message = 'Bad value [' + this.value + '] for field [' + this.name + ']. Should have matched pattern: ' + this.pattern;
		}

		BadValueError.prototype = new ParserError();

		module.exports = {
			getParser: getParser,
			MissingContentError: MissingContentError,
			BadValueError: BadValueError,
			ParserError: ParserError
		};


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
							"name": "AC",
							"parseToken": "armor class",
							"pattern": "\\d+\\s*(?:\\([^)]*\\))?",
							"type": "string"
						},
						{
							"name": "HP",
							"parseToken": "hit points",
							"type": "string",
							"pattern": "\\d+(?:\\s?\\(\\s?\\d+d\\d+(?:\\s?[-+]\\s?\\d+)?\\s?\\))?"
						},
						{
							"name": "speed",
							"minOccurs": 0,
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
							"parseToken": "saving throws",
							"type": "string",
							"pattern": "(?:(?:^|,\\s*)(?:Str|Dex|Con|Int|Wis|Cha)\\s+[\\-\\+]\\d+)+"
						},
						{
							"name": "skills",
							"minOccurs": 0,
							"type": "string",
							"pattern": "(?:(?:^|,\\s*)(?:Acrobatics|Animal Handling|Arcana|Athletics|Deception|History|Insight|Intimidation|Investigation|Medicine|Nature|Perception|Performance|Persuasion|Religion|Slight of Hand|Stealth|Survival)\\s+[\\-\\+]\\d+)+"
						},
						{
							"minOccurs": 0,
							"type": "string",
							"name": "damageVulnerabilties",
							"parseToken": "damage vulnerabilities"
						},
						{
							"minOccurs": 0,
							"type": "string",
							"name": "damageResistances",
							"parseToken": "damage resistances"
						},
						{
							"minOccurs": 0,
							"type": "string",
							"name": "damageImmunities",
							"parseToken": "damage immunities"
						},
						{
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
					"type": "string",
					"pattern": "^\\s*(\\d+(?:\\s*\\/\\s*\\d)?)\\s*(?:\\(\\s*[\\d,]+\\s*XP\\s*\\)\\s*)?$",
					"matchGroup": 1
				},
				{
					"name": "spellBook",
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
									"pattern": "(^|.*?[a-z]\\.\\s?)((?:\\d+\\.\\s?)?[A-Z][\\w\\-']+(?:\\s(?:[A-Z][\\w\\-']+|of|and|or|a)+)*)(\\s?\\([^\\)]+\\))?\\.(?!$)",
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
				}
			]
		};

		/***/
	},
	/* 5 */
	/***/ function (module, exports, __webpack_require__) {

		var _ = __webpack_require__(3);
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
					var key = entity.name.toLowerCase();
					if (!entities[type][key] || overwrite) {
						entities[type][key] = entity;
						entities[type][key.replace(/\s+/g, '')] = entity;
						addedCount++;
					}
				});
				logger.info('Added $$$ entities of type $$$ to the lookup', addedCount, type);
				logger.info(this);
			},
			findEntity: function (type, name, tryWithoutWhitespace) {
				'use strict';
				var key = name.toLowerCase();
				if (!entities[type]) {
					throw 'Unrecognised entity type ' + type;
				}
				var found = entities[type][key];
				if (!found && tryWithoutWhitespace) {
					found = entities[type][key.replace(/\s+/g, '')];
				}
				return found && JSON.parse(JSON.stringify(found));
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

		/* globals unescape */
		'use strict';
		var _ = __webpack_require__(3);
		var srdConverter = __webpack_require__(8);
		var parseModule = __webpack_require__(2);
		var cp = __webpack_require__(9);
		var utils = __webpack_require__(10);
		var mpp = __webpack_require__(11);

		var version        = '0.3.3',
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
		 * @returns {{handleInput: function, configOptionsSpec: object, configure: function, importStatblock: function, importMonstersFromJson: function, importSpellsFromJson: function, createNewCharacter: function, getImportDataWrapper: function, handleAddToken: function, handleChangeToken: function, rollHPForToken: function, checkForAmmoUpdate: function, checkForDeathSave: function, getRollTemplateOptions: function, processInlinerolls: function, checkInstall: function, registerEventHandlers: function, logWrap: string}}
		 */
		module.exports = function (logger, myState, roll20, parser, entityLookup) {
			var sanitise = logger.wrapFunction('sanitise', __webpack_require__(12), '');
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
							var processedNpc = mpp(parser.parse(text).npc, entityLookup);
							//noinspection JSUnresolvedVariable
							var character = self.createNewCharacter(processedNpc, token, options.overwrite);
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
						self.hydrateSpellList(monsterData);
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
					this.addSpellsToCharacter(options.selected.character, options.spells);
				},

				addSpellsToCharacter: function (character, spells) {
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
					report('Import Success', 'Added the following spells:  <ul><li>' + _.map(importData.spells, function (spell) {
						return spell.name;
					}).join('</li><li>') + '</li></ul>');
				},

				hydrateSpellList: function (monster) {
					if (!monster.spells) {
						return;
					}
					monster.spells = _.map(monster.spells.split(', '), function (spellName) {
						return entityLookup.findEntity('spell', spellName) || spellName;
					});
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

					var expandedSpells = converted.spells;
					delete converted.spells;
					this.getImportDataWrapper(character).setNewImportData({npc: converted});
					if (expandedSpells) {
						this.addSpellsToCharacter(character, expandedSpells);
					}

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
							token.set('showplayers_' + barName, bar.showPlayers);
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
				var newKey = key.replace(/[A-Z]/g, function (letter) {
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
				ability: getRenameMapper('saving_throw_vs_ability'),
				type: identityMapper,
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


		var monsterMapper = getObjectMapper({
			name: getRenameMapper('character_name'),
			size: identityMapper,
			type: identityMapper,
			alignment: identityMapper,
			AC: getRenameMapper('ac_srd'),
			HP: getRenameMapper('hp_srd'),
			speed: getRenameMapper('npc_speed'),
			strength: identityMapper,
			dexterity: identityMapper,
			constitution: identityMapper,
			intelligence: identityMapper,
			wisdom: identityMapper,
			charisma: identityMapper,
			skills: getRenameMapper('skills_srd'),
			spells: function (key, value, output) {
				'use strict';
				var splitSpells = _.partition(value, _.isObject);
				if (!_.isEmpty(splitSpells[1])) {
					output.spells_srd = splitSpells[1].join(', ');
				}
				if (!_.isEmpty(splitSpells[0])) {
					output.spells = splitSpells[0];
				}
			},
			savingThrows: getRenameMapper('saving_throws_srd'),
			damageResistances: getRenameMapper('damage_resistances'),
			damageImmunities: getRenameMapper('damage_immunities'),
			conditionImmunities: getRenameMapper('condition_immunities'),
			damageVulnerabilities: getRenameMapper('damage_vulnerabilities'),
			senses: identityMapper,
			languages: identityMapper,
			challenge: identityMapper,
			traits: identityMapper,
			actions: identityMapper,
			reactions: identityMapper,
			regionalEffects: identityMapper,
			regionalEffectsFade: identityMapper,
			legendaryPoints: identityMapper,
			legendaryActions: identityMapper,
			lairActions: identityMapper
		});

		var pronounTokens = {
			'{{GENDER_PRONOUN_HE_SHE}}': 'nominative',
			'{{GENDER_PRONOUN_HIM_HER}}': 'accusative',
			'{{GENDER_PRONOUN_HIS_HER}}': 'possessive',
			'{{GENDER_PRONOUN_HIMSELF_HERSELF}}': 'reflexive'
		};


		module.exports = {

			convertMonster: function (npcObject) {
				'use strict';

				var output = {};
				monsterMapper(null, npcObject, output);

				var actionTraitTemplate = _.template('**<%=data.name%><% if(data.recharge) { print(" (" + data.recharge + ")") } %>**: <%=data.text%>', {variable: 'data'});
				var legendaryTemplate = _.template('**<%=data.name%><% if(data.cost && data.cost > 1){ print(" (Costs " + data.cost + " actions)") }%>**: <%=data.text%>', {variable: 'data'});
				var lairRegionalTemplate = function (item) {
					return '**' + item;
				};

				var simpleSectionTemplate = _.template('<%=data.title%>\n<% print(data.items.join("\\n")); %>', {variable: 'data'});
				var legendarySectionTemplate = _.template('<%=data.title%>\nThe <%=data.name%> can take <%=data.legendaryPoints%> legendary actions, ' +
				'choosing from the options below. It can take only one legendary action at a time and only at the end of another creature\'s turn.' +
				' The <%=data.name%> regains spent legendary actions at the start of its turn.\n<% print(data.items.join("\\n")) %>', {variable: 'data'});
				var regionalSectionTemplate = _.template('<%=data.title%>\n<% print(data.items.join("\\n")); %>\n**<%=data.regionalEffectsFade%>', {variable: 'data'});

				var srdContentSections = [
					{prop: 'traits', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
					{prop: 'actions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
					{prop: 'reactions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
					{
						prop: 'legendaryActions',
						itemTemplate: legendaryTemplate,
						sectionTemplate: legendarySectionTemplate
					},
					{prop: 'lairActions', itemTemplate: lairRegionalTemplate, sectionTemplate: simpleSectionTemplate},
					{
						prop: 'regionalEffects',
						itemTemplate: lairRegionalTemplate,
						sectionTemplate: regionalSectionTemplate
					}
				];

				var makeDataObject = function (propertyName, itemList) {
					return {
						title: propertyName.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, function (letter) {
							return letter.toUpperCase();
						}),
						name: output.character_name,
						legendaryPoints: output.legendaryPoints,
						regionalEffectsFade: output.regionalEffectsFade,
						items: itemList
					};
				};

				output.is_npc = 1;
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


			convertSpells: function (spellObjects, pronounInfo) {
				'use strict';


				return _.map(spellObjects, function (spellObject) {
					var converted = {};
					spellMapper(null, spellObject, converted);
					if (converted.emote) {
						_.each(pronounTokens, function (pronounType, token) {
							var replacement = pronounInfo[pronounType];
							converted.emote = converted.emote.replace(token, replacement);
						});
					}
					return converted;
				});

			}
			/* jshint camelcase : true */
		};


		/***/
	},
	/* 9 */
	/***/ function (module, exports, __webpack_require__) {

		var _ = __webpack_require__(3);
		var roll20 = __webpack_require__(1);
		var utils = __webpack_require__(10);


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


		/***/
	},
	/* 10 */
	/***/ function (module, exports, __webpack_require__) {

		var _ = __webpack_require__(3);

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


		/***/
	},
	/* 11 */
	/***/ function (module, exports, __webpack_require__) {

		'use strict';
		var _ = __webpack_require__(3);

		var levelStrings = ['Cantrips ', '1st level ', '2nd level ', '3rd level '];
		_.each(_.range(4, 10), function (level) {
			levelStrings[level] = level + 'th level ';
		});

		var spellcastingHandler = {
			splitRegex: /(Cantrips|(?:1st|2nd|3rd|[4-9]th)\s*level)\s*\(([^\)]+)\)\s*:/i,

			makeLevelDetailsObject: function (match) {
				var levelMatch = match[1].match(/\d/);
				return {
					level: levelMatch ? parseInt(levelMatch[0]) : 0,
					slots: match[2]
				};
			},

			setLevelDetailsString: function (levelDetails) {
				levelDetails.newText = levelStrings[levelDetails.level] + '(' + levelDetails.slots + '): ';
				levelDetails.newText += levelDetails.spells.join(', ');
			}

		};

		var innateHandler = {
			splitRegex: /(At\s?will|\d\s?\/\s?day)(?:\s?each)?\s?:/i,

			makeLevelDetailsObject: function (match) {
				var usesMatch = match[1].match(/\d/);
				return {
					uses: usesMatch ? parseInt(usesMatch[0]) : 0,
					slots: match[2]
				};
			},

			setLevelDetailsString: function (levelDetails) {
				levelDetails.newText = levelDetails.uses === 0 ? 'At will' : levelDetails.uses + '/day';
				if (levelDetails.spells.length > 1) {
					levelDetails.newText += ' each';
				}
				levelDetails.newText += ': ';
				levelDetails.newText += levelDetails.spells.join(', ');
			}

		};


		function processSpellcastingTrait(traits, traitName, traitHandler, entityLookup) {
			var trait = _.findWhere(traits, {name: traitName});
			if (trait) {
				var spellList = trait.text.substring(trait.text.indexOf(':') + 1).replace('\n', ' ');
				var castingDetails = trait.text.substring(0, trait.text.indexOf(':'));
				var levelDetails = [];
				var match;
				while ((match = traitHandler.splitRegex.exec(spellList)) !== null) {
					if (_.last(levelDetails)) {
						_.last(levelDetails).spells = spellList.slice(0, match.index);
					}
					levelDetails.push(traitHandler.makeLevelDetailsObject(match));
					spellList = spellList.slice(match.index + match[0].length);
				}
				if (_.last(levelDetails)) {
					_.last(levelDetails).spells = spellList;
				}

				var spellDetailsByLevel = _.chain(levelDetails)
				.each(function (levelDetails) {
					levelDetails.spells = _.chain(levelDetails.spells.split(','))
					.map(_.partial(_.result, _, 'trim'))
					.map(function (spellName) {
						var match = spellName.match(/([^\(]+)(?:\(([^\)]+)\))?/);
						return {
							name: match[1],
							restriction: match[2],
							toString: function () {
								return this.name + (this.restriction ? ' (' + this.restriction + ')' : '');
							},
							toSpellArrayItem: function () {
								return this.name;
							}
						};
					})
					.each(function (spell) {
						spell.object = entityLookup.findEntity('spell', spell.name, true);
						if (spell.object) {
							spell.name = spell.object.name;
							spell.toSpellArrayItem = function () {
								return this.object;
							};
						}
					})
					.value();
				})
				.each(traitHandler.setLevelDetailsString)
				.value();


				trait.text = castingDetails + ':\n' + _.pluck(spellDetailsByLevel, 'newText').join('\n');
				return _.chain(spellDetailsByLevel)
				.pluck('spells')
				.flatten()
				.map(_.partial(_.result, _, 'toSpellArrayItem'))
				.value();
			}
			return [];
		}


		module.exports = function (monster, entityLookup) {
			var spells = processSpellcastingTrait(monster.traits, 'Spellcasting', spellcastingHandler, entityLookup);
			var innateSpells = processSpellcastingTrait(monster.traits, 'Innate Spellcasting', innateHandler, entityLookup);
			spells = _.chain(spells)
			.union(innateSpells)
			.sortBy('name')
			.sortBy('level')
			.value();
			if (!_.isEmpty(spells)) {
				monster.spells = spells;
			}
			return monster;
		};


		/***/
	},
	/* 12 */
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

			statblock = statblock.replace(/^[A-Z ]+$/m, function (match) {
				return match.replace(/([A-Z])([A-Z]+)(?=\s|$)/g, function (match, p1, p2) {
					return p1 + p2.toLowerCase();
				});
			});

			statblock = statblock
			.replace(/,\./gi, ',')
			.replace(/([a-z\/])1/g, '$1l')
			.replace(/([a-z])\/([a-z])/g, '$1l$2')
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
			.replace(/ld(\d+)/gi, '1d$1')
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


			statblock = statblock.replace(/(\d+)\s*?plus\s*?((?:\d+d\d+)|(?:\d+))/gi, '$2 + $1');
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
				'withi n': 'within',
				'tohit': 'to hit',
				'At wi ll': 'At will',
				'per-son': 'person'
			};
			var re = new RegExp(Object.keys(replaceObj).join('|'), 'g');
			statblock = statblock.replace(re, function (matched) {
				return replaceObj[matched];
			});

			logger.debug('Final stage cleaned statblock: $$$', statblock);
			return statblock;

	}

		module.exports = sanitise;


		/***/
	}
	/******/]);
