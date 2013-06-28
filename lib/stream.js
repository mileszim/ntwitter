var events = require('events');

var StreamParser = require('./parser');


var Stream = function(request) {
    this.request = request;
    this.stream  = new StreamParser();
}

Stream.prototype = {
    
    connect: function() {
        var self = this;
        this.request.on('response', function(response) {
            if (response.statusCode > 200) {
                self.stream.destroySilent();
                self.stream.emit('error', 'http', response.statusCode);
            }
        });
    },
    
    
    
    monitor: function() {
        
    }
    
};