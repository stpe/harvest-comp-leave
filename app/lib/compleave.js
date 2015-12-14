/* eslint-env es6 */
/* eslint-disable camelcase */

"use strict";

var _ = require("lodash");
var moment = require("moment");
moment.locale("sv");

var weekObj = require("./week");

var compLeave = {};

compLeave.getPersonArray = function(data, people, reportOptions) {
  var week = weekObj.initWeekObject(reportOptions);

  data.filter(entry => entry.day_entry.task_id == process.env.TASK_ID_COMP_LEAVE) // eslint-disable-line eqeqeq
    .map(function(entry) {
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

  // map into per person objects
  var p = {};
  Object.keys(week).forEach(function(weekNr) {
    Object.keys(week[weekNr]).forEach(function(userId) {
      if (!p[userId]) p[userId] = {};
      p[userId][weekNr] = week[weekNr][userId];
    });
  });

  // convert into array for csv
  var csvData = Object.keys(p).map(function(userId) {
    // get first name for person who did entry
    p[userId].name = people.get(userId).first_name;
    p[userId].userId = userId;
    return p[userId];
  });

  // sort by name
  csvData.sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });

  return csvData;
};

module.exports = compLeave;
