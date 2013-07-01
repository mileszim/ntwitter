Twat: Simple Twitter Streaming for Node.js
==========================================

Twat is a heavily-modified version of AvianFlu's [ntwitter](http://github.com/AvianFlu/ntwitter), which is an improved version of jdub's [node-twitter](http://github.com/jdub/node-twitter), which in turn was inspired by, and uses some code from, technoweenie's [twitter-node](http://github.com/technoweenie/twitter-node).

The goal of Twat is to provide an extremely easy, consistent connection to Twitter's streaming API, and handle reconnection (including backoff strategies) automatically so you don't have to.


## Installation

You can install Twat and its dependencies with npm: `npm install twat`.


### Setup API 

The keys listed below can be obtained from [dev.twitter.com](http://dev.twitter.com) after [setting up a new App](https://dev.twitter.com/apps/new).

``` javascript
var Twat = require('twat');

var twit = new Twat({
  consumer_key: 'Twitter',
  consumer_secret: 'API',
  access_token: 'keys',
  access_token_secret: 'go here'
});
```


### Streaming

The stream() callback receives a Stream-like EventEmitter.

Here is an example of how to call the `statuses/sample` method:

``` javascript
twit.stream('statuses/sample', function(stream) {
  stream.on('tweet', function(tweet) {
    console.log(tweet);
  });
});
```
        
Here is an example of how to call the 'statuses/filter' method with a bounding box over San Fransisco and New York City ( see streaming api for more details on [locations](https://dev.twitter.com/docs/streaming-api/methods#locations) ):

``` javascript
twit.stream('statuses/filter', {'locations':'-122.75,36.8,-121.75,37.8,-74,40,-73,41'}, function(stream) {
  stream.on('tweet', function(tweet) {
    console.log(tweet);
  });
});
```

Twat also supports user and site streams:

``` javascript
twit.stream('user', {track:'nodejs'}, function(stream) {
  stream.on('tweet', function (tweet) {
    console.log(tweet);
  });
  stream.on('end', function(response) {
    // Handle a disconnection
  });
  stream.on('destroy', function(response) {
    // Handle a 'silent' disconnection from Twitter, no end/error event fired
  });
  // Disconnect stream after five seconds
  setTimeout(stream.destroy, 5000);
});
```


### Stream Listener Options

#### data

To get tweets from the stream:

``` javascript
twit.stream('statuses/sample', function(stream) {
  stream.on('tweet', function(tweet) {
    console.log(tweet);
  });
});
```

#### error

Twat will emit an error if there is a problem with the stream (auto-reconnect or not)

``` javascript
twit.stream('statuses/sample', function(stream) {
  stream.on('error', function(type, info) {
    console.log(type + " " + info);
  });
});
```

#### reconnect

When Twat begins auto reconnection, it will emit reconnect status for every attempt

``` javascript
twit.stream('statuses/sample', function(stream) {
  stream.on('reconnect', function(info) {
    console.log(info.error);    // The error causing reconnection
    console.log(info.attempts); // Number of reconnects attempted
  });
});
```

#### end

If Twitter sends a FIN packet to end the open connection, Twat emits an end

``` javascript
twit.stream('statuses/sample', function(stream) {
  stream.on('end', function(response) {
    console.log(response);
  });
});
```

#### destroy

When the connection to Twitter ends, Twat also emits a destroy to signal the socket has closed

``` javascript
twit.stream('statuses/sample', function(stream) {
  stream.on('destroy', function(msg) {
    console.log(msg);
  });
});
```



## Contributors

[Lots of people contribute to this project. You should too!](https://github.com/mileszim/twat/contributors)