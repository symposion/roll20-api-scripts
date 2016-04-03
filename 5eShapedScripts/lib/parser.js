var _ = require('underscore');

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
                        someMatch = false,
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
    //noinspection JSUnusedGlobalSymbols
    this.message = message;
}
ParserError.prototype = new Error();

/**
 * @constructor
 */
function MissingContentError(missingFieldParsers) {
    'use strict';
    this.missingFieldParsers = missingFieldParsers;
    //noinspection JSUnusedGlobalSymbols
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
    //noinspection JSUnusedGlobalSymbols
    this.message = 'Bad value [' + this.value + '] for field [' + this.name + ']. Should have matched pattern: ' + this.pattern;
}
BadValueError.prototype = new ParserError();

module.exports = {
    getParser: getParser,
    MissingContentError: MissingContentError,
    BadValueError: BadValueError,
    ParserError: ParserError
};
