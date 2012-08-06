# rewind #

Automatically restart a Node application when dependencies change.


## Installation ##

Install with npm:

    npm install -g rewind


## Getting Started ##

Start your application with `rewind` instead of `node`:

    rewind server.js 3000

This will load `server.js` as the main module. Any changes to
`server.js` or its dependencies will cause the server to restart.

If you application caches non-module assets, use the `-w` option to
instruct `rewind` to watch them. For example:

    rewind -w ./static -w ./templates server.js 3000

`Rewind` will scan these files or folders recursively. If any file is
modified, the application with be restarted.


## How it Works ##

Rewind forks a subprocess to run the real application. The subprocess
detects loaded modules and reports them to the parent, which is
monitoring the filesystem using [fs.watch()][0]. If any dependency
changes, the subprocess is terminated with a `SIGHUP` and forked
again.

If the subprocess dies (exits non-zero), `rewind` waits until one on
the monitored files is changed. If the subprocess terminatss normally
(exits zero), rewind stops monitoring files and exits as well.

[0]: http://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener
