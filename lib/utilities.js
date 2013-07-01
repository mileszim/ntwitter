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
    }
    
};


/** EXPORT */
module.exports = Utilities;