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

var fs = require('fs')
var path = require('path')
var docker = require('./helpers/dockerMocks')
var proxyquire = require('proxyquire')
proxyquire('../lib/support/dockerRunner', {dockerode: docker.Docker})

var test = require('tap').test
var main = require('../runner.js')()
var config = require('fuge-config')()


function configureLogs (system) {
  var logPath = path.resolve(path.join(__dirname, 'fixture', 'system', 'fuge', 'log'))
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath)
  }
  if (!fs.existsSync(path.join(logPath, 'test'))) {
    fs.mkdirSync(path.join(logPath, 'test'))
  }
  system.global.log_path = logPath
}


test('crash restart test', function (t) {
  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'system.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.startAll(system, function (err) {
      t.equal(err, null)
      setTimeout(function () {
        main.stopAll(system, function (err) {
          t.equal(err, null)
          t.end()
        })
      }, 2000)
    })
  })
})


test('watch unwatch bad containers test', function (t) {
  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'edge.yml'), function (err, system) {
    t.equal(err, null)
    configureLogs(system)

    system.topology.containers.runme.type = 'wibble'
    main.watch(system, 'wibble', function (err) {
      t.equal('container not found: wibble', err, 'check watch missing container')
      main.watch(system, 'runme', function (err) {
        t.equal('container not executable: runme', err, 'check watch non exec container')
        main.watch(system, 'mongo', function (err) {
          t.equal('monitoring not supported for containers: mongo', err, 'check watch non process container')
          main.watch(system, 'runmetoo', function (err) {
            t.equal(null, err, 'check watch OK')
            setTimeout(function () {
              main.watch(system, 'runmetoo', function (err) {
                t.equal('container already monitored: runmetoo', err, 'check already monitored')
                setTimeout(function () {
                  main.unwatch(system, 'runmetoo', function (err) {
                    t.equal(null, err, 'check unwatch single container')
                    t.end()
                  })
                }, 1500)
              })
            }, 1500)
          })
        })
      })
    })
  })
})


test('watch unwatch all test', function (t) {
  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'edge.yml'), function (err, system) {
    t.equal(err, null)
    configureLogs(system)

    system.topology.containers.runme.type = 'wibble'
    main.watchAll(system, function (err) {
      t.equal(null, err, 'check watch all')
      setTimeout(function () {
        main.watchAll(system, function (err) {
          t.equal(null, err, 'check watch all')
          main.unwatchAll(system, function () {
            t.end()
          })
        })
      }, 1500)
    })
  })
})


test('start stop all no containers test', function (t) {
  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.startAll(system, function (err) {
      t.equal(err, null)
      setTimeout(function () {
        main.startAll(system, function (err) {
          t.equal(err, null)
          main.stopAll(system, function (err) {
            t.equal(err, null)
            t.end()
          })
        })
      }, 1500)
    })
  })
})


test('stop unknown container test', function (t) {
  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.stop(system, 'wibble', function (err) {
      t.equal(err, 'container not found: wibble')
      main.stop(system, 'runme', function (err) {
        t.equal(err, 'container not running: runme')
        t.end()
      })
    })
  })
})


test('start unknown container test', function (t) {
  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.start(system, 'wibble', function (err) {
      t.equal(err, 'container not found: wibble')
      system.topology.containers.runme.type = 'fish'
      main.start(system, 'runme', function (err) {
        t.equal(err, 'container not executable: runme')
        system.topology.containers.runme.type = 'process'
        main.debug(system, 'runme', function (err) {
          t.equal(err, 'debug only available for conainer type node: runme')
          t.end()
        })
      })
    })
  })
})


test('start missing execute test', function (t) {
  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.start(system, 'runme', function (err) {
      t.equal(err, null)
      setTimeout(function () {
        main.start(system, 'runme', function (err) {
          t.equal(err, 'container already running: runme')
          main.stop(system, 'runme', function (err) {
            t.equal(err, null)

            setTimeout(function () {
              system.topology.containers.runme.type = 'container'
              system.topology.containers.runme.image = 'wibble'
              system.global.run_containers = false
              main.start(system, 'runme', function (err) {
                t.equal(err, 'run containers disabled - skipping: runme')
                t.end()
              })
            }, 1500)
          })
        })
      }, 1500)
    })
  })
})

