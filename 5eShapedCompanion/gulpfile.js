'use strict';
const gulp = require('gulp');
const GitHubAPI = require('github');
const github = new GitHubAPI({ version: '3.0.0' });
promisify(github.releases, ['listReleases', 'listAssets']);
const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const request = require('request');
const semver = require('semver');
const jeditor = require('gulp-json-editor');
const merge = require('merge-stream');
const gutil = require('gulp-util');
const del = require('del');

const repoInfo = {
  owner: 'symposion',
  repo: 'roll20-shaped-scripts',
};

const auth = {
  type: 'oauth',
  token: process.env.GH_TOKEN,
};

gulp.task('syncReleases', ['clean'], () => {
  const localReleases = getReleaseDirectories();
  github.authenticate(auth);
  const releasesAsync = github.releases.listReleases(repoInfo);

  const assetsAsync = releasesAsync
    .then(releases =>
      Promise.all(releases.map(release =>
        github.releases.listAssets(_.defaults({ id: release.id }, repoInfo))
      ))
    );

  return Promise.all([releasesAsync, assetsAsync])
    .then(results => {
      const releases = results[0];
      const assetLists = results[1];
      return releases
        .map((release, index) => {
          release.assets = assetLists[index];
          return release;
        })
        .filter(release => !_.contains(localReleases, release.tag_name));
    })
    .then(releases => Promise.all(releases.map(addRelease)))
    .then(updateJSON);
});

gulp.task('clean', () => {
  return del(['latest/*']);
});

function updateJSON() {
  const releaseDirs = getReleaseDirectories().sort(semver.rcompare);
  const latestVersion = releaseDirs[0];
  if (latestVersion) {
    const scriptStream = gulp.src('./script.json')
      .pipe(jeditor(json => {
        json.version = latestVersion;
        json.previousversions = releaseDirs.slice(1);
        return json;
      }))
      .pipe(gulp.dest('./'));

    const packageStream = gulp.src('./package.json')
      .pipe(jeditor({ version: latestVersion }))
      .pipe(gulp.dest('./'));

    const copyStream = gulp.src(`./${latestVersion}/*`)
     .pipe(gulp.dest('./latest/'));

    return merge(scriptStream, packageStream).add(copyStream);
  }
  return _.noop;
}

function addRelease(release) {
  const releaseDir = release.tag_name;
  gutil.log(`Making directory for release ${releaseDir}`);
  fs.mkdirSync(`./${releaseDir}`);
  return Promise.all(release.assets.map(asset =>
    new Promise((resolve, reject) => {
      const fileName = `./${releaseDir}/${asset.name}`;
      const file = fs.createWriteStream(fileName);
      file.on('finish', () => file.close(resolve));
      request
        .get(asset.browser_download_url)
        .on('error', err => {
          reject(err);
        })
        .pipe(file);
    })
  ));
}


function promisify(object, methodNames) {
  methodNames.forEach(methodName => {
    const origMethod = object[methodName];
    object[methodName] = function wrapper() {
      const args = Array.prototype.slice.call(arguments);
      return new Promise((resolve, reject) => {
        args.push((err, data) => {
          if (err !== null) {
            return reject(err);
          }
          return resolve(data);
        });
        origMethod.apply(object, args);
      });
    };
  });
}

function getReleaseDirectories() {
  return fs.readdirSync('./')
    .filter((file) => fs.statSync(path.join('./', file)).isDirectory())
    .filter(dir => dir.match(/\d+\.\d+\.\d+/));
}
