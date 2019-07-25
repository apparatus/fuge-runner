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


test('tail untail test', function (t) {
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
        setTimeout(function () {
          main.stopAll(system, function (err) {
            t.equal(err, null)
            t.end()
          })
        }, 1500)
      }, 1500)
    })
  })
})
