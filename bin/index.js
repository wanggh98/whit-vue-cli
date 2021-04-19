#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer')
var mkdirp = require('mkdirp');
var os = require('os');
var fs = require('fs');
var path = require('path');
var readline = require('readline');
var sortedObject = require('sorted-object');

var _exit = process.exit;
var eol = os.EOL;
var pkg = require('../package.json');
let wait = 8;
var version = pkg.version;

// Re-assign process.exit because of commander
// TODO: Switch to a different command framework
process.exit = exit

// CLI

before(program, 'outputHelp', function () {
  this.allowUnknownOption();
});

program
  .version(version)

// if (!exit.exited) {
//   main();
// }

program
    .command('init <fileName>')
    .description('run init commands for all envs')
    .action(function(env,options){
        if (env) {
            main(env)
        }
    });


program.parse(process.argv);

/**
 * Install a before function; AOP.
 */

function before(obj, method, fn) {
  var old = obj[method];

  obj[method] = function () {
    fn.call(this);
    old.apply(this, arguments);
  };
}

/**
 * Prompt for confirmation on STDOUT/STDIN
 */

function confirm(msg, callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(msg, function (input) {
    rl.close();
    callback(/^y|yes|ok|true$/i.test(input));
  });
}

/**
 * Create application at the given directory `path`.
 *
 * @param {String} path
 */

function createApplication(app_name, path, template) {
  console.log();
  function complete() {
    if (--wait) return;
    var prompt = launchedFromCmd() ? '>' : '$';

    console.log();
    console.log('   install dependencies:');
    console.log('     %s cd %s && npm install', prompt, path);
    console.log();
    console.log('   run the app:');

    if (launchedFromCmd()) {
      console.log('     %s npm run serve ');
    } else {
      console.log('     %s npm run serve');
    }

    console.log();
  }

  // ico
  let ico = loadTemplate('/public/favicon.ico', template)

  // img
  let logo = loadTemplate('/src/assets/logo.png', template)

  mkdir(path, function(){
    mkdir(path + '/public', function(){
        write(path + '/public/favicon.ico', ico);
        copy_template('public/index.html', path + '/public/index.html',template)
        complete();
    });
    mkdir(path + '/src', function(){
        mkdir(path + '/src/assets',function(){
            write(path + '/src/assets/logo.png', logo);
            complete();
        });
        mkdir(path + '/src/components',function(){
            copy_template('src/components/HelloWorld.vue', path + '/src/components/HelloWorld.vue',template)
            complete();
        });
        if (template == 'whit-vue-i18n'){
            mkdir(path + '/src/locales',function(){
                mkdir(path + '/src/locales/lang',function(){
                    copy_template('src/locales/lang/en-US.js', path + '/src/locales/lang/en-US.js',template)
                    copy_template('src/locales/lang/zh-CN.js', path + '/src/locales/lang/zh-CN.js',template)
                    complete();
                });
                copy_template('src/locales/index.js', path + '/src/locales/index.js',template)
                complete();
            });
        }
        mkdir(path + '/src/router',function(){
            copy_template('src/router/index.js', path + '/src/router/index.js',template)
            complete();
        });
        mkdir(path + '/src/utils',function(){
            copy_template('src/utils/api.js', path + '/src/utils/api.js',template)
            copy_template('src/utils/message.js', path + '/src/utils/message.js',template)
            copy_template('src/utils/request.js', path + '/src/utils/request.js',template)
            complete();
        });
        mkdir(path + '/src/views',function(){
            copy_template('src/views/About.vue', path + '/src/views/About.vue',template)
            copy_template('src/views/Home.vue', path + '/src/views/Home.vue',template)
            complete();
        });
        copy_template('src/App.vue', path + '/src/App.vue',template)
        copy_template('src/main.js', path + '/src/main.js',template)

        copy_template('public/favicon.ico', path + '/public/favicon.ico',template)
        copy_template('public/index.html', path + '/public/index.html',template)
        complete();
    });

    copy_template('babel.config.js', path + '/babel.config.js',template)
    copy_template('vue.config.js', path + '/vue.config.js',template)
    copy_template('yarn.lock', path + '/yarn.lock',template)
    
    let pg = {
        name: app_name,
        version: '1.0.0',
      "private": true,
      "scripts": {
        "serve": "vue-cli-service serve",
        "build": "vue-cli-service build"
      },
      "dependencies": {
        "axios": "^0.21.1",
        "core-js": "^3.6.5",
        "element-ui": "^2.15.1",
        "vue": "^2.6.11",
        "vue-router": "^3.2.0"
      },
      "devDependencies": {
        "@vue/cli-plugin-babel": "~4.5.0",
        "@vue/cli-plugin-router": "~4.5.0",
        "@vue/cli-service": "~4.5.0",
        "vue-template-compiler": "^2.6.11"
      },
      "browserslist": [
        "> 1%",
        "last 2 versions",
        "not dead"
      ]
    }
    if (template == 'whit-vue-i18n') {
        pg["dependencies"] = {
            "axios": "^0.21.1",
            "core-js": "^3.6.5",
            "element-ui": "^2.15.1",
            "vue": "^2.6.11",
            "vue-i18n": "^8.24.2",
            "vue-router": "^3.2.0"
          };
    }
    pg.dependencies = sortedObject(pg.dependencies);

    write(path + '/package.json', JSON.stringify(pg, null, 2));
    complete();
  })

}

function copy_template(from, to,template) {
  from = path.join(__dirname, '..', 'template/'+ template, from);
  write(to, fs.readFileSync(from, 'utf-8'));
}

/**
 * Check if the given directory `path` is empty.
 *
 * @param {String} path
 * @param {Function} fn
 */

function emptyDirectory(path, fn) {
  fs.readdir(path, function(err, files){
    if (err && 'ENOENT' != err.code) throw err;
    fn(!files || !files.length);
  });
}

/**
 * Graceful exit for async STDIO
 */

function exit(code) {
  // flush output for Node.js Windows pipe bug
  // https://github.com/joyent/node/issues/6247 is just one bug example
  // https://github.com/visionmedia/mocha/issues/333 has a good discussion
  function done() {
    if (!(draining--)) _exit(code);
  }

  var draining = 0;
  var streams = [process.stdout, process.stderr];

  exit.exited = true;

  streams.forEach(function(stream){
    // submit empty write request and wait for completion
    draining += 1;
    stream.write('', done);
  });

  done();
}

/**
 * Determine if launched from cmd.exe
 */

function launchedFromCmd() {
  return process.platform === 'win32'
    && process.env._ === undefined;
}

/**
 * Load template file.
 */

function loadTemplate(name,template) {
  return fs.readFileSync(path.join(__dirname, '..', 'template/'+ template, name));
}

/**
 * Main program.
 */

function main(destinationPath) {
  // App name
  let appName =  path.basename(path.resolve(destinationPath));

  // Generate application
  emptyDirectory(destinationPath, function (empty) {
    inquirer.
        prompt({
            type: 'list',
            message: 'Please select template.',
            name: 'template',
            choices: [
                'whit-vue',
                'whit-vue-i18n'
            ]
        })
        .then(res => {
            let { template } = res;
            if (template == 'whit-vue') {
                wait = 8
            } else {
                wait = 10
            }
            createApplication(appName, destinationPath, template);
        })
        .catch(error => {
            console.log('error:: ',error)
            if(error.isTtyError) {
                // Prompt couldn't be rendered in the current environment
              } else {
                // Something else went wrong
              }
        })
    // if (empty || program.force) {
    //   createApplication(appName, destinationPath);
    // } else {
    //   confirm('destination is not empty, continue? [y/N] ', function (ok) {
    //     if (ok) {
    //       process.stdin.destroy();
    //       createApplication(appName, destinationPath);
    //     } else {
    //       console.error('aborting');
    //       exit(1);
    //     }
    //   });
    // }
  });
}

/**
 * echo str > path.
 *
 * @param {String} path
 * @param {String} str
 */

function write(path, str, mode) {
  fs.writeFileSync(path, str, { mode: mode || 0666 });
  console.log('   \x1b[36mcreate\x1b[0m : ' + path);
}

/**
 * Mkdir -p.
 *
 * @param {String} path
 * @param {Function} fn
 */

function mkdir(path, fn) {
  mkdirp(path, 0755)
  .then(res=>{
    //   console.log('   \033[36mcreate\033[0m : ' + path);
      fn && fn();
  },err => {
    if (err) throw err;
  });
}
