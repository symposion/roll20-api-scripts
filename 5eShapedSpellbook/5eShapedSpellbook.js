var SpellMonitor = SpellMonitor || (function() {
    'use strict';

    var version = '0.1',
    
    checkInstall = function () {
        LHUtilities.ensureMixins();
        log("Loaded SpellMonitor v." + version);
    },
    
    
    HandleInput = function(msg) {
        try{
            if(msg.type !== 'api' || 
                msg.content.indexOf('!sm') !== 0) {
                return;
            }
            var parameterMap = parseArguments(_.rest(msg.content.split('--')));
            var ritual = false;
            switch(_.keys(parameterMap)[0]) {
                case 'long-rest':
                    _.each(getSelectedCharacters(msg), handleLongRest);
                    break;
                case 'show-spellbook':
                    showSpellBook(_.first(getSelectedCharacters(msg)), msg.playerid);
                    break;
                case "cast-ritual-spell":
                    ritual=true;
                case "cast-spell":
                    castSpell(msg.playerid, getObj("character", parameterMap.character), 
                                parameterMap['cast-spell'], parameterMap.level, resolveAC(parameterMap.targetAC, msg.inlinerolls)
                                , parameterMap.targetName || "", ritual);
                    break;
                case "test":
                    var string = "[[d20cs>20]] [[d20 + [[2]] ]]";
                    sendChat("",string, function(results) {
                        log(results);
                    });
                    break;
                default:
                    log('Unrecognised command');
                    log(msg);
            }
        }
        catch(e) {
            log(e);
            log(e.stack);
            message("There was an error, see log for more details", msg.playerid);
        }
    },
    
        
    resolveAC = function(acExpression, inlineRolls) {
        if (!acExpression) { return ""}
        var re = /\$\[\[([\d]+)\]\]/g;
        var re2 = /(abs|floor)/g;
        var resolved =  acExpression.replace(re, function(match, rollIndex) {
            return inlineRolls[rollIndex].results.total;    
        }).replace(re2, 'Math.$1');
        return '[[0d0 + '+ eval(resolved) + ' ]]';
    },
    
    
    parseArguments = function(args) {
        return _.chain(args).map(function(argumentBlock) {
                        return argumentBlock.split(" ");
                    })
                    .reduce(function(parameterMap, parameterPieces) {
                        parameterMap[parameterPieces.shift()] = parameterPieces.join(" ").trim();
                        return parameterMap;
                     }, {})
                     .value();
    },
    
    castSpell = function(playerId, character, spellName, level, targetAC, targetName, ritual) {
        var spellMap = buildSpellMap(character);
        var spell = spellMap[spellName];
        level = level || spell.level;
        if (_.isUndefined(spell)) {
            message(character.get('name') + " doesn't know the spell " + spellName, playerId);
            return;
        }
        if (spell.level === 0) {
            outputSpell(character, spell, 0, targetAC, targetName);
        }
        else if(ritual) {
            //Be explicit about level, not allowed to cast rituals at higher level
            outputSpell(character, spell, spell.level, targetAC, targetName, true);
        }
        else if(spell['spellisprepared'] === "on") {
            if (getTotalSpellSlotsRemainingByLevel(character)[level] > 0) {
                outputSpell(character, spell, level, targetAC, targetName);
                decrementSpellSlots(character, level, playerId);
            }
            else {
                message(character.get('name') + " doesn't have any slots of level " +level + ' left to cast ' + spellName + " Spellbook will reload. ", playerId);
                showSpellBook(character, playerId);
            }
        }
        else {
            message(character.get('name') + " doesn't have the spell " + spellName + " prepared.", playerId)
        }
    },
    
    getPlayerName = function(playerId) {
        return getObj('player', playerId).get("_displayname");
    },
    
    outputSpell = function(character, spell, level, targetAC, targetName, ritual) {
        if(ritual){ 
            spell.spell_casting_time =  '10 mins';
            spell.spellritual = '{{spellritual=1}}';
        }
        else {
            spell.spellritual = '';
        }
       
        spell.casting_level = (level == 0) ? "Cantrip" : "Level " + level;
        
        //We need to replace all attributes defined in the spell, then run substitution
        //against the hidden variable lookups pulled from the charsheet, and finally inject values
        // for target info We keep going round this loop until no more replacements happen
        var rollTemplate = interpolateAttributes(spellCastRollTemplate, 
                                                    [getMapLookup(spell), 
                                                     getMapLookup(rollTemplateLookups),
                                                     getMapLookup({attacks_vs_target_ac: targetAC, 
                                                                    attacks_vs_target_name: targetName})
                                                     //,getCharacterAttributeLookup(character)
                                                     ]);
                                                     
                                                     
                                                     
        //Do this last to avoid loads of crappy error messages in the log for 
        //attributes that come from elsewhere that it can't find. Also this
        //is probably slower than the rest and we should avoid doing it more than
        //needed.
        rollTemplate = interpolateAttributes(rollTemplate, [getCharacterAttributeLookup(character)]);
        
        rollTemplate = stripHelpfulLabelsToAvoidRoll20ApiBug(rollTemplate);
        log(rollTemplate);
        log("\n\n\n\n\n\n" );
        sendChat(character.get('name'), rollTemplate);
        
    },

    stripHelpfulLabelsToAvoidRoll20ApiBug = function(chatString) {
        return chatString.replace(/\[[ a-zA-Z_-]+\]/g, "");
    },

    interpolateAttributes = function(rollTemplate, lookupFunctions) {
        var replacementMade = false;
        var safetyCount = 0;
        var regexp = /\@\{([^\}]+)\}/gi;
        do {
            var startingRollTemplate = rollTemplate;
            rollTemplate = _.reduce(lookupFunctions, function(innerRollTemplate, lookupFunc, index){
                return innerRollTemplate.replace(regexp, function(match, submatch) {
                    var replacement = lookupFunc(submatch);
                    if (replacement != null) {
                        return replacement;
                    }
                    else {
                        return match;
                    }
                });
            }, rollTemplate);
            replacementMade = (rollTemplate != startingRollTemplate);
        } while (replacementMade && (++safetyCount  < 10) );
        return rollTemplate;
    },
    
    getCharacterAttributeLookup = function(character) {
        return function(key) {
            var value = getAttrByName(character.id, key);
            return _.isUndefined(value) ? null : value;
        }
    },
    
    getMapLookup = function(map) {
        return function(key) {
            return _.has(map, key) ? map[key] : null;
        }  
    },
    
    outputRitualSpell = function(character, spell, playerId) {
        sendChat(getPlayerName(playerId), character.get("name") + " casts " + spell.spellname + " as a ritual");
    },
    
    decrementSpellSlots = function(character, level, playerId) {
        var warlockSlots = getWarlockSlots(character);
        var otherSpellSlots = getNormalSpellSlots(character);
        //Try warlock slots first, as they are cheapest
        if (!_.isEmpty(warlockSlots) && warlockSlots[0].level == level && warlockSlots[0].current > 0) {
            warlockSlots[0].attribute.set('current', --warlockSlots[0].current);
            return;
        }
        
        if(otherSpellSlots[level].current > 0) {
            otherSpellSlots[level].attribute.set('current', --otherSpellSlots[level].current);
            return;
        }
        
        throw new Error('No slots of level ' + level + ' were available, spell could not be cast!');
        
    },
    
    message = function(text, playerId) {
        var playerName = getPlayerName(playerId);
        var sendingCommand = "/w ";
        sendChat("Spell Monitor", sendingCommand + '"' + playerName + '" ' + text);
        if(!playerIsGM(playerId)) {
            sendChat("Spell Monitor", sendingCommand + "gm " + text);
        }
    },
    
    showSpellBook = function(character, playerId) {
        var commandString = _.chain(buildSpellMap(character))
            .tap(function(spells) { if(_.isEmpty(spells)) { return; }})
            .sortBy(function(spell) {
                return spell.level + '_' + spell.spellname;
            })
            .reduce(getSpellButtonAppender(character), "")
            .value();
        message(commandString, playerId, true);
    },
    
    
    getSpellButtonAppender = function(character) {
        return function(spellString, spell) {
            var targetParam = spellNeedsTarget(spell) ? " --targetAC &#64;{target|AC} --targetName &#64;{target|token_name} " : "";
            var enabled = false;
            var castCommand = " --cast-spell ";
            var spellLevelParam = "";
            if (spell.level === 0) {
                enabled = true;
            }
            else {
                var validSpellSlots = calculateValidSpellSlots(spell, character);
                if(spell['spellisprepared'] === "on" && !_.isEmpty(validSpellSlots)) {
                    spellLevelParam = buildSpellLevelParam(spell,validSpellSlots);            
                    enabled = true;
                }
                else if (spell['spellritual']) {
                    enabled = true;
                    castCommand = " --cast-ritual-spell";
                }
            }
            
            if (enabled) {
                spellString += '<a href="!sm' + castCommand  + spell.spellname + spellLevelParam + ' --character ' + character.id + targetParam + '">' + spell.spellname + '</a>';
            }
            else {
                spellString += '<span style="color:gray; background-color:lightgrey; padding:5px; display:inline-block; border: 1px solid white;" >' + spell.spellname + '</span>';
            }
            
            return spellString;
        };  
    }, 
    
    spellNeedsTarget = function(spell) {
        return (!_.isEmpty(spell.spell_toggle_save) || 
                    !_.isEmpty(spell.spell_toggle_attack)) && 
                _.isEmpty(spell.spellaoe);
    },
   
    spellCanBeCastHigher = function(spell) {
        return !_.isEmpty(spell['spellhighersloteffect']) || !_.isEmpty(spell['spell_toggle_higher_lvl_query']);
    },
    
    calculateValidSpellSlots = function(spell, character) {
        return  _.chain(getTotalSpellSlotsRemainingByLevel(character)).map(function(spellsRemaining, slotLevel) {
                        return (slotLevel >= spell.level && spellsRemaining > 0) ? slotLevel : null; 
                    })
                .compact()
                .value();
    },
    
    buildSpellLevelParam = function(spell, validSlots) {
        //Only assume the spell level if it's an exact match and 
        //there's no reason to cast higher/no slots are available to do so
        if(_.contains(validSlots, spell.level) && 
            (!spellCanBeCastHigher(spell) || _.size(validSlots) === 1)) return " --level " + spell.level;
        
        
        return  _.chain(validSlots)
                        .reduce(function(paramString, slotLevel, slotIndex, slotArray) {
                            if(slotIndex === 0 ) { paramString += "?{Slot level"; }
                            paramString += "|" + slotLevel;
                            if((slotIndex + 1) === _.size(slotArray)) { paramString += "}"; }
                            return paramString;
                        }, " --level ")
                        .value();
    },
   
    getTotalSpellSlotsRemainingByLevel = function(character) {
        var nonZeroFound = false;
        return _.chain(getNormalSpellSlots(character))
            .concat(getWarlockSlots(character))
            .reduce(function(slotArray, slotDetails) {
                slotArray[slotDetails['level']] += slotDetails['current'];
                return slotArray;
            }, initialiseEmptySpellSlotArray()).
            reduceRight(function(slotArray, spellsRemaining, index) {
                if(spellsRemaining > 0 || nonZeroFound) {
                    nonZeroFound = true;
                    slotArray[index] = spellsRemaining;  
                }
                return slotArray;
            }, []).value();  
    },
    
    initialiseEmptySpellSlotArray = function() {
        return _.range(0,10).map(_.constant(0));
    },
   
    getNormalSpellSlots = function(character) {
        return _.chain(_.range(1,10))
                        .map(function(level){
                            var attribute = findObjs({_type: 'attribute', _characterid: character.id, name: "spell_slots_l" + level})[0];
                            var current = parseInt(getAttrByName(character.id, 'spell_slots_l' + level, 'current'), 10) || 0;
                            return {level:level, current:current, attribute:attribute};
                        })
                        .splice(0,0,{level:0, current:0, attribute:null})
                        .value();
    },
    
    getWarlockSlots = function(character) {
        var warlockSpellSlotsLevel = parseInt(getAttrByName(character.id, 'warlock_spell_slots_level', 'current'), 10) || 0;
        if (warlockSpellSlotsLevel === 0) {
            return [];
        }   
        var warlockSpellSlots = parseInt(getAttrByName(character.id, 'warlock_spell_slots', 'current'), 10) || 0;   
        var warlockSlotAttribute =  findObjs({_type: 'attribute', _characterid: character.id, name: 'warlock_spell_slots'})[0];
        return [{level:warlockSpellSlotsLevel, current:warlockSpellSlots, attribute:warlockSlotAttribute}];
    },
    
    getSelectedCharacters = function(msg, callback) {
        return _.chain(getSelectedTokens(msg))
                    .map(LHUtilities.getObjectMapperFunc(LHUtilities.getPropertyResolver('represents'), 'character'))
                    .value();
    },
    
    getSelectedTokens = function(msg) {
       return  _.chain([msg.selected]).flatten().compact()
            .tap(function(selectionList) {
                if(_.isEmpty(selectionList)) {
                    log('No token selected');
                }
            })
            .filter(_.matcher({_type: 'graphic'}))
            .map(LHUtilities.getObjectMapperFunc(LHUtilities.getPropertyResolver('_id'), 'graphic', 'token'))
            .value();
    },
      
    handleLongRest = function(token) {
        var represents = token.get('represents');
        if (represents) {
            _.chain(_.range(1,10))
                .map(function(level){
                    return "spell_slots_l" + level;
                })
                .concat(['warlock_spell_slots'])
                .each(function(slotAttributeName) {
                    var slotAttribute = findObjs({_type: 'attribute', _characterid: represents, name: slotAttributeName})[0];
                    slotAttribute.set('current', slotAttribute.get('max'));
                });
        }
    },  
    
   
    
    buildSpellMap = function(character) {
      var re = /repeating_spellbook(?:(cantrip)|level([\d]))_([\d]+)_(.*)/;
      return _.chain(findObjs({_type: 'attribute', _characterid: character.id}))
        .select(function(attribute){
            return attribute.get('name').indexOf("repeating_spellbook") == 0;  
        })
        .map(function(attribute) {
            var results = re.exec(attribute.get('name'));
            var spellLevel = parseInt(results[2], 10) || 0;
            return {spellIndex: spellLevel + '_' + results[3], indexInLevel: results[3], fieldName: results[4], fieldValue: attribute.get('current'), level: spellLevel};
        })
        .groupBy('spellIndex')
        .reduce(function(spellMap, spellEntry){
            var spellObject = _.reduce(spellEntry, function(spell, fieldObject){
                spell[fieldObject.fieldName] = fieldObject.fieldValue;
                spell['level'] = fieldObject.level;
                spell['originalIndex'] = "repeating_spellbook" + ((fieldObject.level == 0) ? "cantrip" : fieldObject.level) + "_" + fieldObject.indexInLevel + "_";
                return spell;
            }, _.clone(baseSpellObject));
            spellMap[spellObject.spellname] = spellObject;
            return spellMap;
        }, {})
        .value();  
    },
  
    
    rollTemplateLookups = {
        spell_var_description: "{{spelldescription=@{spelldescription}}}",
        spell_var_higher_lvl: "{{spellhigherlevel=@{spellhighersloteffect}}}",
        spell_var_output_higher_lvl_query: "{{spell_cast_as_level=@{casting_level}}}",
        higher_level_query: "@{casting_level}",
        spell_to_hit: "@{PB} + @{attackstat} + (@{spell_attack_bonus} * @{spell_toggle_bonuses})",
        spell_attack_higher_level_formula: "((@{spell_toggle_higher_lvl_query} - @{spellbaselevel}) * @{spell_attack_higher_level_dmg_dice})@{spell_attack_higher_level_dmg_die}[higher lvl]",
        spell_attack_higher_level_formula_second: "((@{spell_toggle_higher_lvl_query} - @{spellbaselevel}) * @{spell_attack_second_higher_level_dmg_dice})@{spell_attack_second_higher_level_dmg_die}[higher lvl]",
        spell_var_emote: "{{emote=@{spellemote}}}",
        spell_var_attack: "{{attack=[[d20cs>@{spell_attack_crit_range}@{d20_mod} + @{spell_to_hit} + (@{global_spell_attack_bonus})]]}} {{attackadv=[[d20cs>@{spell_attack_crit_range}@{d20_mod} + @{spell_to_hit} + (@{global_spell_attack_bonus})]]}} {{targetAC=@{attacks_vs_target_ac}}} {{targetName=@{attacks_vs_target_name}}}",
        spell_var_attack_damage: "{{action_damage=[[0d0 + @{spell_attack_dmg}[dmg] + @{spell_attack_dmg_total}[bonus dmg] + (@{global_spell_damage_bonus})[global spell dmg bonus] + @{spell_attack_higher_level_formula}]]}} {{action_damage_type=@{spell_attack_dmg_type}}}",
        spell_var_attack_second_damage: "{{action_second_damage=[[0d0 + @{spell_attack_second_dmg}[dmg] + @{spell_attack_second_dmg_total}[bonus dmg] + (@{global_spell_damage_bonus})[global spell dmg bonus] + @{spell_attack_higher_level_formula_second}]]}} {{action_second_damage_type=@{spell_attack_second_dmg_type}}}",
        spell_var_attack_crit: "{{can_crit=1}} {{action_crit_damage=[[0d0 + @{spell_attack_dmg} + @{spell_attack_higher_level_formula}]]}} {{action_second_crit_damage=[[0d0 + @{spell_attack_second_dmg} + @{spell_attack_higher_level_formula_second}]]}}",
        spell_attack_dmg_total: "@{spell_attack_dmg_stat} + (@{spell_attack_dmg_bonus} * @{spell_toggle_bonuses})",
        spell_var_save: "{{action_save=1}} {{save_dc=[[@{spell_save_dc_total}]]}} {{action_save_stat=@{savestat}}} {{save_condition=@{save_condition}}} {{save_failure=@{savefailure}}} {{save_success=@{savesuccess}}} {{targetName=@{attacks_vs_target_name}}}",
        spell_var_save_damage: "{{save_damage=[[0d0 + @{spell_save_dmg}[dmg] + @{spell_save_dmg_total}[bonus dmg] + (@{global_spell_damage_bonus})[global spell dmg bonus] + ((@{spell_toggle_higher_lvl_query} - @{spellbaselevel}) * @{spell_save_higher_level_dmg_dice})@{spell_save_higher_level_dmg_die}[higher lvl] ]]}} {{save_damage_type=@{spell_save_dmg_type}}}",
        spell_var_save_second_damage: "{{save_second_damage=[[0d0 + @{spell_save_second_dmg}[dmg] + @{spell_save_second_dmg_total}[bonus dmg] + (@{global_spell_damage_bonus})[global spell dmg bonus] + ((@{spell_toggle_higher_lvl_query} - @{spellbaselevel}) * @{spell_save_second_higher_level_dmg_dice})@{spell_save_second_higher_level_dmg_die}[higher lvl] ]]}} {{save_second_damage_type=@{spell_save_second_dmg_type}}}",
        spell_save_dmg_total: "@{spell_save_dmg_stat} + (@{spell_save_dmg_bonus} * @{spell_toggle_bonuses})",   
        spell_save_dc_total: "@{spellsavedc}[dc] + (@{spell_save_dc_bonus} * @{spell_toggle_bonuses})[bonus]",
        spell_var_healing: "{{spellhealing=[[0d0 + @{spellhealamount}[amount] + @{healstatbonus}[stat bonus] + @{healbonus}[bonus] + (@{global_spell_heal_bonus})[global spell heal bonus] + ((@{spell_toggle_higher_lvl_query} - @{spellbaselevel}) * @{spell_heal_higher_level_amount}) + ((@{spell_toggle_higher_lvl_query} - @{spellbaselevel}) * @{spell_heal_higher_level_dmg_dice})@{spell_heal_higher_level_dmg_die}[higher lvl] ]]}}",
        spell_var_effects: "{{effects=@{spelleffect}}}",
        spell_var_source: "{{spellsource=@{spellsource}}}",
        spell_var_gained_from: "{{spellgainedfrom=@{spellgainedfrom}}}",
        spell_var_bonuses: "1",
        spellcomponents_verbal_var: "{{spell_components_verbal=1}}",
        spellcomponents_somatic_var: "{{spell_components_somatic=1}}",
        spell_casting_time_reaction_var: "1 reaction",
        spell_casting_time_bonus_var: "1 bonus action",
        spell_casting_time_action_var: "1 action",
        spell_casting_time_minute_var: "1 minute",
        spellcomponents_material_var: "{{spell_components_material=@{spellcomponents}}}",
        spell_casting_time_longer_var: "@{spellcasttime}",
        spellbaselevel: "@{level}"
    },
     
    spellCastRollTemplate = "@{output_option} &{template:5eDefault} {{spell=1}} {{character_name=@{character_name}}} " +
                            "@{show_character_name} {{spellfriendlylevel=@{casting_level}}} {{title=@{spellname}}} " + 
                            "@{spellconcentration} @{spellritual} {{spellschool=@{spellschool}}} " +
                            "{{spell_casting_time=@{spell_casting_time}}} {{spellduration=@{spellduration}}} {{target=@{spelltarget}}} " +
                            "{{aoe=@{spellaoe}}} {{range=@{spellrange}}} @{spellcomponents_verbal} @{spellcomponents_somatic} " +
                            "@{spellcomponents_material} @{spell_toggle_description} @{spell_toggle_higher_lvl} @{spell_toggle_emote} " + 
                            "@{spell_toggle_attack} @{spell_toggle_attack_damage} @{spell_toggle_attack_second_damage} " +
                            "@{spell_toggle_attack_crit} @{spell_toggle_save} @{spell_toggle_save_damage} @{spell_toggle_bonuses} " +
                            "@{spell_toggle_healing} @{spell_toggle_effects} @{spell_toggle_source} @{spell_toggle_gained_from} " +
                            "@{spell_toggle_output_higher_lvl_query} @{classactionspellcast}",
   
   //Default values for attributes aren't accessible through the API, 
   //so they have to be duplicated here. Sigh.
   baseSpellObject = {
        spellconcentration:"",
        spellcomponents_verbal:"",
        spellcomponents_somatic:"",
        spellcomponents_material:"",
        spell_toggle_description:"",
        spell_toggle_higher_lvl:"",
        spell_toggle_emote:"",
        spell_toggle_attack:"",
        spell_toggle_attack_damage:"",
        spell_toggle_attack_second_damage:"",
        spell_toggle_attack_crit:"",
        spell_toggle_save:"",
        spell_toggle_save_damage:"",
        spell_toggle_bonuses: 0,
        spell_toggle_healing: 0,
        spell_toggle_effects:"",
        spell_toggle_source:"",
        spell_toggle_gained_from:"",
        spell_toggle_output_higher_lvl_query:"",
        spell_toggle_higher_lvl_query: "",
        spell_attack_higher_level_dmg_dice: 0,
        spell_attack_higher_level_dmg_die: "d0",
        spell_attack_second_higher_level_dmg_dice: 0,
        spell_attack_second_higher_level_dmg_die: "d0",
        spellaoe:"",
        spell_save_dc_bonus: 0,
        spell_save_dmg_bonus: 0,
        save_condition:"",
        savesuccess: "",
        savefailure: "",
        spell_attack_bonus: 0,
        spell_attack_dmg_bonus: 0,
        spell_attack_crit_range: 20,
        spell_attack_second_dmg: 0,
        spell_attack_dmg_stat: 0,
        spell_save_dmg_stat: 0,
        spelltarget: ""
        
   },
   
    registerEventHandlers = function () {
        on('chat:message', HandleInput);
    };
    
    return { CheckInstall: checkInstall, RegisterEventHandlers: registerEventHandlers};
    
})();

on("ready",function(){
    'use strict';

        SpellMonitor.CheckInstall();
        SpellMonitor.RegisterEventHandlers();
});

