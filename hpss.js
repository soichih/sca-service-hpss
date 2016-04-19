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
var mkdirp = require('mkdirp');

//mine
var config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
var product = {
    type: "raw",
    files: []
};

//var taskdir = process.env.SCA_TASK_DIR;
if(process.env.HPSS_BEHIND_FIREWALL) {
    hpss.init({behind_firewall:true});
}

function progress(subkey, p, cb) {
    //var api = "https://soichi7.ppa.iu.edu/api/progress/status/"+process.env.SCA_PROGRESS_KEY;
    request({
        method: 'POST',
        //url: process.env.SCA_PROGRESS_URL+"/"+process.env.SCA_PROGRESS_KEY+subkey,
        url: process.env.SCA_PROGRESS_URL+subkey,
        /*
        headers: {
            'Authorization': 'Bearer '+config.progress.jwt,
        },
        */
        json: p, 
    }, function(err, res, body){
        //console.log("posted progress update:"+subkey);
        console.dir([subkey, p]);
        if(cb) cb(err, body);
    });
}

//report to progress service about all of the files that needs to be downloaded
if(config.get) for(var i = 0;i < config.get.length; i++) {
    progress(".file_"+i, {status: "waiting", name: config.get[i].path, progress: 0});
}

var context = new hpss.context({
    username: config.auth.username,
    keytab: fs.readFileSync(process.env.HOME+"/.sca/keys/"+config.auth.keytab),
});

//call hsi get on each paths listed in the request
var getid = 0;
if(config.get) async.eachSeries(config.get, function(get, next) {
    var _path = get.path;
    var destdir = get.dir;

    mkdirp(destdir, function (err) {
        if (err) return next(err);
        var key = ".file_"+(getid++);
        var file = {filename: destdir+"/"+path.basename(_path)};
        context.get(_path, destdir, function(err) {
            if(err) {
                progress(key, {status: "failed", msg: "Failed to download a file"}, function() {
                    next(); //skip this file and continue with other files
                });
            } else {
                file.type = mime.lookup(file.filename); //TODO should I use npm file-type instead?
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
    }); 

}, function(err) {
    var p = null;
    if(getid == product.files.length) {
        p = { status: "finished", msg: "Downloaded all requested files"};
    } else {
        //TODO - I really should report "incomplete" or such status.
        p = { status: "finished", msg: "Downloaded "+product.files.length+" out of "+getid+" files requested"};
    }
    progress("", p, function() {
        //write out output file and exit
        fs.writeFile("products.json", JSON.stringify([product], null, 4), function(err) {
            process.exit(0);
        });
    });
});
