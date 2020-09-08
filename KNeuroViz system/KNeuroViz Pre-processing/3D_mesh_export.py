#!/usr/bin/env python
import subprocess
import argparse

from taskqueue import LocalTaskQueue
from cloudvolume import Bbox, CloudVolume

#import igneous.task_creation as tc
#from cloudvolume.lib import Vec 
#from taskqueue.registered_task import PrintTask
#from cloudvolume import Bbox, CloudVolume
#import igneous.tasks as Tasks
#from asyncio.tasks import Task

'''
Created on Dec 19, 2019

@author: KIM NAM UK, 010 7490 9006
@email : namuk2002@gmail.com or namuk2002@kbri.re.kr

'''

parser = argparse.ArgumentParser(add_help=False, description='Convert Tool : .obj file to .ctm file')
parser.add_argument('-h', "--help", action='help', help='3D_mesh_export.py -F ../folder_dir -S ../Source_dir/xx.obj -D ../Destination_dir/')
parser.add_argument('-F', required=True, help='Created chunk folder and info file Path = "../folder_dir"')
parser.add_argument('-N', required=True, help='Segmentation ID number')
parser.add_argument('-D', required=True, help='Destination Path = "../Destination_dir/')
# preprocessing_automated_h5.py -P ../xx.h5 -Resolution -R (x,y,z) -I channel

args = parser.parse_args()

print(args.N) # /home/ubuntu/pacakge/eclipse/3D_Mesh_export/CTM_work/144.obj
print(args.D) # /home/ubuntu/pacakge/eclipse/3D_Mesh_export/

print(args.N)
print(args.D + args.N +'.obj')
print('=====================')

output_obj = args.D + args.N +'.obj'
vol = CloudVolume('file://'+args.F)
#vol.mesh.save(args.N, output_obj)
vol.mesh.save(args.N, args.D, 'obj')
output_ctm = args.D + args.N + '.ctm'

#p = subprocess.Popen(
#    ["ctmconv", output_obj, output_ctm]
#    )


p = subprocess.Popen(
    ["/home/ubuntu/package/OpenCTM-1.0.3/tools/ctmconv", output_obj, output_ctm]
    )

'''
parser = argparse.ArgumentParser(add_help=False, description='Convert Tool : .obj file to .ctm file')
parser.add_argument('-h', "--help", action='help', help='3D_mesh_export.py -S ../Source_dir/xx.obj -D ../Destination_dir/')
parser.add_argument('-S', required=True, help='Source Path = "../xx.obj"')
parser.add_argument('-D', required=True, help='Destination Path = "../Destination_dir/')
# preprocessing_automated_h5.py -P ../xx.h5 -Resolution -R (x,y,z) -I channel

args = parser.parse_args()

print(args.S) # /home/ubuntu/pacakge/eclipse/3D_Mesh_export/CTM_work/144.obj
print(args.D) # /home/ubuntu/pacakge/eclipse/3D_Mesh_export/
'''


'''
h5_mem.Source_path = args.S
h5_mem.Pysical_resolution = args.R
h5_mem.ImageType = args.I
h5_mem.Destination_path = args.D
'''

