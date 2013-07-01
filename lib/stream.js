var events = require('events');

var StreamParser = require('./parser.js');
var Backoff      = require('./backoff.js');
var Constants    = require('./constants.js');
var Utilities    = require('./utilities.js');


var Stream = function(request) {
    this.request = request;
    this.stream  = new StreamParser();
    
    this.handler = new events.EventEmitter();
    
    this.connected      = false;
    this.handling_error = false;
}

Stream.prototype = {
    
    initialize: function() {
        this.controller();
        this.connect();
    },
    
    connect: function() {
        var self = this;
        self.request.on('response', function(response) {
                        
            // Error from twitter
            if (response.statusCode > 200) {
                self.handler.emit('error', 'http', response.statusCode);
            } else {
                self.handling_error = false;
                self.connected = true;
                
                // Valid tweet
                response.on('data', function(chunk) {
                    self.stream.receive(chunk);
                });
                
                // Handle error
                response.on('error', function(error) {
                    self.handler.emit('error', error);
                });
                
                // Close stream request from twitter server
                response.on('end', function() {
                    self.stream.emit('end', response);
                });

                /**
                 * This is a net.Socket event.
                 * When Twat closes the connection no 'end/error' event is fired.
                 * In this way we can able to catch this event and force to destroy the 
                 * socket. So, 'stream' object will fire the 'destroy' event as we can see above.
                 */
                response.on('close', function() {
                    if (typeof self.request.abort === 'function') self.request.abort();
                    else self.request.socket.destroy();
                    self.stream.emit('destroy', 'the socket has been destroyed');
                });
            }
        });
        
        // Error from network
        self.request.on('error', function(error) {
            self.handler.emit('error', 'network', error);
        });
        
        self.request.end();
    },
    
    
    
    controller: function() {
        var self = this;
        self.handler.addListener('error', function(type, info) {
            if (!self.handling_error) {
                self.backoff(type, info);
            }
        });
        self.stream.addListener('_data', function(tweet) {
            Utilities.processTweet(tweet, self.stream);
        });
    },
    
    
    backoff: function(type, info) {
        var self = this;
        
        self.connected      = false;
        self.handling_error = true;
        
        var strategy;
        var message;

        // Network connection error (linear backoff)
        if (type==='network') {
            strategy = new Backoff.network();
            message  = "Network Error";
        
        // Rate limited (exponential backoff)
        } else if (type==='http' && info===420) {
            strategy = new Backoff.http420();
            message  = "Rate Limited";
        
        // HTTP error from twitter that warrants reconnection (exponential backoff)
        } else if (type==='http' && Constants.http_codes[info]) {
            strategy = new Backoff.http();
            message  = "HTTP Error";
            
        // Any other http error (no reconnection)
        } else {
            self.stream.emit('error', 'http', info);
            return this;
        }
        
        function destroySilent() {
            if (typeof self.request.abort === 'function') self.request.abort();
            else self.request.socket.destroy();
        }

        function delay() {
            setTimeout(function() {
                destroySilent();
                self.stream.emit('reconnect', {error: message, attempt: strategy.attempts});
                self.connect();
                if (!self.connected) delay();
            }, strategy.nextWaitTime());
        }
        delay();
    }
    
};


/** EXPORT */
module.exports = Stream;