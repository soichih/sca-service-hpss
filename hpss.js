'use strict';

//node
var fs = require('fs');
var exec = require('child_process').exec;
var path = require('path');

//contrib
var async = require('async');
var hpss = require('hpss');
var request = require('request');

//mine
var config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
var product = {
    type: "raw",
    files: []
};

var taskdir = process.env.SCA_TASK_DIR;
if(process.env.HPSS_BEHIND_FIREWALL) {
    hpss.init({behind_firewall:true});
}

function progress(key, p, cb) {
    //var api = "https://soichi7.ppa.iu.edu/api/progress/status/"+process.env.SCA_PROGRESS_KEY;
    request({
        method: 'POST',
        url: process.env.SCA_PROGRESS_URL+"/"+process.env.SCA_PROGRESS_KEY+"."+key,
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

//report to progress service about all of the files that needs to be downloaded
for(var i = 0;i < config.paths.length; i++) {
    progress("hpss.file_"+i, {status: "waiting", name: config.paths[i], progress: 0});
}

//call hsi get on each paths listed in the request
var id = 0;
async.eachSeries(config.paths, function(_path, next) {
    progress("hpss", {status: "running", name: "hpss", msg: "Downloading "+_path});
    var context = new hpss.context();
    var key = "hpss.file_"+(id++);
    context.get(_path, taskdir, function(err) {
        if(err) {
            console.dir(err);
            progress(key, {status: "failed", msg: "Failed to download a file"}, function() {
                next(err); //abort the task
            });
        } else {
            product.files.push(path.basename(_path));
            progress(key, {status: "finished", progress: 1, msg: "Downloaded"}, next);
        }
    }, function(p) {
        if(p.progress == 0) progress(key, {status: "running", progress: 0, msg: "Loading from tape"});
        else progress(key, {status: "running", progress: p.progress, msg: "Transferring data"});
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
    if(err) {
        progress("hpss", {status: "failed", msg: "Failed to download one of the files requested"}, function() {
            process.exit(1);
        });
    } else {
        progress("hpss", {status: "finished", msg: "Downloaded all files"}, function() {
            //write out output file and exit
            fs.writeFile("product.json", JSON.stringify([product], null, 4), function(err) {
                process.exit(0);
            });
        });
    }
});
