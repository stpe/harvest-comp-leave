var people = {};

var lookup = {};

people.init = function(data) {
  // convert people list to object for lookup by id
  lookup = data.reduce(function(obj, person) {
    obj[person.user.id] = person.user;
    return obj;
  }, {});
};

people.get = function(user_id) {
  return lookup[user_id];
};

module.exports = people;