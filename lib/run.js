// run.js -- run a monitored subprocess

var Module = require('module');


// main
//
// Run the real main program, notifying the parent monitor of
// dependencies as they're loaded.

function main() {
	process.nextTick(runMain);
	onLoad(function(path) {
		process.send({ type: 'load', path: path });
	});
}

// runMain
//
// Splice run.js out of the argv, start the real main program.

function runMain() {
	process.argv.splice(1, 1);
	Module.runMain();
}

// onLoad
//
// Monkey patch Node's module loader to watch for newly loaded
// modules.

function onLoad(fn) {
	var load = Module.prototype.load;

	Module.prototype.load = function(path) {
		fn(path);
		return load.apply(this, arguments);
	};
}


main();