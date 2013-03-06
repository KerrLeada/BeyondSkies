var world = new function() {
    var ns = this;
    
    // Contains common operations for things like finding ships
    // Everything in this namespace are pure functions and are used as
    // filters and predicates
    var ShipUtils = new function() {
        // Used to find the ship with the shortest range
        this.shortestRange = function(o, n) {
            return o.range > n.range;
        };
        
        // Used to find the slowest ship
        this.slowest = function(o, n) {
            return o.speed > n.speed;
        };
    };
    this.ShipUtils = ShipUtils;
    
    // Represents a fleet
    // Fleets are used to group ships and travel in deep space
    // The last argument, ships, is an optional hashtable for
    // the ships that the fleet contains
    var fleetUid = 0;
    this.Fleet = function(ds, civ, sys, ships) {
        var me = this;
        this.sys = sys;
        this.civ = civ;
        this.ships = new core.Hashtable(ships);
        this.onArrival = function() {};
        
        // Used to update the fleet range and speed
        // Note that this doesnt update the movement points of the
        // fleet
        function updateRangeSpeed() {
            me.range = me.ships.findBest(ShipUtils.shortestRange).range;
            me.speed = me.ships.findBest(ShipUtils.slowest).speed;
        }
        
        // Set the fleet speed, range and movement points
        if (!this.ships.isEmpty()) {
            updateRangeSpeed();
            this.mp = this.speed;
        }
        else {
            this.range = 0;
            this.speed = 0;
            this.mp = 0;
        }
        
        // Set the fleet uid
        this.uid = 'flt' + ++fleetUid;
        
        // Adds all the given ships to the fleet
        this.addShips = function(ships) {
            for (var i = 0; i < ships.length; ++i) {
                me.ships.set(ships[i].uid, ships[i]);
            }
            updateRangeSpeed();
        };
        
        // Removes all the given ships from the fleet
        this.removeShips = function(ships) {
            me.ships.removeAll(ships);
            updateRangeSpeed();
        };
        
        // Sends the fleet to the marked destination (returns true if there was a destination, false otherwise)
        this.sendTo = function(sys) {
            var shortest = me.ships.findBest(ShipUtils.shortestRange);
            if (me.sys.distanceTo(sys) <= shortest.range) {
                var ships = me.ships.values();
                me.sys.leave(ships);
                ds.enter(me, sys);
                return true;
            }
            return false;
        };
        
        // Called to update the fleet state when the turn has ended
        this.update = function() {
            me.mp = me.speed;
        };
    };
    
    // Represents a ship
    var shipUid = 0;
    this.Ship = function(spec, civ) {
        this.type = spec.type;
        this.health = spec.maxHealth;
        this.maxHealth = spec.maxHealth;
        this.damage = spec.damage;
        this.civ = civ;
        this.system = null;
        
        // Set the range, speed and mp, where range is how far it can travel
        // from a system, speed is how many tiles it moves per turn and mp is
        // how many movement points it has. A ship can at most have "speed"
        // amount of mp.
        this.range = spec.range;
        this.speed = spec.speed;
        this.mp = spec.speed;
        
        // The uid is a unique identifier that identifies each ship in the game
        // This value is unique to every ship
        this.uid = 'shp' + ++shipUid;
    };
    
    // A ship specification, used to create new ships
    this.ShipSpec = function(type, maxHealth, range, speed, damage) {
        this.type = type;
        this.maxHealth = maxHealth;
        this.range = range;
        this.speed = speed;
        this.damage = damage;
        
        var me = this;
        
        // Creates a new ship from the ship spec
        // Accepts the ship name and the owner of the ship
        this.create = function(civ) {
            return new ns.Ship(me, civ)
        };
    };
    
    // The default specs for every civilization
    this.DefaultSpecs = {
        ColonyShip : new ns.ShipSpec('Colony Ship', 1, 20, 1, 0),
        Scout : new ns.ShipSpec('Scout', 1, 5000, 2, 0)
    };

    // Represents planet types
    this.PlanetType = {
        JUNGLE: 'Jungle',
        BARREN: 'Barren',
        WATER: 'Water',
        CRYSTAL: 'Crystal',
        MECHANICAL: 'Mechanical',
        ICE: 'Ice',
        LAVA: 'Lava',
        VULCANIC: 'Vulcanic',
        TORN: 'Torn',
        OCEAN: 'Ocean',
        EXOTIC: 'Exotic',
        GAS_GIANT: 'Gas giant',
        ICE_GIANT: 'Ice giant',
        ASTEROID_FIELD: 'Asteroid field'
    };
    
    // Returns a list of the planet types
    this.getPlanetTypes = function() {
        return core.listOwn(ns.PlanetType);
    };
    
    // Represents a planet
    var planetUid = 0;
    this.Planet = function(order, sys, type, clazz) {
        var me = this;
        this.type = type;
        this.order = order;
        this.sys = sys;
        this.clazz = clazz;
        this.colony = null;
        this.uid = 'pl' + ++planetUid;
    };

    // Represents a position
    this.pos = function(row, col) {
        return {row : row, col : col};
    };
    
    // Represents a star type
    this.StarType = {
        RED: 'Red',
        YELLOW: 'Yellow',
        BLUE: 'Blue'
    };
    
    // Gets the star types
    this.getStarTypes = function() {
        return core.listOwn(ns.StarType);
    };

    // Represents a star system
    this.StarSystem = function(name, pos, starType) {
        var me = this;
        this.pos = pos;
        this.ships = new core.Hashtable();
        this.planets = [];
        this.name = name;
        this.starType = starType;
        this.onColonized = function() {};
        
        // Ships enters a system
        this.enter = function(ships) {
            for (var i = 0, len = ships.length; i < len; i++) {
                me.ships.set(ships[i].uid, ships[i]);
                ships[i].system = me;
            }
        };
        
        // Ships leaves the system
        this.leave = function(ships) {
            for (var i = 0, len = ships.length; i < len; i++) {
                me.ships.remove(ships[i].uid);
                ships[i].system = null;
            }
        };

        // Returns the civilizations that has colonies in this system
        this.civs = function() {
            return me.planets.reduce(function(civs, planet) {
                if (planet.colony && $.inArray(planet.colony.civ, civs) === -1) {
                    civs.push(planet.colony.civ);
                }
                return civs;
            }, []);
        };
        
        // Checks if the given civilization has ships in the system
        this.hasShips = function(civ, pred) {
            var ships = me.ships.values();
            for (var i = 0, len = ships.length; i < len; i++) {
                if (ships[i].civ === civ && (pred === undefined || pred(ships[i]))) {
                    return true;
                }
            }
            return false;
        };
        
        // Calculates the distance to the other system
        this.distanceTo = function(otherSys) {
            var rows = Math.abs(me.pos.row - otherSys.pos.row);
            var cols = Math.abs(me.pos.col - otherSys.pos.col);
            return core.pythagoras(rows, cols);
        };
    };
    
    // Represents a colony on a planet
    var colUid = 0;
    this.Colony = function(civ, planet) {
        var me = this;
        this.civ = civ;
        this.sys = planet.sys;
        this.planet = planet;
        this.population = 1;
        this.maxPopulation = Math.round(planet.clazz * 1.5);
        this.uid = 'col' + ++colUid;
        planet.colony = this;
        
        // Updates the colony
        this.update = function() {
            if (me.civ && me.population < me.maxPopulation) {
                me.population = Math.min(me.population + me.civ.growth, me.maxPopulation);
            }
        };
    };
    
    // Handles the colonies of a civilization
    this.ColonyManager = function(civ) {
        var me = this;
        this.civ = civ;
        this.income = 0;
        this.systems = new core.Hashtable();
        this.colonies = new core.Hashtable();
        this.colonies.set(civ.home.name, {
            colonies: [new ns.Colony(civ, civ.home.planets[0])],
            income: 0,
            production: 0
        });
        
        // Colonizes a planet
        this.colonize = function(planet) {
            // Make sure there is a colony ship
            var sys = planet.sys;
            var colship = sys.ships.find(function(_, s) {
                return s.civ === civ && s.type === ns.DefaultSpecs.ColonyShip.type;
            });
            if (colship) {
                // Remove the colony ship and colonize the planet
                sys.ships.remove(colship.uid);
                if (me.colonies.has(sys.name)) {
                    sys = me.colonies.get(sys.name);
                    sys.colonies.push(new ns.Colony(civ, planet));
                }
                else {
                    me.systems.set(sys.name, sys);
                    var col = new ns.Colony(civ, planet);
                    me.colonies.set(sys.name, {
                        colonies: [col],
                        income: 0,
                        production: 0
                    });
                }
            }
            else {
                // So failure wont be silent :P
                throw 'Colonization of ' + planet.sys.name + ' ' + planet.order + ' failed due to lack of a colony ship';
            }
        };
        
        // Go through all the systems and colonies, update them and calculate the income and all that crap
        this.update = function() {
            me.income = 0;
            me.colonies.foreach(function(_, sys) {
                var colonies = sys.colonies;
                var income = 0;
                var production = 0;
                for (var i = 0, len = colonies.length; i < len; i++) {
                    colonies[i].update();
                    income += colonies[i].population * 1.2;
                    production += colonies[i].population * 0.75;
                }
                sys.income = income;
                sys.production = production;
                me.income += income;
            });
        };
    };
    
    // Represents deep space (the space between star systems)
    this.DeepSpace = function(uni) {
        var me = this;
        this.fleets = new core.Hashtable();
        
        // The fleet arrives at its destination
        function arrive(fleet, dest) {
            dest.enter(fleet.ships.values());
            fleet.civ.visit(dest);
            me.leave(fleet);
            fleet.onArrival(dest);
        }
        
        // Enters a ship to deep space
        this.enter = function(fleet, dest) {
            var origin = fleet.sys;
            var distance = fleet.sys.distanceTo(dest);
            
            // Check if the fleet has enough movement to move directly to the system
            if (distance > fleet.mp) {
                // If the ship couldnt arrive directly, register it
                fleet.sys = null;
                distance -= fleet.mp;
                me.fleets.set(fleet.uid, {fleet: fleet,
                                          origin: origin,
                                          dest: dest,
                                          distance: distance});
            }
            else {
                // Reduce the fleets movement points and let it arrive
                fleet.mp -= distance;
                arrive(fleet, dest);
            }
        };
        
        // Make the given fleet leave deep space
        this.leave = function(fleet) {
            me.fleets.remove(fleet.uid);
        };
        
        // Update the fleets
        this.update = function() {
            me.fleets.foreach(function(_, entry) {
                entry.fleet.update();
                if (entry.distance > entry.fleet.mp) {
                    entry.distance -= entry.fleet.mp;
                }
                else {
                    arrive(entry.fleet, entry.dest);
                }
            });
        };
    };
    
    // Represents a civilization
    this.Civ = function(name, type, home) {
        var me = this;
        this.name = name;
        this.type = type;
        this.home = home;
        this.ships = new core.Hashtable();
        this.growth = 0.15;
        
        // Stores the systems the civilization has a presence in
        //this._systems = new core.Hashtable();
        //this._systems.set(home.name, home);
        this._colonyMan = new ns.ColonyManager(this);
        this._colonyMan.update();
        this._systems = this._colonyMan.systems;
        
        // Stores the visited systems
        // Each visited system will have its name as a key
        // It also stores the civs who was present at the time of the visit
        this._visitedSystems = new core.Hashtable();
        this._visitedSystems.set(home.name, [this]);

        this.money = 5000;
        this.income = this._colonyMan.income;
        
        this.colonize = this._colonyMan.colonize;
        
        this.systems = function() {
            return me._systems.values();
        };
        
        this.systemInfo = function(sys) {
            var info = me._colonyMan.colonies.get(sys.name);
            if (info) {
                info = {
                    income: info.income,
                    production: info.production
                };
            }
            return info;
        };
        
        // Visit a system
        this.visit = function(sys) {
            me._visitedSystems.set(sys.name, sys.civs());
        };
        
        // Check if a system has been visited
        this.visited = function(sys) {
            return me._systems.has(sys.name) || me._visitedSystems.has(sys.name);
        };
        
        // Returns the civilizations the current civilization knows exist in the given system
        this.civsIn = function(sys) {
            return me._systems.has(sys.name) ?
                   sys.civs():
                   me._visitedSystems.get(sys.name);
        };
        
        // Returns the ships the current civilization knows exist in the system
        this.shipsIn = function(sys) {
            return me.visited(sys) ?
                   sys.ships.values():
                   [];
        };
        
        this.update = function() {
            me.money += me.income;
            me._colonyMan.update();
            me.income = me._colonyMan.income;
        };
    };

    // Represents the universe
    this.Universe = function(width, height, systems) {
        var me = this;
        this.deepspace = new ns.DeepSpace();
        this._sysnames = new core.Hashtable();
        this._syscoords = new core.Hashtable();
        this.civs = new core.Hashtable();
        this.width = width;
        this.height = height;
        
        // Used to transform the system coordinates into a string
        function sysCoordId(row, col) {
            return 'r' + row + 'c' + col;
        }

        // Helps adding a system to the universe
        function addSystem(system) {
            me._sysnames.set(system.name, system);
            me._syscoords.set(sysCoordId(system.pos.row, system.pos.col), system);
        };
        
        // Adds the system
        for (var i = 0; i < systems.length; ++i) {
            addSystem(systems[i]);
        }
        
        // Returns the system with the given name
        this.sys = function(name) {
            return me._sysnames.get(name);
        };

        // Returns the name of the system at the given location
        this.sysAt = function(row, col) {
            return me._syscoords.get(sysCoordId(row, col));
        };
        
        // Calculates the distance between two systems in tiles
        this.distance = function(sys1, sys2) {
            var rows = Math.abs(sys1.pos.row - sys2.pos.row);
            var cols = Math.abs(sys1.pos.col - sys2.pos.col);
            return core.pythagoras(rows, cols);
        };
        
        // Get all the systems
        this.getSystems = function() {
            return me._sysnames.values();
        };
        
        this.update = function() {
            me.deepspace.update();
            /*
            me._sysnames.foreach(function(_, sys) {
                sys.update();
            });
            */
            me.civs.foreach(function(_, civ) {
                civ.update();
            });
        };
    };
};
