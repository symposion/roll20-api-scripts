var _ = require('underscore');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
require('chai').should();
var mocha = require('mocha');
var describe = require('mocha').describe;
var Promise = require("bluebird");
var fs = require('fs');
Promise.promisifyAll(fs);
var glob = require('glob');
var getParser = require('../components/parser');
var format = require('../components/formats');
var logger = require('../components/logger').getLogger({config:{logLevel:'WARN'}});
var sanitise = require('../components/sanitiser');
var parser = getParser(format.mmFormat, logger);


describe("Monster Manual tests", function() {
	"use strict";


	chaiAsPromised.transformAsserterArgs = function (args) {
		return Promise.all(args);
	};

	var files = glob.sync('./tests/data/*.txt');
	files.forEach(function(file) {

		it("correctly parses " + file.replace( /\.txt$/,''), function(){
			return runTestForFile(file).should.eventually.deep.equal(getExpectedOutputForFile(file));
		});

	});
});


function runTestForFile(file) {
	"use strict";
	return fs.readFileAsync(file, 'utf-8').then(runParse);
}

function getExpectedOutputForFile(file) {
	"use strict";

	var filename = file.replace(/\.txt$/, '.json');
	return fs.readFileAsync(filename, 'utf-8')
		.then(function(data) {
			return JSON.parse(data);
		});


}


function runParse(statBlockText) {
	"use strict";
	try {
		return parser.parse(sanitise(logger, statBlockText));
	}
	catch(e) {
		//TODO: convert the errors
		return e;
	}
}
