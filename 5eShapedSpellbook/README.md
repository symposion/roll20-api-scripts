# Spellbook script for 5e Shaped Character Sheet on Roll20.net

This script is designed to be used with the 5e Shaped Character Sheet on Roll20.net. It provides an interface to casting spells in the chat window, so that you do not need to keep the character sheet open to make use of spells recorded in it. This is largely a workaround for the fact that Roll20 does not allow external references to repeating sections in character sheets, which the spells section of the 5e sheet makes use of. As an API script it should go without saying that this requires a Pro level subscription to Roll20.

## Installing (IMPORTANT PLEASE READ)

You need to install the files 5eShapedSpellbook.js and LHU.js from this repository as scripts in your Roll20 campaign. In addition, you MUST install the file spellDefaults.js from the character sheet repository so that the script has the necessary information about the version of the character sheet installed for your campaign. It is essential that the file spellDefaults.js is taken from the same version of the character sheet repository as the html and css files. The recommended process is that you update spellDefaults.js whenever you update the character sheet. One consequence of this requirement is that you should always use a version of the character sheet direct from the GitHub repository rather than the one published on Roll20 so that you can ensure that you have matched versions of the sheet and the spellDefaults.js file.

The file 5eCustomSpellHandlers.js is experimental and should only be installed if you a) want more advanced behaviour (see below) and b) are willing to accept things breaking randomly! You have been warned!

## Usage
###Showing spellbook
The basic command is:
```!5esb --show```
This will show the spellbook for the currently selected token. It will list all spells on the token's character sheet, and will also display the number of spell slots remaining for each level for which the character has max slots > 0. Warlock slots will also be displayed. Spells which are not prepared, or for which no appropriate slots are available to cast them will be greyed out. Otherwise a button will be displayed that allows the spell to be cast. 

If the spell can usefully be cast at multiple levels and multiple levels of slot are available to cast it, clicking the button will prompt for the level to cast at. Otherwise the spell will be cast at the lowest appropriate slot that is available. Hovering over the spell button will display a tooltip showing the level at which it wil be cast.

If a spell requires a target, you will also be prompted to select a target for the spell.

If a spell is marked as being a ritual, a button with an (R) after the spell name will be displayed. This will cast the spell as a ritual. Where a ritual spell is also prepared, and appropriate slots are available, two buttons will be displayed, one with the (R) and one without. Spells cast as a ritual will automatically have a casting time of 10 minutes.

Once a spell is successfully cast, the relevant spell slot will be decremented unless the spell was cast a ritual.

###Long rest
You can restore slots as for a long rest by running:
```!5esb --long-rest```
This will reset all current spell slot values to their maxima.

###Casting directly
Internally, the spellbook buttons run commands of the form:
```!5esb --cast Magic Missile --character <character_id> --targetAC @{target|AC} --targetId @{target|token_id}```
The name of the spell must follow the --cast, and then the character id must be provided with --character. Additional optional parameters are:
* **--ritual** cast the spell as a ritual (will fail if the spell is not marked as being a ritual in the character sheet)
* **--targetAC @{target|AC} --targetId @{target|token_id}** if the spell has a target, this will allow the target's AC and name to be displayed. Please note that due to bugs and limitations in the current API, this information must be provided exactly as specified here - you can't pass in the AC any other way (e.g. --targetAC @{MyCharacterName|AC} does NOT work!)

You can use this command in your own macros to do things with spells.


##Advanced features
I am currently working on an extension system to allow additional functionality to be layered on for individual spells. If you install the 5eCustomSpellHandlers.js file as well, the spell Mage Armor will accept a target and will automatically apply the Mage Armor to the targeted token. In the case of a PC it will do this by creating a new armour entry for the token and activating it. In the case of an NPC it will just change the NPC's AC to the appropriate value. In future I will document the API for this to allow others to write similar extensions. The adventurous can examine the script and starting hacking now, but I make no guarantees that the API will remain stable at this stage!

  
