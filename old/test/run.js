var util = require('util');
var Twat = require('../index.js');


var t = new Twat({
    consumer_key: 'nUnWD3INnXBc9DQVyboifg',
    consumer_secret: 'OAzkQffifqRDcda4QhZW49uXaeCFaEVz7l0sWfb75Q',
    access_token: '44549120-MHDTdBnFgRW8z6YchufzxZHrBd8vFbXAwskgoHHRy',
    access_token_secret: 'UHnDvUXuyD38DvYLRkCLDe8vyINqVvTQjipabWHJY'
});

/*
t.get('https://api.twitter.com/1.1/users/show.json', {'screen_name': 'mileszim'}, function(err, response) {
    console.log(err);
    console.log(response);
});
*/

t.stream('statuses/filter', {track: ['google', 'yahoo'], follow: 'mileszim'}, function(stream) {
    stream.on('tweet', function(tweet) {
        console.log(tweet.text);
    });
});