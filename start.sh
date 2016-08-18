#!/bin/bash

## These three lines will cause stdout/err to go a logfile as well
#LOGFILE=run.log
#exec > >(tee -a ${LOGFILE})
#exec 2> >(tee -a ${LOGFILE} >&2)

module load hpss
module load nodejs

#TODO - disable update until friday demo
#I will need to update this so that
#1) only 1 instance will actually do update (others should wait?)
#2) only update if package.json is updated
#echo "installing/updating npm modules"
#(cd $SCA_SERVICE_DIR && npm update)

#3) I should probably use hpss (especially for /get)
#4) report to progress service

#without this, I run into 'ascii' codec can't decode byte 0xc3 in position 1: ordinal not in range(128)
export LANG=en_US.UTF-8

rm -f finished
echo "starting hpss.js"
(
nohup time node $SCA_SERVICE_DIR/hpss.js > stdout.log 2> stderr.log 
echo $? > finished 
) &

