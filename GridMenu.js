/*:
 * @plugindesc Grid-Based Customizable Icon Menu with Custom Grid Variables, Script Triggers, and a Description Window - v1.2.1
 * @author ChatGPT
 *
 * @param GridWidth
 * @type number
 * @min 1
 * @desc Virtual number of columns in the grid.
 * @default 4
 *
 * @param GridHeight
 * @type number
 * @min 1
 * @desc Virtual number of rows in the grid.
 * @default 3
 *
 * @param ShowGridMenu
 * @type boolean
 * @desc Set to true to display the Grid Menu command in the Main Menu; false to hide it.
 * @default true
 *
 * @param DebugMode
 * @type boolean
 * @desc Set to true to enable extensive debug logging in the console.
 * @default false
 *
 * @param Decription_Font_Size
 * @type number
 * @desc font size for description tab
 * @default 18
 * 
 * @param grid_Var_1
 * @type number
 * @desc Game variable id for custom grid variable 1 (set to 0 to disable).
 * @default 0
 *
 * @param grid_Var_2
 * @type number
 * @desc Game variable id for custom grid variable 2 (set to 0 to disable).
 * @default 0
 *
 * @param grid_Var_3
 * @type number
 * @desc Game variable id for custom grid variable 3 (set to 0 to disable).
 * @default 0
 *
 * @param grid_Var_4
 * @type number
 * @desc Game variable id for custom grid variable 4 (set to 0 to disable).
 * @default 0
 *
 * @param grid_Var_5
 * @type number
 * @desc Game variable id for custom grid variable 5 (set to 0 to disable).
 * @default 0
 *
 * @param grid_Var_6
 * @type number
 * @desc Game variable id for custom grid variable 6 (set to 0 to disable).
 * @default 0
 *
 * @param grid_Var_7
 * @type number
 * @desc Game variable id for custom grid variable 7 (set to 0 to disable).
 * @default 0
 *
 * @param Icons
 * @type struct<Icon>[]
 * @desc Configure icons with grid positions, conditions, names, descriptions, and scripts.
 * @default []
 * 
 * @param Backgrounds
 * @type struct<Background>[]
 * @desc An array of backgrounds to display behind the grid menu. Each background can have a condition switch.
 * @default []
 *
 * @help
 * This plugin creates a grid-based menu where each cell displays an icon from the system IconSet.
 * Each icon is active only if its required switches are ON and if, for each custom grid variable 
 * (grid_Var_1 to grid_Var_7), the corresponding game variable’s value meets the required threshold 
 * (set in Required_Val_1 … Required_Val_7). Otherwise, the icon is locked.
 *
 * When an active icon is clicked:
 *   • An OK sound is played.
 *   • Its script is executed (if provided).
 *   • For single-trigger icons, its state is marked so that a TriggeredIcon is displayed.
 *
 * If an icon is locked, a cancel sound is played.
 *
 * Additionally, a description window appears below the grid. If an icon’s "Description" field is filled,
 * the text will be displayed in the description window when the mouse hovers over that icon.
 *
 * ----------------------------------------------------------------------------
 * SceneManager.push(Scene_GridMenu);//open grid menu theough script
 * ----------------------------------------------------------------------------
 * Example Script Calls (enter these in an icon’s "Script" field):
 *
 * 1. Open the Item Scene:
 *    SceneManager.push(Scene_Item);
 *
 * 2. Reserve Common Event (ID 2):
 *    $gameTemp.reserveCommonEvent(2);
 *
 * 3. Log a Message:
 *    console.log("Grid Icon Clicked!");
 *
 * 4. Increase Gold by 10000:
 *    $gameParty.gainGold(10000);
 *
 * 5. Increment Game Variable 1 by 1:
 *    $gameVariables.setValue(1, $gameVariables.value(1) + 1);
 *
 * You can use any valid JavaScript code in the Script field.
 */
/*~struct~Icon:
 * @param IconIndex
 * @type number
 * @desc The icon index for the normal state.
 *
 * @param LockedIcon
 * @type number
 * @desc The icon index to display when the icon is locked. Use -1 to ignore.
 * @default -1
 *
 * @param TriggeredIcon
 * @type number
 * @desc The icon index to display after a single-trigger icon has been activated. Use -1 to ignore.
 * @default -1
 *
 * @param TriggerType
 * @type select
 * @option Single
 * @option Multiple
 * @desc "Single" triggers once and then displays TriggeredIcon; "Multiple" can be triggered repeatedly.
 * @default Multiple
 *
 * @param X
 * @type number
 * @desc Grid X position (0-based).
 *
 * @param Y
 * @type number
 * @desc Grid Y position (0-based).
 *
 * @param Switches
 * @type switch[]
 * @desc The switches that must be ON for this icon to be active.
 *
 * @param Name
 * @type string
 * @desc The name to display above the icon.
 *
 * @param Description
 * @type note
 * @desc A description to display in the description window when hovering over this icon.
 * @default
 *
 * @param Required_Val_1
 * @type number
 * @desc If grid_Var_1 is set, this is the required value.
 *
 * @param Required_Val_2
 * @type number
 * @desc If grid_Var_2 is set, this is the required value.
 *
 * @param Required_Val_3
 * @type number
 * @desc If grid_Var_3 is set, this is the required value.
 *
 * @param Required_Val_4
 * @type number
 * @desc If grid_Var_4 is set, this is the required value.
 *
 * @param Required_Val_5
 * @type number
 * @desc If grid_Var_5 is set, this is the required value.
 *
 * @param Required_Val_6
 * @type number
 * @desc If grid_Var_6 is set, this is the required value.
 *
 * @param Required_Val_7
 * @type number
 * @desc If grid_Var_7 is set, this is the required value.
 *
 * @param Script
 * @type note
 * @desc A JavaScript code snippet to be executed when the icon is selected.
 * @default 
 */
/*~struct~Background:
 * @param FileName
 * @type file
 * @dir img/pictures/
 * @desc The background picture file to use.
 *
 * @param SwitchId
 * @type number
 * @desc The switch id that must be ON for this background to be active (set to 0 if always active).
 * @default 0
 */

(function() {
    "use strict";
    
    // ------------------------------------------------------------------------
    // Global mouse tracking for hover detection.
    // ------------------------------------------------------------------------
    window.GridMenu = window.GridMenu || {};
    GridMenu.mouseX = 0;
    GridMenu.mouseY = 0;
    document.addEventListener('mousemove', function(e) {
        // Get the canvas' bounding rectangle.
        var rect = Graphics._canvas.getBoundingClientRect();
        // Convert the mouse coordinates to canvas coordinates.
        GridMenu.mouseX = (e.clientX - rect.left) * (Graphics.boxWidth / rect.width);
        GridMenu.mouseY = (e.clientY - rect.top) * (Graphics.boxHeight / rect.height);
        if (window.GridMenuDebug && GridMenuDebug) {
            console.log("Mouse moved:", GridMenu.mouseX, GridMenu.mouseY);
        }
    });
    
    
    // ------------------------------------------------------------------------
    // Extend Game_System to initialize _gridMenuTriggered when a new game starts.
    // ------------------------------------------------------------------------
    var _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._gridMenuTriggered = {};
        console.log("Game_System: _gridMenuTriggered initialized.");
    };
    
    // Plugin version for tracking changes.
    var pluginVersion = "1.2.1";
    
    // Retrieve plugin parameters.
    var parameters = PluginManager.parameters('GridMenu');
    var gridWidth = Number(parameters['GridWidth'] || 4);
    var gridHeight = Number(parameters['GridHeight'] || 3);
    var showGridMenu = String(parameters['ShowGridMenu']).toLowerCase() === "true";
    var debugMode = String(parameters['DebugMode'] || "false").toLowerCase() === "true";
    var _description_font = Number(parameters['Decription_Font_Size'] || 18);
    
    if (debugMode) {
        console.log("GridMenu Plugin v" + pluginVersion + " initializing...");
        console.log("Parameters:", {
            gridWidth: gridWidth,
            gridHeight: gridHeight,
            showGridMenu: showGridMenu,
            debugMode: debugMode
        });
    }
    
    // Map custom grid variable IDs (grid_Var_1 ... grid_Var_7)
    var gridVarMapping = [];
    for (var i = 1; i <= 7; i++) {
        gridVarMapping[i] = Number(parameters['grid_Var_' + i] || 0);
    }
    
    // Parse the Icons parameter.
    var icons = [];
    try {
        icons = JSON.parse(parameters['Icons'] || '[]').map(function(e) {
            return JSON.parse(e);
        });
        if (debugMode) {
            console.log("Parsed icons:", icons);
        }
    } catch (e) {
        console.error("GridMenu Plugin: Failed to parse Icons parameter", e);
        icons = [];
    }
    
    // ==========================================================================
    // New Window_GridDescription Class – shows icon descriptions on hover.
    // ==========================================================================
    function Window_GridDescription() {
        this.initialize.apply(this, arguments);
    }

    Window_GridDescription.prototype.standardFontColor = function() {
        return this.textColor(0); // typically dark color; change if needed
    };
    
    Window_GridDescription.prototype = Object.create(Window_Base.prototype);
    Window_GridDescription.prototype.constructor = Window_GridDescription;
    Window_GridDescription.prototype.initialize = function(x, y, width, height) {
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this._text = "";
        this.backOpacity = 255;  // Fully opaque background (hides the background image behind)
        this.refresh();
        if (debugMode) {
            console.log("Window_GridDescription initialized at", x, y, width, height);
        }
    };

    Window_GridDescription.prototype.standardFontSize = function() {
        return _description_font; // Adjust this value to set the desired text size
    };
    
    Window_GridDescription.prototype.setText = function(text) {
        if (this._text !== text) {
            this._text = text;
            if (debugMode) {
                console.log("Window_GridDescription setText:", text);
            }
            this.refresh();
        }
    };
    Window_GridDescription.prototype.refresh = function() {
        this.contents.clear();
        if (this._text) {
            // Normalize any CRLF to LF
            var formattedText = this._text.replace(/\r\n/g, "\n");
            
            // Replace the <br> token with an actual newline
            formattedText = formattedText.replace(/<br>/gi, "\n");
            
            // Check if the text is wrapped in quotes and remove them
            if (formattedText.length >= 2 &&
                formattedText.charAt(0) === '"' &&
                formattedText.charAt(formattedText.length - 1) === '"') {
                formattedText = formattedText.slice(1, -1);
            }
            
            // Now draw the text—drawTextEx already supports newlines.
            this.drawTextEx(this.convertEscapeCharacters(formattedText), 0, 0);
        }
    };
    
    // ==========================================================================
    // Scene_GridMenu
    // ==========================================================================
    function Scene_GridMenu() {
        this.initialize.apply(this, arguments);
    }
    Scene_GridMenu.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_GridMenu.prototype.constructor = Scene_GridMenu;
    
    Scene_GridMenu.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
        if (debugMode) {
            console.log("Scene_GridMenu initialized.");
        }
    };
    
    Scene_GridMenu.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite();
        // Add at index 0 so it’s at the back of the scene’s display list.
        this.addChildAt(this._backgroundSprite, 0);
        this.loadBackgroundImage();
    };    
    
    Scene_GridMenu.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        
        // No need to create a background sprite here, since createBackground is already overridden.
        // Create the grid menu window.
        this._gridWindow = new Window_GridMenu();
        this._gridWindow.x = 0; // Align at the left edge of the screen
        this.addWindow(this._gridWindow);
        
        // Create the description window.
        this.createDescriptionWindow();
    };   
    
    Scene_GridMenu.prototype.loadBackgroundImage = function() {
        // Get the backgrounds parameter (assuming you parsed it similarly to your Icons).
        var bgData = [];
        try {
            bgData = JSON.parse(PluginManager.parameters('GridMenu')['Backgrounds'] || '[]').map(function(e) {
                return JSON.parse(e);
            });
        } catch (e) {
            console.error("GridMenu Plugin: Failed to parse Backgrounds parameter", e);
            bgData = [];
        }
    
        // Determine which background to load based on the switch conditions.
        var fileNameToLoad = "";
        for (var i = 0; i < bgData.length; i++) {
            var bg = bgData[i];
            var switchId = Number(bg.SwitchId || 0);
            // If SwitchId is 0, treat it as always active.
            if (switchId === 0 || $gameSwitches.value(switchId)) {
                fileNameToLoad = bg.FileName;
                break; // use the first background that meets the condition
            }
        }
        
        // If no background was chosen, you might set a default image or simply leave it blank.
        if (fileNameToLoad) {
            this._backgroundSprite.bitmap = ImageManager.loadPicture(fileNameToLoad);
        }
    };    
    
    Scene_GridMenu.prototype.createDescriptionWindow = function() {
        var ww = Graphics.boxWidth;   // use the full screen width
        var wh = 128;                 // desired height for the description window
        var wx = 0;                   // aligned to left edge
        var wy = Graphics.boxHeight - wh; // anchored to the bottom of the screen
        this._descWindow = new Window_GridDescription(wx, wy, ww, wh);
        this.addWindow(this._descWindow);
    };
    
    Scene_GridMenu.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
    
        if (this._gridWindow && this._backgroundSprite) {
            this._backgroundSprite.x = -this._gridWindow.origin.x;
            this._backgroundSprite.y = -this._gridWindow.origin.y;
        }
    
        if (this._gridWindow && this._descWindow) {
            var hoveredIndex = this._gridWindow.getHoveredIndex();
            if (hoveredIndex >= 0) {
                var icon = icons[hoveredIndex];
                if (debugMode) {
                    console.log("Hovered icon index:", hoveredIndex, "with description:", icon.Description);
                }
                this._descWindow.setText(icon.Description || "");
            } else {
                this._descWindow.setText("");
            }
        }
    
        if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
            SoundManager.playCancel();
            SceneManager.pop();
            if (debugMode) {
                console.log("Scene_GridMenu canceled by user input.");
            }
        }
    };
        
    
    // ==========================================================================
    // Window_GridMenu
    // ==========================================================================
    function Window_GridMenu() {
        this.initialize.apply(this, arguments);
    }
    Window_GridMenu.prototype.standardPadding = function() {
        return 0;
    }
    Window_GridMenu.prototype = Object.create(Window_Selectable.prototype);
    Window_GridMenu.prototype.constructor = Window_GridMenu;
    Window_GridMenu.prototype.initialize = function() {
        this._itemWidth = 48;
        this._itemHeight = 48;
        this._virtualWidth = gridWidth * this._itemWidth;   // e.g. 4 * 48 = 192
        this._virtualHeight = gridHeight * this._itemHeight; // e.g. 3 * 48 = 144
        var wh = Graphics.boxHeight - 96; // leave space for the description window
    
        // Create the window using the grid’s virtual width (instead of Graphics.boxWidth)
        Window_Selectable.prototype.initialize.call(this, 0, 0, this._virtualWidth, wh);
        this.padding = 0; // Remove any default padding.
        this.origin = { x: 0, y: 0 };

        this.backOpacity = 10;

        this.refresh();
        this.activate();
        if (icons.length > 0) {
            this.select(0);
        }
        if (this._virtualHeight > this.height) {
            this._mouseWheelHandler = this.onWheel.bind(this);
            document.addEventListener('wheel', this._mouseWheelHandler);
        }
        if (debugMode) {
            console.log("Window_GridMenu initialized with virtual dimensions:", this._virtualWidth, this._virtualHeight);
        }
    };
    
    Window_GridMenu.prototype.destroy = function() {
        document.removeEventListener('wheel', this._mouseWheelHandler);
        Window_Selectable.prototype.destroy.call(this);
    };
    
    Window_GridMenu.prototype.contentsWidth = function() {
        return this._virtualWidth;
    };
    
    Window_GridMenu.prototype.contentsHeight = function() {
        return this._virtualHeight;
    };
    
    Window_GridMenu.prototype.itemWidth = function() {
        return this._itemWidth;
    };
    
    Window_GridMenu.prototype.itemHeight = function() {
        return this._itemHeight;
    };
    
    Window_GridMenu.prototype.maxItems = function() {
        return icons.length;
    };
    
    // Determine the cell rectangle for an icon based on its grid X and Y values.
    Window_GridMenu.prototype.itemRect = function(index) {
        if (index < 0 || index >= icons.length) {
            return new Rectangle(0, 0, this.itemWidth(), this.itemHeight());
        }
        var icon = icons[index];
        var x = Number(icon.X) * this.itemWidth();
        var y = Number(icon.Y) * this.itemHeight();
        return new Rectangle(x, y, this.itemWidth(), this.itemHeight());
    };
    
    // Return the index of the icon currently under the mouse pointer using our global mouse coordinates.
    Window_GridMenu.prototype.getHoveredIndex = function() {
        var mapping = this.getCellMapping();
        var x = GridMenu.mouseX - this.x;
        var y = GridMenu.mouseY - this.y;
        
        // Loop over each cell in our mapping.
        for (var key in mapping) {
            var cellData = mapping[key];
            var index = cellData.index;
            var rect = this.itemRect(index);
            // Adjust the rectangle to menu coordinates.
            var rectX = rect.x + this.x;
            var rectY = rect.y + this.y - this.origin.y;
            
            if (x >= rectX && x < rectX + rect.width &&
                y >= rectY && y < rectY + rect.height) {
                return index;
            }
        }
        return -1;
    };
             
    
    // Evaluate an icon’s conditions.
    // Checks required switches, custom grid variable requirements, and whether a single-trigger icon has already been triggered.
    // Returns: { active: true/false, state: "normal" or "triggered" }
    Window_GridMenu.prototype.evaluateIcon = function(icon, index) {
        var visible = true;
        var switchesOk = true;
        var hasSwitchCondition = false;
        try {
            var switchArr = JSON.parse(icon.Switches || '[]');
            if (switchArr.length > 0) {
                hasSwitchCondition = true;
            }
            switchesOk = switchArr.every(function(s) {
                return $gameSwitches.value(Number(s));
            });
        } catch (e) {
            console.error("GridMenu Plugin: Error parsing switches for icon", icon, e);
        }
        // If the icon has a switch condition and it isn’t met, do not show the icon at all.
        if (!switchesOk && hasSwitchCondition) {
            if (debugMode) { console.log("Icon", index, "not visible due to switch conditions."); }
            return { visible: false, active: false, state: "hidden" };
        }
        
        // Check grid variable conditions.
        for (var i = 1; i <= 7; i++) {
            var reqVal = icon["Required_Val_" + i];
            var gridVarId = gridVarMapping[i];
            if (gridVarId > 0 && reqVal !== "" && reqVal !== undefined) {
                if ($gameVariables.value(gridVarId) < Number(reqVal)) {
                    if (debugMode) { console.log("Icon", index, "failed grid variable condition:", gridVarId, reqVal); }
                    // Even if grid variables are not met, we still show the icon but mark it as locked.
                    return { visible: true, active: false, state: "locked" };
                }
            }
        }
        
        // Check if a single-trigger icon has already been activated.
        if (icon.TriggerType === "Single" && $gameSystem._gridMenuTriggered[index]) {
            if (debugMode) { console.log("Icon", index, "already triggered."); }
            return { visible: true, active: true, state: "triggered" };
        }
        
        return { visible: true, active: true, state: "normal" };
    };    
    
    // Refresh the grid window.
    // For each icon, determine which icon index to draw:
    // - If inactive and a LockedIcon is provided (>=0), use that.
    // - If active and a single-trigger icon has been triggered, use TriggeredIcon (if provided, >=0).
    // - Otherwise, use IconIndex.
    // Icons are drawn centered within their cell.
    Window_GridMenu.prototype.refresh = function() {
        this.createContents();
        this.contents.clear();
        var mapping = this.getCellMapping();
        
        for (var key in mapping) {
            var cellData = mapping[key];
            var index = cellData.index;
            var icon = icons[index];
            var evalResult = this.evaluateIcon(icon, index); // Should be visible per our mapping.
            
            // Decide which icon graphic to use.
            var iconIndexToDraw = Number(icon.IconIndex);
            if (!evalResult.active) {
                if (Number(icon.LockedIcon) >= 0) {
                    iconIndexToDraw = Number(icon.LockedIcon);
                }
            } else if (evalResult.state === "triggered") {
                if (Number(icon.TriggeredIcon) >= 0) {
                    iconIndexToDraw = Number(icon.TriggeredIcon);
                }
            }
            
            // Calculate the rectangle based on the icon’s grid position.
            var rect = this.itemRect(index);
            var offsetX = (this.itemWidth() - Window_Base._iconWidth) / 2;
            var offsetY = (this.itemHeight() - Window_Base._iconHeight) / 2;
            this.drawIcon(iconIndexToDraw, rect.x + offsetX, rect.y + offsetY);
            
            // Optionally, draw the icon's name above it.
            if (icon.Name) {
                var textWidth = this.textWidth(icon.Name);
                var textX = rect.x + (this.itemWidth() - textWidth) / 2;
                var textY = Math.max(rect.y - this.lineHeight(), 0);
                this.contents.drawText(icon.Name, textX, textY, textWidth, this.lineHeight(), 'center');
            }
        }
        
        if (debugMode) {
            console.log("Window_GridMenu refreshed at", Date.now());
        }
    };        
    
    // Draw an icon from the IconSet using canvas drawing functions.
    Window_GridMenu.prototype.drawIcon = function(iconIndex, x, y) {
        var bitmap = ImageManager.loadSystem('IconSet');
        var pw = Window_Base._iconWidth;
        var ph = Window_Base._iconHeight;
        var sx = (iconIndex % 16) * pw;
        var sy = Math.floor(iconIndex / 16) * ph;
        this.contents.blt(bitmap, sx, sy, pw, ph, x, y);
    };
    
    // Ensure the currently selected cell is visible.
    Window_GridMenu.prototype.ensureCursorVisible = function() {
        var rect = this.itemRect(this.index());
        var ox = rect.x - (this.width - rect.width) / 2;
        var oy = rect.y - (this.height - rect.height) / 2;
        if (ox < 0) ox = 0;
        if (oy < 0) oy = 0;
        var maxOriginY = Math.min(this.contentsHeight() - this.height, 30 * this._itemHeight);
        if (ox > this.contentsWidth() - this.width) {
            ox = this.contentsWidth() - this.width;
        }
        if (oy > maxOriginY) {
            oy = maxOriginY;
        }
        this.origin.x = ox;
        this.origin.y = oy;
    };
    
    // Apply the current scroll origin to the window’s contents.
    Window_GridMenu.prototype._refreshScroll = function() {
        if (this.contents) {
            this.contents.x = -this.origin.x;
            this.contents.y = -this.origin.y;
        }
    };
    
    Window_GridMenu.prototype.updateCursor = function() {
        Window_Selectable.prototype.updateCursor.call(this);
        this.ensureCursorVisible();
    };
    
    // Update: process mouse clicks, refresh the window, then reapply the scroll.
    Window_GridMenu.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        this.processMouseClick();
        
        var hoveredIndex = this.getHoveredIndex();
        if (hoveredIndex !== this._lastHoveredIndex) {
            this._lastHoveredIndex = hoveredIndex;
            this.callUpdateHelp(); // Update the help window
        }
    
        this.refresh();
        this._refreshScroll();
    };
    
    Window_GridMenu.prototype.callUpdateHelp = function() {
        if (this._helpWindow) {
            var index = this.getHoveredIndex();
            if (index >= 0 && index < icons.length) {
                this._helpWindow.setText(icons[index].Description || "");
            } else {
                this._helpWindow.setText("");
            }
        }
    }

    Window_GridMenu.prototype.getCellMapping = function() {
        var mapping = {}; // Key: "X,Y" (for example "2,2"); Value: an object with icon index and a flag for switch-based icon.
        
        icons.forEach((icon, index) => {
            // Evaluate the icon. (This uses your modified evaluateIcon function that returns an object with a "visible" property.)
            var evalResult = this.evaluateIcon(icon, index);
            if (!evalResult.visible) return; // Skip icons that shouldn’t be shown.
            
            var key = icon.X + "," + icon.Y;
            
            // Determine if this icon is “switch based” by checking if its Switches parameter is non-empty.
            var isSwitchIcon = false;
            try {
                var swArr = JSON.parse(icon.Switches || '[]');
                isSwitchIcon = (swArr.length > 0);
            } catch (e) {
                // In case parsing fails, assume it's not switch based.
                isSwitchIcon = false;
            }
            
            // If there's no candidate yet, use this icon.
            if (!mapping[key]) {
                mapping[key] = { index: index, isSwitch: isSwitchIcon };
            } else {
                // If a candidate exists, replace it if the new icon is switch based while the existing one is not.
                if (isSwitchIcon && !mapping[key].isSwitch) {
                    mapping[key] = { index: index, isSwitch: true };
                }
                // (Optional) If you want to add further tie‑breaking rules when both are switch based or both aren’t,
                // you can do so here.
            }
        });
        
        return mapping;
    };    

    // Spatial navigation via arrow keys.
    Window_GridMenu.prototype.findNextSelectableIndex = function(direction) {
        if (icons.length === 0) return this.index();
        var currentIcon = icons[this.index()];
        if (!currentIcon) return this.index();
        var curX = Number(currentIcon.X);
        var curY = Number(currentIcon.Y);
        var bestIndex = this.index();
        var bestDistance = Infinity;
        icons.forEach((icon, i) => {
            if (i === this.index()) return;
            var dx = Number(icon.X) - curX;
            var dy = Number(icon.Y) - curY;
            var valid = false;
            if (direction === 'right' && dx > 0) valid = true;
            else if (direction === 'left' && dx < 0) valid = true;
            else if (direction === 'down' && dy > 0) valid = true;
            else if (direction === 'up' && dy < 0) valid = true;
            if (valid) {
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < bestDistance) {
                    bestDistance = dist;
                    bestIndex = i;
                }
            }
        });
        if (debugMode) {
            console.log("findNextSelectableIndex:", direction, "selected index", bestIndex);
        }
        return bestIndex;
    };
    
    Window_GridMenu.prototype.cursorRight = function() {
        this.select(this.findNextSelectableIndex('right'));
        this.callUpdateHelp();
        this.updateCursor();
    };
    
    Window_GridMenu.prototype.cursorLeft = function() {
        this.select(this.findNextSelectableIndex('left'));
        this.callUpdateHelp();
        this.updateCursor();
    };
    
    Window_GridMenu.prototype.cursorDown = function() {
        this.select(this.findNextSelectableIndex('down'));
        this.callUpdateHelp();
        this.updateCursor();
    };
    
    Window_GridMenu.prototype.cursorUp = function() {
        this.select(this.findNextSelectableIndex('up'));
        this.callUpdateHelp();
        this.updateCursor();
    };
    
    // Mouse wheel vertical scrolling.
    Window_GridMenu.prototype.onWheel = function(event) {
        if (this.contentsHeight() > this.height) {
            var scrollAmount = this._itemHeight;
            var maxOriginY = Math.min(this.contentsHeight() - this.height, 30 * this._itemHeight);
            if (event.deltaY > 0) {
                this.origin.y = Math.min(this.origin.y + scrollAmount, maxOriginY);
            } else {
                this.origin.y = Math.max(this.origin.y - scrollAmount, 0);
            }
            event.preventDefault();
            if (debugMode) {
                console.log("onWheel: origin.y =", this.origin.y);
            }
        }
    };
        
    // Mouse / Touch Click Processing.
    Window_GridMenu.prototype.processMouseClick = function() {
        if (!this.active) return;
    
        if (TouchInput.isTriggered()) {
            var wx = this.x, wy = this.y;
            var x = TouchInput.x - wx;
            var y = TouchInput.y - wy;
            if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
            var contentX = x + this.origin.x;
            var contentY = y + this.origin.y;
    
            var mapping = this.getCellMapping();
            for (var key in mapping) {
                var cellData = mapping[key];
                var index = cellData.index;
                var rect = this.itemRect(index);
                if (contentX >= rect.x && contentX < rect.x + rect.width &&
                    contentY >= rect.y && contentY < rect.y + rect.height) {
    
                    this.select(index);
                    var evalResult = this.evaluateIcon(icons[index], index);
                    if (evalResult.active) {
                        if (icons[index].TriggerType === "Single" && evalResult.state === "triggered") {
                            SoundManager.playCancel();
                            if (debugMode) {
                                console.log("Icon", index, "is single and already triggered; script will not run again.");
                            }
                        } else {
                            SoundManager.playOk();
                            var scriptText = icons[index].Script;
                            
                            // Clean the script text if needed.
                            if (scriptText.startsWith('"') && scriptText.endsWith('"')) {
                                try {
                                    scriptText = JSON.parse(scriptText);
                                } catch (e) {
                                    console.error("Failed to parse script:", scriptText, e);
                                }
                            }
                            try {
                                var scriptFunc = new Function(scriptText);
                                scriptFunc();
                            } catch (e) {
                                console.error("GridMenu Plugin: Error running script for icon", icons[index], e);
                            }
                            if (icons[index].TriggerType === "Single") {
                                $gameSystem._gridMenuTriggered[index] = true;
                            }
                        }
                    } else {
                        SoundManager.playCancel();
                    }
                    break;
                }
            }
        }
    };       
    
    // ==========================================================================
    // Add Grid Menu Command to Main Menu
    // ==========================================================================
    if (showGridMenu) {
        var _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
        Window_MenuCommand.prototype.addOriginalCommands = function() {
            _Window_MenuCommand_addOriginalCommands.call(this);
            this.addCommand("Grid Menu", "gridMenu", true);
            if (debugMode) {
                console.log("Grid Menu command added to Main Menu.");
            }
        };
        
        var _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
        Scene_Menu.prototype.createCommandWindow = function() {
            _Scene_Menu_createCommandWindow.call(this);
            this._commandWindow.setHandler("gridMenu", this.commandGridMenu.bind(this));
            if (debugMode) {
                console.log("Handler for Grid Menu command set in Main Menu.");
            }
        };
        
        Scene_Menu.prototype.commandGridMenu = function() {
            SceneManager.push(Scene_GridMenu);
            if (debugMode) {
                console.log("Grid Menu command selected. Pushing Scene_GridMenu.");
            }
        };
    }
    
    if (debugMode) {
        console.log("GridMenu Plugin v" + pluginVersion + " loaded successfully.");
    }

    window.Scene_GridMenu = Scene_GridMenu;
    
})();