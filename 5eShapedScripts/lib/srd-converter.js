var _ = require('underscore');

module.exports = function (npcObject) {
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

};
