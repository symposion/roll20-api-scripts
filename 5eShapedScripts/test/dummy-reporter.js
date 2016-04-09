'use strict';

module.exports = Reporter;

/**
 *
 * @constructor
 */
function Reporter() {

  this.messages = [];

  this.report = function (title, message) {
    this.messages.push(title + ':' + message);
  };

  this.reportError = function (message) {
    this.messages.push(message);
  };
}
