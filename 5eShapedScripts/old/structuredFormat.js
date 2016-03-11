var damageTypes = ["radiant", "necrotic", "force", "fire", "cold",
	"acid", "bludgeoning", "piercing", "slashing",
	"lightning", "poison", "psychic", "thunder",
	"bludgeoning, piercing, and slashing from nonmagical weapons"];
var conditions = ["blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled", "incapacitated",
	"invisible", "paralysed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"];
var abilities = ["--", "str", "dex", "con", "int", "wis", "cha"];

var commaSepOutput = function(array) {
	return array.join(", ");
};

var eachKeyCommaSepOutput = function(value) {
	var parts = _.values(objectToSrdFormat.call(this, value));
	return parts.join(",");
};


var asDistanceInFeet = function (distance) {
	return distance ? this.attribute + " " + distance + " ft." : undefined
};

var objectToSrdFormat = function (object) {
	var typeDef = this.type;
	return _.reduce(object, function (memo, value, key) {
		var propertyDef = typeDef[key];
		memo[propertyDef.attribute] = propertyDef.srdOutput(value);;
		return memo;
	}, {});

};

var getSrdContentOutputter = function(sectionOutputter) {
	return function(object) {
		var virtualProperty = {
			type: this.type.getItemType(),
			srdOutput: sectionOutputter
		};
		return  _.map(object, function(item) {
			return JSON.stringify(virtualProperty.srdOutput(item));
		}).join("\n");
	};
};

//TODO: change these to be the proper implementations
var traitOutputter = objectToSrdFormat;
var actionOutputter = objectToSrdFormat;
var legendaryActionOutputter = objectToSrdFormat;
var lairActionOutputter = objectToSrdFormat;

var stringType = {
	processValue: function (value) {
		return {
			converted: value.toString(),
			errors: (typeof value === 'object') ? ['Value ' + value + ' should not be an object'] : []
		};
	}
};

var integerType = {
	processValue: function (value) {
		var parsed = parseInt(value, 10);
		return {
			converted: parsed,
			errors: (_.isNaN(parsed)) ? ['Value ' + value + ' is not a valid integer'] : []
		}
	}
};

var numberOrFractionType = {
	processValue: function (value) {
		var valid = !_.isNaN(parseInt(value, 10));
		if (!valid) {
			valid = !_.isNaN(parseFloat(value));
			if (!valid) {
				var parts = value.split("/");
				if (parts.length === 2) {
					valid = !_.isNaN(parseInt(parts[0])) && !_.isNaN(parseInt(parts[1]));
				}
			}
		}
		return {
			converted: valid ? value : null,
			errors: valid ? [] : ['Value ' + value + ' is not a number or a fraction']
		}
	}
};

var booleanType = {
	processValue: function (value) {
		var valid = (typeof value === 'boolean');
		return {
			converted: valid ? value : null,
			errors: valid ? [] : ['Value ' + value + ' is not a boolean (Note must be a proper JS boolean, not a string)']
		};
	}
};

//TODO: implement this
var rollExprType = stringType;

var getPatternType = function (pattern) {
	return {
		processValue: function (value) {
			var match = value.match(pattern);
			return {
				converted: match ? value : null,
				errors: match ? [] : ['Value ' + value + ' does not match pattern ' + pattern]
			}
		}
	};
};

var getEnumType = function (values) {
	return {
		processValue: function (value) {

			var valid = (typeof value === 'string') && _.contains(values, value.toLowerCase());
			return {
				converted: valid ? value : null,
				errors: valid ? [] : ['Value ' + value + ' is not one of the permitted values: ' + JSON.stringify(values)]
			};
		}
	};
};

var getArrayType = function (itemType) {
	return {
		processValue: function (value) {
			var valid = _.isArray(value);
			if (valid) {
				return _.reduce(value, function (memo, value) {
					var result = itemType.processValue(value);
					memo.converted.push(result.converted);
					memo.errors = memo.errors.concat(result.errors);
					return memo;
				}, {converted: [], errors: []});
			}
			return {
				converted: null,
				errors: ['Value ' + value + ' is not an array']
			};
		},
		getItemType: function() {
			return itemType;
		}
	};
};

var getObjectType = function (definition) {
	var type = definition;
	_.each(type, function (propDef, propName) {
		if (!propDef.attribute) {
			propDef.attribute = propName.replace(/[A-Z]/g, function (match) {
				return "_" + match.toLowerCase();
			});
		}
		if (!propDef.srdOutput) {
			propDef.srdOutput = _.identity;
		}
	});
	type.processValue = function (value) {
		var valid = (typeof value === 'object');
		if (valid) {
			return _.reduce(value, function (memo, propValue, propName) {
				var propertyDef = definition[propName];
				if (!propertyDef) {
					memo.errors.push('Unrecognised property: ' + propName);
					memo.converted.push(null);
				}
				else {
					var result = propertyDef.type.processValue(propValue);
					memo.errors = memo.errors.concat(result.errors);
					memo.converted[propName] = result.converted;
				}
				return memo;
			}, {converted: {}, errors: []});
		}
		return {
			converted: null,
			errors: ['Value ' + value + ' should be an object']
		}
	};
	return type;
};


var makeStringProperty = function (options) {
	return _.extend({
		type: stringType
	}, options);

};

var makeIntegerProperty = function (options) {
	return _.extend({
		type: integerType
	}, options);
};

var makeBooleanProperty = function(options) {
	return _.extend({
		type: booleanType
	}, options);
};

var makePatternProperty = function (pattern, options) {
	return _.extend({
		type: getPatternType(pattern)
	}, options);
};

var makeEnumProperty = function (enumValues, options) {
	return _.extend({
		type: getEnumType(enumValues)
	}, options);
};


var makeDistanceProperty = function (options) {
	return _.extend({
		type: integerType,
		srdOutput: asDistanceInFeet
	}, options);
};

var makeStringArrayProperty = function (options) {
	return _.extend({
		type: getArrayType(stringType),
		srdOutput: commaSepOutput
	}, options);
};

var makeAbilityProperty = function (options) {
	return makeEnumProperty(abilities, options);
};

var makeDamageTypeProperty = function (options) {
	return makeEnumProperty(damageTypes, options);
};

var makeRollExprProperty = function (options) {
	return _.extend({
		type: rollExprType
	}, options);
};

var makeObjectProperty = function (definition, options) {
	return _.extend({
		type: getObjectType(definition),
		srdOutput: objectToSrdFormat
	}, options);
};

var npcProcessor = makeObjectProperty({
	name: makeStringProperty("character_name"),
	size: makeEnumProperty(["tiny", "small", "medium", "large", "huge", "gargantuan"]),
	type: makeEnumProperty(["aberration", "beast", "celestial", "construct", "dragon",
		"elemental", "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant",
		"undead"]),
	alignment: makeEnumProperty(["lawful good", "lawful neutral", "lawful evil", "neutral good", "neutral", "neutral evil",
		"chaotic good", "chaotic neutral", "chaotic evil", "unaligned"]),
	ac: makeObjectProperty(
	{
		ac: makeIntegerProperty(),
		ac_note: makeStringProperty()
	},
	{
		srdOutput: function (object) {
			return "" + object.ac + "(" + object.ac_note + ")";
		},
		attribute: "ac_srd"
	}
	),
	hp: makeObjectProperty({
		hit_dice: makeIntegerProperty(),
		hit_die: makePatternProperty(/d(2|4|6|8|10|12|20)/),
		hp_extra: makeStringProperty()
	},
	{
		srdOutput: function (object) {
			var output =  object.hit_dice.toString() + object.hit_die;
			if (object.hp_extra) {
				output += "(" + object.hp_extra + ")";
			}
			return output;
		},
		attribute: "hp_srd"
	}
	),
	speed: makeObjectProperty(
	{
		walk: {
			type: integerType,
			srdOutput: function (distance) {
				return distance.toString() + " ft."
			}
		},
		fly: makeDistanceProperty(),
		climb: makeDistanceProperty(),
		swim: makeDistanceProperty(),
		burrow: makeDistanceProperty(),
		hover: {
			type: booleanType,
			srdOutput: function (value) {
				return value ? "(hover)" : "";
			}
		}
	},
	{
		attribute: "npc_speed",
		srdOutput: function (object) {
			var order = ["burrow", "fly", "hover", "climb", "swim"];
			var type = this.type;
			return _.reduce(order, function (memo, key) {
				var value = object[key];
				if (value) {
					if (key !== 'Hover') {
						memo += ", ";
					}
					memo += type[key].srdOutput(value);
				}
				return memo;
			}, this.type.walk.srdOutput(object.walk));
		}
	}),
	strength: makeIntegerProperty(),
	dexterity: makeIntegerProperty(),
	constitution: makeIntegerProperty(),
	intelligence: makeIntegerProperty(),
	wisdom: makeIntegerProperty(),
	charisma: makeIntegerProperty(),
	senses: makeObjectProperty({
		blindsight: makeDistanceProperty(),
		darkvision: makeDistanceProperty(),
		tremorsense: makeDistanceProperty(),
		truesight: makeDistanceProperty()
	}, {srdOutput:eachKeyCommaSepOutput}),
	passivePerception: makeIntegerProperty(),
	languages: makeStringArrayProperty(),
	savingThrows: makeObjectProperty({
		strength: makeIntegerProperty(),
		dexterity: makeIntegerProperty(),
		constitution: makeIntegerProperty(),
		intelligence: makeIntegerProperty(),
		wisdom: makeIntegerProperty(),
		charisma: makeIntegerProperty()
	},
	{
		srdOutput: function(object) {
			var propDef = this;
			return _.chain(object)
			.map(function(value, key) {
				if(propDef.type[key]) {
					return key.charAt(0).toUpperCase() + key.slice(1,3) + " " + ((value > 0) ? "+" : "") + value;
				}
			})
			.compact()
			.value()
			.join(', ');
		},
		attribute: "saving_throws_srd"
	}
	),
	skills: makeObjectProperty({
		acrobatics:makeIntegerProperty(),
		animalHandling: makeIntegerProperty(),
		arcana: makeIntegerProperty(),
		athletics: makeIntegerProperty(),
		deception: makeIntegerProperty(),
		history: makeIntegerProperty(),
		insight: makeIntegerProperty(),
		intimidation: makeIntegerProperty(),
		investigation: makeIntegerProperty(),
		medicine: makeIntegerProperty(),
		nature: makeIntegerProperty(),
		perception: makeIntegerProperty(),
		performance: makeIntegerProperty(),
		persuasion: makeIntegerProperty(),
		religion: makeIntegerProperty(),
		sleightOfHand: makeIntegerProperty(),
		stealth: makeIntegerProperty(),
		survival: makeIntegerProperty()
	},{
		srdOutput: function(object) {
			var propDef = this;
			return _.chain(object)
			.map(function(value, key) {
				if(propDef.type[key]) {
					return key + " " + ((value > 0) ? "+" : "") + value;
				}
			})
			.compact()
			.value()
			.join(', ');
		},
		attribute:"skills_srd"
	}
	),
	spellBook: {
		attribute: "spells_srd",
		type: getArrayType(stringType),
		srdOutput: commaSepOutput
	},
	vulnerabilties: {
		attribute: "damage_vulnerabilities",
		type: getArrayType(getEnumType(damageTypes)),
		srdOutput: commaSepOutput
	},
	immunities: {
		attribute: "damage_immunities",
		type: getArrayType(getEnumType(damageTypes)),
		srdOutput: commaSepOutput
	},
	resistances: {
		attribute: "damage_resistances",
		type: getArrayType(getEnumType(damageTypes)),
		srdOutput: commaSepOutput
	},
	conditionImmunities: {
		attribute: "condition_immunities",
		type: getArrayType(getEnumType(conditions)),
		srdOutput: commaSepOutput
	},
	challengeRating: {
		attribute: "challenge",
		type: numberOrFractionType
	},
	content: makeObjectProperty({
		traits: {
			type: getArrayType(getObjectType({
				name: makeStringProperty(),
				type: makeEnumProperty(['Melee', 'Ranged', 'Other']),
				recharge: makeStringProperty(),
				savingThrowCondition: makeStringProperty(),
				savingThrowAbility: makeAbilityProperty(),
				savingThrowBonus: makeIntegerProperty(),
				savingThrowVsAbility: makeAbilityProperty(),
				savingThrowFailure: makeStringProperty(),
				savingThrowSuccess: makeStringProperty(),
				damage: makeRollExprProperty(),
				damageAbility: makeAbilityProperty(),
				damageBonus: makeIntegerProperty(),
				damageType: makeDamageTypeProperty(),
				damageCrit: makeRollExprProperty(),
				heal: makeRollExprProperty(),
				healAbility: makeAbilityProperty(),
				healBonus: makeIntegerProperty(),
				emote: makeStringProperty(),
				freetext: makeStringProperty(),
				freeform: makeStringProperty()
			}), traitOutputter),
			srdOutput: getSrdContentOutputter(traitOutputter)
		},
		actions: {
			type: getArrayType(getObjectType({
				name: makeStringProperty(),
				type: makeEnumProperty(['melee', 'ranged', 'other']),
				reach: makeIntegerProperty(),
				range: makeObjectProperty({
					standard: makeIntegerProperty(),
					long: makeIntegerProperty(),
					shape: makeStringProperty()
				}, {
					outputSrd: function(object) {
						if (object.standard && object.long) {
							return object.standard.toString() + "/" + object.long;
						}
						else if (object.standard && object.shape) {
							return object.standard.toString() + " " + object.shape;
						}
						else {
							return object.standard.toString();
						}
					}
				}),
				recharge: makeStringProperty(),
				proficiency: makeBooleanProperty(),
				attackAbility: makeAbilityProperty(),
				attackBonus: makeIntegerProperty(),
				critRange: makeIntegerProperty(),
				savingThrowCondition: makeStringProperty(),
				savingThrowAbility: makeAbilityProperty(),
				savingThrowBonus: makeIntegerProperty(),
				savingThrowVsAbility: makeAbilityProperty(),
				savingThrowFailure: makeStringProperty(),
				savingThrowSuccess: makeStringProperty(),
				damage: makeRollExprProperty(),
				damageAbility: makeAbilityProperty(),
				damageBonus: makeIntegerProperty(),
				damageType: makeDamageTypeProperty(),
				damageCrit: makeRollExprProperty(),
				secondDamage: makeRollExprProperty(),
				secondDamageAbility: makeAbilityProperty(),
				secondDamageBonus: makeIntegerProperty(),
				secondDamageType: makeDamageTypeProperty(),
				secondDamageCrit: makeRollExprProperty(),
				emote: makeStringProperty(),
				freetext: makeStringProperty(),
				freeform: makeStringProperty()
			})),
			srdOutput: getSrdContentOutputter(actionOutputter)
		},
		legendaryActions: {
			type: getArrayType(getObjectType({
				name: makeStringProperty(),
				cost: makeIntegerProperty(),
				type: makeEnumProperty(['melee', 'ranged', 'other']),
				reach: makeIntegerProperty(),
				range: makeObjectProperty({
					standard: makeIntegerProperty(),
					long: makeIntegerProperty(),
					shape: makeStringProperty()
				}, {
					outputSrd: function(object) {
						if (object.standard && object.long) {
							return object.standard.toString() + "/" + object.long;
						}
						else if (object.standard && object.shape) {
							return object.standard.toString() + " " + object.shape;
						}
						else {
							return object.standard.toString();
						}
					}
				}),
				recharge: makeStringProperty(),
				proficiency: makeBooleanProperty(),
				attackAbility: makeAbilityProperty(),
				attackBonus: makeIntegerProperty(),
				critRange: makeIntegerProperty(),
				savingThrowCondition: makeStringProperty(),
				savingThrowAbility: makeAbilityProperty(),
				savingThrowBonus: makeIntegerProperty(),
				savingThrowVsAbility: makeAbilityProperty(),
				savingThrowFailure: makeStringProperty(),
				savingThrowSuccess: makeStringProperty(),
				damage: makeRollExprProperty(),
				damageAbility: makeAbilityProperty(),
				damageBonus: makeIntegerProperty(),
				damageType: makeDamageTypeProperty(),
				damageCrit: makeRollExprProperty(),
				secondDamage: makeRollExprProperty(),
				secondDamageAbility: makeAbilityProperty(),
				secondDamageBonus: makeIntegerProperty(),
				secondDamageType: makeDamageTypeProperty(),
				secondDamageCrit: makeRollExprProperty(),
				emote: makeStringProperty(),
				freetext: makeStringProperty(),
				freeform: makeStringProperty()
			})),
			srdOutput: getSrdContentOutputter(legendaryActionOutputter)
		},
		legendaryPoints: makeIntegerProperty({
			srdOutput: function (value) {
				return "Can take " + value + " Legendary Actions, choosing from the options below. Only one legendary action can be used at a time, and only at the end of another creature's turn. Spent legendary actions are regained at the start of each turn."
			}
		}),
		lairActions: {
			type: getArrayType(getObjectType({
			})),
			srdOutput: getSrdContentOutputter(lairActionOutputter)
		}
	},
	{
		attribute: "content_srd",
		srdOutput: function(object) {
			var sections = objectToSrdFormat.call(this, object);
			var string = "";
			if(sections.traits) {
				string += "Traits\n" + JSON.stringify(sections.traits);
			}
			if(sections.actions) {
				string += "\nActions\n" + JSON.stringify(sections.actions);
			}
			if (sections.legendaryActions) {
				string += "\nLegendary Actions\n" + sections.legendaryPoints + "\n" + JSON.stringify(sections.legendaryActions);
			}
			if (sections.lairActions) {
				string += "\nLair Actions\n" + JSON.stringify(sections.lairActions);
			}
			return string;
		}
	})
});

var dragon = {
	name:"Ancient Gold Dragon",
	size:"Gargantuan",
	type:"dragon",
	alignment:"lawful good",
	ac: {
		ac:22,
		ac_note: "natural armor"
	},
	hp: {
		hit_dice:28,
		hit_die:"d20"
	},
	speed: {
		walk:40,
		fly: 80,
		swim: 40
	},
	strength: 30,
	dexterity: 14,
	constitution: 29,
	intelligence: 18,
	wisdom: 17,
	charisma: 28,
	savingThrows: {
		dexterity: 9,
		constitution:16,
		wisdom:10,
		charisma:16
	},
	skills: {
		insight: 10,
		perception:17,
		persuasion:16,
		stealth:9
	},
	immunities:["fire", "cold"],
	senses:{
		blindsight: 60,
		darkvision: 120
	},
	passivePerception: 27,
	languages:["Common", "Draconic"],
	challengeRating:24,
	content: {
		traits:[{
			name:"Amphibious",
			freetext: "The dragon can breathe air and water."
		},{
			name: "Legendary Resistance",
			recharge: "(3/Day)",
			freetext: "If the dragon fails a saving throw, it can choose to succeed instead."
		}],
		actions:[{
			name:"Multiattack",
			freetext:"The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws."
		},{
			name:"Bite",
			type: "Melee",
			attackAbility:"str",
			proficiency:true,
			reach: 15,
			damage: "2d10",
			damageAbility: "str",
			damageType: "piercing",
			freetext:"Melee Weapon Attack: +17 to hit, reach 15 ft., one target. Hit: 21 (2d10 + 10) piercing damage."
		},{
			name:"Claw",
			type: "Melee",
			attackAbility:"str",
			proficiency:true,
			reach: 10,
			damage: "2d6",
			damageAbility: "str",
			damageType: "slashing",
			freetext: "Melee Weapon Attack: +17 to hit, reach 10 ft., one target. Hit: 17 (2d6 + 10) slashing damage."
		},{
			name: "Tail",
			type: "Melee",
			attackAbility:"str",
			proficiency:true,
			reach: 10,
			damage: "2d8",
			damageAbility: "str",
			damageType: "bludgeoning",
			freetext: "Melee Weapon Attack: +17 to hit, reach 20 ft., one target. Hit: 19 (2d8 + 10) bludgeoning damage."
		},{
			name: "Frightful Presence",
			type:"Ranged",
			range: {
				standard:120
			},
			savingThrowCondition: "aware of the dragon",
			savingThrowAbility:"cha",
			savingThrowVsAbility:"wis",
			savingThrowFailure: "frightened for 1 minute",
			freetext: "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 24 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours."
		},{
			name:"Fire Breath",
			recharge: "5-6",
			type:"Ranged",
			range: {
				standard:90,
				shape:"cone"
			},
			savingThrowAbility: "cha",
			savingThrowVsAbility: "dex",
			savingThrowSuccess:"half damage",
			damage: "13d10",
			freetext: "The dragon exhales fire in a 90-foot cone. Each creature in that area must make a DC 24 Dexterity saving throw, taking 71 (13d10) fire damage on a failed save, or half as much damage on a successful one."
		},{
			name:"Weakening Breath",
			recharge: "5-6",
			type:"Ranged",
			range: {
				standard:90,
				shape:"cone"
			},
			savingThrowAbility: "cha",
			savingThrowVsAbility: "str",
			savingThrowFailure: "disadvantage on Strength-based attack rolls, Strength checks, and Strength saving throws for 1 minute",
			freetext: "The dragon exhales gas in a 90-foot cone. Each creature in that area must succeed on a DC 24 Strength saving throw or have disadvantage on Strength-based attack rolls, Strength checks, and Strength saving throws for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success."
		},{
			name:"Change Shape",
			type:"Other",
			freetext:"The dragon magically polymorphs into a humanoid or beast that has a challenge rating no higher than its own, or back into its true form. It reverts to its true form if it dies. Any equipment it is wearing or carrying is absorbed or borne by the new form (the dragon's choice).\nIn a new form, the dragon retains its alignment, hit points, Hit Dice, ability to speak, proficiencies, Legendary Resistance, lair actions, and Intelligence, Wisdom, and Charisma scores, as well as this action. Its statistics and capabilities are otherwise replaced by those of the new form, except any class features or legendary actions of that form."
		}],
		legendaryPoints:3,
		legendaryActions:[{
			name: "Detect",
			type: "Other",
			cost: 1,
			freetext: "The dragon makes a Wisdom (Perception) check."
		},{
			name:"Tail Attack",
			type:"Melee",
			cost: 1,
			freetext:"The dragon makes a tail attack."
		},{
			name:"Wing Attack",
			cost: 2,
			type: "Melee",
			reach: 15,
			savingThrowAbility:"str",
			savingThrowVsAbility:"dex",
			damage: "2d6",
			damageAbility:"str",
			freetext: "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 25 Dexterity saving throw or take 17 (2d6 + 10) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed."
		}]
	}
};
