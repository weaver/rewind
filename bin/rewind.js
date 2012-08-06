#!/usr/bin/env node

var Rewind = require('rewind');

function main() {
	var opt = parseArgs(process.argv, 2),
		argv = opt.argv;

	if (!argv.length)
		usage();
	else
		monitor(argv, opt.watch);
}

function usage(reason) {
	console.log("rewind [rewind-options] [node-options] node-args ...");
	console.log("");

	if (reason)
		console.log('Error,', reason);
	else {
		console.log('Options');
		console.log('  -h, --help\t\t about rewind');
		console.log('  -w, --watch <path>\t monitor additional files');
		console.log('');
		console.log('Automatically restart a Node application when files change.');
	}

	process.exit(0);
}

function parseArgs(argv, start) {
	var index, limit, arg, watch = [];

	function next() {
		if (++index < limit)
			return argv[index];
		return usage(argv[index - 1] + ': missing required value');
	}

	for (index = start, limit = argv.length; index < limit; index++) {
		arg = argv[index];
		if (arg.match(/^(-h|--help)$/))
			return usage();
		else if (arg.match(/^(-w|--watch)$/))
			watch.push(next());
		else
			break;
	}

	return {
		watch: watch,
		argv: argv.slice(index)
	};
}

function monitor(argv, watch) {
	Rewind.monitor(argv[0], argv.slice(1), { watch: watch })
		.on('change', function(file) {
			if (this.isRunning())
				console.log('');
			console.log('+ `%s` changed, restarting %s', file.path, this.name);
		})
		.on('kill', function() {
			console.log('+ waiting for %s to terminate...', this.name);
		})
		.on('spawn', function() {
			console.log('+ starting %s\n', this.name);
		})
		.on('exit', function(code, signal) {
			if (code) {
				console.log('\n+ %s exited (%d), waiting for change', this.name, code);
			}
			else if (!signal) {
				console.log('\n+ %s terminated normally', this.name);
			}
		});
}

main();