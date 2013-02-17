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
    
    // Get the star color of the system
    function getStarColor(sys) {
        if (sys.starType === world.StarType.BLUE) {
            return 'blue';
        }
        else if (sys.starType === world.StarType.RED) {
            return 'red';
        }
        return 'yellow';
    }
    
    this._starmapFleetImg = new Image();
    this._starmapFleetImg.src = 'grfx/ship.png';
    
    // Represents the starmap
    this.Starmap = function(uni, selected) {
        var me = this;
        this._selected = selected;
        this.selectionChanged = function() {};
        this.style = {
            font: 'Calibri',
            textColor: 'blue',
            selectionColor: 'red',
            gridColor: '#111111'
        };
        
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
        var starScale = 5;
        var halfStarScale = starScale / 2;
        var fltScale = 10;
        var halfFltScale = fltScale / 2;
        
        this.selected = function() {
            return me._selected;
        };
        
        // Returns the highlighted system
        this.highlighted = function() {
            return me._highlighted;
        };
        
        this.toggleGrid = function(show) {
            me._showGrid = !me._showGrid;
        };
        
        // Selects the system with the given name
        this.select = function(player, sys) {
            if (sys && sys !== me._selected) {
                me._selected = sys;
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
            ctx.fillStyle = me.style.textColor;
            
            // Display the name of the system
            var indicator = sys.hasShips(player) ? '*' : '';
            ctx.fillText(sys.sysName + indicator, x + halfCellW, y + cellH + 15);
            
            // Display more data
            var owners = player.civsIn(sys);
            if (owners.length > 0) {
                var msg = '(' + owners.map(function(x) { return x.civName; }).join(', ') + ')';
                ctx.font = '15px ' + me.style.font;
                ctx.fillText(msg, x + halfCellW, y + cellH + 35);
                ctx.font = '20px ' + me.style.font;
            }
            
            ctx.fillStyle = 'yellow';
        };
        
        // Draws the grid
        function drawGrid(ctx) {
            ctx.strokeStyle = me.style.gridColor;
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
        
        // Calculates the angle, in radians, between two systems
        function calcAngle(sys1, sys2) {
            var x = sys1.pos.col - sys2.pos.col;
            var y = sys1.pos.row - sys2.pos.row;
            return Math.atan2(x, y);
        }
        
        // Draws a fleet
        function drawFleet(ctx, fleet, origin, dest, dist) {
            // Calculate the position of the fleet
            var angle = calcAngle(dest, origin);
            distance = origin.distanceTo(dest) - dist;
            var x = (origin.pos.col + distance*Math.sin(angle)) * cellW + halfCellW;
            var y = (origin.pos.row + distance*Math.cos(angle)) * cellH + halfCellH;
            
            // Draw the line
            ctx.beginPath();
            drawLine(ctx, x, y, dest.pos.col * cellW + halfCellW, dest.pos.row * cellH + halfCellH);
            ctx.stroke();
            
            // Draw the ship
            ctx.drawImage(ns._starmapFleetImg, x - halfFltScale, y - halfFltScale, fltScale, fltScale);
            
            // Draw the eta
            var eta = Math.ceil(dist/fleet.speed);
            ctx.fillText('eta ' + eta, x, y + fltScale + 5); 
        }
        
        // Draw what lies in deep space
        function drawDeepSpace(ctx) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = me.style.gridColor;
            ctx.fillStyle = me.style.textColor;
            ctx.font = '10px ' + me.style.font;
            uni.deepspace.fleets.foreach(function(_, entry) {
                drawFleet(ctx, entry.fleet, entry.origin, entry.dest, entry.distance);
            });
        }
        
        // Draws the canvas
        this.display = function(player, canvas) {
            me._adjustCanvasSize(canvas);
            
            // Get the context
            var ctx = canvas.getContext('2d');
            
            // Clear the canvas
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw the grid, if it should
            if (me._showGrid) {
                drawGrid(ctx);
            }
            
            // If there are fleets in deep space, draw them
            if (!uni.deepspace.fleets.isEmpty()) {
                drawDeepSpace(ctx);
            }
            
            // Setup the systems, the half cell sizes and the radius for the stars
            var systems = uni.getSystems();
            
            // Setup the text drawing
            ctx.font = '20px ' + me.style.font;
            ctx.textAlign = 'center';
            
            // Draw the stars
            for (var i = 0; i < systems.length; ++i) {
                var sys = systems[i];
                var pos = sys.pos;
                var x = pos.col * cellW;
                var y = pos.row * cellH;
                ctx.fillStyle = getStarColor(sys);
                drawCircle(ctx, x + halfCellW, y + halfCellH, starScale);
                if (player.visited(sys)) {
                    me._drawSystemInfo(player, ctx, sys, x, y);
                }
                
                // TODO: Temporary solution, find a better way
                if (me._range !== null) {
                    var selsys = me._selected;
                    if (uni.distance(selsys, sys) > me._range) {
                        ctx.font = '10px ' + me.style.font;
                        ctx.fillText('Not in range :P', x + halfCellW, y + cellH - 30);
                        ctx.font = '20px ' + me.style.font;
                    }
                }
            }
            
            // Draw the selection
            var pos = me._selected.pos;
            ctx.strokeStyle = me.style.selectionColor;
            ctx.lineWidth = 3;
            strokedCircle(ctx, pos.col * cellW + halfCellW, pos.row * cellH + halfCellH, 15);
            
            // Draw the hover circle (if one should be drawn)
            if (me._highlighted !== null && me._highlighted !== me._selected) {
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
    
    // Creates a paragraph
    function p() {
        return $('<p>');
    }
    
    // Creates a button
    function button() {
        return $('<button>');
    }
    
    // Represents the system view
    // The selector is a function object that returns a system
    this.SystemView = function(uni, shipBar, selector) {
        var me = this;
        this._selector = selector;
        
        // Setup the mapping of the panet types to the images (THIS SUCKS!!!)
        this._mapping = {};
        this._mapping[world.PlanetType.JUNGLE] = 'jungle_planet.png';
        this._mapping[world.PlanetType.BARREN] = 'barren_planet.png';
        this._mapping[world.PlanetType.WATER] = 'water_planet.png';
        this._mapping[world.PlanetType.CRYSTAL] = 'crystal_planet.png';
        this._mapping[world.PlanetType.MECHANICAL] = 'mechanical_planet.png';
        this._mapping[world.PlanetType.ICE] = 'ice_planet.png';
        this._mapping[world.PlanetType.LAVA] = 'lava_planet.png';
        this._mapping[world.PlanetType.VULCANIC] = 'vulcanic_planet.png';
        this._mapping[world.PlanetType.TORN] = 'torn_planet.png';
        this._mapping[world.PlanetType.OCEAN] = 'ocean_planet.png';
        this._mapping[world.PlanetType.EXOTIC] = 'exotic_planet.png';
        this._mapping[world.PlanetType.GAS_GIANT] = 'gas_giant.png';
        this._mapping[world.PlanetType.ICE_GIANT] = 'ice_giant.png';
        this._mapping[world.PlanetType.ASTEROID_FIELD] = 'asteroid_field.png';
        
        this.sys = function() {
            return me._selector();
        };
        
        // Displays the system with the given name
        this.display = function(player, parent) {
            var sys = me._selector();
            var sysname = sys.sysName;
            var count = 0;
            var star = getStarColor(sys);
            var colinfos = [];
            var hasColship = sys.ships.exists(function(_, ship) {
                return ship.owner === player && colonyShip(ship);
            });
            parent.empty().append(
                table().addClass('sysview').append(
                    tr().append(
                        td().html(sysname + ' system')
                    ),
                    
                    tr().append(
                        td().append(
                            img().attr('src', 'grfx/' + star + '_star.png')
                        ),
                        
                        sys.planets.map(function(planet) {
                            count += 1;
                            return td().addClass('paddedLeft').append(
                                        div().addClass('centeredText').append(
                                        img().attr('src', 'grfx/' + me._mapping[planet.type]),
                                        p().append(
                                            sysname + ' ' + count,
                                            [
                                                div().addClass('dispSmall').html(worldInfo(planet.type)),
                                                colonyInfo(player, parent, planet, hasColship)
                                            ]
                                        )
                                    )
                            )
                        })
                    )
                )
            );
        };
        
        // What to show about a planet type
        function worldInfo(planetType) {
            var info = planetType;
            if (info !== world.PlanetType.GAS_GIANT &&
                info !== world.PlanetType.ICE_GIANT &&
                info !== world.PlanetType.ASTEROID_FIELD)
                info += ' world';
            return info;
        }
        
        // Creates the colony information div
        function colonyInfo(player, parent, planet, hasColShip) {
            var result = div().addClass('dispSmall');
            if (planet.owner != null) {
                result.html(planet.owner === player ? 'Colonized' : 'Colonized by ' + planet.owner.civName);
            }
            else if (hasColShip) {
                var btn = button().attr('type', 'button').html('Colonize');
                btn.click(function() {
                    // Colonize the planet and update the ship bar
                    planet.colonize(player);
                    shipBar(planet.sys);
                    
                    // Check if there are more colony ships
                    if (planet.sys.hasShips(player, colonyShip)) {
                        // If there are, just replace the button with the text 'Colonized'
                        result.empty().html('Colonized');
                    }
                    else {
                        // If there are not any more colony ships, redisplay the system
                        me.display(player, parent);
                    }
                });
                result.append(btn);
            }
            else {
                result.html('---');
            }
            return result;
        }
        
        // Checks if a ship is a colony ship
        function colonyShip(ship) {
            return ship.type === world.DefaultSpecs.ColonyShip.type;
        }
    };
    
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
        parent.empty().append(
            div().append(
                'Ships: ',
                ships.length === 0 ? 'N/A' : ships
            )
        );
    };
};