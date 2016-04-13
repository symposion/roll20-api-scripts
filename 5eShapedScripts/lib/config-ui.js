'use strict';
var _ = require('underscore');
var utils = require('./utils');

// eslint-disable-next-line
class ConfigUi {

  ////////////
  // Menus
  ////////////
  getConfigOptionsAll(config, optionsSpec) {
    return this.getConfigOptionGroupAdvTracker(config, optionsSpec) +
      this.getConfigOptionGroupTokens(config, optionsSpec) +
      this.getConfigOptionGroupNewCharSettings(config, optionsSpec);

  }

  getConfigOptionsMenu() {
    var optionRows = this.makeOptionRow('Advantage Tracker', 'atMenu', '', 'view', '', '#02baf2') +
      this.makeOptionRow('Token Defaults', 'tsMenu', '', 'view', '', '#02baf2') +
      this.makeOptionRow('New Characters', 'ncMenu', '', 'view', '', '#02baf2');

    var th = utils.buildHTML('th', 'Main Menu', { colspan: '2' });
    var tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });

    return utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });
  }

  getConfigOptionGroupAdvTracker(config, optionsSpec) {
    var optionRows = this.makeToggleSetting(config, 'advTrackerSettings.showMarkers', 'Show Markers');

    var th = utils.buildHTML('th', 'Advantage Tracker Options', { colspan: '2' });
    var tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
    var table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

    return table + this.backToMainMenuButton();
  }

  getConfigOptionGroupTokens(config, optionsSpec) {
    var auraButtonWidth = 60;

    var retVal = '<table style="width: 100%; font-size: 0.9em;">' +
      '<tr style="margin-top: 5px;"><th colspan=2>Token Options</th></tr>' +
      this.makeToggleSetting(config, 'tokenSettings.number', 'Numbered Tokens') +
      this.makeToggleSetting(config, 'tokenSettings.showName', 'Show Name Tag') +
      this.makeToggleSetting(config, 'tokenSettings.showNameToPlayers', 'Show Name to Players');

    for (var i = 1; i <= 3; i++) {
      retVal += this.makeInputSetting(config, 'tokenSettings.bar' + i + '.attribute', 'Bar ' + i +
        ' Attribute', 'Bar ' + i + ' Attribute (empty to unset)');
      retVal += this.makeToggleSetting(config, 'tokenSettings.bar' + i + '.max', 'Bar ' + i + ' Set Max');
      retVal += this.makeToggleSetting(config, 'tokenSettings.bar' + i + '.link', 'Bar ' + i + ' Link');
      retVal += this.makeToggleSetting(config, 'tokenSettings.bar' + i + '.showPlayers', 'Bar ' + i +
        ' Show Players');
    }

    // Build out the aura grids
    for (i = 1; i <= 2; i++) {
      var currRad = utils.getObjectFromPath(config, 'tokenSettings.aura' + i + '.radius');
      var currRadEmptyHint = currRad ? currRad : '[not set]';
      // if (currRad) {
      //   currRadEmptyHint = currRad;
      // }
      var currColor = utils.getObjectFromPath(config, 'tokenSettings.aura' + i + '.color');
      var currSquare = utils.getObjectFromPath(config, 'tokenSettings.aura' + i + '.square');

      var radBtn = this.makeOptionButton('tokenSettings.aura' + i + '.radius',
        '?{Aura ' + i + ' Radius (empty to unset)' + '|' + currRad + '}',
        this.makeText(currRadEmptyHint), 'click to edit', currRadEmptyHint === '[not set]' ? '#f84545' : '#02baf2',
        undefined, auraButtonWidth);
      var colorBtn = this.makeOptionButton('tokenSettings.aura' + i + '.color',
        '?{Aura ' + i + ' Color (hex colors)' + '|' + currColor + '}',
        this.makeText(currColor), 'click to edit', currColor, utils.getContrastYIQ(currColor), auraButtonWidth);
      var squareBtn = this.makeOptionButton('tokenSettings.aura' + i + '.square', !currSquare,
        this.makeBoolText(currSquare), 'click to toggle', currSquare ? '#65c4bd' : '#f84545',
        undefined, auraButtonWidth);

      retVal += utils.buildHTML('tr', [
        {
          tag: 'td', innerHtml: [
          {
            tag: 'table', innerHtml: [
            {
              tag: 'tr', innerHtml:
            [{ tag: 'th', innerHtml: 'Aura ' + i, attrs: { colspan: 3 } }] },
            {
              tag: 'tr', innerHtml:
            [{ tag: 'td', innerHtml: 'Range' }, { tag: 'td', innerHtml: 'Color' }, { tag: 'td', innerHtml: 'Square' }] },
          { tag: 'tr', innerHtml: [
            { tag: 'td', innerHtml: radBtn }, { tag: 'td', innerHtml: colorBtn }, { tag: 'td', innerHtml: squareBtn}] }],
        attrs: { style: 'width: 100%; text-align: center;' }}], attrs:{colspan: '2'}}], {style: 'border: 1px solid gray;'});

    }

    retVal += '</table>' + this.backToMainMenuButton();

    return retVal;
  }

  getConfigOptionGroupNewCharSettings(config, optionsSpec) {
    var optionRows = this.makeQuerySetting(config, 'newCharSettings.sheetOutput', 'Sheet Output',
      optionsSpec.newCharSettings.sheetOutput()) +
      this.makeQuerySetting(config, 'newCharSettings.deathSaveOutput',
        'Death Save Output', optionsSpec.newCharSettings.deathSaveOutput()) +
      this.makeQuerySetting(config, 'newCharSettings.initiativeOutput', 'Initiative Output',
        optionsSpec.newCharSettings.initiativeOutput()) +
      this.makeToggleSetting(config, 'newCharSettings.showNameOnRollTemplate', 'Show Name on Roll Template',
        optionsSpec.newCharSettings.showNameOnRollTemplate()) +
      this.makeQuerySetting(config, 'newCharSettings.rollOptions', 'Roll Options',
        optionsSpec.newCharSettings.rollOptions()) +
      this.makeQuerySetting(config, 'newCharSettings.initiativeRoll', 'Init Roll',
        optionsSpec.newCharSettings.initiativeRoll()) +
      this.makeToggleSetting(config, 'newCharSettings.initiativeToTracker', 'Init To Tracker',
        optionsSpec.newCharSettings.initiativeToTracker()) +
      this.makeToggleSetting(config, 'newCharSettings.breakInitiativeTies', 'Break Init Ties',
        optionsSpec.newCharSettings.breakInitiativeTies()) +
      this.makeToggleSetting(config, 'newCharSettings.showTargetAC', 'Show Target AC',
        optionsSpec.newCharSettings.showTargetAC()) +
      this.makeToggleSetting(config, 'newCharSettings.showTargetName', 'Show Target Name',
        optionsSpec.newCharSettings.showTargetName()) +
      this.makeToggleSetting(config, 'newCharSettings.autoAmmo', 'Auto Use Ammo',
        optionsSpec.newCharSettings.autoAmmo());

    var th = utils.buildHTML('th', 'New Character Sheets', { colspan: '2' });
    var tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
    var table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

    return table + this.backToMainMenuButton();
  }

  backToMainMenuButton() {
    return utils.buildHTML('a', 'back to main menu', {
      href: '!shaped-config',
      style: 'text-align: center; margin: 5px 0 0 0; padding: 2px 2px ; border-radius: 10px; white-space: nowrap; ' +
      'overflow: hidden; text-overflow: ellipsis; background-color: #02baf2; border-color: #c0c0c0;'
    });
  }

  makeInputSetting(config, path, title, prompt) {
    var currentVal = utils.getObjectFromPath(config, path);
    var emptyHint = '[not set]';
    if (currentVal) {
      emptyHint = currentVal;
    }

    return this.makeOptionRow(title, path, '?{' + prompt + '|' + currentVal +
      '}', emptyHint, 'click to edit', emptyHint === '[not set]' ? '#f84545' : '#02baf2');
  }

  //noinspection JSUnusedGlobalSymbols
  makeColorSetting(config, path, title, prompt) {
    var currentVal = utils.getObjectFromPath(config, path);
    var emptyHint = '[not set]';

    if (currentVal) {
      emptyHint = currentVal;
    }

    var buttonColor = emptyHint === '[not set]' ? '#02baf2' : currentVal;

    return this.makeOptionRow(title, path, '?{' + prompt + '|' + currentVal +
      '}', emptyHint, 'click to edit', buttonColor, utils.getContrastYIQ(buttonColor));
  }

  makeToggleSetting(config, path, title, optionsSpec) {
    var currentVal = utils.getObjectFromPath(config, path);
    if (optionsSpec) {
      currentVal = _.invert(optionsSpec)[currentVal] === 'true';
    }

    return this.makeOptionRow(title, path, !currentVal,
      this.makeBoolText(currentVal), 'click to toggle', currentVal ? '#65c4bd' : '#f84545');
  }

  makeQuerySetting(config, path, title, optionsSpec) {
    var currentVal = _.invert(optionsSpec)[utils.getObjectFromPath(config, path)];
    var optionList = _.keys(optionsSpec);

    // move the current option to the front of the list
    optionList.splice(optionList.indexOf(currentVal), 1);
    optionList.unshift(currentVal);

    return this.makeOptionRow(title, path, '?{' + title + '|' + optionList.join('|') +
      '}', this.makeText(currentVal), 'click to change', '#02baf2');
  }

  makeOptionRow(optionTitle, path, command, linkText, tooltip, buttonColor, buttonTextColor) {
    var col1 = utils.buildHTML('td', optionTitle);
    var col2 = utils.buildHTML('td', this.makeOptionButton(path, command, linkText, tooltip, buttonColor, buttonTextColor),
      { style: 'text-align:right;' });

    return utils.buildHTML('tr', col1 + col2, { style: 'border: 1px solid gray;' });
  }

  makeOptionButton(path, command, linkText, tooltip, buttonColor, buttonTextColor, width) {
    if (_.isUndefined(width)) { width = 80; }

    var css = 'text-align: center; width: ' + width + 'px; margin: 5px 0 0 0; ' +
      'padding: 2px 2px ; border-radius: 10px; border-color: #c0c0c0;' +
      'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background-color: ' +
      buttonColor + ';';
    if (buttonTextColor) {
      css += 'color: ' + buttonTextColor + '; ';
    }

    return utils.buildHTML('a', linkText, {
      style: css,
      href: '!shaped-config --' + path + ' ' + command
    });
  }

  makeText(value) {
    return utils.buildHTML('span', value, { style: 'padding: 0 2px;' });
  }

  makeBoolText(value) {
    return value === true ?
      utils.buildHTML('span', 'on', { style: 'padding: 0 2px;' }) :
      utils.buildHTML('span', 'off', { style: 'padding: 0 2px;' });
  }
}

module.exports = ConfigUi;
