// Make sure the ui namespace exists
var ui = ui || {};

// Handles the starmap
ui.Starmap = function(player, uni, canvas) {
    var me = this;
    this._selected = player.home;
    this.selectionChanged = function() {};
    this.style = {
        font: 'Arial',
        fontSize: {system: '15px', civ: '10px', eta: '10px'},
        textColor: '#6666FF',
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
    this._view = new ui._StarmapView(player, uni, canvas, me.style);
    this._highlighted = null;
    this._hrow = null;
    this._hcol = null;
    this._range = null;
    
    // Returns the selected system
    this.selected = function() {
        return me._selected;
    };
    
    // Returns the highlighted system
    this.highlighted = function() {
        return me._highlighted;
    };
    
    // Toggles the grid on or off
    this.toggleGrid = function() {
        me._view.toggleGrid();
        me.display();
    };
    
    // Selects the system with the given name
    this.select = function(player, sys) {
        if (sys && sys !== me._selected) {
            me._selected = sys;
            me.selectionChanged(sys);
            me._range = null;
            me.display();
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
    this.highlight = function(x, y) {
        // Calculate the row and column
        var cell = me._view.cellDim();
        var row = Math.floor(y / cell.height);
        var col = Math.floor(x / cell.width);
        
        // Check if its a new or old row
        if (row !== me._hrow || col !== me._hcol) {
            me._hrow = row;
            me._hcol = col;
            var sys = uni.sysAt(row, col);
            
            // If there was a system at the given location and, assuming a range exists, the
            // system is in range then highlight the system
            if (sys && (me._range === null || me._selected.distanceTo(sys) <= me._range)) {
                me._highlighted = sys;
                me.display();
                canvas.style.cursor = "pointer";
            }
            else if (me._highlighted !== null) {
                me._highlighted = null;
                me.display();
                canvas.style.cursor = "";
            }
        }
    };
    
    // Displays the starmap
    this.display = function() {
        me._view.draw(me._selected, me._highlighted, me._range);
    };
};

// Handles the graphics aspect of the starmap
// This was done to try and make it easier to understand the code
ui._StarmapView = function(player, uni, canvas, style) {
    var me = this;
    this.style = style;
    this._canvasWidth = null;
    this._canvasHeight = null;
    
    var cellW = null;
    var cellH = null;
    var halfCellW = null;
    var halfCellH = null;
    var fltScale = 10;
    var halfFltScale = fltScale / 2;
    
    // Buffers
    this._starbuff = document.createElement('canvas');
    this._gridbuff = document.createElement('canvas');
    this._usedbuff = this._gridbuff;
    
    // Toggles the grid on or off
    this.toggleGrid = function() {
        me._usedbuff = (me._usedbuff === me._starbuff) ? me._gridbuff : me._starbuff;
    };
    
    // Draws the canvas
    this.draw = function(selected, highlighted, range) {
        var systems = uni.getSystems();
        if (me._adjustCanvasSize()) {
            me._drawStars(systems);
        }
        
        // Get the context and clear the canvas
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Setup the text drawing and the star scale
        ctx.fillStyle = me.style.textColor;
        ctx.textAlign = 'center';
        var starScale = me.style.starScale;
        var halfStarScale = starScale / 2;
        var outOfRange = [];
        var civs = [];
        
        // Draw the stars
        ctx.drawImage(me._usedbuff, 0, 0);
        if (!uni.deepspace.fleets.isEmpty()) {
            drawDeepSpace(ctx);
        }
        ctx.font = me.style.fontSize.system + ' ' + me.style.font;
        for (var i = 0, len = systems.length; i < len; i++) {
            var sys = systems[i];
            if (player.visited(sys)) {
                var pos = sys.pos;
                me._drawSystemInfo(player, ctx, sys, calcX(pos), calcY(pos), civs);
            }
            // If there is a range and the current system is not in it, then add it to the list
            // of out of range systems
            if (range !== null && selected.distanceTo(sys) > range) {
                outOfRange.push(sys);
            }
        }
        drawCivInfo(ctx, civs);
        
        // Draw a transperant circle around the out of range systems, darkening them, if there is a range
        if (range !== null) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            for (var i = 0, len = outOfRange.length; i < len; i++) {
                var pos = outOfRange[i].pos;
                ctx.beginPath();
                ctx.arc(calcX(pos), calcY(pos), halfStarScale, 0, 2*Math.PI);
                ctx.fill();
            }
        }
        
        // Draw the selection
        var pos = selected.pos;
        ctx.strokeStyle = me.style.selectionColor;
        ctx.lineWidth = 3;
        strokedCircle(ctx, calcX(pos), calcY(pos), me.style.selectionRadius);
        
        // Draw the hover circle (if one should be drawn)
        if (highlighted !== null && highlighted !== selected) {
            ctx.strokeStyle = me.style.highlightColor;
            ctx.lineWidth = 1;
            pos = highlighted.pos;
            strokedCircle(ctx, calcX(pos), calcY(pos), me.style.selectionRadius);
        }
    };
    
    // Returns the cell dimensions
    this.cellDim = function() {
        return {
            width: cellW,
            height: cellH
        };
    };

    // Draws information about a system
    this._drawSystemInfo = function(player, ctx, sys, x, y, civs) {
        // Display the name of the system
        var indicator = sys.hasShips(player) ? '*' : '';
        ctx.fillText(sys.name + indicator, x, y + halfCellH + 15);
        
        // Display more data
        var owners = player.civsIn(sys);
        if (owners.length > 0) {
            civs.push({x: x, y: y, owners: owners});
        }
    };
    
    // Ensures the scale between the canvas and the rest is correct, and that
    // the cell sizes are correct
    this._adjustCanvasSize = function() {
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
    this._drawStars = function(systems) {
        // Update the buffer sizes
        var width = canvas.width;
        var height = canvas.height;
        me._starbuff.width = width;
        me._starbuff.height = height;
        me._gridbuff.width = width;
        me._gridbuff.height = height;
        
        // Draw the stars to the star buffer
        var ctx = me._starbuff.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        var starScale = me.style.starScale;
        var halfStarScale = starScale / 2;
        for (var i = 0, len = systems.length; i < len; i++) {
            var sys = systems[i];
            var pos = sys.pos;
            ctx.drawImage(getStarImg(sys.starType), calcX(pos) - halfStarScale, calcY(pos) - halfStarScale, starScale, starScale);
        }
        
        // Draw the grid and the stars to the grid buffer
        ctx = me._gridbuff.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(me._starbuff, 0, 0);
        drawGrid(ctx);
    };
    
    // Draws a stroked circle
    function strokedCircle(ctx, x, y, radius) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.stroke();
    }
    
    function drawLine(ctx, x1, y1, x2, y2) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
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
        drawLine(ctx, x, y, calcX(dest.pos), calcY(dest.pos));
        ctx.stroke();
        
        // Draw the ship and the eta
        ctx.drawImage(me.style.fleetImg, x - halfFltScale, y - halfFltScale, fltScale, fltScale);
        var eta = Math.ceil(dist/fleet.speed);
        ctx.fillText('eta ' + eta, x, y + fltScale + 5); 
    }
    
    // Draw what lies in deep space
    function drawDeepSpace(ctx) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = me.style.courseColor;
        ctx.fillStyle = me.style.textColor;
        ctx.font = me.style.fontSize.eta + ' ' + me.style.font;
        uni.deepspace.fleets.forEach(function(entry) {
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
    
    // Draws information about the civilization
    function drawCivInfo(ctx, civs) {
        ctx.font = me.style.fontSize.civ + ' ' + me.style.font;
        for (var i = 0, len = civs.length; i < len; i++) {
            var civ = civs[i];
            var msg = '(' + civ.owners.map(function(x) { return x.name; }).join(', ') + ')';
            ctx.fillText(msg, civ.x, civ.y + halfCellH + 27);
        }
    }
    
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
};
