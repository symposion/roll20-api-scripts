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
        return function () {
        };
    },

    enumType: function (spec) {
        return function (value, errors) {
            if (!_.some(spec.enumValues, function (enumVal) {
                  return new RegExp('^' + enumVal + '$', 'i').test(value);
              })) {
                errors.add('Value "' + value + '" should have been one of [' + spec.enumValues.join(',') + ']');
            }
        };
    },

    ability: function (spec) {
        return regExValidator(spec.name, '\\d+');
    },

    heading: function (spec) {
        return function () {
        };
    },

    number: function (spec) {
        return function (value, errors) {
            if (typeof value !== 'number') {
                errors.add('Value "' + value + '" should have been a number');
            }
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
        throw new Error('Can\'t find matchgroup ' + matchIndex + ' in regular expression ' + regexp);
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
        throw new Error('matchgroup ' + matchIndex + ' seems not to have closing brace in regular expression ' + regexp);
    }

    return regexp.slice(startIndex, startIndex + endIndex);
}

function regExValidator(fieldName, regexp, caseSensitive) {
    var re = new RegExp('^' + regexp + '$', caseSensitive ? undefined : 'i');
    return function (value, errors) {
        if (!re.test(value)) {
            errors.add('Value "' + value + '" doesn\'t match pattern /' + regexp + '/');
        }
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

    return function (object, errors, isFlatten) {
        var completed = _.reduce(object, function (completed, fieldValue, fieldName) {
              var validator = subValidators[fieldName];
              if (validator) {
                  completed.push(fieldName);
                  errors.pushPath(fieldName);
                  if (_.isArray(fieldValue)) {
                      if (fieldValue.length > validator.max) {
                          errors.add('Number of entries [' + fieldValue.length + '] exceeds maximum allowed: ' + validator.max);
                      }
                      else if (fieldValue.length < validator.min) {
                          errors.add('Number of entries [' + fieldValue.length + '] is less than minimum allowed: ' + validator.min);
                      }
                      else {
                          _.each(fieldValue, function (arrayItem, index) {
                              errors.pushIndex(arrayItem.name ? arrayItem.name : index);
                              validator(arrayItem, errors);
                              errors.popIndex();
                          });

                      }
                  }
                  else {
                      validator(fieldValue, errors);
                  }
                  errors.popPath();
              }
            return completed;
        }, []);

        var toValidate = _.omit(object, completed);
        _.chain(flattened)
          .map(function (validator) {
              var subCompleted = validator(toValidate, errors, true);
              if (subCompleted.length === 0) {
                  return validator;
              }
              else {
                  completed = completed.concat(subCompleted);
              }
              toValidate = _.omit(toValidate, completed);
          })
          .compact()
          .each(function (validator) {
              if (validator.min > 0) {
                  errors.pushPath(validator.fieldName);
                  errors.add('Section is missing');
                  errors.popPath();
              }
          });

        //If we're a flattened validator (our content is injected directly into the parent content model)
        //Then we should only report missing fields if there was some match in our content model - otherwise
        //the parent content model will check the cardinality of this model as a whole
        if (!isFlatten || !_.isEmpty(completed)) {
            _.chain(subValidators)
              .omit(completed)
              .each(function (validator) {
                  if (validator.min > 0) {
                      errors.pushPath(validator.fieldName);
                      errors.add('Field is missing');
                      errors.popPath();
                  }
              });
        }

        //Flattened content models shouldn't check for unrecognised fields since they're only parsing
        //part of the current content model.
        if (!isFlatten) {
            _.chain(object)
              .omit(completed)
              .each(function (value, key) {
                  errors.pushPath(key);
                  errors.add('Unrecognised field');
                  errors.popPath();
              });
        }


        return completed;
    };
}

function Errors() {

    var errors = [];
    var currentPath = [];
    this.pushPath = function (path) {
        currentPath.push(path);
    };
    this.popPath = function () {
        currentPath.pop();
    };
    this.pushIndex = function (index) {
        currentPath[currentPath.length - 1] = currentPath[currentPath.length - 1] + '[' + index + ']';
    };

    this.popIndex = function (index) {
        currentPath[currentPath.length - 1] = currentPath[currentPath.length - 1].replace(/\[[^\]]+\]/, '');
    };

    this.add = function (msg) {
        errors.push({msg: msg, path: _.clone(currentPath)});
    };

    this.getErrors = function () {
        return _.chain(errors)
          .groupBy(function (error) {
              return error.path[0];
          })
          .mapObject(function (errorList) {
              return _.map(errorList, function (error) {
                  return error.path.slice(1).join('.') + ': ' + error.msg;
              });
          })
          .value();
    };
}

module.exports = JSONValidator;

function JSONValidator(spec) {
    var versionProp = {
        type: 'string',
        name: 'version',
        pattern: '^' + spec.formatVersion.replace('.', '\\.') + '$'
    };
    var contentValidator = makeValidator({type: 'unorderedContent', contentModel: [spec, versionProp]});
    this.validate = function (object) {
        var errors = new Errors();
        contentValidator(object, errors);
        return errors.getErrors();
    };

    this.getVersionNumber = function () {
        return spec.formatVersion;
    };

}
