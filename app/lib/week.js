"use strict";

// moment
var moment = require("moment");
moment.locale("sv");

var weekObj = {};

// populate week object with week numbers in requested date range
weekObj.initWeekObject = function(reportOptions) {
  var week = {};

  var d = moment(reportOptions.from, "YYYY-MM-DD");
  var endWeek = moment(reportOptions.to, "YYYY-MM-DD");

  week[d.week()] = {};

  while(!d.isAfter(endWeek)) {
    d.add(1, "week");
    week[d.week()] = {};
  }

  return week;
};

module.exports = weekObj;
