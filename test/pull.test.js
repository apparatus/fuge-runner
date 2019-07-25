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


test('git pull test', function (t) {
  var output = ['Already up-to-date.']

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    processMocks.setOutput(output)
    runner.pull(system, 'runme', function (err) {
      t.equal(err, null)
      t.end()
    })
  })
})


test('pull fail test', function (t) {
  var output = ['Already up-to-date.']

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    processMocks.setOutput(output)
    dockerMocks.setOutput(output)

    runner.pull(system, 'wibble', function (err) {
      t.equal(err, 'container not found: wibble')
      runner.pull(system, 'runmeagain', function (err) {
        t.equal(err, 'missing repository url for: runmeagain')
        runner.pull(system, 'redis', function (err) {
          t.equal(err, 'missing image tag for: redis')
          t.end()
        })
      })
    })
  })
})


test('git pull all test', function (t) {
  var output = ['Already up-to-date.']

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    processMocks.setOutput(output)
    dockerMocks.setOutput(output)

    runner.pullAll(system, function (err) {
      console.log(err)
      t.equal(err, null)
      t.end()
    })
  })
})


test('docker pull fail test', function (t) {
  var output = ['Already up-to-date.']

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    configureLogs(system)
    dockerMocks.setOutput(output)
    dockerMocks.failPull()

    runner.pull(system, 'mongo', function (err) {
      t.equal(err, 'fail pull test')

      dockerMocks.failFollow()
      runner.pull(system, 'mongo', function (err) {
        t.equal(err, 'fail follow test')
        t.end()
      })
    })
  })
})

