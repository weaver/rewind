// monitor.js -- spawn and monitor a node subprocess

var Events = require('events'),
	Util = require('util'),
	Child = require('child_process'),
	Path = require('path'),
	assert = require('assert'),
	Watcher = require('./watcher');


// monitor
//
// Spawn a Node subprocess with main module `path` and arguments
// `argv`. All modules loaded by the subprocess are monitored for
// changes.
//
// When a change happens, terminate the subprocess with a SIGHUP and
// spawn a new one. If the subprocess exits non-zero, wait for a
// module to change before respawning.
//
// Options:
//
// + watch :: an Array of additional files or folders to monitor
//
// Returns a Monitor instance.

function monitor(path, argv, opt) {
	return new Monitor(path, argv, opt).start();
}


// Monitor
//
// Encapsulate the parameters to spawn a node subprocess. When
// started, monitor dependencies and restart the subprocess as
// necessary.
//
// Call `.start()` to spawn a subprocess and start monitoring.

Util.inherits(Monitor, Events.EventEmitter);
function Monitor(path, argv, opt) {
	assert(typeof path === 'string', 'path must be a string');
	argv = [Path.resolve(path)].concat(argv || []);
	opt = opt || {};

	Events.EventEmitter.call(this);

	this.path = require.resolve('./run');
	this.name = Path.basename(argv[0]);
	this.argv = argv;
	this.alive = false;

	var self = this;
	this.files = new Watcher()
		.on('change', function(type, file) {
			self.changed(file);
		});

	if (opt.watch) {
		opt.watch.forEach(function(path) {
			self.files.root(path);
		});
	}
}

// .start
//
// Spawn a subprocess, begin monitoring.

Monitor.prototype.start = function() {
	if (!this.alive) {
		this.alive = true;
		this.emit('start');
		this.restart();
	}
	return this;
};

// .stop
//
// Issue a SIGKILL to terminate the subprocess, stop monitoring.

Monitor.prototype.stop = function() {
	if (this.alive) {
		this.alive = false;
		this.files.stop();
		this.emit('stop');
	}

	if (this.child)
		this.restart('SIGKILL');

	return this;
};

// .isRunning
//
// Is there an active subprocess?

Monitor.prototype.isRunning = function() {
	return this.child != null;
};

Monitor.prototype.changed = function(file) {
	if (!this.alive)
		return this;

	this.emit('change', file);
	return this.restart();
};

Monitor.prototype.restart = function() {
	this.files.stop();
	return this.spawn();
};

Monitor.prototype.spawn = function(signal) {
	var self = this;

	signal = signal || 'SIGHUP';

	if (this.child) {
		this.emit('kill', signal);
		this.child.kill(signal);
		return this;
	}
	else if (!this.alive) {
		return this;
	}

	this.emit('spawn');
	this.files.start();
	this.child = Child.fork(this.path, this.argv)
		.on('message', function(obj) {
			if (obj.type == 'load')
				self.files.add(obj.path);
		})
		.on('exit', function(code, signal) {
			self.child = null;
			self.emit('exit', code, signal);
			if (signal === 'SIGHUP') {
				self.restart();
			}
			else if (code === 0) {
				self.stop();
			}
		});

	return this;
};


// ## Exports ##

exports.monitor = monitor;

