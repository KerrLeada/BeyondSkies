<?php// Function that creates the createUniverse function (why am I not doing that in PHP?)function defCreateUniverse($name, $sys) {?>    // Generates a new universe    function createUniverse(civs) {        // Set the dimensions of the universe        var width = 42;        var height = 30;                // The system names        var sysnames = [            'Amodar',            'Omic',            'Gatnic',            'Gva',            'Kyky',            'Tado',            'Odot',            'Khiti',            'Mtim',            'Ramsal',            'Chaga',            'Zhiltcho',            'Vanier',            'Xidni',            'Queld',            'Patitil',            'Ragnatil',            'Lichem',            'Sca',            'Ulil',            'Tchat',            'Heid',            'Alag',            'Weiton',            'Ikudan',            'Terral',            'Lunai',            'Telluzi',            'Hadna',            'Dnaha',            'Oemo',            'Ptoldo',            'Ljudui',            'Rhrhiknik'        ];        var planetTypes = core.listOwn(world.PlanetType);        var asteroidTypes = core.listOwn(world.AsteroidType);        var starTypes = world.getStarTypes();        var takenPositions = {};        // Setup the hulls        var colonyHull = world.Hull.COLONY_HULL;        var scoutHull = world.Hull.SMALL_HULL;                // Setup the standard engines and the colony module        var mkcost = world.cost;        var colonyEngine = new world.EngineModule('Flash Engine', mkcost(10, 8), {speed: 3, range: 20}); //3, 20, 'A slow but cheap engine', world.cost(10, 8));        var scoutEngine = new world.EngineModule('Headslam Engine', mkcost(5, 8), {speed: 4, range: 9999}); //4, 99999, 'A fast and cheap engine', world.cost(5, 8));        var colonyModule = new world.ColonyModule('Aeres Colonization Module', world.cost(8, 5));        // Setup the modules        var engines = [colonyEngine,                       scoutEngine,                       new world.EngineModule('Snail Engine', mkcost(10, 11), {speed: 1, range: 40})]; //1, 40, 'A slow engine with long range', world.cost(10, 11))];        var sensors = [new world.SensorModule('Tachyon Sensor', mkcost(3, 3), {desc: 'Scans for tachyons'}), //'Scans for tachyons', world.cost(3, 3)),                       new world.SensorModule('Gamma Sensor', mkcost(3, 3), {desc: 'Scans for gamma radiation'})]; //'Scans for gamma radiation', world.cost(3, 3))];        var weapons = [new world.WeaponModule('Ripper', mkcost(3, 4), {attack: 2}), //2, 'Dangerous chainsaw launcher', world.cost(3, 4)),                       new world.WeaponModule('Breaker', mkcost(5, 4), {attack: 4}), //4, 'Fires a big hammer', world.cost(5, 4)),                       new world.WeaponModule('Slapper', mkcost(1, 1), {attack: 1})]; //1, 'Fires bowling balls', world.cost(1, 1))];        var other = [colonyModule];        var mods = {            engines: engines,            sensors: sensors,            weapons: weapons,            other: other        };        // Gets a random integer between 0 and max        function rnd(max) {            return Math.floor(Math.random()*max);        }                // Creates a random position, assuming it is not already occupied        function rndPos() {            do {                var row = rnd(height - 2 ) + 1;                var col = rnd(width - 2) + 1;            } while (takenPositions[row+':'+col] !== undefined);            takenPositions[row+':'+col] = true;            return world.pos(row, col);        }                // Adds new planets to the system        function addSysObjects(sys, sysObjects) {            var count = rnd(5);            var objInfo = null;            for (var i = 0; i < count; ++i) {                if (rnd(1000) > 50) {                    objInfo = new world.PlanetInfo(planetTypes[rnd(planetTypes.length)], 5, 5)//type mass radius                }                else {                    objInfo = new world.AsteroidInfo(asteroidTypes[rnd(asteroidTypes.length)], 0.005);                }                var sysObj = new world.SysObject(i + 1, sys.name, objInfo);                sysObjects.push(sysObj);            }            return sys;        }                // Creates a random system        function rndSystem(name) {            var pos = rndPos();            var starType = starTypes[rnd(starTypes.length)];            var sysObjects = [];            var sys = new world.StarSystem(name, pos, starType, sysObjects);            return addSysObjects(sys, sysObjects);        }        // Add the modules to the civilization        function createModules(civ) {            civ.modules.addModules(mods);        }        // Create the specs for the civilization        function createSpecs(civ) {            var specs = civ.specs;            specs.addSpec('Colony Ship', colonyHull, [colonyEngine, colonyModule]);            specs.addSpec('Scout', scoutHull, [scoutEngine]);        }        // Create the ships for the civilization        function createShips(civ) {            var home = civ.home;            civ.specs.create('Colony Ship', home);            for (var i = 0; i < 3; i++) {                civ.specs.create('Scout', home);            }        }                // Create the civilizations        function createCiv(name, type, home) {            var civ = new world.Civ(name, type, home);            createModules(civ);            createSpecs(civ);            createShips(civ);            return civ;        }                // Create the systems and the universe        var systems = sysnames.map(rndSystem);        var uni = new world.Universe(width, height, systems);                // Add the civs to the universe        for (var i = 0; i < civs.length; ++i) {            do {                var s = systems[rnd(systems.length)];            } while (s.isEmpty() || s.hasCivs());            var civ = createCiv(civs[i].name, civs[i].type, s);            uni.civs.set(civ.name, civ);        }                // Return the universe!        return uni;    }<?php}?>