//This is a Javascript code for running in Google Earth Engine

//Authors: Mathilde Waymel for Kartverket - Autumn 2023
//Reviewed and completed version of Jiwei Li et al. (2021) code: https://github.com/CoralMapping/GEE_Sentinel2_Bathymetry_Paper/tree/main
//from the article Automated Global Shallow Water Bathymetry Mapping Using Google Earth Engine (https://doi.org/10.3390/rs13081469)

//___________________________________________________________________________________________________
//___________________________________________________________________________________________________

//              This code generates depth map in shallow waters using Sentinel2 data
//                Map goes up to 50 meters from the coast in the region of interest


//_________________________________________PARAMETERS TO SET_________________________________________

//Region of interest coordinates (format: list of x, y - Example: [x1, y1, x2, y2, x3, y3])
//Example Fjoloy area: var ROI_coords = [302400, 6558000,307200, 6558000,307200, 6553800,302400, 6553800]
var ROI_coords = [302400, 6558000,
                  307200, 6558000,
                  307200, 6553800,
                  302400, 6553800];

//Name of the files and folder for Google Drive exporting  
var name_export = 'Bathymetry_Fjoloy';
var export_folder = 'GEE_export';
var scale_export = 10; //In meters, 10 = native RGB Sentinel 2 resolution, 30 = native RGB Landsat 8

//Smoothing kernel radius (default value 7)
var radius_kernel = 7;

//_______Ground truth available?______ 
//If so, import it in Assets and replace the path below
var name_ground_truth = 'users/majuwa/vector_Fjoloy_truth_0_20';
//If not, comment lines 214 to 275, using /* at the beginning and */ at the end, 
//and from line 275, comment all lines using ground_truth and difference

var name_Mean_sea_correction = 'users/majuwa/MeanSeaLevel1996-2014_above_NN2000_v2023b';

//Comment or decomment on lines 275-295 to choose the layers displayed


//___________________________________________________________________________________________________
//____________________________________COLLECTING AND PROCESSING DATA_________________________________


var roi = ee.Algorithms.GeometryConstructors.Polygon(
      ROI_coords,
      'EPSG:25832', false
  ); 
  
//set the filter input data to Sentinel-2 depth data
var sentinel = ee.ImageCollection('COPERNICUS/S2_SR').filter(ee.Filter.bounds(roi));

//Set up the date range and filter, this example uses two years window to build the clean water mosaic
sentinel = sentinel.filter(ee.Filter.date(ee.Date.fromYMD(2021,1,1),ee.Date.fromYMD(2021,12,31)));


//_______________MASKING FUNCTION_________________
//building the clean mosiac image based on different filters
var cloudBitMask = ee.Number(2).pow(10).int();
var cirrusBitMask = ee.Number(2).pow(11).int();

//this function is used to build clean water mosaic in the Google Earth Engine
//the threshold value could be revised, the current value is suggested for a common clean coral reefs waters
function mask(img){
  var qa = img.select('QA60');
  var ma = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));
  ma = ma.and(img.select(['SCL']).neq(3));
  ma = ma.and(img.select(['SCL']).neq(4));
  ma = ma.and(img.select(['SCL']).neq(5));
  ma = ma.and(img.select(['SCL']).neq(8));
  ma = ma.and(img.select(['SCL']).neq(9));
  ma = ma.and(img.select(['SCL']).neq(10));
  //ma = ma.and(img.select(['B9']).lt(300));
  ma = ma.and(img.select(['B9']).gt(50));
  ma = ma.and(img.select(['B3']).gt(100));//.focal_min({kernel: ee.Kernel.circle({radius: 5}), iterations: 1}));
  ma = ma.focal_min({kernel: ee.Kernel.circle({radius: 1}), iterations: 1});
  img = img.mask(ma);
 
  //adjust for mask bad data
    img = img.updateMask(img.select([4]).lt(1000));
    img = img.updateMask(img.select([7]).lt(300));
  
  var ndwi_revise = (img.select([2]).subtract(img.select([7]))).divide(img.select([2]).add(img.select([7])));
  img = img.updateMask(ndwi_revise.gt(0));

  return img;
}

//_______________CALCULATING DEPTH________________

//run the mask function
sentinel = sentinel.map(mask);

//get the median value of it
var median = sentinel.reduce(ee.Reducer.median());

//calculate the big Rrs, rrs,and rrs*1000
var bigrrs = median.divide(ee.Number(31415.926));
var rrsvec = bigrrs.divide((bigrrs.multiply(ee.Number(1.7))).add(ee.Number(0.52)));
var rrsvec1k = rrsvec.multiply(ee.Number(1000));

//calculate rrs vec
var lnrrsvec = rrsvec1k.log();

/*
//Tests to set the Chla value in the area: 
var w = bigrrs.select([2]).subtract(bigrrs.select([3]).multiply(0.46)).subtract(bigrrs.select([1]).multiply(0.54));
var Chla_map = ee.Image(10).pow(w.multiply(191.659).subtract(0.4909));
var m0_map =  Chla_map.multiply(0.957).exp().multiply(52.083);
var m1_map =  Chla_map.multiply(0.957).exp().multiply(50.156);
*/
//set the chla value for depth processing
//chla median value for our area: 0.3012
var chla = 0.3;

var m0 = ee.Number(52.083 * Math.exp(0.957*chla));    //m0 = 69.40359032247949 while mean of our tests except 0: 69,306
var m1 = ee.Number(50.156 * Math.exp(0.957*chla));    //m1 = 66.83575209212759 while mean of our tests except 0: 66,758
print('Depth calculation parameters value', 'm0: ', m0, 'm1: ', m1);

var depth = ((lnrrsvec.select([1]).divide(lnrrsvec.select([2]))).multiply(m0)).subtract(m1);


//Correction of Chart Datum
var MeanSeaLevel2NN2000 = ee.Image(name_Mean_sea_correction).select(['b1']);
depth = depth.subtract(MeanSeaLevel2NN2000);


//Setting values between 0 and 20m deep (setting values below 0 to 0, and values above 20 to 20):
var depthA = depth.where(depth.lt(0), ee.Number(0));
var depth_output = depthA.where(depthA.gt(20), ee.Number(20));


//_____________2ND MASKING OF LAND________________

function mask2(img){
  var qa = img.select('QA60');
  var ma = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));
  img = img.mask(ma);
  return img;
}
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR').filter(ee.Filter.bounds(roi));
sentinel2 = sentinel2.filter(ee.Filter.date(ee.Date.fromYMD(2021,1,1),ee.Date.fromYMD(2021,12,31)));
sentinel2 = sentinel2.map(mask2);
var median2 = sentinel2.reduce(ee.Reducer.median());
var ndwi_land_mask = (median2.select([2]).subtract(median2.select([7]))).divide(median2.select([2]).add(median2.select([7])));

depth_output = depth_output.mask(ndwi_land_mask.gt(0));


//_______SETTING THE COASTAL AREA (50m to the coast and holes filled)________

//Building of a land polygon to be able to use buffer
var land = ee.Image(1).mask(ndwi_land_mask.lte(0));
var land_vector = land.addBands(land).reduceToVectors({
  geometry: roi,
  crs: roi.projection(),
  scale: scale_export,
  geometryType: 'polygon',
  eightConnected: true,
  labelProperty: 'mask',
  reducer: ee.Reducer.min()
});
land_vector = land_vector.select(['1']);
var geom_land = ee.FeatureCollection(land_vector).geometry();
geom_land = geom_land.geometries();

//Removing land areas corresponding to 1 px = 100m2 (artefacts)
geom_land = ee.FeatureCollection(ee.List(geom_land).map(function(geom){
    var geom_area = ee.Geometry(geom).area(1);
    return ee.Feature(ee.Geometry(geom)).set('area', geom_area);
  }));
//Filter above 110m2 to be robust to vectorisation imperfections
var geom_land = geom_land.filter(ee.Filter.gt('area', 110));     

//Applying 2 buffers (200m and -150m) to fill holes and sea corridors up to 400m wide
var buffer_land = geom_land.geometry().buffer(200).buffer(-150);
var coastal_area = buffer_land.difference({'right': geom_land, 'maxError': 1});

var depth_output = depth_output.clip(coastal_area);

//_______________________________________SMOOTHING (CONVOLVE)________________________________________

//var Kernel = ee.Kernel.circle({radius: radius_kernel});   //circle-shaped boolean kernel
var Kernel =ee.Kernel.gaussian({radius: radius_kernel, sigma:3});

var depth_smooth = depth_output.convolve(Kernel);
depth_smooth = depth_smooth.clip(coastal_area);


//__________________________________________PREPARING OUTPUT___________________________________________

//Raster
var raster_name_export = name_export + '_smooth_raster';

//Rounded raster
var raster_rd_name_export = name_export + '_smooth_rd_raster';
var depth_smooth_rd = depth_smooth.round().int();

//Vector
var vector_name_export = name_export + '_smooth_rd_vector';
var depth_smooth_rd_vector = depth_smooth_rd.addBands(depth_smooth_rd).reduceToVectors({
  geometry: coastal_area,
  crs: roi.projection(),
  scale: scale_export,
  geometryType: 'polygon',
  eightConnected: true,
  labelProperty: 'B2_median',
  reducer: ee.Reducer.min()
});

//___________________________________________________________________________________________________
//_____________________________________COMPARISON GROUD TRUTH________________________________________

var ground_truth = ee.FeatureCollection(name_ground_truth);

var ground_truth_raster = ground_truth.reduceToImage({
    properties: ['Depth'],
    reducer: ee.Reducer.first()
});
var difference = ground_truth_raster.add(depth_smooth);


//Exporting
var difference_name_export = name_export + '_comparison_truth';

var difference_rd = difference.round().int().clip(coastal_area);

var difference_rd_vector = difference_rd.addBands(difference_rd).reduceToVectors({
  geometry: coastal_area,
  crs: roi.projection(),
  scale: scale_export,
  geometryType: 'polygon',
  eightConnected: true,
  labelProperty: 'B2_median',
  reducer: ee.Reducer.min()
});

//_________CHARTS_________
//Histogram of the difference between Ground truth and computed map
var chart = ui.Chart.image.histogram({image: difference, region: roi, scale: scale_export})
      .setOptions({
          title: 'Fjøløy area - Distribution of the difference between ground truth and S2 map (smoothing radius in pixel: ' + radius_kernel + ')',
          series: { 0: {visibleInLegend: false}},
          hAxis: {title: 'Difference (meters)', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            //viewWindow: {min: 0, max: 0.7},
            title: 'Number of pixels',
            titleTextStyle: {italic: false, bold: true}
          },
          //lineWidth: 5,
          //colors: ['a50f15', 'fcae91'],
          //trendlines: { 0: {visibleInLegend: true}}
        });
print(chart);

//Histogram of the difference between Ground truth and computed map ROUNDED
var chart2 = ui.Chart.image.histogram({image: difference_rd, region: roi, scale: scale_export})
      .setOptions({
          title: 'Fjøløy area - Distribution of the difference between ground truth and S2 map rounded (smoothing radius in pixel: ' + radius_kernel + ')',
          series: { 0: {visibleInLegend: false}},
          hAxis: {title: 'Difference (meters)', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            //viewWindow: {min: 0, max: 0.7},
            title: 'Number of pixels',
            titleTextStyle: {italic: false, bold: true}
          },
          //lineWidth: 5,
          //colors: ['a50f15', 'fcae91'],
          //trendlines: { 0: {visibleInLegend: true}}
        });
print(chart2);

//___________________________________________________________________________________________________
//__________________________________________LAYERS DISPLAY___________________________________________
Map.centerObject(roi, 14);

//__Depth map without smoothing:
Map.addLayer(depth_output, {min: 0, max: 15, palette: ['00FFFF', '0000FF']}, 'Depth map without smoothing');

//__Depth map with smoothing:
Map.addLayer(depth_smooth, {min: 0, max: 15, palette: ['00FFFF', '0000FF']}, 'Depth map smooth');

//__Depth map smooth rounded:
Map.addLayer(depth_smooth_rd, {min: 0, max: 15, palette: ['00FFFF', '0000FF']}, 'Depth map smooth rounded');

//__Ground truth raster:
var imageVisParam = {"opacity":1,"bands":["first"],"min":-20,"max":0,"palette":["000093","00ffff"]};
Map.addLayer(ground_truth_raster, imageVisParam, 'Ground truth');

//__Difference with ground truth rounded
var imageVisParam2 = {"opacity":1,"bands":["first"],"min":-20,"max":20,"palette":["0000ff","ffffff","ff0000"]};
Map.addLayer(difference_rd, imageVisParam2, 'Difference rounded');

//___________________________________________________________________________________________________
//______________________________________________EXPORTS______________________________________________

  
var projection = roi.projection().getInfo(); 

//Depth raster basis
Export.image.toDrive({
  image: depth_output,
  description: name_export,
  folder: export_folder,
  scale: scale_export,
  crs: projection.crs,
  region: coastal_area
});

//Smooth raster
Export.image.toDrive({
  image: depth_smooth,
  description: raster_name_export,
  folder: export_folder,
  scale: scale_export,
  crs: projection.crs,
  region: coastal_area
});

//Rounded raster
Export.image.toDrive({
  image: depth_smooth_rd,
  description: raster_rd_name_export,
  folder: export_folder,
  scale: scale_export,
  crs: projection.crs,
  region: coastal_area
});

//Rounded vector
Export.table.toDrive({
  collection: depth_smooth_rd_vector,
  description: vector_name_export,
  folder: export_folder,
  fileFormat: 'SHP'
});

//Difference raster
Export.image.toDrive({
  image: difference,
  description: difference_name_export,
  folder: export_folder,
  scale: scale_export,
  crs: projection.crs,
  region: coastal_area
});

//Difference raster
Export.image.toDrive({
  image: difference_rd,
  description: difference_name_export + '_rd',
  folder: export_folder,
  scale: scale_export,
  crs: projection.crs,
  region: coastal_area
});

//Difference rounded vector
Export.table.toDrive({
  collection: depth_smooth_rd_vector,
  description: difference_name_export + '_rd_vector',
  folder: export_folder,
  fileFormat: 'SHP'
});
