// drooshi.tk build utility version 1.0.0

'use strict';

const VERSION = '1.0.0';
const DIR = './src/'

const fs = require('fs');
const path = require('path');

const program = require('commander');

program.version(VERSION)
  .option('-p, --production', 'Minified production build')
  .parse(process.argv);

const Uglify = require('uglify-es');
const CleanCSS = require('clean-css');
const HTMLMinify = require('html-minifier')

function readFileStr(filename) {
  return fs.readFileSync(filename).toString();
}

let doMinify = false;

if (program.production) {
  process.env['NODE_ENV'] = 'production';
  doMinify = true;
}

let html = readFileStr(path.join(DIR, 'drooshi.html'));
let js = readFileStr(path.join(DIR, 'main.js'));
let css = readFileStr(path.join(DIR, 'main.css'));
let version = readFileStr('version.txt').trim();

if (doMinify) {
  html = HTMLMinify.minify(html, {
    collapseWhitespace: true
  });
  let jsObj = Uglify.minify(js);
  if (jsObj.error) {
    console.log('Error in JavaScript code');
    let err = jsObj.error;
    console.log(err.stack);
    throw err;
  }
  js = jsObj.code;
  css = new CleanCSS().minify(css).styles;
}

fs.writeFileSync('index.html', template(html, {
  javascript: js,
  css: css,
  year: new Date().getUTCFullYear().toString(),
  version: version
}));

function token(type, content, index) {
  return {
    type: type,
    content: content,
    index: index
  };
}

function tokenize(str, keys) {
  // Get occurrences
  let tokens = [];
  let index = 0;
  let length = str.length;

  let re = /\{\{@|\}\}/g;

  for (;;) {
    if (index >= length) {
      break;
    }
    let nextM = re.exec(str);

    let nextMP = nextM === null ? -1 : nextM.index;

    if (nextMP > index || nextMP === -1) {
      let tEnd = nextMP;
      if (nextMP === -1) {
        tEnd = length;
      }
      tokens.push(token('text', str.substring(index, tEnd), index));
      index = tEnd;
    }
    if (nextMP === index) {
      let nextT = nextM[0];
      if (nextT === '{{@') {
        tokens.push(token('t_bl', nextT, index));
      }
      else if (nextT === '}}') {
        tokens.push(token('t_br', nextT, index));
      }
      index += nextT.length;
    }
  }

  return tokens;
}

function node(type, props) {
  return {
    type: type,
    content: props
  };
}

function createTree(tokens) {
  let tree = [];
  let lastTBl;
  let inTbl = false;
  let TblIndex;

  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i];
    let index = t.index;

    if (t.type === 't_bl') {
      if (inTbl) {
        throw new SyntaxError('Illegal nested {{@ at position ' + index);
      }
      lastTBl = t;
      inTbl = true;
      TblIndex = i;
    }
    else if (t.type === 't_br') {
      if (inTbl) {
        let name = tokens.slice(TblIndex + 1, i).map((t) => t.content).join('').trim();
        if (/^\w+$/.test(name) === false) {
          throw new SyntaxError('Illegal identifier name at position ' + tokens[TblIndex + 1].index);
        }
        tree.push(node('id', {name: name}));
        inTbl = false;
      }
      else {
        tree.push(node('text', t.content));
      }
    }
    else {
      if (!inTbl) {
        tree.push(node('text', t.content));
      }
    }
  }

  if (inTbl) {
    throw new SyntaxError('Unclosed {{@ at position at end of input');
  }

  return tree;
}

function template(str, props) {
  let tree = createTree(tokenize(str));
  let segments = [];

  for (let i = 0; i < tree.length; i++) {
    let n = tree[i];

    if (n.type === 'text') {
      segments.push(n.content);
    }
    else if (n.type === 'id') {
      let prop = props[n.content.name];
      segments.push(prop);
    }
  }

  return segments.join('');
}
