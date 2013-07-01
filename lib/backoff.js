var Backoff = {
    
    network: function() {
        var MAX = 16000;
        var MS  = 250; 
        
        this.attempts = 0;
        
        this.calculateDelay = function(attempts) {
            var delay = MS*attempts;
            if (delay > MAX) {
                return MAX;
            } else {
                return delay;
            }
        }
        
        this.nextWaitTime = function() {
            return this.calculateDelay(++this.attempts);
        }
    },
    
    
    http: function() {
        var MAX = 320000;
        var MS  = 5000;
        
        this.attempts = 0;
        
        this.calculateDelay = function(attempts) {
            var delay = MS*Math.pow(2, attempts-1);
            if (delay > MAX) {
                return MAX;
            } else {
                return delay;
            }
        }
        
        this.nextWaitTime = function() {
            return this.calculateDelay(++this.attempts);
        }
    },
    
    
    http420: function() {
        var MS = 60000;
        
        this.attempts = 0;
        
        this.calculateDelay = function(attempts) {
            var delay = MS*Math.pow(2, attempts-1);
            if (delay > MAX) {
                return MAX;
            } else {
                return delay;
            }
        }
        
        this.nextWaitTime = function() {
            return this.calculateDelay(++this.attempts);
        }
    }
    
    
    
};


module.exports = Backoff;