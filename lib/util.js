/*jshint -W069 */
/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var fs = require('fs');
var stream = require('stream');
var async = require('async');
var _ = require('lodash');
var chalk = require('chalk');
var sgrep = require('simple-grep');
var readline = require('readline');


module.exports = function() {
  var colourSelector = 0;



  var isExecutableContainer = function(container) {
    return (container.type === 'process' || container.type === 'docker') && container.specific.execute;
  };
  
  var isNodeProcess = function(container) {
    return (container.type === 'process') && container.specific.execute && /node|iojs/.test(container.specific.execute.exec);
  };

  var findProcess = function(processes, name) {
    var pid = _.find(_.keys(processes), function(key) { return processes[key].identifier === name; });
    return processes[pid];
  };



  var findContainer = function(system, name) {
    return _.find(system.topology.containers, function(c) { return c.name === name; });
  };



  var selectColour = function(processes, name) {
    var colour;
    var process;

    if (processes) {
      process = findProcess(processes, name);
    }

    if (process) {
      colour = process.colour;
    }
    else {
      var colours = [chalk.white,
                     chalk.green,
                     chalk.yellow,
                     chalk.blue,
                     chalk.magenta,
                     chalk.cyan,
                     chalk.black,
                     chalk.gray];
      colour = colours[colourSelector];
      colourSelector++;
      if (colourSelector > 7) {
        colourSelector = 0;
      }
    }
    return colour;
  };



  var streamOutput = function(proc, config) {
    var stdOutStream = new stream.Writable();
    var logStream = fs.createWriteStream(config.logPath + '/' + proc.identifier + '.log');

    stdOutStream._write = function(chunk, encoding, done) {
      logStream.write(chunk.toString());
      if (proc.tail) {
        process.stdout.write(proc.colour('[' + proc.identifier + ' - ' + proc.child.pid + ']: ' + chunk.toString()));
      }
      done();
    };
    proc.child.stdout.pipe(stdOutStream);

    var stdErrStream = new stream.Writable();
    stdErrStream._write = function(chunk, encoding, done) {
      logStream.write(chunk.toString());
      if (proc.tail) {
        process.stdout.write(chalk.red('[' + proc.identifier + ' - ' + proc.child.pid + ']: ' + chunk.toString()));
      }
      done();
    };
    proc.child.stderr.pipe(stdErrStream);
  };



  var grep = function(name, config, search, cb) {
    var path = config.logPath + '/' + name + '.log';

    if (fs.existsSync(path)) {
      sgrep(search, path, function(list){
        _.each(list, function(item) {
          _.each(item.results, function(loc) {
            var output = item.file + ' ' + loc['line_number'] + ': ' + loc.line;
            console.log(output);
          });
        });
        cb();
      });
    }
    else {
      cb();
    }
  };



  var grepAll = function(system, config, search, cb) {
    async.eachSeries(_.keys(system.topology.containers), function(key, next) {
      var c = system.topology.containers[key];
      grep(c.name, config, search, next);
    }, function(err) { cb(err); });
  };



  var showLogTail = function(name, proc, config, count, cb) {
    var path = config.logPath + '/' + name + '.log';
    var lines = [];

    if (fs.existsSync(path)) {
      var instream = fs.createReadStream(path);
      var rl = readline.createInterface({
        input: instream,
      });

      rl.on('line', function(line) {
        lines.push(line);
        if (lines.length > count) {
          lines.shift();
        }
      });

      rl.on('close', function () {
        _.each(lines, function(line) {
          if (proc) {
            console.log(proc.colour(line));
          }
          else {
            console.log(line);
          }
        });
        cb();
      });
    }
    else {
      cb();
    }
  };




  return {
    isExecutableContainer: isExecutableContainer,
    isNodeProcess: isNodeProcess,
    selectColour: selectColour,
    streamOutput: streamOutput,
    findContainer: findContainer,
    findProcess: findProcess,
    grep: grep,
    grepAll: grepAll,
    showLogTail: showLogTail
  };
};
