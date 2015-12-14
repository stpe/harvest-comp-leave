"use strict";

var helpers = require("./helpers/entriesByPersons");

var compLeave = {};

compLeave.getPersonArray = function(data, reportOptions) {
  data = data.filter(entry => entry.day_entry.task_id == process.env.TASK_ID_COMP_LEAVE); // eslint-disable-line eqeqeq

  return helpers.convertTimeEntriesIntoByPerson(data, reportOptions);
};

module.exports = compLeave;
