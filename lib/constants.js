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
    VERSION: '0.0.1'
};


/**
 * EXPORT
 */
module.exports = Constants;