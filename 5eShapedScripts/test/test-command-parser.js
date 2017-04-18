/* globals describe: false, it:false */
var expect = require('chai').expect;
var cp = require('../lib/command-parser');

var testValidator = function (value) {
    'use strict';
    return {
        converted: value,
        valid: true
    };
};

describe('command-parser', function () {
    'use strict';

    describe('#command', function () {

        it('parse options correctly', function () {
            var result = {};
            cp('shaped')
              .addCommand('config', function (object) {
                  result = object;
              })
              .option('foo', {
                  subOne: [{
                      tinky: testValidator,
                      blort: testValidator
                  }],
                  subTwo: testValidator,
                  subThree: {
                      wibble: testValidator,
                      flurb: [
                          testValidator
                      ]
                  }
              })
              .end()
              .processCommand({content: '!shaped-config --foo.subThree.flurb[1] splat', type: 'api'});
            var expected = {
                foo: {
                    subThree: {
                        flurb: []
                    }
                },
                selected: undefined
            };
            expected.foo.subThree.flurb[1] = 'splat';
            expect(result).to.deep.equal(expected);
        });
    });
});
