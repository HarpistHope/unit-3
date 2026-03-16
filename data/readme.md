# **Natural Amenities Scale (based on data from 1941-1970)**

#### The data was accessed from https://www.ers.usda.gov/data-products/natural-amenities-scale by Hope McBride on 03/16/2026. 

The original dataset comes from the USDA/Economic Research Service's October 1999 'Natural Amenities Drive Rural Population Change' report. In the original report, the averages of six natural phenomena from 1941-1970 were measured in every U.S. county of the lower 48 states. According to the USDA, the features "were selected on the basis of a conception of the environmental qualities most people prefer, availability of measures, simplicity, nonredundancy, and the correlation to population change." The selected features were used to create an objective Natural Amenities Scale against which each county could be measured.

To format the data for the purposes of this lab, I aggregated the county data to find the state averages of each measurement and final score. 

*NOTE: Alaska and Hawaii were not included in the original dataset; Washington D.C. was included but was manually removed when formatting the data for this project to focus attention on the lower 48 U.S. states.*

### Below are the six features used in the natural amenities composite score:

* Warm winter (avg January temp)
* Winter sun (avg January days of sun)
* Temperate summer (low winter-summer temp gap)
* Summer humidity (low avg July humidity)
* Topographic variation (topography scale; the more variation in a county, the higher/more appealing the score)
* Water area (as proportion of total county area)


Using the above measures, each county's position on the Amenities Scale was calculated. The deviation from the mean was then used to assign a final rank from 1-7 (see below):

"Deviations from the mean	
1 = Over -2 (Low)	
2 = -1 to -2	
3 = 0 to -1	
4 = 0 to 1	
5 = 1 to 2	
6 = 2 to 3 	
7 = Over 3 (High)"

In addition to the calculated score on the Amenities Scale and the rank, I included each state's overall rank from 1-48 (in this case, 1 being the highest/best ranked state and 48 being the lowest/worst) for further analysis and evaluation purposes.


### The measurement definitions are sourced from this documentation page: https://www.ers.usda.gov/data-products/natural-amenities-scale/documentation 


## Final note: I do not necessarily agree with the final rankings assigned to some states by this scale. However, I realize that my own personal preference towards some states over others plays a role in this disagreement. I would like to see an updated version of this scale some day and would be curious to learn if there are perhaps additional measurements that may shift some of the final scores around. I could not find anything more recent at this time; perhaps creating a new analysis assessment can be a fun project for another day! 


