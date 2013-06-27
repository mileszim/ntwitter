/**
 * Utils
 * @constructor
 */
var Utils = function() {}


Utils = {
    
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
    }
    
};


/**
 * EXPORT
 */
module.exports = Utils;