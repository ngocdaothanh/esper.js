"use strict";

var fs = require('fs');
var path = require('path');
var dir = path.join(__dirname, 'ext', 'jerry');
var expect = require('chai').expect;

describe.only("Jerty Tests", function() {
	var files = fs.readdirSync(dir);
	for ( var i = 0; i < files.length; ++i ) {
		var file = files[i];
		if ( !/.js$/.test(file) ) continue;

		if ( /^sdasdf/.test(file) ) {
			xit(file, function() {});
			continue;
		}

		(function(file) {
			
			var Engine = require('../src/index.js');
			var src = fs.readFileSync(path.join(dir,file), 'utf8');

			it(file, function() {
				//console.log("\n");
				//console.log(file);
				var engine = new Engine({strict: false});
				engine.eval(src);
				expect(true).to.be.true;
			});
		})(files[i]);
	}

});