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

var _ = require('lodash');
var async = require('async');
var processRunner = require('./processRunner')();
var directoryWatcher = require('./directoryWatcher')();
var stream = require('stream');
var chalk = require('chalk');

module.exports = function() {
  var processes = {};
  var colourSelector = 0;


  var selectColour = function() {
    var colours = [chalk.white,
                   chalk.green,
                   chalk.yellow,
                   chalk.blue,
                   chalk.magenta,
                   chalk.cyan,
                   chalk.black,
                   chalk.gray];
    var colour = colours[colourSelector];
    colourSelector++;
    if (colourSelector > 7) {
      colourSelector = 0;
    }
    return colour;
  };



  var isExecutableContainer = function(container) {
    return container.type === 'process' && container.specific.execute;
  };



  var streamOutput = function(proc) {
    var stdOutStream = new stream.Writable();
    stdOutStream._write = function(chunk, encoding, done) {
      process.stdout.write(proc.colour('[' + proc.identifier + ' - ' + proc.child.pid + ']: ' + chunk.toString()));
      done();
    };
    proc.child.stdout.pipe(stdOutStream);

    var stdErrStream = new stream.Writable();
    stdErrStream._write = function(chunk, encoding, done) {
      process.stdout.write(chalk.red('[' + proc.identifier + ' - ' + proc.child.pid + ']: ' + chunk.toString()));
      done();
    };
    proc.child.stderr.pipe(stdErrStream);
  };



  var processExitCb = function() {
    return function(pid, execString, exitCode) {
      console.log(chalk.red('process exit [' + pid + ']: ' + execString + ' ' + exitCode));
    };
  };



  var directoryChangeCb = function(pid) {
    return function() {
      var proc = processes[pid];
      if (proc.running) {
        directoryWatcher.stop(proc.watcher);
        processRunner.stop(pid, function() {
          processRunner.start(proc.container, processExitCb(), function(err, child) {
            if (err) { return console.log(err); }

            processes[child.pid] = {container: proc.container,
                                    identifier: proc.container.specific.execute.exec,
                                    running: true,
                                    exitCode: null,
                                    colour: selectColour(),
                                    child: child};
            streamOutput(processes[child.pid]);
            directoryWatcher.start(proc.container, directoryChangeCb(child.pid), function(watcher) {
              processes[child.pid].watcher = watcher;
            });
          });
        });
      }
    };
  };



  var start = function(system, cb) {
    async.eachSeries(_.keys(system.topology.containers), function(key, next) {
      var container = system.topology.containers[key];
      if (isExecutableContainer(container)) {
        processRunner.start(container, processExitCb(), function(err, child) {
          if (err) { return next(err); }

          processes[child.pid] = {container: container,
                                  identifier: container.specific.execute.exec,
                                  running: true,
                                  exitCode: null,
                                  colour: selectColour(),
                                  child: child};
          streamOutput(processes[child.pid]);
          directoryWatcher.start(container, directoryChangeCb(child.pid), function(watcher) {
            processes[child.pid].watcher = watcher;
            next();
          });
        });
      }
      else {
        next();
      }
    }, function(err) {
      cb(err);
    });
  };



  var stop = function(cb) {
    async.eachSeries(_.keys(processes), function(key, next) {
      var process = processes[key];
      directoryWatcher.stop(process.watcher);
      processRunner.stop(process.child.pid, function() {
        next();
      });
    }, function(err) {
      processes = {};
      cb(err);
    });
  };



  var procs = function() {
    return processes;
  };



  var reset = function() {
    processes = {};
  };



  return {
    start: start,
    stop: stop,
    processes: procs,
    reset: reset
  };
};
 
