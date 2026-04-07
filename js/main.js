// example 1.2: Defining attrArray and expressed as pseudo-global variables in main.js
console.log("At the moment, the states and bubbles are color classified according to amenity class score (1/light color = worst, 7/dark color = best). The x axis shows average January temp and the y axis shows average July temp. I do not love the style of the axes + labels at the moment; I will fix these for the final d3 lab.");
//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

	//pseudo-global variables
	//list of attribute variables for data join
    var attrArray = ["avg_jan_temp","avg_jan_sun","avg_jul_temp","avg_jul_hum","avg_water_area","avg_topography_z","avg_amenity_scale","avg_amenity_class"]; 
    //create an object for different expressed variables
    var expressed  = {
        x:attrArray[0], //x attribute (avg_jan_temp)
        y:attrArray[2], //y attribute (avg_july_temp)
        color:attrArray[7] //color/size attribute (amenity_class, 1 = worst, 7 = best))
    }

    console.log("U.S. States Shapefile from: https://www.projectlinework.org/. Editors: Daniel P. Huffman, Hans van der Maarel. Shapefile Name: Times Approximate. I selected the contiguous U.S and reprojected the shapefile to WGS 84 in ArcGIS Pro before converting to topojson with MapShaper. - H. McBride, 03/21/2026")

    //begin script when window loads
    window.onload = setMap;


    //set up choropleth map
    function setMap(){

        //...MAP, PROJECTION, PATH, AND QUEUE BLOCKS FROM CHAPTER 8
        //map frame dimensions
        var width = window.innerWidth * 0.5 - 25,
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
            .scale(700)
            .translate([width / 2 - 40, height / 2 - 90]); // I adjusted height/width slightly to better center the map within the frame

        var path = d3.geoPath()
            .projection(projection);

        var promises = [
            d3.csv("data/state_natural_amenities_avg.csv"),
            d3.json("data/states_wgs84.topojson")
        ];
        Promise.all(promises).then(callback);


        function callback(data){	
            
            var csvData = data[0], topoData = data[1];
                console.log(csvData);
                console.log(topoData);

            //translate TopoJSON
            var usStates = topojson.feature(topoData, topoData.objects.states_wgs84).features;

            //add us state to map -- I am not including a separate us states basemap, so I am deleting this block of code
            // var states = map.append("path")
            //     .datum(usStates)
            //     .attr("class", "us")
            //     .attr("d", path);
                
            //join csv data to GeoJSON enumeration units
            usStates = joinData(usStates, csvData);

            // create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(usStates, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

        };
    }; //end of setMap()

    function joinData(usStates, csvData){
        //...DATA JOIN LOOPS FROM EXAMPLE 1.1
        //loop through csv to assign each set of csv attribute values to geojson states
            for (var i = 0; i < csvData.length; i++) {
                var csvState = csvData[i]; //the current state
                var csvKey = csvState.state; //the CSV primary key

                //loop through geojson states to find correct state
                for (var a = 0; a < usStates.length; a++) {
                    var geojsonProps = usStates[a].properties; //the current state geojson properties
                    var geojsonKey = geojsonProps.ISO3166_2; //the geojson primary key

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey) {
                        //assign all attributes and values
                        attrArray.forEach(function (attr) {
                            var val = parseFloat(csvState[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    }
                }
            }
        console.log(usStates);
        return usStates;

    };

    function setEnumerationUnits(usStates, map, path, colorScale){
        //...STATES BLOCK FROM CHAPTER 8
        //add States to map as enumeration units
            var states = map
                .selectAll(".state")
                .data(usStates)
                .enter()
                .append("path")
                .attr("class", function (d) {
                    return "state " + d.properties.ISO3166_2;
                })
                .attr("d", path)
               .style("fill", function (d) {
			//check to make sure a data value exists, if not set color to gray
			var value = d.properties[expressed.color];            
			if(value) {            	
				return colorScale(d.properties[expressed.color]);            
			} else {            	
				return "#ccc";            
			}    
		});
    }

    //function to create color scale generator - I chose to use natural breaks/ckmeans because my data shows variation and clusters
    function makeColorScale(data){
        var colorClasses = [
        "#eff3ff",
        "#bdd7e7",
        "#6baed6",
        "#3182bd",
        "#08519c"
        ];

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            //set variable to expressed.color
            var val = parseFloat(data[i][expressed.color]);
            domainArray.push(val);
        };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
    };

        //add function to calculate the minimum and maximum values for expressed variables
    function getDataValues(csvData, expressedValue) {
        var max = d3.max(csvData, function(d) { 
            return parseFloat(d[expressedValue]); 
        });
        var min = d3.min(csvData, function(d) { 
            return parseFloat(d[expressedValue]); 
        });
        var range = max - min,
            adjustment = (range / csvData.length)

        return [min - adjustment, max + adjustment];
    }

    //function to create y scale
    function createYScale(csvData, chartHeight){
        var dataMinMax = getDataValues(csvData, expressed.y)
        // add padding so the bubbles don't go off the chart
        var padding = 4; 
        return yScale = d3.scaleLinear().range([chartHeight, 0]).domain([dataMinMax[0] - padding, dataMinMax[1] + padding]);
    }
    //function to create x scale
    function createXScale(csvData, chartWidth){
        var dataMinMax =  getDataValues(csvData, expressed.x)
        // same as above, add padding so bubbles don't go off the chart
        var padding = 4;
        return xScale = d3.scaleLinear().range([0, chartWidth]).domain([dataMinMax[0] - padding, dataMinMax[1] + padding]);
    }

    //create axes
    function createChartAxes(chart,chartWidth,chartHeight,yScale,xScale){
        //add axis
        //create axis generators
        var yAxisScale = d3.axisRight().scale(yScale);
        var xAxisScale = d3.axisTop().scale(xScale);

        //place axis
        var yaxis = chart.append("g")
            .attr("class", "yaxis")
            .call(yAxisScale);
            
        var xaxis = chart.append("g")
            .attr("class", "xaxis")//format x axis
            .attr("transform", "translate(0," + chartHeight + ")")
            .call(xAxisScale);

        // here I add labels to the axes so they are more legible 
        // (google helped me and I don't love the final product. I'll adjust styles and label positions for the final d3 lab)
        chart.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", 40 )
            .attr("x", -chartHeight / 2)
            .attr("text-anchor", "middle")
            .text("Average July Temp (°F)"); // Here I replace underscores with spaces to make the labels more legible (I googled it :) )

        chart.append("text")
            .attr("class", "x-axis-label")
            .attr("y", chartHeight - 25)
            .attr("x", chartWidth / 2)
            .attr("text-anchor", "middle")
            .text("Average January Temp (°F)"); // same as above, replace underscores with spaces 
    }

    //function to create coordinated bubble chart
    function setChart(csvData, colorScale){
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.5 -25,
            chartHeight = 500;

        //create a second svg element to hold the bubble chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a scale to place circles proportionally
        var yScale = createYScale(csvData,chartHeight)
        //create an x scale to place circles proportionally
        var xScale = createXScale(csvData, chartWidth);
        //create axes
        createChartAxes(chart,chartWidth,chartHeight, yScale, xScale) 

        //set circles for each state
        var circles = chart.selectAll(".circles") //create an empty selection
            .data(csvData) //here we feed in our array of data
            .enter() //one of the great mysteries of the universe
            .append("circle")
            .attr("class", "circle")
            .attr("class", function (d) {
                return "bubble " + d.state;
            })

            // Use Flannery's compensation to scale bubble size
            .attr("r", function (d) {
                var minRadius = 5; // 
                //calculate the radius based on expressed value as circle area
                var radius = Math.pow(d[expressed.color], 0.5715) * minRadius;
                // console.log(d[expressed.color], radius);
                return radius;
            })

            .attr("cx", function (d, i) {
                return xScale(parseFloat(d[expressed.x]));
            })
            //place circles vertically on the chart
            .attr("cy", function(d){
                return yScale(parseFloat(d[expressed.y]));
            })

            .attr("fill", function(d){
			return colorScale(parseFloat(d[expressed.color]));
            });

        //below Example 2.8...create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 30)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .text("Amenity Class Score (white=worst, dark=best) & Seasonal Temps by State");
    };

})(); //last line of main.js