/* globals describe: false, it:false, after:false */
var expect = require('chai').expect;
var utils = require('../lib/utils');
var mockery = require('mockery');
mockery.enable({useCleanCache: true});
mockery.warnOnUnregistered(false);


describe('entity-lookup', function () {
    'use strict';

    var spell1 = {name: 'spell1'};
    var spell2 = {name: 'spell2'};

    var monster1 = {name: 'monster1', spells: 'spell1, spell2'};
    var monster2 = {name: 'monster2'};
    var monster3 = {name: 'monster3', spells: 'spell1'};



    describe('#lookupEntity', function () {
        mockery.resetCache();
        var el = require('../lib/entity-lookup');
        el.configureEntity('spells', [el.monsterSpellUpdater]);
        el.configureEntity('monsters', [el.spellHydrator]);
        el.addEntities({version: '0.2', spells: [spell1, spell2]});
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
        mockery.resetCache();
        var el = require('../lib/entity-lookup');
        el.configureEntity('spells', [el.monsterSpellUpdater.bind(el)]);
        el.configureEntity('monsters', [el.spellHydrator.bind(el)]);
        it('should hydrate spells', function () {
            el.addEntities({version: '0.2', monsters: utils.deepClone([monster1, monster2])});
            expect(el.findEntity('monsters', 'monster1')).to.deep.equal({
                name: 'monster1',
                spells: ['spell1', 'spell2']
            });
            el.addEntities({version: '0.2', spells: utils.deepClone([spell1, spell2])});
            expect(el.findEntity('monsters', 'monster1')).to.deep.equal({name: 'monster1', spells: [spell1, spell2]});
            el.addEntities({version: '0.2', monsters: utils.deepClone([monster3])});
            expect(el.findEntity('monsters', 'monster3')).to.deep.equal({name: 'monster3', spells: [spell1]});
        });
    });

    after(function () {
        mockery.deregisterAll();
        mockery.disable();
    });

});

