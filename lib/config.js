const fs = require('fs');

// TODO
module.exports = function () {
    let rawdata = fs.readFileSync('config.json');
    return JSON.parse(rawdata);
};