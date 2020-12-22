// A generic plotting framework using d3.js

app = {
    psf : 30, // imaging system psf in microns
    dispersion : 1, // system dispesion in nm/mm
    peakSigma : 0.0001, // peak fwhm in mm
    detectorPixelNumber : 65, // number of pixels in detector
    detectorPixelSize : 6.5, // detector pixel size in um
    slitWidth : 10, // slit width in um

}

var resChartConfig = {
    svg : d3.select("#resChart"),
    plotWidth : 300,
    plotHeight : 300,
    xAxisMin : 0,
    xAxisMax : 100,
    yAxisMin : 20,
    yAxisMax : Math.sqrt(100**2 + app.psf**2),
    yTicks : [25, 50, 75],
    xTicks : [25, 50, 75],
    xAxisLabel : 'Slit Width, um',
    yAxisLabel : 'System Resolution, um',
    title : 'Resolution vs. Slit Width'
}

var peakPlotConfig = {
    svg : d3.select("#peakPlot"),
    plotWidth : 300,
    plotHeight : 300,
    xAxisMin : 0,
    xAxisMax : app.detectorPixelNumber,
    yAxisMin : 0,
    yAxisMax : 100,
    yTicks : [0, 25, 50],
    xTicks : [1/4, 1/2, 3/4].map(f=>f*(app.detectorPixelNumber-1)),
    xAxisLabel : 'Pixel Number',
    yAxisLabel : 'Counts, a.u.',
    title : 'Spectrum at Detector',
}

//=========
 // gaussian function
 function g(x, mu = 0, sig = 1){
    return Math.exp( -1*(x-mu)**2 / sig**2)
 }

 // erf approximation
 
 function erf(x){

    var s = Math.sign(x);
    x = Math.abs(x);

     return s*(1 - 1/(1 + 0.278383*x + 0.230389*x**2 + 0.000972 * x**3 + 0.078108*x**4)**4);
 }

  function erfInt(x){
    return (x * erf(x)) + Math.exp( (-(x**2))) / Math.sqrt(Math.PI)
  }
//=========

var resChartPlot = new Plot(resChartConfig);
var peakPlot = new Plot(peakPlotConfig);

// create a dataset for a particular psf vs slit width
function generateResData(){
    var slitDatObjList = [];
    for (var i = 0; i < 500; i++){
        slitDatObjList.push({x : i, y : Math.sqrt(i**2 + app.psf**2)})
    }
    return slitDatObjList;
}

resChartPlot.dataSets = {
                        set1 : 
                        {
                            dataObjList : generateResData(),
                        },
                    };

resChartPlot.draw()





function generateSlitData(){
    var dataArray = [];
    dataArray.length = app.detectorPixelNumber;
    dataArray.fill(0);
    // code for generating peak plot
    for (var m = 0; m < 3; m++){
        for (var i =0; i < dataArray.length; i++){
            // calculate the integral for each pixel.  E.g. for pixel one, it'll be 0:pixelwidth, then for pixel 2 it'll be pixelwidth : 2*pixelwidth and so on
            // the integral will be erf(a)-erf(b).  estabilish a cutoff at which you won't want to calc erf?
            // so...
            var a0 = 1000; // scale value by height of peak

            var mu = (m-1)*0.1 + app.detectorPixelNumber * app.detectorPixelSize / 1000 / 2; // mu in mm
            
            var sig = Math.sqrt( (app.peakSigma / (2.355 * app.dispersion))**2 + (app.psf/(2.355*1000))**2 );
            
            
            // right now sigma is kinda mixed between nm and mm... I need to turn the sigma from the peak into mm
            var x0 = ( (i+0) * app.detectorPixelSize / 1000) - mu;
            var x1 = ( (i+1) * app.detectorPixelSize / 1000) - mu;
            
            // with slit! x1 is left point
            // integral w/ slit conv is I(x) = erfInt(x + app.slitWidth/2) - erfInt(x - app.slitWidth/2)

            var I0 = erfInt( (x0 + app.slitWidth / 2000) / sig) - erfInt( (x0 - app.slitWidth/2000) / sig)
            var I1 =  erfInt( (x1 + app.slitWidth / 2000) / sig) - erfInt( (x1 - app.slitWidth/2000) / sig)
            dataArray[i] += (a0 * (I1 - I0));
            // enforce 16 bit max value
            dataArray[i] = Math.min(dataArray[i], 2**16); 
            

            //this is how I'm doing it without slit, 11/2/2020
            //dataArray[i] += a0 * ( erf(x1/sig) - erf(x0/sig) );

        //dataArray[i] +=  this.peakList[k]['a'] * g(i * pixelSize / 1000, this.peakList[k]['mu'], this.peakList[k]['sigma'])
        }
    }
        var peakDataObjList = [];
        dataArray.forEach(function(d,i){
            peakDataObjList.push({x : i, y : d});
        })


    return peakDataObjList;
}

function updatePeakPlot(){
    peakPlot.dataSets = {
        set1 : 
        {
            dataObjList : generateSlitData(),
            fill : 'blue',
            fillopacity : 0.4,
        },
    };

    peakPlot.yAxisMax = 1.05 * d3.max(peakPlot.dataSets["set1"].dataObjList, d=>d.y);
    peakPlot.yAxisMin = -0.03 * peakPlot.yAxisMax;
    peakPlot.yTicks = [0, 1/2,1/4,3/4].map(d=>Math.round(peakPlot.yAxisMax * d))

}

updatePeakPlot();
peakPlot.draw();


// append a moving bug to the slit width vs resolution one
var orbIndicator = resChartPlot
                    .svg
                    .append("circle")
                    .attr("stroke", "red")
                    .attr("fill", "none")
                    .attr("stroke-width", "2px")
                    .attr("r", 5)
                    .attr("cx", resChartPlot.xScale(app.slitWidth))
                    .attr("cy", resChartPlot.yScale(Math.sqrt(app.slitWidth**2 + app.psf**2)))
                    .attr("clip-path", "url(#clipBox)")


// add callback for slider
d3.select('#slitRange')
    .on('input', function(){
        app.slitWidth = this.value;
        updatePeakPlot();
        peakPlot.draw();

        d3.select("#slitReadout").text(this.value);

        orbIndicator
            .attr("cx", resChartPlot.xScale(app.slitWidth))
            .attr("cy", resChartPlot.yScale(Math.sqrt(app.slitWidth**2 + app.psf**2)));
    })

// add callback for slider
d3.select('#pixelSizeRange')
    .on('input', function(){
        app.detectorPixelSize = this.value;
        app.detectorPixelNumber = Math.round((65*6.5) / this.value);
        app.detectorPixelNumber += (1 - app.detectorPixelNumber & 1); 
        
        peakPlot.xAxisMax = app.detectorPixelNumber;
        peakPlot.xTicks = [1/4, 1/2, 3/4].map(d=>Math.round(d*app.detectorPixelNumber));
        
        updatePeakPlot();
        peakPlot.draw();

        d3.select("#pixelReadout").text(this.value);
    })

    // add callback for slider
d3.select('#psfRange')
.on('input', function(){
    app.psf = this.value;

    updatePeakPlot();
    peakPlot.draw();

    resChartPlot.dataSets = {
        set1 : 
        {
            dataObjList : generateResData(),
        },
    };

    resChartPlot.yAxisMin = app.psf * 0.75;
    resChartPlot.yAxisMax = Math.sqrt(app.psf**2 + 100**2) * 1.05;
    resChartPlot.yTicks = [app.psf, resChartPlot.yAxisMax * 0.9 ].map(d=>Math.round(d));

    resChartPlot.draw();

    orbIndicator
    .attr("cx", resChartPlot.xScale(app.slitWidth))
    .attr("cy", resChartPlot.yScale(Math.sqrt(app.slitWidth**2 + app.psf**2)));

    d3.select("#psfReadout").text(this.value);
})
