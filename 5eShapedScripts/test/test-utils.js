/* globals describe: false, it:false */
var expect = require('chai').expect;
var utils = require('../lib/utils');

describe('utils', function () {
    'use strict';

    describe('#deepExtend', function () {

        var result = utils.deepExtend({foo: 'bar', blort: ['wibble']}, {
            foo: 'barprime',
            blort: [undefined, 'bumble'],
            newVal: {funky: 'raw'}
        });
        it('parse options correctly', function () {
            expect(result).to.deep.equal({
                blort: [
                    undefined,
                    'bumble'
                ],
                foo: 'barprime',
                newVal: {
                    funky: 'raw'
                }
            });
        });
    });

    describe('#createObjectFromPath', function () {

        it('create from path correctly', function () {
            var result = utils.createObjectFromPath('foo.bar[1].blort[2]', 'testVal');
            var expected = {
                foo: {
                    bar: []
                }
            };
            expected.foo.bar[1] = {
                blort: []
            };
            expected.foo.bar[1].blort[2] = 'testVal';
            expect(result).to.deep.equal(expected);
        });
    });
});
