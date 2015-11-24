/* jshint node: true, esnext: true */
"use strict";

const TASK_ID_COMP_LEAVE = 4136105;
const PROJECT_ID_INTERNAL = 7778502;

require("dotenv").load({silent: true});
var _ = require("lodash");

// moment
var moment = require("moment");
moment.locale("sv");

var jsoncsv = require('json-csv');

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

var reportOptions = {
  project_id: PROJECT_ID_INTERNAL,
  from: moment().subtract(1, "weeks").startOf("week").format("YYYYMMDD"),
  to: moment().endOf("week").format("YYYYMMDD")
};

console.log(`Period: ${reportOptions.from} - ${reportOptions.to}.`);

// populate week object with week numbers in requested date range
function initWeekObject() {
  var week = {};

  var d = moment(reportOptions.from, "YYYY-MM-DD");
  var endWeek = moment(reportOptions.to, "YYYY-MM-DD");

  week[d.week()] = {};

  while(!d.isAfter(endWeek)) {
    d.add(1, "week");
    week[d.week()] = {};
  }

  return week;
}

var week = initWeekObject();
var peopleLookup = {};

peopleList({})
  .then(function(people) {
    // convert people list to object for lookup by id
    peopleLookup = people.reduce(function(obj, person) {
      obj[person.user.id] = person.user;
      return obj;
    }, {});

    return timeEntriesByProject(reportOptions);
  })
  .then(function(data) {
    data.filter(entry => entry.day_entry.task_id === TASK_ID_COMP_LEAVE)
      .map(function(entry) {
        entry = entry.day_entry;

        // calculate week nr for entry
        entry.week_nr = moment(entry.spent_at, "YYYY-MM-DD").week();

        return entry;
      })
      .forEach(function(entry) {
        // sum hours per week and per user
        var hours = _.get(week, [entry.week_nr, entry.user_id], 0);
        _.set(week, [entry.week_nr, entry.user_id], hours + parseInt(entry.hours));
      });

    // map into per person objects
    var p = {};
    Object.keys(week).forEach(function(week_nr) {
      Object.keys(week[week_nr]).forEach(function(user_id) {
        if (!p[user_id]) p[user_id] = {};
        p[user_id][week_nr] = week[week_nr][user_id];
      });
    });

    // convert into array for csv
    var csvData = Object.keys(p).map(function(user_id) {
      // get first name for person who did entry
      p[user_id].name = peopleLookup[user_id].first_name;
      p[user_id].user_id = user_id;
      return p[user_id];
    });

    // sort by name
    csvData.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });

    var options = {
      fields : [
        {
          name: 'user_id',
          label: 'User ID'
        },
        {
          name: 'name',
          label: 'Name',
          quoted: true
        }
      ]};

    // dynamic header values by weeks in period
    Object.keys(week).forEach(function(week_nr) {
      options.fields.push({
        name: week_nr,
        label: week_nr
      });
    });

    jsoncsv.csvBuffered(csvData, options, function(err, csv) {
      if (err) {
        return console.error(err);
      }

      var buffer = new Buffer(csv);
      var headers = { 'Content-Type': 'text/plain' };
      var reply = "";
      s3.putBuffer(buffer, '/harvest-comp-leave.csv', headers, function(err, res) {
        if (err) return console.error(err);

        console.log("Response HTTP Status", res.statusCode);
        res.on('data', chunk => reply += chunk);
        res.on('end', chunk => {
          console.log(reply);
          process.exit();
        });
      });
    });
  });