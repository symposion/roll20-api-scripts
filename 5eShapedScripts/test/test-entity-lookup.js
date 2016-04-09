/* globals describe: false, it:false */
var expect = require('chai').expect;
var utils = require('../lib/utils');
var EntityLookup = require('../lib/entity-lookup');
var JSONValidator = require('../lib/json-validator');
var spec = require('../resources/mmFormatSpec.json');
var glob = require('glob');
var fs = require('fs');
var _ = require('underscore');


describe('entity-lookup', function () {
  'use strict';

  var spell1 = { name: 'spell1' };
  var spell2 = { name: 'spell2' };

  var monster1 = { name: 'monster1', spells: 'spell1, spell2' };
  var monster2 = { name: 'monster2' };
  var monster3 = { name: 'monster3', spells: 'spell1' };


  describe('#lookupEntity', function () {
    var el = new EntityLookup();
    el.configureEntity('spells', [el.getMonsterSpellUpdater()], _.constant(true));
    el.configureEntity('monsters', [el.getSpellHydrator()], _.constant(true));
    el.addEntities({ version: '0.2', spells: [spell1, spell2] });
    it('finds entity by name', function () {
      expect(el.findEntity('spells', 'SPell1')).to.deep.equal(spell1);
    });


    it('no match with bad whitespace', function () {
      expect(el.findEntity('spells', 'spel l2')).to.be.undefined; // jshint ignore:line
    });

    it('matches ignoring whitespace', function () {
      expect(el.findEntity('spells', 'spel l2', true)).to.deep.equal(spell2);
    });

  });

  describe('#addEntities', function () {
    var el = new EntityLookup();
    el.configureEntity('spells', [el.getMonsterSpellUpdater()], _.constant(true));
    el.configureEntity('monsters', [el.getSpellHydrator()], _.constant(true));
    it('should hydrate spells', function () {
      el.addEntities({ version: '0.2', monsters: utils.deepClone([monster1, monster2]) });
      expect(el.findEntity('monsters', 'monster1')).to.deep.equal({
        name: 'monster1',
        spells: ['spell1', 'spell2']
      });
      el.addEntities({ version: '0.2', spells: utils.deepClone([spell1, spell2]) });
      expect(el.findEntity('monsters', 'monster1')).to.deep.equal({ name: 'monster1', spells: [spell1, spell2] });
      el.addEntities({ version: '0.2', monsters: utils.deepClone([monster3]) });
      expect(el.findEntity('monsters', 'monster3')).to.deep.equal({ name: 'monster3', spells: [spell1] });
    });
  });


  describe('functional test', function () {
    var el = new EntityLookup();
    var jv = new JSONValidator(spec);
    el.configureEntity('spells', [el.getMonsterSpellUpdater()], EntityLookup.getVersionChecker('0.2'));
    el.configureEntity('monsters', [EntityLookup.jsonValidatorAsEntityProcessor(jv), el.getSpellHydrator()], EntityLookup.jsonValidatorAsVersionChecker(jv));
    glob.sync('../../roll20/data/spellSourceFiles/spellData.json').forEach(function (jsonFile) {
      var spells = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      it('loads spells correctly', function () {
        var results = el.addEntities(spells);
        expect(results.spells.skipped).to.be.empty; //jshint ignore: line
        expect(results.spells.deleted).to.be.empty; //jshint ignore: line
        expect(results.spells.patched).to.be.empty; //jshint ignore: line
        expect(results.spells.withErrors).to.be.empty; //jshint ignore: line
        expect(results.errors).to.be.empty; //jshint ignore: line
        expect(results.spells.added).to.have.lengthOf(spells.spells.length);
      });
    });

    glob.sync('../../roll20/data/monsterSourceFiles/*.json').forEach(function (jsonFile) {
      describe('JSON file: ' + jsonFile, function () {
        var monsters = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        it('loads ' + jsonFile + ' correctly', function () {
          var results = el.addEntities(monsters);
          expect(results.errors).to.be.empty; //jshint ignore: line
          expect(results.monsters.skipped).to.be.empty; //jshint ignore: line
          expect(results.monsters.deleted).to.be.empty; //jshint ignore: line
          expect(results.monsters.patched).to.be.empty; //jshint ignore: line
          expect(results.monsters.withErrors).to.be.empty; //jshint ignore: line
          expect(results.monsters.added).to.have.lengthOf(monsters.monsters.length);
        });
      });

    });
  });
});

