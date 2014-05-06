var events = require('events');

var StreamParser = require('./parser.js');
var Backoff      = require('./backoff.js');
var Constants    = require('./constants.js');
var Utilities    = require('./utilities.js');


/**
 * Stream
 * Manages the stream, and delegates errors to appropriate backoff strategies.
 * 
 * @param {object} oauth          The OAuth object to create new requests
 * @param {object} request_params A hash of the request parameters
 * @constructor
 */
var Stream = function(oauth, request_params) {
    this.oauth = oauth;
    this.request_params = request_params;
    
    this.stream  = new StreamParser();
    this.handler = new events.EventEmitter();
    
    this.connected      = false;
    this.handling_error = false;
};

Stream.prototype = {
    
    /**
     * Starts the initial connection when Twat stream is opened
     */
    initialize: function() {
        this.controller();
        this.connect();
    },
    
    
    
    /**
     * Establishes connection to the twitter streaming API.
     * 
     * @fires Handler#error
     * @fires Stream#receive
     * @fires Stream#end
     * @fires Stream#destroy
     */
    connect: function() {
        var self = this;
        
        // Make the request
        self.request = self.oauth.post(
            self.request_params.url,
            self.request_params.access_token,
            self.request_params.access_token_secret,
            self.request_params.params,
            self.request_params.nil
        );
        self.request.setTimeout(Constants.SOCKET_TIMEOUT);
        
        self.request.on('response', function(response) {
            
            // Error from twitter
            if (response.statusCode > 200) {
                /**
                 * HTTP error received from twitter during request
                 *
                 * @event Handler#error
                 */
                self.handler.emit('error', 'http', response.statusCode);
                
            } else {
                self.handling_error = false;
                self.connected = true;
                clearTimeout(self.delay_timeout);
                
                // Valid tweet
                response.on('data', function(chunk) {
                    /**
                     * Raw tweet data received
                     *
                     * @event Stream#receive
                     */
                    self.stream.receive(chunk);
                });
                
                // Handle error
                response.on('error', function(error) {
                    /**
                     * HTTP error received from twitter during response
                     *
                     * @event Handler#error
                     */
                    self.handler.emit('error', error);
                });
                
                // Close stream request from twitter server
                response.on('end', function() {
                    /**
                     * Request to close stream received from twitter
                     *
                     * @event Stream#end
                     */
                    self.stream.emit('end', response);
                });

                // This is a net.Socket event.
                // When Twat closes the connection no 'end/error' event is fired.
                // In this way we can able to catch this event and force to destroy the 
                // socket. So, 'stream' object will fire the 'destroy' event as we can see above.
                response.on('close', function() {
                    if (typeof self.request.abort === 'function') self.request.abort();
                    else self.request.socket.destroy();
                    
                    /**
                     * Socket close event
                     * 
                     * @event Stream#destroy
                     */
                    self.stream.emit('destroy', 'the socket has been destroyed');
                });
            }
        });
        
        // Connection Timeout
        self.request.on('timeout', function() {
            self.handler.emit('error', 'network', 'timeout');
        });
        
        // Error from network
        self.request.on('error', function(error) {
            /**
             * Network error during request
             *
             * @event Handler#error
             */
            self.handler.emit('error', 'network', error);
        });
        
        self.request.end();
    },
    
    
    
    /**
     * Manages delegation of tweets and errors
     */
    controller: function() {
        var self = this;
        
        // Error
        self.handler.addListener('error', function(type, info) {
            if (!self.handling_error) {
                self.backoff(type, info);
            }
        });
        
        // Data
        self.stream.addListener('_data', function(tweet) {
            Utilities.processTweet(tweet, self.stream);
        });
        
        // Destroy
        self.stream.addListener('destroy', function() {
            self.destroy();
        });
    },
    
    
    
    /**
     * Selects a backoff strategy according to the error called. Calls Stream#connect until successful.
     * 
     * @param {string}        type The type of error (currently either http or network)
     * @param {number|string} info Either the http error code, or more info about the error
     * @fires Stream#error
     * @fires Stream#reconnect
     */
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
            /**
             * If error cannot be solved through reconnect, notify user
             *
             * @event Stream#error
             */
            self.stream.emit('error', 'http', info);
            return this;
        }
        
        function destroySilent() {
            self.request.removeAllListeners();
            self.request.end();
        }
        
        function delay() {
            self.delay_timeout = setTimeout(function() {
                //if (self.connected) clearTimeout(delay_timeout);
                
                destroySilent();
                /**
                 * Notify user of reconnect attempt
                 *
                 * @event Stream#reconnect
                 */
                self.stream.emit('reconnect', {error: message, attempt: strategy.attempts});
                self.connect();
                if (!self.connected) {
                    delay();
                }
            }, strategy.nextWaitTime());
        }
        delay();
    },
    
    
    
    /**
     * Destroys the current stream
     */
    destroy: function() {
        this.request.removeAllListeners();
        this.request.abort();
    }
    
};


/** EXPORT */
module.exports = Stream;