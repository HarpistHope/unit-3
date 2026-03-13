# **Traffic Congestion State Averages in the U.S. in 2022**

## The data was accessed from https://www.kaggle.com/datasets/sobhanmoosavi/us-traffic-congestions-2016-2022 by Hope McBride on 03/13/2026. 

Though the original dataset contains congestion events from 2016 to 2022, for the purposes of this lab, I selected only those events that occured in 2022. Because the D3 lab will be a choropleth map, I aggregated the data by state averages. 

*NOTE: Alaska and Hawaii were not included in the original dataset; Washington D.C. was included and counted as a state.*

### Below are the numerical attributes aggregated for each state:

* Average severity of traffic events; ranked 0-4, with 0 being the least severe
* Average delay from typical traffic flow in minutes
* Average delay from free traffic flow in minutes
* Average distance/"length of the road extent affected by the congestion event" in miles
* Average visibility in miles
* Average congestion speed, originally reported by the provider as slow, moderate, or fast. When formatting the new dataset, I converted 'slow' to 1, 'moderate' to 2, and 'fast' to 3. The averages of those numeric conversions were used to provide the overall average speed of traffic affected by congestion, first in numeric fashion, then numeric+text interpretation, then counts of each speed category event per state.


### Below is an excerpt of the description of the original dataset from the source:

"About Dataset
Description

This is a countrywide traffic congestion dataset that covers 49 states of the USA. The congestion events data were collected from February 2016 to September 2022, using multiple APIs that provide streaming traffic incident (or event) data. These APIs broadcast traffic data captured by various entities, including the US and state departments of transportation, law enforcement agencies, traffic cameras, and traffic sensors within the road networks. The dataset contains approximately 33 million congestion records. We also provide a sampled version of data that includes 2 million events for easier processing and handling for those who prefer to work with a smaller amount of data.
Acknowledgements

If you use this dataset, please kindly cite the following paper:

    Moosavi, Sobhan, Mohammad Hossein Samavatian, Arnab Nandi, Srinivasan Parthasarathy, and Rajiv Ramnath. "Short and long-term pattern discovery over large-scale geo-spatiotemporal data." In Proceedings of the 25th ACM SIGKDD international conference on knowledge discovery & data mining, pp. 2905-2913. 2019.

Inspiration

The US Traffic Congestion dataset can be used for numerous applications, such as traffic modeling, simulated routing, identifying traffic hotspot locations, and exploring intrinsic traffic patterns and how they evolve over time."