/* eslint-env es6 */
"use strict";

require("dotenv").load({silent: true});

var people = require("./lib/people");
var compLeave = require("./lib/compleave");

var weekObj = require("./lib/week");

// moment
var moment = require("moment");
moment.locale("sv");

var jsoncsv = require("json-csv");

// harvest
var Harvest = require("harvest"),
  harvest = new Harvest({
    subdomain: process.env.HARVEST_SUBDOMAIN,
    email: process.env.HARVEST_EMAIL,
    password: process.env.HARVEST_PASSWORD
  }),
  Reports = harvest.Reports,
  People = harvest.People;

// promisify harvest api
var Bluebird = require("bluebird");
var timeEntriesByProject = Bluebird.promisify(Reports.timeEntriesByProject, { context: Reports });
var peopleList = Bluebird.promisify(People.list, { context: People });

// aws s3
var knox = require("knox");
var s3 = knox.createClient({
  key: process.env.S3_KEY,
  secret: process.env.S3_SECRET,
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION
});

console.log("Project ID: " + process.env.TASK_ID_COMP_LEAVE);
console.log("Task ID: " + process.env.PROJECT_ID_INTERNAL);

var reportOptions = {
  "project_id": process.env.PROJECT_ID_INTERNAL,
  "from": moment().subtract(process.env.NUMBER_OF_WEEKS, "weeks").startOf("week").format("YYYYMMDD"),
  "to": moment().endOf("week").format("YYYYMMDD")
};

var week = weekObj.initWeekObject(reportOptions);

console.log(`Period: ${reportOptions.from} - ${reportOptions.to}.`);

peopleList({})
  .then(function(data) {
    people.init(data);

    return timeEntriesByProject(reportOptions);
  })
  .then(function(data) {
    var csvData = compLeave.getPersonArray(data, people, reportOptions);

    var options = {
      fields: [
        {
          name: "user_id",
          label: "User ID"
        },
        {
          name: "name",
          label: "Name",
          quoted: true
        }
      ]};

    // dynamic header values by weeks in period
    Object.keys(week).forEach(function(weekNr) {
      options.fields.push({
        name: weekNr,
        label: weekNr
      });
    });

    jsoncsv.csvBuffered(csvData, options, function(err, csv) {
      if (err) return console.error(err);

      console.log(csv);

      if (!process.env.DEVELOPMENT) {
        var buffer = new Buffer(csv);
        var headers = { "Content-Type": "text/plain" };
        var reply = "";
        s3.putBuffer(buffer, "/harvest-comp-leave.csv", headers, function(s3err, res) {
          if (s3err) return console.error(s3err);

          console.log("Response HTTP Status", res.statusCode);
          res.on("data", chunk => reply += chunk);
          res.on("end", () => {
            console.log(reply);
            process.exit(); // eslint-disable-line no-process-exit
          });
        });
      }

    });
  });
