var http = require('http'),
    querystring = require('querystring'),
    oauth = require('oauth'),
    Cookies = require('cookies'),
    Keygrip = require('keygrip'),
    streamparser = require('./parser'),
    util = require('util'),
    utils = require('./utils');
keys = require('./keys');


/**
 * Twat
 * Provides simple connection and automatic management of twitter streams
 * @author Miles Zimmerman
 *
 * Forked from ntwitter by AvianFlu at https://github.com/AvianFlu/ntwitter
 *
 * @param [Hash] options A hash of the twitter API credentials
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
            'User-Agent': 'nTwat/' + VERSION
        },

        secure: false,
        // force use of https for login/gatekeeper
        cookie: 'twauth',
        cookie_options: {},
        cookie_secret: null
    };
    
    this.options = utils.merge(defaults, options, keys.urls);

    // Create OAuth connection
    this.oauth = new oauth.OAuth(
        this.options.request_token_url,
        this.options.access_token_url,
        this.options.consumer_key,
        this.options.consumer_secret,
        '1.0A', null, 'HMAC-SHA1', null, 
        this.options.headers
    );
}


var VERSION = '0.0.1';


Twat.prototype = {
    
    /**
     * GET
     */
    get: function(url, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = null;
        }

        if (typeof callback !== 'function') {
            throw new Error('FAIL: INVALID CALLBACK.');
            return this;
        }

        if (url.charAt(0) == '/') url = this.options.rest_base + url;

        this.oauth.get(
            url + '?' + querystring.stringify(params), 
            this.options.access_token_key, 
            this.options.access_token_secret, 
            
            function(error, data, response) {
                if (error && error.statusCode) {
                    var err = new Error('HTTP Error ' + error.statusCode + ': ' + http.STATUS_CODES[error.statusCode]);
                    err.statusCode = error.statusCode;
                    err.data = error.data;
                    callback(err);
                } else if (error) {
                    callback(error);
                } else {
                    try {
                        var json = JSON.parse(data);
                    } catch (err) {
                        return callback(err);
                    }
                    callback(null, json);
                }
            }
        );
        return this;
    },
    
    
    
    /*
     * POST
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
            return this;
        }

        if (url.charAt(0) == '/') url = this.options.rest_base + url;

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
            
            function(error, data, response) {
                if (error && error.statusCode) {
                    var err = new Error('HTTP Error ' + error.statusCode + ': ' + http.STATUS_CODES[error.statusCode] + ', API message: ' + error.data);
                    err.data = error.data;
                    err.statusCode = error.statusCode;
                    callback(err);
                } else if (error) {
                    callback(error);
                } else {
                    try {
                        var json = JSON.parse(data);
                    } catch (err) {
                        return callback(err);
                    }
                    callback(null, json);
                }
            }
        );
        return this;
    }
    
    
    
    
    
};




/*
 * STREAM
 */
Twat.prototype.stream = function(method, params, callback) {
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

    var stream_base = this.options.stream_base,
        self = this;

    // Stream type customisations
    if (method === 'user') {
        stream_base = this.options.user_stream_base;
    } else if (method === 'site') {
        stream_base = this.options.site_stream_base;
    }


    var url = stream_base + '/' + escape(method) + '.json';

    var request = this.oauth.post(
        url,
        this.options.access_token,
        this.options.access_token_secret,
        params,
        null
    );

    var stream = new streamparser();

    stream.destroySilent = function() {
        if (typeof request.abort === 'function') request.abort(); // node v0.4.0
        else request.socket.destroy();
    };
    stream.destroy = function() {
        // FIXME: should we emit end/close on explicit destroy?
        stream.destroySilent();

        // emit the 'destroy' event
        stream.emit('destroy', 'socket has been destroyed');
    };


    stream.on('_data', processTweet);

    function processTweet(tweet) {
        if (tweet['limit']) {
            stream.emit('limit', tweet['limit']);
        } else if (tweet['delete']) {
            stream.emit('delete', tweet['delete']);
        } else if (tweet['scrub_geo']) {
            stream.emit('scrub_geo', tweet['scrub_geo']);
        } else {
            stream.emit('data', tweet);
        }
    }

    request.on('response', function(response) {

        // Any response code greater then 200 from steam API is an error
        if (response.statusCode > 200) {
            stream.destroySilent();
            stream.emit('error', 'http', response.statusCode);
        } else {
            // FIXME: Somehow provide chunks of the response when the stream is connected
            // Pass HTTP response data to the parser, which raises events on the stream
            response.on('data', function(chunk) {
                stream.receive(chunk);
            });
            response.on('error', function(error) {
                stream.emit('error', error);
            });
            response.on('end', function() {
                stream.emit('end', response);
            });

/* 
       * This is a net.Socket event.
       * When Twat closes the connectionm no 'end/error' event is fired.
       * In this way we can able to catch this event and force to destroy the 
       * socket. So, 'stream' object will fire the 'destroy' event as we can see above.
       */
            response.on('close', function() {
                stream.destroy();
            });
        }
    });
    request.on('error', function(error) {
        stream.emit('error', error);
    });
    request.end();

    if (typeof callback === 'function') callback(stream);
    return this;
}

/*
 * Twat 'O'AUTHENTICATION UTILITIES, INCLUDING THE GREAT
 * CONNECT/STACK STYLE Twat 'O'AUTHENTICATION MIDDLEWARE
 * and helpful utilities to retrieve the twauth cookie etc.
 */
Twat.prototype.cookie = function(req) {
    var keys = null;

    //this make no sense !this.options.cookie_secret return always true or false
    //if ( !this.options.cookie_secret !== null )
    if (this.options.cookie_secret) keys = new Keygrip(this.options.cookie_secret);
    var cookies = new Cookies(req, null, keys)
    var getState = this.options.getState ||
    function(req, key) {
        return cookies.get(key);
    };

    // Fetch the cookie
    try {
        var twauth = JSON.parse(getState(req, this.options.cookie));
    } catch (error) {
        var twauth = null;
    }
    return twauth;
}

Twat.prototype.login = function(mount, success) {
    var self = this,
        url = require('url');

    // Save the mount point for use in gatekeeper
    this.options.login_mount = mount = mount || '/twauth';

    // Use secure cookie if forced to https and haven't configured otherwise
    if (this.options.secure && !this.options.cookie_options.secure) this.options.cookie_options.secure = true;
    // Set up the cookie encryption secret if we've been given one
    var keys = null;
    //the same issue than above
    //if ( !this.options.cookie_secret !== null )
    if (this.options.cookie_secret) keys = new Keygrip(this.options.cookie_secret);
    // FIXME: ^ so configs that don't use login() won't work?
    return function handle(req, res, next) {
        // state
        var cookies = new Cookies(req, res, keys)
        var setState = self.options.setState ||
        function(res, key, value) {
            cookies.set(key, value, self.options.cookie_options);
        };
        var clearState = self.options.clearState ||
        function(res, key) {
            cookies.set(key);
        };

        var path = url.parse(req.url, true);

        // We only care about requests against the exact mount point
        if (path.pathname !== mount) return next();

        // Set the oauth_callback based on this request if we don't have it
        if (!self.oauth._authorize_callback) {
            // have to get the entire url because this is an external callback
            // but it's only done once...
            var scheme = (req.socket.secure || self.options.secure) ? 'https://' : 'http://',
                path = url.parse(scheme + req.headers.host + req.url, true);
            self.oauth._authorize_callback = path.href;
        }

        // Fetch the cookie
        var twauth = self.cookie(req);

        // We have a winner, but they're in the wrong place
        if (twauth && twauth.user_id && twauth.access_token_secret) {
            res.writeHead(302, {
                'Location': success || '/'
            });
            res.end();
            return;

            // Returning from Twat with oauth_token
        } else if (path.query && path.query.oauth_token && path.query.oauth_verifier && twauth && twauth.oauth_token_secret) {
            self.oauth.getOAuthAccessToken(
            path.query.oauth_token, twauth.oauth_token_secret, path.query.oauth_verifier, function(error, access_token_key, access_token_secret, params) {
                // FIXME: if we didn't get these, explode
                var user_id = (params && params.user_id) || null,
                    screen_name = (params && params.screen_name) || null;

                if (error) {
                    // FIXME: do something more intelligent
                    return next(500);
                } else {
                    setState(res, self.options.cookie, JSON.stringify({
                        user_id: user_id,
                        screen_name: screen_name,
                        access_token_key: access_token_key,
                        access_token_secret: access_token_secret
                    }));
                    res.writeHead(302, {
                        'Location': success || '/'
                    });
                    res.end();
                    return;
                }
            });

            // Begin OAuth transaction if we have no cookie or access_token_secret
        } else if (!(twauth && twauth.access_token_secret)) {
            self.oauth.getOAuthRequestToken(

            function(error, oauth_token, oauth_token_secret, oauth_authorize_url, params) {
                if (error) {
                    // FIXME: do something more intelligent
                    return next(500);
                } else {
                    setState(res, self.options.cookie, JSON.stringify({
                        oauth_token: oauth_token,
                        oauth_token_secret: oauth_token_secret
                    }));
                    res.writeHead(302, {
                        'Location': self.options.authorize_url + '?' + querystring.stringify({
                            oauth_token: oauth_token
                        })
                    });
                    res.end();
                    return;
                }
            });

            // Broken cookie, clear it and return to originating page
            // FIXME: this is dumb
        } else {
            clearState(res, self.options.cookie);
            res.writeHead(302, {
                'Location': mount
            });
            res.end();
            return;
        }
    };
}

Twat.prototype.gatekeeper = function(failure) {
    var self = this,
        mount = this.options.login_mount || '/twauth';

    return function(req, res, next) {
        var twauth = self.cookie(req);

        // We have a winner
        if (twauth && twauth.user_id && twauth.access_token_secret) return next();

        // I pity the fool!
        // FIXME: use 'failure' param to fail with: a) 401, b) redirect
        //        possibly using configured login mount point
        //        perhaps login can save the mount point, then we can use it?
        res.writeHead(401, {}); // {} for bug in stack
        res.end(['<html><head>', '<meta http-equiv="refresh" content="1;url=" + mount + "">', '</head><body>', '<h1>Twat authentication required.</h1>', '</body></html>'].join(''));
    };
}


/*
 * CONVENIENCE FUNCTIONS (not API stable!)
 */


Twat.prototype.deleteStatus = Twat.prototype.destroyStatus;



// Account resources
Twat.prototype.verifyCredentials = function(callback) {
    var url = '/account/verify_credentials.json';
    this.get(url, null, callback);
    return this;
}

Twat.prototype.rateLimitStatus = function(callback) {
    var url = '/account/rate_limit_status.json';
    this.get(url, null, callback);
    return this;
}


// Legal resources
// Help resources
// Streamed Tweets resources
// Search resources
// #newTwat
Twat.prototype.getRelatedResults = function(id, params, callback) {
    var url = '/related_results/show/' + escape(id) + '.json';
    this.get(url, params, callback);
    return this;
}

/*
 * INTERNAL UTILITY FUNCTIONS
 */

Twat.prototype._getUsingCursor = function(url, params, callback) {
    var self = this,
        params = params || {},
        key = params.key || null,
        result = [];

    // if we don't have a key to fetch, we're screwed
    if (!key) callback(new Error('FAIL: Results key must be provided to _getUsingCursor().'));
    delete params.key;

    // kick off the first request, using cursor -1
    params = utils.merge(params, {
        cursor: -1
    });
    this.get(url, params, fetch);

    function fetch(err, data) {
        if (err) {
            return callback(err);
        }

        // FIXME: what if data[key] is not a list?
        if (data[key]) result = result.concat(data[key]);

        if (data.next_cursor_str === '0') {
            callback(null, result);
        } else {
            params.cursor = data.next_cursor_str;
            self.get(url, params, fetch);
        }
    }

    return this;
}


/**
 * EXPORT
 */
module.exports = Twat;
