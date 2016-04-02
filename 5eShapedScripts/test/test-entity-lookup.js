/* globals describe: false, it:false */
var expect = require('chai').expect;
var _ = require('underscore');
var el = require('../lib/entity-lookup');

describe('entity-lookup', function () {
    'use strict';

    var logger = {
        info: _.noop
    };

    var spell1 = {name: 'spell1'};
    var spell2 = {name: 'spell2'};

    describe('#lookupEntity', function () {
        el.addEntities(logger, 'spell', [spell1, spell2]);
        it('finds entity by name', function () {
            expect(el.findEntity('spell', 'SPell1')).to.deep.equal(spell1);
        });


        it('no match with bad whitespace', function () {
            expect(el.findEntity('spell', 'spel l2')).to.be.undefined; // jshint ignore:line
        });

        it('matches ignoring whitespace', function () {
            expect(el.findEntity('spell', 'spel l2', true)).to.deep.equal(spell2);
        });

    });
});
