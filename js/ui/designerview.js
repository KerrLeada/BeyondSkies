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
        var stats = div('designerModStats');
        var showMod = modStats(stats);
        var leftPanel = div('designerLeftPanel').append(
            inputName(spec),
            [
                hullSelection(spec, mods),
                engineSelection(spec, mods),
                categories(spec, mods, showMod)
            ]
        );
        parent.empty().append(div('designerLeftNStats').append(leftPanel, stats));
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
    function hullSelection(spec, mods) {
        var selected = spec ? spec.hull.uid : null;
        return selection('Hull: ', selected, mods.hulls);
    }

    // Creates an engine selection thing
    function engineSelection(spec, mods) {
        var selected = spec ? spec.engine.uid : null;
        return selection('Engine: ', selected, mods.engines);
    };

    // Creates a selection thing (used by the functions "hullSelection" and "engineSelection")
    function selection(title, selected, mods) {
        var ops = [];
        if (selected) {
            // Display all the options, and select the right one
            mods.forEach(function(curr) {
                var op = option(curr.name);
                if (curr.uid === selected) {
                    op.attr('selected', true);
                }
                ops.push(op);
            });
        }
        else {
            // Display the options when there was nothing to select
            ops.push(option('---'));
            mods.forEach(function(curr) {
                ops.push(option(curr.name));
            });
        }
        // Return the selection thing in a div
        return div('designerHead').append(title, select(ops));
    }

    // Creates the section on the left panel where the player can see the modules
    function categories(spec, mods, showMod) {
        // Create "parent", which contains the modules in a category, and "last", which is the currently selected category
        var parent = catContent(div(), mods.weapons, showMod);
        var last = button('catBtn').attr('disabled', true).html('Weapons');
        
        // Creates a function that displays the given modules as a category
        function showCategory(catMods) {
            return function() {
                var clicked = $(this);
                last.attr('disabled', false);
                clicked.attr('disabled', true);
                last = clicked;
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
            parent
        );
    }

    // Shows the content of a category
    function catContent(parent, catMods, showMod) {
        parent.empty();
        catMods.forEach(function(mod) {
            var btn = button('btn').html(mod.name).click(showMod(mod));
            parent.append(btn);
        });
        return parent;
    }

    // A function that creates a function that creates a function that displays information about a module
    function modStats(parent) {
        return function(mod) {
            return function() {
                parent.empty().append(
                    div('designerHead').html('Module: ' + mod.name),
                    [
                        div('designerHead').append('Description', p().html(mod.desc)),
                        div().html('Effects'),
                        div().html('Health: ' + mod.health),
                        div().html('Speed: ' + mod.speed),
                        div().html('Range: ' + mod.range),
                        div().html('Attack: ' + mod.attack)
                    ]
                );
            };
        };
    }
};
