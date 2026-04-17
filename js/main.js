//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    // I start by creating a welcome popup/point of entry to the webpage
    var welcome = d3.select("body")
        .append("div")
        .attr("class", "welcomePopup")
;

    // define welcome popup; add close button
    welcome.html(`
        <div class="welcome-content">
        <p><strong>Welcome to the 1970s Natural Amenity Scale Explorer!</strong></p>
        <p>Add some color to the map and place bubbles on the chart by selecting attributes from the dropdowns above.</p>
        <p>Click on a state to zoom and open additional ranking details.</p>
        <p>Hover over a state to see a summary of the selected color/bubble size attribute.</p>
        <p>Examine the chart to see how any three attributes may relate to each other.</p>
        <button class="close-btn">Close</button>
        </div>
        `);
    // add close button click funtion
    d3.select(".close-btn").on("click", function() {
        welcome.style("display", "none")
    })

    // Pseudo-global variables 
    // Start with array of attributes
    var attrObjects = [{
        attr:"avg_jan_temp",
        label:"Mean January Temp",
        unit:"Degrees (Fahrenheit)"
    },
    {
        attr:"avg_jan_sun",
        label:"Mean Hours of Sunlight, Jan.",
        unit:"Hours"
    },
    {
        attr:"avg_jul_temp",
        label:"Mean July Temp",
        unit:"Degrees (Fahrenheit)"
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
        label:"Standardized Topography (z-score)",
        unit:"Standard deviations from mean (z-score)"
    },
    {
        attr:"avg_amenity_scale",
        label:"Natural Amenity Score (z-score)",
        unit:"Standard deviations from mean (z-score)"
    },
    ]

    //create an object for different expressed variables
    var expressed  = {
        x:attrObjects[0].attr, //x attribute (avg_jan_temp)
        y:attrObjects[0].attr, //y attribute (avg_jan_temp)
        color: null //start without color, user will select
    }

    // create and initalize global state popup variable
    var statePopup = d3.select("#vis-container")
        .append("div")
        .attr("class", "statePopup")
        .style("position", "absolute")
        .style("visibility", "hidden");

    //chart frame dimensions; check size of screen, if over 700 pixels, create a chart container the entire width of the screen.
    //The chart will stack below the map
    if(window.innerWidth < 700)
        var chartWidth = window.innerWidth - 40
    else
        var chartWidth = window.innerWidth * 0.5 - 25

    var chartHeight = window.innerHeight - 250;

    // log basic intro info
    console.log("U.S. States Shapefile from: https://www.projectlinework.org/. Editors: Daniel P. Huffman, Hans van der Maarel. Shapefile Name: Times Approximate. I selected the contiguous U.S and reprojected the shapefile to WGS 84 in ArcGIS Pro before converting to topojson with MapShaper. - H. McBride, 03/21/2026")

    //begin script when window loads
    window.onload = setMap;

    // first funciton (within wrapping anonymous function), set up choropleth map
    function setMap(){

        //check size of screen, if over 700 pixels, create a map container the entire width of the screen
        //the map will stack atop the chart
        if(window.innerWidth < 700)
            var width = window.innerWidth - 40
        else
            var width = window.innerWidth * 0.5 - 10

        var height = window.innerHeight - 250;

        //create new svg container for the map
        var map = d3.select("#vis-container")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        // Here I begin to integrate the D3 zoom to bounding box interaction to my map
        // I will pass g into setEnumerationUnits and add zoom/click-to-zoom functions
        var g = map.append("g");

        //Create Albers equal area conic projection -- This will be an appropriate projection for my choropleth map focusing on the lower 48 US States
        // I removed the hardcoded projection parameters so the map will resize responsively with the window (see callback function below)
        var projection = d3.geoAlbers()

        // define my path
        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [
            d3.csv("data/state_natural_amenities_avg.csv"),
            d3.json("data/states_wgs84.topojson")
        ];
        Promise.all(promises).then(callback);

        // add zoom interaction behavior to the map
        var zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", zoomed);
        map.call(zoom);

        function callback(data){	
            
            var csvData = data[0], topoData = data[1];
                // console.log(csvData);
                // console.log(topoData);

            //translate TopoJSON
            var usStates = topojson.feature(topoData, topoData.objects.states_wgs84).features;
                
            //join csv data to GeoJSON enumeration units
            usStates = joinData(usStates, csvData);

            // add responsive projection parameters with responsive padding
            var padding = Math.max(10, width * 0.05);
            projection.fitExtent(
                [[padding, padding], [width - padding, height - padding]], 
                {type: "FeatureCollection", features: usStates});

            // create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(usStates, g, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            //add title
            createTitle();

            //add dropdown to adjust attribute
            createDropdown(csvData, "color", "Select Color/Bubble Size");
            // add dropdown to adjust x axis
            createDropdown(csvData, "x", "Select X Axis");
            // add dropdown to adjust y axis
            createDropdown(csvData, "y", "Select Y Axis");

            //render dynamic legend using colorScale
            if (expressed.color) {
                renderLegend(colorScale);
            }
            
        };

        // set up clicked funtion to zoom to bounding box (state); adapted from d3 gallery
        function clicked(event, d) {
            // turn statepopup visible upon click
            statePopup.style("visibility", "visible")

            // set up zoom sequence, from d3
            const [[x0, y0], [x1, y1]] = path.bounds(d);
            event.stopPropagation();

            map.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
                    .translate(
                        +map.attr("width") / 2, 
                        +map.attr("height") / 2 - 80) // I shift the map up a bit to see the state over the popup more clearly
                    .scale(Math.min(8, 0.65 / Math.max(
                        (x1 - x0) / map.attr("width"),
                        (y1 - y0) / map.attr("height")
                    )))
                    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
                
        )};

        // add click and reset interactions from d3 gallery
        map.on("click", reset);

        // add zoom function (part of d3 zoom to bounding box interaction )
        function zoomed(event) {
            g.attr("transform", event.transform);
            g.attr("stroke-width", 1 / event.transform.k);
        }

        // add function to reset zoom, hide popup visability
        function reset() {
            map.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
            );
            // make popup invisible again
            statePopup.style("visibility", "hidden")
            // dehighlight selected state
            d3.selectAll(".state").classed("selected", false);
        }

        // I added setEnumerationUnits to the setMap function so I can use the d3 interaction zoom to bounding box (i.e, enumeration unit)
        function setEnumerationUnits(usStates, g, path, colorScale){

        //...STATES BLOCK FROM CHAPTER 8
        //add States to map as enumeration units
            var states = g
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

        // (from d3 example) add click interaction to zoom to bounding box/state
        .on("click", function(event, d){
            // prevent reset from immediately firing
            event.stopPropagation();

            // remove the hover label on click; it comes back as soon as the mouseover starts again
            d3.select(".infolabel").remove();
            console.log(d.properties);
            clicked(event, d);

            // Add state-specific popup containing additional info about associate between natural amenities scale score and class rank
            statePopup.html(
                `<strong>State:</strong> ${d.properties.NAME}<br><br>
                <strong>Natural Amenity Scale and Rank: </strong>On the standardized natural amenity scale, ${d.properties.NAME} comes in at <strong>${d.properties.avg_amenity_scale}.</strong><br><br>
                Using this standardized score to rank the state from 1 to 7 (1 meaning low natural amenity appeal, 7 meaning high natural amenity appeal) gives ${d.properties.NAME} an overall natural amenity rank of:<strong> ${d.properties.amen_class}</strong>`
            ); 

            // get map bounding box
            var mapRect = d3.select(".map").node().getBoundingClientRect();

            // Call and Position popup, turn visibility on when clicked
            statePopup
                .style("left", "25%")
                .style("top", "95%")
                .style("transform", "translate(-50%, -100%)")
                .style("visibility", "visible");
            
        })

        // add highlight, dehighlight, moveLabel interactions
        .on("mouseover", function (event, d) {
            highlight(d.properties); 
        })
        .on("mouseout", function(event, d){
            dehighlight(d.properties);
        })
        .on("mousemove", function(event, d){
            moveLabel(event, d);
        });
    }

        // define padding for the reset button
        var padding = Math.max(10, width * 0.02);
        
        // add reset button to zoom back to default view; the "translate..." statement should help position the button appropriately even when the window is resized
        var resetButton = map.append("g")
            .attr("class", "reset-button")
            .attr("transform", "translate(" + padding + "," + padding + ")")
            .style("cursor", "pointer")
            .on("click", reset)

        // set up reset button svg
        resetButton.append("rect")
            .attr("width", 80)
            .attr("height", 30)
            .attr("rx", 6)
            .attr("ry", 6);
        // add reset button text
        resetButton.append("text")
            .attr("x", 40)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .text("Reset Zoom");

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
                        // first I separate out the average amenity class rank
                        // because this attribute doesn't normalize well with the rest of my datat (it divides the states into one of 7 rank categories), I will add it to the .on click popup as an extra detail
                        geojsonProps.amen_class = parseFloat(csvState.avg_amenity_class);

                        //assign all attributes and values
                        attrObjects.forEach(function (attr) {
                            var val = parseFloat(csvState[attr.attr]); //get csv attribute value
                            geojsonProps[attr.attr] = val; //assign attribute and value to geojson properties
                        });
                    }
                }
            }
        // console.log(usStates);
        return usStates;

    };

    //function to create color scale generator - I chose to use natural breaks/ckmeans because my data shows variation and clusters
    function makeColorScale(data){
        var colorClasses = [
        "#ffffcc",
        "#c2e699",
        "#78c679",
        "#31a354",
        "#006837"
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
        var padding = 5; 
        return yScale = d3.scaleLinear().range([chartHeight, 0]).domain([dataMinMax[0] - padding, dataMinMax[1] + padding]);
    }
    //function to create x scale
    function createXScale(csvData, chartWidth){
        var dataMinMax =  getDataValues(csvData, expressed.x)
        // same as above, add padding so bubbles don't go off the chart
        var padding = 5;
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
        var chart = d3.select("#vis-container")
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
            // add slight border to the circles
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5)
            // add highlight, dehighlight, and moveLabel interactions
            .on("mouseover", function (event, d) {
                highlight(d);
            })
            .on("mouseout", function(event, d){
                dehighlight(d);
            })
            .on("mousemove", moveLabel);

        //below Example 2.8...create a text element for the chart title (intially wouldn't update, debugged + reconfigured, it's working now, yay!)
        var chartTitle = chart.append("text")
            .attr("x", 35)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .text("X: " + getChartTitle(expressed.x) + " | Y: " + getChartTitle(expressed.y))
            chartTitle.raise();
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

        // add container to make dropdown styling easier
        var dropdowns = d3.select(".navbar")
            .append("div")
            .attr("class", "dropdowns"); 

        //add select element
        //add labels for dropdowns
        var label = dropdowns
            .append("p")
            .attr("class", "dropdown-label")
            .text(menuLabel + ": ");
       
        // append select element to dropdowns container
        var dropdown = dropdowns
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, expressedAttribute, csvData)
    });

    // add initial option; I kept the 'Select Attribute' label as an entry point affordance 
        var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

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
            .text("U.S. Natural Amenities Scale, 1970s")
    }

    //dropdown change event handler
    function changeAttribute(attribute, expressedAttribute, csvData) {
        // console.log(expressed);
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

        // update chart title
        d3.select(".chartTitle")
            .text("X: " + getChartTitle(expressed.x) + " | Y: " + getChartTitle(expressed.y))
        
        // update legend when attribute is changed (inside if clause to prevent errors when loading (color is initially null))
        renderLegend(colorScale);
            
    }

    // function to create radius scale for the bubble chart -- I chose this instead of a Flannery compensation so my bubbles scale according to SELECTED attribute, not ALL attributes; otherwise, because of the large range of values, some bubbles are very very small and others are very large
    function createRadiusScale(csvData){
        var min = d3.min(csvData, d => parseFloat(d[expressed.color]));
        var max = d3.max(csvData, d => parseFloat(d[expressed.color]));

        // guard against identical values (breaks sqrt scale transitions)
        if (min === max) max = min + 1;

        // make bubble radius size responsive to screen size (they were overflowing the screen intially)
        var maxRadius = Math.min(chartWidth * 0.06, 15);

        return d3.scaleSqrt()
            .domain([min, max])
            .range([4, maxRadius]);
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
            "</h1><b>" + unitLabel + ",  " + props.ISO3166_2 + " " + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.ISO3166_2 + "_label")
            .html(labelAttribute);
    };

    //function to move label
    function moveLabel(event, d) {
        // getboundingclientrect was originally undefined when I clicked a state and removed the label, causing a crash
        // to mitigate the crash, I define label and return if the label is empty
        var label = d3.select(".infolabel");
        if (label.empty())
            return;

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
        // function to get chart title as the user choses an attribute with the dropdown
        // I added a section to changeAttribute to update title as the chart updates
        function getChartTitle(attr) {
            let label;
            attrObjects.forEach(function(d) {
                if (d.attr === attr)
                    label = d.label;
            });
            return label;
        }

        // funciton to render dynamic choropleth legend (adapted from stackoverflow)
        function renderLegend(colorScale) {
            // empty legend before updating
            d3.select("#legend").selectAll("*").remove();

            //build legend
            var legend = d3.select("#legend")
                .append("div")
                .attr("class", "legend");

            var domain = colorScale.domain();
            var range = colorScale.range();
            
            var items = legend.selectAll(".legend-item")
                .data(range)
                .enter()
                .append("div")
                .attr("class", "legend-item");

            // define units to add to the labels
            var unitLabel;
            attrObjects.forEach(function(x){
                if (expressed.color == x.attr)
                    unitLabel = x.unit;
            });

            items.append("div")
                .attr("class", "legend-color")
                .style("background-color", d => d);

            // update legend labels dynamically
            items.append("span")
                .text((d, i) => {
                    if (i === 0) {
                        return "< " + domain[0].toFixed(1);
                    } else if (i === domain.length) {
                        return "> " + domain[domain.length - 1].toFixed(1);
                    } else {
                        return domain[i - 1].toFixed(1) + " – " + domain[i].toFixed(1);
                    }
                });
            
            d3.select("#legend")
                .insert("div", ":first-child")
                .style("text-align", "center")
                .style("font-weight", "bold")
                .text(unitLabel);
        }

})(); //last line of main.js



// Pseudocode:

// for zoom to feature, add popup containing info for all three chosen attributes per the clicked state
// edit popup position, esp for mobile
// move .style features to css
//Change welcome popup from fade out to exit
// Add page context below the map
// add text styles 
// Check rubric, you might be close? 

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
        
