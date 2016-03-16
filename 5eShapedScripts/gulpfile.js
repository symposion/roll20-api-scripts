const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('default', function() {
  // place code for your default task here
});

gulp.task('test', function() {
	"use strict";
	return gulp.src('tests/suite.js', {read: false})
		.pipe(mocha());
})
