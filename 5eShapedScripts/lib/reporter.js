'use strict';

function Reporter(roll20, scriptName) {
  this.report = function (heading, text) {
    //Horrible bug with this at the moment - seems to generate spurious chat
    //messages when noarchive:true is set
    //sendChat('ShapedScripts', '' + msg, null, {noarchive:true});

    roll20.sendChat('',
      '/w gm <div style="border: 1px solid black; background-color: white; padding: 3px 3px;">' +
      '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">' +
      scriptName + ' ' + heading +
      '</div>' +
      text +
      '</div>');
  };

  this.reportError = function (text) {
    roll20.sendChat('',
      '/w gm <div style="border: 1px solid black; background-color: white; padding: 3px 3px;">' +
      '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;color:red;">' +
      scriptName +
      '</div>' +
      text +
      '</div>');
  };
}


module.exports = Reporter;
