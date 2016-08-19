#!/bin/bash

## These three lines will cause stdout/err to go a logfile as well
#LOGFILE=run.log
#exec > >(tee -a ${LOGFILE})
#exec 2> >(tee -a ${LOGFILE} >&2)

module load hpss
module load nodejs

#only allow 1 instance to do the update
if [ ! -f $SCA_SERVICE_DIR/updating ]; then
    echo "updating npm"
    touch $SCA_SERVICE_DIR/updating
    (cd $SCA_SERVICE_DIR && npm update)
    rm $SCA_SERVICE_DIR/updating
else
    while [ -f $SCA_SERVICE_DIR/updating ]; do
        echo "waiting for npm update"
        sleep 5
    done
fi

#3) I should probably use hpss (especially for /get)
#4) report to progress service

rm -f finished
echo "starting hpss.js"
(
nohup time node $SCA_SERVICE_DIR/hpss.js > stdout.log 2> stderr.log 
echo $? > finished 
) &

