// Generates a new universe
function createUniverse() {
    // Create the universe
    var uni = new world.Universe(10, 10);
    
    // Create the alon system, home to the alon empire
    var alon = new world.StarSystem("Alon", world.pos(9, 2));
    alon.add(world.PlanetType.JUNGLE);
    alon.add(world.PlanetType.BARREN);
    uni.addSystem(alon);

    // The omic system
    var omic = new world.StarSystem("Omic", world.pos(3, 7));
    omic.add(world.PlanetType.WATER);
    uni.addSystem(omic);

    // The gatnik system, home to the marak federation
    var gatnic = new world.StarSystem("Gatnic", world.pos(1, 1));
    gatnic.add(world.PlanetType.BARREN);
    uni.addSystem(gatnic);

    // The rest of the systems
    uni.addSystem(new world.StarSystem("Gva", world.pos(5, 3)));
    uni.addSystem(new world.StarSystem("Kyky", world.pos(9, 4)));
    uni.addSystem(new world.StarSystem("Tado", world.pos(6, 6)));
    uni.addSystem(new world.StarSystem("Odot", world.pos(4, 7)));
    uni.addSystem(new world.StarSystem("Khiti", world.pos(0, 3)));
    uni.addSystem(new world.StarSystem("Mtim", world.pos(4, 5)));

    // Create the civilizations
    uni.addCiv(new world.Civ("Alon", "Empire", alon));
    uni.addCiv(new world.Civ("Marak", "Federation", gatnic));
    return uni;
}
