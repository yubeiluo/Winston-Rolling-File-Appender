Another-Winston-Rolling-File-Appender
=============================

This repo is forked from the repo [Winston-Rolling-File-Appender](https://github.com/mallocator/Winston-Rolling-File-Appender) per the below Rationale section.

# Rationale

1. Per the issue [Losing log messages](https://github.com/winstonjs/winston/issues/567) and my personal experience, when using the official **DailyFileTransport**, some messages will get lost and fail to appear in the log file.

2. After trying out what is described in  [Winston-Rolling-File-Appender](https://github.com/mallocator/Winston-Rolling-File-Appender), the issue still persists, so I decided to hand craft my own version.

# Introduction

A rolling file transport for the logging library winston for node.js.
This transport has been modified from [Winston-Rolling-File-Appender](https://github.com/mallocator/Winston-Rolling-File-Appender)  to create a log file for each day.

If configured with my.log as filename, the generated files will be for example:

	my.2012-08-01.log
	my.2012-08-02.log
	my.2012-08-03.log
	...
	my.2012-08-10.log
	my.log ( -> symbolic link to latest log file)

The transport has been used and tested on Linux and Mac machines. No idea if this works on windows.

# Usage

```javascript
var winston = require('winston');
	, RollingFile = require('another-rolling-file-transport');

var logger = new winston.Logger();

var options = {
	filename : '/path/to/my/filename.log',	// files will use filename.<date>.log for all files
	level : 'info',							// Set your winston log level, same as original file transport
	timestamp : true,						// Set timestmap format/enabled, Same ass original file transport
	maxFiles : 10,							// How many days to keep as back log
	json : false							// Store logging data ins json format
};

logger.add(RollingFile, options);
```

# Install

For [node.js](http://nodejs.org/) and [npm](https://npmjs.org), run the "npm install" to provision this package in your app.

	npm install git@github.com:yubeiluo/Winston-Rolling-File-Appender.git --save
