//=============================================================================
// ActorSwitchPlugin.js
// Released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @plugindesc Allows you to assign switches to actors and classes based on party index or class ID.
 * Also provides functions to manage actor and class switches, and set event images based on actor switches.
 * @author NoobieMcNooobs
 * 
 * 
 * <ActorSwitch>
 * - Assign switches to actors and classes based on party index or class ID.
 * - Control switches to turn on when actors are present in the party or when specific classes are active.
 * - Manage actor skills based on switch states.
 * - Display event images based on the active actor's switch using <PartyImage> note tag.
 * - Suitable for customizing game mechanics related to character progression and party composition.
 *
 * 
 * @help
 * This plugin allows you to assign a switch to each actor and class in your game
 * based on their party index and current class. The switch will be turned ON when
 * the actor is present in the party or when the actor's class matches the defined class.
 *
 * Example Plugin Commands:
 *   turnOnActorSwitchByIndex(0);    // Turns on the actor switch for the first actor in the party
 *   turnOnClassSwitchByIndex(0);    // Turns on the class switch for the first actor's current class
 *   hasActorLearnt(skillId);        // Checks if the actor associated with the active switch has learnt the specified skill
 *   actorLearn(skillId);            // Teaches the specified skill to the actor associated with the active switch
 * 
 * Use the note tag <PartyImage> in event notes to display the image of the actor whose switch is currently ON.
 * 
 * 
 * ============================================================================
 * Terms of Use
 * ============================================================================
 * Free for any commercial or non-commercial project!
 * (edits are allowed)
 *
 * @param ActorSwitches
 * @text Actor Switches
 * @desc Define the actor IDs and switch IDs.
 * @type struct<ActorSwitch>[]
 * @default []
 *
 * @param ClassSwitches
 * @text Class Switches
 * @desc Define the class IDs and switch IDs.
 * @type struct<ClassSwitch>[]
 * @default []
 *
 */

/*~struct~ActorSwitch:
 * @param ActorID
 * @text Actor ID
 * @type actor
 * @desc The ID of the actor.
 * 
 * @param SwitchID
 * @text Switch ID
 * @type switch
 * @desc The ID of the switch assigned to the actor.
 */

/*~struct~ClassSwitch:
 * @param ClassID
 * @text Class ID
 * @type class
 * @desc The ID of the class.
 * 
 * @param SwitchID
 * @text Switch ID
 * @type switch
 * @desc The ID of the switch assigned to the class.
 */

(function() {

    var parameters = PluginManager.parameters('ActorSwitchPlugin');
    var actorSwitches = {};
    var classSwitches = {};
    

    //=============================================================================
    // Parse Plugin Parameters
    //=============================================================================

    var actorSwitchParams = JSON.parse(parameters['ActorSwitches'] || '[]');
    var classSwitchParams = JSON.parse(parameters['ClassSwitches'] || '[]');
    
    actorSwitchParams.forEach(function(param) {
        var actorSwitchData = JSON.parse(param);
        var actorId = parseInt(actorSwitchData['ActorID']);
        var switchId = parseInt(actorSwitchData['SwitchID']);
        if (!isNaN(actorId) && !isNaN(switchId)) {
            actorSwitches[actorId] = switchId;
        }
    });

    classSwitchParams.forEach(function(param) {
        var classSwitchData = JSON.parse(param);
        var classId = parseInt(classSwitchData['ClassID']);
        var switchId = parseInt(classSwitchData['SwitchID']);
        if (!isNaN(classId) && !isNaN(switchId)) {
            classSwitches[classId] = switchId;
        }
    });


    //=============================================================================
    // Function to Turn On Actor Switch and Class Switch
    //=============================================================================

    var turnOnActorSwitchByIndex = function(partyIndex) {
        var actor = $gameParty.members()[partyIndex];
        if (actor) {
            // Reset all actor switches
            for (var index in actorSwitches) {
                $gameSwitches.setValue(actorSwitches[index], false);
            }
            // Set the switch associated with the actor's ID to true
            var actorId = actor.actorId();
            if (actorSwitches[actorId] !== undefined) {
                $gameSwitches.setValue(actorSwitches[actorId], true);
            }
        }
    };

    //=============================================================================
    // Function to Turn On Class Switch
    //=============================================================================

    var turnOnClassSwitchByIndex = function(partyIndex) {
        var actor = $gameParty.members()[partyIndex];
        if (actor) {
            for (var index in classSwitches) {
                $gameSwitches.setValue(classSwitches[index], false);
            }
            var currentClassId = actor._classId;
            if (classSwitches[currentClassId] !== undefined) {
                $gameSwitches.setValue(classSwitches[currentClassId], true);
            }
        }
    };

    //=============================================================================
    // Function to Get Active Actor ID based on the active switch
    //=============================================================================

    var getActiveActorId = function() {
        for (var actorId in actorSwitches) {
            if ($gameSwitches.value(actorSwitches[actorId])) {
                return parseInt(actorId);
            }
        }
        return undefined;
    };

    //=============================================================================
    // Function to Check if Actor has Learned a Skill
    //=============================================================================

    Game_Actor.prototype.skillsData = function() {
        var skillsData = [];
        var learnedSkills = this.skills();
        for (var i = 0; i < learnedSkills.length; i++) {
            var skillId = learnedSkills[i].id;
            var skill = $dataSkills[skillId];
            skillsData.push(skill);
        }
        return skillsData;
    };

    var hasActorLearnt = function(skillId) {
        // Retrieve actor ID based on the active switch
        var actorId = getActiveActorId();
        if (actorId !== undefined) {
            var actor = $gameActors.actor(actorId);
            if (actor) {
                var actorSkills = actor.skillsData();
                for (var i = 0; i < actorSkills.length; i++) {
                    if (actorSkills[i].id === skillId) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    //=============================================================================
    // Function to Teach Skill to Actor associated with the active switch
    //=============================================================================

    var actorLearn = function(skillId) {
        // Retrieve actor ID based on the active switch
        var actorId = getActiveActorId();
        if (actorId !== undefined) {
            var actor = $gameActors.actor(actorId);
            if (actor) {
                actor.learnSkill(skillId);
                return true;
            }
        }
        return false;
    };

    //=============================================================================
    // Function to Make Actor Forget Skill associated with the active switch
    //=============================================================================

    var actorForget = function(skillId) {
        // Retrieve actor ID based on the active switch
        var actorId = getActiveActorId();
        if (actorId !== undefined) {
            var actor = $gameActors.actor(actorId);
            if (actor) {
                actor.forgetSkill(skillId);
                return true;
            }
        }
        return false;
    };

    //=============================================================================
    // New Feature: Display Actor's Image Based on Active Switch
    //=============================================================================

    var displayActorImageBySwitch = function(event) {
        var note = event.event().note;  // Access the event's note property correctly
        if (note && note.match(/<PartyImage>/)) {
            var activeActorId = getActiveActorId();
            if (activeActorId) {
                var actor = $gameActors.actor(activeActorId);
                if (actor) {
                    var characterName = actor.characterName();
                    var characterIndex = actor.characterIndex();
                    event.setImage(characterName, characterIndex);
                }
            }
        }
    };

    //=============================================================================
    // Alias Game_Event setupPage to include new feature
    //=============================================================================

    var _Game_Event_setupPage = Game_Event.prototype.setupPage;
    Game_Event.prototype.setupPage = function() {
        _Game_Event_setupPage.call(this);
        if (this.page()) {
            displayActorImageBySwitch(this);
        }
    };

    //=============================================================================
    // Expose functions to global scope for script calls
    //=============================================================================

    window.turnOnActorSwitchByIndex = turnOnActorSwitchByIndex;
    window.turnOnClassSwitchByIndex = turnOnClassSwitchByIndex;
    window.hasActorLearnt = hasActorLearnt;
    window.actorLearn = actorLearn;
    window.actorForget = actorForget;

})();
