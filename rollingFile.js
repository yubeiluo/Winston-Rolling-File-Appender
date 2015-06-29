/**
 * Rolling file transport forked from https://github.com/mallocator/Winston-Rolling-File-Appender.
 *
 * The built in DailyFileTransport have message loss issues per described in https://github.com/winstonjs/winston/issues/567,
 * therefore, we need to hand-craft our own version of rolling transport.
 *
 * Created by david on 6/28/15.
 * @author David Yu <davidyu@squarevalleytech.com>
 */

var winston = require('winston')
  , fs = require('fs')
  , path = require('path')
  , util = require('util')
  , Transport = winston.Transport;

function log(options) {
  var timestamp = typeof options.timestamp === 'function' ? options.timestamp() : options.timestamp ? new Date().toString().substr(4, 20) : null;
  var output;

  if (options.json) {
    output = {};
    output.level = options.level;
    output.message = options.message;

    if (timestamp) {
      output.timestamp = timestamp;
    }

    return JSON.stringify(output, function(key, value) {
      if (value instanceof Buffer) { return value.toString('base64'); }
      return value;
    });
  }

  output = timestamp ? timestamp + ' - ' : '';
  output += options.colorize ? config.colorize(options.level) : options.level;
  output += ': ' + options.message;

  return output;
};

var RollingFile = winston.transports.RollingFile = exports.RollingFile = function(options) {
  Transport.call(this, options);

  function throwIf(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function(name) {
      if (options[name]) { throw new Error('Cannot set ' + name + ' and ' + target + 'together'); }
    });
  }

  if (options.filename || options.dirname) {
    throwIf('filename or dirname', 'stream');
    this._filename = this.filename = options.filename ? path.basename(options.filename) : 'winston.log';
    this.dirname = options.dirname ? options.dirname : path.dirname(options.filename);
    this.options = options.options ? options.options : {
      flags : 'a'
    };
  } else {
    throw new Error('Cannot log to file without filename or stream.');
  }
  if (options.checkPermissions === null)
    options.checkPermissions = true;

  if (options.checkPermissions) {
    function canWrite(owner, inGroup, mode) {
      return owner && mode & 00200 || inGroup && mode & 00020 || mode & 00002;
    }
    var stat = fs.statSync(this.dirname);
    if (!canWrite(process.getuid() === stat.uid, process.getgid() === stat.gid, stat.mode)) {
      throw new Error('Cannot create logs in directory "' + this.dirname + '"');
    }
  }
  this.json = options.json !== false;
  // this flag marks wthether a symbolic link is desired or not, defaul is true
  this.symbolicLink = options.symboliclink !== false;
  this.colorize = options.colorize || false;
  this.maxFiles = options.maxFiles ? options.maxFiles : 10;
  this.timestamp = typeof options.timestamp !== 'undefined' ? options.timestamp : false;
  this._buffer = [];

  this._ext = path.extname(this._filename);
  this._basename = path.basename(this._filename, this._ext);
  this._oldFilesRegEx = new RegExp(this._basename + '\\.[0-9\\-]*\\.' + this._ext.substr(1));
};

// Inherit from `winston.Transport`.
util.inherits(RollingFile, Transport);

// Expose the name of this Transport on the prototype
RollingFile.prototype.name = 'rollingFile';

// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
RollingFile.prototype.log = function(level, msg, meta, callback) {
  if (this.silent) { return callback(null, true); }

  var output = log({
      level : level,
      message : msg,
      meta : meta,
      json : this.json,
      colorize : this.colorize,
      timestamp : this.timestamp
    }) + '\n';

  this._write(output);
  callback(null, true);
};

/**
 * The main function to write the message.
 */
RollingFile.prototype._write = function(output) {
  var currentLogFilePath = this._currentLogFilePath
    , newLogFilePath = path.join(this.dirname, this.getCurrentLogFileName())
    , logFilePathChanged = false;

  if ( !currentLogFilePath || newLogFilePath !== currentLogFilePath ) {
    this._currentLogFilePath = newLogFilePath;
    logFilePathChanged = true;
  }

  fs.appendFileSync(this._currentLogFilePath, output);
  if ( logFilePathChanged ) {
    this._createLink(this._currentLogFilePath);
    this._cleanOldFiles();
  }

};

/**
 * Create the symbolic link if desired.
 * @params {String} target - the target file to be symbolic linked against.
 * @private
 */
RollingFile.prototype._createLink = function(target) {
  if ( !this.symbolicLink ) return;

  var linkFilePath = path.join(this.dirname, this._basename + this._ext)
    , linkName = path.basename(linkFilePath)
    , targetName = path.basename(target)
    , exists = fs.existsSync(linkFilePath)
    , create = true;

  if ( exists ) {
    var oldTargetName = fs.readlinkSync(linkFilePath);
    if ( oldTargetName != targetName ) {
      console.log('removing old link %s => %s', linkName, oldTargetName);
      fs.unlinkSync(linkFilePath);
    } else {
      create = false;
    }
  }

  if ( create ) {
    console.log('creating link %s => %s', linkName, targetName);
    fs.symlinkSync(targetName, linkFilePath);
  }
};

/**
 * Get the current log file name
 * @returns {String}
 */
RollingFile.prototype.getCurrentLogFileName = function() {
  var todayString = new Date().toISOString().substr(0, 10)

  return util.format("%s.%s%s", this._basename, todayString, this._ext);
};

/**
 * Only keep {maxFiles} in the log directory by cleaning the old files
 * @private
 */
RollingFile.prototype._cleanOldFiles = function() {
  var whitelist = {}
    , maxFiles = this.maxFiles
    , date = new Date();

  for ( var i = 0; i < maxFiles; i++) {
    var filename = this._basename + '.' + date.toISOString().substr(0, 10) + this._ext;
    whitelist[filename] = true;
    date.setDate(date.getDate() - 1);
  }

  var files = fs.readdirSync(this.dirname);
  if ( !files ) {
    console.log('No (log) files found, probably permissions problem on directory');
    return;
  }

  var self = this;
  files.forEach(function(file) {
    if (self._oldFilesRegEx.test(file) && !whitelist[file]) {
      console.log('removing old file %s', file);
      fs.unlinkSync(path.join(self.dirname, file));
    }
  });

};