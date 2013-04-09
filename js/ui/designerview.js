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

    // The modules known by the player
    var modules = player.modules;
    var model = new ui._DesignerViewModel();

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
        var selNameHull = div('designerNameNHull');
        var mstats = div('designerModStats');
        var leftPanel = div('designerModPanel').append(categories(mstats));
        var selMods = div('designerSelMods');
        parent.empty().append(
            div('designerLeftNStats').append(
                div('designerLeftPanel').append(leftPanel, mstats),
                [
                    shipData(selNameHull),
                    showShipMods(selMods)
                ]
            ),
            div('designerShipStats').append(
                div().html('Ship Stats'),
                [
                    div().html('Health: ???'),
                    div().html('Range: ???'),
                    div().html('Speed: ???'),
                    div().html('Attack: ???')
                ]
            )
        );
    }

    // Creates the ship data viewing thingy
    function shipData(parent) {
        var hullStats = div('designerHead');
        return parent.empty().append(
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
        var ops = [];
        var selected = model.hull;
        if (!selected) {
            ops.push(option('---'));
        }

        function updateInfo(hull) {
            var cost = hull.cost;
            stats.empty().html('Health: ' + hull.maxHealth + ' Size: ' + hull.size + ' Money: ' + cost.money + ' Production: ' + cost.production);
        }

        // Display all the options, and select the right one
        modules.hulls().forEach(function(curr) {
            var op = option(curr.name);
            op.attr('value', curr.uid);
            if (curr.uid === selected) {
                op.attr('selected', true);
                updateInfo(curr);
            }
            ops.push(op);
        });

        var sel = select(ops).change(function() {
            var currUid = $(this).attr('value');
            updateInfo(modules.hull(currUid));
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

    function showShipMods(parent) {
        parent.empty().append(
            'Ship Modules',
            model.map(function(mod) {
                return div().html(mod.name);
            })
        );
        return parent;
    }
};

ui._DesignerViewModel = function() {
    var mods = [];
    var me = this;
    this.hull = null;
    this.name = '';

    function setup(name, hull, modules) {
        me.name = name;
        me.hull = hull;
        mods = modules;
    }

    // Selects a spec
    this.select = function(spec) {
        if (spec) {
            setup(spec.name, spec.hull, spec.modules().all());
        }
        else {
            setup('', null, []);
        }
    };

    // Adds a module
    this.add = function(mod) {
        mods.push(mod);
    };

    // Removes the module at the given index
    this.remove = function(index) {
        mods.splice(index, 1);
    };

    // Iterates through the modules
    this.forEach = core.bind(mods, mods.forEach);
    this.map = core.bind(mods, mods.map);
};
