on('ready', function () {
  ShapedScripts.addEntities(
    {
      "version": "0.2",
      "monsters": [
        {
          "name": "Ancient Red Dragon",
          "size": "Gargantuan",
          "type": "dragon",
          "alignment": "chaotic evil",
          "AC": "22 (natural armor)",
          "HP": "546 (28d20+252)",
          "speed": "40 ft., climb 40 ft., fly 80 ft.",
          "strength": "30",
          "dexterity": "10",
          "constitution": "29",
          "intelligence": "18",
          "wisdom": "15",
          "charisma": "23",
          "savingThrows": "Dex +7, Con +16, Wis +9, Cha +13",
          "skills": "Perception +16, Stealth +7",
          "damageImmunities": "fire",
          "senses": "blindsight 60 ft., darkvision 120 ft.",
          "languages": "Common, Draconic",
          "challenge": "24",
          "traits": [
            {
              "name": "Legendary Resistance",
              "text": "If the dragon fails a saving throw, it can choose to succeed instead.",
              "recharge": "3/Day"
            }
          ],
          "actions": [
            {
              "name": "Multiattack",
              "text": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws."
            },
            {
              "name": "Bite",
              "text": "Melee Weapon Attack: +17 to hit, reach 15 ft., one target. Hit: 21 (2d10 + 10) piercing damage plus 14 (4d6) fire damage."
            },
            {
              "name": "Claw",
              "text": "Melee Weapon Attack: +17 to hit, reach 10 ft., one target. Hit: 17 (2d6 + 10) slashing damage."
            },
            {
              "name": "Tail",
              "text": "Melee Weapon Attack: +17 to hit, reach 20 ft., one target. Hit: 19 (2d8 + 10) bludgeoning damage."
            },
            {
              "name": "Frightful Presence",
              "text": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 21 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours."
            },
            {
              "name": "Fire Breath",
              "text": "The dragon exhales fire in a 90-foot cone. Each creature in that area must make a DC 24 Dexterity saving throw, taking 91 (26d6) fire damage on a failed save, or half as much damage on a successful one.",
              "recharge": "Recharge 5-6"
            }
          ],
          "lairActions": [
            "Magma erupts from a point on the ground the dragon can see within 120 feet of it, creating a 20-foot-high, 5-foot-radius geyser. Each creature in the geyser's area must make a DC 15 Dexterity saving throw, taking 21 (6d6) fire damage on a failed save, or half as much damage on a successful one.",
            "A tremor shakes the lair in a 60-foot radius around the dragon. Each creature other than the dragon on the ground in that area must succeed on a DC 15 Dexterity saving throw or be knocked prone.",
            "Volcanic gases form a cloud in a 20-foot-radius sphere centered on a point the dragon can see within 120 feet of it. The sphere spreads a round corners, and its area is lightly obscured. It lasts until initiative count 20 on the next round. Each creature that starts its turn in the cloud must succeed on a DC 13 Constitution saving throw or be poisoned until the end of its turn. While poisoned in this way, a creature is incapacitated."
          ],
          "regionalEffects": [
            "Small earthquakes are common within 6 miles of the dragon's lair.",
            "Water sources within 1 mile of the lair are supernaturally warm and tainted by sulfur.",
            "Rocky fissures within 1 mile of the dragon's lair form portals to the Elemental Plane of Fire, allowing creatures of elemental fire into the world to dwell nearby."
          ],
          "regionalEffectsFade": "If the dragon dies, these effects fade over the course of 1d10 days.",
          "legendaryPoints": 3,
          "legendaryActions": [
            {
              "name": "Detect",
              "text": "The dragon makes a Wisdom (Perception) check.",
              "cost": 1
            },
            {
              "name": "Tail Attack",
              "text": "The dragon makes a tail attack.",
              "cost": 1
            },
            {
              "name": "Wing Attack",
              "text": "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 25 Dexterity saving throw or take 17 (2d6 + 10) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
              "cost": 2
            }
          ]
        }
      ]
    });

  ShapedScripts.addEntities(
    {
      "version": "0.2",
      "spells": [
        {
          "name": "Lightning Arc",
          "description": "You generate an arc of lightning between two targets that are no more than 60 feet apart. Both targets and any creatures in a line connecting them must make a Dexterity saving throw. A creature takes 8d8 lightning damage on a failed save, or half as much damage on a successful one. The spell fails if there is no line of effect between the targets. Lightning arc sets fire to combustibles and damages objects in its path. It can melt metals that have a low melting point, such as lead, gold, copper, silver, or bronze.",
          "higherLevel": "When you cast this spell using a spell slot of 6th level or higher, the damage increases by 1d8 for each slot level above 5th.",
          "emote": "generates an arc of lightning between two targets",
          "source": "houserules",
          "range": "120 ft",
          "target": "Both targets and any creatures in the aoe",
          "aoe": "line connecting the targets",
          "components": {
            "verbal": true,
            "somatic": true
          },
          "duration": "Instantaneous",
          "castingTime": "1 action",
          "level": 5,
          "school": "Evocation",
          "save": {
            "ability": "Dexterity",
            "damage": "8d8",
            "damageType": "lightning",
            "saveSuccess": "half damage",
            "higherLevelDice": "1",
            "higherLevelDie": "d8"
          },
          "effects": "The spell fails if there is no line of effect between the targets. Lightning arc sets fire to combustibles and damages objects in its path. It can melt metals that have a low melting point, such as lead, gold, copper, silver, or bronze."
        },
        {
          "name": "Make Whole",
          "description": "An object or construct creature up 20 cubic feet within 30 feet regains a number of hit points equal to 2d6. This can fix destroyed magic items (at 0 hit points or less), and restores the magic properties of the item if your caster level is at least twice that of the item. Items with charges (such as wands) and single-use items (such as potions and scrolls) cannot be repaired in this way. The spell does not repair items that have been warped, burned, disintegrated, ground to powder, melted, or vaporized, nor does it affect creatures (including constructs).",
          "higherLevel": "When you cast this spell using a spell slot of 3rd level or higher, the target cubic foot range adds 10 cubic feet and the healing increases by 1d6 for each slot level above 2nd.",
          "emote": "repairs an object",
          "source": "houserules",
          "range": "30 ft",
          "target": "an object or construct creature up 20 cubic ft within range",
          "components": {
            "verbal": true,
            "somatic": true,
            "material": true,
            "materialMaterial": "a large lodestone"
          },
          "duration": "Instantaneous",
          "castingTime": "1 action",
          "level": 2,
          "school": "Transmutation",
          "heal": {
            "amount": "2d6",
            "higherLevelDice": "1",
            "higherLevelDie": "d6"
          },
          "effects": "This can fix destroyed magic items (at 0 hit points or less), and restores the magic properties of the item if your caster level is at least twice that of the item. Items with charges (such as wands) and single-use items (such as potions and scrolls) cannot be repaired in this way. The spell does not repair items that have been warped, burned, disintegrated, ground to powder, melted, or vaporized, nor does it affect creatures (including constructs)."
        }
      ]
    });
});
