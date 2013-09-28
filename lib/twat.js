var http  = require('http');
var oauth = require('oauth');
var util  = require('util');
var querystring = require('querystring');

var Utilities = require('./utilities.js');
var Constants = require('./constants.js');
var Stream    = require('./stream.js');


/**
 * Twat
 * Provides simple connection and automatic management of twitter streams
 * @author Miles Zimmerman
 *
 * Forked from ntwitter by AvianFlu at https://github.com/AvianFlu/ntwitter
 *
 * @param {object} options A hash of the twitter API credentials
 * @constructor
 */
var Twat = function(options) {
    if (!(this instanceof Twat)) return new Twat(options);

    var defaults = {
        // API Credentials
        consumer_key:        null,
        consumer_secret:     null,
        access_token:        null,
        access_token_secret: null,
        
        // Connection headers
        headers: {
            'Accept': '*/*',
            'Connection': 'close',
            'User-Agent': 'Twat/' + Constants.VERSION
        }
    };
    
    this.options = Utilities.merge(defaults, options, Constants.urls);

    // Create OAuth client
    this.oauth = new oauth.OAuth(
        this.options.request_token_url,
        this.options.access_token_url,
        this.options.consumer_key,
        this.options.consumer_secret,
        '1.0A', null, 'HMAC-SHA1', null, 
        this.options.headers
    );
};


Twat.prototype = {
    
    /**
     * POST
     * Makes an OAuth post request and acts accordingly to the response
     *
     * @param {string}        url          Url for request
     * @param {object|string} content      Query data for request
     * @param {string}        content_type The type of the content
     * @param {function}      callback     The response callback function
     */
    _post: function(url, content, content_type, callback) {
        var self = this;
        
        if (typeof content === 'function') {
            callback = content;
            content = null;
            content_type = null;
        } else if (typeof content_type === 'function') {
            callback = content_type;
            content_type = null;
        }

        if (typeof callback !== 'function') {
            throw new Error('FAIL: INVALID CALLBACK.');
        }

        if (url.charAt(0) === '/') url = this.options.rest_base + url;

        // Workaround: oauth + booleans == broken signatures
        if (content && typeof content === 'object') {
            Object.keys(content).forEach(function(e) {
                if (typeof content[e] === 'boolean') content[e] = content[e].toString();
            });
        }

        this.oauth.post(
            url,
            self.options.access_token,
            self.options.access_token_secret,
            content, content_type,
            
            function(error, data) {
                if (error && error.statusCode) {
                    var err = new Error('HTTP Error ' + error.statusCode + ': ' + http.STATUS_CODES[error.statusCode] + ', API message: ' + error.data);
                    err.data = error.data;
                    err.statusCode = error.statusCode;
                    callback(err);
                } else if (error) {
                    callback(error);
                } else {
                    var json;
                    try {
                        json = JSON.parse(data);
                    } catch (err) {
                        return callback(err);
                    }
                    callback(null, json);
                }
            }
        );
        return this;
    },
    
    
    
    /**
     * GET
     * Makes an OAuth get request and acts accordingly to the response
     *
     * @param {string}        url          Url for request
     * @param {object|string} content      Query data for request
     * @param {function}      callback     The response callback function
     */
    _get: function(url, content, callback) {
        var self = this;
        
        if (typeof content === 'function') {
            callback = content;
            content = null;
        }

        if (typeof callback !== 'function') {
            throw new Error('FAIL: INVALID CALLBACK.');
        }

        if (url.charAt(0) === '/') url = this.options.rest_base + url;

        // Convert content into query
        if (content && typeof content === 'object') {
            if (content && typeof content === 'object') {
                url += "?"+querystring.stringify(content);
            } else
            if (content && typeof content === 'string') {
                url += "?"+content;
            }
        }
                
        this.oauth.get(
            url,
            self.options.access_token,
            self.options.access_token_secret,
            
            function(error, data) {
                if (error && error.statusCode) {
                    var err = new Error('HTTP Error ' + error.statusCode + ': ' + http.STATUS_CODES[error.statusCode] + ', API message: ' + error.data);
                    err.data = error.data;
                    err.statusCode = error.statusCode;
                    callback(err);
                } else if (error) {
                    callback(error);
                } else {
                    var json;
                    try {
                        json = JSON.parse(data);
                    } catch (err) {
                        return callback(err);
                    }
                    callback(null, json);
                }
            }
        );
        return this;
    },
    
    
    
    /**
     * Get User information
     */
    user: function(id_or_screen_name, callback) {
        var params = {};
        
        if (typeof id_or_screen_name === 'string' && /^\d+$/.test(id_or_screen_name)) {
            params[user_id] = id_or_screen_name;
        } else
        if (typeof id_or_screen_name === 'string') {
            params[screen_name] = id_or_screen_name;
        } else
        if (typeof id_or_screen_name === 'number') {
            params[user_id] = parseInt(id_or_screen_name, 10);
        }
        
        this._get(Constants.urls.rest_base + Constants.rest.users.show, params, function(error, response) {
            callback(error, response);
        });
        
    },
    
    
    
    /**
     * STREAM
     * Creates a new instance of Stream based on the input parameters
     *
     * @param {string} method     The type of stream (user, site, default: public)
     * @param {object} params     The stream parameters object
     * @param {function} callback The stream callback function
     */
    stream: function(method, params, callback) {
        var self = this;
        
        if (typeof params === 'function') {
            callback = params;
            params = null;
        }

        // Iterate on params properties
        // If any property is an array, convert it to comma-delimited string
        // If any user in follow is screen_name, query and convert to user_id
        if (params) {
            Object.keys(params).forEach(function(item) {
                params[item] = Utilities.definitelyArray(params[item]);
                if (item === 'follow') {
                   for (var value in params[item]) {
                       if (/^\d+$/.test(params[item][value])) {
                           params[item][value] = self.user(params[item][value])
                       }
                   }
                }
                params[item] = params[item].join(',');
            });
        }

        var stream_base = this.options.stream_base;

        // Stream type customisations
        if (method === 'user') {
            stream_base = this.options.user_stream_base;
        } else if (method === 'site') {
            stream_base = this.options.site_stream_base;
        }


        var url = stream_base + '/' + escape(method) + '.json';

        // Set request params
        var request_params = {
            url: url,
            access_token: this.options.access_token,
            access_token_secret: this.options.access_token_secret,
            params: params,
            nil: null
        };

        // Start the stream
        var stream = new Stream(this.oauth, request_params);
        stream.initialize();    


        if (typeof callback === 'function') callback(stream.stream);
        return this;
    }
    
};


/** EXPORT */
module.exports = Twat;