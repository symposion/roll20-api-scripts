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

var CompendiumFormat = {
	Name: {
		attribute: "character_name",
		type: "string"
	},
	Size: {
		type: "enum",
		values: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]
	},
	Type: {
		type: "enum",
		values: ["Aberration", "Beast", "Celestial", "Construct", "Dragon",
			"Elemental", "Fey", "Fiend", "Giant", "Humanoid", "Monstrosity", "Ooze", "Plant",
			"Undead"]
	},
	Alignment: {
		type: "enum",
		values: ["Lawful Good", "Lawful Neutral", "Lawful Evil", "Neutral Good", "Neutral", "Neutral Evil",
			"Chaotic Good", "Chaotic Neutral", "Chaotic Evil", "Unaligned"]
	},
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
			Fly: {
				type: "integer",
				srdOutput: asDistanceInFeet.bind(this)
			},
			Climb:{
				type: "integer",
				srdOutput: asDistanceInFeet.bind(this)
			},
			Swim:{
				type: "integer",
				srdOutput: asDistanceInFeet.bind(this)
			},
			Burrow: {
				type: "integer",
				srdOutput: asDistanceInFeet.bind(this)
			},
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
			Blindsight: {
				type: "integer",
				srdOutput: asDistanceInFeet
			},
			Darkvision: {
				type:"integer",
				srdOutput: asDistanceInFeet
			},
			Tremorsense: {
				type: "integer",
				srdOutput: asDistanceInFeet
			},
			Truesight: {
				type:"integer",
				srdOutput: asDistanceInFeet
			}
		},
		srdOutput: objectAsSrdString
	},
	Languages: {
		type: "stringArray",
		srdOutput: commaSepOutput
	},
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
					Name:{
						type:"string"
					},
					Type:{
						type:"enum",
						values:['Melee', 'Ranged', 'Other']
					},
					Recharge:{
						type:"string"
					},
					"Saving Throw Condition": {
						type:"string"
					},
					"Saving Throw Ability": {
						type:"enum",
						values:abilities
					},
					"Saving Throw Bonus": {
						type:"integer"
					},
					"Saving Throw Vs Ability":{
						type:"enum",
						values:abilities
					},
					"Saving Throw Failure": {
						type:"string"
					},
					"Saving Throw Success": {
						type:"string"
					},
					Damage: {
						type:"rollExpr"
					},
					"Damage Ability": {
						type:"enum",
						values:abilities
					},
					"Damage Bonus": {
						type:"integer"
					},
					"Damage Type": {
						type:"enum",
						values:damageTypes
					},
					"Damage Crit": {
						type:"rollExpr"
					},
					Heal: {
						type:"rollExpr"
					},
					"Heal Ability": {
						type:"enum",
						values:abilities
					},
					"Heal Bonus": {
						type:"integer"
					},
					Emote: {
						type:"string"
					},
					Freetext: {
						type:"string"
					},
					Freeform: {
						type:"string"
					}
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
