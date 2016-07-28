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

#force reinstallation
rm -rf node_modules

#make sure all npm deps are installed
#TODO - should be moved to install.sh?
echo "installing/updating npm modules"
(cd $SCA_SERVICE_DIR && npm update)

rm -f finished
echo "starting hpss.js"
(
nohup node $SCA_SERVICE_DIR/hpss.js > stdout.log 2> stderr.log 
echo $? > finished 
) &

