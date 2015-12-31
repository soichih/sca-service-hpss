'use strict';

//node
var fs = require('fs');
var exec = require('child_process').exec;

//contrib
var async = require('async');
var hpss = require('hpss');
var request = require('request');

var taskdir = process.env.SCA_TASK_DIR;

if(process.env.HPSS_BEHIND_FIREWALL) {
    hpss.init({behind_firewall:true});
}

//call hsi get on each paths listed in the request
var config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
async.eachSeries(config.paths, function(path, next) {
    console.log("downloading "+path);
    var context = new hpss.context();
    context.get(path, taskdir, next, function(p) {
        console.dir(p);
    });
    /*
    exec('hsi get '+path, function(err, stdout, stderr) {
        if(err) console.dir(err);
        console.error(stderr);
        console.log(stdout);
        next();
    });
    */
}, function(err) {
    if(err) console.dir(err);
    console.log("all done");
});
