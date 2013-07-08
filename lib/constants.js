var Constants = {
    
    /**
     * A hash of endpoint URLs
     * @constant
     * @type {object}
     */
    urls: {
        request_token_url: 'https://api.twitter.com/oauth/request_token',
        access_token_url: 'https://api.twitter.com/oauth/access_token',
        authenticate_url: 'https://api.twitter.com/oauth/authenticate',
        authorize_url: 'https://api.twitter.com/oauth/authorize',
        rest_base: 'https://api.twitter.com/1.1',
        search_base: 'http://search.twitter.com',
        stream_base: 'https://stream.twitter.com/1.1',
        user_stream_base: 'https://userstream.twitter.com/1.1',
        site_stream_base: 'https://sitestream.twitter.com/1.1'
    },
    
    
    /**
     * The version constant
     * @constant
     * @type {string}
     */
    VERSION: '0.8.5',
    
    
    /**
     * HTTP codes that should reconnect (besides 420)
     * @constant
     * @type {object}
     */
    http_codes: {
        403: true,
        404: true,
        503: true
    },
    
    
    /**
     * TCP socket timeout length (From twitter guidelines)
     * @constant
     * @type {number}
     */
    SOCKET_TIMEOUT: 90000
};


/** EXPORT */
module.exports = Constants;