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
    this.Fleet = function(ds, owner, sys, ships) {
        var me = this;
        this.sys = sys;
        this.owner = owner;
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
    this.Ship = function(spec, owner) {
        this.type = spec.type;
        this.health = spec.maxHealth;
        this.maxHealth = spec.maxHealth;
        this.damage = spec.damage;
        this.owner = owner;
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
        this.create = function(owner) {
            return new ns.Ship(me, owner)
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
    var planetUid;
    this.Planet = function(order, sys, type, clazz) {
        var me = this;
        this.type = type;
        this.order = order;
        this.sys = sys;
        this.clazz = clazz;
        this.colony = new ns.Colony(clazz);
        
        //
        this.uid = 'pl' + ++planetUid;
    };
    
    // Represents a colony on a planet
    this.Colony = function(planetClazz) {
        var me = this;
        this.owner = null;
        this.income = 0;
        this.population = 0;
        this.maxPopulation = Math.round(planetClazz * 1.5);
        
        this.prepare = function(civ) {
            me.owner = civ;
            me.population = 1;
        };
        
        this.exists = function() {
            return me.owner !== null;
        };
        
        this.update = function() {
            if (me.owner && me.population < me.maxPopulation) {
                me.population = Math.min(me.population + me.owner.growth, me.maxPopulation);
                me.income += me.population * 1.20;
            }
        };
    };

    // Represents a position
    this.pos = function(row, col) {
        return {row : row, col : col};
    };
    
    this.StarType = {
        RED: 'Red',
        YELLOW: 'Yellow',
        BLUE: 'Blue'
    };
    
    this.getStarTypes = function() {
        return core.listOwn(ns.StarType);
    };

    // Represents a star system
    this.StarSystem = function(name, pos, starType) {
        var me = this;
        this.pos = pos;
        this.ships = new core.Hashtable();
        this.planets = [];
        this.sysName = name;
        this.starType = starType;
        this.onColonized = function() {};
        this._civs = new core.Hashtable();
        this._income = new core.Hashtable();
        this._colonized = [];
        
        // Gets the income for the given civilization in the current system
        this.income = function(civ) {
            return me._income.get(civ.name);
        };
        
        // Colonizes a planet for a civilization
        this.colonize = function(civ, planet) {
            // Find a colony ship
            var ship = me.ships.find(function(_, s) {
                return s.owner === civ && s.type === ns.DefaultSpecs.ColonyShip.type;
            });
            
            // If there was a colony ship, colonize a planet and remove the colony ship
            if (ship) {
                planet.colony.prepare(civ);
                me.ships.remove(ship.uid);
                civ.systems.set(name, me);
                
                // Make sure the system remembers the colonizing civilization, and then call
                // the onColonized callback
                if (!me._civs.has(civ.name)) {
                    me._civs.set(civ.name, civ);
                }
                me.onColonized(civ, planet);
                me._colonized.push(planet);
                
                //
                if (!me._income.has(civ.name)) {
                    me._income.set(civ.name, 0);
                }
            }
        };
        
        // Ships enters a system
        this.enter = function(ships) {
            for (var i = 0; i < ships.length; ++i) {
                me.ships.set(ships[i].uid, ships[i]);
                ships[i].system = me;
            }
        };
        
        // Ships leaves the system
        this.leave = function(ships) {
            for (var i = 0; i < ships.length; ++i) {
                me.ships.remove(ships[i].uid);
                ships[i].system = null;
            }
        };

        // Returns the civilizations that has colonies in this system
        this.civs = function() {
            return me._civs.values();
        };
        
        // Checks if the given civilization has ships in the system
        this.hasShips = function(civ, pred) {
            var ships = me.ships.values();
            for (var i = 0; i < ships.length; ++i) {
                if (ships[i].owner === civ && (pred === undefined || pred(ships[i]))) {
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
        
        this.update = function() {
            if (!me._civs.isEmpty()) {
                var income = me._income;
                for (var i = 0, len = me._colonized.length; i < len; i++) {
                    var colony = me._colonized[i].colony;
                    var oldInc = colony.income;
                    colony.update();
                    income.set(colony.owner.name, income.get(colony.owner.name) + (colony.income - oldInc));
                }
            }
        };
        
        //
        this._home = function(civ) {
            var homeworld = me.planets[0].colony;
            homeworld.prepare(civ);
            homeworld.update();
            me._colonized.push(me.planets[0]);
            me._civs.set(civ.name, civ);
            me._income.set(civ.name, homeworld.income);
        };
    };
    
    // Represents deep space (the space between star systems)
    this.DeepSpace = function(uni) {
        var me = this;
        this.fleets = new core.Hashtable();
        
        // The fleet arrives at its destination
        function arrive(fleet, dest) {
            dest.enter(fleet.ships.values());
            fleet.owner.visit(dest);
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
        this.name = name; // Testing what happens if its "name" rather then "civName"
        this.type = type;
        this.home = home;
        this.ships = new core.Hashtable();
        this.growth = 0.15;
        
        // Stores the systems the civilization has a presence in
        this.systems = new core.Hashtable();
        this.systems.set(home.sysName, home);
        
        // Stores the visited systems
        // Each visited system will have its name as a key
        // It also stores the civs who was present at the time of the visit
        this._visitedSystems = new core.Hashtable();
        this._visitedSystems.set(home.sysName, [this]);

        // The homeworld is the planet closest to the star
        home._home(this);
        
        this.money = 5000;
        this.income = home.income(this);
        
        // Visit a system
        this.visit = function(sys) {
            me._visitedSystems.set(sys.sysName, sys.civs());
        };
        
        // Check if a system has been visited
        this.visited = function(sys) {
            return me.systems.has(sys.sysName) || me._visitedSystems.has(sys.sysName);
        };
        
        // Returns the civilizations the current civilization knows exist in the given system
        this.civsIn = function(sys) {
            return me.systems.has(sys.sysName) ?
                   sys.civs():
                   me._visitedSystems.get(sys.sysName);
        };
        
        // Returns the ships the current civilization knows exist in the system
        this.shipsIn = function(sys) {
            return me.visited(sys) ?
                   sys.ships.values():
                   [];
        };
        
        this.update = function() {
            me.money += me.income;
            var newInc = 0;
            me.systems.foreach(function(_, sys) {
                newInc += sys.income(me);
            });
            me.income = newInc;
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
            me._sysnames.set(system.sysName, system);
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
            me._sysnames.foreach(function(_, sys) {
                sys.update();
            });
            me.civs.foreach(function(_, civ) {
                civ.update();
            });
        };
    };
};
