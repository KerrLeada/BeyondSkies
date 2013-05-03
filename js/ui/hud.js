var ui = ui || {};

ui.Hud = function(hudData, disp) {
    var div = ui.html.div;

    function append(txt) {
        hudData.append(div().append(txt));
    }

    this.showStar = function(sys) {
        var star = sys.star;
        hudData.empty();
        append('The ' + sys.name + ' has a ' + star.type().toLowerCase() + ' star');
        append('Radius: ' + star.radius() + ' solar radii');
        append('Mass: ' + star.mass() + ' solar masses');
        disp.show();
    };

    this.showPlanet = function(planet) {
        alert('Cannot show planets because that feature is not yet implemented');
    };
};
