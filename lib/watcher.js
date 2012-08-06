// watcher.js -- track filesystem state and watch for changes

var Events = require('events'),
	Util = require('util'),
	File = require('./file');


// Watcher
//
// Monitor various file trees in the filesystem, tracking known state
// and state changes.
//
// Declare a `.root()` or `.add()` files, then `.start()`
// watching. Listen for `change` events. Stopping or restarting clears
// added files and rescans the roots.

Util.inherits(Watcher, Events.EventEmitter);
function Watcher(base) {
	Events.EventEmitter.call(this);

	this.base = File.file(base || process.cwd());
	this.alive = false;
	this.roots = {};
	this.watching = {};
}

// .root
//
// Delare a root path to monitor. When the watcher starts, it's
// scanned recursively and added to the watched set.

Watcher.prototype.root = function(path) {
	var root = this.base.resolve(path);
	if (root.path in this.roots)
		return this;

	this.roots[root.path] = true;
	return this.add(root.path);
};

// .root
//
// Add a file to the watched set. Folders are scanned recursively and
// symlinks are traversed.

Watcher.prototype.add = function(path) {
	var add = File.resolve(this.base, path);
	if (!this.alive || add.path in this.watching)
		return this;

	var self = this;
	add.walk(function(err, file) {
		if (err) {
			self.emit('error', err, file);
			return false;
		}
		else if (!self.alive || file.path in self.watching)
			return false;
		else
			return self.watch(file);
	});

	return this;
};

// .start
//
// Start watching, add roots to the watched set.

Watcher.prototype.start = function() {
	if (this.alive) return this;

	this.alive = true;
	for (var path in this.roots) {
		this.add(path);
	}

	return this;
};

// .stop
//
// Stop watching, clear the watched set.

Watcher.prototype.stop = function() {
	if (!this.alive) return this;

	var dead = this.watching;
	this.alive = false;
	this.watching = {};

	for (var name in dead) {
		dead[name].close();
	}

	return this;
};

// .restart
//
// Clear the watched set and rescan the roots.

Watcher.prototype.restart = function() {
	if (this.alive)
		this.stop().start();
	return this;
};

Watcher.prototype.watch = function(file) {
	var self = this, watcher;

	watcher = File.watch(file)
		.on('changed', function(type) {
			self.changed(type, file, watcher);
		})
		.on('deleted', function() {
			if (self.watching[file.path] === watcher) {
				delete self.watching[file.path];
			}
		});

	if (watcher)
		self.watching[file.path] = watcher;

	return this;
};

Watcher.prototype.changed = function(type, file, watcher) {
	if (this.watching[file.path] === watcher)
		this.emit('change', type, file);
	return this;
};


// ## Exports ##

module.exports = Watcher;
