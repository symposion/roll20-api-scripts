/* globals describe: false, it:false */
var expect = require('chai').expect;
var JSONValidator = require('../lib/json-validator');
var spec = require('../resources/mmFormatSpec.json');
var data = require('../samples/monsterSample.json');
var glob = require('glob');
var fs = require('fs');

describe('json-validator', function () {
  'use strict';

  var jv = new JSONValidator(spec);

  it('validates correctly', function () {
    expect(jv.validate(data)).to.deep.equal({});
  });


  glob.sync('../../roll20/data/monsterSourceFiles/*.json').forEach(function (jsonFile) {
    describe('JSON file: ' + jsonFile, function () {
      var monsters = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      it('validates ' + jsonFile + ' correctly', function () {
        expect(jv.validate(monsters)).to.deep.equal({});
      });
    });

  });


});
