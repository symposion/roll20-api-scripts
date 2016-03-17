/* globals describe: false, it:false */
require('chai').should();
const srdConverter = require('../lib/srd-converter');

describe('srd-converter', function () {
    'use strict';

    const fullObject = {
        character_name: 'Wobbler',
        traits: [
            {name: 'Trait One', recharge: '1/day', text: 'trait text blah blah\nblah'},
            {name: 'Trait Two', text: 'trait 2 text blah blah\nblah'}
        ],
        actions: [
            {name: 'Action One', recharge: '5-6', text: 'action text blah blah\nblah'},
            {name: 'Action Two', text: 'action 2 text blah blah\nblah'}
        ],
        reactions: [
            {name: 'Reaction One', recharge: '5-6', text: 'reaction text blah blah\nblah'},
            {name: 'Reaction Two', text: 'reaction 2 text blah blah\nblah'}
        ],
        legendaryPoints: 3,
        legendaryActions: [
            {name: 'Legendary Action One', cost: 1, text: 'legendary text blah blah\nblah'},
            {name: 'Legendary Action Two', cost: 2, text: 'legendary 2 text blah blah\nblah'}
        ]
    };

    const emptyObject = {
        character_name: 'Wobbler'
    };

    const emptyArrayObject = {
        character_name: 'Wobbler',
        traits: [],
        actions: [],
        reactions: [],
        legendaryActions: []
    };

    const someMissing = {
        character_name: 'Wobbler',
        traits: [
            {name: 'Trait Two', text: 'trait 2 text blah blah\nblah'}
        ],
        actions: [
            {name: 'Action One', recharge: '5-6', text: 'action text blah blah\nblah'},
            {name: 'Action Two', text: 'action 2 text blah blah\nblah'}
        ]
    };

    it('correctly concatenates a full object', function () {
        srdConverter(fullObject).should.have.property('content_srd',
            'Traits\n' +
            'Trait One (1/day) trait text blah blah\nblah\n' +
            'Trait Two  trait 2 text blah blah\nblah\n' +
            'Actions\n' +
            'Action One (5-6) action text blah blah\nblah\n' +
            'Action Two  action 2 text blah blah\nblah\n' +
            'Reactions\n' +
            'Reaction One (5-6) reaction text blah blah\nblah\n' +
            'Reaction Two  reaction 2 text blah blah\nblah\n' +
            'Legendary Actions\n' +
            'The Wobbler can take 3 legendary actions, choosing from the options below. ' +
            'It can take only one legendary action at a time and only at the end of another creature\'s turn. ' +
            'The Wobbler regains spent legendary actions at the start of its turn.\n' +
            'Legendary Action One . legendary text blah blah\nblah\n' +
            'Legendary Action Two (Costs 2 actions). legendary 2 text blah blah\nblah');
    });

    it('correctly concatenates an empty object', function () {
        srdConverter(emptyObject).should.have.property('content_srd', '');
    });

    it('correctly concatenates an object with empty arrays', function () {
        srdConverter(emptyArrayObject).should.have.property('content_srd', '');
    });

    it('correctly concatenates a medium object', function () {
        srdConverter(someMissing).should.have.property('content_srd',
            'Traits\n' +
            'Trait Two  trait 2 text blah blah\nblah\n' +
            'Actions\n' +
            'Action One (5-6) action text blah blah\nblah\n' +
            'Action Two  action 2 text blah blah\nblah');
    });


});
