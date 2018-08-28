# drooshi.tk (drooshi.github.io)

Code and assets for drooshi.tk.

The drooshi.tk site is hosted directly from this repository at drooshi.github.io
using Github Pages.

Except where noted, all rights reserved. Media used on this site are copyrighted
by their respective original authors.

## Building and hosting

You need node.js and npm to build drooshi.tk. To build, run `npm install` to
install dependencies, then run `node build.js` to build a static `index.html`
file from source.

Use `node build.js -p` or `node build.js --production` to build a minified
production version.

To serve drooshi.tk, make the `assets` directory accessible at the root of the
server. `index.html` may be placed anywhere on the server.
