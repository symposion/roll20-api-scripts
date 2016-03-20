var _ = require('underscore');

module.exports = {
    convertMonster: function (npcObject) {
        'use strict';

        var output = _.clone(npcObject);

        var actionTraitTemplate = _.template('**<%=data.name%><% if(data.recharge) { print(" (" + data.recharge + ")") } %>**: <%=data.text%>', {variable: 'data'});
        var legendaryTemplate = _.template('**<%=data.name%><% if(data.cost && data.cost > 1){ print(" (Costs " + data.cost + " actions)") }%>**: <%=data.text%>', {variable: 'data'});

        var simpleSectionTemplate = _.template('<%=data.title%>\n<% print(data.items.join("\\n")); %>', {variable: 'data'});
        var legendarySectionTemplate = _.template('<%=data.title%>\nThe <%=data.name%> can take <%=data.legendaryPoints%> legendary actions, ' +
          'choosing from the options below. It can take only one legendary action at a time and only at the end of another creature\'s turn.' +
          ' The <%=data.name%> regains spent legendary actions at the start of its turn.\n<% print(data.items.join("\\n")) %>', {variable: 'data'});

        var srdContentSections = [
            {prop: 'traits', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
            {prop: 'actions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
            {prop: 'reactions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
            {prop: 'legendaryActions', itemTemplate: legendaryTemplate, sectionTemplate: legendarySectionTemplate}
        ];

        var makeDataObject = function (propertyName, itemList) {
            return {
                title: propertyName.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, function (letter) {
                    return letter.toUpperCase();
                }),
                name: output.character_name,
                legendaryPoints: output.legendaryPoints,
                items: itemList
            };
        };

        output.is_npc = 1;
        output.edit_mode = 'off';

        output.content_srd = _.chain(srdContentSections)
          .map(function (sectionSpec) {
              var items = output[sectionSpec.prop];
              delete output[sectionSpec.prop];
              return _.map(items, sectionSpec.itemTemplate);
          })
          .map(function (sectionItems, sectionIndex) {
              var sectionSpec = srdContentSections[sectionIndex];
              if (!_.isEmpty(sectionItems)) {
                  return sectionSpec.sectionTemplate(makeDataObject(sectionSpec.prop, sectionItems));
              }

              return null;
          })
          .compact()
          .value()
          .join('\n');

        delete output.legendaryPoints;

        return output;

    },

    /**
     *
     * @param spellObject
     * @returns {{}}
     */
    convertSpell: function (spellObject) {
        "use strict";

        //ToDO: replace this with a pick
        var converted = {};
        _.clone(spellObject);
        converted.content = spellObject.description;

        if (spellObject.higherLevel) {
            //TODO: make this behaviour configurable
            converted.content += '\nAt Higher Levels: ' + spellObject.higherLevel;
        }
        if (spellObject.save) {
            converted.save = spellObject.save.ability;
            converted.damage = spellObject.save.damage;
            converted.damage_type = spellObject.save.damageType;
            converted.saving_throw_success = spellObject.save.saveSuccess;
            converted.saving_throw_failure = spellObject.save.saveFailure;
            converted.higher_level_dice = spellObject.save.higherLevelDice;
            converted.higher_level_die = spellObject.save.higherLevelDie;
            converted.second_damage = spellObject.save.secondaryDamage;
            converted.second_damage_type = spellObject.save.secondaryDamageType;
            converted.second_higher_level_dice = spellObject.save.higherLevelSecondaryDice;
            converted.second_higher_level_die = spellObject.save.higherLevelSecondaryDie;
            converted.saving_throw_condition = spellObject.save.condition;
        }
        if (converted.attack) {
            converted.damage = spellObject.attack.damage;
            converted.damage_type = spellObject.attack.damageType;
            converted.higher_level_dice = spellObject.attack.higherLevelDice;
            converted.higher_level_die = spellObject.attack.higherLevelDie;
            converted.second_damage = spellObject.attack.secondaryDamage;
            converted.second_damage_type = spellObject.attack.secondaryDamageType;
            converted.second_higher_level_dice = spellObject.attack.higherLevelSecondaryDice;
            converted.second_higher_level_die = spellObject.attack.higherLevelSecondaryDie;
        }

        converted.components = _.chain(spellObject.components)
          .map(function (value, key) {
              if (key !== 'materialMaterial') {
                  return key.toUpperCase().slice(0, 1);
              }
              else {
                  converted.materials = value;
              }

          })
          .compact()
          .value()
          .join(' ');

        if (spellObject.ritual) {
            converted.ritual = 'Yes';
        }
        if (spellObject.concentration) {
            converted.concentration = 'Yes';
        }

        var copyAttrs = ['duration', 'level', 'school', 'emote', 'range', 'castingTime', 'target'];

        _.extend(converted, _.pick(spellObject, copyAttrs));

        return converted;
    }
};
