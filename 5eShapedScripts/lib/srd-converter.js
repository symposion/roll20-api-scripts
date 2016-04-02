var _ = require('underscore');

/* jshint camelcase : false */
function getRenameMapper(newName) {
    'use strict';
    return function (key, value, output) {
        output[newName] = value;
    };
}

var identityMapper     = function (key, value, output) {
        'use strict';
        output[key] = value;
    },
    booleanMapper      = function (key, value, output) {
        'use strict';
        if (value) {
            output[key] = 'Yes';
        }
    },
    camelCaseFixMapper = function (key, value, output) {
        'use strict';
        var newKey = key.replace(/[A-Z]/g, function (letter) {
            return '_' + letter.toLowerCase();
        });
        output[newKey] = value;
    },
    castingStatMapper  = function (key, value, output) {
        'use strict';
        if (value) {
            output.add_casting_modifier = 'Yes';
        }
    },
    componentMapper    = function (key, value, output) {
        'use strict';
        output.components = _.chain(value)
          .map(function (value, key) {
              if (key !== 'materialMaterial') {
                  return key.toUpperCase().slice(0, 1);
              }
              else {
                  output.materials = value;
              }

          })
          .compact()
          .value()
          .join(' ');
    },
    saveAttackMappings = {
        ability: getRenameMapper('saving_throw_vs_ability'),
        type: identityMapper,
        damage: identityMapper,
        damageBonus: camelCaseFixMapper,
        damageType: camelCaseFixMapper,
        saveSuccess: getRenameMapper('saving_throw_success'),
        saveFailure: getRenameMapper('saving_throw_failure'),
        higherLevelDice: camelCaseFixMapper,
        higherLevelDie: camelCaseFixMapper,
        secondaryDamage: getRenameMapper('second_damage'),
        secondaryDamageBonus: getRenameMapper('second_damage_bonus'),
        secondaryDamageType: getRenameMapper('second_damage_type'),
        higherLevelSecondaryDice: getRenameMapper('second_higher_level_dice'),
        higherLevelSecondaryDie: getRenameMapper('second_higher_level_die'),
        condition: getRenameMapper('saving_throw_condition'),
        castingStat: castingStatMapper
    }
  ;

function getObjectMapper(mappings) {
    'use strict';
    return function (key, value, output) {
        _.each(value, function (propVal, propName) {
            var mapper = mappings[propName];
            if (!mapper) {
                throw 'Unrecognised property when attempting to convert to srd format: [' + propName + '] ' + JSON.stringify(output);
            }
            mapper(propName, propVal, output);
        });
    };
}

var spellMapper = getObjectMapper({
    name: identityMapper,
    duration: identityMapper,
    level: getRenameMapper('spell_level'),
    school: identityMapper,
    emote: identityMapper,
    range: identityMapper,
    castingTime: camelCaseFixMapper,
    target: identityMapper,
    description: function (key, value, output) {
        'use strict';
        output.content = value + (output.content ? '\n' + output.content : '');
    },
    higherLevel: function (key, value, output) {
        'use strict';
        output.content = (output.content ? output.content + '\n' : '') + value;
    },
    ritual: booleanMapper,
    concentration: booleanMapper,
    save: getObjectMapper(saveAttackMappings),
    attack: getObjectMapper(saveAttackMappings),
    damage: getObjectMapper(saveAttackMappings),
    heal: getObjectMapper({
        amount: getRenameMapper('heal'),
        castingStat: castingStatMapper,
        higherLevelDice: camelCaseFixMapper,
        higherLevelDie: camelCaseFixMapper,
        higherLevelAmount: getRenameMapper('higher_level_heal'),
        bonus: getRenameMapper('heal_bonus')
    }),
    components: componentMapper,
    classes: _.noop,
    aoe: _.noop,
    source: _.noop,
    effects: _.noop,
    domains: _.noop,
    oaths: _.noop,
    circles: _.noop,
    patrons: _.noop
});


var monsterMapper = getObjectMapper({
    name: getRenameMapper('character_name'),
    size: identityMapper,
    type: identityMapper,
    alignment: identityMapper,
    AC: getRenameMapper('ac_srd'),
    HP: getRenameMapper('hp_srd'),
    speed: getRenameMapper('npc_speed'),
    strength: identityMapper,
    dexterity: identityMapper,
    constitution: identityMapper,
    intelligence: identityMapper,
    wisdom: identityMapper,
    charisma: identityMapper,
    skills: getRenameMapper('skills_srd'),
    spells: function (key, value, output) {
        'use strict';
        var splitSpells = _.partition(value, _.isObject);
        if (!_.isEmpty(splitSpells[1])) {
            output.spells_srd = splitSpells[1].join(', ');
        }
        if (!_.isEmpty(splitSpells[0])) {
            output.spells = splitSpells[0];
        }
    },
    savingThrows: getRenameMapper('saving_throws_srd'),
    damageResistances: getRenameMapper('damage_resistances'),
    damageImmunities: getRenameMapper('damage_immunities'),
    conditionImmunities: getRenameMapper('condition_immunities'),
    damageVulnerabilities: getRenameMapper('damage_vulnerabilities'),
    senses: identityMapper,
    languages: identityMapper,
    challenge: identityMapper,
    traits: identityMapper,
    actions: identityMapper,
    reactions: identityMapper,
    regionalEffects: identityMapper,
    regionalEffectsFade: identityMapper,
    legendaryPoints: identityMapper,
    legendaryActions: identityMapper,
    lairActions: identityMapper
});

var pronounTokens = {
    '{{GENDER_PRONOUN_HE_SHE}}': 'nominative',
    '{{GENDER_PRONOUN_HIM_HER}}': 'accusative',
    '{{GENDER_PRONOUN_HIS_HER}}': 'possessive',
    '{{GENDER_PRONOUN_HIMSELF_HERSELF}}': 'reflexive'
};


module.exports = {

    convertMonster: function (npcObject) {
        'use strict';

        var output = {};
        monsterMapper(null, npcObject, output);

        var actionTraitTemplate = _.template('**<%=data.name%><% if(data.recharge) { print(" (" + data.recharge + ")") } %>**: <%=data.text%>', {variable: 'data'});
        var legendaryTemplate = _.template('**<%=data.name%><% if(data.cost && data.cost > 1){ print(" (Costs " + data.cost + " actions)") }%>**: <%=data.text%>', {variable: 'data'});
        var lairRegionalTemplate = function (item) {
            return '**' + item;
        };

        var simpleSectionTemplate = _.template('<%=data.title%>\n<% print(data.items.join("\\n")); %>', {variable: 'data'});
        var legendarySectionTemplate = _.template('<%=data.title%>\nThe <%=data.name%> can take <%=data.legendaryPoints%> legendary actions, ' +
          'choosing from the options below. It can take only one legendary action at a time and only at the end of another creature\'s turn.' +
          ' The <%=data.name%> regains spent legendary actions at the start of its turn.\n<% print(data.items.join("\\n")) %>', {variable: 'data'});
        var regionalSectionTemplate = _.template('<%=data.title%>\n<% print(data.items.join("\\n")); %>\n**<%=data.regionalEffectsFade%>', {variable: 'data'});

        var srdContentSections = [
            {prop: 'traits', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
            {prop: 'actions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
            {prop: 'reactions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
            {prop: 'legendaryActions', itemTemplate: legendaryTemplate, sectionTemplate: legendarySectionTemplate},
            {prop: 'lairActions', itemTemplate: lairRegionalTemplate, sectionTemplate: simpleSectionTemplate},
            {prop: 'regionalEffects', itemTemplate: lairRegionalTemplate, sectionTemplate: regionalSectionTemplate}
        ];

        var makeDataObject = function (propertyName, itemList) {
            return {
                title: propertyName.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, function (letter) {
                    return letter.toUpperCase();
                }),
                name: output.character_name,
                legendaryPoints: output.legendaryPoints,
                regionalEffectsFade: output.regionalEffectsFade,
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


    convertSpells: function (spellObjects, pronounInfo) {
        'use strict';


        return _.map(spellObjects, function (spellObject) {
            var converted = {};
            spellMapper(null, spellObject, converted);
            if (converted.emote) {
                _.each(pronounTokens, function (pronounType, token) {
                    var replacement = pronounInfo[pronounType];
                    converted.emote = converted.emote.replace(token, replacement);
                });
            }
            return converted;
        });

    }
    /* jshint camelcase : true */
};
