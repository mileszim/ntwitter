/**
 * Backoff
 * Provides consistent functions for varying backoff strategies according to Twitter guidelines.
 */
var Backoff = {
    
    /**
     * "Back off linearly for TCP/IP level network errors. These problems are generally
     *   temporary and tend to clear quickly. Increase the delay in reconnects by 250ms 
     *   each attempt, up to 16 seconds."
     */
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
        };
        
        this.nextWaitTime = function() {
            return this.calculateDelay(++this.attempts);
        };
    },
    
    
    
    /**
     * "Back off exponentially for HTTP errors for which reconnecting would be appropriate.
     *   Start with a 5 second wait, doubling each attempt, up to 320 seconds."
     */
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
        };
        
        this.nextWaitTime = function() {
            return this.calculateDelay(++this.attempts);
        };
    },
    
    
    
    /**
     * "Back off exponentially for HTTP 420 errors. Start with a 1 minute wait and double
     *   each attempt. Note that every HTTP 420 received increases the time you must wait
     *   until rate limiting will no longer will be in effect for your account."
     */
    http420: function() {
        var MS = 60000;
        
        this.attempts = 0;
        
        this.calculateDelay = function(attempts) {
            var delay = MS*Math.pow(2, attempts-1);
            return delay;
        };
        
        this.nextWaitTime = function() {
            return this.calculateDelay(++this.attempts);
        };
    }

};


/** EXPORT */
module.exports = Backoff;