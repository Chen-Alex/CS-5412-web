const express = require('express');
const path = require('path');
const Req = require('request');
const app = express();


// Connect to database code and query template taken from https://docs.microsoft.com/en-us/azure/sql-database/sql-database-connect-query-nodejs
var Connection = require('tedious').Connection;
var Request = require('tedious').Request; 
var config =
{
    authentication: {
        options: {
            userName: 'taxidemo',
            password: 'Password1!'
        },
        type: 'default'
    },
    server: 'taxidemo-db.database.windows.net',
    options:
    {
        database: 'taxidemo-db',
        encrypt: true
    }
}

var connection = new Connection(config);

// Attempt to connect and execute queries if connection goes through
connection.on('connect', function(err) {
  if (err) {
      console.log(err)
    }
  }
);

// Consuming the ML web model. Template taken from https://docs.microsoft.com/en-us/azure/machine-learning/studio/consume-web-services

const uri = "https://ussouthcentral.services.azureml.net/workspaces/a0390d97524843d098051257c87c7443/services/55619ba5192e423a80ca22cecd0d3b4c/execute?api-version=2.0&format=swagger"
const apikey = "QhgsHf54szlviV9Mz/U5qOjJmtDegV/FokHkV5ZAntL2rbxmWSK5fz2pFAEx9IhiopZnWeI+BrkWBXB/AkKBrg=="

// serve files from the public directory
app.use(express.static('public'));

// load js files
app.use(express.static(path.join(__dirname, 'js')));

// load images
app.use(express.static(path.join(__dirname, 'images')));

// parse JSON objects
app.use(express.json());

// start the express web server listening on 8080
app.listen(8080, () => {
  console.log('listening on 8080');
});

// serve the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
});

// Local buffer for the database entries
var localdict = {}

// Client posted datetime to server; server responds
// with counts
app.post('/post', (req, res) => {
  
  if (req.body.type == "Actual") {
    let key = [req.body.month, req.body.week, req.body.day, req.body.hour];
    console.log(key);
    
    if (key in localdict) {
      console.log("Entries already exist in memory");
      res.send(localdict[key]);
      return;
    }
    
    console.log("Entries not found in memory; accessing database");
    var request = new Request(
      "SELECT * FROM Taxidata WHERE month = " 
      + req.body.month + " AND week = "
      + req.body.week  + " AND day = "
      + req.body.day   + " AND hour = "
      + req.body.hour,
      function(err, rowCount, rows)
      {
        if (err) {
          console.log(err);
        } else {
          if (!(key in localdict)) {
            console.log("not found");
            res.send(JSON.stringify({}));
          } else {
            res.send(JSON.stringify(localdict[key]));
          }
        }
      }
    );

    request.on('row', function(columns) {
      let key = [columns[0].value, columns[1].value, columns[2].value, columns[3].value];
      if (!(key in localdict)) {
        localdict[key] = {}
      }
      localdict[key][[columns[4].value, columns[5].value]] = columns[6].value;
    });

    connection.execSql(request);
  } else {
    
    let data = {};
    data["Inputs"] = {};
    data["Inputs"]["input1"] = [];
    var i, j;
    for (i = 0; i < 20; i++) {
      for (j = 0; j < 20; j++) {
        let t = {};
        t["Month"] = req.body.month;
        t["Week"] = req.body.week;
        t["Day"] = req.body.day;
        t["Hour"] = req.body.hour;
        t["XRegion"] = i;
        t["YRegion"] = j;
        t["Freq"] = 0;
        data["Inputs"]["input1"].push(t);
      }
    }
    data["GlobalParameters"] = {'Dataset to Unpack': ""};
    
    let options = {
      uri: uri,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apikey,
      },
      body: JSON.stringify(data)
    }
    
    Req(options, (err, r, body) => {
      if (!err && r.statusCode == 200) {
        resp = {}
        outputs = JSON.parse(r.body)["Results"]["output1"];
        for (var i = 0; i < outputs.length; i++) {
          d = outputs[i];
          resp[[d["XRegion"], d["YRegion"]]] = d["Scored Labels"];
        }
        res.send(JSON.stringify(resp));
      } else {
        console.log(err);
        res.sendStatus(500);
      }
    }); 
  }
});