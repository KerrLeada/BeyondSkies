// This is the ONLY external script file that does something to the UI

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
    
    // Draws a line from point x1 y1 to point x2 y2 with the given context
    function drawLine(ctx, x1, y1, x2, y2) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
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
        this._range = null;
        this._showGrid = true;
        
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
        
        this.toggleGrid = function(show) {
            me._showGrid = !me._showGrid;
        };
        
        // Selects the system with the given name
        this.select = function(player, sys) {
            if (sys && sys !== me.selected) {
                me.selected = sys;
                me.selectionChanged(sys);
                me._range = null;
            }
        };
        
        this.selectRange = function(range) {
            me._range = range;
        }
        
        this.deselectRange = function() {
            me._range = null;
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
        
        // Draws the grid
        function drawGrid(ctx) {
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Draw the rows
            var right = uni.width * cellW;
            for (var r = 0; r < uni.height; ++r) {
                var y = r * cellH;
                drawLine(ctx, 0, y, right, y);
            }
            
            // Draw the columns
            var bottom = uni.height * cellH;
            for (var c = 0; c < uni.width; ++c) {
                var x = c * cellW;
                drawLine(ctx, x, 0, x, bottom);
            }
            
            // Draw the lines at the bottom and to the right
            drawLine(ctx, 0, bottom, right, bottom);
            drawLine(ctx, right, 0, right, bottom);
            
            // Actually draw everything
            ctx.stroke();
        }
        
        function calcAngle(sys1, sys2) {
            var close = (sys1.pos.col - sys2.pos.col);
            var far = (sys1.pos.row - sys2.pos.row);
            return Math.atan(close/far);
        }
        
        function drawFleet(ctx, fleet, origin, dest, distance) {
            var angle = calcAngle(origin, dest);
            //distance = origin.distanceTo(dest) - distance;
            var dx = distance/Math.cos(angle);
            var dy = distance/Math.sin(angle);
            var x = (dest.pos.col - distance/Math.sin(angle)) * cellW + halfCellW;
            var y = (dest.pos.row - distance/Math.cos(angle)) * cellH + halfCellH;
            drawCircle(ctx, x, y, 5);
            drawLine(ctx, x, y, dest.pos.col * cellW + halfCellW, dest.pos.row * cellH + halfCellH);
            ctx.stroke();
        }
        
        function drawDeepSpace(ctx) {
            ctx.lineWidth = 1;
            uni.deepspace.fleets.foreach(function(_, entry) {
                drawFleet(ctx, entry.fleet, entry.origin, entry.dest, entry.distance);
            });
        }
        
        // Draws the canvas
        this.draw = function(player, canvas) {
            me._adjustCanvasSize(canvas);
            
            // Get the context
            var ctx = canvas.getContext('2d');
            
            // Clear the canvas
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'yellow';
            
            // Draw the grid, if it should, and then the deep space
            if (me._showGrid) {
                drawGrid(ctx);
            }
            drawDeepSpace(ctx);
            
            // Setup the systems, the half cell sizes and the radius for the stars
            var systems = uni.getSystems();
            
            // Setup the text drawing
            ctx.font = '20px Calibri';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'blue';
            
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
                
                // TODO: Temporary solution, find a better way
                if (me._range !== null) {
                    var selsys = me.selected;
                    if (uni.distance(selsys, sys) > me._range) {
                        ctx.font = '10px Calibri';
                        ctx.fillText('Not in range :P', x + halfCellW, y + cellH - 30);
                        ctx.font = '20px Calibri';
                    }
                }
            }
            
            // Draw the selection
            var pos = me.selected.pos;
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            strokedCircle(ctx, pos.col * cellW + halfCellW, pos.row * cellH + halfCellH, 15);
            
            // Draw the hover circle (if one should be drawn)
            if (me._highlighted !== null && me._highlighted !== me.selected) {
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
        this.sys = null;
        
        // Setup the mapping of the panet types to the images
        this._mapping = {};
        this._mapping[world.PlanetType.JUNGLE] = "jungle_planet.png";
        this._mapping[world.PlanetType.BARREN] = "barren_planet.png";
        this._mapping[world.PlanetType.WATER] = "water_planet.png";
        
        // Selects a planet
        this.select = function(sys) {
            alert('Useless right now');
        };
        
        // Displays the system with the given name
        this.display = function(player, parent, sys) {
            me.sys = sys;
            var sysname = sys.sysName;
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