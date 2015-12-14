"use strict";

var helpers = require("./helpers/entriesByPersons");

var workHours = {};

workHours.getPersonArray = function(data, reportOptions) {
  return helpers.convertTimeEntriesIntoByPerson(data, reportOptions);
};

module.exports = workHours;
