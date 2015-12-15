/* eslint-disable camelcase */
"use strict";

var _ = require("lodash");
var moment = require("moment");
moment.locale("sv");

var weekObj = require("../week");

var helpers = {};

helpers.convertTimeEntriesIntoByPerson = function(data, reportOptions) {
  var week = weekObj.initWeekObject(reportOptions);

  data.map(function(entry) {
      entry = entry.day_entry;

      // calculate week nr for entry
      entry.week_nr = moment(entry.spent_at, "YYYY-MM-DD").week();

      return entry;
    })
    .forEach(function(entry) {
      // sum hours per week and per user
      var hours = _.get(week, [entry.week_nr, entry.user_id], 0);
      _.set(week, [entry.week_nr, entry.user_id], hours + parseInt(entry.hours));
    });

  // exclude these users from the report
  var ignorePeople = [];
  if (process.env.EXCLUDE_USER_ID) {
    ignorePeople = process.env.EXCLUDE_USER_ID.split(",");
  }

  // map into per person objects
  var p = {};
  Object.keys(week).forEach(function(weekNr) {
    Object.keys(week[weekNr]).forEach(function(userId) {
      if (ignorePeople.indexOf(userId) == -1) {
        if (!p[userId]) p[userId] = {};
        p[userId][weekNr] = week[weekNr][userId];
      }
    });
  });

  return p;
};

module.exports = helpers;
