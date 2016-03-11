function getSRDConverter(logger, config) {
	var makeFailedParseResult = function (text) {
			return {
				updateRemainingTextLines: function (textLines) {
					textLines.unshift(text);
				},
				updateCurrentField: _.noop,
				updatePreviousField: _.identity,
				matched: false
			};
		},

		standardTokenParser = function (text) {
			logger.debug('Parsing text: $$$ looking for $$$', text, this.parseToken);
			var re = new RegExp("^(.*?)(" + this.parseToken + ")(?:[\\s.]+|$)", 'i');
			var match = text.match(re);
			if (match) {
				logger.debug('Found match $$$', match[0]);
				return {
					updateRemainingTextLines: function (textLines) {
						textLines.unshift(text.slice(match[0].length))
					},
					updateCurrentField: _.identity,
					updatePreviousField: function (propDef, object) {
						propDef.pushText(match[1], object);
						propDef.endRecord(object)
					},
					matched: true
				};
			}
			return makeFailedParseResult(text);
		},

		singleLineMuncher = function (textLine) {
			return {
				updateRemainingTextLines: _.noop,
				updateCurrentField: function (propDef, object) {
					propDef.pushText(textLine, object);
					propDef.endRecord(object);
				},
				updatePreviousField: function (propDef, object) {
					propDef.endRecord(object);
				},
				matched: true
			};
		},

		multiLineMuncher = function (textLine) {
			return {
				updateRemainingTextLines: _.noop,
				updateCurrentField: function (propDef, object) {
					propDef.pushText(textLine, object);
					return propDef;
				},
				updatePreviousField: function (propDef, object) {
					propDef.endRecord(object);
				},
				matched: true
			};
		},

		bareStringParser = function (textLine) {
			return {
				updateRemainingTextLines: function (textLines) {
					textLines.unshift(textLine)
				},
				updateCurrentField: _.identity,
				updatePreviousField: function (propDef, object) {
					propDef.endRecord(object);
				},
				matched: true
			}
		},

		actionNameParser = function (textLine) {
			var match = textLine.match(/^([A-Z][\w\-']+(?:\s(?:[A-Z][\w\-']+|of|and|or|a)+)*)\s?(\([^\)]+\))?\s*\./i);
			if(match) {
				return {
					updateRemainingTextLines: function (textLines) {
						var remainingText = textLine.slice(match[0].length);
						if(match[2]) {
							remainingText = match[2] + '.' + remainingText;
						}
						textLines.unshift(remainingText);
					},
					updateCurrentField: function(propDef, object) {
						propDef.pushText(match[1], object);
						propDef.endRecord(object);
					},
					updatePreviousField: function (propDef, object) {
						propDef.endRecord(object)
					},
					matched: true
				}
			}
			return makeFailedParseResult(textLine);
		},

		rechargeParser = function (textLine) {
			var match = textLine.match(/^\(([^\)]+)\)\./i);
			if(match) {
				return {
					updateRemainingTextLines: function (textLines) {
						textLines.unshift(match[0].length);
					},
					updateCurrentField: function(propDef, object) {
						propDef.pushText(match[1], object);
						propDef.endRecord(object);
					},
					updatePreviousField: function (propDef, object) {
						propDef.endRecord(object)
					},
					matched: true
				}
			}
			return makeFailedParseResult(textLine);
		},

		legendaryCostParser = function (textLine) {
			var match = textLine.match(/^\(Costs (\d) actions\)\)\./i);
			if(match) {
				return {
					updateRemainingTextLines: function (textLines) {
						textLines.unshift(match[0].length);
					},
					updateCurrentField: function(propDef, object) {
						propDef.pushText(match[1], object);
						propDef.endRecord(object);
					},
					updatePreviousField: function (propDef, object) {
						propDef.endRecord(object)
					},
					matched: true
				}
			}
			return makeFailedParseResult(textLine);
		},

		objectToSrdFormat = function (object) {
			var typeDef = this;
			return _.reduce(object, function (memo, value, key) {
				var propertyDef = typeDef[key];
				memo[propertyDef.attribute] = propertyDef.srdOutput(value);
				return memo;
			}, {});

		},


		contentSectionOutputter = function (object) {
			var string = object.name;
			if (object.recharge) {
				string += " (" + object.recharge + ")";
			}
			else if (object.cost && object.cost > 1) {
				string += " (Costs " + object.cost + " actions)";
			}
			string += ": " + object.text;
			return string;
		},

		module = {
			clean: function (statblock) {
				return unescape(statblock)
					.replace(/\s\./g, '.')
					.replace(/–/g, '-')
					.replace(/<br[^>]*>/g, '#')
					.replace(/\s*#\s*/g, '#')
					.replace(/(<([^>]+)>)/gi, '')
					.replace(/#(?=[a-z]|DC)/g, ' ')
					.replace(/\s+/g, ' ')
					.replace(/#Hit:/gi, 'Hit:')
					.replace(/Hit:#/gi, 'Hit: ')
					.replace(/#Each /gi, 'Each ')
					.replace(/#On a successful save/gi, 'On a successful save')
					.replace(/DC#(\d+)/g, 'DC $1')
					.replace('LanguagesChallenge', 'Languages -#Challenge')
					.replace("' Speed", 'Speed')
					.replace(/#Medium or/gi, ' Medium or')
					.replace(/take#(\d+)/gi, 'take $1');
			},

			sanitizeText: function (text) {
				if (typeof text !== 'string') {
					text = text.toString();
				}

				text = text
					.replace(/,\./gi, ',')
					.replace(/ft\s\./gi, 'ft.')
					.replace(/ft\.\s\,/gi, 'ft')
					.replace(/ft\./gi, 'ft')
					.replace(/(\d+) ft\/(\d+) ft/gi, '$1/$2 ft')
					.replace(/lOd/g, '10d')
					.replace(/dl0/gi, 'd10')
					.replace(/dlO/gi, 'd10')
					.replace(/dl2/gi, 'd12')
					.replace(/Sd(\d+)/gi, '5d$1')
					.replace(/ld(\d+)/gi, '1d$1')
					.replace(/ld\s+(\d+)/gi, '1d$1')
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
				text = text.replace(/(\d+)\s*?plus\s*?((?:\d+d\d+)|(?:\d+))/gi, '$2 + $1');
				var replaceObj = {
					'jday': '/day',
					'abol eth': 'aboleth',
					'ACT IONS': 'ACTIONS',
					'Afrightened': 'A frightened',
					'Alesser': 'A lesser',
					'Athl etics': 'Athletics',
					'Aundefinedr': 'After',
					'blindn ess': 'blindness',
					'blind sight': 'blindsight',
					'bofh': 'both',
					'brea stplate': 'breastplate',
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
					'lnt': 'Int',
					'magica lly': 'magically',
					'minlilte': 'minute',
					'natura l': 'natural',
					'ofeach': 'of each',
					'ofthe': 'of the',
					"on'e": 'one',
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
				var re = new RegExp(Object.keys(replaceObj).join('|'), 'gi');
				text = text.replace(re, function (matched) {
					return replaceObj[matched];
				});
				return text;
			},

			makeParser: function (objectDefinition, loop) {
				var getParseChainLink = function (propDef, parser) {
						var link = {
							next: null,
							parse: function (textLines) {
								if (_.isEmpty(textLines)) return null;

								if (parser.parseWith(textLines, propDef)) {
									return this.next;
								}
								else {
									logger.debug("Trying next parser");
									this.next = this.next.parse(textLines);
									return this.next ? this : null;
								}
							},
							toJSON: function () {
								return { prop: propDef, _type: 'parseChainLink'};
							},
							logWrap: "parseChainLink"
						};
						logger.wrapModule(link);
						return link;
					},


					makeEndStopChainLink = function (parser) {
						var shimProp = {
							parse: function (textLine) {
								return {
									updatePreviousField: function (propDef, object) {
										propDef.pushText(textLine, object);
										if (propDef.endStop || propDef.loopEnd) {
											this.matched = true;
											return propDef.loopEnd ? propDef : null;
										}
										return propDef;
									},
									updateCurrentField: _.noop,
									updateRemainingTextLines: _.noop,
									matched: false
								};
							},
							endRecord: _.noop
						};

						return {
							parse: function (textLines) {
								logger.debug('Hit endstop parser');
								//If we haven't finished then keep returning
								//this chain link so that we keep acting as
								//an endstop. Only pass on the next link
								//when the parser says we're finished.
								if (!parser.parseWith(textLines, shimProp)) {
									return this;
								}
								return this.next;
							},
							next: null,
							logWrap: 'endStopChainLink',
							toJSON: function () {
								return 'endStopChainLink';
							}
						};
					};

				var currentlyConsumingProperty = null,
					parsed = {};

				return {
					parse: function (textLines) {
						var parser = this;
						currentlyConsumingProperty = null;
						parsed = {};
						var chainStart = getParseChainLink({propName: "start", parse: makeFailedParseResult, pushText: _.noop, endRecord: _.noop}, parser);
						_.chain(objectDefinition)
							.filter(function (value) {
								return typeof value === 'object' && !value.noParse;
							})
							.sortBy('index')
							.reduce(function (previous, propDef) {
								logger.debug("Making parse chain link for $$$ with functions $$$", propDef, _.functions(propDef));
								previous.next = getParseChainLink(propDef, parser);
								if (propDef.endStop) {
									previous.next.next = makeEndStopChainLink(parser);
									return previous.next.next;
								}
								return previous.next;
							}, chainStart)
							.tap(function (end) {
								end.next = makeEndStopChainLink(parser);
							});

						while (chainStart.parse(textLines)) {
							//Keep going until the chain
							//gives up
						}
						return parsed;
					},
					parseWith: function (textLines, propDef) {
						logger.debug('Currently consuming property $$$', currentlyConsumingProperty);
						var nextLine = textLines.shift();
						if (typeof nextLine !== 'undefined') {
							var result = propDef.parse(nextLine);
							currentlyConsumingProperty = currentlyConsumingProperty && result.updatePreviousField(currentlyConsumingProperty, parsed);
							result.updateRemainingTextLines(textLines);
							currentlyConsumingProperty = result.updateCurrentField(propDef, parsed) || currentlyConsumingProperty;
							return result.matched;
						}

						return false;
					},
					logWrap: 'parser',
					toJSON: function () {
						return {currentProp: currentlyConsumingProperty, parsed: parsed}
					}
				};
			},

			makeNumberOrFractionProperty: function (options) {
				return _.extend({
					validate: function (value, errors) {
						var valid = !_.isNaN(parseInt(value, 10));
						if (!valid) {
							valid = !_.isNaN(parseFloat(value));
							if (!valid) {
								var parts = value.split("/");
								if (parts.length === 2) {
									valid = !_.isNaN(parseInt(parts[0])) && !_.isNaN(parseInt(parts[1]));
								}
							}
						}
						if (!valid) {
							errors.push('Value ' + value + ' is not a number or a fraction');
						}
					}
				}, options);
			},


			makeStringProperty: function (options) {
				return _.extend({
					validate: function (value, errors) {
						if (typeof value === 'object') {
							errors.push('Value ' + value + ' should not be an object');
						}
					}
				}, options);

			},

			makeIntegerProperty: function (options) {
				return _.extend({
					validate: function (value, errors) {
						if (_.isNaN(parseInt(value, 10))) {
							errors.push('Value ' + value + ' is not a valid integer');
						}
					}
				}, options);
			},

			makePatternProperty: function (pattern, options) {
				return _.extend({
					validate: function (value, errors) {
						var match = value.match(pattern);
						if (!match) {
							errors.push('Value "' + value + '" does not match pattern ' + pattern.toString());
						}
					}
				}, options);
			},

			makeEnumProperty: function (enumValues, options) {
				if (options.bare && !options.parse) {
					options.parse = function (text) {
						logger.debug("Trying to parse as enum property");
						var parseResult = false;
						var match = _.chain(enumValues)
							.find(function (enumValue) {
								var dummyProp = {parseToken: enumValue};
								parseResult = standardTokenParser.call(dummyProp, text);
								return parseResult.matched;
							})
							.value();
						logger.debug("Finished trying to parse as enum property, match: $$$", match);
						if (match) {
							parseResult.updateCurrentField = function (propDef, object) {
								propDef.pushText(match, object);
								propDef.endRecord(object)
							}
						}
						return parseResult;
					};
				}
				return _.extend({
					validate: function (value, errors) {
						var valid = (typeof value === 'string') && _.contains(enumValues, value);
						if (!valid) {
							errors.push('Value ' + value + ' is not one of the permitted values: ' + JSON.stringify(enumValues));
						}
					}
				}, options);
			},

			makeArrayProperty: function (itemProperty, options) {
				var module = this;
				return _.extend({
					validate: function (value, errors) {
						var valid = _.isArray(value);
						if (valid) {
							_.each(value, function (itemValue) {
								itemProperty.validate(itemValue, errors);
							});
						}
						else {
							errors.push('Value ' + value + ' is not an array');
						}
					},
					srdOutput: function (object) {
						return _.map(object, itemProperty.srdOutput.bind(itemProperty)).join("\n");
					},
					pushText: function (text, object) {
						object[this.propName] = object[this.propName] || [];
						object[this.propName].push(text);
					},
					endRecord: function (object) {
						var parser = module.makeParser(itemProperty, true);
						object[this.propName] = parser.parse(object[this.propName]);
					}
				}, options);
			},

			makeRollExprProperty: function (options) {
				return _.extend({
					validate: function (value, errors) {
					}
				}, options);
			},


			makeObjectProperty: function (propDefinitions, options) {
				var module = this;
				logger.debug("Building object property with definitions: $$$ and options: $$$", propDefinitions, options);
				var definition = _.reduce(propDefinitions, function (memo, propDef, index) {
					logger.debug("Property definition $$$", propDef);
					var propName = propDef.propName;
					_.defaults(propDef, {
						attribute: propName.replace(/[A-Z]/g, function (match) {
							return "_" + match.toLowerCase();
						}),
						srdOutput: _.identity,
						parse: standardTokenParser,
						parseToken: propName,
						pushText: function (text, object) {
							object[this.propName] = object[this.propName] || "";
							object[this.propName] += text;
						},
						endRecord: function(object) {
							object[this.propName] = object[this.propName].replace(/\s*,\s*$/,'');
						},
						index: index,
						logWrap: 'propDef[' + propName + ']'
					});

					logger.wrapModule(propDef);
					memo[propName] = propDef;
					return memo;
				}, {});
				definition.validate = function (value, errors) {
					if (typeof value === 'object') {
						_.each(value, function (propValue, propName) {
							var propertyDef = definition[propName];
							if (!propertyDef) {
								errors.push('Unrecognised property: ' + propName);
							}
							else {
								propertyDef.validate(propValue, errors);
							}
						});
					}
					else {
						errors.push('Value ' + value + ' should be an object');
					}
				};
				definition.srdOutput = objectToSrdFormat;
				definition.parse = multiLineMuncher;
				definition.pushText = function (text, object) {
					object[this.propName] = object[this.propName] || [];
					object[this.propName].push(text);
				};
				definition.endRecord = function (object) {
					var parser = module.makeParser(propDefinitions);
					object[this.propName] = parser.parse(object[this.propName]);
				};
				definition = _.extend(definition, options);
				definition.logWrap = 'objectDef';
				logger.wrapModule(definition);
				return definition;
			},

			logWrap: "srdModule"
		};

	logger.wrapModule(module);

	var srdFormat = module.makeObjectProperty([
		module.makeStringProperty({propName: "name", attribute: "character_name", parse: singleLineMuncher}),
		module.makeEnumProperty(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"], {propName: "size", bare: true}),
		module.makeStringProperty({propName: "type", parse: bareStringParser}),
		module.makeEnumProperty(["lawful good", "lawful neutral", "lawful evil", "neutral good", "neutral evil", "neutral",
			"chaotic good", "chaotic neutral", "chaotic evil", "unaligned", "any alignment", "any good alignment", "any evil alignment",
			"any lawful alignment", "any chaotic alignment"], {propName: "alignment", bare: true}),
		module.makePatternProperty(/\d+\s*(?:\([^)]*\))?/, {propName: "ac", parseToken: "armor class"}),
		module.makeRollExprProperty({attribute: "hp_srd", propName: "hp", parseToken: "hit points"}),
		module.makePatternProperty(/^\d+\s*ft[\.]?(,\s*(fly|swim|burrow|climb)\s+\d+ft[\.]?)*(\(hover\))?$/, {attribute: "npc_speed", propName: "speed"}),
		module.makeIntegerProperty({propName: "strength", parseToken: "str"}),
		module.makeIntegerProperty({propName: "dexterity", parseToken: "dex"}),
		module.makeIntegerProperty({propName: "constitution", parseToken: "con"}),
		module.makeIntegerProperty({propName: "intelligence", parseToken: "int"}),
		module.makeIntegerProperty({propName: "wisdom", parseToken: "wis"}),
		module.makeIntegerProperty({propName: "charisma", parseToken: "cha"}),
		module.makePatternProperty(/^((Str|Dex|Con|Int|Wis|Cha)\s+[\-\+]\d+(,(?!$)\s*|$))+$/, {attribute: "saving_throws_srd", propName: "savingThrows", parseToken: "saving throws"}),
		module.makePatternProperty(/^((Acrobatics|Animal Handling|Arcana|Athletics|Deception|History|Insight|Intimidation|Investigation|Medicine|Nature|Perception|Performance|Persuasion|Religion|Slight of Hand|Stealth|Survival)\s+[\-\+]\d+(,(?!$)\s?|$))+$/,
			{attribute: "skills_srd", propName: "skills"}),
		module.makePatternProperty(/^\w+(,\s*\w+)*$/, {attribute: "damage_vulnerabilities", propName: "vulnerabilties", parseToken: "damage vulnerabilities"}),
		module.makePatternProperty(/^\w+(,\s*\w+)*$/, {attribute: "damage_resistances", propName: "resistances", parseToken: "damage resistances"}),
		module.makePatternProperty(/^\w+(,\s*\w+)*$/, {attribute: "damage_immunities", propName: "immunities", parseToken: "damage immunities"}),
		module.makePatternProperty(/^\w+(,\s*\w+)*$/, {attribute: "condition_immunities", propName: "conditionImmunities", parseToken: "condition immunities"}),
		module.makePatternProperty(/^((blindsight|darkvision|tremorsense|truesight)\s+\d+\s*ft[\.]?(,(?!$)\s*|$))+$/, {propName: "senses"}),
		module.makeIntegerProperty({propName:'passivePerception', parseToken:'passive Perception'}),
		module.makeStringProperty({propName: "languages"}),
		module.makeNumberOrFractionProperty({propName: "challenge", endStop: true}),
		module.makePatternProperty(/^\w+(,\s*\w+)*$/, {attribute: "spells_srd", propName: "spellBook", noParse: true}),
		module.makeArrayProperty(module.makeObjectProperty([
			module.makeStringProperty({propName: "name", parse: actionNameParser}),
			module.makeStringProperty({propName: "recharge", parse: rechargeParser}),
			module.makeStringProperty({propName: "text", parse: multiLineMuncher,loopEnd:true})
		], {srdOutput: contentSectionOutputter}), {propName: "traits", parse: multiLineMuncher}),
		module.makeArrayProperty(module.makeObjectProperty([
			module.makeStringProperty({propName: "name", parse: actionNameParser}),
			module.makeStringProperty({propName: "recharge", parse: rechargeParser}),
			module.makeStringProperty({propName: "text", parse: multiLineMuncher,loopEnd:true})
		], {srdOutput: contentSectionOutputter}), {propName: "actions"}),
		module.makeArrayProperty(module.makeObjectProperty([
			module.makeStringProperty({propName: "name"}),
			module.makeIntegerProperty({propName: "cost", parse: legendaryCostParser}),
			module.makeStringProperty({propName: "text",loopEnd:true})
		], {srdOutput: contentSectionOutputter}), {attribute: "legendaryActions", propName: "legendaryActions", parseToken: "Legendary Actions"}),
		module.makeIntegerProperty({
			srdOutput: function (value) {
				return "Can take " + value + " Legendary Actions, choosing from the options below. Only one legendary action can be used at a time, and only at the end of another creature's turn. Spent legendary actions are regained at the start of each turn."
			},
			attribute: "legendaryPoints",
			propName: "legendaryPoints",
			parse: function (text) {
				var match = text.match(/^\s*can take (\d+) legendary actions.*?start of each turn[.]?/i);
				if (match) {
					return {
						updateRemainingTextLines: function (textLines) {
							textLines.unshift(text.slice(match[0].length))
						},
						updateCurrentField: function (propDef, object) {
							propDef.pushText(match[1], object);
							propDef.endRecord(object);
						},
						updatePreviousField: function (propDef, object) {
							propDef.endRecord(object);
						},
						matched: true
					};
				}
				return makeFailedParseResult(text);
			}
		}),
		module.makeArrayProperty(module.makeObjectProperty([
			module.makeStringProperty({propName: "name"}),
			module.makeStringProperty({propName: "text"})
		], {srdOutput: contentSectionOutputter}), {propName: "lairActions", noParse: true})
	], {
		srdOutput: function (object) {
			var contentSections = ["traits", "actions", "legendaryActions", "lairActions", "legendaryPoints"];
			var attributes = objectToSrdFormat.call(this, _.omit(object, contentSections));
			var sections = objectToSrdFormat.call(this, _.pick(object, contentSections));

			var string = "";
			if (sections.traits) {
				string += "Traits\n" + JSON.stringify(sections.traits);
			}
			if (sections.actions) {
				string += "\nActions\n" + JSON.stringify(sections.actions);
			}
			if (sections.legendaryActions) {
				string += "\nLegendary Actions\n" + sections.legendaryPoints + "\n" + JSON.stringify(sections.legendaryActions);
			}
			if (sections.lairActions) {
				string += "\nLair Actions\n" + JSON.stringify(sections.lairActions);
			}

			if (string) {
				attributes.content_srd = string;
			}
			return attributes;
		},
		propName: "npc"
	});

	return {
		convertToSheetObject: function (object, errors) {
			srdFormat.validate(object, errors);
			if (!_.isEmpty(errors)) {
				return null;
			}
			return srdFormat.srdOutput(object);
		},

		convertJSONToSheetObject: function (jsonString, errors) {
			try {
				return this.convertToSheetObject(JSON.parse(jsonString), errors);
			}
			catch (e) {
				errors.push(e.toString());
			}
			return null;
		},

		parseFromText: function (statblockText, errors) {
			var cleaned = module.sanitizeText(module.clean(statblockText));
			var split = _.map(cleaned.split('#'), function (string) {
				return string.trim();
			});

			var parser = module.makeParser(srdFormat);
			var parsed = parser.parse(split);
			srdFormat.validate(parsed, errors);
			if (_.isEmpty(errors)) {
				return srdFormat.srdOutput(parsed);
			}
			return null;
		}

	}
}
