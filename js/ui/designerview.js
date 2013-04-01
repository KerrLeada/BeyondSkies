// Make sure the ui namespace exists
var ui = ui || {};

// Represents the designer view
ui.DesignerView = function(player, parent) {
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
                    specBtn('New spec', designer),
                    span('righted').html('Existing: ')
                ),
                span().append(player.specs.map(function(spec) {
                    return specBtn(spec.name, designer, spec);
                }))
            )
        );
    }

    // Creates a spec button
    function specBtn(content, designer, spec) {
        var btn = button('btn').append(content);
        btn.click(function() {
            specDesigner(designer, spec);
        });
        return btn;
    }

    // Creates the designer
    function specDesigner(parent, spec) {
        var mods = player.modules;
        var sstats = div('designerShipStats');
        var mstats = div('designerModStats');
        var leftPanel = div('designerModPanel').append(categories(spec, mods, mstats));
        parent.empty().append(
            div('designerLeftNStats').append(
                div('designerLeftPanel').append(leftPanel, mstats),
                shipData(spec, sstats, mods)
            )
        );
    }

    // Creates the ship data viewing thingy
    function shipData(spec, parent, mods) {
        var hullStats = div('designerHead');
        var engineStats = div('designerHead');
        return parent.empty().append(
            inputName(spec),
            [
                hullSelection(spec, mods, hullStats),
                hullStats,
                engineSelection(spec, mods, engineStats),
                engineStats
            ]
        );
    }

    // Creates the place the player can give the spec a name
    function inputName(spec) {
        var inpName = input();
        if (spec) {
            inpName.attr('value', spec.name);
        }
        return div(['designerOptions', 'designerHead']).append('Name: ', inpName);
    }

    // Creates a hull selection thing
    function hullSelection(spec, mods, stats) {
        var selected = spec ? spec.hull.uid : null;
        return selection('Hull: ', selected, mods.hulls, function(hull) {
            var cost = hull.cost;
            stats.empty().html('Health: ' + hull.maxHealth + ' Engine slots: ' + hull.engineSlots + ' Money: ' + cost.money + ' Production: ' + cost.production);
        });
    }

    // Creates an engine selection thing
    function engineSelection(spec, mods, stats) {
        var selected = spec ? spec.engine.uid : null;
        return selection('Engine: ', selected, mods.engines, function(engine) {
            var cost = engine.cost;
            stats.empty().html('Speed: ' + engine.speed + ' Range: ' + engine.range + ' Money: ' + cost.money + ' Production: ' + cost.production);
        });
    };

    // Creates a selection thing (used by the functions "hullSelection" and "engineSelection")
    function selection(title, selected, mods, updater) {
        var ops = [];
        if (!selected) {
            ops.push(option('---'));
        }

        // Display all the options, and select the right one
        mods.forEach(function(curr) {
            var op = option(curr.name);
            op.attr('value', curr.uid);
            if (curr.uid === selected) {
                op.attr('selected', true);
                updater(curr);
            }
            ops.push(op);
        });

        var sel = select(ops).change(function() {
            var curr = $(this).attr('value');
            curr = core.lseek(mods, function(mod) {
                return mod.uid === curr;
            });
            updater(curr);
        });

        // Return the selection thing in a div
        return div('designerHead').append(title, sel);
    }

    // Creates the section on the left panel where the player can see the modules
    function categories(spec, mods, mstats) {
        // Create "parent", which contains the modules in a category, and "last", which is the currently selected category
        var stats = div('designerModStats');
        var showMod = modStats(mstats);
        var parent = catContent(div(), mods.weapons, showMod);
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
        last.click(showCategory(mods.weapons));
        return div().append(
            div().append(
                last,
                [
                    button('catBtn').html('Sensors').click(showCategory(mods.sensors)),
                    button('catBtn').html('Other').click(showCategory(mods.other))
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
            parent.append(table('designerHead').append(
                tr().append(
                    td('wide').append(stsBtn),
                    td('righted').append(addBtn)
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
};
