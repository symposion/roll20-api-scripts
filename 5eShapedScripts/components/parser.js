function getParser(formatSpec, logger) {

	var module = {

		makeContentModelParser: function (fieldSpec, ordered) {
			//Make these once and then clone them to save rebuilding them
			//from scratch every time we parse
			var originalParsers = this.makeParserList(fieldSpec.contentModel);

			return {
				parse: function (parseState, textLines) {
					var isRoot = !parseState.outputObject;
					var previousOutputObject = parseState.outputObject || {};

					if(fieldSpec.output !== 'flatten') {
						parseState.outputObject = previousOutputObject[this.name];
					}
					if(_.isUndefined(parseState.outputObject) || _.isArray(parseState.outputObject)) {
						parseState.outputObject = {};
					}

					var parsers = _.clone(originalParsers);
					var parseSuccess = true;

					while (!_.isEmpty(parsers) && !_.isEmpty(textLines)) {
						var foundMatch = false;
						_.find(parsers, function (parser, index) {
							//Simple type parsers will check the previousParser accepts any text
							//that precedes them before they declare a match.
							var match = parser.parse(parseState, textLines);
							//Might have been updated
							if (!match) {
								if (parser.required === 0 || !ordered) {
									//No match but it's ok to keep looking
									//through the rest of the content model for one
									return false;
								}
								//No match but one was required here by the content model
								//Break out here
								return true;
							}
							else {
								foundMatch = true;
								parser.required--;
								parser.allowed--;
								if (ordered) {
									//Set all the previous parsers to be exhausted since we've matched
									//this one and we're in a strictly ordered content model.
									_.each(parsers.slice(0, index), _.partial(_.extend, _, {allowed: 0}));
								}
							}
							return true;
						});

						//At the end, we we either a) broke out of the loop with a successful match, in which
						//case we want to loop again with the parsers as they stand
						//or b) we broke out of the loop because we hit something that proved this content
						//model doesn't match here - in which case we have to return, we're done trying to match
						// or c) we reached the end of the content model without getting a match - which means we're done
						//here for the moment as well. If the content model was ordered, this means we succeeded in matching
						//everything, but for non-ordered content models we need to check for remaining parsers whose
						//cardinality hasn't been satisfied.

						if (!foundMatch) {
							//If there were any parsers left that needed a match, then
							//this content model doesn't match.
							var stillNeedsMatch = !_.find(parsers, 'required');

							if (stillNeedsMatch) {
								if(isRoot && parseState.previousParser.pushText(textLines[0])) {
								//Push the current line to the previous parser any then
								//re-attempt parsing to see if we can find a match with the next line
									textLines.shift();
								}
								else {
									//We still have stuff to match but we're not root - we failed, give up
									//We still have stuff to match, we're root, but the previousParser won't accept what we're offering, give up, total fail
									parseSuccess = false;
									parsers = [];
								}
							}
							else {
								//No more matches found, but none needed, leave the result as a success, clear parsers
								//to break out of loop.
								parsers = [];
							}
						}
						else {
							//We found a match, go round again if there are any parsers left that might match
						}

						//Lose any parsers that have used up all their cardinality already
						parsers = _.reject(parsers, {allowed: 0});
					}

					if(parseSuccess && fieldSpec.output !== 'flatten') {
						if(this.allowed === 1) {
							previousOutputObject[this.name] = parseState.outputObject;
						}
						else {
							previousOutputObject[this.name] = previousOutputObject[this.name] || [];
							if(!_.isArray(previousOutputObject[this.name])) {
								throw "Property parser " + this.name + " had cardinality > 1 but had a non-array property on output object";
							}
							previousOutputObject[this.name].push(parseState.outputObject);
						}
						parseState.outputObject = previousOutputObject;

					}
					return parseSuccess;

				},
				pushText:_.compose(_.isEmpty, String.prototype.trim.call)
			};
		},

		matchParseToken: function(parseState, textLines, fieldSpec) {
			if (_.isEmpty(textLines)) return false;
			if(fieldSpec.bare) return true;

			var re = new RegExp("^(.*?)(" + this.parseToken + ")(?:[\\s.]+|$)", 'i');
			var match = textLines[0].match(re);
			if (match) {
				logger.debug('Found match $$$', match[0]);
				if (parseState.previousParser.pushText(match[1])) {
					parseState.previousParser = this;
					textLines[0] = textLines[0].slice(match[0].length).trim();
					if(!textLines[0]) {
						textLines.shift();
					}
					return true;
				}
			}
			return false;
		},

		matchValue: function(parseState, textLines, fieldSpec) {
			if (_.isEmpty(textLines)) return false;
			var outputObject = parseState.outputObject;
			if(fieldSpec.pattern) {
				var matchGroup = fieldSpec.matchGroup || 0;
				var re = new RegExp(fieldSpec.pattern, fieldSpec.caseSensitive ? '' : 'i');
				var match = textLines[0].trim().match(re);
				if (match && parseState.previousParser.pushText(textLines[0].slice(0, match.index), true)) {
					parseState.previousParser = this;
					parseState.outputObject[this.name] = match[matchGroup];
					textLines[0] = textLines[0].slice(match.index + match[0].length);
					if(!textLines[0]) {
						textLines.shift();
					}
					this.pushText = _.compose(_.isEmpty, String.prototype.trim.call);
					return true;
				}
				return false;
			}
			else {
				parseState.previousParser.pushText('', true);
				parseState.previousParser = this;

				outputObject[this.name] = '';
				this.pushText = function(text) {
					outputObject[this.name] += text;
				};
				return true;
			}

		},

		orderedContent: function (fieldSpec) {
			return this.makeContentModelParser(fieldSpec, true);
		},

		unorderedContent: function (fieldSpec) {
			return this.makeContentModelParser(fieldSpec, true);
		},

		string: function (fieldSpec) {
			var module = this;
			return {
				parse: function(parseState, textLines) {
					return module.matchParseToken.bind(this)(parseState, textLines, fieldSpec)
						&& module.matchValue.bind(this)(parseState, textLines, fieldSpec);

				}
			}
		},


		enumType: function (fieldSpec) {
			var module = this;
			return {
				parse: function(parseState, textLines) {
					var parser = this;
					if (_.isEmpty(textLines)) return false;
					var match = module.matchParseToken.bind(this)(parseState,textLines, fieldSpec);
					if (match) {
						var matchingEnumValue = _.find(fieldSpec.enumValues, function(enumValue) {
							parser.pattern = new RegExp("^(.*?)(" + enumValue + ")(?:[\\s.]+|$)", 'i');
							parser.matchGroup = 1;
							return module.matchValue.bind(parser)(parseState, textLines, fieldSpec);
						});
						if(matchingEnumValue) {
							this.pushText = _.compose(_.isEmpty, String.prototype.trim.call);
							logger.debug("Finished trying to parse as enum property, match: $$$", matchingEnumValue);
							return true;
						}
					}
					return false;
				}
			};

		},


		//TODO this needs to validate as an integer at the end
		integer: function (fieldSpec) {
			var module = this;
			return {
				parse: function(parseState, textLines) {
					return module.matchParseToken.bind(this)(parseState, textLines, fieldSpec)
						&& module.matchValue.bind(this)(parseState, textLines, fieldSpec);
				}
			};
		},

		heading: function(fieldSpec) {
			var module = this;
			fieldSpec.bare = true;
			return {
				parse: function(parseState, textLines) {
					var match = module.matchParseToken.bind(this)(parseState, textLines, fieldSpec)
						&& module.matchValue.bind(this)(parseState, textLines, fieldSpec);
					if (match) {
						//this is a heading and we shouldn't record the value on the final object
						delete parseState.outputObject[this.name];
					}
				}
			};
		},

		getParserFor: function (fieldSpec) {
			var parser = this[fieldSpec.type](fieldSpec);
			parser.required = _.isUndefined(fieldSpec.minOccurs) ? 1 : fieldSpec.minOccurs;
			parser.allowed = _.isUndefined(fieldSpec.maxOccurs) ? 1 : fieldSpec.maxOccurs;
			_.extend(parser, _.pick(fieldSpec, "attribute", "parseToken", "outputAs"));
			_.defaults(parser, {
				attribute: parser.name,
				parseToken: parser.name,
				outputAs: 'property'
			});
			return parser;
		},

		startParser: {
			pushText: function(text) { return _.isEmpty(text); }
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
		parse: function (textLines) {
			textLines = _.chain(textLines)
				.each(String.prototype.trim.call)
				.compact()
				.value();
			var parseState = {previousParser:module.startParser};
			var success = parser.parse(parseState, textLines);
			if (success && textLines.length === 0) {
				return parseState.outputObject;
			}
			return null;
		}
	};

}
