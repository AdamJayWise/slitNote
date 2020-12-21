// d3plots.js

/** 
  so here I want to create a re-useable framework
  there will be a plot object that acts as the main interface for an svg graph
  it will have an update() method that re-draws the screen
  you can give it x and y data

*/

function Plot(paramObj){

    var self = this;

    // state of the object
    self.svg = d3.select('svg'); // this is the div the plot goes into, the first svg if not otherwise specific
    self.plotWidth = 300; // chart width in pixels
    self.plotHeight = 300; // chart height in pixels
    self.plotMargin = 50; // svg margin in pixels
    self.plotBumper = 35;
    self.xTicks = [0, 250, 500, 1000, 2000];
    self.yTicks = [0, 100, 1000];
    self.yAxisMin = 0;
    self.yAxisMax = 100;
    self.xAxisMin = 0;
    self.xAxisMax = 1000;
    self.yAxisLabel = 'Y Axis';
    self.xAxisLabel = 'X Axis';
    self.dataSets = {}; // data sets to plot

    // overWrite any default values with paramObj values
    if (paramObj){
        Object.keys(paramObj).forEach(function(key){
            self[key] = paramObj[key];
        });
    }

    // configure svg as required
    self.svg.attr("height", self.plotHeight)
            .attr("width", self.plotWidth);



    // add scales
    // generate scales and axes including formatting for the window axis
    self.xScale = d3.scaleLinear()
                    .domain([self.xAxisMin, self.xAxisMax])
                    .range([self.plotMargin, self.plotWidth-self.plotMargin + self.plotBumper])
                    .clamp(true)

    self.yScale = d3.scaleLinear()
                    .domain([self.yAxisMin, self.yAxisMax])
                    .range([self.plotHeight-self.plotMargin, self.plotMargin/5])
                    .clamp(true)

    self.dataLine = d3.line()
                    .x(d=>self.xScale(d.x))
                    .y(d=>self.yScale(d.y))

    self.xAxis = d3.axisBottom()
                    .scale(self.xScale)
                    .tickValues( self.xTicks )
                    .tickFormat(d=>d);

    self.yAxis = d3.axisLeft()
                    .scale(self.yScale)
                    .tickValues( self.yTicks )
                    .tickFormat(d=>d);


    // add clip path 
    self.svg.append('clipPath')
        .attr('id','clipBox')
        .append('rect')
        .attr('width', self.xScale(self.xAxisMax) - self.xScale(self.xAxisMin) )
        .attr('height', self.yScale(self.yAxisMin + 0.2) - self.yScale(self.yAxisMax) )
        .attr('x', self.plotMargin)
        .attr('y', self.plotMargin/5)

    // add graph bounding box
    self.svg.append('rect')
        .attr('width', self.xScale(self.xAxisMax) - self.xScale(self.xAxisMin) )
        .attr('height', self.yScale(self.yAxisMin + 0.2) - self.yScale(self.yAxisMax) )
        .attr('x', self.plotMargin)
        .attr('y', self.plotMargin/5)
        .attr('stroke', 'black')
        .attr('stroke-weight', 3)
        .attr('fill', 'none')

    // add axes for window
    self.yAxisG = self.svg
            .append('g')
            .classed('axis',true)
            .attr('id','yAxis')
            .attr('transform',`translate(${self.plotMargin},-0.5)`)
            .call(self.yAxis)
            .style('font-size',13)
                
    self.xAxisG = self.svg
            .append('g')
            .classed('axis',true)
            .attr('id','xAxis')
            .attr('transform',`translate(0,${self.plotHeight - self.plotMargin})`)
            .call(self.xAxis)
            .style('font-size',13)

    
     // add axes labels for window
     var xLabelG = self.svg.append('g');
     xLabelG.attr('transform', `translate(${self.xScale( (self.xAxisMin + self.xAxisMax) / 2)}, ${self.yScale(self.yAxisMin) + 35})`)
     xLabelG.append('text')
            .text(self.xAxisLabel)
            .attr('text-anchor','middle')
            .attr('class','axisLabel')
 
     var yLabelG = self.svg.append('g');
     yLabelG.attr('transform', `translate(15, ${self.yScale( (self.yAxisMax + self.yAxisMin) / 2)}), rotate(-90)`)
     yLabelG.append('text')
            .text(self.yAxisLabel)
            .attr('text-anchor','middle')
            .attr('class','axisLabel')

    self.updateAxes = function(){

        // update axes scales
        self.xScale.domain([self.xAxisMin, self.xAxisMax]);
        self.yScale.domain([self.yAxisMin, self.yAxisMax]);

        self.yAxis.tickValues(self.yTicks);
        self.yAxisG.call(self.yAxis);

        // remove old gridlines
        self.svg.selectAll(".gridLine").remove();
        // add division lines
        // add vertical lines
        var vertLineOffSet = 0.5;

        for (var i in self.xTicks){
            self.svg.append('line')
                .attr('x1', self.xScale(self.xTicks[i]) + vertLineOffSet)
                .attr('y1', self.yScale(self.yAxisMin))
                .attr('x2', self.xScale(self.xTicks[i]) + vertLineOffSet)
                .attr('y2', self.plotMargin/5)
                .attr('stroke','gray')
                .classed("gridLine", true)
        }


        // add horizontal lines
        for (var i in self.yTicks){
            self.svg.append('line')
                .attr('y1', self.yScale(self.yTicks[i]))
                .attr('x1', self.xScale(self.xAxisMax))
                .attr('y2', self.yScale(self.yTicks[i]))
                .attr('x2', self.plotMargin)
                .attr('stroke','gray')
                .classed("gridLine", true)
        }

    }

    self.draw = function(){
        // remove old traces from graph
        self.updateAxes();
        self.svg.selectAll('.legend').remove();
        self.legendG = self.svg.append('g')
                        .attr('class','legend');
        
        self.legendG.attr('transform', `translate(${self.plotWidth/2.7 + 5}, ${3*self.plotHeight/5})`);
        
        /** 
        self.qe.legendG.append('rect')
            .attr('fill','white')
            .attr('x',-5)
            .attr('y',-4)
            .attr('width', 200)
            .attr('height', 1 * 20 + 8)
            .attr('stroke','black')
            */
        
        self.svg.selectAll('path').remove();
        // update traces on graph
            Object.keys(self.dataSets).forEach(function(setKey){
            var dataObjList = self.dataSets[setKey].dataObjList; // data to plot
                // add traces to graph
                var thisPath = self.svg.append('path') 
                                .attr('fill','none')
                                .attr('stroke', '#666')
                                .attr('stroke-width', 3)
                                .attr('d', self.dataLine(dataObjList))
                                .attr("clip-path", "url(#clipBox)")

                if (self.dataSets[setKey].fill){
                    thisPath.attr("fill", self.dataSets[setKey].fill)
                }
                if (self.dataSets[setKey].fillopacity){
                    thisPath.attr("fill-opacity", self.dataSets[setKey].fillopacity)
                }
            });
        }
                //.attr('stroke-dasharray', this.dashArray)
            
            /** leaving this inactive for now
            // add legend text entry to graph
            var textEntry = self.legendG.append('text');
            textEntry.text(windowDict[window]).attr('alignment-baseline','hanging')
            textEntry.attr('x', 20).attr('y', i*20)
            // add path entry to text
            self.qe.legendG.append('line')
                .attr('x1',0)
                .attr('x2',15)
                .attr('y1',10 + i*20)
                .attr('y2',10 + i*20)
                .attr('stroke', 'black')
                .attr('stroke-width', 3)
            // update legend bounding box to fit text
            var legendBBox = self.svgQE.select('.legend').select('rect').node().getBBox();
            var textBBox = textEntry.node().getBBox();
            d3.select('.legend').select('rect').attr('width', Math.max(textBBox.width + 30, legendBBox.width))
            */
            // add legend entry


} // end Plot definition
