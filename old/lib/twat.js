var http  = require('http');
var oauth = require('oauth');
var util  = require('util');

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
    post: function(url, content, content_type, callback) {
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
            this.options.access_token_key,
            this.options.access_token_secret,
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
     * STREAM
     * Creates a new instance of Stream based on the input parameters
     *
     * @param {string} method     The type of stream (user, site, default: public)
     * @param {object} params     The stream parameters object
     * @param {function} callback The stream callback function
     */
    stream: function(method, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = null;
        }

        // Iterate on params properties, if any property is an array, convert it to comma-delimited string
        if (params) {
            Object.keys(params).forEach(function(item) {
                if (util.isArray(params[item])) {
                    params[item] = params[item].join(',');
                }
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