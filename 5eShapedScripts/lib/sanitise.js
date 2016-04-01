function sanitise(statblock, logger) {
    'use strict';

    statblock = statblock
      .replace(/\s+([\.,;:])/g, '$1')
      .replace(/\n+/g, '#')
      .replace(/–/g, '-')
      .replace(/<br[^>]*>/g, '#')
      .replace(/#+/g, '#')
      .replace(/\s*#\s*/g, '#')
      .replace(/(<([^>]+)>)/gi, '')
      .replace(/legendary actions/gi, 'Legendary Actions')
      .replace(/(\S)\sACTIONS/, '$1#ACTIONS')
      .replace(/#(?=[a-z]|DC)/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/#Hit:/gi, 'Hit:')
      .replace(/Hit:#/gi, 'Hit: ')
      .replace(/#Each /gi, 'Each ')
      .replace(/#On a successful save/gi, 'On a successful save')
      .replace(/DC#(\d+)/g, 'DC $1')
      .replace('LanguagesChallenge', 'Languages -\nChallenge')
      .replace('\' Speed', 'Speed')
      .replace(/(\w+) s([\s\.,])/g, '$1s$2')
      .replace(/#Medium or/gi, ' Medium or')
      .replace(/take#(\d+)/gi, 'take $1')
      .replace(/#/g, '\n');

    logger.debug('First stage cleaned statblock: $$$', statblock);

    //Sometimes the texts ends up like 'P a r a l y z i n g T o u c h . M e l e e S p e l l A t t a c k : + 1 t o h i t
    //In this case we can fix the title case stuff, because we can find the word boundaries. That will at least meaning
    //that the core statblock parsing will work. If this happens inside the lowercase body text, however, there's nothing
    //we can do about it because you need to understand the natural language to reinsert the word breaks properly.
    statblock = statblock.replace(/([A-Z])(\s[a-z]){2,}/g, function (match, p1) {
        return p1 + match.slice(1).replace(/\s([a-z])/g, '$1');
    });


    //Conversely, sometimes words get mushed together. Again, we can only fix this for title case things, but that's
    //better than nothing
    statblock = statblock.replace(/([A-Z][a-z]+)(?=[A-Z])/g, '$1 ');

    //This covers abilites that end up as 'C O N' or similar
    statblock = statblock.replace(/^[A-Z]\s?[A-Z]\s?[A-Z](?=\s|$)/mg, function (match) {
        return match.replace(/\s/g, '');
    });

    statblock = statblock.replace(/^[A-Z ]+$/m, function (match) {
        return match.replace(/([A-Z])([A-Z]+)(?=\s|$)/g, function (match, p1, p2) {
            return p1 + p2.toLowerCase();
        });
    });

    statblock = statblock
      .replace(/,\./gi, ',')
      .replace(/([a-z\/])1/g, '$1l')
      .replace(/([a-z])\/([a-z])/g, '$1l$2')
      .replace(/(^| )l /gm, '$11 ')
      .replace(/ft\s\./gi, 'ft.')
      .replace(/ft\.\s,/gi, 'ft')
      .replace(/ft\./gi, 'ft')
      .replace(/(\d+) ft\/(\d+) ft/gi, '$1/$2 ft')
      .replace(/lOd/g, '10d')
      .replace(/dl0/gi, 'd10')
      .replace(/dlO/gi, 'd10')
      .replace(/dl2/gi, 'd12')
      .replace(/S(\d+)d(\d+)/gi, '5$1d$2')
      .replace(/l(\d+)d(\d+)/gi, '1$1d$2')
      .replace(/ld(\d+)/gi, '1d$1')
      .replace(/l(\d+)d\s+(\d+)/gi, '1$1d$2')
      .replace(/(\d+)d\s+(\d+)/gi, '$1d$2')
      .replace(/(\d+)\s+d(\d+)/gi, '$1d$2')
      .replace(/(\d+)\s+d(\d+)/gi, '$1d$2')
      .replace(/(\d+)d(\d)\s(\d)/gi, '$1d$2$3')
      .replace(/(\d+)j(?:Day|day)/gi, '$1/Day')
      .replace(/(\d+)f(?:Day|day)/gi, '$1/Day')
      .replace(/(\d+)j(\d+)/gi, '$1/$2')
      .replace(/(\d+)f(\d+)/gi, '$1/$2')
      .replace(/{/gi, '(')
      .replace(/}/gi, ')')
      .replace(/(\d+)\((\d+) ft/gi, '$1/$2 ft')
      .replace(/• /gi, '')
      .replace(/’/gi, '\'');


    statblock = statblock.replace(/(\d+)\s*?plus\s*?((?:\d+d\d+)|(?:\d+))/gi, '$2 + $1');
    var replaceObj = {
        'jday': '/day',
        'abol eth': 'aboleth',
        'ACT IONS': 'ACTIONS',
        'Afrightened': 'A frightened',
        'Alesser': 'A lesser',
        'Athl etics': 'Athletics',
        'blindn ess': 'blindness',
        'blind sight': 'blindsight',
        'bofh': 'both',
        'brea stplate': 'breastplate',
        'Can trips': 'Cantrips',
        'choos in g': 'choosing',
        'com muni cate': 'communicate',
        'Constituti on': 'Constitution',
        'creatu re': 'creature',
        'darkvi sion': 'darkvision',
        'dea ls': 'deals',
        'di sease': 'disease',
        'di stance': 'distance',
        'fa lls': 'falls',
        'fe et': 'feet',
        'exha les': 'exhales',
        'ex istence': 'existence',
        'lfthe': 'If the',
        'Ifthe': 'If the',
        'ifthe': 'if the',
        'lnt': 'Int',
        'magica lly': 'magically',
        'Med icine': 'Medicine',
        'minlilte': 'minute',
        'natura l': 'natural',
        'ofeach': 'of each',
        'ofthe': 'of the',
        'on\'e': 'one',
        'on ly': 'only',
        '0n': 'on',
        'pass ive': 'passive',
        'Perce ption': 'Perception',
        'radi us': 'radius',
        'ra nge': 'range',
        'rega ins': 'regains',
        'rest.oration': 'restoration',
        'savin g': 'saving',
        'si lvery': 'silvery',
        's lashing': 'slashing',
        'slas hing': 'slashing',
        'slash in g': 'slashing',
        'slash ing': 'slashing',
        'Spel/casting': 'Spellcasting',
        'successfu l': 'successful',
        'ta rget': 'target',
        ' Th e ': ' The ',
        't_urns': 'turns',
        'unti l': 'until',
        'withi n': 'within',
        'tohit': 'to hit',
        'At wi ll': 'At will',
        'per-son': 'person'
    };
    var re = new RegExp(Object.keys(replaceObj).join('|'), 'g');
    statblock = statblock.replace(re, function (matched) {
        return replaceObj[matched];
    });

    logger.debug('Final stage cleaned statblock: $$$', statblock);
    return statblock;

}

module.exports = sanitise;
