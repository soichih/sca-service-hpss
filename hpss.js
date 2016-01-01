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

var config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

//report to progress service about all of the files that needs to be downloaded
for(var i = 0;i < config.paths.length; i++) {
    progress("hpss.file_"+i, {status: "waiting", name: config.paths[i], progress: 0});
}

//call hsi get on each paths listed in the request
var id = 0;
async.eachSeries(config.paths, function(path, next) {
    progress("hpss", {status: "running", name: "hpss", msg: "Downloading "+path});
    var context = new hpss.context();
    var key = "hpss.file_"+(id++);
    context.get(path, taskdir, next, function(p) {
        if(p.progress == 1) progress(key, {status: "finished", progress: 1});
        else progress(key, {status: "running", progress: p.progress});
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
    progress("hpss", {status: "finished", msg: "Downloaded all files"});
});
