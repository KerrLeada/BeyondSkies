// This is the ONLY script that does something to the UI
// Should be replaced by something more maintainable

// The UI "namespace"
var ui = new function() {
    var that = this;
    this._highlighted = null;
    this._selected = null;

    this.getSelected = function() {
        return document.getElementById(that._selected);
    };

    // Highlights a system
    this.highlight = function(id) {
        if (that._highlighted != null) {
            that._highlighted.style.borderColor = "black";
        }
        id.style.borderColor = "blue";
        that._highlighted = id;
    };

    // Selects the system
    this.select = function(sys) {
        that._selected = sys;
    },

    // Called when a system is clicked
    this.onSysClick = function(id, sys) {
        that.highlight(id);
        that.select(sys);
    };

    // Creates a starmap
    this.setupStarmap = function(uni) {
        // Calculate the proportions of the table cells
        var w = 100/uni.width;
        var h = 100/uni.height;

        // Create the table
        var map = "<table class='starmap'>";
        for (var row = 0; row < uni.height; ++row) {
            map += "<tr>";
            for (var column = 0; column < uni.width; ++column) {
                // Create a new cell with the speficif width and height calculated before
                map += "<td style='width: " + w + "%; height: " + h + "%;'>";

                // If there was a system at the given location, add it to the starmap
                var sys = uni.systemAt(row, column);
                if (sys != "") {
                    var divid = sys;
                    var sysData = uni.systems[sys];
                    map += "<div id='" + divid + "' class='tile'>" +
                               "<img src='grfx/star_small.png' alt='star' />" +
                               "<div><a href='' onclick='onSysClick(this, );'>" + sys + "</a></div>" +
                               "<div id='" + sys + "_colon' class='dispSmall'>" +
                                   "( " + core.map(sysData.civs(), function(x) { return x.civName; }).join(", ") + " )" +
                               "</div>" +
                           "</div>";
                }

                // End the cell
                map += "</td>";
            }
            map += "</tr>";
        }
        map += "</table>";
        return map;
    };

    // Displays colony info
    function colonyInfo(p, player) {
        if (p.owner != null) {
            return (p.owner === player) ? "Colonized" : "Colonized by " + p.owner.civName;
        }
        return "";
    }

    // Creates the system view for the given system
    this.createSysview = function(uni, player) {
        sys = uni.systems[that._selected];
        var sysname = sys.sysName;
        var mapping = {};
        mapping[world.PlanetType.JUNGLE] = "jungle_planet.png";
        mapping[world.PlanetType.BARREN] = "barren_planet.png";
        mapping[world.PlanetType.WATER] = "water_planet.png";
        var count = 0;
        var visual = "<table class='sysview'>" +
                        "<tr>" +
                            "<td>" + sysname + " system</td>" +
                        "</tr>" +
                        "<tr>" +
                            "<td><img src='grfx/star.png' alt='star' /></td>" +
                            core.fold(sys.planets, "", function(acc, x) {
                                count += 1;
                                return acc + "<td class='paddedLeft'>" +
                                                  "<div class='centeredText'>" +
                                                    "<img src='grfx/" + mapping[x.type] + "' alt='planet' />" +
                                                    "<div>" + sysname + " " + count + "</div>" +
                                                    "<div class='dispSmall'>" + colonyInfo(x, player) + "</div>" +
                                                  "</div>" +
                                              "</td>";
                            }) +
                        "</tr>" +
                      "</table>";
        return visual;
    };
}
