# renode #

Automatically restart a Node application when dependencies change.

## Installation ##

Install with npm:

    npm install -g renode

## Getting Started ##

Start your application with `renode` instead of `node`:

    renode server.js 8080

This will load `server.js` as the main module. Any changes to
`server.js` or its dependencies will cause the server to restart.

If you application caches non-module assets, use the `-w` option to
instruct `renode` to watch them. For example:

    renode -w ./static -w ./templates server.js 8080

`Renode` will scan these files or folders recursively. If any file is
modified, the application with be restarted.


## How it Works ##

Renode forks a subprocess that runs the real application. The
subprocess detects loaded modules and reports them to the parent
process, which is monitoring the filesystem using [fs.watch()][0]. If
any dependency changes, the subprocess is terminated with a `SIGHUP`
and forked again.

If the subprocess dies (e.g. exits non-zero), `renode` waits until one
on the monitored files is changed. If the subprocess terminats
normally (e.g. exits zero), renode stops monitoring files and exits as
well.

[0]: http://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener
