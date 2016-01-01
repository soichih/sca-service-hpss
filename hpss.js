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

function progress(key, p, cb) {
    var api = "https://soichi7.ppa.iu.edu/api/progress/status/"+process.env.SCA_PROGRESS_KEY;
    request({
        method: 'POST',
        url: api+"."+key,
        /*
        headers: {
            'Authorization': 'Bearer '+config.progress.jwt,
        },
        */
        json: p, 
    }, function(err, res, body){
        console.log("posted progress update:"+key);
        console.dir(p);
        if(cb) cb(err, body);
    });
}

//call hsi get on each paths listed in the request
var config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
var id = 0;
async.eachSeries(config.paths, function(path, next) {
    progress("hpss", {msg: "Downloading "+path});
    var context = new hpss.context();
    var key = "hpss.file_"+(id++);
    progress(key, {status: "running", name: path, progress: 0});
    context.get(path, taskdir, next, function(p) {
        if(p.progress == 1) progress(key, {status: "finished", progress: 1});
        else progress(key, {progress: p.progress});
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
