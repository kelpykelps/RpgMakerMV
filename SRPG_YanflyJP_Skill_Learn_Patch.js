//=============================================================================
// SRPG Engine Yanfly's JP and Skill Learn Plugin Patch
// SRPG_YanflyJP_Skill_Learn_Patch.js
//=============================================================================

/*:
 * @plugindesc SRPG Core compatibility patch for Yanfly's JP Plugin.
 * This patch allows Yanfly's JP Plugin to work with SRPG Core in map battles.
 * Requires Yanfly's Job Points (JP) Plugin, Yanfly's Skill Learn System and SRPG Core.
 * @version 1.1.0
 * @author NoobieMcNoobs (25% me 75% Ai :p)
 *
 * @param Jp Variable
 * @text JP Variable ID
 * @desc Variable ID to store JP during SRPG battles.
 * Default: 10
 * @type variable
 * @default 10
 * 
 * @help
 * This plugin patch modifies Yanfly's JP Plugin to work with SRPG Core in map
 * battles. Ensure that this plugin loads after both Yanfly's JP Plugin and SRPG
 * Core in your plugin manager.
 *
 * This plugin patch extends the functionality of Yanfly's Skill Learn System by adding additional functions to Game_Actor and Game_Party
 * prototypes. These functions allow you to retrieve information about actor ID, class ID, and skills learned by a specific actor in a
 * specific class.
 * 
 * === How to Use ===
 * 1. Make sure you have both Yanfly's Job Points (JP) Plugin and SRPG Core installed.
 * 2. Place this plugin below both Yanfly's JP Plugin and SRPG Core in the plugin manager.
 * 3. Configure the 'JP Variable ID' parameter to specify the variable where JP will be stored during SRPG battles.
 * ===Examples===
 * $gameActors.actor(1).gainJp(50);// Actor 1 gain 50 Jp in there current class.
 * $gameActors.actor(1).loseJp(50);// Actor 1 lose 50 Jp on current class.
 * $gameActors.actor(2).refundLostJp(ClassId);// Actor 2 refund points spent in specified class.
 * --------------
 * ((0 is the first party member or leader))
 * $gameParty.members()[0].gainJp(27);// Party member 0 gain 27 Jp in current class.
 * $gameParty.members()[8].loseJp(20);// Party member 8 lose 20 Jp in current class.
 * $gameParty.members()[1].refundLostJp(ClassId);// Party member 1 refund Jp spent in specified class.
 * --------------
 * //Retrieve the first party member and display their actor ID, class ID, and learned skills for the current class
 * $gameParty.members()[0].learnedSkillsForClass($gameParty.members()[0].currentClass().id); 
 * $gameParty.members()[0].skillsDataForClass($gameParty.members()[0].currentClass().id);//retrieves all skills current class has learnt.
 * $gameParty.members()[0].unlearnAllSkillsInClass($gameParty.members()[0].currentClass().id);//unlearn all skills in current class.
 */

(function() {
    var parameters = PluginManager.parameters('SRPG_YanflyJP_Skill_Learn_Patch');
    var jpVariableId = parseInt(parameters['Jp Variable']);

    // Store JP spent by each actor in their respective classes
    var jpSpentByActorAndClass = {};

    Game_Actor.prototype.gainJp = function(value, classId) {
        value = parseInt(value);
        if (isNaN(value)) value = 0;
        classId = classId || this.currentClass().id;
        value = Math.floor(value * this.jpRate());
        if ($gameParty.inBattle()) {
            if ($gameSystem.isSRPGMode() && !$gameSystem.isBattlePhase() && $gameSystem.srpgBattleActors().contains(this)) {
                $gameVariables.setValue(jpVariableId, $gameVariables.value(jpVariableId) + value);
            } else {
                this._battleJp = this._battleJp || 0;
                this._battleJp += value;
            }
        } else {
            this.setJp(this.jp(classId) + value, classId);
            if (classId === this.currentClass().id && this.isSubclassEarnJp()) {
                this.gainJpSubclass(value);
            }
            // Track JP spent by the actor in their respective class
            if (!jpSpentByActorAndClass[this.actorId()]) {
                jpSpentByActorAndClass[this.actorId()] = {};
            }
            jpSpentByActorAndClass[this.actorId()][classId] = jpSpentByActorAndClass[this.actorId()][classId] || 0;
            jpSpentByActorAndClass[this.actorId()][classId] += value;
        }
    };

    // Define a variable to store the lost JP for each actor and class
    var lostJpData = {};


    // Overwrite the loseJp function to store the lost JP
    Game_Actor.prototype.loseJp = function(value, classId) {
        classId = classId || this.currentClass().id;
        var lostJpKey = this.actorId() + '_' + classId;
        var lostJp = lostJpData[lostJpKey] || 0;
        lostJp += value;
        lostJpData[lostJpKey] = lostJp;
        this.setJp(this.jp(classId) - value, classId);
    };

    // Define a function to refund lost JP
    Game_Actor.prototype.refundLostJp = function(classId) {
        classId = classId || this.currentClass().id;
        var lostJpKey = this.actorId() + '_' + classId;
        var lostJp = lostJpData[lostJpKey] || 0;
        this.gainJp(lostJp, classId);
        lostJpData[lostJpKey] = 0;
    };

    // Define a function to access party members and perform actions on them
    function partyMemberAction(index, action) {
        var actor = $gameParty.members()[index];
        if (actor) {
            action(actor);
        }
    }

    // After refunding lost JP, call this function to update the display
    updateJpDisplay = function(actor, id) {
        // Assuming you have access to the window instance where JP is displayed
        var menuWindow = yourMenuWindowInstance; // Replace with your menu window instance
        if (menuWindow) {
            menuWindow.drawActorJp(actor, id, wx, wy, ww, align);
            // Replace wx, wy, ww, and align with appropriate values
        }
    };
    
    // Function to check if subclass earns JP
    Game_Actor.prototype.isSubclassEarnJp = function() {
        if (!Imported.YEP_X_Subclass) return false;
        if (!this.subclass()) return false;
        return Yanfly.Param.SubclassJp;
    };

    // Function to gain JP for subclass
    Game_Actor.prototype.gainJpSubclass = function(value) {
        var classId = this.subclass().id;
        value = Math.round(value * Yanfly.Param.SubclassJp);
        this.setJp(this.jp(classId) + value, classId);
    };

        // Add a function to Game_Actor to get learned skills for a specific class
    Game_Actor.prototype.learnedSkillsForClass = function(classId) {
        var skills = [];
        if (this._skills) {
            for (var i = 0; i < this._skills.length; i++) {
                var skillId = this._skills[i];
                if ($dataClasses[classId].learnSkills.contains(skillId)) {
                    skills.push(skillId);
                }
            }
        }
        return skills;
    };

    // Add a function to Game_Actor to get class ID
    Game_Actor.prototype.classId = function() {
        return this._classId;
    };

    // Add a function to Game_Actor to get actor ID
    Game_Actor.prototype.actorId = function() {
        return this._actorId;
    };

    // Add a function to Game_Party to get an actor by ID
    Game_Party.prototype.actorById = function(actorId) {
        return $gameActors.actor(actorId);
    };

    // Add a function to Game_Actor to get all learned skills
    Game_Actor.prototype.allLearnedSkills = function() {
        var skills = [];
        if (this._skills) {
            for (var i = 0; i < this._skills.length; i++) {
                var skillId = this._skills[i];
                skills.push(skillId);
            }
        }
        return skills;
    };

    // Add a function to Game_Actor to get all classes the actor has
    Game_Actor.prototype.allClasses = function() {
        return this._classId.concat(this._subclassId || []);
    };

    // Add a function to Game_Actor to get skill data for a specific class
    Game_Actor.prototype.skillsDataForClass = function(classId) {
        var skillsData = [];
        var learnedSkills = this.learnedSkillsForClass(classId);
        for (var i = 0; i < learnedSkills.length; i++) {
            var skillId = learnedSkills[i];
            var skill = $dataSkills[skillId];
            skillsData.push(skill);
        }
        return skillsData;
    };

    // Add a function to Game_Actor to unlearn all skills in a specific class
    Game_Actor.prototype.unlearnAllSkillsInClass = function(classId) {
        var learnedSkills = this.learnedSkillsForClass(classId);
        for (var i = 0; i < learnedSkills.length; i++) {
            var skillId = learnedSkills[i];
            this.forgetSkill(skillId);
        }
    };

})();

