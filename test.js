
var _ = require('underscore');
_.mixin(require('underscore.deferred'));


var list = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'sevent', 'apple', 'cart'];

var config = {
  pgconn: 'postgres://postgres:password@localhost:5432/postgres',
  log: false
  // ,  tableSuffix: 'count'
};

var sequencer = new (require('./sequencer.js'))(list, config);

var logger = function(msg) {
  console.log(msg);
};

var args = process.argv.slice(2);

if (_.contains(args, 'drop')) {

  // console.log('dropit like its hot');

  _.when(
    sequencer.dropDB()
  ).then(function() {
    var status = arguments[0];
    console.log(status);
    process.exit(1);
  }
        );

} else {

  _.when(
    sequencer.next()
  ) .then(function() {

    // console.log(arguments);
    var sentence =_.flatten(arguments);
    if (sentence[1]) sentence = sentence[1];

    console.log('then sentence: ', sentence);
    process.exit(1);
  });

}
