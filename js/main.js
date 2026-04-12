// example 1.2: Defining attrArray and expressed as pseudo-global variables in main.js
console.log("At the moment, the states and bubbles are color classified according to amenity class score (1/light color = worst, 7/dark color = best). The x axis shows average January temp and the y axis shows average July temp. I do not love the style of the axes + labels at the moment; I will fix these for the final d3 lab.");
//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){
//label dropdown menus
    //pseudo-global variables
    var attrObjects = [{
        attr:"avg_jan_temp",
        label:"Mean January Temp",
        unit:"Degrees, Fahrenheit"
    },
    {
        attr:"avg_jan_sun",
        label:"Mean Hours Sunlight, January",
        unit:"Hours"
    },
    {
        attr:"avg_jul_temp",
        label:"Mean July Temp",
        unit:"Degrees, Fahrenheit"
    },
    {
        attr:"avg_jul_hum",
        label:"Mean July Humidity",
        unit:"Relative Humidity (%)"
    },
    {
        attr:"avg_water_area",
        label:"Percent Water Area",
        unit:"%"
    },
    {
        attr:"avg_topography_z",
        label:"Topography Z Score",
        unit:"TerraWatt Hours"
    },
    {
        attr:"avg_amenity_scale",
        label:"Natural Amenity Z Score",
        unit:"Standard deviations from mean (z-score)"
    },
    {
        attr:"avg_amenity_class",
        label:"Natural Amenity Rank",
        unit:"Categorical (ranked classes)"
    }]
   
	//pseudo-global variables

    //create an object for different expressed variables
    var expressed  = {
        x:attrObjects[0].attr, //x attribute (avg_jan_temp)
        y:attrObjects[2].attr, //y attribute (avg_july_temp)
        color:attrObjects[7].attr //color/size attribute (amenity_class, 1 = worst, 7 = best))
    }
    //chart frame dimensions
    //check size of screen, if over 700 pixels, create a chart container the entire width of the screen.
    //The chart will stack below the map
    if(window.innerWidth < 700)
        var chartWidth = window.innerWidth - 40
    else
        var chartWidth = window.innerWidth * 0.5 - 25

    var chartHeight = window.innerHeight - 170;

    console.log("U.S. States Shapefile from: https://www.projectlinework.org/. Editors: Daniel P. Huffman, Hans van der Maarel. Shapefile Name: Times Approximate. I selected the contiguous U.S and reprojected the shapefile to WGS 84 in ArcGIS Pro before converting to topojson with MapShaper. - H. McBride, 03/21/2026")

    //begin script when window loads
    window.onload = setMap();


    //set up choropleth map
    function setMap(){

        //check size of screen, if over 700 pixels, create a map container the entire width of the screen
        //the map will stack atop the chart
        if(window.innerWidth < 700)
            var width = window.innerWidth - 40
        else
            var width = window.innerWidth * 0.5 - 25

        var height = window.innerHeight - 170;

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

        //use Promise.all to parallelize asynchronous data loading
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
                
            //join csv data to GeoJSON enumeration units
            usStates = joinData(usStates, csvData);

            // create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(usStates, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            //add title
            createTitle();

            //add dropdown to adjust attribute
            createDropdown(csvData, "color", "Select Color/Size");
            // add dropdown to adjust x axis
            createDropdown(csvData, "x", "Select X");
            // add dropdown to adjust y axis
            createDropdown(csvData, "y", "Select Y");

        };
    }; //end of setMap()

    function joinData(usStates, csvData){
        //...DATA JOIN LOOPS FROM EXAMPLE 1.1
        //loop through csv to assign each set of csv attribute values to geojson states
            for (var i = 0; i < csvData.length; i++) {
                var csvState = csvData[i]; //the current state
                var csvKey = csvState.ISO3166_2; //the CSV primary key

                //loop through geojson states to find correct state
                for (var a = 0; a < usStates.length; a++) {
                    var geojsonProps = usStates[a].properties; //the current state geojson properties
                    var geojsonKey = geojsonProps.ISO3166_2; //the geojson primary key

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey) {
                        //assign all attributes and values
                        attrObjects.forEach(function (attr) {
                            var val = parseFloat(csvState[attr.attr]); //get csv attribute value
                            geojsonProps[attr.attr] = val; //assign attribute and value to geojson properties
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
			if(value != null) {            	
				return colorScale(d.properties[expressed.color]);            
			} else {            	
				return "#ccc";            
			}    
		})
        // I changed the atribute name in the csv file from 'state' to ISO3166_2 to match the geojson; 
        // 
        .on("mouseover", function (event, d) {
            highlight(d.properties); 
        })
        .on("mouseout", function(event, d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);
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

        if (min === max) max = min + 1; // prevent a divide by zero error in the scale, ensures bubble chart transitions works

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
 
    }

    //function to create coordinated bubble chart
    function setChart(csvData, colorScale){
        //chart frame dimensions
        // var chartWidth = window.innerWidth * 0.5 -25,
        //     chartHeight = 500;

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
        // Here I set up a radius scale instead of using Flannery's computation to proportionally scale my bubbles according to selected attribute
        // this way, the bubbles don't get too big and fall out of the chart frame
        var radiusScale = createRadiusScale(csvData);

        //set circles for each state
        var circles = chart.selectAll(".bubble") //create an empty selection
            .data(csvData) //here we feed in our array of data
            .enter() //one of the great mysteries of the universe
            .append("circle")
            // .attr("class", "circle")
            .attr("class", function (d) {
                return "bubble " + d.ISO3166_2;
            })
            // Use radius scale to set bubble size based on expressed color attribute value
            .attr("r", function (d) {
                return radiusScale(parseFloat(d[expressed.color]));
            })
            //place circles horizontally on the chart
            .attr("cx", function (d, i) {
                return xScale(parseFloat(d[expressed.x]));
            })
            //place circles vertically on the chart
            .attr("cy", function(d){
                return yScale(parseFloat(d[expressed.y]));
            })
            // color circles to match the map
            .attr("fill", function(d){
			return colorScale(parseFloat(d[expressed.color]));
            })
            .on("mouseover", function (event, d) {
                highlight(d);
            })
            .on("mouseout", function(event, d){
                dehighlight(d);
            })
            .on("mousemove", moveLabel);

        //below Example 2.8...create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 30)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .text("Amenity Class Score (white=worst, dark=best) & Seasonal Temps by State");
    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData, expressedAttribute, menuLabel) {
        //get current label
        //retrieve unit label
        var dropdownLabel
        attrObjects.forEach(function(x){
            if (expressed[expressedAttribute] == x.attr)
                dropdownLabel = x.label
        })

        //add select element
        //add dropdown label
        var label = d3.select(".navbar")
            .append("p")
            .attr("class", "dropdown-label")
            .text(menuLabel + ": ");
       
        //select .navbar instead of body
        var dropdown = d3.select(".navbar")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, expressedAttribute, csvData)
    });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text(dropdownLabel);

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrObjects)
            .enter()
            .append("option")
            .attr("value", function (d) { return d.attr })
            .text(function (d) { return d.label });
    };

    //create page title
    function createTitle() {
        var pageTitle = d3
            .select(".navbar")
            .append("h1")
            .attr("class", "pageTitle")
            .text("U.S. States' Natural Amenities Scale")
    }

    //dropdown change event handler
    function changeAttribute(attribute, expressedAttribute, csvData) {
        console.log(expressed);
        //change the expressed attribute
        expressed[expressedAttribute] = attribute;
        //recreate x and y scales based on the newly expressed value
        //update y scale
        var yScale = createYScale(csvData, chartHeight);
        //update x scale
        var xScale = createXScale(csvData, chartWidth);
        
        //recreate the color scale
        var colorScale = makeColorScale(csvData)
        
        //update axes (I added transitions for the axes too)
        var xaxis = d3.select(".xaxis")
            .transition()
            .duration(1000)
            .call(d3.axisTop(xScale));

        var yaxis = d3.select(".yaxis")
            .transition()
            .duration(1000)
            .call(d3.axisRight(yScale));


        //recolor enumeration units
        var state = d3.selectAll(".state") 
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed.color];
                if (value) {
                    return colorScale(d.properties[expressed.color]);
                } else {
                    return "#ccc";
                }
        });

        // same as above, use radius scaleSqrt to size bubbles proportional to selected attribute values
        var radiusScale = createRadiusScale(csvData);

        //recolor bubbles
        var circles = d3.selectAll(".bubble")
            .transition()
            .duration(1000)
            //recolor circles to match the map
            .attr("fill", function (d) {
                return colorScale(parseFloat(d[expressed.color]));
            })
            // resize circles with radius scale
            .attr("r", function (d) {
                return radiusScale(parseFloat(d[expressed.color]));
            })
            // calculate x and y scales
            .attr("cx", function (d) {
                return xScale(parseFloat(d[expressed.x]));
            })
            .attr("cy", function(d){
                return yScale(parseFloat(d[expressed.y]));
            });
    }

    // function to create radius scale for the bubble chart -- I chose this instead of a Flannery compensation so my bubbles scale according to SELECTED attribute, not ALL attributes; otherwise, because of the large range of values, some bubbles are very very small and others are very large
    function createRadiusScale(csvData){
        var min = d3.min(csvData, d => parseFloat(d[expressed.color]));
        var max = d3.max(csvData, d => parseFloat(d[expressed.color]));

        // guard against identical values (breaks sqrt scale transitions)
        if (min === max) max = min + 1;

        return d3.scaleSqrt()
            .domain([min, max])
            .range([4, chartWidth / 30]);
    }

    //function to highlight enumeration units and bars
    function highlight(props) {
        //change stroke
        var selected = d3.selectAll("." + props.ISO3166_2)
            .attr("class", function (d) {
                //get current list of classes for each element
                let elemClasses = this.classList;
                //add 'selected` to classList
                elemClasses += " selected";
                return elemClasses;
            })
        //bring element to front
        selected.raise()
        //add info label
        setLabel(props)

    };

    //function to dehighlight enumeration units and bars
    function dehighlight(props) {
        // remove label
        d3.select(".infolabel")
            .remove();
        //change stroke
        var selected = d3.selectAll("." + props.ISO3166_2)
            .attr("class", function () {
                //get current list of classes for each element
                let elemClasses = this.classList; 
                //remove class "selected" from class list
                elemClasses.remove("selected")
                return elemClasses;
            })
    };

    //function to create dynamic label
    function setLabel(props) {
        var unitLabel
        //retrieve unit label
        attrObjects.forEach(function(x){
            if (expressed.color == x.attr)
                unitLabel = x.unit
        })
        
        //label content
        var labelAttribute = "<h1>" + props[expressed.color] +
            "</h1><b>" + unitLabel + " " + props.ISO3166_2 + " " + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.ISO3166_2 + "_label")
            .html(labelAttribute);
    };

    //function to move label
    function moveLabel(event, d) {
        //text wrapping
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect().width;
        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1;

        var infoLabel = d3.select(".infolabel")
            .style("top", y + "px")
            .style("left", x + "px")
    }

})(); //last line of main.js



// Pseudocode:
    // For attribute change listener:
        // ON USER SELECTION:
        // Step 1. Change the expressed attribute
        // Step 2. Recreate the color scale with new class breaks
        // Step 3. Recolor each enumeration unit on the map
        // Step 4. Resize each circle on the bubble chart
        // Step 5. Recolor each circle on the bubble chart

        // Responsive design, css grids, navbar restyling
        // Readable options; set up json to match prop titles to human readable forms, loop through object props until match -- retreive label
        // dynamic choropleth legend, update on attribute sequencing
        // other interactoin operators: zoom, pan, search, filter, reexpress, overlay, resymbolize, reproject, arrange, calculate
        // adjust width and placement of map itself to resize with window
        // additional coordinated data visualizatoins
        // metadata and other supplementary info -- give context!
        // style through css
        // any other tools or features that add to the utility, usability, and or aesthetics of the coordinated vis
        // 