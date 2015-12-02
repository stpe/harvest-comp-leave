var chai = require("chai");
var should = chai.should();

describe("people", function() {
  var people = require("../app/lib/people");

  before(function() {
    var peopleData = require("./mock/people.json")
    people.init(peopleData);
  });

  it('should be able to be looked up by id', function() {
    people.get(1033335).should.have.property("first_name", "Anton");
    people.get(985215).should.have.property("first_name", "Stefan");
  });
});
