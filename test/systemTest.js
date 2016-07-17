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
var _ = require('lodash')
var test = require('tape')
var system = require('../lib/system.js')({runDocker: false,
                                          logPath: path.join(__dirname, '/log')})
var sys = require('./fixture/system/systemDefinition.js')
var sys2 = require('./fixture/system2/systemDefinition.js')
var async = require('async')


test.skip('system test', function (t) {
  t.plan(6)

  var fixPath = path.join(__dirname, '/fixture/system/response.json')
  fs.writeFileSync(fixPath, '{ "resp": "Hello World!\\n" }', 'utf8')
  system.startAll(sys, 1, function (err) {
    t.equal(err, undefined)

    setTimeout(function () {
      request('http://localhost:8000', function (error, response, body) {
        t.equal(error, undefined)
        t.equal(body, 'Hello World!\n')

        fs.writeFileSync(fixPath, '{ "resp": "Hello Fish!\\n" }', 'utf8')
        setTimeout(function () {
          request('http://localhost:8000', function (error, response, body) {
            t.equal(error, undefined)
            t.equal(body, 'Hello Fish!\n')
            system.stopAll(sys, function (err) {
              t.equal(err, undefined)
            })
          })
        }, 1000)
      })
    }, 1000)
  })
})


test.skip('system fail test', function (t) {
  t.plan(1)

  system.reset()

  var fixPath = path.join(__dirname, '/fixture/system2/response.json')
  fs.writeFileSync(fixPath, '{ "resp": "Hello World!\\n" }', 'utf8')
  system.startAll(sys, 1, function () {
    setTimeout(function () {
      var p = system.processes()
      // console.log(JSON.stringify(p, null, 2))
      delete p[_.keys(p)[0]].container.specific.execute.exec
      fs.writeFileSync(fixPath, '{ "resp": "Hello Fish!\\n" }', 'utf8')
      setTimeout(function () {
        system.stopAll(sys2, function (err) {
          t.equal(err, undefined)
        })
      }, 200)
    }, 1000)
  })
})


test.skip('system colour test', function (t) {
  var restart = [0, 0, 0, 0, 0]
  t.plan(1)

  system.reset()
  async.eachSeries(restart, function (idx, next) {
    system.reset()
    system.startAll(sys, 1, function () {
      setTimeout(function () {
        system.stopAll(sys, function () {
          next()
        })
      }, 500)
    })
  }, function () {
    t.equal(1, 1)
  })
})
