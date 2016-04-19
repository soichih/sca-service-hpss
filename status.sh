#!/bin/bash

#return code 0 = running
#return code 1 = finished successfully
#return code 2 = failed
#return code 3 = unknown

##now wait for running to go away
#progress_url={$SCA_PROGRESS_URL}/{$SCA_PROGRESS_KEY}

if [ -f pid ]; then
    pid=`cat pid`
    ps -p $pid
    if [ $? -eq 0 ]; then
        echo "running"
        exit 0
    else
        echo "$pid not found"
        #TODO - I need to store the exit code from hpss.js somehow and parse it here
        exit 1
    fi
else
    echo "pid not found.. not started yet?"
    exit 3
fi

