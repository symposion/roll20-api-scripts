/* globals describe: false, it:false */
var expect = require('chai').expect;
var _ = require('underscore');
var el = require('./dummy-entity-lookup');
var mpp = require('../lib/monster-post-processor');

var spellcastingTrait = 'Spellcasting. The lich is an 18th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 20, +12 to hit with spell attacks). The lich has the following wizard spells prepared:\n' +
  'Cantrips (at will): mage hand, prestidigitation, ray off rost 1st level (4 slots): detect magic, magic missile, shield,\n' +
  'thunderwave\n' +
  '2nd level (3 slots): detect thoughts, invisibility, Melf\'s acid arrow,\n' +
  'mirror image\n' +
  '3rd level (3 slots): animate dead, counterspell, dispel\n' +
  'magic, fireball\n' +
  '4th level (3 slots): blight, dimension door\n' +
  '5th level (3 slots): cloudkill, scrying\n' +
  '6th level (1 slot): disintegrate, globe of invulnerability 7thlevel(1 slot):fingerofdeath,planeshift\n' +
  '8th level (1 slot): dominate monster, power word stun 9th level(1slot):powerwordkill';

var reformattedTrait = 'Spellcasting. The lich is an 18th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 20, +12 to hit with spell attacks). The lich has the following wizard spells prepared:\n' +
  'Cantrips (at will): Mage Hand, Prestidigitation, Ray of Frost\n' +
  '1st level (4 slots): Detect Magic, Magic Missile, Shield, Thunderwave\n' +
  '2nd level (3 slots): Detect Thoughts, Invisibility, Melf\'s Acid Arrow, Mirror Image\n' +
  '3rd level (3 slots): Animate Dead, Counterspell, Dispel Magic, Fireball\n' +
  '4th level (3 slots): Blight, Dimension Door\n' +
  '5th level (3 slots): Cloudkill, Scrying\n' +
  '6th level (1 slot): Disintegrate, Globe of Invulnerability\n' +
  '7th level (1 slot): Finger of Death, Planeshift\n' +
  '8th level (1 slot): Dominate Monster, Power Word Stun\n' +
  '9th level (1slot): Power Word Kill';

var innateTrait = 'Innate Spellcasting. The draw\'s innate spellcasting ability is Charisma (spell save DC 15). She can innately cast the following spells, requiring no material components:\n' +
  'At will : dancing lights\n' +
  '1/day each: darkness,faerie fire, levitate (self only)';

var reformattedInnateTrait = 'Innate Spellcasting. The draw\'s innate spellcasting ability is Charisma (spell save DC 15). She can innately cast the following spells, requiring no material components:\n' +
  'At will: Dancing Lights\n' +
  '1/day each: Darkness, Faerie Fire, Levitate (self only)';

var spellList = [
    'Dancing Lights',
    'Mage Hand',
    'Prestidigitation',
    'Ray of Frost',
    'Darkness',
    'Detect Magic',
    'Faerie Fire',
    'Levitate',
    'Magic Missile',
    'Shield',
    'Thunderwave',
    'Detect Thoughts',
    'Invisibility',
    'Melf\'s Acid Arrow',
    'Mirror Image',
    'Animate Dead',
    'Counterspell',
    'Dispel Magic',
    'Fireball',
    'Blight',
    'Dimension Door',
    'Cloudkill',
    'Scrying',
    'Disintegrate',
    'Globe of Invulnerability',
    'Finger of Death',
    'Planeshift',
    'Dominate Monster',
    'Power Word Stun',
    'Power Word Kill'
];


describe('monster-post-processor', function () {
    'use strict';


    it('extracts spell details', function () {
        var monster = {
            traits: [
                {name: 'Spellcasting', text: spellcastingTrait},
                {name: 'Innate Spellcasting', text: innateTrait}
            ]
        };
        var reformedMonster = {
            traits: [
                {name: 'Spellcasting', text: reformattedTrait},
                {name: 'Innate Spellcasting', text: reformattedInnateTrait}
            ],
            spells: _.map(spellList, _.partial(el.entityLookup.findEntity, 'spell'))
        };
        var result = mpp(monster, el.entityLookup);
        //noinspection JSUnresolvedVariable
        expect(result).to.deep.equal(reformedMonster);
    });
});
