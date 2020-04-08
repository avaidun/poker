const fs = require('fs');
    let rawdata = fs.readFileSync('/Users/rahulvaidun/Desktop/poker/poker/Sample 6-handed Table.rr');
let data = JSON.parse(rawdata);
console.log(data)