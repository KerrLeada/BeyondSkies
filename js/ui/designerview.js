'use strict';

// Make sure the ui namespace exists
var ui = ui || {};

// Represents the designer view
ui.DesignerView = function(player, parent) {
    var me = this;
    
    // Import the html generation stuff
    var div = ui.html.div;
    var span = ui.html.span;
    var p = ui.html.p;
    var button = ui.html.button;
    var input = ui.html.input;
    var select = ui.html.select;
    var option = ui.html.option;
    var table = ui.html.table;
    var tr = ui.html.tr;
    var td = ui.html.td;

    // The modules known by the player
    var modules = player.modules;
    var model = new ui._DesignerViewModel();
    model.onChange = function() {
        showSpecMods();
        showSpecStats();
    };

    // Displays the designer view
    this.display = function() {
        var designer = div();
        return parent.empty().append(
            div('designerFrame').append(
                overview(designer),
                designer
            )
        );
    };

    // Creates the overview
    function overview(designer) {
        var specList = span();
        function updateSpecList() {
            return specList.empty().append(player.specs.map(function(spec) {
                return specBtn(designer, spec);
            }));
        }
        function specBtn(designer, spec) {
            return button('btn').append(spec.name).click(function() {
                model.select(spec);
                specDesigner(designer, updateSpecList);
            });
        }
        var overv = div('designerHead').append(
            div(['infoTitle', 'wide']).html('Specs'),
            div('designerOptions').append(
                span().append(
                    button('btn').html('New spec').click(function() {
                        model.selectNone();
                        specDesigner(designer, updateSpecList);
                    }),
                    span('righted').html('Existing: ')
                ),
                updateSpecList()
            )
        );
        return overv;
    }

    // Creates the designer
    function specDesigner(parent, updater) {
        var mstats = div('designerModStats');
        var leftPanel = div('designerModPanel').append(categories(mstats));
        var rightPanel = div('rightWinged').append(showSpecStats());
        function clear() {
            model.selectNone();
            parent.empty();
            updater();
        }

        // Saves the current spec
        var saveBtn = button('btn').html('Save').click(function() {
            if (model.exists()) {
                if (confirm('Are you sure you want to modify this spec?')) {
                    player.specs.updateSpec(model.name(), model.modules());
                    clear()
                }
            }
            else {
                player.specs.addSpec(model.name(), model.hull(), model.modules());
                clear();
            }
        });

        // Cancels whatever has been done
        var cancelBtn = button('btn').html('Cancel').click(function() {
            if (confirm('Are you sure you want to cancel?')) {
                model.selectNone();
                parent.empty();
            }
        });

        // Add the buttons to rightPanel
        rightPanel.append(saveBtn, cancelBtn);
        if (model.exists()) {
            // If a spec is edited rather then created, add a button to delete it
            var deleteBtn = button('btn').html('Delete').click(function() {
                if (confirm('Are you sure you want to delete this spec?')) {
                    player.specs.removeSpec(model.name());
                    clear();
                }
            });
            rightPanel.append(deleteBtn);
        }

        parent.empty().append(
            div('designerLeftNStats').append(
                div('designerLeftPanel').append(leftPanel, mstats),
                [specNameNHull(), showSpecMods()]
            ),
            rightPanel
        );
    }
    
    // Used to show the spec stats
    var showSpecStats = (function() {
        var healthDiv = div();
        var rangeDiv = div();
        var speedDiv = div();
        var attackDiv = div();
        var spaceDiv = div();
        var selectedEffects = div('designerShipStats').append(div().html('Ship Stats'), [healthDiv, rangeDiv, speedDiv, attackDiv, spaceDiv]);
        return function() {
            var stats = model.stats();
            healthDiv.html('Health: ' + stats.maxHealth);
            rangeDiv.html('Range: ' + stats.range);
            speedDiv.html('Speed: ' + stats.speed);
            attackDiv.html('Attack: ' + stats.attack);
            spaceDiv.html('Space: ' + stats.spaceTaken + ' / ' + model.hullSize());
            return selectedEffects;
        };
    }());

    // Creates the ship data viewing thingy
    function specNameNHull() {
        var hullStats = div('designerHead');
        var nameNHull = div('designerNameNHull').append();
        return nameNHull.append(inputName(), hullSelection(hullStats), hullStats);
    }

    // Creates the place the player can give the spec a name
    function inputName() {
        var inpName = null;
        if (!model.exists()) {
            inpName = input().attr('value', model.name());
            inpName.change(function() {
                model.name($(this).attr('value'));
            });
        }
        else {
            inpName = span().html(model.name());
        }
        return div(['designerOptions', 'designerHead']).append('Name: ', inpName);
    }

    // Creates a selection thing (used by the functions "hullSelection" and "engineSelection")
    function hullSelection(stats) {
        // Updates the hull information
        function updateInfo(hull) {
            var cost = hull.cost;
            stats.empty().html('Health: ' + hull.maxHealth + ' Size: ' + hull.size + ' Money: ' + cost.money + ' Production: ' + cost.production);
        }
        
        // Create the options array and get the selected hull (and make it appear selected :P)
        var selected = model.hull();
        var sel = select();

        // If no hull was selected, make sure one can be selected
        if (!selected) {
            var defaultOpt = option('---').attr('disabled', true).attr('selected', true);
            sel.append(defaultOpt);
     
           // Display all the options, and select the right one
            modules.hulls().forEach(function(curr) {
                var op = option(curr.name);
                op.attr('value', curr.uid);
                sel.append(op);
            });

            // Make so the hull information updates when an option is selected
            sel.change(function() {
                var curr = $(this).attr('value');
                model.hull(modules.hulls(curr));
                updateInfo(model.hull());
                showSpecStats();
            });
        }
        else {
            // If a hull was selected, make sure it cant be changed
            var selectedHull = option(selected.name);
            sel.append(selectedHull);
            updateInfo(selected);
            showSpecStats();
        }

        // Return the selection thing in a div
        return div('designerHead').append('Hulls: ', sel);
    }

    // Creates the section on the left panel where the player can see the modules
    function categories(mstats) {
        // Create "parent", which contains the modules in a category, and "last", which is the currently selected category
        var stats = div('designerModStats');
        var showMod = modStats(mstats);
        var parent = catContent(div(), modules.weapons(), showMod);
        var last = button('catBtn').attr('disabled', true).html('Weapons');
        
        // Creates a function that displays the given modules as a category
        function showCategory(catMods) {
            return function() {
                var clicked = $(this);
                last.attr('disabled', false);
                clicked.attr('disabled', true);
                last = clicked;
                mstats.empty();
                catContent(parent, catMods, showMod);
            };
        }

        // hookup "last" with the weapon category to start with
        // Then create a div containing the category buttons and "parent"
        last.click(showCategory(modules.weapons()));
        return div().append(
            div().append(
                last,
                [
                    button('catBtn').html('Engines').click(showCategory(modules.engines())),
                    button('catBtn').html('Sensors').click(showCategory(modules.sensors())),
                    button('catBtn').html('Other').click(showCategory(modules.other()))
                ]
            ),
            div().append(parent, stats)
        );
    }

    // Shows the content of a category
    function catContent(parent, catMods, showMod) {
        parent.empty();
        catMods.forEach(function(mod) {
            var stsBtn = button(['txtbtn', 'wide']).html(mod.name).click(showMod(mod));
            var addBtn = button('btn').html('Add');
            addBtn.click(function() {
                if (!model.add(mod)) {
                    alert('Could not add module');
                }
            });
            parent.append(table('designerHead').append(
                tr().append(
                    td('wide').append(stsBtn),
                    td().append(addBtn)
                )
            ));
        });
        return parent;
    }

    // A function that creates a function that creates a function that displays information about a module
    function modStats(parent) {
        return function(mod) {
            return function() {
                parent.empty().append(div().html('Module: ' + mod.name));
                showEffect(parent, 'Health: ', mod.health);
                showEffect(parent, 'Speed: ', mod.speed);
                showEffect(parent, 'Range: ', mod.range);
                showEffect(parent, 'Attack: ', mod.attack);
                parent.append('Money: ' + mod.cost.money + ' Production: ' + mod.cost.production);
            };
        };
    }

    // Shows something, if the given value is greater then 0
    function showEffect(parent, title, val) {
        if (val > 0) {
            parent.append(div().html(title + val));
        }
    }

    // Shows the currently selected modules
    var selectedMods = div('designerSelMods');
    function showSpecMods() {
        selectedMods.empty().append(
            'Ship Modules',
            model.map(function(curr, modId) {
                // Create the removal button
                var removeBtn = button('btn').html('Remove');
                removeBtn.click(function() {
                    model.remove(modId);
                });
                return div().append(
                    curr.count + ' x ' + curr.mod.name,
                    removeBtn
                );
            })
        );
        return selectedMods;
    }
};

ui._DesignerViewModel = function() {
    var me = this;
    var mods = null;
    var specName = '';
    var exists = false;
    this.onChange = function() {};
    this._mods = null; // For debugging reasons... to be removed later

    // Setup everything
    function setup(name, hull, modules) {
        specName = name;
        mods = new world.ModuleManager(hull, modules);
        me._mods = mods; // For debugging reasons... to be removed later
    }

    // Gets or sets the name
    this.name = function(name) {
        if (name) {
            specName = name;
            return;
        }
        return specName;
    };

    // Checks if the model was based on an existing spec
    this.exists = function() {
        return exists;
    };

    // Selects a spec
    this.select = function(spec) {
        if (spec) {
            setup(spec.name, spec.hull, spec.modules());
            exists = true;
        }
        else {
            me.selectNone();
        }
    };
    
    // Selects nothing
    this.selectNone = function() {
        setup('', null, []);
        exists = false;
    };

    this.modules = function() {
        return mods;
    };

    this.spaceTaken = function() {
        return mods ? mods.spaceTaken() : 0;
    };
    this.hullSize = function() {
        return mods ? mods.hullSize() : 0;
    };

    // Adds a module
    this.add = function(mod) {
        var wasAdded = mods.add(mod);
        if (wasAdded) {
            me.onChange();
        }
        return wasAdded;
    };

    // Removes the module with the given key
    this.remove = function(modId) {
        mods.remove(modId);
        me.onChange();
    };

    // Gets or sets the hull
    this.hull = function(hull) {
        return mods.hull(hull);
    };

    // Iteration of the modules
    this.forEach = function(f) {
        mods.forEach(f);
    };
    this.map = function(f) {
        return mods.map(f);
    };
    this.filter = function(pred) {
        return mods.filter(pred);
    };
    
    // Get the stats
    this.stats = function() {
        return mods.stats();
    };
};
