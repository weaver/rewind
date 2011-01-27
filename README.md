# renode #

Automatically restart a node application when files change.

## Installation ##

Download `renode`, put it in your $PATH, and `chmod a+x` it.

## About ##

Use renode to help develop node applications. It will spawn an
application in a subprocess and watch for changes to your program and
its dependencies. When a loaded module changes on disk, the subprocess
exits and starts again.

Disclaimer: `renode` is helpful for development. It's not recommended
for production use :)

## Usage ##

Start your application with `renode` instead of `node`:

    renode server.js 8080

This will start `server.js`. Any changes to `server.js` or its
dependencies will cause the server to restart.

If you application caches non-module assets, use the `-w` option to
instruct `renode` to watch them. For example:

    renode -w ./static -w ./templates server.js 8080

`Renode` will scan these files or folders recursively. If any file is
modified, the application with be restarted.
