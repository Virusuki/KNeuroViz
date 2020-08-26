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

Download the cloud-volume source. You will want to use the master branch from the [KBRI-NCRC](https://github.com/KBRI-NCRG/cloud-volume) fork of cloud-volume.

1. sudo apt-get install g++ python3-dev # recommend Python3
2. pip install numpy
3. git clone https://github.com/KBRI-NCRG/cloud-volume.git
4. cd cloud-volume

## Post-processing

A note about CORS: Failure to access a data source.
As a security measure, browsers will in many prevent a webpage from accessing the true error code associated with a failed HTTP request. It is therefore often necessary to check the developer tools to see the true cause of any HTTP request error. see [Cross-origin resource sharing (CORS)](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)

1. install nodejs

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


