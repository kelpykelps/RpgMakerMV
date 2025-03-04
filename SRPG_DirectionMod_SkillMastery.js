/*:
@plugindesc Adds direction correction rules to the SRPG Converter MV.
@author Anchovy-(Edited_by_NoobieMcNoobs)
credits to the whole srpg engine community for there help

@param SideAttack_Mod:HIT
@desc Side Attack: Hit rate modifier
@default 1.2

@param SideAttack_Mod:EVA
@desc Side Attack: Evasion rate modifier
@default 0.8

@param SideAttack_Mod:DMG
@desc Side Attack: Damage modifier
@default 1.2

@param BackAttack_Mod:HIT
@desc Back Attack: Hit rate modifier
@default 1.4

@param BackAttack_Mod:EVA
@desc Back Attack: Evasion rate modifier
@default 0.6

@param BackAttack_Mod:DMG
@desc Back Attack: Damage modifier
@default 1.4



@help

includes notetags for skills and states (state modifier adds to skill or plugin modifier) to define damage modifiers 
and hit modifiers
<side_dmg: X>
<back_dmg: X>
X being desired damage modification
example
<side_dmg: 1.5>//side damage will be 1.5x (150%) normal damage.
<back_dmg: 10.2>//back damage will be 10.2x (1020%) normal damage.
<side_hit: 0.8>//side hit rate will be 0.8x (80%) normal hit rate.
<back_hit: 1.3>//back hit rate will be 1.3x (130%) normal hit rate.

==((Note: these modifiers stack plugin parameters, skill note tags and state note tags.))==

-Yanflys skill mastery damage modifier-
uses note tags built into direction mod to add bonus damage based on yanflys skill mastery plugin
example: <mastery_Dmg:X> X being the bonus damage added (specify in a mumber value <mastery_Dmg:1000> adds 1000damage per skill level) 
         <mastery_Percentage_Dmg: X> X being the bonus damage percentage added (specify in a mumber value <mastery_Percentage_Dmg: 10> adds 10% damage per skill level) 

==((NOTE IF USING YANFLYS SKILL MASTERY PLUGIN YOU WILL HAVE TO COMMENT OUT OR REMOVE THE MAKE DAMAGE EVAL AS IT WILL CAUSE THE DAMAGE TO MULTIPLY TWICE))==

Rewrites the preBattleSetDirection function in Scene_Map.
Place it as high as possible (preferably directly under SRPG_core).

Modify based on the direction of attack. No modification for attacks on units of the same group.
Press the menu key on a unit to change its direction.
Skills with <srpgDirection:false> in their note will not be affected by direction.

・Update History
2017/11/16    var1.01 Minor fixes
2018/07/07    var1.02 Fixed issue causing errors when trying to change the direction of non-unit events
*/
(function(){
    // Retrieve plugin parameters
    var parameters = PluginManager.parameters('SRPG_DirectionMod_SkillMastery');
    var side_hit = Number(parameters['SideAttack_Mod:HIT']);
    var side_eva = Number(parameters['SideAttack_Mod:EVA']);
    var side_dmg = Number(parameters['SideAttack_Mod:DMG']);
    var back_hit = Number(parameters['BackAttack_Mod:HIT']);
    var back_eva = Number(parameters['BackAttack_Mod:EVA']);
    var back_dmg = Number(parameters['BackAttack_Mod:DMG']);

    
    // Initialize additional properties and methods for Game_Temp
    var _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._attackDirection = 'front';
    };
    Game_Temp.prototype.getAttackDirection = function() {
        return this._attackDirection;
    };
    Game_Temp.prototype.setAttackDirection = function(direction) {
        this._attackDirection = direction;
    };

    var _Game_Action_evalDamageFormula = Game_Action.prototype.evalDamageFormula;
    Game_Action.prototype.evalDamageFormula = function(target) {
        var value = _Game_Action_evalDamageFormula.call(this, target);
        // Check if in SRPG mode and active/target events exist
        if ($gameSystem.isSRPGMode() && $gameTemp.activeEvent() && $gameTemp.targetEvent()) {
            // Get the skill being used
            var skill = this.item();
            
            var actor = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1];
            var skillId = skill ? skill.id : 0; // Get the ID of the skill (or default to 0 if no skill is found)
            var masteryLevel = actor.skillMasteryLevel(skillId); // Get the mastery level of the skill
            console.log("actor:", actor);
            console.log("skillMasteryLevel:", masteryLevel);

            // Check if the skill has a mastery damage bonus defined
            if (masteryLevel >= 1 && skill.meta.mastery_Dmg !== undefined) {
                // Parse the mastery damage bonus from the note tag and calculate bonus damage
                var masteryDmg = parseFloat(skill.meta.mastery_Dmg);
                if (!isNaN(masteryDmg)) {
                    // Add bonus damage to the value based on mastery level
                    var bonusDmg = masteryDmg * masteryLevel;
                    value += bonusDmg;
                } else {
                    console.error("Invalid mastery_Dmg value:", skill.meta.mastery_Dmg);
                }
            }
            
            // Check if the skill has a percentage bonus damage note tag for mastery level
            if (masteryLevel >= 1 && skill.meta.mastery_Percentage_Dmg !== undefined) {
                // Parse the percentage bonus damage from the note tag and calculate bonus damage
                var percentageDmg = parseFloat(skill.meta.mastery_Percentage_Dmg);
                if (!isNaN(percentageDmg)) {
                    // Calculate bonus damage as a percentage of the original value for each mastery level
                    var bonusDmgPercentage = value * (percentageDmg / 100) * masteryLevel;
                    value += bonusDmgPercentage;
                } else {
                    console.error("Invalid mastery_Percentage_Dmg value:", skill.meta.mastery_Percentage_Dmg);
                }
            }
    
            // Get default modifiers from plugin parameters
            var sideDmg = side_dmg;
            var backDmg = back_dmg;

            // Check if the skill has note tags for side and back damage modifiers
            if (skill.meta.side_dmg !== undefined) {
                sideDmg += parseFloat(skill.meta.side_dmg_skill);
            }
            if (skill.meta.back_dmg !== undefined) {
                backDmg += parseFloat(skill.meta.back_dmg_skill);
            }

            // Check if the attacker has any states with side_dmg or back_dmg modifiers
            var attackerStates = this.subject().states();
            for (var i = 0; i < attackerStates.length; i++) {
                var state = attackerStates[i];
                if (state.meta.side_dmg !== undefined) {
                    sideDmg += parseFloat(state.meta.side_dmg_state);
                }
                if (state.meta.back_dmg !== undefined) {
                    backDmg += parseFloat(state.meta.back_dmg_state);
                }
            }
    
            // Determine attack direction
            if ($gameSystem.isSubBattlePhase() == 'battle_window') {
                decideAttackdirection();
            }
    
            // Check if attacker and target are from different groups
            if (this.subject() == $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1] &&
                $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[0] !=
                $gameSystem.EventToUnit($gameTemp.targetEvent().eventId())[0]) {
                // Apply damage modifier based on attack direction
                if ($gameTemp.getAttackDirection() == 'side') {
                    value *= sideDmg;
                } else if ($gameTemp.getAttackDirection() == 'back') {
                    value *= backDmg;
                }
            }
        }
        return value;
    };
    
    // Function to determine attack direction
    decideAttackdirection = function() {
        var differenceX = $gameTemp.activeEvent().posX() - $gameTemp.targetEvent().posX();
        var differenceY = $gameTemp.activeEvent().posY() - $gameTemp.targetEvent().posY();
        if (Math.abs(differenceX) == Math.abs(differenceY)) {
            // Determine diagonal attack direction
            if (differenceX < 0 && differenceY < 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(2);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(6);
                        break;
                }
            }
            // Determine diagonal attack direction
            if (differenceX > 0 && differenceY < 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(2);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(4);
                        break;
                }
            }
            // Determine diagonal attack direction
            if (differenceX < 0 && differenceY > 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(8);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(6);
                        break;
                }
            }
            // Determine diagonal attack direction
            if (differenceX > 0 && differenceY > 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(8);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(4);
                        break;
                }
            }
        } else {
            // Determine non-diagonal attack direction
            if (Math.abs(differenceX) > Math.abs(differenceY)) {
                if (differenceX < 0) {
                    $gameTemp.activeEvent().setDirection(6);
                } else if (differenceX > 0) {
                    $gameTemp.activeEvent().setDirection(4);
                }
            } else {
                if (differenceY < 0) {
                    $gameTemp.activeEvent().setDirection(2);
                } else if (differenceY > 0) {
                    $gameTemp.activeEvent().setDirection(8);
                }
            }
        }
        var direction = 'side';
        // Determine attack direction based on active and target event directions
        switch ($gameTemp.targetEvent().direction()) {
            case 2:
                switch ($gameTemp.activeEvent().direction()) {
                    case 2:
                        direction = 'back';
                        break;
                    case 8:
                        direction = 'front';
                        break;
                }
                break;
            case 4:
                switch ($gameTemp.activeEvent().direction()) {
                    case 4:
                        direction = 'back';
                        break;
                    case 6:
                        direction = 'front';
                        break;
                }
                break;
            case 6:
                switch ($gameTemp.activeEvent().direction()) {
                    case 4:
                        direction = 'front';
                        break;
                    case 6:
                        direction = 'back';
                        break;
                }
                break;
            case 8:
                switch ($gameTemp.activeEvent().direction()) {
                    case 2:
                        direction = 'front';
                        break;
                    case 8:
                        direction = 'back';
                        break;
                }
                break;
        }
        // Check if the skill ignores direction modifier
        var battlerArray = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId());
        var skill = battlerArray[1].action(0).item();
        if (skill.meta.srpgDirection) {
            if (skill.meta.srpgDirection == 'false') {
                direction = 'front';
            }
        }
        // Set the attack direction
        $gameTemp.setAttackDirection(direction);
    };
    
    var _Game_Action_itemHit = Game_Action.prototype.itemHit;
    Game_Action.prototype.itemHit = function(target) {
        var value = _Game_Action_itemHit.call(this, target);
        // Check if in SRPG mode and active/target events exist
        if ($gameSystem.isSRPGMode() && $gameTemp.activeEvent() && $gameTemp.targetEvent()) {
            // Get the skill being used
            var skill = this.item();
            // Get default hit rate modifiers from plugin parameters
            var sideHit = side_hit;
            var backHit = back_hit;
            // Check if the skill has note tags for hit rate modifiers
            if (skill.meta.side_hit !== undefined) {
                sideHit += parseFloat(skill.meta.side_hit_skill);
            }
            if (skill.meta.back_hit !== undefined) {
                backHit += parseFloat(skill.meta.back_hit_skill);
            }
            var attackerStates = this.subject().states();
            for (var i = 0; i < attackerStates.length; i++) {
                var state = attackerStates[i];
                if (state.meta.side_hit !== undefined) {
                    sideHit += parseFloat(state.meta.side_hit_state);
                }
                if (state.meta.back_dmg !== undefined) {
                    backHit += parseFloat(state.meta.back_hit_state);
                }
            }
            // Check if attacker and target are from different groups
            if (this.subject() == $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1] &&
                $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[0] !=
                $gameSystem.EventToUnit($gameTemp.targetEvent().eventId())[0]) {
                // Apply hit rate modifier based on attack direction
                if ($gameTemp.getAttackDirection() == 'side') {
                    value *= sideHit;
                } else if ($gameTemp.getAttackDirection() == 'back') {
                    value *= backHit;
                }
            }
        }
        return value;
    };
    
    
    var _Game_Action_itemEva = Game_Action.prototype.itemEva;
    Game_Action.prototype.itemEva = function(target) {
        var value = _Game_Action_itemEva.call(this, target);
        // Check if in SRPG mode and active/target events exist
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameTemp.activeEvent() && $gameTemp.targetEvent()) {
                // Check if attacker and target are from different groups
                if (this.subject() == $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1] &&
                    $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[0] !=
                    $gameSystem.EventToUnit($gameTemp.targetEvent().eventId())[0]) {
                    // Apply evasion rate modifier based on attack direction
                    if ($gameTemp.getAttackDirection() == 'side') {
                        value *= side_eva;
                    } else if ($gameTemp.getAttackDirection() == 'back') {
                        value *= back_eva;
                    }
                    // If the hit rate is 100% or more, set the target's evasion rate to 0
                    var hitRate = this.itemHit();
                    if (hitRate >= 1.0) {
                        value = 0;
                        console.log("Eva rate adjusted for guaranteed hit:", value);
                    }
                  
                }
            }
        }
        console.log("Eva rate for hit:", value);
        return value;
    };
    
    var _Scene_Map_preBattleSetDirection = Scene_Map.prototype.preBattleSetDirection;
    Scene_Map.prototype.preBattleSetDirection = function() {
        var differenceX = $gameTemp.activeEvent().posX() - $gameTemp.targetEvent().posX();
        var differenceY = $gameTemp.activeEvent().posY() - $gameTemp.targetEvent().posY();
        if (Math.abs(differenceX) == Math.abs(differenceY)) {
            if (differenceX < 0 && differenceY < 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(2);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(6);
                        break;
                }
            }
            if (differenceX > 0 && differenceY < 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(2);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(4);
                        break;
                }
            }
            if (differenceX < 0 && differenceY > 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(8);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(6);
                        break;
                }
            }
            if (differenceX > 0 && differenceY > 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(8);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(4);
                        break;
                }
            }
        } else {
            if (Math.abs(differenceX) > Math.abs(differenceY)) {
                if (differenceX < 0) {
                    $gameTemp.activeEvent().setDirection(6);
                } else if (differenceX > 0) {
                    $gameTemp.activeEvent().setDirection(4);
                }
            } else {
                if (differenceY < 0) {
                    $gameTemp.activeEvent().setDirection(2);
                } else if (differenceY > 0) {
                    $gameTemp.activeEvent().setDirection(8);
                }
            }
        }
        var direction = 'side';
        switch ($gameTemp.targetEvent().direction()) {
            case 2:
                switch ($gameTemp.activeEvent().direction()) {
                    case 2:
                        direction = 'back';
                        break;
                    case 8:
                        direction = 'front';
                        break;
                }
                break;
            case 4:
                switch ($gameTemp.activeEvent().direction()) {
                    case 4:
                        direction = 'back';
                        break;
                    case 6:
                        direction = 'front';
                        break;
                }
                break;
            case 6:
                switch ($gameTemp.activeEvent().direction()) {
                    case 4:
                        direction = 'front';
                        break;
                    case 6:
                        direction = 'back';
                        break;
                }
                break;
            case 8:
                switch ($gameTemp.activeEvent().direction()) {
                    case 2:
                        direction = 'front';
                        break;
                    case 8:
                        direction = 'back';
                        break;
                }
                break;
        }
        var battlerArray = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId());
        var skill = battlerArray[1].action(0).item();
        if (skill.meta.srpgDirection) {
            if (skill.meta.srpgDirection == 'false') {
                direction = 'front';
            }
        }
        $gameTemp.setAttackDirection(direction);
        switch ($gameTemp.activeEvent().direction()) {
            case 2:
                $gameTemp.targetEvent().setDirection(8);
                break;
            case 4:
                $gameTemp.targetEvent().setDirection(6);
                break;
            case 6:
                $gameTemp.targetEvent().setDirection(4);
                break;
            case 8:
                $gameTemp.targetEvent().setDirection(2);
                break;
        }
    };

    
    // Rewrite updateCallMenu method in Scene_Map
    var _SceneMap_updateCallMenu = Scene_Map.prototype.updateCallMenu;
    Scene_Map.prototype.updateCallMenu = function() {
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameSystem.srpgWaitMoving() == true ||
                $gameTemp.isAutoMoveDestinationValid() == true) {
                _SceneMap_updateCallMenu.call(this);
            } else if ($gameSystem.isSubBattlePhase() === 'normal') {
                if (this.isMenuCalled()) {
                    var callmenu = true;
                    var events = $gameMap.eventsXyNt($gamePlayer.x, $gamePlayer.y);
                    events.forEach(function(event){
                        var battlerArray = $gameSystem.EventToUnit(event.eventId());
                        if (battlerArray && battlerArray[0] === 'actor') {
                            var battler = battlerArray[1];
                            if (battler.isAppeared() && !battler.isRestricted() && !battler.isAutoBattle()) {
                                SoundManager.playCursor();
                                event.turnRight90();
                                callmenu = false;
                            }
                        }
                    });
                    if (callmenu) {
                        _SceneMap_updateCallMenu.call(this);
                    }
                }
            } else {
                _SceneMap_updateCallMenu.call(this);
            }
        } else {
            _SceneMap_updateCallMenu.call(this);
        }
    };
    
    // Call original srpgBattlerDeadAfterBattle method in Scene_Map and reset attack direction
    var _Scene_Map_srpgBattlerDeadAfterBattle = Scene_Map.prototype.srpgBattlerDeadAfterBattle;
    Scene_Map.prototype.srpgBattlerDeadAfterBattle = function() {
        _Scene_Map_srpgBattlerDeadAfterBattle.call(this);
        $gameTemp.setAttackDirection('front');
    };
})();
