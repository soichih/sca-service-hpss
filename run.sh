#!/bin/bash

#debug..
env > myenv.txt

module load hpss
hsi ls > hsi.out
