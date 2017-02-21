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
var processMocks = require('./helpers/processMocks')()
var dockerMocks = require('./helpers/dockerMocks')

var proxyquire = require('proxyquire')
proxyquire('../lib/support/processRunner', {child_process: processMocks})
proxyquire('../lib/support/dockerRunner', {dockerode: dockerMocks.Docker})
var runner = require('../runner')()


test('preview test', function (t) {
  t.plan(5)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    runner.preview(system, 'runme', 'short', function (err, result) {
      t.equal(err, null)
      t.equal(result.environment.RUNME_PORT_8000_TCP, 'tcp://127.0.0.1:8000')

      runner.preview(system, 'runme', 'full', function (err, result) {
        t.equal(err, null)
        t.equal(result.environment.RUNME_PORT_8000_TCP, 'tcp://127.0.0.1:8000')
      })
    })
  })
})


test('docker preview test', function (t) {
  t.plan(3)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    runner.preview(system, 'mongo', 'short', function (err, result) {
      t.equal(err, null)
      t.equal(result.environment.RUNME_PORT_8000_TCP, 'tcp://127.0.0.1:8000')
    })
  })
})


test('preview fail test', function (t) {
  t.plan(2)

  config.load(path.join(__dirname, 'fixture', 'system', 'fuge', 'pull.yml'), function (err, system) {
    t.equal(err, null)

    runner.preview(system, 'fishbananna', 'short', function (err, result) {
      t.equal(err, 'container not found: fishbananna')
    })
  })
})

