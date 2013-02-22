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
    
    // Represents the starmap
    this.Starmap = function(uni, selected) {
        var me = this;
        this._selected = selected;
        this.selectionChanged = function() {};
        this.style = {
            font: 'Calibri',
            textColor: 'blue',
            selectionColor: 'red',
            highlightColor: 'red',
            gridColor: '#111111',
            courseColor: '#222222',
            selectionRadius: 10,
            starScale: 10,
            
            // Images (for correctness they are placed here)
            fleetImg: null,
            redStarImg: null,
            blueStarImg: null,
            yellowStarImg: null
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
        var fltScale = 10;
        var halfFltScale = fltScale / 2;
        
        // Buffer for the stars
        this._starbuff = document.createElement('canvas');
        
        // Returns the selected system
        this.selected = function() {
            return me._selected;
        };
        
        // Returns the highlighted system
        this.highlighted = function() {
            return me._highlighted;
        };
        
        // Toggles the grid on or off
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
        
        // Selects a range
        this.selectRange = function(range) {
            me._range = range;
        }
        
        // Deselects a range
        this.deselectRange = function() {
            me._range = null;
        };
        
        // Highlights a starsystem
        this.highlight = function(player, canvas, x, y) {
            // Calculate the row and column
            var row = Math.floor(y / cellH);
            var col = Math.floor(x / cellW);
            
            // Check if its a new or old row
            if (row !== me._hrow || col !== me._hcol) {
                me._hrow = row;
                me._hcol = col;
                var sys = uni.sysAt(row, col);
                
                // If there was a system at the given location and, assuming a range exists, the
                // system is in range then highlight the system
                if (sys !== undefined && (me._range === null || me._selected.distanceTo(sys) <= me._range)) {
                    me._highlighted = sys;
                    me.display(player, canvas);
                }
                else if (me._highlighted !== null) {
                    me._highlighted = null;
                    me.display(player, canvas);
                }
            }
        };
        
        // Draws information about a system
        this._drawSystemInfo = function(player, ctx, sys, x, y) {
            ctx.fillStyle = me.style.textColor;
            
            // Display the name of the system
            var indicator = sys.hasShips(player) ? '*' : '';
            ctx.fillText(sys.sysName + indicator, x, y + halfCellH + 15);
            
            // Display more data
            var owners = player.civsIn(sys);
            if (owners.length > 0) {
                var msg = '(' + owners.map(function(x) { return x.civName; }).join(', ') + ')';
                ctx.font = '15px ' + me.style.font;
                ctx.fillText(msg, x, y + halfCellH + 35);
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
            ctx.drawImage(me.style.fleetImg, x - halfFltScale, y - halfFltScale, fltScale, fltScale);
            
            // Draw the eta
            var eta = Math.ceil(dist/fleet.speed);
            ctx.fillText('eta ' + eta, x, y + fltScale + 5); 
        }
        
        // Draw what lies in deep space
        function drawDeepSpace(ctx) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = me.style.courseColor;
            ctx.fillStyle = me.style.textColor;
            ctx.font = '10px ' + me.style.font;
            uni.deepspace.fleets.foreach(function(_, entry) {
                drawFleet(ctx, entry.fleet, entry.origin, entry.dest, entry.distance);
            });
        }
        
        // Get the star color of the system
        function getStarImg(starType) {
            var img = null;
            if (starType === world.StarType.BLUE) {
                img = me.style.blueStarImg;
            }
            else if (starType === world.StarType.RED) {
                img = me.style.redStarImg;
            }
            else if (starType === world.StarType.YELLOW) {
                img = me.style.yellowStarImg;
            }
            else {
                throw 'BASTARDS!!!';
            }
            return img;
        }
        
        // Calculates the x position of the middle of the tile at the given location
        function calcX(pos) {
            return pos.col * cellW + halfCellW;
        }
        
        // Calculates the y position of the middle of the tile at the given location
        function calcY(pos) {
            return pos.row * cellH + halfCellH;
        }
        
        // Draws the canvas
        this.display = function(player, canvas) {
            var systems = uni.getSystems();
            var selected = me._selected;
        
            if (me._adjustCanvasSize(canvas)) {
                me._drawStars(canvas, systems);
            }
            
            // Get the context and clear the canvas
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the grid, if it should
            if (me._showGrid) {
                drawGrid(ctx);
            }
            if (!uni.deepspace.fleets.isEmpty()) {
                drawDeepSpace(ctx);
            }
            
            // Setup the text drawing and the star scale
            ctx.font = '20px ' + me.style.font;
            ctx.textAlign = 'center';
            var starScale = me.style.starScale;
            var halfStarScale = starScale / 2;
            var outOfRange = [];
            
            // Draw the stars
            ctx.drawImage(me._starbuff, 0, 0);
            for (var i = 0, len = systems.length; i < len; i++) {
                var sys = systems[i];
                if (player.visited(sys)) {
                    var pos = sys.pos;
                    me._drawSystemInfo(player, ctx, sys, calcX(pos), calcY(pos));
                }
                // If there is a range and the current system is not in it, then add it to the list
                // of out of range systems
                if (me._range !== null && selected.distanceTo(sys) > me._range) {
                    outOfRange.push(sys);
                }
            }
            
            // Draw a transperant circle around the out of range systems, darkening them, if there is a range
            if (me._range !== null) {
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                for (var i = 0, len = outOfRange.length; i < len; i++) {
                    var pos = outOfRange[i].pos;
                    ctx.beginPath();
                    ctx.arc(calcX(pos), calcY(pos), halfStarScale, 0, 2*Math.PI);
                    ctx.fill();
                }
            }
            
            // Draw the selection
            var pos = me._selected.pos;
            ctx.strokeStyle = me.style.selectionColor;
            ctx.lineWidth = 3;
            strokedCircle(ctx, pos.col * cellW + halfCellW, pos.row * cellH + halfCellH, me.style.selectionRadius);
            
            // Draw the hover circle (if one should be drawn)
            if (me._highlighted !== null && me._highlighted !== me._selected) {
                ctx.strokeStyle = me.style.highlightColor;
                ctx.lineWidth = 1;
                pos = me._highlighted.pos;
                strokedCircle(ctx, pos.col * cellW + halfCellW, pos.row * cellH + halfCellH, me.style.selectionRadius);
            }
        };
        
        // Ensures the scale between the canvas and the rest is correct, and that
        // the cell sizes are correct
        this._adjustCanvasSize = function(canvas) {
            var rect = canvas.getBoundingClientRect();
            var width = Math.floor(rect.right - rect.left);
            var height = Math.floor(rect.bottom - rect.top);
            var update = false;
            if (width !== me._canvasWidth) {
                canvas.width = width;
                me._canvasWidth = width;
                cellW = Math.floor(width / uni.width);
                halfCellW = cellW / 2;
                update = true;
            }
            if (height !== me._canvasHeight) {
                canvas.height = height;
                me._canvasHeight = height;
                cellH = Math.floor(height / uni.height);
                halfCellH = cellH / 2;
                update = true;
            }
            return update;
        };
        
        // Updates the internal star buffer
        this._drawStars = function(canvas, systems) {
            me._starbuff.width = canvas.width;
            me._starbuff.height = canvas.height;
            var ctx = me._starbuff.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var starScale = me.style.starScale;
            var halfStarScale = starScale / 2;
            for (var i = 0, len = systems.length; i < len; i++) {
                var sys = systems[i];
                var pos = sys.pos;
                ctx.drawImage(getStarImg(sys.starType), calcX(pos) - halfStarScale, calcY(pos) - halfStarScale, starScale, starScale);
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
        
        // Setup the mapping of the star type to the images (THIS SUCKS AS WELL!!!)
        this._starType = {};
        this._starType[world.StarType.BLUE] = 'blue_star.png';
        this._starType[world.StarType.RED] = 'red_star.png';
        this._starType[world.StarType.YELLOW] = 'yellow_star.png';
        
        // Returns the system
        this.sys = function() {
            return me._selector();
        };
        
        // Displays the system with the given name
        this.display = function(player, parent) {
            var sys = me._selector();
            var sysname = sys.sysName;
            var count = 0;
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
                            img().attr('src', 'grfx/' + me._starType[sys.starType])
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