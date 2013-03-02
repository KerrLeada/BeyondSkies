// Make sure the ui namespace exists
var ui = ui || {};

// Handles the system view
ui.SystemView = function(player, uni, shipBar, selector, parent) {
    // Creates a table
    function table() {
        return $('<table>');
    }
    
    // Creates a tr
    function tr() {
        return $('<tr>');
    }
    
    // Creates a td
    function td() {
        return $('<td>');
    }
    
    // Creates an img
    function img() {
        return $('<img>');
    }
    
    // Creates a div
    function div() {
        return $('<div>');
    }
    
    function smallDiv() {
        return div().addClass('dispSmall');
    }
    
    // Creates a paragraph
    function p() {
        return $('<p>');
    }
    
    // Creates a button
    function button() {
        return $('<button>');
    }

    var me = this;
    this._selector = selector;
    
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
        parent.empty().append(
            table().addClass('sysview').append(
                tr().append(
                    td().html((!player.visited(sys)) ? 'Unknown system' : sys.sysName + ' system')
                ),
                
                tr().append(
                    td().append(
                        img().attr('src', 'grfx/' + me._starType[sys.starType])
                    ),
                    displayPlanets(sys)
                )
            )
        );
    };
    
    // Displays the planets (or not)
    function displayPlanets(sys) {
        var count = 0;
        var hasColShip = sys.ships.exists(function(_, ship) {
            return ship.owner === player && colonyShip(ship);
        });
        return (!player.visited(sys)) ? td().append('System has not been visited') : sys.planets.map(function(planet) {
            ++count;
            return td().addClass('paddedLeft').append(
                        div().addClass('centeredText').append(
                        img().attr('src', 'grfx/' + me._mapping[planet.type]),
                        p().append(
                            sys.sysName + ' ' + planet.order,
                            planetInfo(player, parent, planet, hasColShip)
                            /*[
                                div().addClass('dispSmall').html(worldInfo(planet.type)),
                                div().addClass('dispSmall').html('Class ' + planet.clazz),
                                colonyInfo(player, parent, planet, hasColship),
                                populationInfo(planet.colony)
                            ]*/
                        )
                    )
            )
        });
    }
    
    function planetInfo(player, parent, planet, hasColShip) {
        var result = colonyInfo(player, parent, planet, hasColShip);
        var clazz = smallDiv().html('Class ' + planet.clazz);
        var winfo = smallDiv().html(worldInfo(planet.type));
        result.splice(0, 0, winfo, clazz);
        return result;
    }
    
    // What to show about a planet type
    function worldInfo(planetType) {
        var info = planetType;
        if (info !== world.PlanetType.GAS_GIANT &&
            info !== world.PlanetType.ICE_GIANT &&
            info !== world.PlanetType.ASTEROID_FIELD)
            info += ' world';
        return info;
    }
    
    // Creates the colony information div
    function colonyInfo(player, parent, planet, hasColShip) {
        var colony = planet.colony;
        var colInfo = smallDiv();
        var popInfo = smallDiv().append(populationInfo(player, colony));
        if (colony.exists()) {
            colInfo.html(colony.owner === player ? 'Colonized' : 'Colonized by ' + colony.owner.name);
        }
        else if (hasColShip) {
            var btn = button().attr('type', 'button').html('Colonize');
            btn.click(function() {
                // Colonize the planet and update the ship bar
                planet.sys.colonize(player, planet);
                shipBar.update(planet.sys);
                
                // Check if there are more colony ships
                if (planet.sys.hasShips(player, colonyShip)) {
                    // If there are, just replace the button with the text 'Colonized'
                    colInfo.empty().html('Colonized');
                }
                else {
                    // If there are not any more colony ships, redisplay the system
                    me.display(player, parent);
                }
                popInfo.empty().append(populationInfo(player, colony));
            });
            colInfo.append(btn);
        }
        else {
            colInfo.html('---');
        }
        return [colInfo, popInfo];
    }
    
    function populationInfo(player, colony) {
        if (colony.exists()) {
            var info = colony.owner === player ?
                       Math.floor(colony.population * 10) / 10 + ' / ' + colony.maxPopulation :
                       '???'
            return 'Population: ' + info;
                   
        }
        return '---'
    }
    
    // Checks if a ship is a colony ship
    function colonyShip(ship) {
        return ship.type === world.DefaultSpecs.ColonyShip.type;
    }
};
