'use strict';

//node
var fs = require('fs');

//contrib
var async = require('async');

var request = JSON.parse(fs.readFileSync("./request.json", "utf8"));
async.eachSeries(request.paths, function(path, next) {
    console.log("downloading "+path);
    next();
}, function(err) {
    console.log("all done");
});
