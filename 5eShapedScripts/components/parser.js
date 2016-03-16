var _ = require('underscore');
function getParser(formatSpec, logger) {

	var module = {

		makeContentModelParser: function (fieldSpec, ordered) {
			var module = this;
			return {

				parse: function (stateManager, textLines, resume) {

					var parseState = stateManager.enterChildParser(this, resume);
					parseState.subParsers = parseState.subParsers || module.makeParserList(fieldSpec.contentModel);

					var someMatch = false;

					if (parseState.resumeParser) {
						if (!parseState.resumeParser.resumeParse(stateManager, textLines)) {
							stateManager.leaveChildParser(this);
							return false;
						}
						else {
							someMatch = true;
						}
					}

					do {
						var canContinue = false;
						_.find(parseState.subParsers, function (parser, index) {

							if (!parser.parse(stateManager, textLines)) {

								if (parser.required === 0 || !ordered) {
									//No match but it's ok to keep looking
									//through the rest of the content model for one
									return false;
								}

								//No match but one was required here by the content model
							}
							else {
								canContinue = true;
								someMatch = true;
								if (parser.required > 0) {
									parser.required--;
								}
								parser.allowed--;
								if (ordered) {
									//Set all the previous parsers to be exhausted since we've matched
									//this one and we're in a strictly ordered content model.
									_.each(parseState.subParsers.slice(0, index), _.partial(_.extend, _, {allowed: 0}));
								}
							}
							return true;
						});


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
					"use strict";
					var missingContent = _.filter(parseState.subParsers, 'required');
					if (!_.isEmpty(missingContent)) {
						throw "Incomplete content model error for parser " + JSON.stringify(this) + '. Missing content: ' + JSON.stringify(missingContent);
					}
				}
			};
		},

		matchParseToken: function (myParseState, textLines) {
			if (_.isEmpty(textLines)) return false;
			if (this.bare) return true;

			var re = new RegExp("^(.*?)(" + this.parseToken + ")(?:[\\s.]+|$)", 'i');
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

				if (_.isEmpty(textLines)) return false;
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
			var parser = this.makeSimpleValueParser();
			return parser;
		},


		enumType: function (fieldSpec) {
			var parser = this.makeSimpleValueParser();

			if (fieldSpec.bare) {
				parser.matchValue = function (myParseState, textLines) {
					var parser = this;
					var matchingEnumValue = _.find(fieldSpec.enumValues, function (enumValue) {
						logger.debug("Attempting to parse as enum property $$$", enumValue);
						parser.pattern = "^(.*?)(" + enumValue + ")(?:[\\s.]+|$)";
						parser.matchGroup = 2;
						parser.forPreviousMatchGroup = 1;
						return module.matchValue.call(parser, myParseState, textLines);
					});
					delete parser.pattern;
					delete parser.matchGroup;
					delete parser.forPreviousMatchGroup;
					if (matchingEnumValue) {
						logger.debug("Finished trying to parse as enum property, match: $$$", matchingEnumValue);
						return true;
					}
					return false;

				};
			}
			return parser;
		},

		integer: function (fieldSpec) {
			var parser = this.makeSimpleValueParser();
			parser.typeConvert = function (textValue) {
				"use strict";
				var intVal = parseInt(textValue);
				if (_.isNaN(intVal)) {
					throw "Invalid integer value for field " + fieldSpec.name + ' [' + textValue + ']';
				}
				return intVal;
			};
			return parser;
		},

		ability: function (fieldSpec) {
			"use strict";
			var parser = this.integer();
			parser.matchValue = function (parseState, textLines) {
				if (_.isEmpty(textLines)) return false;
				var re = new RegExp("^([\\sa-z\\(\\)]*)(\\d+(?:\\s?\\([\\-+\\d]+\\))?)", "i");
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
			"use strict";
			var module = this;
			return {
				parse: function (stateManager, textLines) {
					var parseState = stateManager.enterChildParser(this);
					var match = (this.matchParseToken(parseState, textLines))
						&& this.matchValue(parseState, textLines);
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
					"use strict";
					parseState.text += finalText ? finalText : '';
					if(parseState.text) {
						parseState.value = this.extractValue(parseState.text);
						parseState.value = this.typeConvert(parseState.value);
						parseState.setOutputValue();
					}
				},
				extractValue: function(text) {
					text = text.trim();
					if(this.pattern && !this.bare) {


						var regExp = new RegExp(this.pattern, this.caseSensitive ? '' : 'i');
						var match = text.match(regExp);
						if (match) {
							var matchGroup = this.matchGroup || 0;
							return match[matchGroup];
						}
						else {
							throw "Invalid value [" + text + "] against pattern " + regExp + " for field [" + this.name + "] ";
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
					"use strict";
					if (_.isEmpty(textLines)) return false;
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
			"use strict";
			return {
				text: '',
				getObjectValue: function () {
					var value = outputObject;
					var segments = _.clone(propertyPath);
					while (segments.length) {
						var prop = segments.shift();
						if (prop.flatten) continue;
						value = value[prop.name];
						if (_.isArray(value)) {
							value = _.last(value);
						}
					}
					return value;
				},
				setOutputValue: function () {
					if (skipOutput) return;
					var outputTo = outputObject;
					var segments = _.clone(propertyPath);
					while (segments.length > 0) {
						var prop = segments.shift();
						if (prop.flatten) continue;

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
							throw "Simple value property somehow already had value when we came to set it";
						}
						else {
							newValue = currentValue;
						}

						outputTo = newValue;
					}
				},
				logWrap: 'parseState[' + _.pluck(propertyPath, 'name').join('/') + ']',
				toJSON: function () {
					return _.extend(_.clone(this), {propertyPath: propertyPath})
				}
			};
		},


		makeParseStateManager: function () {
			"use strict";
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
					currentPropertyPath.push({name: parser.name, allowed: parser.allowed, flatten: parser.flatten});

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
					})
				}

			};
		},

		parserId: 0,
		parserAttributes: ["attribute", "forPreviousMatchGroup", "forNextMatchGroup", "parseToken", "flatten", "pattern", "matchGroup", "bare", "caseSensitive", "name"],
		getParserFor: function (fieldSpec) {
			logger.debug('Making parser for field $$$', fieldSpec);
			var parserBuilder = this[fieldSpec.type];
			if (!parserBuilder) {
				throw "Can't make parser for type " + fieldSpec.type;
			}
			var parser = parserBuilder.call(this, fieldSpec);
			parser.required = _.isUndefined(fieldSpec.minOccurs) ? 1 : fieldSpec.minOccurs;
			parser.allowed = _.isUndefined(fieldSpec.maxOccurs) ? 1 : fieldSpec.maxOccurs;
			_.extend(parser, _.pick(fieldSpec, this.parserAttributes));
			_.defaults(parser, {
				attribute: parser.name,
				parseToken: parser.name
			});
			parser.id = this.parserId++;
			parser.logWrap = "parser[" + parser.name + "]";
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

		logWrap: "parseModule"
	};

	logger.wrapModule(module);

	var parser = module.getParserFor(formatSpec);
	return {
		parse: function (text) {
			logger.debug("Text: $$$", text);

			var textLines = _.chain(text.split('\n'))
				.invoke('trim')
				.compact()
				.value();
			logger.debug(parser);
			var stateManager = module.makeParseStateManager();
			var success = parser.parse(stateManager, textLines);
			while (success && !_.isEmpty(textLines)) {
				parser.resumeParse(stateManager, textLines);
			}

			stateManager.completeCurrentStack(textLines.join("\n"));

			if (success && textLines.length === 0) {
				logger.info(stateManager.outputObject);
				return stateManager.outputObject;
			}
			return null;
		}
	};

}

module.exports = getParser;
