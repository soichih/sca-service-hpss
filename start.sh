#!/bin/bash

## These three lines will cause stdout/err to go a logfile as well
#LOGFILE=run.log
#exec > >(tee -a ${LOGFILE})
#exec 2> >(tee -a ${LOGFILE} >&2)

module load hpss
module load nodejs

#debug..
#env | sort | grep SCA

#export PATH=$PATH:~/.sca/bin/node/bin

#make sure all npm deps are installed
#TODO - should be moved to install.sh?
echo "installing/updating npm modules"
(cd $SCA_SERVICE_DIR && npm update)

rm pid

echo "starting hpss.js"
nohup node $SCA_SERVICE_DIR/hpss.js & 
echo $! > pid

