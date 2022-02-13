const csv = require('csv-parser');
const fs = require('fs');
const {addWhitelist} = require("../db/db")


fs.createReadStream('./whitelist.csv')
  .pipe(csv())
  .on('data', (row) => {
    addWhitelist(row.address.toLowerCase())
  })
  .on('end', () => {
    console.log('Whitelist Script Completed');
  });
