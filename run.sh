#!/bin/bash

## These three lines will cause stdout/err to go a logfile as well
LOGFILE=run.log
exec > >(tee -a ${LOGFILE})
exec 2> >(tee -a ${LOGFILE} >&2)

#debug..
env | sort

#install node
nodeversion=node-v4.2.4-linux-x64
if [ ! -d $SCA_SERVICE_DIR/bin/$nodeversion ]; then
    echo "installing $nodeversion in $SCA_SERVICE_DIR"
    mkdir -p $SCA_SERVICE_DIR/bin
    (cd $SCA_SERVICE_DIR/bin && curl https://nodejs.org/dist/v4.2.4/$nodeversion.tar.gz | tar -xz)
fi
export PATH=$PATH:$SCA_SERVICE_DIR/bin/$nodeversion/bin

#make sure all npm deps are installed
echo "installing/updating npm modules"
(cd $SCA_SERVICE_DIR && npm update)

echo "running hpss.js"
module load hpss
node $SCA_SERVICE_DIR/hpss.js 


