<?php

class PlanetType {
    const JUNGLE = "jungle";
    const BARREN = "barren";
    const WATER = "water";
}

class PlanetData {
}

class SystemData {
}

class WorldData {
}

function defWorld() {
    $systems
    ?>
    var world = new function() {
        var ns = this;
        
        // A ship specification, used to create new ships
        this.ShipSpec = function(name, maxHealth, range, damage) {
            this.name = name;
            this.maxHealth = maxHealth;
            this.range = range;
            this.damage = damage;
            
            var me = this;
            
            // Creates a new ship from the ship spec
            // Accepts the ship name and the owner of the ship
            this.create = function(shipName, owner) {
                return new me.Ship(shipName, me.name, me.maxHealth, me.range, me.damage, me.owner)
            };
        };
        
        // Represents a ship
        var shipUid = 0;
        this.Ship = function(name, type, maxHealth, range, damage, owner) {
            this.name = name;
            this.type = type;
            this.health = maxHealth;
            this.maxHealth = maxHealth;
            this.range = range;
            this.damage = damage;
            this.owner = owner;
            
            // The uid is a unique identifier that identifies each ship in the game
            // This value is unique to every ship
            this.uid = ++shipUid;
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
        this.pos = function(row, column) {
            return {row : row, column : column};
        };

        // Represents a star system
        this.StarSystem = function(name, pos) {
            var me = this;
            this.pos = pos;
            this.ships = new core.Hashtable();
            this.planets = [];
            this.sysName = name;

            // Adds the new planet to the system
            this._counter = 0;
            this.add = function(type) {
                me.planets[me._counter] = new ns.Planet(type);
                me._counter += 1;
            }
            
            this.addShips = function(ships) {
                for (var i = 0; i < ships.length; ++i) {
                    me.ships[ships[i].uid] = ships[i];
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
            }
        };

        // Represents the universe
        this.Universe = function(width, height) {
            var me = this;
            this.systems = {};
            this.civs = {};
            this.width = width;
            this.height = height;

            // Helps adding a system to the universe
            this.addSystem = function(system) {
                me.systems[system.sysName] = system;
            };

            // Helps adding a civilization to the universe
            this.addCiv = function(civ) {
                me.civs[civ.civName] = civ;
            };

            // Returns the name of the system at the given location
            this.systemAt = function(row, column) {
                for (var sys in me.systems) {
                    sys = me.systems[sys];
                    if (sys.pos.row === row && sys.pos.column === column) {
                        return sys.sysName;
                    }
                }
                return "";
            };
        };

        this.Civ = function(name, type, home) {
            this.civName = name;
            this.type = type;
            this.home = home;
            this.systems = [home];
            this.money = 5000;
            
            // Create the specs of the civilization
            var colonyShip = new ns.ShipSpec("Colony Ship", 1, 3, 0);
            var scoutShip = new ns.ShipSpec("Scout", 20, 5, 0);
            this.specs = {
                ships : {
                    colonyShip.name : colonyShip,
                    scoutShip.name : scoutShip
                };
            };

            // The homeworld is the planet closest to the star
            home.planets[0].owner = this;
        };
    };
<?php
}
?>
