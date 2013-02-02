<?php
require "uiconstants.php";
?>

// This is the ONLY script that does something to the UI
// Should be replaced by something more maintainable

// The UI "namespace"
var ui = new function() {
    var ns = this;
    
    // Returns the system id for the starmap
    function systemId(name) {
        return 'starmap_' + name;
    }
    
    // Returns the id of the given ship
    this.shipId = function(id) {
        return "selsys_ship_" + id;
    }
    
    // Draws a filled circle
    function drawCircle(ctx, x, y, radius) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fill();
    }
    
    // Draws a stroked circle
    function strokedCircle(ctx, x, y, radius) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.stroke();
    }
    
    // Get the mouse position
    this.getMousePos = function(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };
    
    // Get the image for the stars
    this._starmapStarImg = new Image();
    this._starmapStarImg.src = 'grfx/smallstar.png';
    
    // Represents the starmap
    this.Starmap = function(uni, selected) {
        var me = this;
        this.selected = selected;
        this.selectionChanged = function() {};
        this._highlighted = null;
        this._canvasWidth = null;
        this._canvasHeight = null;
        this._hrow = null;
        this._hcol = null;
        
        var cellW = null;
        var cellH = null;
        var halfCellW = null;
        var halfCellH = null;
        var scale = 10;
        var halfScale = scale / 2;
        
        // Returns the highlighted system
        this.highlighted = function() {
            return me._highlighted;
        };
        
        // Selects the system with the given name
        this.select = function(player, name) {
            if (name !== me.selected && uni.sys(name) !== undefined) {
                me.selected = name;
                me.selectionChanged(uni.sys(name));
            }
        };
        
        // Highlights a starsystem
        // Returns true if something changed and false otherwise
        this.highlight = function(canvas, x, y) {
            // Calculate the row and column
            var row = Math.floor(y / cellH);
            var col = Math.floor(x / cellW);
            var updated = false;
            
            // Check if its a new or old row
            if (row !== me._hrow || col !== me._hcol) {
                me._hrow = row;
                me._hcol = col;
                var sys = uni.sysAt(row, col);
                if (sys !== undefined) {
                    me._highlighted = sys;
                    updated = true;
                }
                else if (me._highlighted !== null) {
                    me._highlighted = null;
                    updated = true;
                }
            }
            
            // Return if something was updated
            return updated;
        };
        
        // Draws information about a system
        this._drawSystemInfo = function(player, ctx, sys, x, y) {
            // Display the name of the system
            ctx.fillText(sys.sysName, x + halfCellW, y + cellH + 10);
            
            // Display more data
            var owners = player.civsIn(sys);
            if (owners.length > 0) {
                var msg = '(' + core.map(owners, function(x) { return x.civName; }).join(', ') + ')';
                ctx.font = '15px Calibri';
                ctx.fillText(msg, x + halfCellW, y + cellH + 30);
                ctx.font = '20px Calibri';
            }
        };
        
        // Draws the canvas
        this.draw = function(player, canvas) {
            me._adjustCanvasSize(canvas);
            
            // Get the context
            var ctx = canvas.getContext('2d');
            
            // Clear the canvas
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'yellow';
            
            // Setup the text drawing
            ctx.font = '20px Calibri';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'blue';
            
            // Setup the systems, the half cell sizes and the radius for the stars
            var systems = uni.getSystems();
            
            // Draw the stars
            for (var i = 0; i < systems.length; ++i) {
                var sys = systems[i];
                var pos = sys.pos;
                var x = pos.col * cellW;
                var y = pos.row * cellH;
                ctx.drawImage(ns._starmapStarImg, x + halfCellW - halfScale, y + halfCellH - halfScale, scale, scale);
                if (player.visited(sys)) {
                    me._drawSystemInfo(player, ctx, sys, x, y);
                }
            }
            
            // Draw the selection
            var pos = uni.sys(me.selected).pos;
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            strokedCircle(ctx, pos.col * cellW + halfCellW, pos.row * cellH + halfCellH, 15);
            
            // Draw the hover circle (if one should be drawn)
            if (me._highlighted !== null && me._highlighted !== uni.sys(me.selected)) {
                ctx.lineWidth = 1;
                pos = me._highlighted.pos;
                strokedCircle(ctx, pos.col * cellW + halfCellW, pos.row * cellH + halfCellH, 15);
            }
        };
        
        // Ensures the scale between the canvas and the rest is correct, and that
        // the cell sizes are correct
        this._adjustCanvasSize = function(canvas) {
            var rect = canvas.getBoundingClientRect();
            var width = Math.floor(rect.right - rect.left);
            var height = Math.floor(rect.bottom - rect.top);
            if (width !== me._canvasWidth) {
                canvas.width = width;
                me._canvasWidth = width;
                cellW = Math.floor(width / uni.width);
                halfCellW = cellW / 2;
            }
            if (height !== me._canvasHeight) {
                canvas.height = height;
                me._canvasHeight = height;
                cellH = Math.floor(height / uni.height);
                halfCellH = cellH / 2;
            }
        };
    };
    
    // Creates a table
    function table() {
        return $('<table>');
    }
    
    // Creates a tr
    function tr() {
        return $('<tr>');
    }
    
    // Creates a td
    function td() {
        return $('<td>');
    }
    
    // Creates an img
    function img() {
        return $('<img>');
    }
    
    // Creates a div
    function div() {
        return $('<div>');
    }
    
    // Creates a button
    function button() {
        return $('<button>');
    }
    
    // Represents the system view
    this.SystemView = function(uni) {
        var me = this;
        
        // Setup the mapping of the panet types to the images
        this._mapping = {};
        this._mapping[world.PlanetType.JUNGLE] = "jungle_planet.png";
        this._mapping[world.PlanetType.BARREN] = "barren_planet.png";
        this._mapping[world.PlanetType.WATER] = "water_planet.png";
        
        // Selects a planet
        this.select = function(id) {
            alert('Useless right now');
        };
        
        // Displays the system with the given name
        this.display = function(player, parent, sysname) {
            var sys = uni.sys(sysname);
            var count = 0;
            parent.html('').append(
                table().addClass('sysview').append(
                    tr().append(
                        td().html(sysname + ' system')
                    ),
                    
                    tr().append(
                        td().append(
                            img().attr('src', 'grfx/star.png')
                        ),
                        
                        sys.planets.map(function(planet) {
                            count += 1;
                            return td().addClass('paddedLeft').append(
                                        div().addClass('centeredText').append(
                                        img().attr('src', 'grfx/' + me._mapping[planet.type]),
                                        [
                                            div().html(sysname + " " + count),
                                            div().addClass('dispSmall').html(colonyInfo(planet, player))
                                        ]
                                    )
                            )
                        })
                    )
                )
            );
        };
    };

    // Displays colony info
    function colonyInfo(p, player) {
        if (p.owner != null) {
            return (p.owner === player) ? "Colonized" : "Colonized by " + p.owner.civName;
        }
        return "";
    }
    
    // Creates a new list of ships
    this.updateShipBar = function(player, parent, sys, onClick, onDblClick) {
        // Create the ship list
        var ships = player.shipsIn(sys).map(function(s) {
            var btn = button().addClass('ship');
            btn.attr('id', ns.shipId(s.uid));
            btn.attr('type', 'button');
            btn.click(function() {
                onClick(s.uid);
            });
            btn.dblclick(function() {
                onDblClick(s.uid);
            });
            btn.html((player === s.owner ? '* ' : '') + s.type);
            return btn;
        });
        
        // Add the ship list
        parent.html('').append(
            div().append(
                'Ships: ',
                ships.length === 0 ? 'N/A' : ships
            )
        );
    };
};