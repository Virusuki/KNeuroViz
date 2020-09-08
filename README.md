# KNeuroViz
The KNeuroViz is extended to a system with user-convenient and detailed analytical functions based on Neuroglancer.
and Web visualization and analysis for neuroimaging datasets. Powered by Neuroglancer.

## Features
In addition to the latest Neuroglancer features, KNeuroViz adds:
- Segmentation ID list window
- 3D Neuron mesh export .ctm or .obj file (KBrain-map App) function 
- Input data loading button
- powerful serverless computing and multi storage(local/cloud)
- Automated pre-processing for visualization of KNeuroViz
- Processing and accessing terabytes of KNeuroViz 3D images, mesh obj, and ctm data

## Installation
## Pre-processing
KNeuroVIz preprocessing setup manual

1. sudo apt-get install g++ python3-dev # recommend Python3
2. pip install numpy
3. Download igneous source. You will want to use the master branch from the [KNeuroViz fork](https://github.com/KBRI-NCRG/igneous) of igneous.
4. cd igneous and pip install -r requirements.txt
5. python setup.py develop
6. Download KNeuroViz_preprocessing.py Tool from the python tool folder

## Post-processing

A note about CORS: Failure to access a data source.
As a security measure, browsers will in many prevent a webpage from accessing the true error code associated with a failed HTTP request. It is therefore often necessary to check the developer tools to see the true cause of any HTTP request error. see [Cross-origin resource sharing (CORS)](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)

1.	Install nodejs and npm https://docs.npmjs.com/downloading-and-installing-node-js-and-npm

The KNeuroViz system is a built-in system running on a KBrain-map portal in private cloud.
So, there are two cases in order to visualize the ouput of KNeuroViz preprocessing. 
Select as follows: (2.A-neuroglancer and 2.B-KNeuroViz 3D viewer)

2.A views the results of KNeuroViz pre-processing with a neuroglancer.
- 2.A.1. Download igneous source. You will want to use the master branch from the [KNeuroViz fork](https://github.com/KBRI-NCRG/neuroglancer) of neuroglancer. 
- 2.A.2 nvm install stable
- 2.A.3 npm i
- 2.A.4 npm run dev-server
 
2.B is a neuroglancer based extended KNeuroViz post-processing 3D viewer. However, since the post-processing viewer is linked with our private KBrain-map portal, 
  we share it as a source file. we share it as a source file. (You can use it by modifying the input part of the loading data in the provided source file.)
  KNeuroViz viewer 3D features include:
- (1).	Segmentation ID list window
- (2).	3D Neuron mesh export .ctm or .obj file (KBrain-map App) function
- (3).	Input data loading button

## Viewing a Precomputed 3D chunk Volume data on FileDisk or NAS
If you have Pre-computed 3D chunk data onto local disk and It can be used as input data for KNeuroViz :

1. npm install -g http-server
2. http-server -p port_number -a IP_addr --cors
- Then you can use KNeuroViz's input data URL format.
3. precomputed://http://IP_addr/chunk_dataset_layer

## Deployment
We are operating the KBrain-map portal in a private cloud environment, and we will guide you through the source code and commands to set up a simple http-based ftp server to use KNeuroViz.

## Segmentation data
TO BE UPLOADED.


