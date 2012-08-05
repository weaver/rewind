// file.js -- capture file state and traverse filesytem

var Fs = require('fs'),
	Path = require('path');


// ## Shortcuts ##

function file(path) {
	return (path instanceof File) ? path : new File(path);
}

function path(file) {
	return (file instanceof File) ? file.path : file;
}

function resolve(base, path) {
	return (path instanceof File) ? path : file(base).resolve(path);
}


// ## File ##

// File
//
// A file snapshot at a point in time. It encapsulates a file's path,
// lstat info, and possibly directory or link information.

function File(path, stats) {
	this.path = path;
	this.stats = stats;
}

File.prototype.isDirectory = function() {
	return this.stats && this.stats.isDirectory();
};

File.prototype.isSymbolicLink = function() {
	return this.stats && this.stats.isSymbolicLink();
};

File.prototype.lstat = function(next) {
	return this._memo(Fs.lstat, 'stats', next);
};

File.prototype.readlink = function(next) {
	return this._memo(Fs.readlink, 'link', next);
};

File.prototype.readdir = function(next) {
	return this._memo(readdir, 'dir', next);
};

File.prototype.resolve = function(name) {
	return new File(Path.resolve(this.path, name));
};

// .walk
//
// Traverse the file tree in depth-first order starting with this
// file. If `fn` returns `false`, don't traverse that subtree.

File.prototype.walk = function(fn) {
	walkFile(this, fn);
	return this;
};

// .changed
//
// Check whether a file has changed since the this point in time. The
// `next` procedure has the form `function(error, newer)` where
// `newer` is a different File object if the file has changed. If the
// file has been deleted, `newer` will be `null`.

File.prototype.changed = function(next) {
	var self = this;

	Fs.lstat(this.path, function(err, stats) {
		if (err && err.code === 'ENOENT')
			next(null, null);
		else if (err || !statsChanged(self.stats, stats))
			next(err);
		else
			verify(new File(self.path, stats));
	});

	function verify(newer) {
		if (!self.isDirectory())
			next(null, newer);
		else
			newer.readdir(function(err) {
				if (err && err.code === 'ENOENT')
					next(null, null);
				else if (err || !dirChanged(self.dir, newer.dir))
					next(err);
				else
					next(null, newer);
			});
	}

	return this;
};

File.prototype._memo = function(what, name, next) {
	var self = this;

	if (this[name])
		process.nextTick(function() {
			next(null, self[name], self);
		});
	else
		what(this.path, function(err, obj) {
			self[name] = obj;
			next(err, obj, self);
		});

	return this;
};


// ## Watch ##

// watch
//
// A light wrapper around Node's FSWatcher that ignores non-essential
// change events.

function watch(path, onChanged) {
	var target = file(path),
		watcher;

	try {
		watcher = Fs.watch(target.path);
		watcher.file = target;
		watcher.on('change', function(type) {
			verify.call(this, type);
		});
	} catch (err) {
		if (err.code == 'ENOENT')
			watcher = null;
		else
			throw err;
	}

	if (onChanged) {
		watcher.on('changed', onChanged);
	}

	return watcher;
}

// verify
//
// When an FSWatcher emits a change, verify that the file has actually
// changed in a meaningful way.

function verify(type) {
	var watcher = this,
		original = watcher.file;

	original.changed(function(err, change) {
		if (err)
			watcher.emit('error', err);
		else if (change === null) {
			watcher.close();
			watcher.emit('deleted', original);
		}
		else if (change) {
			watcher.file = change;
			watcher.emit('changed', type, change, original);
		}
	});
}


// ## Traversal ##

// Walk over the filesystem, calling `fn` with a File for each node
// encountered in the tree. If `fn` returns `false`, don't descend
// into the node.

function walk(path, fn) {
	walkFile(file(path), fn);
}

function walkFile(file, fn) {
	file.lstat(function(err) {
		if (err && err.code == 'ENOENT')
			return;
		else if (err || fn(err, file) === false)
			return;
		else if (file.isDirectory())
			walkDirectory(file, fn);
		else if (file.isSymbolicLink())
			walkLink(file, fn);
	});
}

function walkDirectory(file, fn) {
	file.readdir(function(err, dir) {
		if (err && err.code == 'ENOENT')
			return;
		else if (err)
			fn(err, file);
		else
			dir.forEach(function(name) {
				walkFile(file.resolve(name), fn);
			});
	});
}

function walkLink(file, fn) {
	file.readlink(function(err, target) {
		if (err && err.code == 'ENOENT')
			return;
		else if (err)
			fn(err, file);
		else
			walkFile(file.resolve(target), fn);
	});
}


// ## Helpers ##

// statsChanged
//
// This helper for File.changed determines whether the Stats `now` is
// meaninfully different than the Stats `was`. Notice, in particular,
// that `mode` and `atime` are ignored.

function statsChanged(was, now) {
	return was !== now
		&& ((was && !now) || (now && !was)
			|| was.size !== now.size
			|| was.mtime.getTime() !== now.mtime.getTime()
			|| was.ctime.getTime() !== now.ctime.getTime());
}

// dirChanged
//
// Compare directory listings to determine if a meaningful change
// happened.

function dirChanged(was, now) {
	if (was.length !== now.length)
		return true;

	for (var idx in was) {
		if (was[idx] !== now[idx])
			return true;
	}

	return false;
}

// included
//
// Include only some files in a directory listing.

var IGNORE = {
	'.swp': 'Vi swap file',
	'.swo': 'Vi swap file'
};

function included(name) {
	return !(name.match(/^\.#|~$/) || Path.extname(name) in IGNORE);
}

// readdir
//
// Exclude ignored files from `Fs.readdir`.

function readdir(path, next) {
	return Fs.readdir(path, function(err, dir) {
		err ? next(err) : next(null, dir.filter(included));
	});
}

// ## Exports ##

exports.file = file;
exports.path = path;
exports.resolve = resolve;
exports.File = File;
exports.watch = watch;
exports.walk = walk;