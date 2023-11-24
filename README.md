# Bathymetric mapping in Norway based on Sentinel 2 images, using Google Earth Engine (GEE) - POC for Kartverket on Fjøløy area

*Report_Satellite_derived_bathymetry.pdf* is the report of this project.

*Bathymetry_Fjoloy.js* is the GEE code file.

In the *Input data* folder can be found all data necessary to run the code *Bathymetry_Fjoloy.js*.

The *Output data* folder contains a QGIS project with all output layers, the CSV file of an histogram of the comparison with the ground truth, and the python code to calculate statistical parameters and fitting gaussian.

## Steps to run the code

### Make your GEE code file

To use GEE, a Google account is needed. Go to this webside [https://code.earthengine.google.com/](https://code.earthengine.google.com/) and connect to your Google account.

In the left pannel, choose **Scripts** and *NEW* -> *Repository*. Name your repository (ex: *Bathymetry*).

Then *NEW* -> *File*, check the right repository is selected and name your file (ex: *Bathymetry_Fjoloy*).

Now, you simply have to Copy and Paste the content of the code file *Bathymetry_Fjoloy.js* in your new GEE file. If needed, adapt the area of interest and the parameters in the first section **PARAMETERS TO SET**.

### Upload the input files needed

In the *Input data* folder are the ground truth data and the file of sea level correction in Norway. Both are needed to run the code.

You need to upload them in your GEE account. First, dowmload them from GitHub. 
Then click on **Assets** in the left pannel. Choose *NEW* -> *GeoTIFF* for the Mean sea level correction. Select it from your computer, you can keep the default naming, and then UPLOAD. Using *NEW* -> *Shape files*, you can upload the ground truth the same way, just pay attention to select all the files with name *vector_Fjoloy_truth_0_20* EXCEPT the QMD extension.

By refreshing the **Assets** pannel, the new assets should appear. For both, click on it and copy **Image ID** (left side), then paste it in the first section **PARAMETERS TO SET** for the corresponding name: *name_ground_truth* or *name_Mean_sea_correction*.

Don't forget to **Save** your changes, and click on **Run** to execute the code.

## Output

### Data displayed on GEE

When running the code (which is relatively quick), the layers should slowly appeard on the down map pannel. You can choose which maps you want to display by pointing on *Layers* and checking or unchecking. You can also set some transparency and change the color settings there.

On the right pannel **Console**, a print of *Depth calculation parameters value* will appear, as well as the *m0* and *m1* values used (it is not changing, only depending on the Chla value set). Just under, 2 histograms should appear. They show the distribution of the error (difference between the Ground truth and the smoothed map), the first uses the raw smoothed map, while the second uses the rounded smoothed map.

### Downloading the data

To download the CSV file of an histogram, click on the small arrow on the top-right corner of the histogram and choose *Download CSV* in the top-right corner of the new tab. You can also download it in PNG or SVG. The CSV of the histogram of the error of rounded map is the one used in the python file *Output data/gaussian_fitting.py* to compute the statistical parameters and the fitting gaussian.

On the top of the right pannel, you can also choose **Tasks**, which normally becomes orange. Then, in **UNSUBMITTED TASKS**, you have all the output data of the algorithm to download in raster or vector version. 
The data can only be exported to your Google Drive [https://drive.google.com/drive/u/0/my-drive](https://drive.google.com/drive/u/0/my-drive). The export might take some time. In the end, it will appear on your Drive, in the folder specified in the section **PARAMETERS TO SET** (and create it if it does not exist yet). Then, you just have to download the data on your computer from your Drive.
