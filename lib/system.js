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

/* jshint latedef: false */

var _ = require('lodash')
var async = require('async')
var chalk = require('chalk')
var path = require('path')
var spawn = require('child_process').spawn
var processRunner = require('./processRunner')()
var directoryWatcher = require('./directoryWatcher')()
var util = require('./util')()

module.exports = function (config) {
  var processes = {}
  var deadPool = {}
  var mode = 'live'
  var debugPort = 5858
  var debugWebPort = 8080
  var stoppingProcess = ''
  var _system



  var processExitCb = function () {
    return function (pid, name) {
      var startTime = processes[pid].startTime
      var ts

      console.log(chalk.red('process exit [' + pid + ']: ' + name))
      deadPool[pid] = processes[pid]
      processes[pid] = null
      delete processes[pid]

      if (config.restartOnError) {
        if (name !== stoppingProcess) {
          ts = Date.now()
          if (ts - startTime < 2000) {
            console.log(chalk.red('process crash on startup [' + pid + ']: ' + name + ' will not attempt restart'))
          } else {
            console.log(chalk.red('process terminated unexpectedly [' + pid + ']: ' + name + ' restarting'))
            start(_system, name, 1, function () {
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
          processRunner.stop(processes[pid].container, pid, function () {
            processRunner.start(mode, proc.container, config, processExitCb(), function (err, child) {
              if (err) { return console.log(err) }

              processes[child.pid] = {container: proc.container,
                                      identifier: proc.container.name,
                                      running: true,
                                      exitCode: null,
                                      colour: util.selectColour(),
                                      child: child,
                                      monitor: proc.monitor,
                                      tail: proc.tail}
              util.streamOutput(processes[child.pid], config)
              directoryWatcher.start(proc.container, config, directoryChangeCb(child.pid), function (watcher) {
                processes[child.pid].watcher = watcher
              })
            })
          })
        }
      } else {
        if (deadPool[pid] && deadPool[pid].monitor) {
          proc = deadPool[pid]
          console.log('DEAD POOL')
          console.log('file change (' + path + ') restarting: ' + proc.identifier)
          directoryWatcher.stop(proc.watcher)
          processRunner.start(mode, proc.container, config, processExitCb(), function (err, child) {
            if (err) { return console.log(err) }

            processes[child.pid] = {container: proc.container,
                                    identifier: proc.container.name,
                                    running: true,
                                    exitCode: null,
                                    colour: util.selectColour(),
                                    child: child,
                                    monitor: proc.monitor,
                                    tail: proc.tail}
            util.streamOutput(processes[child.pid], config)
            directoryWatcher.start(proc.container, config, directoryChangeCb(child.pid), function (watcher) {
              processes[child.pid].watcher = watcher
            })
          })
        }
      }
    }
  }



  var start = function (system, name, count, cb) {
    var container
    var procColour = util.selectColour(processes, name)
    _system = system

    async.timesSeries(count, function (id, next) {
      container = _.find(system.topology.containers, function (c) { return c.name === name })
      if (container) {
        if (util.isExecutableContainer(container)) {
          console.log('running: ' + container.name)

          processRunner.start(mode, container, config, processExitCb(), function (err, child) {
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
              util.streamOutput(processes[child.pid], config)

              if (!container.monitor) { return checkDelay(next) }

              directoryWatcher.start(container, config, directoryChangeCb(child.pid), function (watcher) {
                processes[child.pid].watcher = watcher
                checkDelay(next)
              })
            } else {
              checkDelay(next)
            }
          })
        } else {
          next()
        }
      } else {
        next('container not found')
      }
    }, function (err) {
      cb(err)
    })

    function checkDelay (next) {
      if (container.specific.execute.delay) {
        console.log('delay: ' + container.specific.execute.delay + 'ms')
        setTimeout(next, container.specific.execute.delay)
      } else {
        next()
      }
    }

  }



  var startAll = function (system, count, cb) {
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var container = system.topology.containers[key]
      if (!util.findProcess(processes, container.name)) {
        start(system, container.name, count, function () {
          next()
        })
      } else {
        next()
      }
    }, function (err) {
      cb(err)
    })
  }



  var debug = function (system, name, cb) {
    var container = _.find(system.topology.containers, function (c) { return c.name === name })
    if (container && util.isExecutableContainer(container)) {
      var debugCmd = 'node-debug -d ' + debugPort + ' -p ' + debugWebPort
      debugPort++
      debugWebPort++
      container.specific.execute.exec = container.specific.execute.exec.replace(/node/g, debugCmd)
      container.specific.execute.debug = true
      start(system, name, 1, function () {
        cb()
      })
    }
  }


  var profile = function (system, args, cb) {
    if (process.platform === 'win32') {
      console.log('Sorry! Profiling isn\'t supported on Windows')
      return cb()
    }
    var name = args.process
    var container = _.find(system.topology.containers, function (c) { return c.name === name })
    if (container && util.isNodeProcess(container)) {

      spawn('sudo', ['-n', 'true'])
        .on('exit', function (code) {
          if (code !== 0) {
            console.log('Profiling requires sudo access:')
          }

          spawn('sudo', ['true'])
            .on('exit', function (code) {
              if (code) {
                console.log('The profiler cannot be executed without sudo access.')
                return cb()
              }
              // todo reliably find 0x bin (maybe 0x does require('0x/where'))
              var flags = Object.keys(args.options).map(function (k) {
                return '--' + k + '=' + args.options[k]
              }).join(' ')

              var cmd = 'node ' + path.join(__dirname, '..', 'run-0x') + ' -q ' + flags + ' node '
              container.specific.execute._cachedExec = container.specific.execute.exec
              container.specific.execute.exec = container.specific.execute.exec.replace(/node/g, cmd)
              container._cachedMonitorStatus = container.monitor
              container.monitor = false
              container.profiling = true
              start(system, name, 1, function () {
                cb()
              })
            })
        })
    } else {
      console.log('Only node processes can be profiled!')
      cb()
    }
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

        if (process.container.profiling) {
          processRunner.kill(process.container, process.child.pid, 'SIGINT', function () {
            container.profiling = false
            container.monitor = container._cachedMonitorStatus
            container.specific.execute.exec = container.specific.execute._cachedExec
            delete container.specific.execute._cachedExec
            delete container._cachedMonitorStatus
            waitStop(process.child.pid, next)
          })
        } else {
          processRunner.stop(process.container, process.child.pid, function () {
            if (container.specific.execute.debug) {
              container.specific.execute.exec = container.specific.execute.exec.replace(/node-debug -d [0-9]+ -p [0-9]+/g, 'node')
              container.specific.execute.debug = false
            }
            waitStop(process.child.pid, next)
          })
        }

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
    return proc || c
  }



  var watchAll = function (system) {
    _.each(system.topology.containers, function (c) {
      watch(system, c.name)
    })
  }



  var unwatch = function (system, name) {
    var proc = util.findProcess(processes, name)
    var c = util.findContainer(system, name)

    if (proc) { proc.monitor = false }
    if (c) { c.monitor = false }
    if (proc || c) { console.log('un-watching: ' + name) }
    return proc || c
  }



  var unwatchAll = function (system) {
    _.each(system.topology.containers, function (c) {
      unwatch(system, c.name)
    })
  }



  var tail = function (system, name, count) {
    var proc = util.findProcess(processes, name)
    var c = util.findContainer(system, name)

    if (count > 0) {
      util.showLogTail(name, proc, config, count, function () {
      })
    } else {
      if (proc) { proc.tail = true }
      if (c) { c.tail = true }
      if (proc || c) {
        console.log('tailing: ' + name)
      }
    }
    return proc || c
  }



  var tailAll = function (system) {
    _.each(system.topology.containers, function (c) {
      tail(system, c.name)
    })
  }



  var untail = function (system, name) {
    var proc = util.findProcess(processes, name)
    var c = util.findContainer(system, name)

    if (proc) { proc.tail = false }
    if (c) { c.tail = false }
    if (proc || c) { console.log('un-tailing: ' + name) }
    return proc || c
  }



  var untailAll = function (system) {
    _.each(system.topology.containers, function (c) {
      untail(system, c.name)
    })
  }


  var heap = function (system, name) {
    var proc = util.findProcess(processes, name)
    if (!proc || !proc.child || typeof proc.child.send !== 'function') {
      console.log('connected child process not found')
      return
    }

    console.log('creating heap snapshot: ' + name)
    proc.child.send({ command: 'heapdump-create' })
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

  var messageHandler = function (message) {
    if (message && typeof message === 'object') {
      message = JSON.stringify(message, null, '  ')
    }

    console.log(message)
  }

  var startReport = function (system, name) {
    var proc = util.findProcess(processes, name)
    if (!proc || !proc.child) {
      console.log('child process not found')
      return
    }

    console.log('Reporting messages for: ' + name)
    proc.child.on('message', messageHandler)
  }

  var stopReport = function (system, name) {
    var proc = util.findProcess(processes, name)
    if (!proc || !proc.child) {
      console.log('child process not found')
      return
    }

    console.log('Stopping messages for: ' + name)
    proc.child.removeListener('message', messageHandler)
  }


  return {
    startAll: startAll,
    start: start,
    debug: debug,
    profile: profile,
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

    heap: heap,
    sendMessage: sendMessage,
    startReport: startReport,
    stopReport: stopReport
  }
}
