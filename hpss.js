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
console.dir(config);

///////////////////////////////////////////////////////////////////////////////////////////////////
// TODO
// currently, this service can handle only a single request per submission. You can't mis put/get/delete
// requests inside a config.json. I should overhaul the config.json structure 

//var taskdir = process.env.SCA_TASK_DIR;
if(process.env.HPSS_BEHIND_FIREWALL) {
    hpss.init({behind_firewall:true});
}

function progress(subkey, p, cb) {
    if(!process.env.SCA_PROGRESS_URL) {
        //console.log(subkey);
        //console.dir(p);
        if(cb) cb();
        return; 
    }
    
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

//report to progress service about all of the files that needs to be xfered
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
    if(!get.localdir) return next("localdir not set for get request");
    if(!get.hpsspath) return next("hpsspath not set for get request");

    var _path = get.hpsspath;
    var destdir = get.localdir;

    products.type = "raw";
    var key = ".file_"+(getid++);

    mkdirp(destdir, function (err) {
        if (err) return next(err);
        context.get(_path, destdir, function(err) {
            if(err) {
                console.error(err);
                progress(key, {status: "failed", msg: err}, function() {
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
            if(products.files.length == config.get.length) {
                process.exit(0);
            } else {
                console.error("couldn't get all files requested");
                process.exit(1); 
            }
        });
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
//
// put a file in hpss (parent directory will be created automatically)
//

var putid = 0;
if(config.put) async.eachSeries(config.put, function(put, next) {
    products.type = "hpss";

    if(!put.localpath) return next("localpath not set for put request");
    if(!put.hpsspath) return next("hpsspath not set for put request");

    //mkdirp hpsspath
    var dirname = path.dirname(put.hpsspath);
    context.mkdir(dirname, {p: true}, function(err) {
        var key = ".file_"+(putid++);
        context.put(put.localpath, put.hpsspath, function(err) {
            if(err) {
                console.error(err);
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
            if(products.files.length == config.put.length) {
                process.exit(0);
            } else {
                console.error("couldn't put all files requested");
                process.exit(1); 
            }
        });
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
//
// remote a file in hpss
//

var removeid = 0;
var removed = 0;
if(config.remove) async.eachSeries(config.remove, function(del, next) {
    if(!del.hpsspath) return next("hpsspath not set for remove request");

    context.rm(del.hpsspath, function(err, out) {
        var key = ".remove_"+(removeid++);
        if(err) {
            console.error(err);
            progress(key, {status: "failed", msg: "Failed to remove a file:"+del.hpsspath}, function() {
                next(); //skip this file and continue with other files
            });
        } else {
            removed++;
            progress(key, {status: "finished", progress: 1, msg: "Removed "+del.hpsspath}, next);
        }
    });
}, function(err) {
    //create empty products.json
    fs.writeFile("products.json", JSON.stringify([]), function(err) {
        if(removed == config.remove.length) {
            process.exit(0);
        } else {
            console.error("couldn't remove all files requested");
            process.exit(1); 
        }
    });
});


