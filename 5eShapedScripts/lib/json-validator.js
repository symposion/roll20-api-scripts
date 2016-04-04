'use strict';
var _ = require('underscore');

var validatorFactories = {
    orderedContent: function (spec) {
        return makeContentModelValidator(spec);
    },

    unorderedContent: function (spec) {
        return makeContentModelValidator(spec);
    },

    string: function (spec) {
        if (spec.pattern) {
            if (spec.matchGroup) {
                return regExValidator(spec.name, extractRegexPart(spec.pattern, spec.matchGroup), spec.caseSensitive);
            }
            else {
                return regExValidator(spec.name, spec.pattern, spec.caseSensitive);
            }
        }
        return _.constant({errors: [], completed: []});
    },

    enumType: function (spec) {
        return function (value) {
            var result = {errors: [], completed: []};
            if (!_.some(spec.enumValues, function (enumVal) {
                  return new RegExp(enumVal, 'i').test(value);
              })) {
                result.errors.push('Value "' + value + '" for field ' + spec.name + ' should have been one of [' + spec.enumValues.join(',') + ']');
            }
            return result;
        };
    },

    ability: function (spec) {
        return regExValidator(spec.name, '\\d+');
    },

    heading: function (spec) {
        return _.constant({errors: [], completed: []});
    },

    number: function (spec) {
        return function (value) {
            var result = {errors: [], completed: []};
            if (typeof value !== 'number') {
                result.errors.push('Value "' + value + '" for field ' + spec.name + ' should have been a number');
            }
            return result;
        };
    }
};

function extractRegexPart(regexp, matchIndex) {
    var braceCount = 0;
    var startIndex = _.findIndex(regexp, function (character, index) {
        if (character === '(' &&
          (index < 2 || regexp[index - 1] !== '\\') &&
          regexp[index + 1] !== '?') {
            return ++braceCount === matchIndex;
        }
    });

    if (startIndex === -1) {
        throw 'Fucked';
    }

    //Lose the bracket
    startIndex++;

    var openCount = 1;
    var endIndex = _.findIndex(regexp.slice(startIndex), function (character, index, regexp) {
        if (character === '(' && regexp[index - 1] !== '\\') {
            openCount++;
        }
        if (character === ')' && regexp[index - 1] !== '\\') {
            return --openCount === 0;
        }
    });

    if (endIndex === -1) {
        throw 'Fucked';
    }

    return regexp.slice(startIndex, startIndex + endIndex);
}

function regExValidator(fieldName, regexp, caseSensitive) {
    var re = new RegExp('^' + regexp + '$', caseSensitive ? undefined : 'i');
    return function (value) {
        var result = {errors: [], completed: []};
        if (!re.test(value)) {
            result.errors.push('Value "' + value + '" doesn\'t match pattern [' + regexp + '] for field ' + fieldName);
        }
        return result;
    };
}

function makeValidator(spec) {
    var validator = validatorFactories[spec.type](spec);
    validator.max = _.isUndefined(spec.maxOccurs) ? 1 : spec.maxOccurs;
    validator.min = _.isUndefined(spec.minOccurs) ? 1 : spec.minOccurs;
    validator.fieldName = spec.name;
    return validator;
}

function makeContentModelValidator(spec) {
    var parts = _.chain(spec.contentModel)
      .reject({type: 'heading'})
      .partition({flatten: true})
      .value();
    var flattened = _.map(parts[0], makeValidator);

    var subValidators = _.reduce(parts[1], function (subValidators, field) {
        subValidators[field.name] = makeValidator(field);
        return subValidators;
    }, {});

    return function (object, ignoreUnrecognised) {
        var results = _.reduce(object, function (results, fieldValue, fieldName) {
              var validator = subValidators[fieldName];
              if (validator) {
                  results.completed.push(fieldName);
                  if (_.isArray(fieldValue)) {
                      if (fieldValue.length > validator.max) {
                          results.errors.push('Count of ' + fieldName + ' values [' + fieldValue.length + '] exceeds maximum allowed: ' + validator.max);
                      }
                      else if (fieldValue.length < validator.min) {
                          results.errors.push('Count of ' + fieldName + ' values [' + fieldValue.length + '] is less than minimum allowed: ' + validator.min);
                      }
                      else {
                          _.each(fieldValue, function (arrayItem) {
                              results.errors = results.errors.concat(validator(arrayItem).errors);
                          });

                      }
                  }
                  else {
                      results.errors = results.errors.concat(validator(fieldValue).errors);
                  }
              }
              return results;
          }, {errors: [], completed: []}
        );

        var toValidate = _.omit(object, results.completed);
        _.chain(flattened)
          .map(function (validator) {
              var result = validator(toValidate, true);
              results.completed = results.completed.concat(result.completed);
              if (result.completed.length === 0) {
                  return validator;
              }
              else {
                  results.errors = results.errors.concat(result.errors);
              }
              toValidate = _.omit(toValidate, result.completed);
          })
          .compact()
          .each(function (validator) {
              if (validator.min > 0) {
                  results.errors.push('Missing section: ' + validator.fieldName);
              }
          });

        _.chain(subValidators)
          .omit(results.completed)
          .each(function (validator) {
              if (validator.min > 0) {
                  results.errors.push('Missing field: ' + validator.fieldName);
              }
          });

        if (!ignoreUnrecognised) {
            _.chain(object)
              .omit(results.completed)
              .each(function (value, key) {
                  results.errors.push('Unrecognised field: ' + key);
              });
        }


        return results;
    };
}

module.exports = makeValidator;
