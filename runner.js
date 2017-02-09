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

require('events').EventEmitter.defaultMaxListeners = Infinity

var puller = require('./lib/commands/pull')()
var stater = require('./lib/commands/status')()
var tester = require('./lib/commands/test')()
var grepper = require('./lib/commands/grep')()
var previewer = require('./lib/commands/preview')()
var system = require('./lib/system')()
var util = require('./lib/support/util')()


module.exports = function () {
  return {
    pull: function (sysDef, name, cb) { puller.pull(sysDef, name, cb) },
    pullAll: function (sysDef, cb) { puller.pullAll(sysDef, cb) },

    test: function (sysDef, name, cb) { tester.test(sysDef, name, cb) },
    testAll: function (sysDef, cb) { tester.testAll(sysDef, cb) },

    stat: function (sysDef, name, cb) { stater.stat(sysDef, name, cb) },
    statAll: function (sysDef, cb) { stater.statAll(sysDef, cb) },

    grep: function (sysDef, name, search, cb) { grepper.grep(sysDef, name, search, cb) },
    grepAll: function (sysDef, search, cb) { grepper.grepAll(sysDef, search, cb) },

    start: function (sysDef, name, count, cb) { system.start(sysDef, name, count, false, cb) },
    debug: function (sysDef, name, cb) { system.start(sysDef, name, 1, true, cb) },
    startAll: function (sysDef, count, cb) { system.startAll(sysDef, count, cb) },
    stop: function (sysDef, name, count, cb) { system.stop(sysDef, name, count, cb) },
    stopAll: function (sysDef, cb) { system.stopAll(sysDef, cb) },
    preview: function (sysDef, name, display, cb) { previewer.preview(sysDef, name, display, cb) },

    watch: function (sysDef, name) { return system.watch(sysDef, name) },
    watchAll: function (sysDef) { return system.watchAll(sysDef) },
    unwatch: function (sysDef, name) { return system.unwatch(sysDef, name) },
    unwatchAll: function (sysDef) { return system.unwatchAll(sysDef) },
    tail: function (sysDef, name, count) { return system.tail(sysDef, name, count) },
    tailAll: function (sysDef) { return system.tailAll(sysDef) },
    untail: function (sysDef, name) { return system.untail(sysDef, name) },
    untailAll: function (sysDef) { return system.untailAll(sysDef) },

    processes: function () { return system.processes() },
    isProcessRunning: function (name) { return util.findProcess(system.processes(), name) }
  }
}

