console.log("U.S. States Shapefile from: https://www.projectlinework.org/. Editors: Daniel P. Huffman, Hans van der Maarel. Shapefile Name: Times Approximate. I selected the contiguous U.S and reprojected the shapefile to WGS 84 in ArcGIS Pro before converting to topojson with MapShaper. - H. McBride, 03/21/2026")

//begin script when window loads
window.onload = setMap();

//Example 1.3 line 4...set up choropleth map
function setMap() {
    //map frame dimensions
    var width = 960,
        height = 500;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    
    //Example 2.1 line 15...create Albers equal area conic projection -- This will be an appropriate projection for my choropleth map focusing on the lower 48 US States
    var projection = d3.geoAlbers()
        .center([-96, 39.1])
        .rotate([49, 36, 17])
        .parallels([29.5, 45.5])
        .scale(900)
        .translate([width / 2 - 75, height / 2 - 120]); // I adjusted height/width slightly to better center the map within the frame

    var path = d3.geoPath()
        .projection(projection);

    var promises = [
        d3.csv("data/state_natural_amenities.csv"),
        d3.json("data/states_wgs84.topojson")
    ];
    Promise.all(promises).then(callback);

    function callback(data) {
        var csvData = data[0],
            topoData = data[1];
        console.log(csvData);
        console.log(topoData);
        
        //translate TopoJSON
        var usStates = topojson.feature(topoData, topoData.objects.states_wgs84).features;

        //examine the results
        console.log(usStates);

  //add States to map
    var states = map
        .selectAll(".state")
        .data(usStates)
        .enter()
        .append("path")
        .attr("class", function (d) {
            return "state " + d.properties.ISO3166_2;
        })
        .attr("d", path);

    }
};

// I did not add a graticule to my map for this activity