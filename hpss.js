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
    progress(".file_"+i, {status: "waiting", name: config.get[i].hpsspath, progress: 0});
}
if(config.put) for(var i = 0;i < config.put.length; i++) {
    progress(".file_"+i, {status: "waiting", name: config.put[i].localpath, progress: 0});
}

var context = new hpss.context({
    username: config.auth.username,
    keytab: fs.readFileSync(process.env.HOME+"/.sca/keys/"+config.auth.keytab),
});

var products = {
    files: []
};
///////////////////////////////////////////////////////////////////////////////////////////////////
//
// get
//

//call hsi get on each paths listed in the request
var getid = 0;
if(config.get) async.eachSeries(config.get, function(get, next) {
    var _path = get.hpsspath;
    var destdir = get.localdir;

    products.type = "raw";
    var key = ".file_"+(getid++);

    mkdirp(destdir, function (err) {
        if (err) return next(err);
        context.get(_path, destdir, function(err) {
            if(err) {
                progress(key, {status: "failed", msg: erro.toString()}, function() {
                    next(); //skip this file and continue with other files
                });
            } else {
                var filename = destdir+"/"+path.basename(_path);
                var stats = fs.statSync(filename);
                var file = {
                    filename: filename,
                    type: mime.lookup(filename), //TODO should I use npm file-type instead?
                    size: stats["size"],
                };
                products.files.push(file);
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
    if(getid == products.files.length) {
        p = { status: "finished", msg: "Downloaded all requested files"};
    } else {
        //TODO - I really should report "incomplete" or such status.
        p = { status: "finished", msg: "Downloaded "+products.files.length+" out of "+getid+" files requested"};
    }
    progress("", p, function() {
        //write out output file and exit
        fs.writeFile("products.json", JSON.stringify([products], null, 4), function(err) {
            if(products.length > 0) process.exit(0);
            else process.exit(1); 
        });
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
//
// put
//

var putid = 0;
if(config.put) async.eachSeries(config.put, function(put, next) {
    //console.dir(put);
    //put.localpath 
    //put.hpsspath
    products.type = "hpss";

    //TODO - mkdirp on sda..
    //mkdirp(destdir, function (err) {
    //    if (err) return next(err);
        var key = ".file_"+(putid++);
        context.put(put.localpath, put.hpsspath, function(err) {
            if(err) {
                progress(key, {status: "failed", msg: "Failed to put a file:"+put.localpath}, function() {
                    next(); //skip this file and continue with other files
                });
            } else {
                progress(key, {status: "finished", progress: 1, msg: "Uploaded"}, next);
                var stats = fs.statSync(put.localpath);
                var file = {
                    path: put.hpsspath,
                    type: mime.lookup(put.localpath), //TODO should I use npm file-type instead?
                    size: stats["size"],
                };
                products.files.push(file);
            }
        }, function(p) {
            progress(key, {status: "running", progress: p.progress, msg: "Transferring data"});
        });
}, function(err) {
    var p = null;
    if(putid == products.files.length) {
        p = { status: "finished", msg: "Uploaded all requested files"};
    } else {
        //TODO - I really should report "incomplete" or such status.
        p = { status: "finished", msg: "Uploaded "+products.files.length+" out of "+putid+" files requested"};
    }
    progress("", p, function() {
        //put service doesn't generate any products.. (or could I create a *psudo* products?)
        fs.writeFile("products.json", JSON.stringify([products], null, 4), function(err) {
            if(products.length > 0) process.exit(0);
            else process.exit(1); 
        });
    });
});
