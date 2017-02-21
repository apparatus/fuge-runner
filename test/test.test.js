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
var test = require('tap').test
var config = require('fuge-config')()
var processMocks = require('./helpers/processMocks')()
var dockerMocks = require('./helpers/dockerMocks')

var proxyquire = require('proxyquire')
proxyquire('../lib/support/processRunner', {child_process: processMocks})
proxyquire('../lib/support/dockerRunner', {dockerode: dockerMocks.Docker})
var runner = require('../runner')()



function configureLogs (system) {
  var logPath = path.resolve(path.join(__dirname, 'fixture', 'system', 'fuge', 'log'))
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath)
  }
  system.global.log_path = logPath
}


test('test script test', function (t) {
  t.plan(2)
  var output = ['Already up-to-date.']

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    processMocks.setOutput(output)
    runner.test(system, 'runme', function (err) {
      t.equal(err, null)
    })
  })
})


test('test script fail test', function (t) {
  t.plan(4)
  var output = ['Already up-to-date.']

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    processMocks.setOutput(output)

    runner.test(system, 'fishwibble', function (err) {
      t.equal(err, 'container not found: fishwibble')
      runner.test(system, 'runmeagain', function (err) {
        t.equal(err, 'missing test script for: runmeagain')
        runner.test(system, 'mongo', function (err) {
          t.equal(err, 'testing not suuported for this container type: container')
        })
      })
    })
  })
})


test('test script all test', function (t) {
  t.plan(2)
  var output = ['Already up-to-date.']

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    processMocks.setOutput(output)
    runner.testAll(system, function (err) {
      t.equal(err, null)
    })
  })
})


test('test script fail on exit test', function (t) {
  t.plan(2)
  var output = ['Already up-to-date.']

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    processMocks.setOutput(output)
    processMocks.setFailExit()
    runner.test(system, 'runme', function (err) {
      t.equal(err, 'fail exit test')
    })
  })
})

