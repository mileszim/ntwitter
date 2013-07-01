var events = require('events');

var StreamParser = require('./parser.js');
var Backoff      = require('./backoff.js');
var Constants    = require('./constants.js');


var Stream = function(request) {
    this.request = request;
    this.stream  = new StreamParser();
    
    this.handler = new events.EventEmitter();
    
    this.connected  = false;
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
        
        // Other http error from twitter (exponential backoff)
        } else if (type==='http' && Constants.http_codes[info]) {
            strategy = new Backoff.http();
            message  = "HTTP Error";
        }

        function delay() {
            setTimeout(function() {
                console.log(message + ": Reconnect attempt " + strategy.attempts);
                self.connect();
                if (!self.connected) delay();
            }, strategy.nextWaitTime());
        }
        delay();
    }
    
};


/** EXPORT */
module.exports = Stream;