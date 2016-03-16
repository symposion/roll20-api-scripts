const gulp = require('gulp');
const mocha = require('gulp-mocha');
const jshint = require('gulp-jshint');

gulp.task('default', function() {
  // place code for your default task here
});

gulp.task('lint', function () {
    'use strict';
    //noinspection JSUnresolvedFunction
    return gulp.src('./components/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('test', function() {
    'use strict';
	return gulp.src('tests/suite.js', {read: false})
		.pipe(mocha());
});
