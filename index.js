// ### Libraries and globals
var config = require('./config.js');
var Twit = require('twit');
var T = new Twit(config);
var sequencer = new (require('./sequencer.js'))(require('./packages.txt'));
var pg = require('pg');
var _ = require('underscore');
_.mixin(require('underscore.deferred'));

// ### Utility Functions
var logger = function(msg) {
  if (config.log) console.log(msg);
};

var tweeter = function(texts) {

  _.when(
    sequencer.next()
  ) .then(function() {

    var sentence =_.flatten(arguments);
    if (sentence[0]) sentence = sentence[0];

    logger(sentence);

    if (sentence.length === 0 || sentence.length > 140) {
      tweeter();
    } else {
      if (config.tweet_on) {
        T.post('statuses/update', { status: sentence }, function(err, reply) {
	  if (err) {
	    console.log('error:', err);
	  }
	  else {
            // nothing on success unless we wanna get crazy with logging replies
	  }
        });
      }
    }

  });

};

_.when(
  sequencer.initDB()
).then(function(status) {
  if (status.toLowerCase().indexOf('error') > -1) {
    console.log(status);
    process.exit();
  }

  // only start up if no init errors

  // Tweets ever n minutes
  // set config.seconds to 60 for a complete minute
  setInterval(function () {
    try {
      tweeter();
    }
    catch (e) {
      console.log(e);
    }
  }, 1000 * config.minutes * config.seconds);

  // Tweets once on initialization.
  tweeter();
});
