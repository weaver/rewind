# renode #

Reload a node application when files change.

## Installation ##

Download `renode`, put it in your $PATH, and `chmod a+x` it.

## About ##

Use renode to help develop node applications. It will spawn a
node subprocess that watches for changes to your program and its
dependencies. When a loaded module changes on disk, the subprocess
exits and starts again.

For example:

    renode server.js 8080

This will start `server.js`. Any changes to `server.js` or its
dependencies will cause the server to restart.

## Disclaimer ##

Renode is helpful for development. It's not recommended for
production use :)
