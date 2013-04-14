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
        return div('designerHead').append(
            div(['infoTitle', 'wide']).html('Specs'),
            div('designerOptions').append(
                span().append(
                    button('btn').html('New spec').click(function() {
                        model.selectNone();
                        specDesigner(designer);
                    }),
                    span('righted').html('Existing: ')
                ),
                span().append(player.specs.map(function(spec) {
                    return specBtn(designer, spec);
                }))
            )
        );
    }

    // Creates a spec button
    function specBtn(designer, spec) {
        var btn = button('btn').append(spec.name);
        btn.click(function() {
            model.select(spec);
            specDesigner(designer);
        });
        return btn;
    }

    // Creates the designer
    function specDesigner(parent) {
        var mstats = div('designerModStats');
        var leftPanel = div('designerModPanel').append(categories(mstats));
        var saveBtn = button('btn').html('Save').click(function() {
            if (model.exists) {
                if (confirm('Are you sure you want to modify this spec?')) {
                    model.selectNone();
                    parent.empty();
                }
            }
            else {
                model.selectNone();
                parent.empty();
            }
        });
        var cancelBtn = button('btn').html('Cancel').click(function() {
            if (confirm('Are you sure you want to cancel?')) {
                model.selectNone();
                parent.empty();
            }
        });
        parent.empty().append(
            div('designerLeftNStats').append(
                div('designerLeftPanel').append(leftPanel, mstats),
                [
                    specData(),
                    showSpecMods()
                ]
            ),
            div('rightWinged').append(
                showSpecStats(),
                [saveBtn, cancelBtn]
            )
        );
    }
    
    // Used to show the spec stats
    var showSpecStats = (function() {
        var healthDiv = div();
        var rangeDiv = div();
        var speedDiv = div();
        var attackDiv = div();
        var selectedEffects = div('designerShipStats').append(div().html('Ship Stats'), [healthDiv, rangeDiv, speedDiv, attackDiv]);
        return function() {
            var stats = model.stats();
            healthDiv.html('Health: ' + stats.maxHealth);
            rangeDiv.html('Range: ' + stats.range);
            speedDiv.html('Speed: ' + stats.speed);
            attackDiv.html('Attack: ' + stats.attack);
            return selectedEffects;
        };
    }());

    // Creates the ship data viewing thingy
    function specData() {
        var hullStats = div('designerHead');
        return div('designerNameNHull').empty().append(
            inputName(),
            [
                hullSelection(hullStats),
                hullStats
            ]
        );
    }

    // Creates the place the player can give the spec a name
    function inputName() {
        var inpName = input().attr('value', model.name);
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
        var ops = [];
        var selected = model.hull;
        if (!selected) {
            var defaultOpt = option('---').attr('disabled', true).attr('selected', true);
            ops.push(defaultOpt);
        }
        else {
            updateInfo(selected);
        }

        // Display all the options, and select the right one
        modules.hulls().forEach(function(curr) {
            var op = option(curr.name);
            op.attr('value', curr.uid);
            if (curr === selected) {
                op.attr('selected', true);
            }
            ops.push(op);
        });

        // Make so the hull information updates when an option is selected
        var sel = select(ops).change(function() {
            var curr = $(this).attr('value');
            model.hull = modules.hulls(curr)
            updateInfo(model.hull);
            showSpecStats();
        });

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
                model.add(mod);
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
            model.map(function(mod, key) {
                // Create the removal button
                var removeBtn = button('btn').html('Remove');
                removeBtn.click(function() {
                    model.remove(key);
                });
                return div().append(
                    mod.name,
                    removeBtn
                );
            })
        );
        return selectedMods;
    }
};

ui._DesignerViewModel = function() {
    var me = this;
    var mods = [];
    this.exists = false;
    this.hull = null;
    this.name = '';
    this.onChange = function() {};

    // Setup everything
    function setup(name, hull, modules) {
        me.name = name;
        me.hull = hull;
        mods = modules;
    }

    // Selects a spec
    this.select = function(spec) {
        if (spec) {
            setup(spec.name, spec.hull, spec.modules().all());
            me.exists = true;
        }
        else {
            me.selectNone();
        }
    };
    
    this.selectNone = function() {
        setup('', null, []);
        me.exists = false;
    };

    // Adds a module
    this.add = function(mod) {
        mods.push(mod);
        me.onChange();
    };

    // Removes the module with the given key
    this.remove = function(key) {
        var removed = mods[key];
        mods.splice(key, 1);
        me.onChange();
    };

    // Iteration of the modules
    this.forEach = function(f) {
        mods.forEach(f);
    };
    this.map = function(f) {
        return mods.map(f);
    };
    
    // Get the stats
    this.stats = function() {
        var maxHealth = me.hull ? me.hull.maxHealth : 0;
        var stats = {maxHealth: maxHealth, range: 0, speed: 0, attack: 0};
        // NOTE:
        // Find a way to unify the following function with the "world" namespace,
        // so that it will done in only one place
        mods.forEach(function(mod) {
            stats.maxHealth += mod.health;
            stats.range += mod.range;
            stats.speed += mod.speed;
            stats.attack += mod.attack;
        });
        return stats;
    };
};
