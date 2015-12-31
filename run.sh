#!/bin/bash

#debug..
env > myenv.txt

#install node
nodeversion=node-v4.2.4-linux-x64
if [ ! -d $SCA_SERVICE_DIR/bin/$nodeversion ]; then
    mkdir -p $SCA_SERVICE_DIR/bin
    cd $SCA_SERVICE_DIR/bin && curl https://nodejs.org/dist/v4.2.4/$nodeversion.tar.gz | tar -xz
fi
export PATH=$PATH:$SCA_SERVICE_DIR/bin/$nodeversion/bin

module load hpss

mkdir $SCA_TASK_DIR
cd $SCA_TASK_DIR 
hsi get "/hpss/h/a/hayashis/isos/CentOS-7-x86_64-Everything-1503-01.iso"
#hsi ls > hsi.out 2> hsi.err

