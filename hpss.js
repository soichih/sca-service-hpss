'use strict';

//node
var fs = require('fs');
var exec = require('child_process').exec;

//contrib
var async = require('async');

//call hsi get on each paths listed in the request
var config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
async.eachSeries(config.paths, function(path, next) {
    console.log("downloading "+path);
    exec('hsi get '+path, function(err, stdout, stderr) {
        if(err) console.dir(err);
        console.error(stderr);
        console.log(stdout);
        next();
    });
}, function(err) {
    console.log("all done");
});
