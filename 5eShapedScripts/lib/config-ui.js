'use strict';
var _ = require('underscore');
var utils = require('./utils');

class ConfigUi {
  static getConfigOptionsAll(config, optionsSpec) {
    return ConfigUi.getConfigOptionGroupAdvTracker(config, optionsSpec) +
      ConfigUi.getConfigOptionGroupTokens(config, optionsSpec) +
      ConfigUi.getConfigOptionGroupNewCharSettings(config, optionsSpec);
  }

  static getConfigOptionGroupAdvTracker(config, optionsSpec) {
    return '<table style="width: 100%; font-size: 0.9em;">' +
      '<tr style="margin-top: 5px;"><th colspan=2>Advantage Tracker Options</th></tr>' +
      ConfigUi.makeToggleSetting(config, 'advTrackerSettings.showMarkers', 'Show Markers') +
      '</table>';
  }

  static getConfigOptionGroupTokens(config, optionsSpec) {
    var retVal = '<table style="width: 100%; font-size: 0.9em;">' +
      '<tr style="margin-top: 5px;"><th colspan=2>Token Options</th></tr>' +
      ConfigUi.makeToggleSetting(config, 'tokenSettings.number', 'Numbered Tokens') +
      ConfigUi.makeToggleSetting(config, 'tokenSettings.showName', 'Show Name Tag') +
      ConfigUi.makeToggleSetting(config, 'tokenSettings.showNameToPlayers', 'Show Name to Players');

    for (var i = 1; i <= 3; i++) {
      retVal += ConfigUi.makeInputSetting(config, 'tokenSettings.bar' + i + '.attribute', 'Bar ' + i + ' Attribute', 'Bar ' + i + ' Attribute (empty to unset)');
      retVal += ConfigUi.makeToggleSetting(config, 'tokenSettings.bar' + i + '.max', 'Bar ' + i + ' Set Max');
      retVal += ConfigUi.makeToggleSetting(config, 'tokenSettings.bar' + i + '.link', 'Bar ' + i + ' Link');
      retVal += ConfigUi.makeToggleSetting(config, 'tokenSettings.bar' + i + '.showPlayers', 'Bar ' + i + ' Show Players');
    }

    retVal += '</table>';

    return retVal;
  }

  static getConfigOptionGroupNewCharSettings(config, optionsSpec) {
    return '<table style="width: 100%; font-size: 0.9em;">' +
      '<tr style="margin-top: 5px;"><th colspan=2>New Character Sheets</th></tr>' +
      ConfigUi.makeQuerySetting(config, 'newCharSettings.sheetOutput', 'Sheet Output', optionsSpec.newCharSettings.sheetOutput()) +
      ConfigUi.makeQuerySetting(config, 'newCharSettings.deathSaveOutput', 'Death Save Output', optionsSpec.newCharSettings.deathSaveOutput()) +
      ConfigUi.makeQuerySetting(config, 'newCharSettings.initiativeOutput', 'Initiative Output', optionsSpec.newCharSettings.initiativeOutput()) +
      ConfigUi.makeToggleSetting(config, 'newCharSettings.showNameOnRollTemplate', 'Show Name on Roll Template', optionsSpec.newCharSettings.showNameOnRollTemplate()) +
      ConfigUi.makeQuerySetting(config, 'newCharSettings.rollOptions', 'Roll Options', optionsSpec.newCharSettings.rollOptions()) +
      ConfigUi.makeQuerySetting(config, 'newCharSettings.initiativeRoll', 'Init Roll', optionsSpec.newCharSettings.initiativeRoll()) +
      ConfigUi.makeToggleSetting(config, 'newCharSettings.initiativeToTracker', 'Init To Tracker', optionsSpec.newCharSettings.initiativeToTracker()) +
      ConfigUi.makeToggleSetting(config, 'newCharSettings.breakInitiativeTies', 'Break Init Ties', optionsSpec.newCharSettings.breakInitiativeTies()) +
      ConfigUi.makeToggleSetting(config, 'newCharSettings.showTargetAC', 'Show Target AC', optionsSpec.newCharSettings.showTargetAC()) +
      ConfigUi.makeToggleSetting(config, 'newCharSettings.showTargetName', 'Show Target Name', optionsSpec.newCharSettings.showTargetName()) +
      ConfigUi.makeToggleSetting(config, 'newCharSettings.autoAmmo', 'Auto Use Ammo', optionsSpec.newCharSettings.autoAmmo()) +
      '</table>';
  }

  static makeInputSetting(config, path, title, prompt) {
    var currentVal = utils.getObjectFromPath(config, path);
    var emptyHint = '[not set]';
    if (currentVal) { emptyHint = currentVal; }

    return ConfigUi.makeOptionRow(title, path, '?{' + prompt + '|' + currentVal + '}', emptyHint, 'click to edit', emptyHint === '[not set]' ? '#f84545' : '#02baf2');
  }

  static makeToggleSetting(config, path, title, optionsSpec) {
    var currentVal = utils.getObjectFromPath(config, path);
    if (optionsSpec) { currentVal = _.invert(optionsSpec)[currentVal] === 'true'; }

    return ConfigUi.makeOptionRow(title, path, !currentVal, ConfigUi.makeBoolText(currentVal), 'click to toggle', currentVal ? '#65c4bd' : '#f84545');
  }

  static makeQuerySetting(config, path, title, optionsSpec) {
    var currentVal = _.invert(optionsSpec)[utils.getObjectFromPath(config, path)];
    var optionList = _.keys(optionsSpec);

    // move the current option to the front of the list
    optionList.splice(optionList.indexOf(currentVal), 1);
    optionList.unshift(currentVal);

    return ConfigUi.makeOptionRow(title, path, '?{' + title + '|' + optionList.join('|') + '}', ConfigUi.makeText(currentVal), 'click to change', '#02baf2');
  }

  static makeOptionRow(optionTitle, path, command, linkText, tooltip, buttonColor) {
    return '<tr style="border: 1px solid gray"><td>' +
      optionTitle + '</td>' +
      '</td><td style="text-align:right"> ' +
      '<a style="text-align: center; width: 80px; background-color: ' + buttonColor + '" title="' + tooltip + '" href="!shaped-config --' + path + ' ' + command + '">' +
      linkText + '</a></td></tr>';
  }

  static makeText(value) {
    return '<span style=" padding: 0px 2px;">' + value + '</span>';
  }

  static makeBoolText(value) {
    return value === true ?
      '<span style=" padding: 0px 2px;">on</span>' :
      '<span style=" padding: 0px 2px;">off</span>';
  }
}

module.exports = ConfigUi;