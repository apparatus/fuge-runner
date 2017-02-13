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
var test = require('tap').test
var config = require('fuge-config')()
var docker = require('./helpers/dockerMocks')
var proxyquire = require('proxyquire')
var dockerRunner = proxyquire('../lib/support/dockerRunner', {dockerode: docker.Docker})


function exitCb () {
}


test('docker runner test', function (t) {
  t.plan(5)

  var runner = dockerRunner()

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'containers.yml'), function (err, system) {
    t.equal(err, null)
    runner.start(system, 'live', system.topology.containers.wibble, exitCb, function (err, child) {
      t.equal(null, err)
      t.notEqual(undefined, child.pid)
      setTimeout(function () {
        runner.stop(system.topology.containers.wibble, 'asdf', function (err) {
          t.equal(null, err)
          runner.stop(system.topology.containers.wibble, child.pid, function (err) {
            t.equal(null, err)
          })
        })
      }, 100)
    })
  })
})


test('docker runner test same port', function (t) {
  t.plan(4)

  var runner = dockerRunner()

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'containers.yml'), function (err, system) {
    t.equal(err, null)
    runner.start(system, 'live', system.topology.containers.fish, exitCb, function (err, child) {
      t.equal(null, err)
      t.notEqual(undefined, child.pid)
      setTimeout(function () {
        runner.stop(system.topology.containers.fish, child.pid, function (err) {
          t.equal(null, err)
        })
      }, 100)
    })
  })
})


test('file url test', function (t) {
  t.plan(4)

  var runner = dockerRunner()

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'containers.yml'), function (err, system) {
    t.equal(err, null)
    system.global.container_engine_url = '/var/run/docker.sock'
    runner.start(system, 'live', system.topology.containers.wibble, exitCb, function (err, child) {
      t.equal(null, err)
      t.notEqual(undefined, child.pid)
      setTimeout(function () {
        runner.stop(system.topology.containers.wibble, child.pid, function (err) {
          t.equal(null, err)
        })
      }, 100)
    })
  })
})


test('http url test', function (t) {
  t.plan(4)

  var runner = dockerRunner()

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'containers.yml'), function (err, system) {
    t.equal(err, null)
    system.global.container_engine_url = 'http://localhost:1234'
    runner.start(system, 'live', system.topology.containers.wibble, exitCb, function (err, child) {
      t.equal(null, err)
      t.notEqual(undefined, child.pid)
      setTimeout(function () {
        runner.stop(system.topology.containers.wibble, child.pid, function (err) {
          t.equal(null, err)
        })
      }, 500)
    })
  })
})


test('disable container test', function (t) {
  t.plan(2)

  var runner = dockerRunner()

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'containers.yml'), function (err, system) {
    t.equal(err, null)
    system.global.run_containers = false
    runner.start(system, 'live', system.topology.containers.wibble, exitCb, function (err, child) {
      t.equal(null, err)
    })
  })
})

test('preview test', function (t) {
  t.plan(2)

  var runner = dockerRunner()

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'containers.yml'), function (err, system) {
    t.equal(err, null)
    runner.start(system, 'preview', system.topology.containers.wibble, exitCb, function (err, child) {
      t.equal(null, err)
    })
  })
})


test('fail start test', function (t) {
  t.plan(5)

  var runner = dockerRunner()

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'containers.yml'), function (err, system) {
    t.equal(err, null)

    docker.failCreate()
    runner.start(system, 'live', system.topology.containers.wibble, exitCb, function (err, child) {
      t.equal('fail', err)
    })

    docker.failAttach1()
    runner.start(system, 'live', system.topology.containers.wibble, exitCb, function (err, child) {
      t.equal('fail', err)
    })

    docker.failAttach2()
    runner.start(system, 'live', system.topology.containers.wibble, exitCb, function (err, child) {
      t.equal('fail', err)
    })

    docker.failStart()
    runner.start(system, 'live', system.topology.containers.wibble, exitCb, function (err, child) {
      t.equal('fail', err)
    })
  })
})

