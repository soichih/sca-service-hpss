#!/bin/bash

## These three lines will cause stdout/err to go a logfile as well
LOGFILE=run.log
exec > >(tee -a ${LOGFILE})
exec 2> >(tee -a ${LOGFILE} >&2)

#debug..
#env > myenv.txt

#install node
nodeversion=node-v4.2.4-linux-x64
if [ ! -d $SCA_SERVICE_DIR/bin/$nodeversion ]; then
    echo "installing $nodeversion in $SCA_SERVICE_DIR"
    mkdir -p $SCA_SERVICE_DIR/bin
    (cd $SCA_SERVICE_DIR/bin && curl https://nodejs.org/dist/v4.2.4/$nodeversion.tar.gz | tar -xz)
fi
export PATH=$PATH:$SCA_SERVICE_DIR/bin/$nodeversion/bin

#make sure all npm deps are installed
(cd $SCA_SERVICE_DIR && npm update)

module load hpss

#hsi get "/hpss/h/a/hayashis/isos/CentOS-7-x86_64-Everything-1503-01.iso"
#hsi ls > hsi.out 2> hsi.err
node $SCA_SERVICE_DIR/hpss.js 

