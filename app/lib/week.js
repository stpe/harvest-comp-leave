var week = {};

// populate week object with week numbers in requested date range
week.initWeekObject = function() {
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

module.exports = week;