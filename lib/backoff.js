var Backoff = {
    
    network: function() {
        var MAX = 16000;
        var MS  = 250; 
        
        this.attempts = 0;
        
        this.calculateDelay = function(attempts) {
            return MS*attempts;
        }
        
        this.nextWaitTime = function() {
            var delay = this.calculateDelay(++this.attempts);
            if (delay > MAX) {
                return MAX;
            } else {
                return delay;
            }
        }
    },
    
    
    http: function() {
        var MAX = 320000;
        var MS  = 5000;
        
        this.attempts = 0;
        
        this.calculateDelay = function(attempts) {
            return MS*Math.pow(2, attempts-1);
        }
        
        this.nextWaitTime = function() {
            var delay = this.calculateDelay(++this.attempts);
            if (delay > MAX) {
                return MAX;
            } else {
                return delay;
            }
        }
    },
    
    
    http420: function() {
        var MS = 60000;
        
        this.attempts = 0;
        
        this.calculateDelay = function(attempts) {
            return MS*Math.pow(2, attempts-1);
        }
        
        this.nextWaitTime = function() {
            var delay = this.calculateDelay(++this.attempts);
            if (delay > MAX) {
                return MAX;
            } else {
                return delay;
            }
        }
    }
    
    
    
};


module.exports = Backoff;