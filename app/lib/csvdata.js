"use strict";

var csvdata = {};

csvdata.convertIntoCSV = function(people, workHoursData, compLeaveData) {
  // convert into array for csv
  var csvDataCompLeave = Object.keys(compLeaveData).map(function(userId) {
    // get first name for person who did entry
    compLeaveData[userId].name = people.get(userId).first_name;
    compLeaveData[userId].userId = userId;
    compLeaveData[userId].type = "Comp Leave";
    return compLeaveData[userId];
  });

  var csvDataWorkHoursData = Object.keys(workHoursData).map(function(userId) {
    // get first name for person who did entry
    workHoursData[userId].name = people.get(userId).first_name;
    workHoursData[userId].userId = userId;
    workHoursData[userId].type = "Work Hours";
    return workHoursData[userId];
  });

  var csvData = csvDataCompLeave.concat(csvDataWorkHoursData);

  // sort by name
  csvData.sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });

  return csvData;
};

module.exports = csvdata;
