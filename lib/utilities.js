var util = require('util');

var Utilities = {
    
    /**
     * Merge objects into the first one.
     * 
     * @return {object} defaults
     */
    merge: function(defaults) {
        for (var i = 1; i < arguments.length; i++) {
            for (var opt in arguments[i]) {
                defaults[opt] = arguments[i][opt];
            }
        }
        return defaults;
    },
    
    
    
    /**
     * Take raw JSON and emit usefully
     *
     * @param {object} tweet  The raw response JSON
     * @param {object} stream The stream to emit to
     */
    processTweet: function(tweet, stream) {
        if (tweet['limit']) {
            stream.emit('limit', tweet['limit']);
        } else if (tweet['delete']) {
            stream.emit('delete', tweet['delete']);
        } else if (tweet['scrub_geo']) {
            stream.emit('scrub_geo', tweet['scrub_geo']);
        } else {
            stream.emit('tweet', tweet);
        }
    },
    
    
    
    /**
     * Gaurantee good array
     */
    definitelyArray: function(input) {
        var return_arr = [];
        if (util.isArray(input)) {
            for (var item in input) {
                return_arr.push(Utilities.safeString(item));
            }
        } else
        if (typeof input === 'string') {
            input = input.split(',');
            for (var item in input) {
                return_arr.push(Utilities.safeString(item));
            }
        }
        return return_arr;
    },
    
    
    
    /**
     * Ensure safe string
     * Converts any integer into string, and strips spaces of strings
     */
    safeString: function(input) {
        var return_string = '';
        if (typeof input === 'number') {
            return_string = parseInt(input, 10);
        } else
        if (typeof input === 'string') {
            return_string = input.trim();
        }
        return return_string;
    }
    
};


/** EXPORT */
module.exports = Utilities;