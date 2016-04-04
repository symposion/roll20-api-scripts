/* globals describe: false, it:false */
var expect = require('chai').expect;
var jv = require('../lib/json-validator');
var spec = require('../resources/mmFormatSpec.json');
var data = require('../resources/srdSample.json');
var glob = require('glob');
var fs = require('fs');

describe('json-validator', function () {
    'use strict';


    it('validates correctly', function () {
        expect(jv(spec)(data.monsters[0]).errors).to.deep.equal([]);
    });


    glob.sync('../../roll20/data/monsterSourceFiles/*.json').forEach(function (jsonFile) {
        describe('JSON file: ' + jsonFile, function () {
            JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
              .monsters.forEach(function (monster) {
                it('validates ' + monster.name + ' correctly', function () {
                    expect(jv(spec)(monster).errors).to.deep.equal([]);
                });
            });
        });

    });


});
