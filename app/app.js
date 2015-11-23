/* jshint node: true, esnext: true */
"use strict";

const TASK_ID_COMP_LEAVE = 4136105;
const PROJECT_ID_INTERNAL = 7778502;

require("dotenv").load();

// moment
var moment = require("moment");
moment.locale("sv");

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

var report = {
    project_id: PROJECT_ID_INTERNAL,
    from: moment().subtract(2, "weeks").startOf("week").format("YYYYMMDD"),
    to: moment().endOf("week").format("YYYYMMDD")
};

var peopleLookup = {};

peopleList({})
  .then(function(people) {
    // convert people list to object for lookup by id
    peopleLookup = people.reduce(function(obj, person) {
      obj[person.user.id] = person.user;
      return obj;
    }, {});

    return timeEntriesByProject(report);
  })
  .then(function(data) {
    data = data.filter(entry => entry.day_entry.task_id === TASK_ID_COMP_LEAVE)
        .map(function(entry) {
          // get first name for person who did entry
          entry = entry.day_entry;
          entry.first_name = peopleLookup[entry.user_id].first_name;
          return entry;
        });

    console.log(JSON.stringify(data, 0, 2));
  });
