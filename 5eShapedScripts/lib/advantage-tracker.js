'use strict';
var _ = require('underscore');
var roll20 = require('./roll20.js');
var utils = require('./utils.js');

var advantageMarker = 'green',
  disadvantageMarker = 'red';

var ignoreNpc = false;

class AdvantageTracker {

  constructor(logger, myState) {
    this.logger = logger;
    this.myState = myState;
  }

  getSelectedCharacters(selected) {
    return _.chain(selected)
      .map(function(s) {
        return s.get('_id');
      })
      .value();
  }

  updateSetting(msg) {
    this.logger.debug('AT: Updating Setting');
    var br, setting, isAdvantage, isDisadvantage,
      char = [];
    char.push(msg.get('_characterid'));
    br = this.buildResources(_.uniq(_.union(char)));
    setting = msg.get('current');
    isAdvantage = '@{roll_advantage}' === setting;
    isDisadvantage = '@{roll_disadvantage}' === setting;

    if (this.myState.config.advTrackerSettings.showMarkers) {
      _.each(br[0].tokens, function(t) {
        t.set('status_' + disadvantageMarker, isDisadvantage);
        t.set('status_' + advantageMarker, isAdvantage);
      });
    }
  }

  updateToken(token) {
    this.logger.debug('AT: Updating New Token');
    if (!this.myState.config.advTrackerSettings.showMarkers) {
      return;
    }

    var character, setting, isAdvantage, isDisadvantage;

    if (token.get('represents') === '') {
      return;
    }

    character = roll20.getObj('character', token.get('represents'));
    setting = roll20.getAttrByName(character.id, 'roll_setting');
    isAdvantage = '@{roll_advantage}' === setting;
    isDisadvantage = '@{roll_disadvantage}' === setting;

    if (ignoreNpc) {
      if (roll20.getAttrByName(character.id, 'is_npc') === '1') {
        return;
      }
    }

    token.set('status_' + disadvantageMarker, isDisadvantage);
    token.set('status_' + advantageMarker, isAdvantage);
  }

  buildResources(ids) {
    return _.chain(ids)
      .map(function(cid) {
        return roll20.getObj('character', cid);
      })
      .reject(_.isUndefined)
      //.filter(this.npcCheckFunc)
      .map(function(c) {
        return {
          character: c,
          tokens: roll20.filterObjs(function(o) {
            return 'graphic' === o.get('_type') &&
              c.id === o.get('represents');
          })
        };
      })
      .value();
  }

  setAttribute(options) {
    if (!options.current && options.current !== '') {
      roll20.log('Error setting empty value: ');// + name);
      return;
    }

    var attr = roll20.findObjs({
      _type: 'attribute',
      _characterid: options.characterId,
      name: options.name
    })[0];

    if (!attr) {
      roll20.createObj('attribute', {
        name: options.name,
        current: options.current,
        characterid: options.characterId
      });
    } else if (!attr.get('current') || attr.get('current').toString() !== options.current) {
      attr.set({
        current: options.current
      });
    }
  }

  setMarkers(type, resources) {
    var self = this;

    var setting,
      rollInfo = '',
      preroll = '',
      postroll = '',
      valByType = {
        normal: '@{roll_1}',
        advantage: '@{roll_advantage}',
        disadvantage: '@{roll_disadvantage}',
        roll2: '@{roll_2}'
      },
      msgByType = {
        normal: 'normally',
        advantage: 'with advantage',
        disadvantage: 'with disadvantage',
        roll2: 'two dice'
      },

      isAdvantage = 'advantage' === type,
      isDisadvantage = 'disadvantage' === type;

    _.each(resources, function(r) {
      if (self.myState.config.advTrackerSettings.showMarkers) {
        _.each(r.tokens, function(t) {
          t.set('status_' + disadvantageMarker, isDisadvantage);
          t.set('status_' + advantageMarker, isAdvantage);
        });
      }

      setting = roll20.getAttrByName(r.character.get('_id'), 'roll_setting');
      if (setting === valByType[type]) {
        return;
      }

      self.setAttribute({
        characterId: r.character.get('_id'),
        name: 'roll_setting',
        current: valByType[type]
      });

      if (valByType[type] === '@{roll_advantage}') {
        rollInfo = '{{advantage=1}}';
        preroll = 2;
        postroll = 'kh1';
      }
      if (valByType[type] === '@{roll_disadvantage}') {
        rollInfo = '{{disadvantage=1}}';
        preroll = 2;
        postroll = 'kl1';
      }
      self.setAttribute({
        characterId: r.character.get('_id'),
        name: 'roll_info',
        current: rollInfo
      });
      self.setAttribute({
        characterId: r.character.get('_id'),
        name: 'preroll',
        current: preroll
      });
      self.setAttribute({
        characterId: r.character.get('_id'),
        name: 'postroll',
        current: postroll
      });

      //if (chatOptions(who) === 'disabled') {
      //    return;
      //}

      roll20.sendChat('AdvantageTracker',
        ' &{template:5e-shaped} {{character_name=' + r.character.get('name') + '}} @{' + r.character.get('name') +
        '|show_character_name} {{title=' + utils.toTitleCase(type) + '}} {{text_top=' + r.character.get('name') +
        ' is rolling ' + msgByType[type] + '!}}');
    });
  }
}

module.exports = AdvantageTracker;