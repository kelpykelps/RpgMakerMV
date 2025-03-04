/*:
 * @plugindesc Cover System Plugin – Evaluates cover by checking adjacent tiles to the defender. If a cover tile (region 11, 12, or 13) is located between the attacker and defender, bonus modifiers are applied: Region 11 (def –10%, eva +5%, attacker hit –10%), Region 12 (def –15%, eva +7%, attacker hit –15%), Region 13 (def –20%, eva +10%, attacker hit –20%). Also prevents movement endpoints on cover tiles.
 * @author 
 *
 * @help
 * This plugin uses a cover system where if a defender has a cover tile adjacent
 * to it (in the direction of the attacker), the defender gains bonuses and the attacker’s hit is reduced.
 *
 * The cover tile must be one of the eight tiles immediately around the defender.
 * For each adjacent tile that is marked as cover (region 11, 12, or 13), the angle
 * between:
 *
 *   A = (defender – attacker)
 *   C = (defender – candidate cover tile)
 *
 * is computed. If the dot product (of their normalized vectors) is greater than 0.7,
 * then that candidate is considered to be “in between.” If more than one qualifies,
 * the one with the highest dot product is used.
 *
 * The following bonuses are applied when cover is active:
 *   Region 11: Damage × 0.90, Evasion × 1.05, Attacker Hit × 0.90.
 *   Region 12: Damage × 0.85, Evasion × 1.07, Attacker Hit × 0.85.
 *   Region 13: Damage × 0.80, Evasion × 1.10, Attacker Hit × 0.80.
 *
 * Also, units cannot end their movement on a tile with region 11, 12, or 13.
 *
 * There are no plugin commands.
 */

(function(){
    "use strict";
    
    //--------------------------------------------------------------------------
    // Cover Bonus Definitions
    // Each cover region defines:
    //   defense: damage reduction factor (e.g. 0.10 means 10% less damage)
    //   evasion: bonus to defender's eva (e.g. 0.05 means eva multiplied by 1.05)
    //   attacker: reduction to attacker's hit (e.g. 0.10 means 10% lower hit rate)
    var coverBonuses = {
        11: { defense: 0.10, evasion: 0.05, attacker: 0.10 },
        12: { defense: 0.15, evasion: 0.07, attacker: 0.15 },
        13: { defense: 0.20, evasion: 0.10, attacker: 0.20 }
    };
    
    /**
     * Evaluates cover by checking each tile adjacent to the defender.
     * The function computes the normalized vector A from attacker to defender.
     * For each adjacent candidate tile, it computes the normalized vector C from that tile to the defender.
     * If the dot product (A · C) is above 0.7 (i.e. angle less than about 45°), then that candidate is considered
     * to be "in between." If multiple qualify, the one with the highest dot product is used.
     * 
     * @param {Number} atkX - Attacker's X coordinate.
     * @param {Number} atkY - Attacker's Y coordinate.
     * @param {Number} defX - Defender's X coordinate.
     * @param {Number} defY - Defender's Y coordinate.
     * @returns {Object} Bonus object {defense, evasion, attacker} or zeros if none.
     */
    function getCoverBonus(atkX, atkY, defX, defY) {
        var vecA = { x: defX - atkX, y: defY - atkY };
        var magA = Math.sqrt(vecA.x * vecA.x + vecA.y * vecA.y);
        if (magA === 0) return { defense: 0, evasion: 0, attacker: 0 };
        var normA = { x: vecA.x / magA, y: vecA.y / magA };
        
        // Define the eight adjacent offsets
        var offsets = [
            { x: -1, y: -1 },
            { x:  0, y: -1 },
            { x:  1, y: -1 },
            { x: -1, y:  0 },
            { x:  1, y:  0 },
            { x: -1, y:  1 },
            { x:  0, y:  1 },
            { x:  1, y:  1 }
        ];
        
        var bestDot = 0;
        var bestBonus = { defense: 0, evasion: 0, attacker: 0 };
        for (var i = 0; i < offsets.length; i++) {
            var cx = defX + offsets[i].x;
            var cy = defY + offsets[i].y;
            var region = $gameMap.regionId(cx, cy);
            if (coverBonuses[region]) {
                // Compute vector from candidate cover tile to defender
                var vecC = { x: defX - cx, y: defY - cy };
                var magC = Math.sqrt(vecC.x * vecC.x + vecC.y * vecC.y);
                if (magC === 0) continue;
                var normC = { x: vecC.x / magC, y: vecC.y / magC };
                var dot = normA.x * normC.x + normA.y * normC.y;
                console.log("[Cover System] Checking cover at (" + cx + ", " + cy + ") with dot = " + dot.toFixed(2) + " (region " + region + ").");
                if (dot > 0.7 && dot > bestDot) {
                    bestDot = dot;
                    bestBonus = coverBonuses[region];
                }
            }
        }
        if (bestDot > 0.7) {
            console.log("[Cover System] Applying cover bonus: Defense -" + (bestBonus.defense * 100) + "%, Evasion +" + (bestBonus.evasion * 100) + "%, Attacker Hit -" + (bestBonus.attacker * 100) + "%.");
            return bestBonus;
        } else {
            console.log("[Cover System] No adjacent cover tile found in the correct direction.");
            return { defense: 0, evasion: 0, attacker: 0 };
        }
    }
    
    //--------------------------------------------------------------------------
    // Override evalDamageFormula – apply cover defense bonus.
    var _Game_Action_evalDamageFormula = Game_Action.prototype.evalDamageFormula;
    Game_Action.prototype.evalDamageFormula = function(target) {
        var value = _Game_Action_evalDamageFormula.call(this, target);
        if ($gameTemp.activeEvent() && $gameTemp.targetEvent()) {
            var atkX = $gameTemp.activeEvent().posX();
            var atkY = $gameTemp.activeEvent().posY();
            var defX = $gameTemp.targetEvent().posX();
            var defY = $gameTemp.targetEvent().posY();
            var bonus = getCoverBonus(atkX, atkY, defX, defY);
            if (bonus.defense > 0) {
                console.log("[Cover System] Original damage: " + value);
                value *= (1 - bonus.defense);
                console.log("[Cover System] Damage after cover defense (" + (bonus.defense * 100) + "% reduction): " + value);
            }
        }
        return value;
    };
    
    //--------------------------------------------------------------------------
    // Override itemHit – reduce the attacker's hit rate.
    var _Game_Action_itemHit = Game_Action.prototype.itemHit;
    Game_Action.prototype.itemHit = function(target) {
        var value = _Game_Action_itemHit.call(this, target);
        if ($gameTemp.activeEvent() && $gameTemp.targetEvent()) {
            var atkX = $gameTemp.activeEvent().posX();
            var atkY = $gameTemp.activeEvent().posY();
            var defX = $gameTemp.targetEvent().posX();
            var defY = $gameTemp.targetEvent().posY();
            var bonus = getCoverBonus(atkX, atkY, defX, defY);
            if (bonus.attacker > 0) {
                console.log("[Cover System] Original attacker hit rate: " + value);
                value *= (1 - bonus.attacker);
                console.log("[Cover System] Attacker hit rate after cover reduction (" + (bonus.attacker * 100) + "% reduction): " + value);
            }
        }
        return value;
    };
    
    //--------------------------------------------------------------------------
    // Override itemEva – boost the defender's evasion.
    var _Game_Action_itemEva = Game_Action.prototype.itemEva;
    Game_Action.prototype.itemEva = function(target) {
        var value = _Game_Action_itemEva.call(this, target);
        if ($gameTemp.activeEvent() && $gameTemp.targetEvent()) {
            var atkX = $gameTemp.activeEvent().posX();
            var atkY = $gameTemp.activeEvent().posY();
            var defX = $gameTemp.targetEvent().posX();
            var defY = $gameTemp.targetEvent().posY();
            var bonus = getCoverBonus(atkX, atkY, defX, defY);
            if (bonus.evasion > 0) {
                console.log("[Cover System] Original evasion: " + value);
                value *= (1 + bonus.evasion);
                console.log("[Cover System] Evasion after cover bonus (+" + (bonus.evasion * 100) + "%): " + value);
            }
        }
        return value;
    };
    
    //--------------------------------------------------------------------------
    // Movement Restriction – Prevent units from ending their movement on cover tiles.
    var _Game_Map_isValidDestination = Game_Map.prototype.isValidDestination;
    Game_Map.prototype.isValidDestination = function(x, y) {
        var region = this.regionId(x, y);
        if (coverBonuses[region]) {
            console.log("[Cover System] Tile (" + x + ", " + y + ") is a cover tile (region " + region + ") and cannot be selected as a destination.");
            return false;
        }
        return _Game_Map_isValidDestination.call(this, x, y);
    };
    
})();
