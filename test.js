
var _ = require('underscore');
_.mixin(require('underscore.deferred'));


var list = ['first', 'second', 'third'];

var config = {
    pgconn: 'postgres://postgres:password@localhost:5432/postgres'
};

var sequencer = new (require('./sequencer.js'))(list, config);

var logger = function(msg) {
    console.log(msg);
};

var args = process.argv.slice(2);
// console.log(args);

if (_.contains(args, 'drop')) {

    console.log('dropit like its hot');

    _.when(
        sequencer.dropDB()
    ) .then(
        console.log('dropped')
    );

} else {

    _.when(
        // sequencer.initDB(),
        sequencer.next()
    ) .then(function() {

        // console.log(arguments);
        var sentence =_.flatten(arguments);
        // if there are TWO whens above, we want the seoncd one
        // right?
        if (sentence[1]) sentence = sentence[1];

        console.log('then sentence: ', sentence);
        process.exit(1);
    });

}
