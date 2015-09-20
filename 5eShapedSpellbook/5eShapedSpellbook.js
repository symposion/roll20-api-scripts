var SpellMonitor = SpellMonitor || (function() {
    'use strict';

    var version = '0.1',
    
    checkInstall = function () {
        LHU.ensureMixins();
        log("Loaded SpellMonitor v." + version);
    },
    
    asynchAttributeCache = {},
    
    HandleInput = function(msg) {
        profile("HandleInputStart");
        try{
            if(msg.type !== 'api' || 
                msg.content.indexOf('!5esb') !== 0) {
                return;
            }
            var parameterMap = parseArguments(_.rest(msg.content.split('--')));
            switch(_.keys(parameterMap)[0]) {
                case 'long-rest':
                    _.each(getSelectedCharacters(msg), handleLongRest);
                    break;
                case 'show':
                    showSpellBook(_.first(getSelectedCharacters(msg)), msg.playerid);
                    break;
                case "cast":
                    castSpell(msg.playerid, getObj("character", parameterMap.character), 
                                parameterMap['cast'], parameterMap.level, resolveAC(parameterMap.targetAC, msg.inlinerolls)
                                , parameterMap.targetName || "", _.has(parameterMap, 'ritual'));
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
            log('ERROR:')
            log(e.message);
            log(e.stack);
            log('*******');
            message("There was an error, see log for more details", msg.playerid);
        }
        profile("HandleInputEnd");
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
        profile("CastSpellStart");
        var spellMap = buildSpellMap(character);
        var spell = spellMap[spellName];
        if (_.isUndefined(spell)) {
            message(character.get('name') + " doesn't know the spell " + spellName, playerId);
            return;
        }
        //If no level is specified cast at the level of the spell
        level = level || spell.level;
        if (spell.level === 0) {
            outputSpell(character, spell, 0, targetAC, targetName);
        }
        else if(ritual) {
            //Be explicit about level, not allowed to cast rituals at higher level
            outputSpell(character, spell, spell.level, targetAC, targetName, true);
        }
        else if(spell['spellisprepared'] === "on") {
            awaitWarlockSlots(character, function(warlockSlots){
                if (getTotalSpellSlotsRemainingByLevel(character, warlockSlots)[level] > 0) {
                    outputSpell(character, spell, level, targetAC, targetName);
                    decrementSpellSlots(character, level, playerId, warlockSlots);
                }
                else {
                    message(character.get('name') + " doesn't have any slots of level " +level + ' left to cast ' + spellName + " Spellbook will reload. ", playerId);
                    showSpellBook(character, playerId);
                }
            });
        }
        else {
            message(character.get('name') + " doesn't have the spell " + spellName + " prepared.", playerId)
        }
        profile("CastSpellEnd");
    },
    

    
    outputSpell = function(character, spell, level, targetAC, targetName, ritual) {
        profile("outputSpellStart");
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
        sendChat(character.get('name'), rollTemplate);
        profile("outputSpellStart");
    },

    stripHelpfulLabelsToAvoidRoll20ApiBug = function(chatString) {
        return chatString.replace(/\[[ a-zA-Z_-]+\]/g, "");
    },

    interpolateAttributes = function(rollTemplate, lookupFunctions) {
        profile("interpolateAttributesStart");
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
        profile("interpolateAttributesEnd");
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

    
    decrementSpellSlots = function(character, level, playerId, warlockSlots) {
        profile("decrementSpellSlotsStart");
        var otherSpellSlots = getNormalSpellSlots(character);
        //Try warlock slots first, as they are cheapest
        if (!_.isEmpty(warlockSlots) && warlockSlots[0].level == level && warlockSlots[0].current > 0) {
            warlockSlots[0].attribute.set('current', --warlockSlots[0].current);
            profile("decrementSpellSlotsEnd");
            return;
        }
        
        if(otherSpellSlots[level].current > 0) {
            otherSpellSlots[level].attribute.set('current', --otherSpellSlots[level].current);
            profile("decrementSpellSlotsEnd");
            return;
        }
        
        throw new Error('No slots of level ' + level + ' were available, spell could not be cast!');
    },
    
    showSpellBook = function(character, playerId) {
        profile("showSpellBookStart");
        if(!character) {
            message("ERROR: You must have a token selected to display the spell book!", playerId);
            return;
        }
        awaitWarlockSlots(character, function(warlockSlots){
            var remainingSlots = getTotalSpellSlotsRemainingByLevel(character, warlockSlots);
            var buttons = _.chain(buildSpellMap(character))
                .tap(function(spells) { if(_.isEmpty(spells)) { return; }})
                .sortBy(function(spell) {
                    return spell.level + '_' + spell.spellname;
                })
                .tap(function() {profile("Before spellButtonAppender");})
                .reduce(getSpellButtonAppender(character, remainingSlots), {})
                .tap(function() {profile("After spellButtonAppender");})
                .value();
        
             message(buildUI(buttons, character, warlockSlots), playerId, true);
        });
       profile("showSpellBookEnd");
    },
    
    buildUI = function(buttonMap, character, warlockSlots) {
        profile("buildUIStart");
        var ui = '<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">';
        ui += '<h3>' + character.get('name') + "'s Spellbook</h3>";
        var slotMap = _.chain(getNormalSpellSlots(character))
            .concat(warlockSlots)
            .filter(function(slot) { return slot.max > 0; } )
            .reduce(function(map, slot) {
                (map[slot.level] = map[slot.level] || []).push(slot);
                return map;
            },{}).value();
            
        _.chain(slotMap)
            .keys()
            .difference(_.keys(buttonMap))
            .each(function(slotLevel) {
                buttonMap[slotLevel] = [];
            });        
        ui = _.chain(buttonMap)
            .reduce(function(uiString, buttonArray, level){
                uiString += "<h4> " + getLevelString(level, true);
                if (level !== '0') { 
                    _.each(slotMap[level], function(slot) {
                        uiString += "<span style='font-size:80%'> (" + slot.current + "/" + slot.max + " "
                        if(slot.isWarlock) uiString += " Wlk"
                        uiString += ")</span>"; 
                    });
                }
                uiString += "</h4>"
               
                uiString += "<div style='margin:2px; background-color: lightblue; padding 2px'>";
                uiString = _.reduce(buttonArray, function(uiString, button) {
                   uiString += button; 
                   return uiString;
                }, uiString);
                uiString += "</div>"
                return uiString;
            }, ui).value();
        ui += '</div>';
        profile("buildUIEnd");
        return ui;
    },
    
    getLevelString = function(level, plural) {
        if (plural) {
            return level == 0 ? "Cantrips" : ("Level " + level + ' Spells');
        }
        return level === 0 ? "Cantrip" : ("Level " + level);
    },
    
    getSpellButtonAppender = function(character, remainingSlots) {
        return function(buttonMap, spell) {
            
            var enabled = false;    
            var spellButtons = [];
            if (spell.level === 0) {
                spellButtons.push(getSpellButtonText(spell, null, character, false));
            }
            else {
                var validSpellSlots = calculateValidSpellSlots(spell, remainingSlots);
                if(spell['spellisprepared'] === "on" && !_.isEmpty(validSpellSlots)) {
                    var appropriateSlots = getAppropriateSlots(spell, validSpellSlots);
                    spellButtons.push(getSpellButtonText(spell, appropriateSlots, character, false));
                }
                
                if (spell['spellritual']) {
                    spellButtons.push(getSpellButtonText(spell, appropriateSlots, character, true));
                }
            }
            
            if(_.isEmpty(spellButtons)) {
                spellButtons.push('<span style="color:gray; background-color:lightgrey; padding:5px; display:inline-block; border: 1px solid white;" >' + spell.spellname + '</span>');    
            }
            
            buttonMap[spell.level] = buttonMap[spell.level] ? buttonMap[spell.level].concat(spellButtons) : spellButtons;
            
            return buttonMap;
        };  
    }, 
    
    getSpellButtonText = function(spell, appropriateSlots, character, asRitual) {
        var targetParam = spellNeedsTarget(spell) ? " --targetAC " + LHU.ch('@') + "{target|AC} --targetName " + LHU.ch('@') + "{target|token_name} " : "";
        var ritualFlag = asRitual ? " --ritual " : "";
        var spellButtonText = spell.spellname + (asRitual ? " (R)" : "");
        var titleText = asRitual ? "" : ' title="Spell slots: ' + getLevelsButtonText(appropriateSlots) + '" ';
        var spellLevelParam = asRitual ? "" : buildSpellLevelParam(spell,appropriateSlots);
        return '<a href="!5esb --cast ' + spell.spellname + spellLevelParam + ' --character ' + character.id + targetParam + ritualFlag + '"' + titleText + '>' + spellButtonText + '</a>'
    },
    
    getLevelsButtonText = function(appropriateSlots) {
        if (appropriateSlots === null) {
            return "";
        }
        
        var slotMunger = {
            slotText: "",
            slotQueue: [],
            getReduceHandler: function() {
                return function(unusued, slot) {
                    return this.push(slot);    
                }.bind(this);
            },
            
            push: function(slot) {
                if (_.isEmpty(this.slotQueue) || _.last(this.slotQueue) === slot - 1) {
                    this.slotQueue.push(slot);
                }
                else {
                    this.appendQueueToText();
                    this.slotQueue.push(slot);
                }
                return this;
            },
            getSlotText: function() {
                this.appendQueueToText();
                return this.slotText;
            },
            appendQueueToText: function() {
                if (this.slotQueue.length) {
                    this.slotText += (this.slotText.length === 0) ? "" : ",";
                    this.slotText += (this.slotQueue.length > 2) ?
                        this.slotQueue[0] + "-" + _.last(this.slotQueue) :
                        this.slotQueue.join(",");
                    this.slotQueue = [];
                }
            }
        };
        
        return _.reduce(appropriateSlots, slotMunger.getReduceHandler(), slotMunger).getSlotText();
    },
    
    spellNeedsTarget = function(spell) {
        return (!_.isEmpty(spell.spell_toggle_save) || 
                    !_.isEmpty(spell.spell_toggle_attack)) && 
                _.isEmpty(spell.spellaoe);
    },
   
    spellCanBeCastHigher = function(spell) {
        return !_.isEmpty(spell['spellhighersloteffect']) || !_.isEmpty(spell['spell_toggle_higher_lvl_query']);
    },
    
    getAppropriateSlots = function(spell, validSlots) {
        //If it's not a spell that can be cast at a higher level 
        //for additional effects, then there's no reason to cast
        //at anything but the lowest level
        if(!_.isEmpty(validSlots) && !spellCanBeCastHigher(spell)) {
            return validSlots.slice(0,1);
        }
        else {
            return validSlots;
        }
    },
    
    buildSpellLevelParam = function(spell, slots) {
        profile("buildSpellLevelParam");
        if (slots === null) {
            return "";
        }
        var singleSlot =  _.size(slots) === 1;
        var paramString = " --level " + (singleSlot ? "" : "?{Slot level");
         return  _.chain(slots)
                        .reduce(function(paramString, slotLevel, slotIndex) {
                            paramString += (singleSlot ? "" : "|") + slotLevel;
                            return paramString;
                        }, paramString)
                        .tap(function(){profile('buildSpellLevelParamEnd')})
                        .value().concat(singleSlot ? "" : "}");
    },
   
    calculateValidSpellSlots = function(spell, remainingSlots) {
        profile("calculateValidSpellSlots");
        return  _.chain(remainingSlots).map(function(spellsRemaining, slotLevel) {
                        return (slotLevel >= spell.level && spellsRemaining > 0) ? slotLevel : null; 
                    })
                .compact()
                .tap(function() { profile("calculateValidSpellSlotsEnd");})
                .value();
    },
   
    getTotalSpellSlotsRemainingByLevel = function(character, warlockSlots) {
        var nonZeroFound = false;
        return _.chain(getNormalSpellSlots(character))
            .concat(warlockSlots)
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
                            var max  =  parseInt(getAttrByName(character.id, 'spell_slots_l' + level, 'max'), 10) || 0;
                            return {level:level, current:current, attribute:attribute, max:max};
                        })
                        .splice(0,0,{level:0, current:0, attribute:null})
                        .value();
    },
    
    getAttributeExpressionPromise = function(character, expression) {
        var name = character.get("name");
        expression = expression.replace(/@\{([^\}]+)\}/g, "@{" + name + "|$1}");
        var promise = {
            expression:expression,
            resolved:false,
            listeners:[],
            _result: undefined,
            handler:function(rollResult){
                promise.resolved = true;
                promise._result = rollResult[0].inlinerolls[0].results.total;
                _.each(promise.listeners, function(listener) {
                    listener(promise._result);
                });   
            },
            result:function(callback) {
                if (promise.resolved) {
                    callback(this._result);
                }
                else {
                    promise.listeners.push(callback);
                }
            }
        };
        sendChat("", expression, promise.handler);
        
        return promise;
    },

    
    awaitWarlockSlots = function(character, callback) {
        profile("awaitWarlockSlotsStart");
        var warlockSpellSlotsLevel = getAttributeExpressionPromise(character, "[[0d0 + " + getAttrByName(character.id, 'warlock_spell_slots_level', 'current') + "]]");
        var warlockSpellSlotsMax = getAttributeExpressionPromise(character, " [[0d0 + " + getAttrByName(character.id, 'warlock_spell_slots', 'max') +" ]]");
        var warlockSpellSlots = parseInt(getAttrByName(character.id, 'warlock_spell_slots', 'current'), 10) || 0;  
        var warlockSlotAttribute =  findObjs({_type: 'attribute', _characterid: character.id, name: 'warlock_spell_slots'})[0];
        var slots = {level:undefined, current:warlockSpellSlots, max:undefined, attribute:warlockSlotAttribute, isWarlock:true};
        warlockSpellSlotsMax.result(function(resolvedValue){
            slots.max = parseInt(resolvedValue, 10) || 0;   
        });
        warlockSpellSlotsLevel.result(function(resolvedValue){
            slots.level = parseInt(resolvedValue, 10) || 0;   
        });
        awaitAll([warlockSpellSlotsMax, warlockSpellSlotsLevel], function() {
            var pruned = pruneWarlockSlots([slots]);
            profile("awaitWarlockSlots Promises all returned");
            callback(pruned);
        });
    },
    
    profile = function(string) {
        //log(Date.now() + ' : ' + string);
    },
    
    awaitAll = function(promiseArray, callback) {
        var resolvedCount = 0;
        _.each(promiseArray, function(promise) {
            promise.result(function() {
                if (++resolvedCount == _.size(promiseArray)) {
                    callback();
                }
            });    
        });
    },
    
   
    pruneWarlockSlots = function(warlockSlots) {
        if(warlockSlots[0].level === 0) return [];
        return warlockSlots;
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
        profile("buildSpellMapStart");
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
        .tap(function() {profile("buildSpellMapEnd");})
        .value(); 
        
    },
    
    
    getSelectedCharacters = function(msg, callback) {
        return _.chain(getSelectedTokens(msg))
                    .map(LHU.getObjectMapperFunc(LHU.getPropertyResolver('represents'), 'character'))
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
            .map(LHU.getObjectMapperFunc(LHU.getPropertyResolver('_id'), 'graphic', 'token'))
            .value();
    },
    
    getPlayerName = function(playerId) {
        return getObj('player', playerId).get("_displayname");
    },
    
    message = function(text, playerId) {
        var playerName = getPlayerName(playerId);
        var sendingCommand = "/w ";
        sendChat("Spell Book", sendingCommand + '"' + playerName + '" ' + text);
        if(!playerIsGM(playerId)) {
            sendChat("Spell Book", sendingCommand + "gm " + text);
        }
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

