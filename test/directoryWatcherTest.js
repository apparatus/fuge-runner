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
var test = require('tape')
var watcher = require('../lib/directoryWatcher.js')()

var container = {
  id: 'frontend-456805ef',
  name: 'frontend',
  containedBy: 'machine$fe2-2a4e28e5',
  containerDefinitionId: 'frontend',
  type: 'node',
  contains: [],
  specific: {
    type: 'node',
    path: path.join(__dirname, '/fixture/directoryWatcher'),
    proxyPort: 10000,
    servicePort: 20008,
    buildScript: 'buildsrv.sh',
    repositoryUrl: 'fish',
    execute: {
      exec: 'node runme.js'
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


test('directory watcher test', function (t) {
  t.plan(1)
  var w

  watcher.start(container, {}, function () {
    t.pass('watcher called')
    watcher.stop(w)
  },
  function (watcher) {
    w = watcher
  })

  setTimeout(function () {
    fs.writeFileSync(path.join(__dirname, '/fixture/directoryWatcher/asdf.txt'), 'asdf', 'utf8')
  }, 1000)
})


test('directory watcher disabled test', function (t) {
  t.plan(1)
  var w

  var opts = { overrides: { frontend: { monitor: false } } }
  watcher.start(container, opts, function () {
    watcher.stop(w)
  },
  function (watcher) {
    t.equal(watcher, null, 'watcher is null')
    w = watcher
  })

  setTimeout(function () {
    fs.writeFileSync(path.join(__dirname, '/fixture/directoryWatcher/asdf.txt'), 'asdf', 'utf8')
  }, 1000)
})
