var world = new function() {
    var ns = this;
    
    // Represents a ship
    var shipUid = 0;
    this.Ship = function(spec, owner) {
        this.type = spec.type;
        this.health = spec.maxHealth;
        this.maxHealth = spec.maxHealth;
        this.range = spec.range;
        this.damage = spec.damage;
        this.speed = spec.speed;
        this.owner = owner;
        
        // The uid is a unique identifier that identifies each ship in the game
        // This value is unique to every ship
        this.uid = ++shipUid;
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
    
    this.DefaultSpecs = {
        ColonyShip : new ns.ShipSpec("Colony Ship", 1, 3, 1, 0),
        Scout : new ns.ShipSpec("Scout", 1, 5, 1, 0)
    };

    // Represents planet types
    this.PlanetType = {
        JUNGLE: "jungle",
        BARREN: "barren",
        WATER: "water"
    };

    // Represents a planet
    this.Planet = function(type) {
        this.type = type;
        this.owner = null;
    };

    // Represents a position
    this.pos = function(row, col) {
        return {row : row, col : col};
    };

    // Represents a star system
    this.StarSystem = function(name, pos) {
        var me = this;
        this.pos = pos;
        this.ships = new core.Hashtable();
        this.planets = [];
        this.sysName = name;

        // Adds the new planet to the system
        this.add = function(type) {
            me.planets.push(new ns.Planet(type));
        };
        
        // Ships enters a system
        this.enter = function(ships) {
            for (var i = 0; i < ships.length; ++i) {
                me.ships.put(ships[i].uid, ships[i]);
            }
        };
        
        // Ships leaves the system
        this.leave = function(ships) {
            for (var i = 0; i < ships.length; ++i) {
                me.ships.remove(ships[i].uid);
            }
        };

        // Returns the civilizations that has colonies in this system
        this.civs = function() {
            var found = [];
            for (var p in me.planets) {
                var owner = me.planets[p].owner;
                if (owner != null)
                    found.push(owner);
            }
            return found;
        };
        
        // Checks if the given civilization has ships in the system
        this.hasShips = function(civ) {
            var ships = me.ships.values();
            for (var i = 0; i < ships.length; ++i) {
                if (ships[i].owner === civ) {
                    return true;
                }
            }
            return false;
        };
    };

    // Represents the universe
    this.Universe = function(width, height) {
        var me = this;
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
        this.addSystem = function(system) {
            me._sysnames.put(system.sysName, system);
            me._syscoords.put(sysCoordId(system.pos.row, system.pos.col), system);
        };

        // Helps adding a civilization to the universe
        this.addCiv = function(civ) {
            me.civs.put(civ.civName, civ);
        };
        
        // Returns the system with the given name
        this.sys = function(name) {
            return me._sysnames.get(name);
        };

        // Returns the name of the system at the given location
        this.sysAt = function(row, col) {
            /*for (var sys in me.systems) {
                sys = me.systems[sys];
                if (sys.pos.row === row && sys.pos.column === column) {
                    return sys.sysName;
                }
            }
            return "";*/
            return me._syscoords.get(sysCoordId(row, col));
        };
        
        this.getSystems = function() {
            return me._sysnames.values();
        };
    };

    this.Civ = function(name, type, home) {
        var me = this;
        this.civName = name;
        this.type = type;
        this.home = home;
        this.money = 5000;
        this.ships = new core.Hashtable();
        
        // Stores the systems the civilization has a presence in
        this.systems = new core.Hashtable();
        this.systems.put(home.sysName, home);
        
        // Stores the visited systems
        // Each visited system will have its name as a key
        // It also stores the civs who was present at the time of the visit
        this._visitedSystems = new core.Hashtable();
        this._visitedSystems.put(home.sysName, [this]);

        // The homeworld is the planet closest to the star
        home.planets[0].owner = this;
        
        // Visit a system
        this.visit = function(sys) {
            me._visitedSystems.put(sys.sysName, sys.civs());
        };
        
        // Check if a system has been visited
        this.visited = function(sys) {
            return me.systems.has(sys.sysName) || me._visitedSystems.has(sys.sysName);
        };
        
        // Returns the civilizations the current civilization knows exist in the given system
        this.civsIn = function(sys) {
            if (me.systems.has(sys.sysName)) {
                return sys.civs();
            }
            return me._visitedSystems.get(sys.sysName);
        };
        
        // Returns the ships the current civilization knows exist in the system
        this.shipsIn = function(sys) {
            if (me.visited(sys)) {
                return sys.ships.values();
            }
            return [];
        };
    };
};
/*
// Represents planet types
var PlanetType = {
    JUNGLE: "jungle",
    BARREN: "barren",
    WATER: "water"
};

// Represents a planet
function Planet(type) {
    this.type = type;
    this.owner = null;
}

// Represents a position in the universe
function Pos(row, column) {
    this.row = row;
    this.column = column;
}

// Represents a star system
function StarSystem(name, pos) {
    this.pos = pos;
    this.planets = [];
    this.sysName = name;

    // Adds the new planet to the system
    var counter = 0;
    this.add = function(planet) {
        this.planets[counter] = planet;
        counter += 1;
    }
}

// Represents a universe
// width - the amount of tiles in each row
// height - the amount of tiles in each column
function Universe(width, height) {
    this.systems = {};
    this.civs = {};
    this.width = width;
    this.height = height;

    // Helps adding a system to the universe
    this.addSystem = function(system) {
        this.systems[system.sysName] = system;
    };

    // Helps adding a civilization to the universe
    this.addCiv = function(civ) {
        this.civs[civ.civName] = civ;
    };

    // Returns the name of the system at the given location
    this.systemAt = function(row, column) {
        for (var sys in this.systems) {
            sys = this.systems[sys];
            if (sys.pos.row === row && sys.pos.column === column) {
                return sys.sysName;
            }
        }
        return "";
    };
}

// Represents a civilization
function Civ(name, type, home) {
    this.civName = name;
    this.type = type;
    this.home = home;
    this.systems = [home];
    this.money = 5000;

    // The homeworld is the planet closest to the star
    home.planets[0].owner = this;
}
*/
