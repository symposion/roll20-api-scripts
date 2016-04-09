var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var webpack = require('webpack-stream');

gulp.task('default', ['test', 'lint'], function () {
  'use strict';
  return gulp.src('./lib/entry-point.js')
    .pipe(webpack(require('./webpack.config.js')))
    .pipe(gulp.dest('./'));
});

gulp.task('lint', function () {
  'use strict';
  return gulp.src('./lib/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test', function () {
  'use strict';
  return gulp.src('test/test-*.js', { read: false })
    .pipe(mocha());
});
