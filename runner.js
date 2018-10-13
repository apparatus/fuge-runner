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
var shell = require('./lib/commands/shell')()
var system = require('./lib/system')()


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

    shell: function (sysDef, command, cb) { shell.shell(sysDef, command, cb) },
    apply: function (sysDef, command, cb) { shell.apply(sysDef, command, cb) },
    papply: function (sysDef, command, cb) { shell.papply(sysDef, command, cb) },

    start: function (sysDef, name, cb) { system.start(sysDef, name, false, cb) },
    debug: function (sysDef, name, cb) { system.start(sysDef, name, true, cb) },
    startAll: function (sysDef, cb) { system.startAll(sysDef, cb) },
    stop: function (sysDef, name, cb) { system.stop(sysDef, name, cb) },
    stopAll: function (sysDef, cb) { system.stopAll(sysDef, cb) },
    preview: function (sysDef, name, display, cb) { previewer.preview(sysDef, name, display, cb) },

    watch: function (sysDef, name, cb) { return system.watch(sysDef, name, cb) },
    watchAll: function (sysDef, cb) { return system.watchAll(sysDef, cb) },
    unwatch: function (sysDef, name, cb) { return system.unwatch(sysDef, name, cb) },
    unwatchAll: function (sysDef, cb) { return system.unwatchAll(sysDef, cb) },
    tail: function (sysDef, name) { return system.tail(sysDef, name) },
    tailAll: function (sysDef) { return system.tailAll(sysDef) },
    untail: function (sysDef, name) { return system.untail(sysDef, name) },
    untailAll: function (sysDef) { return system.untailAll(sysDef) },

    isProcessRunning: function (sysDef, name) { return system.running(sysDef, name) }

    // re: function (sysDef, name) { return editer.edit(sysDef, name, cb) }
  }
}

