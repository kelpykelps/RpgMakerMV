//=============================================================================
// SRPG Trap & Movement Plugin
// Author: NoobieMcNoobs
// Version: 1.0
//=============================================================================

/*:
 * @plugindesc v1.0 Extends SRPG Core 1.34+Q with trap events, floor damage, dynamic movement overrides, cancel logic & compatibility fixes.
 * @author NoobieMcNoobs - (ChatGPT)
 *
 * @help
 * ----------------------------------------------------------------------------
 * DESCRIPTION
 * ----------------------------------------------------------------------------
 * This all‑in‑one plugin adds:
 *   • **Trap Events**: Stepping on event triggers a skill via <TrapEvent:x> and  
 *     uses class/level from <TrapStats:a,b>.
 *   • **Floor Damage**: Region‑based effects via map notes  
 *     `<FloorSkillX:x>` and `<FloorStatsX:a,b>`, optional `<FloorTriggerOnNoTriggerX>`.
 *   • **NoTrigger State**: Use `<NoTrigger>` on states to skip traps/floor or  
 *     require it via `<FloorTriggerOnNoTriggerX>`.
 *   • **Team Restriction**: `<TriggerTeam:Actor>` or `<TriggerTeam:Enemy>` on  
 *     trap/floor note to restrict to actors or enemies.
 *   • **Movement Overrides**: Custom `srpgMove()` for actors & enemies reading  
 *     meta tags (srpgMove, srpgMovePlus, tempMoveRange) and equipment.
 *   • **Terrain Costs**: Calculates move distance with terrain tags 4 (cost 2)  
 *     and 5 (cost 3).
 *   • **Temporary Move Range**: Stores and restores remaining movement after  
 *     cancel or trap stop, resets at turn end.
 *   • **Cancel Handling**: Improved cancel in `actor_move`, `actor_target`, and  
 *     `status_window` phases, with correct move/range table rebuild.
 *   • **Compatibility Patches**: Defensive initialization of MoveTable/RangeTable,  
 *     LoS support in `makeRangeTable`, pageup/pagedown actor cycling.
 *
 * ----------------------------------------------------------------------------
 * INSTALLATION
 * ----------------------------------------------------------------------------
 * 1. Place below **SRPG Core 1.34+Q** in the Plugin Manager.
 * 2. No parameters—configure entirely via note tags.
 *
 * ----------------------------------------------------------------------------
 * NOTE TAGS
 * ----------------------------------------------------------------------------
 * Event Note Tags:
 *   <TrapEvent:x>         # Skill ID to trigger
 *   <TrapStats:a,b>       # Class ID, Level for simulated battler
 *   <NoTrigger>           # State tag to prevent triggering
 *   <TriggerTeam:Actor>   # Only actors trigger
 *   <TriggerTeam:Enemy>   # Only enemies trigger
 *
 * Map Note Tags:
 *   <FloorSkillX:x>             # Skill ID for region X
 *   <FloorStatsX:a,b>           # Class ID, Level for region X
 *   <FloorTriggerOnNoTriggerX>  # Only units with <NoTrigger> trigger
 *
 * ----------------------------------------------------------------------------
 * USAGE EXAMPLES
 * ----------------------------------------------------------------------------
 * 1. **Trap**:  
 *    Event note: `<TrapEvent:10><TrapStats:2,5><TriggerTeam:Enemy>`  
 *    — Enemy stepping on it takes Skill #10 damage from a Level‑5 Class‑2 battler.
 *
 * 2. **Floor Damage** (region 3):  
 *    Map note: `<FloorSkill3:5><FloorStats3:1,3><FloorTriggerOnNoTrigger3>`  
 *    — Region 3 applies Skill #5 from a Level‑3 Class‑1 battler, only if unit has `<NoTrigger>`.
 *
 * ----------------------------------------------------------------------------
 * TERMS OF USE
 * ----------------------------------------------------------------------------
 * Free for commercial or non‑commercial projects. Credit not required.
 */

(function() {

//=============================================================================
//---Traps_Data---
//=============================================================================

    let lastTriggeredTrap = null; // Track the last triggered trap to prevent duplicate effects
    let lastTriggeredFloorTile = null; // Track the last triggered floor tile to prevent duplicate effects
    let lastTileKey = null; // Track the last tile the unit was on
    let startingPosition = null; // Track the starting position of the selected unit
    let alreadyCheckedTile = false; // Tracks whether the current tile has been processed



    if (!Scene_Map.prototype._originalEnemyMove) {
        Scene_Map.prototype._originalEnemyMove = Scene_Map.prototype.srpgInvokeEnemyMove;
    }
    if (!Scene_Map.prototype._originalAutoUnitAction) {
        Scene_Map.prototype._originalAutoUnitAction = Scene_Map.prototype.srpgInvokeAutoUnitAction;
    }
    // (Optionally, if your SRPG Core has an actor movement function, save it too.)
    if (Scene_Map.prototype.srpgInvokeActorMove && !Scene_Map.prototype._originalActorMove) {
        Scene_Map.prototype._originalActorMove = Scene_Map.prototype.srpgInvokeActorMove;
    }

//=============================================================================
//---Traps---
//=============================================================================

    /**
     * Retrieve a value from an event's comments based on the trap ID.
     * @param {number} eventId - ID of the event to check.
     * @param {string} tagName - The tag to parse (e.g., "TrapEvent", "TrapStats").
     * @returns {string|null} The parsed value from the comments, or null if not found.
     */
    function getTrapNoteValue(eventId, tagName) {
        const event = $gameMap.event(eventId);
        if (!event) return null;
    
        const match = event.event().note.match(new RegExp(`<${tagName}:(.+?)>`));
        return match ? match[1] : null;
    }
    
    /**
     * Retrieve a value from the map's note tags for floor damage.
     * @param {number} regionId - ID of the region to check.
     * @param {string} tagName - The note tag to parse (e.g., "FloorSkill", "FloorStats").
     * @returns {string|null} The parsed value from the note tag, or null if not found.
     */
    function getFloorNoteValue(regionId, tagName) {
        const mapNotes = $dataMap.note || ''; // Get the map's note tags
        const match = mapNotes.match(new RegExp(`<${tagName}${regionId}:(.+?)>`));
        return match ? match[1] : null;
    }

    /**
     * Create a temporary battler for the trap using a specific class and level.
     * @param {number} classId - ID of the class to use.
     * @param {number} level - Level of the trap's simulated battler.
     * @returns {Game_Actor} A temporary battler with the specified class and level.
     */
    function createTrapBattler(classId, level) {
        const trapActorId = 1; // Use the first actor slot as a template (or create a dummy actor).
        const trapActor = new Game_Actor(trapActorId);
        trapActor.changeClass(classId, false);
        trapActor.changeLevel(level);

        console.log(`Trap Battler Created: Class=${classId}, Level=${level}`);
        console.log(`Atk=${trapActor.atk}, Mat=${trapActor.mat}`);
        return trapActor;
    }

    /**
     * Check if a battler has a state that prevents triggering traps or floor damage.
     * @param {Game_Battler} battler - The battler to check.
     * @returns {boolean} True if the battler has a "NoTrigger" state, false otherwise.
     */
    function hasNoTriggerState(battler) {
        if (!battler) return false;

        return battler.states().some(state => {
            return state.note.match(/<NoTrigger>/);
        });
    }

    /**
     * Check if a specific region triggers only for units with "NoTrigger" state.
     * @param {number} regionId - The region ID to check.
     * @returns {boolean} True if the region requires "NoTrigger" state, false otherwise.
     */
    function shouldTriggerOnNoTrigger(regionId) {
        const mapNotes = $dataMap.note || '';
        const match = mapNotes.match(new RegExp(`<FloorTriggerOnNoTrigger${regionId}>`));
        return !!match; // Returns true if the tag exists for the specified region
    }

    /**
     * Check if a trap or floor damage should trigger based on team.
     * @param {string|null} note - The note to check for team-specific triggering.
     * @param {Game_Battler} battler - The battler to check (actor or enemy).
     * @returns {boolean} True if the trap or floor damage should trigger, false otherwise.
     */
    function shouldTriggerForTeam(dataSource, battler) {
        if (!dataSource) return true; // Default: triggers for both teams if no tag is set.
    
        const match = dataSource.match(/<TriggerTeam:(Actor|Enemy)>/);
        if (!match) return true; // No specific team restriction.
    
        const team = match[1];
        if (team === "Actor" && battler.isActor()) return true;
        if (team === "Enemy" && battler.isEnemy()) return true;
    
        return false; // Doesn't match the specified team.
    }
//======================================================================================
//---Movement overRide---
//======================================================================================
    Game_Battler.prototype.srpgMove = function() {
        // If movement is overridden (e.g., restricted state), return that value.
        if (this._srpgMoveOverride !== undefined) return this._srpgMoveOverride;

        let n = this.traitObjects().reduce((r, trait) => 
            r + (trait.meta.srpgMove ? Number(trait.meta.srpgMove) : 0), 0);

        // If unit has a state with <restrict:true>, movement is 0.
        if (this.states().some(state => state.meta.restrict === "true")) {
            return 0;
        }

        return Math.max(n, 0); // Ensure movement is never negative.
    };

//======================================================================================
//---TRAP TRIGGER---
//======================================================================================

    /**
     * Trigger the trap event and apply skill effects, with support for stopping movement and ending the unit's turn.
     * @param {number} trapEventId - ID of the trap event.
     * @param {number} activeUnitId - ID of the active unit triggering the trap.
     * @param {number} skillId - ID of the skill to apply.
     */
    function triggerTrap(trapEventId, activeUnitId, skillId) {
        console.log(`Trap triggered by active unit at event ID: ${trapEventId}, using skill ID: ${skillId}`);

        // Get active event and battler
        const activeEvent = $gameMap.event(activeUnitId);
        if (!activeEvent) return console.error("Active event does not exist.");

        const battlerArray = $gameSystem.EventToUnit(activeUnitId);
        const targetBattler = battlerArray ? battlerArray[1] : null;
        if (!targetBattler) return console.error("Active unit does not have a battler.");

        const trapEvent = $gameMap.event(trapEventId);
        if (!trapEvent) return console.error("Trap event does not exist.");
        
        const trapNote = trapEvent.event().note;

        // Team and NoTrigger state checks
        if (!shouldTriggerForTeam(trapNote, targetBattler) || 
            (shouldTriggerOnNoTrigger(trapNote) ? !hasNoTriggerState(targetBattler) : hasNoTriggerState(targetBattler))) {
            return console.log("Trap skipped due to team or NoTrigger state restrictions.");
        }

        // Ensure single activation per trap
        if (lastTriggeredTrap === trapEventId) {
            return console.log("Trap effect already applied for this activation.");
        }

        // Retrieve TrapStats
        const trapStats = getTrapNoteValue(trapEventId, 'TrapStats');
        if (!trapStats) return console.error("TrapStats note tag missing or invalid.");

        const [classId, level] = trapStats.split(',').map(Number);
        if (!classId || !level) return console.error("Invalid class or level specified in TrapStats.");

        // Create simulated trap battler and apply skill
        const trapBattler = createTrapBattler(classId, level);
        const action = new Game_Action(trapBattler);
        action.setSkill(skillId);
        action.apply(targetBattler);

        // Play animation and show results
        activeEvent.requestAnimation($dataSkills[skillId].animationId);
        targetBattler.srpgShowResults();

        const result = targetBattler.result();
        if (result.isHit()) {
            console.log("Skill hit the target.", `Damage dealt: ${result.hpDamage}`);
            if (result.addedStates.length > 0) console.log(`States added: ${result.addedStates.join(", ")}`);

            if (targetBattler.hp <= 0) {
                console.log("Unit killed by trap. Simulating after_battle phase.");
                $gameSystem.setSubBattlePhase('after_battle');
            }
        } else {
            console.log("Skill missed the target.");
        }

        // Handle <EndTurnOnTrigger> note
        if (trapNote.includes('<EndTurnOnTrigger>')) {
            console.log("Trap has <EndTurnOnTrigger> note tag. Ending unit's turn.");
            activeEvent._srpgForceRoute = [];
            $gameSystem.setSrpgWaitMoving(false);
            $gameSystem.setSubBattlePhase('after_battle');
            lastTriggeredTrap = trapEventId;
            return;
        }
    }
              
//======================================================================================
//---FLOOR DAMAGE TRIGGER---
//======================================================================================

    /**
     * Trigger floor damage based on region ID and apply skill effects.
     * @param {number} regionId - The ID of the region triggering the floor effect.
     * @param {number} activeUnitId - The ID of the active unit stepping on the region.
     * @param {number} x - The X-coordinate of the tile.
     * @param {number} y - The Y-coordinate of the tile.
     */
    function triggerFloorDamage(regionId, activeUnitId, x, y) {
        const tileKey = `${x},${y}`; // Unique key for the current tile
    
        // Prevent triggering the same tile multiple times in a single move
        if (lastTriggeredFloorTile === tileKey) {
            console.log(`Floor damage already applied for tile (${x}, ${y}).`);
            return;
        }
    
        console.log(`Floor damage triggered by active unit at tile (${x}, ${y}) with region ID: ${regionId}`);
    
        const activeEvent = $gameMap.event(activeUnitId);
        if (!activeEvent) {
            console.error("Active event does not exist.");
            return;
        }
    
        const targetBattler = $gameSystem.EventToUnit(activeUnitId) ? $gameSystem.EventToUnit(activeUnitId)[1] : null;
        if (!targetBattler) {
            console.error("Active unit does not have a battler.");
            return;
        }
    
        // Check if the region explicitly allows "NoTrigger" units via FloorTriggerOnNoTriggerX
        if (shouldTriggerOnNoTrigger(regionId)) {
            // If the region has <FloorTriggerOnNoTrigger>, allow triggering only for NoTrigger units
            if (!hasNoTriggerState(targetBattler)) {
                console.log(`Floor damage skipped: Region ${regionId} requires 'NoTrigger' state.`);
                return;
            }
        } else {
            // If the region does NOT allow "NoTrigger", skip those units entirely
            if (hasNoTriggerState(targetBattler)) {
                console.log(`Floor damage skipped: Unit with 'NoTrigger' state is not allowed in region ${regionId}.`);
                return;
            }
        }
    
        // Check for team restrictions
        const floorNote = getFloorNoteValue(regionId, 'FloorSkill');
        if (!shouldTriggerForTeam(floorNote, targetBattler)) {
            console.log(`Floor damage skipped: Unit does not match team restriction (${floorNote}).`);
            return;
        }
    
        // Get class and level for the region
        const floorStats = getFloorNoteValue(regionId, 'FloorStats');
        if (!floorStats) {
            console.error("FloorStats note tag missing or invalid.");
            return;
        }
        const [classId, level] = floorStats.split(',').map(Number);
        if (!classId || !level) {
            console.error("Invalid class or level specified in FloorStats.");
            return;
        }
    
        // Get skill ID for the region
        const skillId = getFloorNoteValue(regionId, 'FloorSkill');
        if (!skillId) {
            console.error("FloorSkill note tag missing or invalid.");
            return;
        }
    
        // Create a simulated battler for the floor damage
        const floorBattler = createTrapBattler(classId, level);
    
        // Apply the skill effects using the simulated battler
        const action = new Game_Action(floorBattler);
        action.setSkill(skillId);
        console.log(`Applying skill ID: ${skillId} to active unit.`);
        action.apply(targetBattler);
    
        // Play the skill animation
        const animationId = $dataSkills[skillId].animationId;
        activeEvent.requestAnimation(animationId);
        targetBattler.srpgShowResults();
    
        // Log the results
        const result = targetBattler.result();
        if (result.isHit()) {
            console.log("Floor damage hit the target.");
            console.log(`Damage dealt: ${result.hpDamage}`);
            if (result.addedStates.length > 0) {
                console.log(`States added: ${result.addedStates.join(", ")}`);
            }
    
            // If HP is <= 0, simulate the 'after_battle' phase
            if (targetBattler.hp <= 0) {
                console.log("Unit killed by floor damage. Simulating after_battle phase.");
                $gameSystem.setSubBattlePhase('after_battle');
            }
        } else {
            console.log("Floor damage skill missed.");
        }
    
        // Mark the tile as triggered for this activation
        lastTriggeredFloorTile = tileKey;
    }                  

    /**
     * Track the movement of an active event and handle traps or floor effects.
     * @param {number} activeUnitId - ID of the active unit.
     */
    function trackMovement(activeUnitId) {
        const activeEvent = $gameMap.event(activeUnitId);
        if (!activeEvent) return;

        // Cache position and region data
        const currentX = activeEvent.x;
        const currentY = activeEvent.y;
        const currentTileKey = `${currentX},${currentY}`;
        const regionId = $gameMap.regionId(currentX, currentY);

        // Skip processing if at starting position or if already checked
        if (startingPosition === currentTileKey || (alreadyCheckedTile && lastTileKey === currentTileKey)) {
            return;
        }

        // Update tracking variables
        alreadyCheckedTile = true;
        lastTileKey = currentTileKey;

        // Trigger floor damage if applicable
        const floorSkill = getFloorNoteValue(regionId, 'FloorSkill');
        if (floorSkill) {
            triggerFloorDamage(regionId, activeUnitId, currentX, currentY);
        }

        // Collect trap events and their positions
        const trapEvents = $gameMap.events().filter(event => getTrapNoteValue(event.eventId(), 'TrapEvent'));

        // Check for trap activation
        for (const trapEvent of trapEvents) {
            const trapX = trapEvent.x;
            const trapY = trapEvent.y;

            if (currentX === trapX && currentY === trapY) {
                const trapEventId = trapEvent.eventId();
                const skillId = getTrapNoteValue(trapEventId, 'TrapEvent');
                if (skillId) {
                    triggerTrap(trapEventId, activeUnitId, skillId);
                }
            }
        }
    }        

    /**
     * Reset the trap activation tracker when the active unit moves.
     */
    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function (sceneActive) {
        _Game_Map_update.call(this, sceneActive);

        const activeEvent = $gameTemp.activeEvent();
        if (activeEvent) {
            const activeUnitId = activeEvent.eventId();

            // Track the starting position of the active unit
            if (!startingPosition) {
                startingPosition = `${activeEvent.x},${activeEvent.y}`;
                console.log(`Starting position set to (${activeEvent.x}, ${activeEvent.y}).`);
            }

            // Check if the unit has moved to a new tile
            const currentTileKey = `${activeEvent.x},${activeEvent.y}`;
            if (lastTileKey !== currentTileKey) {
                alreadyCheckedTile = false; // Reset the flag if the unit moves
            }

            // Process movement tracking
            trackMovement(activeUnitId);
        } else {
            // Reset trackers when no active unit is moving
            startingPosition = null; // Reset starting position
            lastTriggeredTrap = null;
            lastTriggeredFloorTile = null;
            alreadyCheckedTile = false; // Reset flag when turn ends
        }
    };

    window.setEnemyStopFlag = function(flag) {
        EnemyStop = flag;
    };


//=============================================================================

    // Extend $gameTemp to store the actor's position
    // Retrieve the original position, synchronized with the stored position
    Game_Temp.prototype.originalPos = function() {
        return this._OriginalPos || { x: 0, y: 0 }; // Default to (0, 0) if not set
    };
    
    Game_Temp.prototype.reserveOriginalPos = function(x, y) {
        this._OriginalPos = { x: x, y: y }; // Set the original position explicitly
        console.log(`Reserved Original Position: (${x}, ${y})`);
    };
    
    Game_Temp.prototype.setActorMovePosition = function(x, y) {
        this._actorMovePosition = { x: x, y: y }; // Set the move position explicitly
        console.log(`Set Actor Move Position: (${x}, ${y})`);
    };
    
    Game_Temp.prototype.getActorMovePosition = function() {
        return this._actorMovePosition || { x: 0, y: 0 }; // Default to (0, 0) if not set
    };

//=============================================================================

    Game_Actor.prototype.srpgMove = function() {
        // If the actor has a state with <restrict:true>, force movement to 0.
        if (this.states().some(state => state.meta.restrict === "true")) {
            return 0;
        }

        // Get base movement from the actor's metadata or use the default move.
        let n = this.actor().meta.srpgMove ? Number(this.actor().meta.srpgMove) : _defaultMove;

        // Add the current class's srpgMovePlus, if it exists.
        if (this.currentClass().meta.srpgMovePlus) {
            n += Number(this.currentClass().meta.srpgMovePlus);
        }

        // Process states for extra modifiers.
        this.states().forEach(state => {
            if (state.meta.srpgMovePlus) {
                n += Number(state.meta.srpgMovePlus);
            }
            if (state.meta.tempMoveRange) {
                n += Number(state.meta.tempMoveRange);
            }
            if (state.meta.srpgMove) {
                n += Number(state.meta.srpgMove);
            }
        });

        // Process equipped items.
        this.equips().forEach(item => {
            if (item && item.meta.srpgMovePlus) {
                n += Number(item.meta.srpgMovePlus);
            }
        });

        // Prevent a negative move value.
        return Math.max(n, 0);
    };

    Game_Enemy.prototype.srpgMove = function() {
        // If the actor has a state with <restrict:true>, force movement to 0.
        if (this.states().some(state => state.meta.restrict === "true")) {
            return 0;
        }

        // Get base movement from the actor's metadata or fallback to _defaultMove
        let n = this.enemy().meta.srpgMove ? Number(this.actor().meta.srpgMove) : _defaultMove;

        // Adjust move based on the current class's srpgMovePlus, if it exists
        if (this.currentClass().meta.srpgMovePlus) {
            n += Number(this.currentClass().meta.srpgMovePlus);
        }

        // Adjust move based on states
        this.states().forEach(state => {
            if (state.meta.srpgMovePlus) {
                n += Number(state.meta.srpgMovePlus);
            }
            if (state.meta.srpgMove) {
                n += Number(state.meta.srpgMove);
            }
        });

        // Adjust move based on equipped items
        this.equips().forEach(item => {
            if (item && item.meta.srpgMovePlus) {
                n += Number(item.meta.srpgMovePlus);
            }
        });

        // Ensure non-negative move value
        return Math.max(n, 0);
    };

//=============================================================================

    Game_System.prototype.exitStatusWindow = function() {
        // Step 1: Clear all necessary data
        $gameTemp.clearActiveEvent();
        $gameTemp.clearMoveTable();
        $gameTemp.clearRoute();
        this.clearSrpgStatusWindowNeedRefresh();
    
        // Step 2: Clear and close the status window UI
        if (SceneManager._scene._mapSrpgStatusWindow && SceneManager._scene._mapSrpgStatusWindow.isOpen()) {
            SceneManager._scene._mapSrpgStatusWindow.clearBattler();
            SceneManager._scene._mapSrpgStatusWindow.close();
        }
    
        // Step 3: Delay the phase transition
        setTimeout(() => {
            this.setSubBattlePhase('normal'); // Transition to normal phase
            console.log("Transitioned to normal phase after exiting status window.");
        }, 200); // Delay of 200ms
    };
        

    var _SRPG_Game_Player_triggerAction = Game_Player.prototype.triggerAction;
    Game_Player.prototype.triggerAction = function() {
        if ($gameSystem.isSRPGMode() === true) {
            // Handle cancel input during the status_window phase
            if ($gameSystem.isSubBattlePhase() === 'status_window') {
                if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
                    SoundManager.playCancel();
                    $gameSystem.exitStatusWindow(); // Call the custom function
                    return true; // Prevent further processing
                }
            }

            // Other logic remains unchanged
            if (
                $gameSystem.srpgWaitMoving() === true ||
                $gameTemp.isAutoMoveDestinationValid() === true ||
                ['status_window', 'actor_command_window', 'battle_window'].includes($gameSystem.isSubBattlePhase()) ||
                $gameSystem.isBattlePhase() !== 'actor_phase'
            ) {
                this.menuCalling = false;
                return;
            }

            if ($gameSystem.isSubBattlePhase() === 'actor_move') {
                if (Input.isTriggered('ok') || TouchInput.isTriggered()) {
                    const moveList = $gameTemp.moveList();
                    for (let i = 0; i < moveList.length; i++) {
                        const pos = moveList[i];
                        if (pos[2] === false && pos[0] === this._x && pos[1] === this._y) {
                            if ($gameSystem.areTheyNoUnits(this._x, this._y, 'actor')) {
                                SoundManager.playOk();
                                const event = $gameTemp.activeEvent();
                                const route = $gameTemp.MoveTable(pos[0], pos[1])[1];
                                if (route && route.length > 0) {
                                    $gameSystem.setSrpgWaitMoving(true);
                                    event.srpgMoveRouteForce(route);
                                    $gameTemp.setActorMovePosition(pos[0], pos[1]);
                                    const distanceMoved = $gameTemp.getActorMoveDistance();
                                    const battlerArray = $gameSystem.EventToUnit(event.eventId());
                                    const remainingMoves = battlerArray[1].srpgMove() - distanceMoved;
                                    $gameTemp._tempRemainingMoves = Math.max(0, remainingMoves);
                                    $gameTemp.reserveOriginalPos(pos[0], pos[1]);
                                    battlerArray[1].srpgMakeNewActions();
                                    $gameSystem.setSrpgActorCommandWindowNeedRefresh(battlerArray);
                                    $gameSystem.setSubBattlePhase('actor_command_window');
                                }
                                return true;
                            } else {
                                SoundManager.playBuzzer();
                            }
                        }
                    }
                }
                return false;
            }

            return _SRPG_Game_Player_triggerAction.call(this);
        }

        return _SRPG_Game_Player_triggerAction.call(this);
    };

    // Function to check if the target position is valid based on the move table
    isMovePositionValid = function (targetX, targetY) {
        var list = $gameTemp.moveList();  // Get the list of valid positions from the move table
        for (var i = 0; i < list.length; i++) {
            var pos = list[i];
            if (pos[0] === targetX && pos[1] === targetY) {
                return true;  // Target position is valid
            }
        }
        return false;  // Target position is not valid
    }
    
    // Store the position of the player
    setPlayerPosition = function (x, y) {
        $gameTemp.setActorMovePosition(x, y);
    }

    // Retrieve the stored position
    getPlayerPosition = function () {
        return $gameTemp.getActorMovePosition();
    }

    Scene_Map.prototype.selectPreviousActorCommand = function() {
        var event = $gameTemp.activeEvent();
        
        // Get the battler from the event
        var battlerArray = $gameSystem.EventToUnit(event.eventId());
        var actor = battlerArray[1];
        
        // If the actor was locked by a trap (<stopOnTrigger>),
        // use the trap's current coordinates rather than the previously stored move position.
        var storedPos;
        if (actor._temporaryMovementLock) {
            storedPos = { x: event.x, y: event.y };
        } else {
            storedPos = $gameTemp.getActorMovePosition();
        }
        
        var originalPos = $gameTemp.originalPos();
        
        // Retrieve pre-calculated remaining moves from $gameTemp
        const preCalculatedMoves = $gameTemp._tempRemainingMoves || 0;
        console.log(`Pre-Calculated Remaining Moves: ${preCalculatedMoves}`);
        
        // Dynamically update the actor's temporary move range to the remaining moves
        actor.setTemporaryMoveRange(preCalculatedMoves);
        console.log(`Stored Position: ${storedPos.x}, ${storedPos.y}`);
        console.log(`Original Position: ${originalPos.x}, ${originalPos.y}`);
        
        // If storedPos differs from originalPos, update the original position to the new one.
        if (storedPos.x !== originalPos.x || storedPos.y !== originalPos.y) {
            $gameTemp.reserveOriginalPos(storedPos.x, storedPos.y);
            console.log(`Move Table Updated: ${storedPos.x}, ${storedPos.y}`);
        }
        
        // Move the event to the stored position (i.e. the trap's position)
        event.locate(storedPos.x, storedPos.y);
        
        // Clear movement tables and routes and the active event
        $gameTemp.clearMoveTable();
        $gameTemp.clearRoute();
        $gameTemp.clearActiveEvent();
        
        // Update the SRPG phase to 'normal'
        $gameSystem.clearSrpgActorCommandWindowNeedRefresh();
        $gameSystem.setSubBattlePhase('normal');
        
        console.log(`Final Remaining Moves: ${preCalculatedMoves}`);
        
        // Optionally, remove the temporary movement lock so that on subsequent turns the actor moves normally:
        actor._temporaryMovementLock = false;
    };
                          
       
//=============================================================================

    Game_Temp.prototype.getActorMoveDistance = function() {
        const originalPos = this.originalPos(); // Get the original position
        const movePosition = this.getActorMovePosition(); // Get the stored position
        if (!originalPos || !movePosition) {
            console.error("Positions are not properly set.");
            return 0;
        }
        // Terrain tag rules
        const targetTag1 = 4; // Terrain tag 4 costs 2 moves
        const targetTag2 = 5; // Terrain tag 5 costs 3 moves
        let distanceMoved = 0;
        const getTileMoveCost = (x, y) => {
            const terrainTag = $gameMap.terrainTag(x, y);
            if (terrainTag === targetTag1) return 2;
            if (terrainTag === targetTag2) return 3;
            return 1;
        };
        let currentX = originalPos.x;
        let currentY = originalPos.y;
        const deltaX = Math.sign(movePosition.x - currentX);
        const deltaY = Math.sign(movePosition.y - currentY);
        while (currentX !== movePosition.x || currentY !== movePosition.y) {
            if (currentX !== movePosition.x) currentX += deltaX;
            if (currentY !== movePosition.y) currentY += deltaY;
    
            distanceMoved += getTileMoveCost(currentX, currentY);
        }
        console.log(`Distance Moved from (${originalPos.x}, ${originalPos.y}) to (${movePosition.x}, ${movePosition.y}): ${distanceMoved}`);
        return distanceMoved;
    };
    
    // Function to calculate remaining moves after the move
    Game_Actor.prototype.calculateRemainingMoves = function() {
        const maxMoves = this.srpgMove(); // This will now be 0 if <blockFriends:true> is active.
        const distanceMoved = $gameTemp.getActorMoveDistance();
        const remainingMoves = Math.max(maxMoves - distanceMoved, 0);
        console.log(`Unit ID: ${this.actorId()} | Max Moves: ${maxMoves} | Distance Moved: ${distanceMoved} | Remaining Moves: ${remainingMoves}`);
        return remainingMoves;
    };
    

    Game_Actor.prototype.setTemporaryMoveRange = function(tempMoveRange) {
        if (!this._originalSrpgMove) {
            // Backup the full calculated move range (base + modifiers)
            this._originalSrpgMove = this.srpgMove(); // Store the total move range
        }
    
        // Set the remaining moves as the new srpgMove in the actor's metadata
        let effectiveMoveRange = Math.max(tempMoveRange, 0); // Ensure non-negative
        this.actor().meta.srpgMove = effectiveMoveRange.toString();
    
        // Nullify srpgMovePlus modifiers in the current class, equipment, and states
        this._nullifiedSrpgMovePlus = {
            class: {
                originalValue: this.currentClass().meta.srpgMovePlus || 0,
                nullify: () => {
                    this.currentClass().meta.srpgMovePlus = 0; // Nullify modifier
                }
            },
            equips: this.equips().map(item => {
                if (item && item.meta) {
                    const originalValue = item.meta.srpgMovePlus || 0;
                    item.meta.srpgMovePlus = 0; // Nullify modifier
                    return { item, originalValue }; // Store original value for reset
                }
                return null;
            }),
            states: this.states().map(state => {
                if (state && state.meta) {
                    const originalValue = state.meta.srpgMovePlus || 0;
                    state.meta.srpgMovePlus = 0; // Nullify modifier
                    return { state, originalValue }; // Store original value for reset
                }
                return null;
            })
        };
    
        this._nullifiedSrpgMovePlus.class.nullify(); // Apply the nullification for class
        console.log(`Temporary Move Range Set to: ${effectiveMoveRange}`);
    };

    Game_Actor.prototype.setTempMoveRangeToZero = function() {
        if (!this._originalSrpgMove) {
            // Backup the full calculated move range (base + modifiers)
            this._originalSrpgMove = this.actor().meta.srpgMove ? Number(this.actor().meta.srpgMove) : _defaultMove;
        }
    
        // Temporarily set srpgMove to 0
        this.actor().meta.srpgMove = "0";
    
        // Schedule restoration after 1 turn
        this._restoreMoveAfterTurn = true; // Flag for restoration in turn-end logic
        console.log("Temporary Move Range set to 0 for 1 turn.");
    };
    
    Game_Actor.prototype.resetMoveRange = function() {
        if (this._originalSrpgMove) {
            // Restore the original srpgMove value in the actor's metadata
            this.actor().meta.srpgMove = this._originalSrpgMove.toString();
    
            // Restore srpgMovePlus modifiers for the current class
            if (this._nullifiedSrpgMovePlus && this._nullifiedSrpgMovePlus.class) {
                const classEntry = this._nullifiedSrpgMovePlus.class;
                this.currentClass().meta.srpgMovePlus = classEntry.originalValue; // Restore original value
            }
    
            // Restore srpgMovePlus modifiers for equipment
            if (this._nullifiedSrpgMovePlus && this._nullifiedSrpgMovePlus.equips) {
                this._nullifiedSrpgMovePlus.equips.forEach(entry => {
                    if (entry && entry.item && entry.item.meta) {
                        entry.item.meta.srpgMovePlus = entry.originalValue; // Restore original value
                    }
                });
            }
    
            // Restore srpgMovePlus modifiers for states
            if (this._nullifiedSrpgMovePlus && this._nullifiedSrpgMovePlus.states) {
                this._nullifiedSrpgMovePlus.states.forEach(entry => {
                    if (entry && entry.state && entry.state.meta) {
                        entry.state.meta.srpgMovePlus = entry.originalValue; // Restore original value
                    }
                });
            }
    
            console.log(`Move Range Reset to Original: ${this._originalSrpgMove}`);
    
            // Clear backup values
            this._originalSrpgMove = null;
            this._nullifiedSrpgMovePlus = null;
        }
    };       

    var _SRPG_TurnEnd = Game_System.prototype.srpgTurnEnd;
    Game_System.prototype.srpgTurnEnd = function() {
        // Call the original turn-end function
        _SRPG_TurnEnd.call(this);
        // Reset all actors' move ranges to their original values
        $gameParty.members().forEach(actor => {
            actor.resetMoveRange();
        });
        console.log(`All actors' move ranges have been reset.`);
    };
    
//=============================================================================
//---compatability---
//=============================================================================
//---Aoe---

//=============================================================================
//--srpg_Core1.34+Q---

    var _SRPG_SceneMap_updateCallMenu = Scene_Map.prototype.updateCallMenu;
    Scene_Map.prototype.updateCallMenu = function() {
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameSystem.srpgWaitMoving() == true ||
                $gameTemp.isAutoMoveDestinationValid() == true ||
                $gameSystem.isSubBattlePhase() === 'status_window' ||
                $gameSystem.isSubBattlePhase() === 'actor_command_window' ||
                $gameSystem.isSubBattlePhase() === 'battle_window' ||
                $gameSystem.isBattlePhase() != 'actor_phase') {
                this.menuCalling = false;
                return;
            }
            if ($gameSystem.isSubBattlePhase() === 'normal') {
                if (Input.isTriggered('pageup')) {
                    SoundManager.playCursor();
                    $gameSystem.getNextLActor();
                } else if (Input.isTriggered('pagedown')) {
                    SoundManager.playCursor();
                    $gameSystem.getNextRActor();
                }
            }
            // actor_move cancellation: calling selectPreviousActorCommand function
            if ($gameSystem.isSubBattlePhase() === 'actor_move') {
                if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
                    SoundManager.playCancel();

                    // Call the selectPreviousActorCommand function to handle position and phase transition
                    this.selectPreviousActorCommand();
                }
            }
            // actor_target cancellation logic (same as in previous example)
            else if ($gameSystem.isSubBattlePhase() === 'actor_target') {
                if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
                    SoundManager.playCancel();
                    var event = $gameTemp.activeEvent();
                    var battlerArray = $gameSystem.EventToUnit(event.eventId());
                    // Clear the move table
                    $gameTemp.clearMoveTable();
                    $gameTemp.clearRangeTable();
                    // Get updated position
                    var updatedX = $gameTemp.getActorMovePosition().x;
                    var updatedY = $gameTemp.getActorMovePosition().y;
                    // Reinitialize move table and process list
                    $gameTemp.initialMoveTable(updatedX, updatedY, battlerArray[1].srpgMove());
                    event.makeMoveTable(updatedX, updatedY, battlerArray[1].srpgMove(), [0], battlerArray[1].srpgThroughTag());
                    var list = $gameTemp.moveList();
                    for (var i = 0; i < list.length; i++) {
                        var pos = list[i];
                        var flag = $gameSystem.areTheyNoUnits(pos[0], pos[1], '');
                        if (flag == true && _srpgBestSearchRouteSize > 0) {
                            event.makeRangeTable(pos[0], pos[1], battlerArray[1].srpgWeaponRange(), [0], pos[0], pos[1], $dataSkills[battlerArray[1].attackSkillId()]);
                        }
                    }
                    $gameTemp.pushRangeListToMoveList();
                    $gameTemp.setResetMoveList(true);
                    $gameSystem.setSrpgActorCommandWindowNeedRefresh(battlerArray);
                    $gameSystem.setSubBattlePhase('actor_command_window');
                }
            } else {
                _SRPG_SceneMap_updateCallMenu.call(this);
            }
        } else {
            _SRPG_SceneMap_updateCallMenu.call(this);
        }
    };

    Game_Temp.prototype.initialRangeTable = function(oriX, oriY, oriMove) {
        const subBattlePhase = $gameSystem.isSubBattlePhase();
        // Only execute during specific sub-battle phases
        if (subBattlePhase === 'auto_actor_command' || subBattlePhase === 'auto_target') {
            this.setRangeTable(oriX, oriY, oriMove, [0]);
            this.pushRangeList([oriX, oriY, true]);
        }else{
            return false
        }
    };

    // Clears the range table in SRPG Core
    Game_Temp.prototype.clearRangeTable = function() {
        this._RangeTable = [];
        this._RangeList = [];
        for (var i = 0; i < $dataMap.width; i++) {
            var vertical = [];
            for (var j = 0; j < $dataMap.height; j++) {
                vertical[j] = [-1, []]; // Reset each grid cell
            }
            this._RangeTable[i] = vertical;
        }
    };

    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._MoveTable = []; // Initialize the move table here
    };

    Game_Temp.prototype.setMoveTable = function(x, y, move, route) {
        // Defensive check: initialize _MoveTable if it's not defined
        if (!this._MoveTable) {
            this._MoveTable = [];
        }
        if (!this._MoveTable[x]) {
            this._MoveTable[x] = [];
        }
        if (!this._MoveTable[x][y]) {
            this._MoveTable[x][y] = [null, null];
        }
        if (move !== undefined && route !== undefined) {
            this._MoveTable[x][y] = [move, route];
        } else {
            console.error('Invalid move or route:', move, route);
        }
    };

    Game_Temp.prototype.RangeTable = function(x, y) {
        // Ensure the position [x] exists and is initialized
        if (!this._RangeTable[x]) {
            this._RangeTable[x] = [];
        }
        // Ensure the position [x][y] exists before trying to read it
        if (!this._RangeTable[x][y]) {
            this._RangeTable[x][y] = [null]; // Initialize with a default value (null in this case)
        }
        return this._RangeTable[x][y];
    };

//=============================================================================
//--Range_Control---

    Game_Event.prototype.makeRangeTable = function(x, y, range, unused, oriX, oriY, skill) {
        var user = $gameSystem.EventToUnit(this.eventId())[1];
        if (!skill || !user) return;
        var minRange = user.srpgSkillMinRange(skill);
        var edges = [];
        if (range > 0) edges = [[x, y, range, [0], []]];
        if (minRange <= 0 && $gameTemp.RangeTable(x, y)[0] < 0) {
            // Ensure the position is initialized properly
            if ($gameTemp.MoveTable(x, y)[0] < 0) {
                $gameTemp.pushRangeList([x, y, true]);
            }
            $gameTemp.setRangeTable(x, y, range, [0]);
            $gameTemp.addRangeMoveTable(x, y, x, y);
        }
        $gameMap.makeSrpgLoSTable(this);
        for (var i = 0; i < edges.length; i++) {
            var cell = edges[i];
            var drange = cell[2] - 1;
            for (var d = 2; d < 10; d += 2) {
                if (cell[4][d] == 1) continue;
                if (!this.srpgRangeCanPass(cell[0], cell[1], d)) continue;
                var dx = $gameMap.roundXWithDirection(cell[0], d);
                var dy = $gameMap.roundYWithDirection(cell[1], d);
                var route = cell[3].concat(d);
                var forward = cell[4].slice(0);
                forward[10-d] = 1;
                if (drange > 0) edges.push([dx, dy, drange, route, forward]);
                if ($gameMap.distTo(x, y, dx, dy) >= minRange && this.srpgRangeExtention(dx, dy, x, y, skill, range)) {
                    if ($gameTemp.RangeTable(dx, dy)[0] < 0) {
                        $gameTemp.setRangeTable(dx, dy, drange, route);
                        if ($gameTemp.MoveTable(dx, dy)[0] < 0) $gameTemp.pushRangeList([dx, dy, true]);
                    }
                    $gameTemp.addRangeMoveTable(dx, dy, x, y);
                }
            }
        }
    };
})();
