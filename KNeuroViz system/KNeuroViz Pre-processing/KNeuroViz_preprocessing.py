#!/usr/bin/env python

'''
Created on 2019. 12. 18.
@author: Nam-uk Kim
@email : namuk2002@gmail.com or namuk2002@kbri.re.kr
'''

import sys
import h5py
from cloudvolume.lib import xyzrange, Vec
from cloudvolume import Bbox, CloudVolume
import numpy as np
from tqdm import tqdm
import argparse
from cloudvolume.lib import min2, Vec

from taskqueue import LocalTaskQueue
import igneous.task_creation as tc



class C_variables: 
    def __init__(self):        
        self.Source_path = ""
        self.Pysical_resolution = []
        self.ImageType = ""
        self.Destination_path = "" #"-S /home/data/small_data/small_channel.h5 -R (512,512,64) -I channel -D /home/data/small_data/result_ch/"
        
        self.h5_shape_init_set = []
        self.shape_x = 0
        self.shape_y = 0 
        self.shape_z = 0

        self.shape_volume_size = []
        self.pysical_volume_size = []
                
        self.h5_dataset = [] # main  
        
        self.pysical_xyz_set = []
        self.pysical_x = '0.0'
        self.pysical_y = '0.0'
        self.pysical_z = '0.0'
        
    def Extract_dataset_name(self, Dataset):
        for DSN in Dataset:
            list_len = len(Dataset)
            if( list_len > 2 ):
                print("There are two or more dataset_name !!")
        Dataset_name = DSN
        return Dataset_name
    
    def Shape_coordinate_set(self, h5_shape_coordi_set):
        print(h5_shape_coordi_set)
        for h5_coordi in h5_shape_coordi_set:
        #    print(h5_coordi)
            self.shape_volume_size.append(h5_coordi)
        self.shape_x = self.shape_volume_size[0]
        self.shape_y = self.shape_volume_size[1]
        self.shape_z = self.shape_volume_size[2] 
        return self.shape_volume_size
    
    def xyz_coordinate_set(self, h5_pysical_xyz_coordi_set):
        self.pysical_volume_size = h5_pysical_xyz_coordi_set.strip('[]').split(',')
        
        for h5_xyz in self.pysical_volume_size:
            self.pysical_xyz_set.append(h5_xyz)
        self.pysical_x = self.pysical_xyz_set[0]
        self.pysical_y = self.pysical_xyz_set[1]
        self.pysical_z = self.pysical_xyz_set[2]


h5_class = C_variables()



parser = argparse.ArgumentParser(add_help=False, description='ex) preprocessing_automated_h5.py -S ../Source_dir/xx.h5 -R (x,y,z) -I channel -D ../Destination_dir')
parser.add_argument('-h', "--help", action='help', help='Source Path = "../xxx.h5"')
parser.add_argument('-S', required=True, help='Source Path = "../xxx.h5"')
parser.add_argument('-R', required=True, help='pysical resolution = (x,y,z)')
parser.add_argument('-I', required=True, help='Image type = channel or segmentation')
parser.add_argument('-D', required=True, help='Source Path = "../Destination_dir')
# preprocessing_automated_h5.py -P ../xx.h5 -Resolution -R (x,y,z) -I channel

args = parser.parse_args()

print(parser._get_args())

h5_class.Source_path = args.S
h5_class.Pysical_resolution = args.R
h5_class.ImageType = args.I
h5_class.Destination_path = args.D
#print(c_var.Source_path)
#print(c_var.Pysical_resolution)
#print(c_var.ImageType)
#print(c_var.Destination_path)

h5_file = h5py.File(h5_class.Source_path, 'r')
h5_class.h5_dataset = list(h5_file.keys())
#print(h5_var.dataset_name[0])

Dataset_name = h5_class.Extract_dataset_name(h5_class.h5_dataset) # Dataset_name : main 

h5_class.h5_shape_init_set = h5_file[Dataset_name].shape

print(h5_class.h5_shape_init_set)
h5_class.Shape_coordinate_set(h5_class.h5_shape_init_set) # h5_class.shape_x,y,z set-up


#print(h5_class.shape_x)


#shape = Vec(h5_class.shape_x)

shape = Vec(h5_class.shape_x // 2, h5_class.shape_x // 2, h5_class.shape_x // 2 //8)
bounds = Bbox((0,0,0), (h5_class.shape_z, h5_class.shape_y, h5_class.shape_x))

#    bounds = Bbox((0,0,0), (32, 64, 64))
#    bounds = Bbox((0,0,0), (128, 256, 256))

# channel is uint8,    segment is uint16

if (h5_class.ImageType == 'channel'):
    data_value = 'uint8'
    np_type = np.uint8
    h5_class.ImageType = 'image'
#    print(data_value)
elif(h5_class.ImageType == 'segmentation'):
    data_value = 'uint16'
    np_type = np.uint16
#    print(data_value)
else:
    print('Select channel or segmentation')
    sys.exit(1)
   
#print(h5_mem.Pysical_resolution)
h5_class.xyz_coordinate_set(h5_class.Pysical_resolution)

pysical_x = float(h5_class.pysical_x)
pysical_y = float(h5_class.pysical_y)
pysical_z = float(h5_class.pysical_z)

print('h5_class.shape_x')
print('h5_class.shape_y')
print('h5_class.shape_z')

print(h5_class.shape_x)
print(h5_class.shape_y)
print(h5_class.shape_z)

info = CloudVolume.create_new_info(num_channels = 1, 
                                   layer_type = h5_class.ImageType, 
                                   data_type = data_value, 
                                   encoding = 'raw', 
                                   resolution = [pysical_x, pysical_y, pysical_z], 
                                   voxel_offset = [0,0,0], 
                                   #volume_size = [1024, 10240, 14592],
                                   volume_size = [h5_class.shape_z, h5_class.shape_y, h5_class.shape_x],
                                   #chunk_size = [512, 512, 64], 
                                   )
vol = CloudVolume("file://" + h5_class.Destination_path, compress=False, info=info, non_aligned_writes=True)
vol.commit_info()

h5_data = h5_file[Dataset_name]

for x,y,z in tqdm(xyzrange(bounds.minpt, bounds.maxpt, shape)):
    pt = Vec(x,y,z)
    bounded_shape = min2(shape, bounds.maxpt -Vec(x,y,z))
    bbx = Bbox(pt, pt + bounded_shape)
    if bbx.subvoxel():
        continue
    
    vol[bbx] = (h5_data[bbx.to_slices()[::-1]].T).astype(np_type)


print("KNeuroViz pre-processing DONE!")

if (h5_class.ImageType == 'segmentation'):
    seg_mesh_path = "file://"+h5_class.Destination_path
    
    with LocalTaskQueue(parallel=8) as tq:
        tasks = tc.create_meshing_tasks(seg_mesh_path, mip=0, shape=Vec(h5_class.shape_x // 2, h5_class.shape_x // 2, h5_class.shape_x // 2 //8))
        tq.insert_all(tasks)
        tasks = tc.create_mesh_manifest_tasks(seg_mesh_path, magnitude=2)
        tq.insert_all(tasks)
    print("Mesh manifest processing DONE!")
    
else:
    print('channel is not running for 3D mesh manifest work')
    sys.exit(1)

'''
seg_mesh_path = "file://"+h5_class.Destination_path

with LocalTaskQueue(parallel=8) as tq:
    tasks = tc.create_meshing_tasks(seg_mesh_path, mip=0, shape=Vec(h5_class.shape_x // 2, h5_class.shape_x // 2, h5_class.shape_x // 2 //8))
    tq.insert_all(tasks)
    tasks = tc.create_mesh_manifest_tasks(seg_mesh_path, magnitude=2)
    tq.insert_all(tasks)
    
print("Mesh manifest processing DONE!")
'''


'test!! 20191219'
'''
if (h5_class.shape_x > 1000):
    shape = Vec(512,512,64)
    bounds = Bbox((0,0,0), (1024, 10240, 14592))
else:
    shape = Vec(64,128,128)
    bounds = Bbox((0,0,0),(128, 512, 512))
'''
