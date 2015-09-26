var CustomSpellHandlers = CustomSpellHandlers || (function() {

    var mageArmorHandler = {
        spell: 'Mage Armor',
        requestTarget: true,
        handlerFunction: function(character, spellName, castingLevel, targetId, targetName, ritual, messageCb, outputFunc) {
            
            if(getAttrByName(targetId, 'is_npc') == 1) {
                return setNPCMageArmor(targetId, targetName, messageCb, outputFunc);
            }
            else {
                return setPCMageArmor(targetId,  targetName, messageCb, outputFunc);
            }
                       
        }     
    },
    
    setNPCMageArmor = function(targetId, targetName, messageCb, outputFunc) {
        outputFunc();
        var characterName = getAttrByName(targetId, "character_name");
        var npcACAttr = findObjs({_type:"attribute", _characterid:targetId, name:"npc_AC"})[0];
        sendChat("", "@{" + characterName + "|dexterity_mod}", function(result) {
            npcACAttr.set('current', 13 + parseInt(result[0].inlinerolls[0].results.total,10));
            messageCb("Mage Armor engaged for " + targetName); 
        });
        
        return true;
    },
    
    setPCMageArmor = function(targetId, targetName, messageCb, outputFunc) {
        var armors = getArmorArray(targetId);
        var activeArmor = _.some(armors, function(armor) { 
                                return armor.name !== 'Mage Armor' && 
                                        !armor.unarmoredBonus && 
                                        armor.worn && 
                                        armor.baseAC != 0;
                            });
        if (activeArmor) {
           messageCb("Can't cast Mage Armor on a target already wearing armor!");
           return false;
        }

        outputFunc();
        var mageArmor = _.find(armors, _.matcher({name:'Mage Armor'})) ||  _.find(armors, _.matcher({name:''}));
        if (!mageArmor) {
            messageCb("Couldn't find an armor slot to engage mage armor for " + targetName + ' Please edit manually.');
            return true;
        }
        _.each(getMageArmorAttributeDetails.apply(mageArmor), function(kv) {
           var attr = findObjs({_type:'attribute', _characterid: targetId, name: kv[0]})[0];
           if (!attr) {
                createObj("attribute", {
                    name: kv[0],
                    current: kv[1],
                    characterid: targetId
                });
           }
           else {
            attr.set('current', kv[1]);
           }
        });
        messageCb("Mage Armor engaged for " + targetName); 
        return true;
    },
    
    getArmorArray = function(characterId) {
        return _.map(_.range(1,7), function(index) {
                var worn = getAttrByName(characterId, 'armoractive' + index);
                var name = getAttrByName(characterId, 'armorname' + index);
                var unarmoredBonus = getAttrByName(characterId, 'armoractiveunarmored' + index);
                var armorACbase = getAttrByName(characterId, 'armorACbase' + index);
                return {name:name, worn:worn != 0, unarmoredBonus:unarmoredBonus != 0, index:index, baseAC:armorACbase};
              });
    },
    
    getMageArmorAttributeDetails = function() {
        return [ 
            ['armoractive'+this.index, '@{armortotalAC' + this.index + '}'],
            ['armoractiveunarmored'+this.index,  0],
            ['armorACbase'+this.index, 13],
            ['armorname'+this.index, 'Mage Armor'],
            ['armortype'+this.index, '@{dexterity_mod} + 0.002']
            ]; 
    };

    return {Handlers:[mageArmorHandler]};

})();

on("ready",function(){
    'use strict';
        _.each(CustomSpellHandlers.Handlers, function(handler) {
            ShapedSpellbook.RegisterCustomSpellHandler(handler.spell, handler);    
        });
        
});
