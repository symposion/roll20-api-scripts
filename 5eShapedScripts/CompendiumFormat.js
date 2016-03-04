var damageTypes = ["radiant", "necrotic", "force", "fire", "cold",
	"acid", "bludgeoning", "piercing", "slashing",
	"lightning", "poison", "psychic", "thunder",
	"bludgeoning, piercing, and slashing from nonmagical weapons"];
var conditions = ["blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled", "incapacitated",
	"invisible", "paralysed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"];
var abilities = ["--", "Str", "Dex", "Con", "Int", "Wis", "Cha"];

var commaSepOutput = _.partial(Array.prototype.join, ', ');

var asDistanceInFeet = function(distance) {
	return distance ? this.attribute.toLowerCase() + " " + distance + " ft." : undefined
};

var objectAsSrdString = function(object) {
	return _.reduce(object, function(memo, value, key) {
		if (memo) {
			memo += ', ';
		}
		memo += this.definition[key].srdOutput(value);
		return memo;
	}, "");
};

var stringProperty = {
	type:"string"
};

var integerProperty = {
	type:"integer"
};

var makeEnumProperty = function(enumValues) {
	return {
		type:"enum",
		values: enumValues
	};
};

var abilityProperty = makeEnumProperty(abilities);
var damageTypeProperty = makeEnumProperty(damageTypes);

var distanceProperty = {
	type: "integer",
	srdOutput: asDistanceInFeet.bind(this)
};

var stringArrayProperty = {
	type: "stringArray",
	srdOutput: commaSepOutput
};

var CompendiumFormat = {
	Name: {
		attribute: "character_name",
		type: "string"
	},
	Size: makeEnumProperty(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]),
	Type: makeEnumProperty(["Aberration", "Beast", "Celestial", "Construct", "Dragon",
			"Elemental", "Fey", "Fiend", "Giant", "Humanoid", "Monstrosity", "Ooze", "Plant",
			"Undead"]),
	Alignment: makeEnumProperty(["Lawful Good", "Lawful Neutral", "Lawful Evil", "Neutral Good", "Neutral", "Neutral Evil",
			"Chaotic Good", "Chaotic Neutral", "Chaotic Evil", "Unaligned"]),
	AC: {
		attribute: "ac_srd",
		type: "object",
		definition: {
			ac: 'integer',
			ac_note: 'string'
		},
		srdOutput: function(object) { return "" + object.ac + "(" + object.ac_note + ")"; }
	},
	HP: {
		attribute: "hp_srd",
		type: "object",
		definition: {
			hit_dice:"integer",
			hit_die:/d(2|4|6|8|10|12|20)/,
			hp_extra: "string"
		},
		srdOutput: function(object) { return "" + object.hit_dice + object.hit_die + "(" + object.hp_extra + ")"; }
	},
	Speed: {
		attribute: "npc_speed",
		type: "object",
		definition: {
			Walk: {
				type: "integer",
				srdOutput: function(distance) {
					return "" + distance + " ft."
				}
			},
			Fly: distanceProperty,
			Climb:distanceProperty,
			Swim:distanceProperty,
			Burrow: distanceProperty,
			Hover: {
				type: "boolean",
				srdOutput: function(value) {
					return value ? "(hover)" : "";
				}
			}
		},
		srdOutput: function(object) {
			var order = ["Burrow", "Fly", "Hover", "Climb", "Swim"];
			return _.reduce(order, function(memo, key) {
				var value = object[key];
				if(value) {
					if (key !== 'Hover') {
						memo += ", ";
					}
					memo += this.definition[key].srdOutput(value);
				}
				return memo;
			},this.definition.Walk.srdOutput(object.Walk));
		}
	},
	Senses: {
		type: "object",
		definition: {
			Blindsight: distanceProperty,
			Darkvision: distanceProperty,
			Tremorsense: distanceProperty,
			Truesight: distanceProperty
		},
		srdOutput: objectAsSrdString
	},
	Languages: stringArrayProperty,
	"Saving Throws": {
		attribute: "saving_throws_srd",
		type: "stringArray",
		pattern: /(Str|Dex|Con|Int|Wis|Cha) ([\+\-][\d]{1,2})/,
		srdOutput: commaSepOutput
	},
	"Spell Book": {
		attribute: "spells_srd",
		type: 'stringArray',
		srdOutput: commaSepOutput
	},
	Vulnerabilties: {
		attribute: "damage_vulnerabilities",
		type: "enumArray",
		values: damageTypes,
		srdOutput: commaSepOutput
	},
	Immunities: {
		attribute: "damage_immunities",
		type: "enumArray",
		values: damageTypes,
		srdOutput: commaSepOutput
	},
	Resistances: {
		attribute: "damage_resistances",
		type: "enumArray",
		values: damageTypes,
		srdOutput: commaSepOutput
	},
	"Condition Immunities": {
		attribute: "condition_immunities",
		type: "enumArray",
		values: conditions,
		srdOutput: commaSepOutput
	},
	"Challenge Rating": {
		attribute: "challenge",
		type: "numberOrFraction"
	},
	Content: {
		attribute: "content_srd",
		type: "object",
		definition: {
			Traits: {
				type: "objectArray",
				definition: {
					Name:stringProperty,
					Type:makeEnumProperty(['Melee', 'Ranged', 'Other']),
					Recharge:stringProperty,
					"Saving Throw Condition": stringProperty,
					"Saving Throw Ability": abilityProperty,
					"Saving Throw Bonus": integerProperty,
					"Saving Throw Vs Ability":abilityProperty,
					"Saving Throw Failure": stringProperty,
					"Saving Throw Success": stringProperty,
					Damage: {
						type:"rollExpr"
					},
					"Damage Ability": abilityProperty,
					"Damage Bonus": integerProperty,
					"Damage Type": damageTypeProperty,
					"Damage Crit": {
						type:"rollExpr"
					},
					Heal: {
						type:"rollExpr"
					},
					"Heal Ability": abilityProperty,
					"Heal Bonus": integerProperty,
					Emote: stringProperty,
					Freetext: stringProperty,
					Freeform: stringProperty
				}
			},
			Actions: {
				type: "objectArray",
				definition: {

				}
			},
			"Legendary Actions": {
				type: "objectArray",
				definition: {

				}
			},
			"Legendary Action Count": {
				type: "integer"
			},
			"Lair Actions": {
				type: "objectArray",
				definition: {
				}
			}
		}

	}

};
