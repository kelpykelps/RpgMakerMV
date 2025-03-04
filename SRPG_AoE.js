//-----------------------------------------------------------------------------
// copyright 2020 Doktor_Q all rights reserved.
// Released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @plugindesc SRPG area-of-effect skills
 * @author Dr. Q + アンチョビ, Edited by Shoukang
 * 
 * @param AoE Color
 * @desc CSS Color for AoE squares
 * https://www.w3schools.com/cssref/css_colors.asp
 * @type string
 * @default DarkOrange
 *
 * @param Show One Square AoE
 * @desc Show AoE indicator for single target effects?
 * @type boolean
 * @on Show
 * @off Hide
 * @default false
 *
 * @param Refocus Camera
 * @desc Move the camera to each target as it's hit
 * @type boolean
 * @on Move
 * @off Don't move
 * @default false
 *
 * @param Aoe Line of Sight
 *
 * @param Aoe Through Objects
 * @desc If true, objects don't block LoS
 * @parent Aoe Line of Sight
 * @type boolean
 * @default false
 *
 * @param Aoe Through Opponents
 * @desc If true, the users's enemies don't block LoS
 * @parent Aoe Line of Sight
 * @type boolean
 * @default false
 *
 * @param Aoe Through Friends
 * @desc If true, the users's allies don't block LoS
 * @parent Aoe Line of Sight
 * @type boolean
 * @default true
 *
 * @param Aoe Through Events
 * @desc If true, playerEvents don't block LoS
 * @parent Aoe Line of Sight
 * @type boolean
 * @default false
 *
 * @param Aoe Through Terrain
 * @desc Terrain IDs above this number block line of sight
 * -1 uses the same setting as the user's mobility
 * @parent Aoe Line of Sight
 * @type number
 * @min -1
 * @max 7
 * @default 0
 *
 * @help
 * Allows you to define an area of effect for attacks
 * Based on SRPG_AreaAttack.js by アンチョビ
 *
 * Note: SRPG_AreaAttack and SRPG_AoE define many of the same features in
 * different ways, and are incompatible if you try to use both.
 * 
 * When using an AoE skill, you can target an empty cell as long as there is at
 * least one valid target within the area
 * AI units won't make use of this, and will always try to target a unit
 * directly, catching other targets by coincidence
 * 
 * By default, AI units are not allowed to use AoE effects with a minimum range
 * of 1 or more because they don't understand how to aim them, but other
 * plugins that improve the AI can include the following line to reenable them:
 * Game_System.prototype.srpgAIUnderstandsAoE = true;
 * 
 * Note: .SRPGActionTimesAdd(X) will only work during the first target of a
 * skill if it has an AoE. If you want to modify action times manually, use
 * ._SRPGActionTimes += X instead.
 * 
 * Skill / item notetags:
 * <srpgAreaRange:x>    creates an AoE of size x
 * <srpgAreaMinRange:x> adjusts the minimum AoE size, creating a hole
 * <srpgAreaTargets:x>  set the maximum number of targets the skill can hit
 * <srpgAreaType:y>     changes the shape of the AoE
 *   type defaults to 'circle' if not specified
 *
 * <srpgAreaOrder:near> select targets from nearest to furthest (default)
 * <srpgAreaOrder:far>  select targets from furthest to nearets
 * <srpgAreaOrder:random> select targets randomly within the AoE
 *
 * <srpgAoeLoS: true>      Ensures the skill adheres to LoS logic.
 * <throughAoeTerrain: 2>  Allows the AoE to pass through terrain with a tag of 2 or lower.
 * <throughAoeObject: true|false> Determines whether the AoE can pass through objects (e.g., destructible barrels, rocks).
 * <throughAoeFriend: true|false> Determines whether the AoE can pass through friendly units.
 * <throughAoeOpponent: true|false> Determines whether the AoE can pass through enemy units.
 * <throughAoeEvent: true|false> Determines whether the AoE can pass through events (e.g., doors, switches).
 * <isForFriend: true|false> Determines whether the skill can target friendly units.
 * <isForOpponent: true|false> Determines whether the skill can target opposing units.
 * <isForBoth: true> Allows the skill to target both friendly and enemy units.
 * <cellTarget: true> Allows the skill to target empty cells or tiles.(POSITION EFFECTS)
 * 
 *
 * The following shapes are available, shown at a size of 2, min size of 0
 * The number shows what distance it is at
 *
 * circle: hits a circle around the target cell
 *      2
 *    2 1 2
 *  2 1 0 1 2
 *    2 1 2
 *      2
 *
 * square - hits a square around the target cell
 *  2 2 2 2 2
 *  2 1 1 1 2
 *  2 1 0 1 2
 *  2 1 1 1 2
 *  2 2 2 2 2
 *
 * line - hits a straight line behind of the target cell
 *
 *      0
 *      1
 *      2
 * (facing down)
 *
 * cone - hits a 90 degree cone behind the target cell
 *
 *
 *      0
 *    1 1 1
 *  2 2 2 2 2
 * (facing down)
 *
 * split - hits a v shape behind the target cell
 *
 *
 *      0
 *    1   1
 *  2       2
 * (facing down)
 *
 * arc - hits a v shape coming back from the target cell
 *  2       2
 *    1   1
 *      0
 *
 *
 * (facing down)
 *
 * side - hits a line to either side of the target cell
 *
 *
 *  2 1 0 1 2
 *
 *
 * (facing down)
 *
 * tee - hits behind and to the sides of the target
 *
 *
 *  2 1 0 1 2
 *      1
 *      2
 * (facing down)
 *
 * plus - hits a + shape around the target cell
 *      2
 *      1
 *  2 1 0 1 2
 *      1
 *      2
 *
 * cross - hits an x shape around the target cell
 *  2       2
 *    1   1
 *      0
 *    1   1
 *  2       2
 *
 * star - hits a + and an x shape around the target cell
 *  2   2   2
 *    1 1 1
 *  2 1 0 1 2
 *    1 1 1
 *  2   2   2
 *
 * checker - hits every other cell in a square
 *  2   2   2
 *    1   1
 *  2   0   2
 *    1   1
 *  2   2   2
 *
 * Script calls for advanced users:
 *  yourEvent.battlersNear(size, minSize, 'shape', [direction])
 *  yourEvent.enemiesNear(size, minSize, 'shape', [direction])
 *  yourEvent.actorsNear(size, minSize, 'shape', [direction])
 *
 * Returns a list of actors/enemies/both near the specified event, supporting
 * the same AoE shapes listed above. If you use a directional AoE shape and no
 * direction is specified, it will point where your event is facing
 */

(function(){

	var parameters = PluginManager.parameters('SRPG_AoE');
	var _oneSquare = !!eval(parameters['Show One Square AoE']);
	var _areaColor = parameters['AoE Color'];
	var _refocus = !!eval(parameters['Refocus Camera']);

	var _defaultAoeTag = Number(parameters['Aoe Through Terrain'] || 0);
    var _throughAoeObject = !!eval(parameters['Aoe Through Objects']);
    var _throughAoeOpponent = !!eval(parameters['Aoe Through Opponents']);
    var _throughAoeFriend = !!eval(parameters['Aoe Through Friends']);
    var _throughAoeEvent = !!eval(parameters['Aoe Through Events']);

	var coreParameters = PluginManager.parameters('SRPG_core');
	var _srpgPredictionWindowMode = Number(coreParameters['srpgPredictionWindowMode'] || 1);

//====================================================================
// Compatibility with plugins expecting SRPG_AreaAttack.js
//====================================================================

	Game_Temp.prototype.isFirstAction = function() {
		return !!(this.shouldPayCost());
	};
	Game_Temp.prototype.isLastAction = function() {
		return !!(this.areaTargets().length < 1);
	};
	Game_BattlerBase.prototype.srpgSkillAreaRange = function(item) {
		return Number(item.meta.srpgAreaRange);
	};

//====================================================================
// Get AoE data for the skill
//====================================================================

	// get AoE properties
	Game_Action.prototype.area = function() {
		if (this.item()) return Number(this.item().meta.srpgAreaRange) || 0;
		return 0;
	};
	Game_Action.prototype.minArea = function() {
		if (this.item()) return Number(this.item().meta.srpgAreaMinRange) || 0;
		return 0;
	};
	Game_Action.prototype.areaType = function() {
		var type = '';
		if (this.item()) type = this.item().meta.srpgAreaType || '';
		type = type.toLowerCase();
		return type;
	};
	Game_Action.prototype.areaTargetLimit = function() {
		if (this.item()) return Number(this.item().meta.srpgAreaTargets) || 0;
		return 0;
	};
	Game_Action.prototype.areaOrder = function() {
		var order = '';
		if (this.item()) return this.item().meta.srpgAreaOrder || '';
		order = order.toLowerCase();
		return order;
	};

	// (utility) find the direction to a fixed point, discounting obstacles
	Game_Character.prototype.dirTo = function(x, y) {
		var dir = 5;
		var dx = this.posX() - x;
		var dy = this.posY() - y;

		// account for looping maps
		if ($gameMap.isLoopHorizontal()) {
			if (dx > $gameMap.width() / 2) dx -= $gameMap.width();
			if (dx < -$gameMap.width() / 2) dx += $gameMap.width();
		}
		if ($gameMap.isLoopVertical()) {
			if (dy > $gameMap.height() / 2) dy -= $gameMap.height();
			if (dy < -$gameMap.height() / 2) dy += $gameMap.height();
		}

		if (Math.abs(dx) > Math.abs(dy)) {
			dir = dx > 0 ? 4 : 6;
		} else if (dy !== 0) {
			dir = dy > 0 ? 8 : 2;
		}
		return dir;
	};

	// (utility) find the distance to a fixed point, discounting obstacles
	Game_Character.prototype.distTo = function(x, y) {
		var dx = Math.abs(this.posX() - x);
		var dy = Math.abs(this.posY() - y);

		if ($gameMap.isLoopHorizontal()) dx = Math.min(dx, $gameMap.width() - dx);
		if ($gameMap.isLoopVertical()) dy = Math.min(dy, $gameMap.height() - dy);
		
		return  dx + dy;
	};

	// (utility) checks if a position is within the current skill's range
	Game_System.prototype.positionInRange = function(x, y) {
		var range = $gameTemp.moveList();
		for (var i = 0; i < range.length; i++) {
			if (range[i][0] == x && range[i][1] == y) return true;
		}
		return false;
	};

//=========================================================================================================================
//AOE LOS CODE
//=========================================================================================================================

	// check line-of-sight as part of the special range
	var _srpgAoeRangeExtention = Game_CharacterBase.prototype.srpgAoeRangeExtention;
	Game_CharacterBase.prototype.srpgAoeRangeExtention = function(x, y, oriX, oriY, skill, area) {
		if (!_srpgRangeExtention.apply(this, arguments)) return false;
		if (skill && skill.meta.srpgAoeLoS) {
			return $gameMap.srpgHasAoeLoS(oriX, oriY, x, y, this.LoSAoeTerrain(skill), this.LoSAoeEvents(skill));
		}
		return true;
	}

	Game_Map.prototype.initializeLosAoeTable = function() {
		// Check if _losAoeTable is already initialized
		if (!this._losAoeTable) {
			this._losAoeTable = {};  // Initialize it as an empty object
		}
	};

		// map out the events that might block LoS
		Game_Map.prototype.makeSrpgAoeLoSTable = function(source) {
            if (!this._losAoeTable) {
                this._losAoeTable = {}; // Initialize the table only if not already created
            }
            this.events().forEach(function(event) {
                if (event !== source && !event.isErased() && event.isType()) {
                    var key = event.posX() + ',' + event.posY();
                    switch (event.isType()) {
                        case 'object':
                            if (event.characterName() == '') break;
                        case 'actor':
                        case 'enemy':
                        case 'playerEvent':
                            this._losAoeTable[key] = event.isType();
                            break;
                    }
                }
            }, this);
        };
        
        
	
		Game_CharacterBase.prototype.LoSAoeTerrain = function() {
			var unit = $gameTemp.activeEvent();
			var actor = $gameSystem.EventToUnit(unit.eventId())[1];
			var action = actor.currentAction();  // Get the actor's current action
			if (!action) return _defaultAoeTag; // If there's no action, return default tag
			
			var skillId = action.item().id;  // Retrieve the skill ID
			var skill = $dataSkills[skillId];  // Look up the skill object using the ID
		
			if (!skill || skill.meta.throughAoeTerrain === undefined) return _defaultAoeTag;
		
			var terrain = Number(skill.meta.throughAoeTerrain);
			if (terrain < 0) {
				if (typeof actor.srpgThroughTag === 'function') {
					return actor.srpgThroughTag();  // Return the custom terrain tag if function exists
				}
			}
		
			return terrain;  // Return the skill's terrain tag if it's defined
		};
	
		Game_CharacterBase.prototype.LoSAoeEvents = function() {
			var unit = $gameTemp.activeEvent();
			var actor = $gameSystem.EventToUnit(unit.eventId())[1];
			var action = actor.currentAction();  // Get the actor's current action
			if (!action) return [];  // If there's no action, return an empty array
		
			var skillId = action.item().id;  // Retrieve the skill ID
			var skill = $dataSkills[skillId];  // Look up the skill object using the ID
		
			if (!skill) return [];  // If no skill found, return an empty array
		
			var blockingTypes = [];
		
			// Process the 'throughAoeObject' meta tag if it exists
			if ((!_throughAoeObject && skill.meta.throughAoeObject != "true") || skill.meta.throughAoeObject == "false") {
				blockingTypes.push("object");
			}
			
			// Process the 'throughAoeFriend' meta tag if it exists
			if ((!_throughAoeFriend && skill.meta.throughAoeFriend != "true") || skill.meta.throughAoeFriend == "false") {
				blockingTypes.push((this.isType() != "enemy") ? "actor" : "enemy");
			}
			
			// Process the 'throughAoeOpponent' meta tag if it exists
			if ((!_throughAoeOpponent && skill.meta.throughAoeOpponent != "true") || skill.meta.throughAoeOpponent == "false") {
				blockingTypes.push((this.isType() != "enemy") ? "enemy" : "actor");
			}
			
			// Process the 'throughAoeEvent' meta tag if it exists
			if ((!_throughAoeEvent && skill.meta.throughAoeEvent != "true") || skill.meta.throughAoeEvent == "false") {
				blockingTypes.push("playerEvent");
			}
			
			return blockingTypes;  // Return the list of blocking event types
		};		
	
		// trace the line from x,y to x2,y2 and return false if the path is blocked
		Game_Map.prototype.srpgHasAoeLoS = function(x1, y1, x2, y2, tag, types) {
            tag = Math.max(tag, 0);
            var dx = Math.abs(x2 - x1);
            var dy = Math.abs(y2 - y1);
            var sx = (x1 < x2) ? 1 : -1;
            var sy = (y1 < y2) ? 1 : -1;
        
            if (this.isLoopHorizontal() && dx > this.width() / 2) {
                dx = this.width() - dx;
                sx *= -1;
            }
            if (this.isLoopVertical() && dy > this.height() / 2) {
                dy = this.height() - dy;
                sy *= -1;
            }
        
            var x = x1;
            var y = y1;
            var err = dx - dy;
        
            while (x !== x2 || y !== y2) {
                var key = x + ',' + y;
        
                // Block based on terrain or events in `_losAoeTable`
                if (this.terrainTag(x, y) > tag) return false;
                if (this._losAoeTable[key] && types.contains(this._losAoeTable[key])) return false;
        
                var err2 = err * 2;
                if (err2 > -dy) {
                    err -= dy;
                    x += sx;
                    if (x < 0) x += this.width();
                    if (x >= this.width()) x -= this.width();
                }
                if (err2 < dx) {
                    err += dx;
                    y += sy;
                    if (y < 0) y += this.height();
                    if (y >= this.height()) y -= this.height();
                }
            }
        
            return true;
        };
        
		

//====================================================================
// Game_Temp (store lists of multiple targets)
//====================================================================

	var _Game_Temp_initialize = Game_Temp.prototype.initialize;
	Game_Temp.prototype.initialize = function() {
		_Game_Temp_initialize.call(this);
		this._activeAoE = null;
		this._areaTargets = [];
		this._shouldPaySkillCost = true;
	};

	// easy access to the origin of the AoE
	Game_Temp.prototype.areaX = function() {
		return this._activeAoE ? this._activeAoE.x : -1;
	};
	Game_Temp.prototype.areaY = function() {
		return this._activeAoE ? this._activeAoE.y : -1;
	};

//===Aoe los modified logic===
	// check if an event is in the area of the current skill
	Game_Temp.prototype.inArea = function(event) {
		if (!this._activeAoE) return false;
	
		var aoe = this._activeAoE;
		var isVisible = aoe.visibleTiles.some(tile => tile.x === event.posX() && tile.y === event.posY());
		var isBlocked = aoe.blockedTiles.some(tile => tile.x === event.posX() && tile.y === event.posY());
	
		return isVisible && !isBlocked;
	};

	// to attack multiple targets, you queue up a target list
	Game_Temp.prototype.clearAreaTargets = function() {
		this._areaTargets = [];
	};
	Game_Temp.prototype.addAreaTarget = function(action) {
		this._areaTargets.push(action);
	};
	Game_Temp.prototype.areaTargets = function() {
		return this._areaTargets;
	};

	// when repeating actions, the cost/item is only paid once
	Game_Temp.prototype.setShouldPayCost = function(flag) {
		this._shouldPaySkillCost = flag;
	};
	Game_Temp.prototype.shouldPayCost = function() {
		return this._shouldPaySkillCost;
	};
	var _useItem = Game_Battler.prototype.useItem;
	Game_Battler.prototype.useItem = function(skill) {
		if (!$gameSystem.isSRPGMode() || $gameTemp.shouldPayCost()) {
			_useItem.call(this, skill);
		}
	};
	var _actionTimesAdd = Game_Battler.prototype.SRPGActionTimesAdd;
	Game_Battler.prototype.SRPGActionTimesAdd = function(num) {
		if ($gameTemp.shouldPayCost()) {
			_actionTimesAdd.call(this, num);
		}
	};

//====================================================================
// Check what's in an area
//====================================================================

	// get a list of battlers near another battler
	Game_Character.prototype.battlersNear = function(size, minSize, shape, dir, type) {
		var x = this.posX();
		var y = this.posY();
		dir = dir || this.direction();

		var battlers = [];
		$gameMap.events().forEach(function (event) {
			if (event.isErased() || !event.inArea(x, y, size, minSize, shape, dir)) return;
			var unitAry = $gameSystem.EventToUnit(enemyEvent.eventId());
			if (unitAry && (unitAry[0] === type || type === null)) battlers.push(unitAry[1]);
		});
		return battlers;
	};
	Game_Character.prototype.enemiesNear = function(size, minSize, shape, dir) {
		return this.battlersNear(size, minSize, shape, dir, 'enemy');
	};
	Game_Character.prototype.actorsNear = function(size, minSize, shape, dir) {
		return this.battlersNear(size, minSize, shape, dir, 'actor');
	};

	// check if a character is within a specified AoE
	Game_Character.prototype.inArea = function(x, y, size, minSize, shape, dir) {
		if (size <= 0) return false; // one-square AoEs don't count as AoEs
		var dx = this.posX() - x;
		var dy = this.posY() - y;

		// account for looping maps
		if ($gameMap.isLoopHorizontal()) {
			if (dx > $gameMap.width() / 2) dx -= $gameMap.width();
			if (dx < -$gameMap.width() / 2) dx += $gameMap.width();
		}
		if ($gameMap.isLoopVertical()) {
			if (dy > $gameMap.height() / 2) dy -= $gameMap.height();
			if (dy < -$gameMap.height() / 2) dy += $gameMap.height();
		}
		return $gameMap.inArea(dx, dy, size, minSize, shape, dir);
	};

	// check if a given position is within an area
	Game_Map.prototype.inArea = function(x, y, size, minSize, shape, dir) {
		var _fx = [0, -1, 0, 1, -1, 0, 1, -1, 0, 1][dir];
		var _fy = [0, 1, 1, 1, 0, 0, 0, -1, -1, -1][dir];

		var ry = x*_fx + y*_fy; // forward
		var rx = x*_fy - y*_fx; // sideways

		// apply default shape
		shape = shape || 'circle';

		// outside drawing boundary, doesn't count
		if (x > size || x < -size || y > size || y < -size) return false;

		switch (shape) {
			case 'line':
				if (rx != 0) return false;
				if (ry > size || ry < minSize) return false;
				return true;

			case 'cone':
				if (ry > size || ry < minSize) return false;
				if (Math.abs(rx) > Math.abs(ry)) return false;
				return true;

			case 'split':
				if (ry > size || ry < minSize) return false;
				if (Math.abs(rx) != Math.abs(ry)) return false;
				return true;

			case 'arc':
				if (ry < -size || ry > -minSize) return false;
				if (Math.abs(rx) != Math.abs(ry)) return false;
				return true;

			case 'side':
				if (ry != 0) return false;
				if (Math.abs(rx) > size || Math.abs(rx) < minSize) return false;
				return true;

			case 'tee':
				if (ry < 0) return false;
				if (x != 0 && y != 0) return false;
				if (Math.abs(x) > size || Math.abs(y) > size) return false;
				if (Math.abs(x) < minSize && Math.abs(y) < minSize) return false;
				return true;

			case 'plus':
				if (x != 0 && y != 0) return false;
				if (Math.abs(x) > size || Math.abs(y) > size) return false;
				if (Math.abs(x) < minSize && Math.abs(y) < minSize) return false;
				return true;

			case 'cross':
				if (Math.abs(x) != Math.abs(y)) return false;
				if (Math.abs(x) > size || Math.abs(x) < minSize) return false;
				return true;

			case 'star':
				if (Math.abs(x) != Math.abs(y) && x != 0 && y != 0) return false;
				if (Math.abs(x) > size || Math.abs(y) > size) return false
				if (Math.abs(x) < minSize && Math.abs(y) < minSize) return false
				return true;

			case 'checker':
				if ((x + y) % 2 != 0) return false;
				if (Math.abs(x) > size || Math.abs(y) > size) return false
				if (Math.abs(x) < minSize && Math.abs(y) < minSize) return false
				return true;

			case 'square':
				if (Math.abs(x) > size || Math.abs(y) > size) return false;
				if (Math.abs(x) < minSize && Math.abs(y) < minSize) return false
				return true;

			case 'circle':
				if (Math.abs(x) + Math.abs(y) > size || Math.abs(x) + Math.abs(y) < minSize) return false;
				return true;

			default: // support extension from other plugins
				return this.extraAreas(shape, x, y, rx, ry, size, minSize);
		}
	};

	// plugins can override this to add more shapes
	Game_Map.prototype.extraAreas = function(shape, x, y, rx, ry, size, minSize) {
		return false;
	};

//====================================================================
// Using AoE skills
//====================================================================

	// update the active AoE when you move the cursor
	var _startMapEvent = Game_Player.prototype.startMapEvent;
	Game_Player.prototype.startMapEvent = function(x, y, triggers, normal) {
		if ($gameSystem.isSRPGMode() && triggers.contains(1)) {
			if ($gameSystem.isSubBattlePhase() === 'actor_target' && $gameSystem.positionInRange(x, y)) {
				$gameTemp.showArea(x, y);
			} else if ($gameSystem.isSubBattlePhase() !== 'invoke_action' &&
			$gameSystem.isSubBattlePhase() !== 'battle_window' && $gameSystem.isBattlePhase() == 'actor_phase') { //shoukang add && $gameSystem.isBattlePhase() == 'actor_phase'
				$gameTemp.clearArea();
			}
		}
		if ($gameSystem.isSRPGMode() && $gameSystem.isSubBattlePhase() === 'actor_target' && $gameTemp.isSkillAoE()) {
			return;
		}
		_startMapEvent.call(this, x, y, triggers, normal);
	};

	// show the AoE when you start targeting
	var _startActorTargetting = Scene_Map.prototype.startActorTargetting;
	Scene_Map.prototype.startActorTargetting = function() {
		_startActorTargetting.call(this);
		var x = $gamePlayer.posX();
		var y = $gamePlayer.posY();
		if ($gameSystem.positionInRange(x, y)) {
			$gameTemp.showArea(x, y);
		}
	};

	// clear the AoE when you cancel targeting
	var _updateCallMenu = Scene_Map.prototype.updateCallMenu;
	Scene_Map.prototype.updateCallMenu = function() {
		if ($gameSystem.isSRPGMode() && $gameSystem.isSubBattlePhase() === 'actor_target' &&
		(Input.isTriggered('cancel') || TouchInput.isCancelled())) {
			$gameTemp.clearArea();
		}
		_updateCallMenu.call(this);
	};

	// check if the skill currently selected has an AoE
	Game_Temp.prototype.isSkillAoE = function() {
		var unit = $gameTemp.activeEvent();
		var actor = $gameSystem.EventToUnit(unit.eventId())[1];
		if (!actor) return false;
		var skill = actor.currentAction();
		if (!skill) return false;
		if (skill.area() <= 0) return false;
		return true;
	};

	//===modified Aoe Los logic===
	Game_Temp.prototype.showArea = function(x, y, dir) {
        var unit = $gameTemp.activeEvent();
        if (!unit) return;
    
        var actor = $gameSystem.EventToUnit(unit.eventId())[1];
        if (!actor) return;
    
        var skill = actor.currentAction();
        if (!skill) return;
    
        $gameMap.makeSrpgAoeLoSTable(unit); // Precompute event blockers
    
        var size = skill.area();
        var minSize = skill.minArea();
        var shape = skill.areaType();
        var dir = dir || unit.dirTo(x, y);
        this._activeAoE = {
            x: x,
            y: y,
            size: size,
            minSize: minSize,
            shape: shape,
            dir: dir,
            visibleTiles: [],
            blockedTiles: []
        };
    
        var tileCache = {}; // Cache results to avoid redundant LoS checks
    
        for (var dx = -size; dx <= size; dx++) {
            for (var dy = -size; dy <= size; dy++) {
                if (!$gameMap.inArea(dx, dy, size, minSize, shape, dir)) continue;
    
                var targetX = x + dx;
                var targetY = y + dy;
                var key = targetX + ',' + targetY;
    
                if (tileCache[key] !== undefined) {
                    // Use cached result
                    if (tileCache[key]) {
                        this._activeAoE.visibleTiles.push({ x: targetX, y: targetY });
                    } else {
                        this._activeAoE.blockedTiles.push({ x: targetX, y: targetY });
                    }
                    continue;
                }
    
                var hasLoS = $gameMap.srpgHasAoeLoS(x, y, targetX, targetY, unit.LoSAoeTerrain(skill), unit.LoSAoeEvents(skill));
                tileCache[key] = hasLoS;
    
                if (hasLoS) {
                    this._activeAoE.visibleTiles.push({ x: targetX, y: targetY });
                } else {
                    this._activeAoE.blockedTiles.push({ x: targetX, y: targetY });
                }
            }
        }
    };        

	// clear out the highlighted area
	Game_Temp.prototype.clearArea = function() {
		this._activeAoE = null;
	};

//==Aoe los modified logic===
	// AoE skills can select empty cells
	var _triggerAction = Game_Player.prototype.triggerAction;
	Game_Player.prototype.triggerAction = function() {
		if ($gameSystem.isSRPGMode() && $gameSystem.isSubBattlePhase() === 'actor_target') {
			if (Input.isTriggered('ok') || TouchInput.isTriggered()) {
				var userArray = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId());
				var skill = userArray[1].currentAction();
	
				if ($gameTemp.selectArea(userArray[1], skill)) {
					SoundManager.playOk();
	
					var action = $gameTemp.areaTargets().shift();
					var targetArray = $gameSystem.EventToUnit(action.event.eventId());
	
					$gameTemp.setTargetEvent(action.event);
					$gameTemp.setSrpgDistance($gameSystem.unitDistance($gameTemp.activeEvent(), action.event));
	
					$gameSystem.clearSrpgActorCommandStatusWindowNeedRefresh();
					if (_srpgPredictionWindowMode !== 3) {
						$gameSystem.setSrpgStatusWindowNeedRefresh(userArray);
					}
					$gameSystem.setSrpgBattleWindowNeedRefresh(userArray, targetArray);
					$gameSystem.setSubBattlePhase('battle_window');
					return true;
				}
			}
		}
		return _triggerAction.call(this);
	};
	
	// Clear AoE targets when cancelling the big target
	var _selectPreviousSrpgBattleStart = Scene_Map.prototype.selectPreviousSrpgBattleStart;
	Scene_Map.prototype.selectPreviousSrpgBattleStart = function() {
		_selectPreviousSrpgBattleStart.call(this);
		$gameTemp.clearAreaTargets();
	};


//===Aoe los modified logic===	
	// Apply AoEs for auto units as well
	var _srpgInvokeAutoUnitAction = Scene_Map.prototype.srpgInvokeAutoUnitAction;
	Scene_Map.prototype.srpgInvokeAutoUnitAction = function() {
		// Set up the AoE if it hasn't already been prepared
		if (!$gameTemp._activeAoE) {
			var mainTarget = $gameTemp.targetEvent();
			if (mainTarget && $gameSystem.positionInRange(mainTarget.posX(), mainTarget.posY())) {
				var userArray = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId());
				var skill = userArray[1].currentAction();
				if (skill.area() > 0) {
					$gameTemp.showArea(mainTarget.posX(), mainTarget.posY()); // Highlight AoE
		
					// Filter targets to ensure they are in visible tiles
					var aoe = $gameTemp._activeAoE;
					var validTargets = $gameMap.events().filter(event => {
						// Check if the event is within visible area and valid
						var isVisible = aoe.visibleTiles.some(tile => tile.x === event.posX() && tile.y === event.posY());
						if (!isVisible || event.isErased()) return false;
	
						// Now check the targeting based on the skill's scope
						if (skill.scope() === 1 || skill.scope() === 2 || skill.scope() === 6) {
							// Skill targets enemies (e.g., One Enemy, All Enemies, All Units)
							if (!event.isActor()) return false; // Exclude friendly units
						} else if (skill.scope() === 3 || skill.scope() === 4 || skill.scope() === 6) {
							// Skill targets friends (e.g., One Ally, All Allies, All Units)
							if (event.isActor()) return false; // Exclude enemies
						}
	
						// If all checks pass, the event is a valid target
						return true;
					});
		
					if (validTargets.length > 0) {
						// Sort and prioritize targets (optional: based on skill metadata or distance)
						validTargets.sort((a, b) => {
							var distA = a.distTo(aoe.x, aoe.y);
							var distB = b.distTo(aoe.x, aoe.y);
							return distA - distB; // Prioritize closest targets
						});
		
						// Queue actions for valid targets
						validTargets.forEach(target => {
							$gameTemp.addAreaTarget({
								item: skill.item(),
								event: target
							});
						});
		
						// Set the first valid target as the main target
						var firstTarget = $gameTemp.areaTargets().shift();
						if (firstTarget) {
							$gameTemp.setTargetEvent(firstTarget.event);
						}
					}
				}
			}
		}
		_srpgInvokeAutoUnitAction.call(this);
	};
			
	
//==aoe los modified logic===
	// Find all the targets within the current AoE
	Game_Temp.prototype.selectArea = function(user, skill) {
		this.clearAreaTargets();
		var friends = user.isActor() ? 'actor' : 'enemy';
		var opponents = user.isActor() ? 'enemy' : 'actor';
		
		// Check if the targets are limited
		var limit = skill.areaTargetLimit();
		
		// Ensure _activeAoE is defined and has visibleTiles, set fallback if not
		var aoe = this._activeAoE;
		var targets = [];
	
		if (aoe && aoe.visibleTiles) {
			// Proceed with filtering targets if visibleTiles are available
			targets = $gameMap.events().filter(function(event) {
				if (event.isErased()) return false;
		
				// Check if event is in visibleTiles and not in blockedTiles
				var tileKey = event.posX() + ',' + event.posY();
				var isVisible = aoe.visibleTiles.some(tile => tile.x === event.posX() && tile.y === event.posY());
				var isBlocked = aoe.blockedTiles.some(tile => tile.x === event.posX() && tile.y === event.posY());
		
				if (isVisible && !isBlocked) {
					if ((event.isType() === friends && skill.isForFriend()) ||
						(event.isType() === opponents && skill.isForOpponent())) {
						return true;
					}
				}
				return false;
			});
		} else {
			// If visibleTiles is null, log the error and fallback to empty array
			console.error("Active AoE or visibleTiles is not defined.");
			// Optionally, provide feedback to the player, e.g.:
			// alert("You are selecting a tile outside the skill's range.");
		}
	
		// If no valid targets are found, return early or handle appropriately
		if (targets.length === 0) {
			console.warn("No valid targets within AoE range.");
			return false; // Early exit or adjust accordingly
		}
		
		// Sort targets by distance or other order
		var sortFunction;
		switch (skill.areaOrder()) {
			case 'random':
				sortFunction = () => Math.random() - 0.5;
				break;
			case 'far':
				sortFunction = (a, b) => {
					var distA = a.distTo(aoe.x, aoe.y);
					var distB = b.distTo(aoe.x, aoe.y);
					return distB - distA;
				};
				break;
			case 'near':
			default:
				sortFunction = (a, b) => {
					var distA = a.distTo(aoe.x, aoe.y);
					var distB = b.distTo(aoe.x, aoe.y);
					return distA - distB;
				};
		}
		targets = targets.sort(sortFunction);
	
		// Apply target limit
		if (limit > 0 && limit < targets.length) {
			targets = targets.slice(0, limit);
		}
	
		// Add targets to the AoE action queue
		targets.forEach(target => {
			this.addAreaTarget({
				item: skill.item(),
				event: target
			});
		});
	
		return true;
	};					

	// work through the queue of actions
	var _srpgAfterAction = Scene_Map.prototype.srpgAfterAction;
	Scene_Map.prototype.srpgAfterAction = function() {
		var actionArray = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId());

		if (actionArray[1].canMove() && $gameTemp.areaTargets().length > 0) {
			this.srpgBattlerDeadAfterBattle();
			var nextaction = $gameTemp.areaTargets().shift();

			// Check if nextaction and nextaction.item are valid before accessing
			if (nextaction && nextaction.item) {
				actionArray[1].srpgMakeNewActions();
				actionArray[1].action(0).setItemObject(nextaction.item);
				var targetArray = $gameSystem.EventToUnit(nextaction.event.eventId());
				$gameTemp.setTargetEvent(nextaction.event);
				$gameTemp.setSrpgDistance($gameSystem.unitDistance($gameTemp.activeEvent(), nextaction.event));//shoukang refresh distance

				if (_refocus) {
					$gameTemp.setAutoMoveDestinationValid(true);
					$gameTemp.setAutoMoveDestination($gameTemp.targetEvent().posX(), $gameTemp.targetEvent().posY());
				}
				$gameTemp.setShouldPayCost(false);
				$gameSystem.setSubBattlePhase('invoke_action');
				this.srpgBattleStart(actionArray, targetArray);
			} else {
				// Handle the case where nextaction or nextaction.item is invalid
				console.error("Invalid nextaction or missing item.");
				$gameTemp.clearArea();
				$gameTemp.clearAreaTargets();
				$gameTemp.setShouldPayCost(true);
				_srpgAfterAction.call(this);
			}
		} else {
			$gameTemp.clearArea();
			$gameTemp.clearAreaTargets();
			$gameTemp.setShouldPayCost(true);
			_srpgAfterAction.call(this);
		}
	};


	// override this to allow the AI to use fancy AoEs
	Game_System.prototype.srpgAIUnderstandsAoE = false;

	// AoE skills can be used as long as you're in the targeted area
	var _canUse = Game_BattlerBase.prototype.canUse;
	Game_BattlerBase.prototype.canUse = function(item) {
		if (item && $gameSystem.isSRPGMode() && this._srpgActionTiming != 1 &&
		Number(item.meta.srpgAreaRange) > 0) {
			// stop default AI from using AoEs with holes
			if (!$gameSystem.srpgAIUnderstandsAoE &&
			$gameSystem.isBattlePhase() !== "actor_phase" &&
			Number(item.meta.srpgAreaMinRange) > 0) {
				return false;
			}

			if ($gameSystem.isSubBattlePhase() === 'invoke_action' ||
			$gameSystem.isSubBattlePhase() === 'auto_actor_action' ||
			$gameSystem.isSubBattlePhase() === 'enemy_action' ||
			$gameSystem.isSubBattlePhase() === 'battle_window') {
				return $gameTemp.inArea($gameTemp.targetEvent()) || item.meta.cellTarget; //shoukang edit: check cellTarget tag
			}
		}
		return _canUse.call(this, item);
	};

	var _srpgBattle_isEnabled = Window_SrpgBattle.prototype.isEnabled;
	Window_SrpgBattle.prototype.isEnabled = function(item) {
		if (item && Number(item.meta.srpgAreaRange) > 0) {
			return this._actor && this._actor.canUse(item);
		}
		return _srpgBattle_isEnabled.call(this, item);
	};

//====================================================================
// Sprite_SrpgAoE
//====================================================================

	window.Sprite_SrpgAoE = function() {
		this.initialize.apply(this, arguments);
	};

	Sprite_SrpgAoE.prototype = Object.create(Sprite.prototype);
	Sprite_SrpgAoE.prototype.constructor = Sprite_SrpgAoE;

	Sprite_SrpgAoE.prototype.initialize = function() {
		Sprite.prototype.initialize.call(this);
		this.anchor.x = 0.5;
		this.anchor.y = 0.5;
		this._frameCount = 0;
		this._posX = -1;
		this._posY = -1;
		this.z = 0;
		this.visible = false;
	};

	Sprite_SrpgAoE.prototype.isActive = function() {
		return this._posX >= 0 && this._posY >= 0;
	};

	Sprite_SrpgAoE.prototype.update = function() {
		Sprite.prototype.update.call(this);
		if (this.isActive()){
			this.updatePosition();
			this.updateAnimation();
			this.visible = true;
		} else {
			this.visible = false;
		}
	};

	Sprite_SrpgAoE.prototype.setAoE = function(x, y, size, minSize, type, dir) {
		this._posX = x;
		this._posY = y;
		this.blendMode = Graphics.BLEND_ADD;

		if (this._size != size || this._minSize != minSize || this._type != type || this._dir != dir) {
			this._size = size;
			this._type = type;
			this._dir = dir;
			this.redrawArea(size, minSize, type, dir);
		}
	};

	//modified aoe los logic===
	Sprite_SrpgAoE.prototype.redrawArea = function(size, minSize, type, dir) {
        var tileWidth = $gameMap.tileWidth();
        var tileHeight = $gameMap.tileHeight();
        this.bitmap = new Bitmap(tileWidth * (1 + size * 2), tileHeight * (1 + size * 2));
    
        var aoe = $gameTemp._activeAoE;
        if (!aoe) return;
    
        aoe.visibleTiles.forEach(tile => {
            var dx = tile.x - aoe.x + size;
            var dy = tile.y - aoe.y + size;
            this.drawCell(this.bitmap, dx * tileWidth, dy * tileHeight, tileWidth, tileHeight, _areaColor);
        });
    
        aoe.blockedTiles.forEach(tile => {
            // Do not draw blocked tiles
        });
    };
    
	
	Sprite_SrpgAoE.prototype.drawCell = function(bitmap, x, y, tileWidth, tileHeight, color) {
		bitmap.fillRect(x, y, tileWidth, tileHeight, color);
	};
	

	Sprite_SrpgAoE.prototype.drawCell = function(bitmap, x, y, tileWidth, tileHeight) {
		bitmap.fillRect(x, y, tileWidth, tileHeight, _areaColor);
	};

	Sprite_SrpgAoE.prototype.clearArea = function() {
		this._posX = -1;
		this._posY = -1;
	};

	Sprite_SrpgAoE.prototype.updatePosition = function() {
		var tileWidth = $gameMap.tileWidth();
		var tileHeight = $gameMap.tileHeight();
		this.x = ($gameMap.adjustX(this._posX) + 0.5) * tileWidth;
		this.y = ($gameMap.adjustY(this._posY) + 0.5) * tileHeight;
	};

	Sprite_SrpgAoE.prototype.updateAnimation = function() {
		this._frameCount++;
		this._frameCount %= 40;
		this.opacity = (40 - this._frameCount) * 3;
	};

//====================================================================
// Spriteset_Map
//====================================================================

	// add the AoE sprite to the list
	var _Spriteset_Map_createTilemap = Spriteset_Map.prototype.createTilemap;
	Spriteset_Map.prototype.createTilemap = function() {
		_Spriteset_Map_createTilemap.call(this);
		this._srpgAoE = new Sprite_SrpgAoE();
		this._tilemap.addChild(this._srpgAoE);
	};

	var _Spriteset_Map_update = Spriteset_Map.prototype.update;
	Spriteset_Map.prototype.update = function() {
		_Spriteset_Map_update.call(this);
		if ($gameSystem.isSRPGMode()) {
			this.updateSrpgAoE();
		}
	};

	// refresh the AoE sprite
	Spriteset_Map.prototype.updateSrpgAoE = function() {
		var aoe = $gameTemp._activeAoE;
		if (aoe) {
			this._srpgAoE.setAoE(aoe.x, aoe.y, aoe.size, aoe.minSize, aoe.shape, aoe.dir);
		} else {
			this._srpgAoE.clearArea();
		}
	};

})();
