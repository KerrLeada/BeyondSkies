// Make sure the ui namespace exists
var ui = ui || {};

// Handles the system view
ui.SystemView = function(player, uni, uipipe, selector, parent) {
    var me = this;
    this._selector = selector;

    // Imports
    var table = ui.html.table;
    var tr = ui.html.tr;
    var td = ui.html.td;
    var img = ui.html.img;
    var div = ui.html.div;
    var p = ui.html.p;
    var button = ui.html.button;
    var ModuleFlags = world.ModuleFlags;
    
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
    this.display = function() {
        var sys = me._selector();
        var sysInfo = player.systemInfo(sys);
        parent.empty().append(
            systemInfo(player, sys, sysInfo),
            table().addClass('sysview').append(
                tr().append(
                    td().append(
                        div('star').append(
                            img().attr('src', 'grfx/' + me._starType[sys.starType]),
                            button('knowMore').text('Get facts').click(function() {
                                uipipe.showStar(me._selector());
                            })
                        )
                    ),
                    displayPlanets(sys)
                )
            )
        );
        // TEMPORARY SOLUTION BELLOW
        if (sysInfo) {
            parent.append(systemBar(sysInfo));
        }
    };
    
    // Creates a div that displays basic system information
    function systemInfo(player, sys, sysInfo) {
        var result = div('systemInfo');
        if (player.visited(sys)) {
            result.append(
                div('infoTitle').html(sys.name + ' system')
            );
            if (sysInfo) {
                result.append(
                    table('systemInfoData').append(tr().append(
                        td().html('Income: ' + Math.floor(sysInfo.income * 10) / 10),
                        td().html(' Production: ' + Math.floor(sysInfo.production * 10) / 10)
                    ))
                );
            }
        }
        else {
            result.append(
                div('infoTitle').html('Unknown system')
            );
        }
        return result;
    }
    
    // Displays the planets (or not)
    function displayPlanets(sys) {
        var count = 0;
        var hasColShip = sys.ships.exists(function(ship) {
            return ship.civ() === player && ship.check(ModuleFlags.COLONY);
        });
        if (!player.visited(sys)) {
            var result = td().append('System has not been visited')
        }
        else {
            var result = sys.planets.map(function(planet) {
                ++count;
                return td('paddedLeft').append(
                    div('centeredText').append(
                        div('planet').append(
                            img().attr('src', 'grfx/' + me._mapping[planet.type]),
                            button('knowMore').text('Get facts').click(function() {
                                uipipe.showPlanet(planet);
                            })
                        ),
                        p().append(
                            sys.name + ' ' + planet.order,
                            planetInfo(player, parent, planet, hasColShip)
                        )
                    )
                )
            });
        }
        return result;
    }
    
    // Shows the planet information
    function planetInfo(player, parent, planet, hasColShip) {
        var result = colonyInfo(player, parent, planet, hasColShip);
        var clazz = div().html('Class ' + planet.clazz);
        result.splice(0, 0, clazz);
        var winfo = div().html(worldInfo(planet.type));
        return div('dispSmall').append(winfo, result);
    }
    
    // What to show about a planet type
    function worldInfo(planetType) {
        var info = planetType;
        if (info !== world.PlanetType.GAS_GIANT &&
            info !== world.PlanetType.ICE_GIANT &&
            info !== world.PlanetType.ASTEROID_FIELD) {
            info += ' world';
        }
        return info;
    }
    
    // Creates the colony information div
    function colonyInfo(player, parent, planet, hasColShip) {
        var colony = planet.colony;
        var colInfo = div();
        var popInfo = div().append(populationInfo(player, colony));
        if (colony) {
            colInfo.html(colony.civ === player ? 'Colonized' : 'Colonized by ' + colony.civ.name);
        }
        else if (hasColShip) {
            var btn = button().attr('type', 'button').html('Colonize');
            btn.click(function() {
                // Colonize the planet and update the system view and ship bar
                player.colonize(planet);
                uipipe.updateShipBar(planet.sys);
                me.display(player, parent);
                popInfo.empty().append(populationInfo(player, colony));
            });
            colInfo.append(btn);
        }
        else {
            colInfo.html('---');
        }
        return [colInfo, popInfo];
    }
    
    // Creates the population info text
    function populationInfo(player, colony) {
        if (colony) {
            var info = colony.civ === player ?
                       Math.floor(colony.population * 10) / 10 + ' / ' + colony.maxPopulation :
                       '???'
            return 'Population: ' + info;
        }
        return '---';
    }
    
    // Creates the system bar
    function systemBar(sysInfo) {
        var constList = table(['constTable', 'constTableCell']);
        var result = div('systemBar').append(
            table().append(tr().append(
                constMenu(constList, sysInfo),
                td('constList').append(constQueue(constList, sysInfo))
            ))
        );
        return result;
    }

    // Creates the construction menu
    function constMenu(constList, sysInfo) {
        var menu = td('constOptions');
        player.specs.forEach(function(spec) {
            var btn = button();
            btn.attr('type', 'button');
            btn.html(spec.name);
            btn.click(function() {
                build(constList, sysInfo, spec);
            });
            menu.append(btn);
        });
        return menu;
    }
    
    // Creates the construction queue
    function constQueue(parent, sysInfo) {
        var content = sysInfo.constQueue.building();
        parent.empty();
        if (content.length > 0) {
            parent.append(constEntry(content[0], true).addClass('constListBuilding'));
            for (var i = 1, len = content.length; i < len; i++) {
                parent.append(constEntry(content[i], false));
            }
        }
        return parent;
    }
    
    // Creates a row for the construction queue
    function constEntry(c, showCost) {
        return tr().append(
            td('constTableCell').html(c.spec.name),
            [
                td().html(constructionCost(c, showCost)),
                td().html(c.eta > 1 ? c.eta + ' turns' : '1 turn')
            ]
        );
    }
    
    // Shows the cost (or not)
    function constructionCost(c, showCost) {
        if (showCost)
            return 'cost: ' + Math.floor(c.turnCost * 10) / 10;
        return '';
    }
    
    // Adds something to the construction queue
    function build(constList, sysInfo, spec) {
        sysInfo.constQueue.build(spec);
        constQueue(constList, sysInfo);
    }
};
