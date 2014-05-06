var EventEmitter = require('events').EventEmitter;


/**
 * Parser
 * @author AvianFlu
 * 
 * Glorious streaming json parser, built specifically for the twitter streaming api.
 * Assumptions:
 * <ol>
 *   <li>ninjas are mammals</li>
 *   <li>tweets come in chunks of text, surrounded by {}'s, separated by line breaks</li>
 *   <li>only one tweet per chunk</li>
 * 
 * @example
 *   p = new parser.instance();
 *   p.addListener('object', function...);
 *   p.receive(data);
 *   ...
 *
 * @constructor
 */
var Parser = function() {
    // Make sure we call our parents constructor
    EventEmitter.call(this);
    this.buffer = '';
    this.lastTime = null;
    return this;
};


/**
 * @const
 * @type {string}
 */
Parser.END = '\r\n';

/**
 * @const
 * @type {number}
 */
Parser.END_LENGTH = 2;



/**
 * Extend the EventEmitter prototype
 *
 * @extends EventEmitter
 */
Parser.prototype = Object.create(EventEmitter.prototype);



/**
 * Take a data buffer as input and convert it to an object
 *
 * @param {buffer} A data buffer from the stream
 * @fires Parser#_data
 * @fires Parser#error
 */
Parser.prototype.receive = function(buffer) {
    this.lastTime = new Date().getTime();
    this.buffer += buffer.toString('utf8');
    var index, json;

    // We have END?
    while ((index = this.buffer.indexOf(Parser.END)) > -1) {
        json = this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + Parser.END_LENGTH);
        if (json.length > 0) {
            try {
                json = JSON.parse(json);
            } catch (error) {
                
                /**
                 * Emits an error when JSON fails to parse
                 * 
                 * @event Parser#error
                 * @type {error}
                 */
                this.emit('error', new Error('Invalid JSON - ', error.message));
            }
            
            /**
             * Emits the parsed JSON object
             * 
             * @event Parser#_data
             * @type {object}
             */
            this.emit('_data', json);
        }
    }
};



/**
 * Destroys the current stream
 */
Parser.prototype.destroy = function() {
    this.emit('destroy');
};


/** EXPORT */
module.exports = Parser;