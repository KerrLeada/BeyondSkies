// Make sure the ui namespace exists
var ui = ui || {};

// Handles the "stage", which basically means it 
ui.Stage = function(player, uni, canvas, contentView, shipView) {
    var me = this;
    this.shipBar = new ui.ShipBar(player, shipView);
    this.starmap = new ui.Starmap(player, uni, canvas);
    this.systemView = new ui.SystemView(player, uni, this.shipBar, me.starmap.selected, contentView);
    this.designerView = new ui.DesignerView(player, contentView);
    this.active = this.starmap;
    this._hasSelection = false;

    // Make so the starmap reacts to being clicked
    canvas.addEventListener('click', function(e) {
        if (me.starmap.highlighted() && me.shipBar.hasSelected()) {
            var fleet = new world.Fleet(uni.deepspace, player, me.starmap.selected(), me.shipBar.selected());
            if (fleet.sendTo(me.starmap.highlighted())) {
                me.shipBar.update(me.starmap.selected());
                me.starmap.deselectRange();
                me.starmap.display();
            }
            else {
                alert('This isnt a pink elephant, its a orange one! (yes, this means something went wrong :P)');
            }
        }
        else {
            var pos = getMousePos(canvas, e);
            me.starmap.select(player, me.starmap.highlighted());
        }
    }, false);
    
    // Make so if a system is double clicked, it is entered
    canvas.addEventListener('dblclick', function() {
        if (me.starmap.highlighted() === me.starmap.selected()) {
            me.viewSystem();
        }
    }, false);
    
    // Make so the starmap reacts to mouse movements
    canvas.addEventListener('mousemove', function(e) {
        if (me.active === me.starmap) {
            var pos = getMousePos(canvas, e);
            me.starmap.highlight(pos.x, pos.y);
        }
    }, false);
    
    // Make so the starmap reacts to when the ship bar selection changes
    this.shipBar.selectionChanged = function(selection) {
        if (selection.length === 0) {
            me.starmap.deselectRange();
            displayStarmap();
        }
        else {
            me.starmap.selectRange(selection.reduce(function(prev, curr) {
                return curr.range() < prev.range() ? curr : prev;
            }).range());
            displayStarmap();
        }
    };
    
    // Hookup the events to the starmap
    this.starmap.selectionChanged = this.shipBar.update;
    
    // Shows the starmap
    this.viewStarmap = function() {
        if (me.active !== me.starmap) {
            me.active = me.starmap;
            contentView.hide();
            canvas.style.display = 'block';
            me.starmap.display();
        }
    };
    
    // Shows the system view
    this.viewSystem = function() {
        view(me.systemView);
    };

    // Shows the designer view
    this.viewDesigner = function() {
        view(me.designerView);
    }
    
    // Displays the active ui
    this.display = function() {
        me.active.display();
    };
    
    // Displays the active ui and updates the ship bar
    this.update = function() {
        me.active.display();
        me.shipBar.update(me.starmap.selected());
    };

    // Shows a view (but not the starmap view)
    function view(toView) {
        if (me.active !== toView) {
            prev = me.active;
            me.active = toView;
            toView.display();
            if (prev === me.starmap) {
                canvas.style.display = 'none';
                contentView.show();
            }
        }
    }
    
    // Gets the mouse position
    function getMousePos(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    // Displays the starmap, if and only if it is active
    function displayStarmap() {
        if (me.active === me.starmap) {
            me.starmap.display();
        }
    }
};
