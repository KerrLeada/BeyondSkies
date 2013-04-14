// Make sure the ui namespace exists
var ui = ui || {};

// Handles the shipbar
ui.ShipBar = function(player, parent) {
    var me = this;
    this.selectionChanged = function() {};
    this._selected = new core.Hashtable();
    
    // Toggles the selection
    function toggleSelection(btn, ship) {
        if (me._selected.has(ship.uid)) {
            btn.removeClass('activeShip');
            me._selected.remove(ship.uid);
        }
        else {
            btn.addClass('activeShip');
            me._selected.set(ship.uid, ship);
        }
        me.selectionChanged(me._selected.values());
    }
    
    // Returns if something in the shipbar is selected
    this.hasSelected = function() {
        return !me._selected.isEmpty();
    };
    
    // Returns whatever is selected
    this.selected = function() {
        return me._selected;
    };
    
    // Clears and displays the given systems ships
    this.update = function(sys) {
        me._selected.clear();
        me.display(sys);
    };

    // Displays the ship bar
    this.display = function(sys) {
        // Create the ship list
        var ships = player.shipsIn(sys).map(function(s) {
            var btn = $('<button>').addClass('ship');
            btn.attr('id', s.uid);
            btn.attr('type', 'button');
            
            // Make so the button is only clickable if the ship belongs to the player
            if (s.civ() === player) {
                btn.click(function() {
                    toggleSelection(btn, s);
                });
                btn.append('* ' + s.type);
            }
            else {
                btn.append(s.type);
            }
            return btn;
        });
        
        // Add the ship list
        parent.empty().append(
            $('<div>').append(
                'Ships: ',
                ships.length === 0 ? 'N/A' : ships
            )
        );
    };
};
