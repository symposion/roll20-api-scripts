const gulp = require('gulp');
const mocha = require('gulp-mocha');
const jshint = require('gulp-jshint');
var webpack = require('webpack-stream');
gulp.task('default', ['make-roll20-js'], function () {
  // place code for your default task here
});

gulp.task('lint', function () {
    'use strict';
    return gulp.src('./components/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('make-roll20-js', ['test', 'lint'], function () {
    'use strict';
    return gulp.src('lib/entry-point.js')
        .pipe(webpack(require('./webpack.config.js')))
        .pipe(gulp.dest('./'));
});

gulp.task('test', function() {
    'use strict';
    return gulp.src('test/suite.js', {read: false})
		.pipe(mocha());
});
