/* jshint latedef: false */
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

'use strict'

var _ = require('lodash')
var async = require('async')
var chalk = require('chalk')
var runner = require('./commands/run')()
var directoryWatcher = require('./support/directoryWatcher')()
var util = require('./support/util')()

module.exports = function () {
  var processes = {}
  var deadPool = {}
  var mode = 'live'
  var stoppingProcess = ''
  var _system


  /*
   * restart on error is OK note process exit cb
   * if proc has restarted multiple times then there will still be
   * multiple dir watchers on the deadpool processes
   *
   * separate deadpool object in this file and use it as API
   *
   * - need to ensure only one deadpool process of a specific type (ie. by container name) with ONE watcher working
   * - maintain a restart count against deadpool processes - on restart 
   *
   * scenario1 - die on startup in less than 2 secs -> into deadpool immediately
   * file change - start again die on start up -> into deadpool replace last and increse count
   * once max count is reached error output and dont restart 
   * - however manual start is OK
   * only one watcher running so when swapping from deadpool ensure cancel watcher
   *
   * scenario2 - normal operation with file change - restart as normal replacing watcher - ensure only one watcher
   *
   * desired:
   *
   * scenaio1 - normal operation with occasional crash  - i.e. starts and operates for a while
   *  - if restart set then always restart
   *
   * scenarion2 - normal operation - bad code edit i.e. directory change 
   *  - restart occurrs process crashes due to edit place into deadpool and restart on next edit - restart once repeat until code is good
   *
   * scenario3 - start and crash on startup with no edit
   *  - process crashes without edit place into deadpool 
   *
   * do we need restart count ?
   * 
   *
   * ensure only start one process - remove start count - this can be controlled through the config file simply by adding
   * another instance
   *
   */

  var processExitCb = function () {
    return function (pid, name) {
      var startTime = processes[pid].startTime
      var ts

      console.log(chalk.red('process exit [' + pid + ']: ' + name))
      deadPool[pid] = processes[pid]
      processes[pid] = null
      delete processes[pid]

      if (_system.topology.containers[name].restart_on_error) {
        if (name !== stoppingProcess) {
          ts = Date.now()
          if (ts - startTime < 2000) {
            console.log(chalk.red('process crash on startup [' + pid + ']: ' + name + ' will not attempt restart'))
          } else {
            console.log(chalk.red('process terminated unexpectedly [' + pid + ']: ' + name + ' restarting'))
            start(_system, name, 1, false, function () {
            })
          }
        }
      }
    }
  }



  var directoryChangeCb = function (pid) {
    return function (path) {
      var proc = processes[pid]
      if (proc && proc.monitor) {
        console.log('file change (' + path + ') restarting: ' + proc.identifier)
        proc.restarting = true
        if (proc.running) {
          directoryWatcher.stop(proc.watcher)
          runner.stop(processes[pid].container, pid, function () {
            runner.start(_system, mode, proc.container, processExitCb(), function (err, child) {
              if (err) { return console.log(err) }

              processes[child.pid] = {container: proc.container,
                identifier: proc.container.name,
                running: true,
                exitCode: null,
                colour: util.selectColour(),
                child: child,
                monitor: proc.monitor,
                tail: proc.tail}
              util.streamOutput(processes[child.pid], _system.global.log_path)
              directoryWatcher.start(proc.container, directoryChangeCb(child.pid), function (watcher) {
                processes[child.pid].watcher = watcher
              })
            })
          })
        }
      } else {
        if (deadPool[pid] && deadPool[pid].monitor) {
          proc = deadPool[pid]
          console.log('dead pool file change (' + path + ') restarting: ' + proc.identifier)
          directoryWatcher.stop(proc.watcher)
          runner.start(_system, mode, proc.container, processExitCb(), function (err, child) {
            if (err) { return console.log(err) }

            processes[child.pid] = {container: proc.container,
              identifier: proc.container.name,
              running: true,
              exitCode: null,
              colour: util.selectColour(),
              child: child,
              monitor: proc.monitor,
              tail: proc.tail}
            util.streamOutput(processes[child.pid], _system.global.log_path)
            directoryWatcher.start(proc.container, directoryChangeCb(child.pid), function (watcher) {
              processes[child.pid].watcher = watcher
            })
          })
        }
      }
    }
  }



  var start = function (system, name, count, debugMode, cb) {
    var container
    var procColour = util.selectColour(processes, name)
    _system = system

    async.timesSeries(count, function (id, next) {
      container = _.find(system.topology.containers, function (c) { return c.name === name })
      if (container) {
        if (util.isExecutableContainer(container)) {
          console.log('starting: ' + container.name)
          console.log('running: ' + container.run)

          if (debugMode) {
            if (container.type !== 'node') {
              console.log('debug only available for containers of type node')
              return next()
            }
            container.debugMode = true
          }

          runner.start(_system, mode, container, processExitCb(), function (err, child) {
            container.debugMode = false
            if (err) { return next(err) }

            if (child) {
              processes[child.pid] = {container: container,
                identifier: container.name,
                running: true,
                exitCode: null,
                colour: procColour,
                child: child,
                startTime: Date.now(),
                monitor: container.monitor,
                tail: container.tail}

              util.streamOutput(processes[child.pid], _system.global.log_path)
              directoryWatcher.start(container, directoryChangeCb(child.pid), function (watcher) {
                processes[child.pid].watcher = watcher
                checkDelay(next)
              })
            } else {
              checkDelay(next)
            }
          })
        } else {
          console.log('container not executable - check configuration')
          next('container not executable - check configuration')
        }
      } else {
        next('container not found')
      }
    }, function (err) {
      cb(err)
    })

    function checkDelay (next) {
      if (container.delay_start && container.delay_start > 0) {
        console.log('delay: ' + container.delay_start + 'ms')
        setTimeout(next, container.delay_start)
      } else {
        next()
      }
    }
  }



  var startAll = function (system, count, cb) {
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var container = system.topology.containers[key]
      if (!util.findProcess(processes, container.name)) {
        start(system, container.name, count, false, function () {
          next()
        })
      } else {
        next()
      }
    }, function (err) {
      cb(err)
    })
  }



  var stop = function (system, name, count, cb) {

    var waitStop = function (pid, next) {
      setTimeout(function () {
        if (!processes[pid]) {
          next()
        } else {
          waitStop(pid, next)
        }
      }, 200)
    }

    async.timesSeries(count, function (id, next) {
      var process = _.find(processes, function (process) { return process.identifier === name })
      var container = _.find(system.topology.containers, function (c) { return c.name === name })
      if (process) {
        console.log('stopping: ' + process.identifier)
        stoppingProcess = process.identifier
        directoryWatcher.stop(process.watcher)

        runner.stop(process.container, process.child.pid, function () {
          if (container.debug) {
            container.run = container.run.replace(/node-debug -d [0-9]+ -p [0-9]+/g, 'node')
            container.debug = false
          }
          waitStop(process.child.pid, next)
        })
      } else {
        next('process not found')
      }
    }, function (err) {
      stoppingProcess = ''
      cb(err)
    })
  }



  var stopAll = function (system, cb) {
    async.eachSeries(_.keys(processes), function (key, next) {
      if (processes[key]) {
        stop(system, processes[key].identifier, 1, function () {
          next()
        })
      } else {
        next()
      }
    }, function (err) {
      processes = {}
      cb(err)
    })
  }



  var procs = function () {
    return processes
  }



  var reset = function () {
    processes = {}
  }



  var watch = function (system, name) {
    var proc = util.findProcess(processes, name)
    var c = util.findContainer(system, name)

    if (proc) { proc.monitor = true }
    if (c) { c.monitor = true }
    if (proc || c) { console.log('watching: ' + name) }
    return c
  }



  var watchAll = function (system) {
    var result = []
    _.each(system.topology.containers, function (c) {
      result.push(watch(system, c.name))
    })
    return result
  }



  var unwatch = function (system, name) {
    var proc = util.findProcess(processes, name)
    var c = util.findContainer(system, name)

    if (proc) { proc.monitor = false }
    if (c) { c.monitor = false }
    if (proc || c) { console.log('un-watching: ' + name) }
    return c
  }



  var unwatchAll = function (system) {
    var result = []
    _.each(system.topology.containers, function (c) {
      result.push(unwatch(system, c.name))
    })
    return result
  }



  var tail = function (system, name, count) {
    var proc = util.findProcess(processes, name)
    var c = util.findContainer(system, name)

    if (count > 0) {
      util.showLogTail(name, proc, _system.global.log_path, count, function () {
      })
    }
    if (proc) { proc.tail = true }
    if (c) { c.tail = true }
    if (proc || c) { console.log('tailing: ' + name) }
    return c
  }



  var tailAll = function (system) {
    var result = []
    _.each(system.topology.containers, function (c) {
      result.push(tail(system, c.name))
    })
    return result
  }



  var untail = function (system, name) {
    var proc = util.findProcess(processes, name)
    var c = util.findContainer(system, name)

    if (proc) { proc.tail = false }
    if (c) { c.tail = false }
    if (proc || c) { console.log('un-tailing: ' + name) }
    return c
  }



  var untailAll = function (system) {
    var result = []
    _.each(system.topology.containers, function (c) {
      result.push(tail(system, c.name))
    })
    return result
  }



  var sendMessage = function (system, name, data) {
    var proc = util.findProcess(processes, name)
    if (!proc || !proc.child || typeof proc.child.send !== 'function') {
      console.log('connected child process not found')
      return
    }

    console.log('sending message: ' + name)
    proc.child.send(data)
  }



  return {
    startAll: startAll,
    start: start,
    stopAll: stopAll,
    stop: stop,

    watch: watch,
    watchAll: watchAll,
    unwatch: unwatch,
    unwatchAll: unwatchAll,

    tail: tail,
    tailAll: tailAll,
    untail: untail,
    untailAll: untailAll,

    processes: procs,
    reset: reset,

    sendMessage: sendMessage
  }
}

