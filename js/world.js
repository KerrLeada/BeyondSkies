'use strict';

var world = (function() {
    var ns = {};

    // Function for creating a uid
    var createUid = (function() {
        var uidCounter = 0;
        return function(obj, prefix) {
            Object.defineProperty(obj, 'uid', {
                enumerable: true,
                value: prefix + (++uidCounter)
            });
        }
    }());
    
    // Creates cost
    function mkcost(money, production) {    
        var result = {
            money: money,
            production: production,
            add: function(x) {
                var money = result.money + x.money;
                var prod = result.production + x.production;
                return mkcost(money, prod);
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
    ns.Hull = function(name, maxHealth, size, cost) {
        core.defineProps(this, {
            name: name,
            maxHealth: maxHealth,
            size: size,
            cost: cost
        });

        createUid(this, 'hul');
    };
    ns.Hull.COLONY_HULL = new ns.Hull('Colony Hull', 1, 50, mkcost(1, 1));
    ns.Hull.SMALL_HULL = new ns.Hull('Small Hull', 15, 20, mkcost(1, 1));
    ns.Hull.MEDIUM_HULL = new ns.Hull('Medium Hull', 50, 40, mkcost(3, 3));
    ns.Hull.LARGE_HULL = new ns.Hull('Large Hull', 130, 80, mkcost(10, 7));
    
    // Module flags
    var ModuleFlags = core.frozen({
        NONE: 0,   // 0000
        ENGINE: 1, // 0001
        SENSOR: 2, // 0010
        WEAPON: 4, // 0100
        COLONY: 8  // 1000
    });
    ns.ModuleFlags = ModuleFlags;

    // A module
    //var modUid = 0;
    var Module = function(name, flag, cost, data) {
        if (!data) {
            throw new TypeError('Expecting data');
        }
        core.defineProps(this, {
            name: name,
            flag: flag,
            size: data.size || 5,
            desc: data.desc || '',
            cost: cost,
            
            health: data.health || 0,
            speed: data.speed || 0,
            range: data.range || 0,
            attack: data.attack || 0
        });

        createUid(this, 'mod');
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

    // Handles modules
    ns.ModuleManager = function(hullSize, mods) {
        var me = this;
        var modules = new core.Hashtable();
        var spaceTaken = 0;

        // Calculates the stats        
        me.stats = function() {
            var stats = {maxHealth: 0, range: 0, speed: 0, attack: 0, flags: ModuleFlags.NONE, cost: mkcost(0, 0), spaceTaken: spaceTaken};
            modules.forEach(function(curr) {
                var mod = curr.mod;
                var count = curr.count;
                stats.maxHealth += mod.health * count;
                stats.range += mod.range * count;
                stats.speed += mod.speed * count;
                stats.attack += mod.attack * count;
                stats.flags |= mod.flag;
                stats.cost = stats.cost.add(mod.cost);
            });
            return stats;
        };

        // Returns the amount of space taken
        me.spaceTaken = function() {
            return spaceTaken;
        };

        // Creates getters for the view
        function getter(expected) {
            return function() {
                return modules.filter(function(mod) {
                    return mod.flag === expected;
                });
            };
        }

        // Create the view object and seal it
        var view = core.frozen({
            engines: getter(ModuleFlags.ENGINE),
            sensors: getter(ModuleFlags.SENSOR),
            weapons: getter(ModuleFlags.WEAPON),
            other: getter(ModuleFlags.COLONY),
            all: core.bind(modules, modules.values),
            map: core.bind(modules, modules.map),
            filter: core.bind(modules, modules.filter),
            forEach: core.bind(modules, modules.forEach)
        });

        // Returns the view object
        me.view = function() {
            return view;
        };

        // Adds the given module in the list of modules, if it fits
        // Returns true if the module was added and false otherwise
        me.add = function(mod) {
            if (spaceTaken + mod.size <= hullSize) {
                var m = modules.tryGet(mod.uid);
                if (m) {
                    ++m.count;
                }
                else {
                    modules.add(mod.uid, {mod: mod, count: 1});
                }
                spaceTaken += mod.size;
                return true;
            }
            return false;
        };

        // Removes a module with the given module id
        me.remove = function(modId) {
            var entry = modules.get(modId);
            spaceTaken -= entry.mod.size;
            --entry.count;
            if (entry.count < 1) {
                modules.remove(modId);
            }
        };

        // Creates a copy of the ship module manager
        me.copy = function() {
            return new ns.ModuleManager(hullSize, me);
        };

        // Check if there where modules to add
        if (mods) {
            // Either, the modules are provided with another module manager...
            if (mods instanceof ns.ModuleManager) {
                if (hullSize < mods.spaceTaken()) {
                    throw 'Very Full';
                }
                mods.view().forEach(function(curr, uid) {
                    modules.add(uid, core.copy(curr));
                    spaceTaken += curr.mod.size;
                });
            }
            else {
                // ... or with any object that has a forEach method that loops over the modules
                mods.forEach(function(mod) {
                    if (!me.add(mod)) {
                        throw 'Full';
                    }
                });
            }
        }
    };

    // A module manager for a civilization
    ns.CivModuleManager = function() {
        var me = this;
        me._hulls = new core.Hashtable();

        // Add the hulls
        [ns.Hull.COLONY_HULL, ns.Hull.SMALL_HULL, ns.Hull.MEDIUM_HULL, ns.Hull.LARGE_HULL].forEach(function(hull) {
            me._hulls.add(hull.uid, hull);
        });
        
        me._engines = new core.Hashtable();
        me._sensors = new core.Hashtable();
        me._weapons = new core.Hashtable();
        me._other = new core.Hashtable();
        me._all = new core.Hashtable();
        
        // Returns the hulls
        me.hulls = core.getter(me._hulls);

        // Getters for the modules
        me.engines = core.getter(me._engines);
        me.sensors = core.getter(me._sensors);
        me.weapons = core.getter(me._weapons);
        me.other = core.getter(me._other);
        me.all = core.getter(me._all);

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
        me.addModules = function(mods) {
            addAllMods(me._engines, mods.engines);
            addAllMods(me._sensors, mods.sensors);
            addAllMods(me._weapons, mods.weapons);
            addAllMods(me._other, mods.other);
        };

        // Access and iteration of the modules
        me.get = core.bind(me._all, me._all.get);
        me.forEach = core.bind(me._all, me._all.forEach);
        me.map = core.bind(me._all, me._all.map);
    };

    // Represents a fleet
    // Fleets are used to group ships and travel in deep space
    // The last argument, ships, is an optional hashtable for
    // the ships that the fleet contains
    //var fleetUid = 0;
    ns.Fleet = function(ds, civ, sys, ships) {
        var me = this;
        me.sys = sys;
        me.civ = civ;
        me.ships = new core.Hashtable(ships);
        me.onArrival = function() {};
        
        // Used to update the fleet range and speed
        // Note that this doesnt update the movement points of the
        // fleet
        function updateRangeSpeed() {
            me.range = me.ships.findBest(ShipUtils.shortestRange).range();
            me.speed = me.ships.findBest(ShipUtils.slowest).speed();
        }
        
        // Set the fleet speed, range and movement points
        if (!me.ships.isEmpty()) {
            updateRangeSpeed();
            me.mp = me.speed;
        }
        else {
            me.range = 0;
            me.speed = 0;
            me.mp = 0;
        }
        
        // Set the fleet uid
        //this.uid = 'flt' + ++fleetUid;
        createUid(me, 'flt');
        
        // Adds all the given ships to the fleet
        me.addShips = function(ships) {
            for (var i = 0; i < ships.length; ++i) {
                me.ships.add(ships[i].uid, ships[i]);
            }
            updateRangeSpeed();
        };
        
        // Removes all the given ships from the fleet
        me.removeShips = function(ships) {
            me.ships.removeAll(ships);
            updateRangeSpeed();
        };
        
        // Sends the fleet to the marked destination (returns true if there was a destination, false otherwise)
        me.sendTo = function(sys) {
            var shortest = me.ships.findBest(ShipUtils.shortestRange);
            if (me.sys.distanceTo(sys) <= shortest.range()) {
                var ships = me.ships.values();
                me.sys.leave(ships);
                ds.enter(me, sys);
                return true;
            }
            return false;
        };
        
        // Called to update the fleet state when the turn has ended
        me.update = function() {
            me.mp = me.speed;
        };
    };
    
    // A ship specification, used to create new ships
    ns.ShipSpec = function(civ, name, hull, modules) {
        var me = this;
        var stats = null;
        core.defineProps(me, {
            civ: civ,
            name: name,
            hull: hull
        });

        // Set the modules
        me.updateModules = function(mods) {
            me._modules = new ns.ModuleManager(hull.size, mods);
            stats = me._modules.stats();
            me._stats = stats;
            if (stats.spaceTaken > hull.size) {
                throw 'Cannot fit this much in this hull';
            }
        };
        me.updateModules(modules);

        // Get the modules
        me.modules = function() {
            return me._modules.view();
        };
        me.copyModules = function() {
            return me._modules.copy();
        };

        // Returns the stats of the ships constructed with this spec
        me.stats = function() {
            return core.copy(stats);
        };

        // Returns how much it costs to build a ship from this spec
        me.cost = function() {
            return core.copy(stats.cost);
        };

        // Returns how much space has been taken
        me.h_size = core.bind(me._modules, me._modules.hullSize);
        me.spaceTaken = core.bind(me._modules, me._modules.spaceTaken);
        
        // Creates a new ship from the ship spec
        // Accepts the ship name and the owner of the ship
        me.create = function(sys) {
            sys.enter([new ns.Ship(civ, me)]);
        };
    };
    
    // Stores specs for a civilization
    ns.SpecManager = function(civ) {
        var me = this;
        var specs = new core.Hashtable();

        // Checks if the name is an invalid spec name
        function isInvalid(name) {
            return name === ''
        }

        // Adds a spec
        me.addSpec = function(name, hull, modules) {
            name = $.trim(name);
            if (! (specs.has(name) || isInvalid(name))) {
                modules = modules || [];
                specs.add(name, new ns.ShipSpec(civ, name, hull, modules));
                return true;
            }
            return false;
        };

        // Updates the spec with the given name with the given modules
        me.updateSpec = function(name, modules) {
            var spec = specs.tryGet(name);
            if (spec) {
                spec.updateModules(modules);
                return true;
            }
            return false;
        };

        // Removes the spec with the given name
        me.removeSpec = function(name) {
            specs.remove(name);
        };
        
        // Iteration
        me.forEach = core.bind(specs, specs.forEach);
        me.map = core.bind(specs, specs.map);
        me.list = core.bind(specs, specs.values);
        

        // Creates a ship in the given system from the spec with the given name
        me.create = function(type, sys) {
            return me._specs.get(type).create(sys);
        };
    };
    
    // Represents a ship
    ns.Ship = function(civ, spec) {
        var me = this;
        var system = null;
        core.defineProps(me, {
            type: spec.name,
            modules: spec.copyModules()
        });

        // Returns the civilization
        me.civ = function() {
            return civ;
        };

        // Returns the system
        me.system = function() {
            return system;
        };

        // Sets the system
        me.arriveAt = function(sys) {
            system = sys;
        };
        
        // Stats
        var stats = spec.stats();
        
        me.maxHealth = function() {
            return stats.maxHealth;
        };
        me.health = function() {
            return stats.health;
        };
        me.attack = function() {
            return stats.attack;
        };
        me.range = function() {
            return stats.range;
        };
        me.speed = function() {
            return stats.speed;
        };
        me.mp = function() {
            return stats.mp;
        };

        // Checks the ship using the given bitmask
        me.check = function(flags) {
            return (stats.flags & flags) === flags;
        };

        createUid(me, 'shp');
    };

    // Represents planet types
    ns.PlanetType = core.frozen({
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
    });
    
    // Returns a list of the planet types
    ns.getPlanetTypes = function() {
        return core.listOwn(ns.PlanetType);
    };
    
    // Represents a planet
    ns.PlanetInfo = function(type, mass, radius) {
        core.defineProps(this, {
            type: type,
            mass: mass,
            radius: radius
        });
    };

    // Represents an asteroid field
    ns.AsteroidInfo = function(mass) {
        core.defineProps(this, {
            mass: 0.0004
        });
    };

    // Represents a system object, like a planet or asteroid field
    ns.SysObject = function(orbitNr, sysName, objInfo) {
        var me = this;
        var colony = null;
        core.defineProps(me, {
            name: sysName + ' ' + orbitNr,
            orbitNr: orbitNr
        });

        /*me.sys = function() {
            return sys;
        };*/

        me.info = function() {
            return objInfo;
        };

        me.colony = function(col) {
            if (col) {
                colony = col;
                return;
            }
            return colony;
        };

        createUid(me, 'ent');
    };

    // Represents a position
    ns.pos = function(row, col) {
        return core.frozen({row : row, col : col});
    };
    
    // Gets the star types
    ns.getStarTypes = function() {
        return core.listOwn(ns.StarType);
    };

    // Represents a star type
    ns.StarType = core.frozen({
        RED: 'Red',
        YELLOW: 'Yellow',
        BLUE: 'Blue'
    });

    // Represents a star
    ns.Star = function(type) {
        var me = this;

        // Setups the radius and the mass
        function setup(radius, mass) {
            core.defineProps(me, {
                type: type,
                radius: radius,
                mass: mass
            });
        }
        
        // Sets the type and mass depending on the radius
        if (type === ns.StarType.RED) {
            setup(0.6, 0.4);
        }
        else if (type === ns.StarType.YELLOW) {
            setup(1.1, 1.1);
        }
        else if (type === ns.StarType.BLUE) {
            setup(2.3, 3.5);
        }
        else {
            throw 'Unknown star type';
        }
    };

    // Represents a star system
    ns.StarSystem = function(name, pos, starType, sysObjects) {
        var me = this;
        core.defineProps(me, {
            name: name,
            ships: new core.Hashtable(),
            star: new ns.Star(starType),
            starType: starType,
            pos: pos
        });

        var onObjColonized = function() {};
        me.onColonized = function(callback) {
            onObjColonized = callback;
        };

        // Returns an array of the system objects
        me.sysObjects = function() {
            return sysObjects.slice(0);
        };
        
        // Ships enters a system
        me.enter = function(ships) {
            for (var i = 0, len = ships.length; i < len; i++) {
                me.ships.set(ships[i].uid, ships[i]);
                ships[i].arriveAt(me);
            }
        };
        
        // Ships leaves the system
        me.leave = function(ships) {
            for (var i = 0, len = ships.length; i < len; i++) {
                me.ships.remove(ships[i].uid);
                ships[i].system(null);
            }
        };

        // Returns the civilizations that has colonies in this system
        me.civs = function() {
            return sysObjects.reduce(function(civs, sysObj) {
                if (sysObj.colony && $.inArray(sysObj.colony.civ, civs) === -1) {
                    civs.push(sysObj.colony.civ);
                }
                return civs;
            }, []);
        };
        
        // Checks if the given civilization has ships in the system
        me.hasShips = function(civ, pred) {
            var ships = me.ships.values();
            for (var i = 0, len = ships.length; i < len; i++) {
                if (ships[i].civ === civ && (pred === undefined || pred(ships[i]))) {
                    return true;
                }
            }
            return false;
        };
        
        // Calculates the distance to the other system
        me.distanceTo = function(otherSys) {
            var rows = Math.abs(me.pos.row - otherSys.pos.row);
            var cols = Math.abs(me.pos.col - otherSys.pos.col);
            return core.pythagoras(rows, cols);
        };
    };
    
    // Represents a colony on a system object
    //var colUid = 0;
    ns.Colony = function(civ, sysObj) {
        var me = this;
        var population = 1;
        var maxPopulation = 8;
        core.defineProps(me, {
            sys: sysObj.sys,
            sysObj: sysObj
        });

        me.civ = function(newCiv) {
            if (newCiv) {
                civ = newCiv;
                return;
            }
            return civ;
        };

        me.population = function() {
            return population;
        };
        me.maxPopulation = function() {
            return maxPopulation;
        };
        
        // Updates the colony
        me.update = function() {
            if (civ && population < maxPopulation) {
                population = Math.min(population + civ.growth, maxPopulation);
            }
        };

        createUid(me, 'col');
        sysObj.colony(me);
    };
    
    // Handles the colonies of a civilization
    ns.ColonyManager = function(civ) {
        var me = this;
        core.defineProps(me, {
            civ: civ,
            systems: new core.Hashtable(),
            colonies: new core.Hashtable()
        });

        var colIncome = 0;
        me.income = function() {
            return colIncome;
        };

        setSys(civ.home, new ns.Colony(civ, civ.home.sysObjects[0]));
        
        // Colonizes a system object
        this.colonize = function(sysObj) {
            // Make sure there is a colony ship
            var sys = sysObj.sys;
            var colship = sys.ships.find(function(s) {
                return s.civ() === civ && s.check(ModuleFlags.COLONY);
            });
            if (colship) {
                // Remove the colony ship and colonize the system object
                sys.ships.remove(colship.uid);
                if (me.colonies.has(sys.name)) {
                    sys = me.colonies.get(sys.name);
                    sys.colonies.push(new ns.Colony(civ, sysObj));
                }
                else {
                    me.systems.set(sys.name, sys);
                    var col = new ns.Colony(civ, sysObj);
                    setSys(sys, col);
                }
            }
            else {
                // So failure wont be silent :P
                throw 'ColonyManager: Colonization of ' + sysObj.sys.name + ' ' + sysObj.order + ' failed due to lack of a colony ship';
            }
        };
        
        // Go through all the systems and colonies, update them and calculate the income and all that crap
        this.update = function() {
            colIncome = 0;
            me.colonies.forEach(function(sys) {
                sys.constQueue.update();
                var colonies = sys.colonies;
                var income = 0;
                var production = 0;
                for (var i = 0, len = colonies.length; i < len; i++) {
                    colonies[i].update();
                    income += colonies[i].population() * 1.2;
                    production += colonies[i].population() * 0.75;
                }
                sys.income = income - sys.constQueue.cost();
                sys.production = production;
                colIncome += sys.income;
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
        var constCost = 0;
        var queue = [];

        // Returns the current construction cost
        me.cost = function() {
            return constCost;
        };

        // Builds something
        me.build = function(spec) {
            var specCost = spec.cost();
            var eta = calcEta(specCost.production) + lastEta();
            var turnCost = (queue.length === 0) ? specCost.money / eta : 0;
            queue.push({
                progress: 0,
                expenses: 0,
                turnCost: turnCost,
                cost: specCost,
                spec: spec,
                eta: eta
            });
        };
        
        // Lists what is building
        me.building = function() {
            // Return copies
            return queue.map(function(x) {
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
        me.update = function() {
            // Check if there is something to build
            if (queue.length > 0) {
                // Get the building thing and build on it
                var current = queue[0];
                if (current.progress + sysInfo.production < current.cost.production) {
                    current.progress += sysInfo.production;
                    
                    // If production is not 0 then build on it
                    if (sysInfo.production > 0) {
                        var eta = Math.ceil((current.cost.production - current.progress) / sysInfo.production);
                        var cost = (current.cost.money - current.expenses) / eta;
                        constCost = current.turnCost;
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
                        constCost = 0;
                    }
                    
                    // Update the eta of the other stuff in the construction queue
                    updateQueue();
                }
                else {
                    // If whatever was building was built, create it and then get make so the final money is payed
                    current.spec.create(sys);
                    queue.splice(0, 1);
                    constCost = current.turnCost;
                    current.turnCost = 0;
                    
                    // Update the eta of the other stuff in the construction queue and the turn cost of the first thing
                    updateQueue();
                    if (queue.length > 0) {
                        current = queue[0];
                        current.turnCost = current.cost.money / current.eta;
                    }
                }
            }
            else if (constCost > 0) {
                // If there was nothing to build but there was a cost, set the cost to 0
                constCost = 0;
            }
        };
        
        function updateQueue() {
            if (queue.length > 1) {
                var eta = queue[0].eta;
                for (var i = 1, len = queue.length; i < len; i++) {
                    var current = queue[i];
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
            if (queue.length > 0)
                return queue[queue.length - 1].eta;
            return 0;
        }
    };
    
    // Represents deep space (the space between star systems)
    ns.DeepSpace = function(uni) {
        var me = this;
        core.defineProps(me, {
            fleets: new core.Hashtable()
        });
        
        // The fleet arrives at its destination
        function arrive(fleet, dest) {
            dest.enter(fleet.ships.values());
            fleet.civ.visit(dest);
            me.leave(fleet);
            fleet.onArrival(dest);
        }
        
        // Enters a ship to deep space
        me.enter = function(fleet, dest) {
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
        me.leave = function(fleet) {
            me.fleets.remove(fleet.uid);
        };
        
        // Update the fleets
        me.update = function() {
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
        core.defineProps(me, {
            name: name,
            type: type,
            home: home,
            ships: new core.Hashtable(),
            modules: new ns.CivModuleManager(),
            specs: new ns.SpecManager(me),
            growth: 0.15
        });
        
        // Stores the systems the civilization has a presence in
        var colonyMan = new ns.ColonyManager(me);
        colonyMan.update();
        var systems = colonyMan.systems;
        me.colonize = colonyMan.colonize;
        
        // Stores the visited systems
        // Each visited system will have its name as a key
        // It also stores the civs who was present at the time of the visit
        var visitedSystems = new core.Hashtable();
        visitedSystems.set(home.name, [me]);

        var money = 5000;
        me.money = function() {
            return money;
        };
        var income = colonyMan.income();
        me.income = function() {
            return income;
        };
        
        // Returns a list of the systems
        me.systems = function() {
            return systems.values();
        };
        
        // Returns the information about the system
        me.systemInfo = function(sys) {
            var info = colonyMan.colonies.tryGet(sys.name);
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
        me.visit = function(sys) {
            visitedSystems.set(sys.name, sys.civs());
        };
        
        // Check if a system has been visited
        me.visited = function(sys) {
            return systems.has(sys.name) || visitedSystems.has(sys.name);
        };
        
        // Returns the civilizations the current civilization knows exist in the given system
        me.civsIn = function(sys) {
            if (systems.has(sys.name))
                return sys.civs();
            return visitedSystems.tryGet(sys.name, []);
        };
        
        // Returns the ships the current civilization knows exist in the system
        me.shipsIn = function(sys) {
            if (me.visited(sys))
                return sys.ships.values();
            return [];
        };
        
        me.update = function() {
            money += income;
            colonyMan.update();
            income = colonyMan.income();
        };
    };

    // Represents the universe
    ns.Universe = function(width, height, systems) {
        var me = this;
        var sysnames = new core.Hashtable();
        var syscoords = new core.Hashtable();
        core.defineProps(me, {
            deepspace: new ns.DeepSpace(),
            civs: new core.Hashtable(),
            width: width,
            height: height
        });
        
        // Used to transform the system coordinates into a string
        function sysCoordId(row, col) {
            return 'r' + row + 'c' + col;
        }

        // Helps adding a system to the universe
        function addSystem(system) {
            sysnames.set(system.name, system);
            syscoords.set(sysCoordId(system.pos.row, system.pos.col), system);
        };
        
        // Adds the system
        for (var i = 0; i < systems.length; ++i) {
            addSystem(systems[i]);
        }
        
        // Returns the system with the given name
        me.sys = function(name) {
            return sysnames.get(name);
        };

        // Returns the name of the system at the given location
        me.sysAt = function(row, col) {
            return syscoords.tryGet(sysCoordId(row, col));
        };
        
        // Calculates the distance between two systems in tiles
        me.distance = function(sys1, sys2) {
            var rows = Math.abs(sys1.pos.row - sys2.pos.row);
            var cols = Math.abs(sys1.pos.col - sys2.pos.col);
            return core.pythagoras(rows, cols);
        };
        
        // Get all the systems
        me.getSystems = function() {
            return sysnames.values();
        };
        
        me.update = function() {
            me.deepspace.update();
            me.civs.forEach(function(civ) {
                civ.update();
            });
        };
    };

    return ns;
}());
