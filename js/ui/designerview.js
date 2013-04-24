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
    var model = new ui._DesignerViewModel(player.specs);
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

        // Create the buttons
        var saveBtn = button('btn');
        var cancelBtn = button('btn').html('Cancel');
        var removeBtn = button('btn').html('Remove');

        // Check if the model is editing a spec or not
        if (model.editing()) {
            // Make the save button save the update
            saveBtn.html('Save update');
            saveBtn.click(function() {
                if (confirm('Are you sure you want to modify this spec?')) {
                    model.updateSpec();
                    clear();
                }
            });

            // Make so the remove button removes the spec
            removeBtn.click(function() {
                if (confirm('Are you sure you want to permanently remove this spec?')) {
                    model.removeSpec();
                    clear();
                }
            });
        }
        else {
            // Make the save button save the new spec design
            saveBtn.html('Save design');
            saveBtn.click(function() {
                model.saveSpec();
                clear();
            });

            // Make the remove button disabled
            removeBtn.attr('disabled', true);
        }

        cancelBtn.click(function() {
            if (confirm('Are you sure you want to cancel?')) {
                model.selectNone();
                parent.empty();
            }
        });

        rightPanel.append(saveBtn, removeBtn, cancelBtn);
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
        var costDiv = div();
        var selectedEffects = div('designerShipStats').append(div().html('Ship Stats'), [healthDiv, rangeDiv, speedDiv, attackDiv, spaceDiv, p().append(costDiv)]);
        return function() {
            var stats = model.stats();
            healthDiv.html('Health: ' + stats.maxHealth);
            rangeDiv.html('Range: ' + stats.range);
            speedDiv.html('Speed: ' + stats.speed);
            attackDiv.html('Attack: ' + stats.attack);
            spaceDiv.html('Space: ' + stats.spaceTaken + ' / ' + model.hullSize());
            costDiv.html('Money: ' + stats.cost.money + ' Production: ' + stats.cost.production);
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
        if (!model.editing()) {
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
            var stsBtn = button(['txtbtn', 'wide']).html(mod.name + ' (size ' + mod.size + ')');
            stsBtn.click(showMod(mod));
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
                    curr.count + ' x ' + curr.mod.name + ' (size ' + curr.mod.size + ')',
                    removeBtn
                );
            })
        );
        return selectedMods;
    }
};

ui._DesignerViewModel = function(specs) {
    var me = this;
    var mods = null;
    var specHull = null;
    var specName = '';
    var hullSize = 0;
    var spaceTaken = 0;
    var editing = false;
    this.onChange = function() {};
    this._mods = null; // For debugging reasons... to be removed later

    // Setup everything
    function setup(name, hull, modules) {
        specName = name;
        specHull = hull;
        hullSize = hull ? hull.size : 0;
        if (modules.copyModules) {
            mods = modules.copyModules();
        }
        else {
            mods = new world.ModuleManager(hullSize, modules);
        }
        spaceTaken = mods.spaceTaken();
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
    this.editing = function() {
        return editing;
    };

    // Selects a spec
    this.select = function(spec) {
        setup(spec.name, spec.hull, spec);
        editing = true;
    };
    
    // Selects nothing
    this.selectNone = function() {
        setup('', null, []);
        editing = false;
    };

    this.modules = function() {
        return mods.view();
    };
    this.spaceTaken = function() {
        return spaceTaken;
    };
    this.hullSize = function() {
        return hullSize;
    };

    // Adds a module
    this.add = function(mod) {
        var wasAdded = mods.add(mod);
        if (wasAdded) {
            me.onChange();
            spaceTaken = mods.spaceTaken();
        }
        return wasAdded;
    };

    // Removes the module with the given key
    this.remove = function(modId) {
        mods.remove(modId);
        spaceTaken = mods.spaceTaken();
        me.onChange();
    };

    // Gets or sets the hull
    this.hull = function(hull) {
        if (hull) {
            setup(specName, hull, mods);
            return;
        }
        return specHull;
    };

    // Iteration of the modules
    this.forEach = function(f) {
        mods.view().forEach(f);
    };
    this.map = function(f) {
        return mods.view().map(f);
    };
    this.filter = function(pred) {
        return mods.view().filter(pred);
    };
    
    // Get the stats
    this.stats = function() {
        return mods.stats();
    };

    // Saves the spec design
    this.saveSpec = function() {
        specs.addSpec(specName, specHull, mods);
        me.selectNone();
    };

    // Updates a spec design
    this.updateSpec = function() {
        specs.updateSpec(specName, mods);
        me.selectNone();
    };

    // Removes the spec design
    this.removeSpec = function() {
        specs.removeSpec(specName);
        me.selectNone();
    };
};
