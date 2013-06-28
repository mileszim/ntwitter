var events = require('events');

var StreamParser = require('./parser');


var Stream = function(request) {
    this.request = request;
    this.stream  = new StreamParser();
    
    this.handler = new events.EventEmitter();
}

Stream.prototype = {
    
    initialize: function() {
        this.monitor();
        this.connect();
    },
    
    connect: function() {
        var self = this;
        self.request.on('response', function(response) {
            if (response.statusCode > 200) {
                // Error from twitter
                self.handler.emit('error', 'http', response.statusCode);
            }
        });
        self.request.end();
    },
    
    
    
    monitor: function() {
        var self = this;
        self.handler.addListener('error', function(type, info) {
            console.log(type);
            console.log(info);
        });
    },
    
    
    backoff: function(type, info) {
        var self = this;
        
        function reconnect(initial_wait, modifier, max) {
            
        }
        
        
        // Error from twitter
        if (type === 'http') {
            switch(info) {
                case 420:
                
                
            }
            
        }
    }
    
};


/** EXPORT */
module.exports = Stream;