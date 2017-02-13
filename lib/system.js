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

var path = require('path')
var _ = require('lodash')
var async = require('async')
var chalk = require('chalk')
var runner = require('./commands/run')()
var directoryWatcher = require('./support/directoryWatcher')()
var util = require('./support/util')()

var LIVE = 'live'
var NORMAL = 'normally'
var CRASHED = 'crashed'
var RESTART_WINDOW = 30 * 1000
var MAX_RESTARTS = 5

module.exports = function () {
  var _system


  function delay (container, cb) {
    if (container.delay_start && container.delay_start > 0) {
      console.log('delay: ' + container.delay_start + 'ms')
      setTimeout(cb, container.delay_start)
    } else {
      cb(null)
    }
  }


  var waitStop = function (container, cb) {
    setTimeout(function () {
      if (container.process && container.process.flags.running) {
        waitStop(container, cb)
      } else {
        cb(null)
      }
    }, 200)
  }


  function eligableForRestart (container) {
    var history = container.process.history
    var mark = Date.now() - RESTART_WINDOW
    var crashCount = 0

    _.each(history, function (h) {
      if (h.endTime > mark && h.exitFlag === CRASHED) {
        ++crashCount
      }
    })
    return crashCount < MAX_RESTARTS && container.restart_on_error
  }



  var directoryChangeCb = function (container) {
    return function (pth) {
      console.log('[' + container.name + '] file change: ' + path.basename(pth))

      if ((container.process && container.process.flags.running)) {
        container.process.flags.restarting = true
        stopContainer(container, function () {})
      } else {
        startContainer(container, function () {})
      }
    }
  }


  var processExitCb = function () {
    return function (err, container, child, code) {
      var hist = container.process.history[container.process.history.length - 1]

      hist.endTime = Date.now()
      hist.duration = hist.endTime - hist.startTime

      if (container.process.flags.stopping || container.process.flags.restarting) {
        hist.exitFlag = NORMAL
        console.log('[' + container.name + '] exit - status: ' + hist.exitFlag + ' duration: ' + Math.floor(hist.duration / 1000) + 's')
      } else {
        hist.exitFlag = CRASHED
        console.log(chalk.red('[' + container.name + '] exit - status: ' + hist.exitFlag + ' duration: ' + hist.duration))
      }
      hist.exitData = {err: err, code: code}

      container.process.flags.running = false
      container.process.flags.stopping = false
      container.process.child = null

      if (hist.exitFlag === CRASHED && eligableForRestart(container)) {
        console.log('[' + container.name + '] attempting crash restart')
        startContainer(container, function (err) {
          if (err) { console.log(chalk.red('[' + container.name + '] restart failed')) }
        })
      }

      if (container.process.flags.restarting) {
        container.process.flags.restarting = false
        console.log('[' + container.name + '] restarting')
        startContainer(container, function (err) {
          if (err) { console.log(chalk.red('[' + container.name + '] restart failed')) }
        })
      }
    }
  }


  var startContainer = function (container, cb) {
    if (container.process && container.process.flags.running) { return cb('container already running: ' + container.name) }

    runner.start(_system, LIVE, container, processExitCb(), function (err, child) {
      if (err) { return cb(err) }

      container.process.history.push({startTime: Date.now(), endTime: null, exitFlag: null, exitData: null})
      container.process.flags = { running: true }
      container.process.child = child
      container.process.colour = util.selectColour()

      util.streamOutput(container, _system.global.log_path)

      if (container.monitor && !container.process.monitor) {
        directoryWatcher.start(container, directoryChangeCb(container), function (monitor) {
          container.process.monitor = monitor
          cb(null)
        })
      } else {
        cb(null)
      }
    })
  }


  var stopContainer = function (container, cb) {
    container.process.flags.stopping = true
    runner.stop(container, container.process.child.pid, function () {
      if (container.process.monitor && !container.process.flags.restarting) {
        directoryWatcher.stop(container.process.monitor)
        container.process.monitor = null
      }
      if (!container.process.flags.restarting) {
        waitStop(container, cb)
      } else {
        cb(null)
      }
    })
  }


  function start (system, name, debugMode, cb) {
    var container
    _system = system

    container = _.find(system.topology.containers, function (c) { return c.name === name })

    if (!container) { return cb('container not found: ' + name) }
    if (!util.isExecutableContainer(container)) { return cb('container not executable: ' + name) }
    if (debugMode && container.type !== 'node') { return cb('debug only available for conainer type node: ' + name) }
    if ((container.type === 'container' || container.type === 'docker') && !system.global.run_containers) { return cb('run containers disabled - skipping: ' + name) }

    console.log('starting: ' + container.name + ' [' + container.run + ']')
    container.debugMode = debugMode
    delay(container, function () {
      startContainer(container, cb)
    })
  }


  function stop (system, name, cb) {
    var container

    container = _.find(system.topology.containers, function (c) { return c.name === name })

    if (!container) { return cb('container not found: ' + name) }
    if (!(container.process && container.process.flags.running)) { return cb('container not running: ' + name) }

    console.log('stopping: ' + container.name)
    stopContainer(container, cb)
  }


  var startAll = function (system, cb) {
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var container = system.topology.containers[key]

      if (!(container.process && container.process.flags.running)) {
        start(system, container.name, false, function () { next() })
      } else {
        next()
      }
    }, function (err) {
      cb(err || null)
    })
  }


  var stopAll = function (system, cb) {
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var container = system.topology.containers[key]

      if (container.process && container.process.flags.running) {
        stop(system, container.name, function () { next() })
      } else {
        next()
      }
    }, function () {
      cb(null)
    })
  }


  function watch (system, name, cb) {
    var container

    container = _.find(system.topology.containers, function (c) { return c.name === name })

    if (!container) { return cb('container not found: ' + name) }
    if (!util.isExecutableContainer(container)) { return cb('container not executable: ' + name) }
    if (container.monitor && container.process.monitor) { return cb('container already monitored: ' + name) }
    if (container.type === 'container' || container.type === 'docker') { return cb('monitoring not supported for containers: ' + name) }

    console.log('[' + name + '] watch')
    container.monitor = true
    directoryWatcher.start(container, directoryChangeCb(container), function (monitor) {
      container.process.monitor = monitor
      cb(null)
    })
  }


  function watchAll (system, cb) {
    console.log(_.keys(system.topology.containers))
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var container = system.topology.containers[key]
      if (!container.process.monitor) {
        watch(system, container.name, function () { next() })
      } else {
        next()
      }
    }, function () { cb(null) })
  }


  function unwatch (system, name, cb) {
    var container

    container = _.find(system.topology.containers, function (c) { return c.name === name })
    if (!container) { return cb('container not found: ' + name) }

    console.log('[' + name + '] unwatch')
    container.monitor = false
    if (container.process.monitor) {
      directoryWatcher.stop(container.process.monitor)
      container.process.monitor = null
    }
    cb(null, container)
  }


  function unwatchAll (system, cb) {
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var container = system.topology.containers[key]
      if (container.process.monitor) {
        unwatch(system, container.name, function () { next() })
      } else {
        next(null)
      }
    }, function () { cb(null) })
  }


  var tail = function (system, name) {
    var container

    container = _.find(system.topology.containers, function (c) { return c.name === name })

    if (!container) { return null }

    container.tail = true
    console.log('[' + name + '] tail')
    return container
  }



  function tailAll (system) {
    var result = []
    _.each(system.topology.containers, function (c) {
      result.push(tail(system, c.name))
    })
    return result
  }


  function untail (system, name) {
    var container

    container = _.find(system.topology.containers, function (c) { return c.name === name })

    if (!container) { return null }

    container.tail = false
    console.log('[' + name + '] untail')
    return container
  }


  var untailAll = function (system) {
    var result = []
    _.each(system.topology.containers, function (c) {
      result.push(untail(system, c.name))
    })
    return result
  }


  function running (system, name) {
    var container = _.find(system.topology.containers, function (c) { return c.name === name })
    return container && container.process && container.process.flags.running
  }


  return {
    start: start,
    stop: stop,
    startAll: startAll,
    stopAll: stopAll,

    watch: watch,
    watchAll: watchAll,
    unwatch: unwatch,
    unwatchAll: unwatchAll,

    tail: tail,
    tailAll: tailAll,
    untail: untail,
    untailAll: untailAll,

    running: running
  }
}

