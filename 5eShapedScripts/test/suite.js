/* globals describe: false, before:false, it:false */
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
require('chai').should();
var Promise = require('bluebird'); // jshint ignore:line
var fs = require('fs');
Promise.promisifyAll(fs);
var glob = require('glob');
var parseModule = require('../lib/parser');
var logger = require('../lib/logger')({logLevel: 'WARN'});
var sanitise = require('../lib/sanitise');

/**
 * @name readFileAsync
 * @memberOf fs
 */

/**
 * @name sync
 * @memberOf glob
 */


describe('Monster Manual tests', function () {
    'use strict';

    var parser;

    before(function () {
        return fs.readFileAsync('./resources/mmFormatSpec.json', 'utf-8')
            .then(function (specText) {
            var parsed = JSON.parse(specText);
                parser = parseModule.getParser(parsed, logger);
        });
    });


    var files = glob.sync('./test/data/*.txt');
    files.forEach(function (file) {
        it('correctly parses ' + file.replace(/\.txt$/, ''), function () {
            return Promise.join(runTestForFile(parser, file),
                getExpectedOutputForFile(file),
                function (test, expected) {
                    //noinspection JSUnresolvedVariable
                    return test.should.deep.equal(expected);
                });
        });

    });
});


function runTestForFile(parser, file) {
    'use strict';
    return fs.readFileAsync(file, 'utf-8').then(function (statblockText) {
        return runParse(parser, statblockText);
    });
}

function getExpectedOutputForFile(file) {
    'use strict';

    var filename = file.replace(/\.txt$/, '.json');
    return fs.readFileAsync(filename, 'utf-8')
        .then(function (data) {
            return JSON.parse(data);
        });


}


function runParse(parser, statBlockText) {
    'use strict';
    try {
        return parser.parse(sanitise(statBlockText, logger));
    }
    catch (e) {
        //TODO: convert the errors
        console.log(e.stack);
        return e;
    }
}
