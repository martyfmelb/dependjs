# depend.js

0.1.0

### Background

Managing JavaScript dependencies without wrappers made easy.

Depend.js is open source with a [public repository](https://github.com/martyfmelb/dependjs) on GitHub.

### Installation

You need Gulp installed globally:

```sh
$ npm i -g gulp
```

```sh
$ git clone https://github.com/martyfmelb/dependjs.git
$ cd dependjs
$ npm i -d
$ gulp serve
```

And pluck `depend.js` out of `/tmp/`. (A hasty release indeed!)

### Development

Want to contribute? Great!

_depend.js_ uses Yeogurt (Gulp + Nunjucks + SCSS + RequireJS + Babel + Mocha + Chai + Karma) for a fast ES6 workflow with unit testing.

Open your favorite Terminal and run these commands.

First Tab:
```sh
$ gulp serve
```

Second Tab:
```sh
$ gulp test --watch
```

### Todos

 - Minified build to `/build`

License
----

MIT
