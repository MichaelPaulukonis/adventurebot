// var config = require('./config.js');
var query = require('pg-query');
var _ = require('underscore');
_.mixin(require('underscore.deferred'));

// var conString = "postgres://username:password@localhost/database";
// DATABASE_URL="postgres://postgres:password@localhost:5432/postgres"

query.connectionParameters = "postgres://postgres:password@localhost:5432/postgres";

var DB_CREATE = 'CREATE TABLE IF NOT EXISTS sequence'
      + ' (currentIndex integer NOT NULL)';
var DB_QUERY = 'SELECT currentIndex FROM sequence';
var DB_UPDATE = 'UPDATE sequence SET currentIndex = currentIndex + 1';
var DB_INIT_RECORD = 'INSERT INTO sequence(currentIndex) values(-1)';
var DB_DROP = 'DROP TABLE IF EXISTS sequence';
// TODO: would be nice if we could set this up as a DB _or_ as a text-file based
// FROM THE SAME PIECE OF CODE
// or that could also be a well-gilded lily
// TODO: take in list, as well as config
// defined in code or local-file, that's up to the user of this code, not this code
var sequencer = function(list, config) {

  // TODO: this should be passed in as a parameter, not hard-coded!
  // var list = require('./packages.txt');
  query.connectionParameters = config.pgconn;
  var dbExists = false;
  var recordExists = false;
  var index = 0;

  this.dropDB = function() {
    var dfd = new _.Deferred();

    console.log('removing DB');
    try {
      query(DB_DROP, function(err, rows, result) {
        var status;
        if (err) {
          console.log('DB drop error: ', err);
          status = 'DB drop error: ' + err.toString();
        } else {
          dbExists = false;
          status = 'Database dropped';
          console.log(status);
        }
        dfd.resolve(status);
      });
    } catch (e) {
      console.log('DB drop error: ', e.toString());
      dfd.resolve('DB drop error: ' + e.toString());
    }

    return dfd.promise();
  };

  this.initDB = function() {

    var dfd = new _.Deferred();
    var status;

    if (dbExists) {
      status = 'DB already exists';
      dfd.resolve(status);
    } else {
      console.log('initializing DB');
      try {
        query(DB_CREATE, function(err, rows, result) {

          if (err) {
            status = 'DB init error: ' + err.toString();
          } else {
            dbExists = true;
            status = 'Database initialized';
          }
          console.log(status);
          dfd.resolve(status);
        });
      } catch (e) {
        console.log('DB init error: ', e.toString());
        dfd.resolve('DB init error: ' + e.toString());
      }
    }

    return dfd.promise();

  };

  this.initRecord = function() {
    var dfd = new _.Deferred();
    var status;

    /// ouch. should check first - this is AWLAYS re-initializing....
    if (recordExists) {
      status = 'records already initialized';
      dfd.resolve(status);
    } else {
      try {
        query(DB_INIT_RECORD, function(err, rows, data) {

          if (err) {
            status = 'initRecord error: ' + err.toString();
          } else {
            recordExists = true;
            status = 'storage initialized with first record';
          }
          console.log(status);
          dfd.resolve(status);
        });
      } catch (e) {
        console.log('initRecord error: ', e.toString());
        dfd.resolve('initRecord error: ' + e.toString());
      }
    }

    return dfd.promise();

  };

  // TODO: if don't know if the db exists
  // try creating it, initializing the first record
  // and remembering all of this.
  this.next = function() {
    var dfd = new _.Deferred();
    var initRecord = this.initRecord;

    var getit = function(rows) {
      // console.log('list:', list);
      var currentIndex = (rows[0].currentindex + 1) % list.length;
      var sentence = list[currentIndex];
      console.log('currentIndex: ', currentIndex, '\nsentence: ', sentence);
      query(DB_UPDATE, function(err) {
        if (err) dfd.resolve('DB_UPDATE error: ' + err);
        dfd.resolve(sentence);
      });

    };

    var recordCheck = function(rows) {
      var dfd = new _.Deferred();
      if (rows.length == 0) {
        console.log('no rows, initializing.....');
        dfd.then(
          initRecord()
        ).done(function() {
          console.log('DONE');
          dfd.resolve();
        });
      } else {
        dfd.resolve();
      }
      console.log('TEST TEST');
      return dfd.promise();
    };

    _.when(
      this.initDB()
    ).then(function() {

      query(DB_QUERY, function(err, rows, data) {
        if (err) {
          dfd.resolve('QUERY ERROR: ' + err);
        } else {

          _.when(
            recordCheck(rows)
          ).done(function() {
            // the thing is... IT'S NOT COMPLETE
            // initRecord() is still running when this shows up....
            console.log('check complete, go get something');
            getit(rows);
          });
        }
      });
    });
    return dfd.promise();
  };



};

module.exports = sequencer;
