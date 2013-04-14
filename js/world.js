'use strict';

var world = (function() {
    var ns = {};
    
    // Creates cost
    function mkcost(money, production) {    
        var result = {
            money: money,
            production: production,
            add: function(other) {
                return mkcost(result.money + other.money, result.production + other.production);
            }
        };
        return result;
    }
    ns.cost = mkcost;
    
    // Contains common operations for things like finding ships
    // Everything in this namespace are pure functions and are used as
    // filters and predicates
    var ShipUtils = {
        // Used to find the ship with the shortest range
        shortestRange: function(o, n) {
            return o.range() > n.range();
        },
        
        // Used to find the slowest ship
        slowest: function(o, n) {
            return o.speed() > n.speed();
        }
    };
    ns.ShipUtils = ShipUtils;
    
    // Function that creates a new hull
    var hullUid = 0;
    ns.Hull = function(name, maxHealth, size, cost) {
        this.name = name;
        this.maxHealth = maxHealth;
        this.size = size;
        this.cost = cost;
        this.uid = 'hul' + ++hullUid;
    };
    ns.Hull.COLONY_HULL = new ns.Hull('Colony Hull', 1, 50, mkcost(1, 1));
    ns.Hull.SMALL_HULL = new ns.Hull('Small Hull', 15, 20, mkcost(1, 1));
    ns.Hull.MEDIUM_HULL = new ns.Hull('Medium Hull', 50, 40, mkcost(3, 3));
    ns.Hull.LARGE_HULL = new ns.Hull('Large Hull', 130, 80, mkcost(10, 7));
    
    // Module flags
    var ModuleFlags = {
        NONE: 0,   // 0000
        ENGINE: 1, // 0001
        SENSOR: 2, // 0010
        WEAPON: 4, // 0100
        COLONY: 8  // 1000
    };
    ns.ModuleFlags = ModuleFlags;
    
    // A module
    var modUid = 0;
    var Module = function(name, flag, cost, data) {
        if (!data) {
            throw new TypeError('Expecting data');
        }
        this.name = name;
        this.flag = flag;
        this.size = data.size || 5;
        this.desc = data.desc || '';
        this.cost = cost;
        this.uid = 'mod' + ++modUid;

        // The stats
        this.health = data.health || 0;
        this.speed = data.speed || 0;
        this.range = data.range || 0;
        this.attack = data.attack || 0;
    };
    ns.Module = Module;
    
    // The engine module
    ns.EngineModule = core.newCtor(Module, function(name, cost, data) {
        this._super(this, name, ModuleFlags.ENGINE, cost, data);
        if (isNaN(data.speed)) {
            throw new TypeError('A speed is required');
        }
        if (isNaN(data.range)) {
            throw new TypeError('A range is required');
        }
    });

    // The sensor module
    ns.SensorModule = core.newCtor(Module, function(name, cost, data) {
        this._super(this, name, ModuleFlags.SENSOR, cost, data || {});
    });
    
    // The weapon module
    ns.WeaponModule = core.newCtor(Module, function(name, cost, data) {
        this._super(this, name, ModuleFlags.WEAPON, cost, data);
        if (isNaN(data.attack)) {
            throw new TypeError('An attack damage is required for a weapon');
        }
    });
    
    // The colony module
    ns.ColonyModule = core.newCtor(Module, function(name, cost, data) {
        this._super(this, name, ModuleFlags.COLONY, cost, data || {});
    });
    
    /*
    // Manages the modules of a civilization
    var BaseModuleManager = function() {
        var me = this;
        this._engines = new core.Hashtable();
        this._sensors = new core.Hashtable();
        this._weapons = new core.Hashtable();
        this._other = new core.Hashtable();
        this._all = new core.Hashtable();

        // Adds the given array of modules to the given target array
        function addAll(target, toAdd) {
            if (toAdd) {
                toAdd.forEach(function(mod) {
                    target.add(mod.uid, mod);
                    me._all.add(mod.uid, mod);
                });
            }
        }

        // Creates a getter. The getter has an optional uid argument. If it is given,
        // the module with that uid will be returned, otherwise a list of modules will be returned.
        function getter(src) {
            return core.bind(src, function(uid) {
                if (uid) {
                    return src.get(uid);
                }
                return src.values();
            });
        }

        // Adds the modules in the given module object to the module manager
        this.addModules = function(mods) {
            addAll(me._engines, mods.engines);
            addAll(me._sensors, mods.sensors);
            addAll(me._weapons, mods.weapons);
            addAll(me._other, mods.other);
        };

        this.engines = getter(me._engines);
        this.sensors = getter(me._sensors);
        this.weapons = getter(me._weapons);
        this.other = getter(me._other);
        this.all = core.bind(me._all, me._all.values);

        this.get = core.bind(me._all, me._all.get);
        this.map = core.bind(me._all, me._all.map);
    };

    // Adds the given array of modules to the given target array
    function addAllMods(all, target, toAdd) {
        if (toAdd) {
            toAdd.forEach(function(mod) {
                target.add(mod.uid, mod);
                all.add(mod.uid, mod);
            });
        }
    }

    // Creates a base module type for the module managers
    var BaseModuleManager = function() {
        this._engines = new core.Hashtable();
        this._sensors = new core.Hashtable();
        this._weapons = new core.Hashtable();
        this._other = new core.Hashtable();
        this._all = new core.Hashtable();

        // Getters for the modules
        this.engines = core.getter(this._engines);
        this.sensors = core.getter(this._sensors);
        this.weapons = core.getter(this._weapons);
        this.other = core.getter(this._other);
        var me = this;
        this.all = function() {
//            console.log(me._all.values());
            return me._all.values();
        };//core.bind(this._all, this._all.values);

        // Access and iteration of the modules
        this.get = core.bind(this._all, this._all.get);
        this.map = core.bind(this._all, this._all.map);
        this.forEach = core.bind(this._all, this._all.forEach);
    };
    */

    // A module manager for a ship
    ns.ShipModuleManager = function(hull, mods) {
        var me = this;
        
        // Module lists
        function getMods(src) {
            return src ? src.slice() : [];
        }
        var engines = getMods(mods.engines);
        var sensors = getMods(mods.sensors);
        var weapons = getMods(mods.weapons);
        var other = getMods(mods.other);
        var all = engines.concat(sensors, weapons, other);
        
        //
        var stats = {maxHealth: hull.maxHealth, speed: 0, range: 0, attack: 0};
        var flags = ModuleFlags.NONE;
        all.forEach(function(mod) {
            stats.maxHealth += mod.maxHealth;
            stats.speed += mod.speed;
            stats.range += mod.range;
            stats.attack += mod.attack;
        });
        
        this.stats = function() {
        };
        
        // Get the hull
        this.hull = function() {
            return hull;
        };
        
        // Getters
        this.engines = core.arrGetter(engines);
        this.sensors = core.arrGetter(sensors);
        this.weapons = core.arrGetter(weapons);
        this.other = core.arrGetter(other);
        this.all = core.arrGetter(all);
        
        // Methods for adding a module
        function addMod(cat, mod) {
            cat.push(mod);
            all.push(mod);
        }
        this.addEngine = function(mod) {
            addMod(engines, mod);
        };
        this.addSensor = function(mod) {
            addMod(sensors, mod);
        };
        this.addWeapon = function(mod) {
            addMod(weapons, mod);
        };
        this.addOther = function(mod) {
            addMod(other, mod);
        };
        
        // Adds the modules in the list of modules
        this.addModules = function(mods) {
            mods.forEach(function(mod) {
                ns.registerModule(me, mod);
            });
        };

        // Creates a copy of the ship module manager
        this.copy = function() {
            return new ns.ShipModuleManager(hull, {
                engines: engines,
                sensors: sensors,
                weapons: weapons,
                other: other
            });
        };

        // Iteration
        this.forEach = core.bind(all, all.forEach);
        this.map = core.bind(all, all.map);
    };

    // A module manager for a civilization
    ns.CivModuleManager = function() {
        var me = this;
        this._hulls = new core.Hashtable();

        // Add the hulls
        [ns.Hull.COLONY_HULL, ns.Hull.SMALL_HULL, ns.Hull.MEDIUM_HULL, ns.Hull.LARGE_HULL].forEach(function(hull) {
            me._hulls.add(hull.uid, hull);
        });
        
        this._engines = new core.Hashtable();
        this._sensors = new core.Hashtable();
        this._weapons = new core.Hashtable();
        this._other = new core.Hashtable();
        this._all = new core.Hashtable();
        
        // Returns the hulls
        this.hulls = core.getter(this._hulls);

        // Getters for the modules
        this.engines = core.getter(this._engines);
        this.sensors = core.getter(this._sensors);
        this.weapons = core.getter(this._weapons);
        this.other = core.getter(this._other);
        this.all = core.getter(this._all);

        // Adds the given array of modules to the given target array
        function addAllMods(target, toAdd) {
            if (toAdd) {
                toAdd.forEach(function(mod) {
                    target.add(mod.uid, mod);
                    me._all.add(mod.uid, mod);
                });
            }
        }

        // Adds the modules in the given module object to the module manager
        this.addModules = function(mods) {
            addAllMods(me._engines, mods.engines);
            addAllMods(me._sensors, mods.sensors);
            addAllMods(me._weapons, mods.weapons);
            addAllMods(me._other, mods.other);
        };

        // Access and iteration of the modules
        this.get = core.bind(this._all, this._all.get);
        this.forEach = core.bind(this._all, this._all.forEach);
        this.map = core.bind(this._all, this._all.map);
    };
    
    // Used to register modules, depending on their flag
    ns.registerModule = (function() {
        var dispatch = {};
        dispatch[ModuleFlags.ENGINE] = function(target, mod) {
            target.addEngine(mod);
        };
        dispatch[ModuleFlags.SENSOR] = function(target, mod) {
            target.addSensor(mod);
        };
        dispatch[ModuleFlags.WEAPON] = function(target, mod) {
            target.addWeapon(mod);
        };
        dispatch[ModuleFlags.OTHER] = function(target, mod) {
            target.addOther(mod);
        };
        return function(target, mod) {
            dispatch[mod.flag](target, mod);
        };
    }());
    
    // Represents a fleet
    // Fleets are used to group ships and travel in deep space
    // The last argument, ships, is an optional hashtable for
    // the ships that the fleet contains
    var fleetUid = 0;
    ns.Fleet = function(ds, civ, sys, ships) {
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
                me.ships.add(ships[i].uid, ships[i]);
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
    
    // A ship specification, used to create new ships
    ns.ShipSpec = function(civ, name, hull, modules) {
        var me = this;
        this.civ = civ;
        this.name = name;
        this.hull = hull;

        // Set the modules
        /*
        var mods = {}
        mods.engines = modules.engines || [];
        mods.sensors = modules.sensors || [],
        mods.weapons = modules.weapons || [],
        mods.other = modules.other || [];
        mods.all = [engine].concat(mods.sensors, mods.weapons, mods.other);
        */
        this._modules = new ns.ShipModuleManager(hull, modules);
        this.modules = function() {
            return me._modules;
        };
        this.copyModules = function() {
            return me._modules.copy();
        };
        
        // Set the specs base stats
        var stats = {
            maxHealth: hull.maxHealth,
            range: 0,
            speed: 0,
            attack: 0
        };
        this._stats = stats;
        this._flags = ModuleFlags.NONE;
        this._cost = hull.cost;
        this._size = 0;
        /*
        this.maxHealth = hull.maxHealth;
        this.range = 0;
        this.speed = 0;
        this.attack = 0;
        this.flags = ModuleFlags.NONE;
        this.cost = hull.cost;
        */

        // Applies the effect of the modules
        var sizeTaken = 0;
        this._modules.forEach(function(mod) {
            stats.maxHealth += mod.health;
            stats.range += mod.range;
            stats.speed += mod.speed;
            stats.attack += mod.attack;
            me._size += mod.size;
            me._flags |= mod.flag;
            me._cost = me._cost.add(mod.cost);
        });
        if (me._size > hull.size) {
            throw 'Cannot fit this much in this hull';
        }

        // Returns the stats of the ships constructed with this spec
        this.stats = function() {
            return core.copy(me._stats);
        };
        
        // Returns the flags
        me.flags = function() {
            return me._flags;
        };

        // Returns how much it costs to build a ship from this spec
        me.cost = function() {
            return me._cost;
        };

        // Returns how much space has been taken
        me.size = function() {
            return me._size;
        }
        
        // Creates a new ship from the ship spec
        // Accepts the ship name and the owner of the ship
        //this.create = function(civ, sys) {
        this.create = function(sys) {
            sys.enter([new ns.Ship(civ, me)]);
        };
    };
    
    // Stores specs for a civilization
    ns.SpecManager = function(civ) {
        var me = this;
        var specs = new core.Hashtable();
        this._specs = specs;

        // Adds a spec
        this.addSpec = function(name, hull, modules) {
            if (!specs.has(name)) {
                if (!modules) {
                    modules = {};
                }
                specs.set(name, new ns.ShipSpec(civ, name, hull, modules));
                return true;
            }
            return false;
        };
        
        this.forEach = core.bind(specs, specs.forEach);
        this.map = core.bind(specs, specs.map);
        this.list = core.bind(specs, specs.values);
        
        this.create = function(type, sys) {
            return me._specs.get(type).create(sys);
        };
    };
    
    // Represents a ship
    var shipUid = 0;
    ns.Ship = function(civ, spec) {
        var me = this;
        this.type = spec.name;
        this.modules = spec.copyModules();
        this.uid = 'shp' + ++shipUid;

        this._civ = civ;
        this._system = null;

        // Returns the civilization
        this.civ = function() {
            return me._civ;
        };

        // Returns the system
        this.system = function() {
            return me._system;
        };

        // Sets the system
        this.arriveAt = function(sys) {
            me._system = sys;
        };
        
        // Stats
        var specStats = spec.stats();
        var stats = {
            maxHealth: specStats.maxHealth,
            health: specStats.maxHealth,
            attack: specStats.attack,
            range: specStats.range,
            speed: specStats.speed,
            mp: specStats.speed
        };
        this._stats = stats;
        /*
        this._health = stats.maxHealth;
        this._maxHealth = stats.maxHealth;
        this._attack = stats.attack;
        this._speed = stats.speed;
        this._range = stats.range;
        this._mp = stats.speed;
        */
        this._flags = spec.flags();
        
        this.maxHealth = function() {
            return stats.maxHealth;
        };

        this.health = function() {
            return stats.health;
        };

        this.attack = function() {
            return stats.attack;
        };

        this.range = function() {
            return stats.range;
        };

        this.speed = function() {
            return stats.speed;
        };

        this.mp = function() {
            return stats.mp;
        };

        // Checks the ship using the given bitmask
        this.check = function(flags) {
            return (me.flags & flags) === flags;
        };
    };

    // Represents planet types
    ns.PlanetType = {
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
    ns.getPlanetTypes = function() {
        return core.listOwn(ns.PlanetType);
    };
    
    // Represents a planet
    var planetUid = 0;
    ns.Planet = function(order, sys, type, clazz) {
        var me = this;
        this.type = type;
        this.order = order;
        this.sys = sys;
        this.clazz = clazz;
        this.colony = null;
        this.uid = 'pl' + ++planetUid;
    };

    // Represents a position
    ns.pos = function(row, col) {
        return {row : row, col : col};
    };
    
    // Represents a star type
    ns.StarType = {
        RED: 'Red',
        YELLOW: 'Yellow',
        BLUE: 'Blue'
    };
    
    // Gets the star types
    ns.getStarTypes = function() {
        return core.listOwn(ns.StarType);
    };

    // Represents a star system
    ns.StarSystem = function(name, pos, starType) {
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
                ships[i].arriveAt(me);
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
    ns.Colony = function(civ, planet) {
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
    ns.ColonyManager = function(civ) {
        var me = this;
        this.civ = civ;
        this.income = 0;
        this.systems = new core.Hashtable();
        this.colonies = new core.Hashtable();
        setSys(civ.home, new ns.Colony(civ, civ.home.planets[0]));
        
        // Colonizes a planet
        this.colonize = function(planet) {
            // Make sure there is a colony ship
            var sys = planet.sys;
            var colship = sys.ships.find(function(s) {
                return s.civ === civ && s.check(ModuleFlags.COLONY);
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
                    setSys(sys, col);
                }
            }
            else {
                // So failure wont be silent :P
                throw 'ColonyManager: Colonization of ' + planet.sys.name + ' ' + planet.order + ' failed due to lack of a colony ship';
            }
        };
        
        // Go through all the systems and colonies, update them and calculate the income and all that crap
        this.update = function() {
            me.income = 0;
            me.colonies.forEach(function(sys) {
                sys.constQueue.update();
                var colonies = sys.colonies;
                var income = 0;
                var production = 0;
                for (var i = 0, len = colonies.length; i < len; i++) {
                    colonies[i].update();
                    income += colonies[i].population * 1.2;
                    production += colonies[i].population * 0.75;
                }
                sys.income = income - sys.constQueue.cost;
                sys.production = production;
                me.income += sys.income;
            });
        };
        
        function setSys(sys, col) {
            var system = {};
            system.colonies = [col];
            system.income = 0;
            system.production = 0;
            system.constQueue = new ns.ConstQueue(civ, system, sys);
            me.colonies.set(sys.name, system);
        }
    };
    
    // The construction queue (can only build ships atm)
    ns.ConstQueue = function(civ, sysInfo, sys) {
        var me = this;
        this.cost = 0;
        this._queue = [];
        
        // Builds something
        this.build = function(spec) {
            var eta = calcEta(spec.cost.production) + lastEta();
            var turnCost = (me._queue.length === 0) ? spec.cost.money / eta : 0;
            me._queue.push({
                progress: 0,
                expenses: 0,
                turnCost: turnCost,
                cost: spec.cost(),
                spec: spec,
                eta: eta
            });
        };
        
        // Lists what is building
        this.building = function() {
            // Return copies
            return me._queue.map(function(x) {
                return {
                    progress: x.progress,
                    expenses: x.expenses,
                    turnCost: x.turnCost,
                    cost: x.cost,
                    spec: x.spec,
                    eta: x.eta
                };
            });
        };
        
        // Update the construction queue
        this.update = function() {
            // Check if there is something to build
            if (me._queue.length > 0) {
                // Get the building thing and build on it
                var current = me._queue[0];
                if (current.progress + sysInfo.production < current.cost.production) {
                    current.progress += sysInfo.production;
                    
                    // If production is not 0 then build on it
                    if (sysInfo.production > 0) {
                        var eta = Math.ceil((current.cost.production - current.progress) / sysInfo.production);
                        var cost = (current.cost.money - current.expenses) / eta;
                        me.cost = current.turnCost;
                        current.expenses += current.turnCost;
                        current.eta = eta;
                        
                        /**
                         * POSSIBLE FUTURE BUG:
                         * If the eta is 1 but there is a sudden production drop, this may cause buggy behavious!!!
                         * Make sure this does not happen if drops in production are implemented!!!
                         */
                        if (eta > 1) {
                            current.turnCost = cost;
                        }
                        else {
                            current.turnCost = current.cost.money - current.expenses;
                        }
                    }
                    else {
                        // If the production is 0 then set the eta to infinity and make so it wont cost anything
                        current.eta = Number.POSITIVE_INFINITY;
                        current.turnCost = 0;
                        me.cost = 0;
                    }
                    
                    // Update the eta of the other stuff in the construction queue
                    updateQueue();
                }
                else {
                    // If whatever was building was built, create it and then get make so the final money is payed
                    current.spec.create(sys);
                    me._queue.splice(0, 1);
                    me.cost = current.turnCost;
                    current.turnCost = 0;
                    
                    // Update the eta of the other stuff in the construction queue and the turn cost of the first thing
                    updateQueue();
                    if (me._queue.length > 0) {
                        current = me._queue[0];
                        current.turnCost = current.cost.money / current.eta;
                    }
                }
            }
            else if (me.cost > 0) {
                // If there was nothing to build but there was a cost, set the cost to 0
                me.cost = 0;
            }
        };
        
        function updateQueue() {
            if (me._queue.length > 1) {
                var eta = me._queue[0].eta;
                for (var i = 1, len = me._queue.length; i < len; i++) {
                    var current = me._queue[i];
                    eta += calcEta(current.cost.production);
                    current.eta = eta;
                }
            }
        }
        
        function calcEta(productionCost) {
            if (sysInfo.production > 0)
                return Math.ceil(productionCost / sysInfo.production);
            return Number.POSITIVE_INFINITY;
        }
        
        function lastEta() {
            if (me._queue.length > 0)
                return me._queue[me._queue.length - 1].eta;
            return 0;
        }
    };
    
    // Represents deep space (the space between star systems)
    ns.DeepSpace = function(uni) {
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
            me.fleets.forEach(function(entry) {
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
    ns.Civ = function(name, type, home) {
        var me = this;
        this.name = name;
        this.type = type;
        this.home = home;
        this.ships = new core.Hashtable();
        this.modules = new ns.CivModuleManager();
        this.specs = new ns.SpecManager(this);
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
        
        // Returns a list of the systems
        this.systems = function() {
            return me._systems.values();
        };
        
        // Returns the information about the system
        this.systemInfo = function(sys) {
            var info = me._colonyMan.colonies.tryGet(sys.name);
            if (info) {
                info = {
                    income: info.income,
                    production: info.production,
                    constQueue: info.constQueue
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
            if (me._systems.has(sys.name))
                return sys.civs();
            return me._visitedSystems.tryGet(sys.name, []);
        };
        
        // Returns the ships the current civilization knows exist in the system
        this.shipsIn = function(sys) {
            if (me.visited(sys))
                return sys.ships.values();
            return [];
        };
        
        this.update = function() {
            me.money += me.income;
            me._colonyMan.update();
            me.income = me._colonyMan.income;
        };
    };

    // Represents the universe
    ns.Universe = function(width, height, systems) {
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
            return me._syscoords.tryGet(sysCoordId(row, col));
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
            me.civs.forEach(function(civ) {
                civ.update();
            });
        };
    };

    return ns;
}());
