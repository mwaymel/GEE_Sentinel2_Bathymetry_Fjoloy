# -*- coding: utf-8 -*-
"""
Author: Mathilde Waymel - Kartverket

This script takes as input a CSV file of an histogram and gives as output 
statistical parameters (RMSE and MBE), gaussian fitting parameters and plot
the gaussian.

"""

import numpy as np
import matplotlib.pyplot as plt
import csv
from scipy import optimize


#________________________________TO ADAPT______________________________________

path_to_csv = 'C:/Users/waymat/Documents/bathymetry/CSV/diff_r7gaussianS3_d50_rd_seaCorr.csv'
title_of_graph = 'Difference between ground truth and satellite derived bathymetry until 50m to the coast'

#______________________________________________________________________________


x, y, = [], []
with open(path_to_csv) as csvfile:
     reader = csv.DictReader(csvfile)
     for row in reader:
         x += [int(row['Band Value'])]
         
         #Handeling the strange number format ("1,234.567"=1234567 and "1,234.5"=1234500):
         y_value = row['first Count'][-4:].find('.')
         y_str = row['first Count']
         if y_value == 1:
             y_str = str(row['first Count']+str('0'))
         elif y_value == 2:
             y_str = str(row['first Count']+str('00'))
         elif y_value == 3:
             y_str = str(row['first Count']+str('000'))             
         y += [int(y_str.replace('.', '').replace(',', ''))]
             
x, y = np.array(x), np.array(y)

def rmse(difference, count):
    squaresum = np.sum((difference ** 2)*count)
    return np.sqrt(squaresum/np.sum(count))
print('diff_r7gaussianS3_d50_rd_seaCorr')
print('rmse: ', round(rmse(x, y)*1000)/1000, 'meters')
print('MBE: ', round(np.sum(x*y)/np.sum(y)*1000)/1000, 'meters')

plt.plot(x, y, '+')
plt.title(title_of_graph)

def gaussian(x, amplitude, mean, stddev):
    return amplitude * np.exp(-((x - mean) / 4 / stddev)**2)
popt, _ = optimize.curve_fit(gaussian, x, y)
plt.plot(x, gaussian(x, *popt))
print('Gaussian parameters: amplitude, mean, stddev', popt)
