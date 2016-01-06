'use strict';

//node
var fs = require('fs');
var exec = require('child_process').exec;
var path = require('path');

//contrib
var async = require('async');
var hpss = require('hpss');
var request = require('request');
var mime = require('mime'); //mime just look at the filename.. maybe I should use file-type instead?

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
    var file = {filename: path.basename(_path)};
    context.get(_path, taskdir, function(err) {
        if(err) {
            progress(key, {status: "failed", msg: "Failed to download a file"}, function() {
                next(); //skip this file and continue with other files
            });
        } else {
            file.type = mime.lookup(_path); //TODO should I use npm file-type instead?
            var stats = fs.statSync(file.filename);
            file.size = stats["size"];
            product.files.push(file);
            progress(key, {status: "finished", progress: 1, msg: "Downloaded"}, next);
        }
    }, function(p) {
        //if(p.total_size) file.size = p.total_size; //sometimes I don't get this info
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
    var p = null;
    if(config.paths.legth == product.files.length) {
        p = { status: "finished", msg: "Downloaded all requested files"};
    } else {
        //TODO - I really should report "incomplete" or such status.
        p = { status: "finished", msg: "Downloaded "+product.files.length+" out of "+config.paths.length+" files requested"};
    }
    progress("hpss", p, function() {
        //write out output file and exit
        fs.writeFile("products.json", JSON.stringify([product], null, 4), function(err) {
            process.exit(0);
        });
    });
});
