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
var request = require('request')
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


test('start stop test', function (t) {
  t.plan(3)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.start(system, 'runme', function (err) {
      t.equal(err, null)
      setTimeout(function () {
        main.stop(system, 'runme', function (err) {
          t.equal(err, null)
        })
      }, 500)
    })
  })
})


test('debug start stop test', function (t) {
  t.plan(3)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.debug(system, 'runme', function (err) {
      t.equal(err, null)
      setTimeout(function () {
        main.stop(system, 'runme', function (err) {
          t.equal(err, null)
        })
      }, 500)
    })
  })
})


test('start stop all no containers test', function (t) {
  t.plan(3)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'docker.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    system.global.run_containers = false
    main.startAll(system, function (err) {
      t.equal(err, null)
      setTimeout(function () {
        main.stopAll(system, function (err) {
          t.equal(err, null)
        })
      }, 500)
    })
  })
})


test('start stop all with containers test', function (t) {
  t.plan(3)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'docker.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.startAll(system, function (err) {
      t.equal(err, null)
      setTimeout(function () {
        main.stopAll(system, function (err) {
          t.equal(err, null)
        })
      }, 500)
    })
  })
})


test('watch unwatch test', function (t) {
  t.plan(3)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)
    configureLogs(system)

    main.watch(system, 'runme', function (err) {
      t.equal(null, err, 'check watch single container')
      setTimeout(function () {
        main.unwatch(system, 'wibble', function () {
          main.unwatch(system, 'runme', function (err) {
            t.equal(null, err, 'check unwatch single container')
          })
        })
      }, 500)
    })
  })
})


test('watch unwatch all test', function (t) {
  t.plan(3)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)
    configureLogs(system)

    main.watchAll(system, function (err) {
      t.equal(null, err, 'check watch all')
      setTimeout(function () {
        main.unwatch(system, 'runme', function () {
          main.unwatchAll(system, function (err) {
            t.equal(null, err, 'check unwatch all')
          })
        })
      }, 500)
    })
  })
})


test('tail untail test', function (t) {
  t.plan(13)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)
    t.ok(main.tail(system, 'runme'), 'check tail single container')
    t.ok(main.untail(system, 'runme'), 'check untail single container')
    t.ok(main.tailAll(system), 'check tail all containers')
    t.ok(main.untailAll(system), 'check untail tail all containers')
    t.equal(null, main.tail(system, 'wibble'), 'check tail bad container')
    t.equal(null, main.untail(system, 'wibble'), 'check untail bad container')

    configureLogs(system)
    main.startAll(system, function (err) {
      t.equal(err, null)
      setTimeout(function () {
        t.ok(main.tail(system, 'runme'), 'check tail single container')
        t.ok(main.untail(system, 'runme'), 'check untail single container')
        t.ok(main.tailAll(system), 'check tail all containers')
        t.ok(main.untailAll(system), 'check untail tail all containers')
        main.stopAll(system, function (err) {
          t.equal(err, null)
        })
      }, 500)
    })
  })
})


test('ps and grep test', function (t) {
  t.plan(10)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.startAll(system, function (err) {
      t.equal(err, null)

      setTimeout(function () {
        t.ok(main.isProcessRunning(system, 'runme'), 'check process is running')

        main.grep(system, 'runme', 'Server running', function (err, result) {
          t.equal(err, null)
          t.equal(result.length, 1, 'check grep result')

          main.grep(system, 'fishbananna', 'Server running', function (err, result) {
            t.equal(err, null)
            t.equal(result.length, 0, 'check grep result')

            main.grepAll(system, 'Server running', function (err, result) {
              t.equal(err, null)
              t.equal(result.length, 6, 'check grepall result')
              main.stopAll(system, function (err) {
                t.equal(err, null)
              })
            })
          })
        })
      }, 500)
    })
  })
})


test('watcher restart test', function (t) {
  t.plan(7)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'fromfile.yml'), function (err, system) {
    t.equal(err, null)
    var fixPath = path.join(__dirname, 'fixture', 'system', 'fromfile', 'response.json')
    fs.writeFileSync(fixPath, '{ "resp": "Hello World!\\n" }', 'utf8')

    var logPath = path.resolve(path.join(__dirname, 'fixture', 'system', 'fuge', 'log'))
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath)
    }
    system.global.log_path = logPath

    main.startAll(system, function (err) {
      t.equal(err, null)

      setTimeout(function () {
        request('http://localhost:8000', function (error, response, body) {
          t.equal(error, null)
          t.equal(body, 'Hello World!\n')

          fs.writeFileSync(fixPath, '{ "resp": "Hello Fish!\\n" }', 'utf8')
          setTimeout(function () {
            request('http://localhost:8000', function (error, response, body) {
              t.equal(error, null)
              t.equal(body, 'Hello Fish!\n')
              main.stopAll(system, function (err) {
                fs.unlinkSync(fixPath)
                t.equal(err, null)
              })
            })
          }, 500)
        })
      }, 500)
    })
  })
})

