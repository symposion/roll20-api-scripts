function getTextParser(logger, config) {
	var module = {

		parseStatblock: function (statblock) {
			logger.info('---- Parsing statblock ----');

			var text = sanitizeText(clean(statblock));
			var keyword = findKeyword(text);
			var section = splitStatblock(text, keyword);

			var parsedObject = {};
			parsedObject.name = capitalizeEachWord(section.attr.name.toLowerCase());
			processSection(section);
		},

		clean: function (statblock) {
			return unescape(statblock)
			.replace(/\s\./g, '.')
			.replace(/–/g, '-')
			.replace(/<br[^>]*>/g, '#')
			.replace(/\s*#\s*/g, '#')
			.replace(/(<([^>]+)>)/gi, '')
			.replace(/#(?=[a-z]|DC)/g, ' ')
			.replace(/\s+/g, ' ')
			.replace(/#Hit:/gi, 'Hit:')
			.replace(/Hit:#/gi, 'Hit: ')
			.replace(/#Each /gi, 'Each ')
			.replace(/#On a successful save/gi, 'On a successful save')
			.replace(/DC#(\d+)/g, 'DC $1')
			.replace('LanguagesChallenge', 'Languages -#Challenge')
			.replace("' Speed", 'Speed')
			.replace(/#Medium or/gi, ' Medium or')
			.replace(/take#(\d+)/gi, 'take $1');
		},

		sanitizeText: function (text) {
			if (typeof text !== 'string') {
				text = text.toString();
			}

			text = text
			.replace(/\,\./gi, ',')
			.replace(/ft\s\./gi, 'ft.')
			.replace(/ft\.\s\,/gi, 'ft')
			.replace(/ft\./gi, 'ft')
			.replace(/(\d+) ft\/(\d+) ft/gi, '$1/$2 ft')
			.replace(/lOd/g, '10d')
			.replace(/dl0/gi, 'd10')
			.replace(/dlO/gi, 'd10')
			.replace(/dl2/gi, 'd12')
			.replace(/Sd(\d+)/gi, '5d$1')
			.replace(/ld(\d+)/gi, '1d$1')
			.replace(/ld\s+(\d+)/gi, '1d$1')
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
			text = text.replace(/(\d+)\s*?plus\s*?((?:\d+d\d+)|(?:\d+))/gi, '$2 + $1');
			var replaceObj = {
				'jday': '/day',
				'abol eth': 'aboleth',
				'ACT IONS': 'ACTIONS',
				'Afrightened': 'A frightened',
				'Alesser': 'A lesser',
				'Athl etics': 'Athletics',
				'Aundefinedr': 'After',
				'blindn ess': 'blindness',
				'blind sight': 'blindsight',
				'bofh': 'both',
				'brea stplate': 'breastplate',
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
				'lnt': 'Int',
				'magica lly': 'magically',
				'minlilte': 'minute',
				'natura l': 'natural',
				'ofeach': 'of each',
				'ofthe': 'of the',
				"on'e": 'one',
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
				'withi n': 'within'
			};
			var re = new RegExp(Object.keys(replaceObj).join('|'), 'gi');
			text = text.replace(re, function (matched) {
				return replaceObj[matched];
			});
			return text;
		},

		findKeyword: function (statblock) {
			var keyword = {
				attr: {},
				traits: {},
				actions: {},
				lair: {},
				legendary: {},
				reactions: {}
			};

			var indexAction = 0;
			var indexLair = statblock.length;
			var indexLegendary = statblock.length;
			var indexReactions = statblock.length;

			// Standard keyword
			var regex = /#\s*(tiny|small|medium|large|huge|gargantuan|armor class|hit points|speed|str|dex|con|int|wis|cha|saving throws|skills|damage resistances|damage immunities|condition immunities|damage vulnerabilities|senses|languages|challenge|traits|actions|lair actions|legendary actions|reactions)(?=\s|#)/gi;
			while (match = regex.exec(statblock)) {
				var key = match[1].toLowerCase();
				if (key === 'actions') {
					indexAction = match.index;
					keyword.actions.Actions = match.index;
				} else if (key === 'legendary actions') {
					indexLegendary = match.index;
					keyword.legendary.Legendary = match.index;
				} else if (key === 'reactions') {
					indexReactions = match.index;
					keyword.reactions.Reactions = match.index;
				} else if (key === 'lair actions') {
					indexLair = match.index;
					keyword.lair.Lair = match.index;
				} else {
					keyword.attr[key] = match.index;
				}
			}

			// Power
			regex = /(?:#)([A-Z][\w\-\']+(?:\s(?:[A-Z][\w\-\']+|[\(\)\/\d\-]|of|and|or|a)+)*)(?=\s*\.)/gi;
			log('parsed statblock: ' + statblock);
			var match;
			while (match = regex.exec(statblock)) {
				if (!keyword.attr[match[1].toLowerCase()]) {
					if (match.index < indexAction) {
						keyword.traits[match[1]] = match.index;
					} else if (match.index > indexAction && match.index < indexLegendary && match.index < indexReactions && match.index < indexLair) {
						keyword.actions[match[1]] = match.index;
					} else if (match.index > indexLegendary && match.index < indexReactions && match.index < indexLair) {
						keyword.legendary[match[1]] = match.index;
					} else if (match.index > indexReactions && match.index < indexLair) {
						keyword.reactions[match[1]] = match.index;
					} else if (match.index > indexLair) {
						keyword.lair[match[1]] = match.index;
					}
				}
			}

			var splitStatblock = statblock.split('#');
			var lastItem = '';
			var actionsPosArray = [];
			var i = 1;

			for (var actionsKey in keyword.actions) {
				if (keyword.actions.hasOwnProperty(actionsKey)) {
					actionsPosArray.push(keyword.actions[actionsKey]);
				}
			}
			for (var legendaryKey in keyword.legendary) {
				if (keyword.legendary.hasOwnProperty(legendaryKey)) {
					actionsPosArray.push(keyword.legendary[legendaryKey]);
				}
			}
			for (var lairKey in keyword.lair) {
				if (keyword.lair.hasOwnProperty(lairKey)) {
					actionsPosArray.push(keyword.lair[lairKey]);
				}
			}
			actionsPosArray.sort(sortNumber);

			var lastActionIndex = actionsPosArray[actionsPosArray.length - 1] + 1;
			var lastItemIndex;

			while (i < 6) {
				lastItem = splitStatblock[splitStatblock.length - i];
				lastItemIndex = statblock.indexOf(lastItem);
				if (lastItemIndex > lastActionIndex) {
					keyword.traits.Description = lastItemIndex - 1; //-1 to include the #
				}
				i++;
			}

			return keyword;
		}
	};
	logger.wrapModule(module);

	return {
		parseStatblock: module.parseStatblock.bind(module)
	};
}
