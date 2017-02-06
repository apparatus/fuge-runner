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
var test = require('tap').test
var main = require('../runner.js')()
var config = require('fuge-config')()


function configureLogs (system) {
  var logPath = path.resolve(path.join(__dirname, 'fixture', 'system', 'fuge', 'log'))
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath)
  }
  system.global.log_path = logPath
}


test('preview test', function (t) {
  t.plan(6)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    main.preview(system, 'runme', function (err, result) {
      t.equal(err, undefined)
      t.equal(result.detail.environment.RUNME_PORT_8000_TCP, 'tcp://127.0.0.1:8000')
    })

    main.previewAll(system, function (err, result) {
      t.equal(err, undefined)
      t.equal(result[0].detail.environment.RUNME_PORT_8000_TCP, 'tcp://127.0.0.1:8000')
      t.equal(result[1].detail.environment.RUNMETOO_PORT_8001_TCP, 'tcp://127.0.0.1:8001')
    })
  })
})


test('start stop test', function (t) {
  t.plan(3)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.start(system, 'runme', 1, function (err) {
      t.equal(err, undefined)
      setTimeout(function () {
        main.stop(system, 'runme', 1, function (err) {
          t.equal(err, undefined)
        })
      }, 1000)
    })
  })
})


test('start stop all test', function (t) {
  t.plan(3)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.startAll(system, 1, function (err) {
      t.equal(err, undefined)
      setTimeout(function () {
        main.stopAll(system, function (err) {
          t.equal(err, undefined)
        })
      }, 1000)
    })
  })
})


/*
test('debug test', function(t) {
    debug: function (sysDef, name, cb) { system.debug(sysDef, name, cb) },
}
*/

test('watch unwatch test', function (t) {
  t.plan(11)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)
    t.ok(main.watch(system, 'runme'), 'check watch single container')
    t.ok(main.unwatch(system, 'runme'), 'check unwatch single container')
    t.ok(main.watchAll(system), 'check watch all containers')
    t.ok(main.unwatchAll(system), 'check unwatch watch all containers')

    configureLogs(system)
    main.startAll(system, 1, function (err) {
      t.equal(err, undefined)
      setTimeout(function () {
        t.ok(main.watch(system, 'runme'), 'check watch single container')
        t.ok(main.unwatch(system, 'runme'), 'check unwatch single container')
        t.ok(main.watchAll(system), 'check watch all containers')
        t.ok(main.unwatchAll(system), 'check unwatch watch all containers')
        main.stopAll(system, function (err) {
          t.equal(err, undefined)
        })
      }, 1000)
    })
  })
})


test('tail untail test', function (t) {
  t.plan(11)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)
    t.ok(main.tail(system, 'runme'), 'check tail single container')
    t.ok(main.untail(system, 'runme'), 'check untail single container')
    t.ok(main.tailAll(system), 'check tail all containers')
    t.ok(main.untailAll(system), 'check untail tail all containers')

    configureLogs(system)
    main.startAll(system, 1, function (err) {
      t.equal(err, undefined)
      setTimeout(function () {
        t.ok(main.tail(system, 'runme', 1), 'check tail single container')
        t.ok(main.untail(system, 'runme'), 'check untail single container')
        t.ok(main.tailAll(system), 'check tail all containers')
        t.ok(main.untailAll(system), 'check untail tail all containers')
        main.stopAll(system, function (err) {
          t.equal(err, undefined)
        })
      }, 1000)
    })
  })
})


test('ps and grep test', function (t) {
  t.plan(7)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'runner.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    main.startAll(system, 1, function (err) {
      t.equal(err, undefined)

      setTimeout(function () {
        t.equal(Object.keys(main.processes()).length, 2, 'check process count is correct')
        t.ok(main.isProcessRunning('runme'), 'check process is running')

        main.grep(system, 'runme', 'Server running', function (result) {
          t.equal(result.length, 1, 'check grep result')
          main.grepAll(system, 'Server running', function (result) {
            t.equal(result.length, 2, 'check grepall result')
            main.stopAll(system, function (err) {
              t.equal(err, undefined)
            })
          })
        })
      }, 1000)
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

    main.startAll(system, 1, function (err) {
      t.equal(err, undefined)

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
                t.equal(err, undefined)
              })
            })
          }, 1000)
        })
      }, 1000)
    })
  })
})

