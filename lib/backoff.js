/**
 * Backoff
 * Provides consistent functions for varying backoff strategies according to Twitter guidelines.
 */
var Backoff = function(type) {
    
    this.attempts = 0;

    this.nextWaitTime = function() {
        return this.calculateDelay(++this.attempts);
    };
    
    this.calculateDelay = strategies[type].calculateDelay();
  
  
    var strategies = {

        /**
         * "Back off linearly for TCP/IP level network errors. These problems are generally
         *   temporary and tend to clear quickly. Increase the delay in reconnects by 250ms 
         *   each attempt, up to 16 seconds."
         */
        'network': {
            MAX: 16000,
            MS: 250, 
            
            calculateDelay: function(attempts) {
                var delay = strategies['network'].MS*attempts;
                if (delay > strategies['network'].MAX) {
                    return strategies['network'].MAX;
                } else {
                    return delay;
                }
            }
        },


        /**
         * "Back off exponentially for HTTP errors for which reconnecting would be appropriate.
         *   Start with a 5 second wait, doubling each attempt, up to 320 seconds."
         */
        'http': {
            MAX: 320000,
            MS: 5000,

            calculateDelay: function(attempts) {
                var delay = strategies['http'].MS*Math.pow(2, attempts-1);
                if (delay > strategies['http'].MAX) {
                    return strategies['http'].MAX;
                } else {
                    return delay;
                }
            }
        },


        /**
         * "Back off exponentially for HTTP 420 errors. Start with a 1 minute wait and double
         *   each attempt. Note that every HTTP 420 received increases the time you must wait
         *   until rate limiting will no longer will be in effect for your account."
         */
        'http420': {
            MS: 60000,

            calculateDelay: function(attempts) {
                var delay = strategies['http420'].MS*Math.pow(2, attempts-1);
                return delay;
            }
        }

    };  
};
 
 



/** EXPORT */
module.exports = Backoff;