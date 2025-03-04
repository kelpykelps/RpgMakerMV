/*:
 * @plugindesc SRPG Skill and AoE Range Mastery Plugin – Adjusts both skill range and AoE range based on mastery level.
 *
 * <SrpgRangeMastery>
 *
 * @help
 * This plugin adjusts the effective range of SRPG skills based on an actor's mastery level.
 *
 * Note Tags for skills:
 *   <srpgRange:x>              Base range for the skill.
 *   <modifySkillRange:Req,Inc>  Increase range by Inc if mastery level is at least Req.
 *   <srpgAreaRange:x>          Base AoE range for the skill.
 *   <modifySkillAreaRange:Req,Inc>
 *                              Increase AoE range by Inc if mastery level is at least Req.
 *
 * Example:
 *   <srpgRange:3>
 *   <modifySkillRange:4,1>
 *   <srpgAreaRange:2>
 *   <modifySkillAreaRange:3,2>
 *
 * In this example, the skill’s base range is 3 (increased by 1 when mastery ≥4),
 * and the base AoE range is 2 (increased by 2 when mastery ≥3).
 *
 * Ensure your actors have a method `skillMasteryLevel(skillId)` that returns their mastery level.
 * This plugin also overrides the default AoE range getter so that the mastery-based increase applies.
 *
 * Terms of Use:
 * Free for commercial and non-commercial projects with credit.
 */

(function() {
    "use strict";

    // Calculate effective skill range based on mastery level.
    function calculateSkillRange(skill, user) {
        var baseRange = skill.meta.srpgRange ? Number(skill.meta.srpgRange) : 1;
        if (skill.meta.modifySkillRange) {
            var parts = skill.meta.modifySkillRange.split(',');
            var reqMastery = Number(parts[0]);
            var inc = Number(parts[1]);
            if (user.skillMasteryLevel(skill.id) >= reqMastery) {
                baseRange += inc;
            }
        }
        return baseRange;
    }

    // Calculate effective AoE range based on mastery level.
    function calculateSkillAreaRange(skill, user) {
        var baseAreaRange = skill.meta.srpgAreaRange ? Number(skill.meta.srpgAreaRange) : 0;
        if (skill.meta.modifySkillAreaRange) {
            var parts = skill.meta.modifySkillAreaRange.split(',');
            var reqMastery = Number(parts[0]);
            var inc = Number(parts[1]);
            if (user.skillMasteryLevel(skill.id) >= reqMastery) {
                baseAreaRange += inc;
            }
        }
        return baseAreaRange;
    }

    // Extend Game_Actor to override SRPG skill range.
    Game_Actor.prototype.srpgSkillRange = function(skill) {
        if (!skill) return 1;
        var range = calculateSkillRange(skill, this);
        // Special handling if the note tag is set to -1 (weapon-based range)
        if (skill.meta.srpgRange == -1) {
            if (!this.hasNoWeapons()) {
                var weapon = this.weapons()[0];
                if (weapon && weapon.meta.weaponRange) {
                    range = Number(weapon.meta.weaponRange);
                }
                // Add any range bonus from states or armors.
                this.states().forEach(function(state) {
                    if (state.meta.srpgWRangePlus) {
                        range += Number(state.meta.srpgWRangePlus);
                    }
                });
                this.armors().forEach(function(armor) {
                    if (armor.meta.srpgWRangePlus) {
                        range += Number(armor.meta.srpgWRangePlus);
                    }
                });
            }
        }
        return range;
    };

    // Extend Game_Actor to override SRPG AoE range.
    Game_Actor.prototype.srpgSkillAreaRange = function(skill) {
        if (!skill) return 0;
        return calculateSkillAreaRange(skill, this);
    };

    // Extend Game_Enemy to override SRPG skill range.
    Game_Enemy.prototype.srpgSkillRange = function(skill) {
        if (!skill) return 1;
        var range = calculateSkillRange(skill, this);
        if (skill.meta.srpgRange == -1) {
            if (!this.hasNoWeapons()) {
                var weapon = $dataWeapons[Number(this.enemy().meta.srpgWeapon)];
                if (weapon && weapon.meta.weaponRange) {
                    range = Number(weapon.meta.weaponRange);
                }
            } else {
                range = Number(this.enemy().meta.weaponRange);
            }
            this.states().forEach(function(state) {
                if (state.meta.srpgWRangePlus) {
                    range += Number(state.meta.srpgWRangePlus);
                }
            });
        }
        return range;
    };

    // Extend Game_Enemy to override SRPG AoE range.
    Game_Enemy.prototype.srpgSkillAreaRange = function(skill) {
        if (!skill) return 0;
        return calculateSkillAreaRange(skill, this);
    };

    // Add (or ensure) the skillMasteryLevel method for actors.
    if (!Game_Actor.prototype.skillMasteryLevel) {
        Game_Actor.prototype.skillMasteryLevel = function(skillId) {
            return this._skillMasteryLevels ? this._skillMasteryLevels[skillId] || 0 : 0;
        };
    }

    // Initialize mastery levels for each actor.
    var _Game_Actor_initMembers = Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function() {
        _Game_Actor_initMembers.call(this);
        this._skillMasteryLevels = {};
    };

    // Convenience functions for SRPG systems to fetch ranges.
    Game_System.prototype.srpgUnitSkillRange = function(userUnit, skillId) {
        var skill = $dataSkills[skillId];
        var user = userUnit[1];
        return user.srpgSkillRange(skill);
    };

    Game_System.prototype.srpgUnitSkillAreaRange = function(userUnit, skillId) {
        var skill = $dataSkills[skillId];
        var user = userUnit[1];
        return user.srpgSkillAreaRange(skill);
    };

    // Override Game_Action's area method to use mastery-modified AoE range.
    Game_Action.prototype.area = function() {
        if (this.item()) {
            var user = this.subject();
            return calculateSkillAreaRange(this.item(), user);
        }
        return 0;
    };

    // (Optional) Override minArea if desired; this example leaves it unchanged.
    Game_Action.prototype.minArea = function() {
        if (this.item()) return Number(this.item().meta.srpgAreaMinRange) || 0;
        return 0;
    };

    // The rest of your AoE and LOS functions can remain unchanged.
    // (For example, any existing Game_Action, Game_Map, or Game_CharacterBase modifications for AoE remain as is.)

})();
