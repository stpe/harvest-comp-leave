/* eslint-env es6 */
"use strict";

require("dotenv").load({silent: true});

var people = require("./lib/people");
var compLeave = require("./lib/compleave");
var workHours = require("./lib/workhours");
var csvData = require("./lib/csvdata");

var weekObj = require("./lib/week");

// moment
var moment = require("moment");
moment.locale("sv");

var jsoncsv = require("json-csv");

// file to be written to S3
var outputFilename = "harvest-comp-leave-" + moment().format("YYYY") + ".csv";

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
var timeEntriesByUser = Bluebird.promisify(Reports.timeEntriesByUser, { context: Reports });

// aws s3
var knox = require("knox");
var s3 = knox.createClient({
  key: process.env.S3_KEY,
  secret: process.env.S3_SECRET,
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION
});

console.log("Project ID Internal: " + process.env.PROJECT_ID_INTERNAL);
console.log("Task ID Comp. Leave: " + process.env.TASK_ID_COMP_LEAVE);

var reportOptions = {
  "project_id": process.env.PROJECT_ID_INTERNAL,
  "from": moment().subtract(process.env.NUMBER_OF_WEEKS, "weeks").startOf("week").format("YYYYMMDD"),
  "to": moment().endOf("week").format("YYYYMMDD")
};

var timeEntriesByUserReportOptions = {
  "user_id": 1033335,
  "from": reportOptions.from,
  "to": reportOptions.to
};

var week = weekObj.initWeekObject(reportOptions);

console.log(`Period: ${reportOptions.from} - ${reportOptions.to}.`);

peopleList({})
  .then(function(data) {
    people.init(data);

    // get time entries for every user
    return Bluebird.all(
      data.map(user => timeEntriesByUser({
        "user_id": user.user.id,
        "from": reportOptions.from,
        "to": reportOptions.to
      }))
    );
  })
  .then(function(data) {
    var workHoursData = {};
    data.forEach(function(user) {
      let userData = workHours.getPersonArray(user, timeEntriesByUserReportOptions);

      let userId = Object.keys(userData);
      if (userId.length > 0) {
        workHoursData[userId[0]] = userData[userId[0]];
      }
    });

    return Bluebird.all([
      workHoursData,
      timeEntriesByProject(reportOptions)
    ]);
  })
  .then(function(data) {
    var workHoursData = data[0];
    var compLeaveData = compLeave.getPersonArray(data[1], reportOptions);

    var csvArray = csvData.convertIntoCSV(people, workHoursData, compLeaveData);

    var options = {
      fields: [
        {
          name: "userId",
          label: "User ID"
        },
        {
          name: "name",
          label: "Name",
          quoted: true
        },
        {
          name: "type",
          label: "Type",
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

    jsoncsv.csvBuffered(csvArray, options, function(err, csv) {
      if (err) return console.error(err);

      console.log(csv);

      if (!process.env.DEVELOPMENT) {
        var buffer = new Buffer(csv);
        var headers = { "Content-Type": "text/plain" };
        var reply = "";
        s3.putBuffer(buffer, "/" + outputFilename, headers, function(s3err, res) {
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
