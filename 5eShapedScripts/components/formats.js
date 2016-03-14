var formats = {
	"name":"npc",
	"type":"orderedContent",
	"contentModel": [
		{
			"name":"coreInfo",
			"type":"orderedContent",
			"flatten":true,
			"contentModel": [
				{
					"name":"name",
					"attribute": "character_name",
					"type":"string",
					"bare":"true"
				},
				{
					"name":"size",
					"enumValues":["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"],
					"type":"enumType",
					"bare":"true"
				},
				{
					"name":"type",
					"type":"string",
					"bare":"true"
				},
				{
					"name":"alignment",
					"type":"enumType",
					"enumValues":["lawful good", "lawful neutral", "lawful evil", "neutral good", "neutral evil", "neutral",
						"chaotic good", "chaotic neutral", "chaotic evil", "unaligned", "any alignment", "any good alignment", "any evil alignment",
						"any lawful alignment", "any chaotic alignment"],
					"bare":true
				}
			]
		},
		{
			"name":"attributes",
			"type":"unorderedContent",
			"flatten":true,
			"contentModel":[
				{
					"name":"ac",
					"parseToken":"armor class",
					"pattern": "\\d+\\s*(?:\\([^)]*\\))?",
					"type":"string"
				},
				{
					"name":"hp",
					"parseToken":"hit points",
					"attribute":"hp_srd",
					"type":"string"
					//TODO: implement a pattern for this
				},
				{
					"name":"speed",
					"minOccurs":0,
					"attribute":"npc_speed",
					"type":"string",
					"pattern":"^\\d+\\s*ft[\\.]?(,\\s*(fly|swim|burrow|climb)\\s+\\d+ft[\\.]?)*(\\(hover\\))?$"
				},
				{
					"name":"strength",
					"parseToken":"str",
					"type":"string"
				},
				{
					"name":"dexterity",
					"parseToken":"dex",
					"type":"string"
				},
				{
					"name":"constitution",
					"parseToken":"con",
					"type":"string"
				},
				{
					"name":"intelligence",
					"parseToken":"int",
					"type":"string"
				},
				{
					"name":"wisdom",
					"parseToken":"wis",
					"type":"string"
				},
				{
					"name":"charisma",
					"parseToken":"cha",
					"type":"string"
				},
				{
					"name": "savingThrows",
					"minOccurs":0,
					"attribute":"saving_throws_srd",
					"parseToken": "saving throws",
					"type":"string",
					"pattern":"^((Str|Dex|Con|Int|Wis|Cha)\\s+[\\-\\+]\\d+(,(?!$)\\s*|$))+$"
				},
				{
					"name": "skills",
					"minOccurs":0,
					"attribute":"skills_srd",
					"type":"string",
					"pattern":"^((Acrobatics|Animal Handling|Arcana|Athletics|Deception|History|Insight|Intimidation|Investigation|Medicine|Nature|Perception|Performance|Persuasion|Religion|Slight of Hand|Stealth|Survival)\\s+[\\-\\+]\\d+(,(?!$)\\s?|$))+$"
				},
				{
					"attribute": "damage_vulnerabilities",
					"minOccurs":0,
					"type":"string",
					"name": "vulnerabilties",
					"parseToken": "damage vulnerabilities",
					"pattern":"^\\w+(,\\s*\\w+)*$"
				},
				{
					"attribute": "damage_resistances",
					"minOccurs":0,
					"type":"string",
					"name": "resistances",
					"parseToken": "damage resistances",
					"pattern":"^\\w+(,\\s*\\w+)*$"
				},
				{
					"attribute": "damage_immunities",
					"minOccurs":0,
					"type":"string",
					"name": "immunities",
					"parseToken": "damage immunities",
					"pattern":"^\\w+(,\\s*\\w+)*$"
				},
				{
					"attribute": "condition_immunities",
					"minOccurs":0,
					"type":"string",
					"name": "conditionImmunities",
					"parseToken": "condition immunities",
					"pattern":"^\\w+(,\\s*\\w+)*$"
				},
				{
					"name":"senses",
					"type":"string",
					"minOccurs":0,
					"pattern":"^((blindsight|darkvision|tremorsense|truesight)\\s+\\d+\\s*ft[\\.]?)(,\\s*(blindsight|darkvision|tremorsense|truesight)\\s+\\d+\\s*ft[\\.]?)*"
				},
				{
					"name":"passivePerception",
					"parseToken":",?\\s*passive Perception",
					"minOccurs":0,
					"type":"integer",
					"outputIn": "json"
				},
				{
					"name":"languages",
					"minOccurs":0,
					"type":"string"
				}
			]
		},
		{
			"name":"challenge",
			"type":"string",
			"pattern":"^.*$"
		},
		{
			"name":"spellBook",
			"attribute":"spells_srd",
			"type":"string",
			"pattern":"^\\w+(,\\s*\\w+)*$",
			"minOccurs":0
		},
		{
			"name":"traitSection",
			"type":"orderedContent",
			"minOccurs":0,
			"maxOccurs":1,
			"flatten":true,
			"contentModel":[
				{
					"name":"traits",
					"type":"orderedContent",
					"minOccurs":1,
					"maxOccurs":"Infinity",
					"contentModel":[
						{
							"name":"name",
							"type":"string",
							"pattern":"^([A-Z][\\w\\-']+(?:\\s(?:[A-Z][\\w\\-']+|of|and|or|a)+)*)\\s?(\\([^\\)]+\\))?\\s*\\.",
							"matchGroup":1,
							"bare":true,
							"caseSensitive":true
						},
						{
							"name":"recharge",
							"type":"string",
							"pattern":"^\\(([^\\)]+)\\)\\.",
							"bare":true,
							"matchGroup":1,
							"minOccurs":0
						},
						{
							"name":"text",
							"bare":true,
							"type":"string"
						}
					]
				}
			]
		},
		{
			"name":"actionSection",
			"type":"orderedContent",
			"minOccurs":0,
			"maxOccurs":1,
			"flatten":true,
			"contentModel":[
				{
					"name":"actionHeader",
					"type":"heading",
					"bare":true,
					"pattern":"^Actions$"
				},
				{
					"name":"actions",
					"type":"orderedContent",
					"minOccurs":1,
					"maxOccurs":"Infinity",
					"contentModel":[
						{
							"name":"name",
							"type":"string",
							"pattern":"^([A-Z][\\w\\-']+(?:\\s(?:[A-Z][\\w\\-']+|of|and|or|a)+)*)\\s?(\\([^\\)]+\\))?\\s*\\.",
							"matchGroup":1,
							"bare":true,
							"caseSensitive":true
						},
						{
							"name":"recharge",
							"type":"string",
							"bare":true,
							"pattern":"^\\(([^\\)]+)\\)\\.",
							"matchGroup":1,
							"minOccurs":0
						},
						{
							"name":"text",
							"bare":true,
							"type":"string"
						}
					]
				}
			]
		},
		{
			"name":"legendaryActionSection",
			"type":"orderedContent",
			"minOccurs":0,
			"maxOccurs":1,
			"flatten":true,
			"contentModel":[
				{
					"name":"actionHeader",
					"type":"heading",
					"bare":true,
					"pattern":"^Legendary Actions$"
				},
				{
					"name":"legendaryPoints",
					"type":"integer",
					"bare":true,
					"pattern":"^\\s*can take (\\d+) legendary actions.*?start of each turn[.]?",
					"matchGroup":1
				},
				{
					"name":"legendaryActions",
					"type":"orderedContent",
					"minOccurs":1,
					"maxOccurs":"Infinity",
					"contentModel":[
						{
							"name":"name",
							"type":"string",
							"bare":true,
							"pattern":"^([A-Z][\\w\\-']+(?:\\s(?:[A-Z][\\w\\-']+|of|and|or|a)+)*)\\s?(\\([^\\)]+\\))?\\s*\\.",
							"matchGroup":1,
							"caseSensitive":true
						},
						{
							"name":"cost",
							"type":"integer",
							"bare":true,
							"pattern":"^\\s*\\(\\s*costs (\\d+) actions\\s*\\)",
							"matchGroup":1,
							"minOccurs":0
						},
						{
							"name":"text",
							"bare":true,
							"type":"string"
						}
					]
				}
			]
		},
		{
			"name":"lairActions",
			"type":"orderedContent",
			"minOccurs":0,
			"maxOccurs":1,
			"flatten":true,
			"contentModel":[
				{
					"name":"actionHeader",
					"type":"heading",
					"bare":true,
					"pattern":"^Lair Actions$"
				},
				{
					"name":"lairActions",
					"type":"orderedContent",
					"minOccurs":1,
					"maxOccurs":"Infinity",
					"contentModel":[
						{
							"name":"name",
							"type":"string",
							"bare":true,
							"pattern":"^([A-Z][\\w\\-']+(?:\\s(?:[A-Z][\\w\\-']+|of|and|or|a)+)*)\\s?(\\([^\\)]+\\))?\\s*\\.",
							"matchGroup":1,
							"caseSensitive":true
						},
						{
							"name":"text",
							"bare":true,
							"type":"string"
						}
					]
				}
			]
		}
	]
};

module.exports = {
	mmFormat: formats
};
