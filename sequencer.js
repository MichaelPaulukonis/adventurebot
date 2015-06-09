// var config = require('./config.js');
var query = require('pg-query');
var _ = require('underscore');
_.mixin(require('underscore.deferred'));

// var conString = "postgres://username:password@localhost/database";
// DATABASE_URL="postgres://postgres:password@localhost:5432/postgres"

// TODO: would be nice if we could set this up as a DB _or_ as a text-file based
// FROM THE SAME PIECE OF CODE
// or that could also be a well-gilded lily
// TODO: take in list, as well as config
// defined in code or local-file, that's up to the user of this code, not this code
var sequencer = function(list, config) {

  // TODO: pass in table-suffix as part of config
  var tableName = 'sequence' + (config.tableSuffix ? '_' + config.tableSuffix : '');
  var DB_CREATE = 'CREATE TABLE IF NOT EXISTS '+ tableName
      + ' (currentIndex integer NOT NULL)';
  var DB_QUERY = 'SELECT currentIndex FROM ' + tableName;
  var DB_UPDATE = 'UPDATE ' + tableName + ' SET currentIndex = currentIndex + 1';
  var DB_INIT_RECORD = 'INSERT INTO ' + tableName + '(currentIndex) values(-1)';
  var DB_DROP = 'DROP TABLE IF EXISTS ' + tableName;

  query.connectionParameters = config.pgconn;
  var dbExists = false;
  var recordExists = false;
  var index = 0;

  var logger = function(msg) {
    if(!config.log) return;

    for (var i = 0; i < arguments.length; i++) {
      console.log(arguments[i]);
    }
  };

  this.dropDB = function() {
    var dfd = _.Deferred();

    logger('removing DB');
    try {
      query(DB_DROP, function(err, rows, result) {
        var status;
        if (err) {
          logger('DB drop error: ', err);
          status = 'DB drop error: ' + err.toString();
        } else {
          dbExists = false;
          status = 'Database dropped';
          logger(status);
        }
        dfd.resolve(status);
      });
    } catch (e) {
      console.log(e);
      logger('DB drop error: ', e.toString());
      dfd.resolve('DB drop error: ' + e.toString());
    }

    return dfd.promise();
  };

  this.initDB = function() {

    var dfd = _.Deferred();
    var status;

    if (dbExists) {
      status = 'DB already exists';
      dfd.resolve(status);
    } else {
      logger('initializing DB');
      try {
        query(DB_CREATE, function(err, rows, result) {

          if (err) {
            status = 'DB init error: ' + err.toString();
          } else {
            dbExists = true;
            status = 'Database initialized';
          }
          logger(status);
          dfd.resolve(status);
        });
      } catch (e) {
        logger('DB init error: ', e.toString());
        dfd.resolve('DB init error: ' + e.toString());
      }
    }

    return dfd.promise();

  };

  this.initRecord = function() {
    var dfd = _.Deferred();
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
          logger(status);
          dfd.resolve(status);
        });
      } catch (e) {
        logger('initRecord error: ', e.toString());
        dfd.resolve('initRecord error: ' + e.toString());
      }
    }

    return dfd.promise();

  };

  // TODO: if don't know if the db exists
  // try creating it, initializing the first record
  // and remembering all of this.
  this.next = function() {
    var dfd = _.Deferred();
    var p = dfd.promise();
    var initRecord = this.initRecord;
    var next = this.next;

    var getit = function(rows) {
      // if rows is empty, there is an error, but it is swallowed??!??
      logger('rows: ', rows);
      // logger('list:', list);
      var currentIndex = (rows[0].currentindex + 1) % list.length;
      var sentence = list[currentIndex];
      logger('currentIndex: ', currentIndex, '\nsentence: ', sentence);
      query(DB_UPDATE, function(err) {
        if (err) dfd.resolve('DB_UPDATE error: ' + err);
        dfd.resolve(sentence);
      });

    };

    var recordCheck = function(rows) {
      var dfd = _.Deferred();
      if (rows.length == 0) {
        logger('no rows, initializing.....');
        _.when(
          initRecord()
        ).then(
          function() {
            logger('RECORD CHECK DONE');
            _.when(
              doQuery()
            ).then(
              function(rows) {
                dfd.resolve(rows);
              }
            );
          }
        );
      } else {
        dfd.resolve(rows);
      }
      logger('TEST TEST');
      return dfd.promise();
    };


    var doQuery = function() {
      logger('doing query');
      var dfd = _.Deferred();

      query(DB_QUERY, function(err, rows, data) {
        if (err) {
          dfd.resolve('QUERY ERROR: ' + err);
        } else {
          logger('query done');
          dfd.resolve(rows);
        }
      });

      return dfd.promise();
    };


    _.when(
      this.initDB()
    ).then(
      function() {

        _.when(
          doQuery()
        ).then(
          function(rows) {
            // TODO
            logger('new rows: ', rows);
            _.when(
              recordCheck(rows) // nope -- needs the rows object. AAARGH
            ).then(
              function(rows) {
                logger('post-check rows: ', rows);
                getit(rows);
              }
            );
          }
        );

      });

    return dfd.promise();
    // return dfd.resolve();

  };

};

module.exports = sequencer;
