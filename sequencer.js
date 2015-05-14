var config = require('./config.js');
var query = require('pg-query');
var _ = require('underscore');
_.mixin(require('underscore.deferred'));

query.connectionParameters = config.database_url;

var DB_CREATE = 'CREATE TABLE IF NOT EXISTS sequence '
      + '(currentIndex integer NOT NULL)';
var DB_QUERY = 'SELECT currentIndex FROM sequence';
var DB_UPDATE = 'UPDATE sequence SET currentIndex = currentIndex + 1';
var DB_INIT_RECORD = 'INSERT INTO sequence(currentIndex) values(-1)';

// TODO: would be nice if we could set this up as a DB _or_ as a text-file based
// FROM THE SAME PIECE OF CODE
// or that could also be a well-gilded lily
var sequencer = function() {

  // TODO: this should be passed in as a parameter, not hard-coded!
  var list = require('./packages.txt');
  var index = 0;

  this.initDB = function() {

    var dfd = new _.Deferred();

    console.log('initializing DB');
    try {
      query(DB_CREATE, function(err, rows, result) {
        var status;
        if (err) {
          console.log('DB init error: ', err);
          status = 'DB init error: ' + err.toString();
        } else {
          status = 'Database initialized';
          console.log(status);
        }
        dfd.resolve(status);
      });
    } catch (e) {
      console.log('DB init error: ', e.toString());
      dfd.resolve('DB init error: ' + e.toString());
    }

    return dfd.promise();

  };


  this.next = function() {
    var dfd = new _.Deferred();

    query(DB_QUERY, function(err, rows, data) {
      if (err) {
        dfd.resolve('QUERY ERROR: ' + err);
      } else {

        if (rows.length == 0) {
          query(DB_INIT_RECORD, function(err, rows, data) {
            // UGH WE R NESTING AGAIN
            console.log('DB initialized with first record');
          });
        } else {
          var currentIndex = rows[0].currentindex + 1;
          console.log('currentIndex: ', currentIndex);
          var sentence = list[currentIndex];
          query(DB_UPDATE, function(err) {
            if (err) dfd.resolve('DB_UPDATE error: ' + err);
            dfd.resolve(sentence);
          });
        }
      }
    });

    return dfd.promise();

  };

};

module.exports = sequencer;
