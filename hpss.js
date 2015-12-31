'use strict';

#node
var fs = require('fs');

var request = fs.readFileSync("request.json");
console.dir(request.paths);
