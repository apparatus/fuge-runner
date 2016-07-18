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

var test = require('tape')
var path = require('path')
var runner = require('../lib/processRunner.js')()

var container = {
  id: 'frontend-456805ef',
  name: 'frontend',
  containedBy: 'machine$fe2-2a4e28e5',
  containerDefinitionId: 'frontend',
  type: 'process',
  contains: [],
  specific: {
    type: 'process',
    path: path.join(__dirname, '/fixture/processRunner'),
    proxyPort: 10000,
    servicePort: 20008,
    buildScript: 'buildsrv.sh',
    repositoryUrl: 'fish',
    execute: {
      exec: 'node runme.js'
    },
    yamlPath: path.join(__dirname, '/system.yml'),
    source: {
    },
    environment: {
      PROXY_HOST: '__TARGETIP__',
      'frontend_PORT': 10000,
      'users_PORT': 10001,
      'permissions_PORT': 10002,
      'business_logic_PORT': 10003,
      'audit_PORT': 10004,
      'emails_PORT': 10005,
      SERVICE_HOST: '0.0.0.0',
      SERVICE_PORT: 20008
    }
  }
}



var exitCb = function () {
}


test('process runner test', function (t) {
  t.plan(3)

  runner.start('live', container, {}, exitCb, function (err, child) {
    t.equal(null, err)
    t.notEqual(undefined, child.pid)
    setTimeout(function () {
      runner.stop(container, child.pid, function (err) {
        t.equal(null, err)
      })
    }, 1000)
  })
})

test('process exit test', function (t) {
  t.plan(2)

  container.specific.execute.exec = 'node willfail.js'
  runner.start('live', container, {}, exitCb, function (err, child) {
    t.equal(null, err)
    setTimeout(function () {
      runner.stop(container, child.pid, function (err) {
        t.equal(null, err)
      })
    }, 1000)
  })
})


test('missing exec', function (t) {
  t.plan(1)

  container.specific.execute.exec = undefined
  runner.start('live', container, {}, exitCb, function (err) {
    t.notEqual(null, err)
  })
})


test('process fail test', function (t) {
  t.plan(3)

  container.specific.execute.exec = 'node wibble.js'
  runner.start('live', container, {}, exitCb, function (err, child) {
    t.equal(null, err)
    t.notEqual(undefined, child.pid)
    setTimeout(function () {
      runner.stop(container, child.pid, function (err) {
        t.equal(null, err)
      })
    }, 1000)
  })
})

