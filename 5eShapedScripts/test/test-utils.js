/* globals describe: false, it:false */
var expect = require('chai').expect;
var utils = require('../lib/utils');

describe('utils', function () {
    'use strict';

    describe('#deepExtend', function () {


        it('parse options correctly', function () {
            var result = utils.deepExtend({foo: 'bar', blort: ['wibble']}, {
                foo: 'barprime',
                blort: [undefined, 'bumble'],
                newVal: {funky: 'raw'}
            });
            expect(result).to.deep.equal({
                blort: [
                    'wibble',
                    'bumble'
                ],
                foo: 'barprime',
                newVal: {
                    funky: 'raw'
                }
            });
        });


        it('should extend arrays properly', function () {
            var result = utils.deepExtend({foo: ['one', 'two']}, {foo: [undefined, undefined, 'three']});
            expect(result).to.deep.equal({foo: ['one', 'two', 'three']});
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
