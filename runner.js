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

var puller = require('./lib/gitPuller')()
var builder = require('./lib/processBuilder')()
var previewer = require('./lib/previewer')()
var system = require('./lib/system')()
var util = require('./lib/util')()


module.exports = function () {
  return {
    generate: function (name, cb) { puller.generate(name, cb) },
    pullAll: function (sysDef, cb) { puller.pullAll(sysDef, cb) },

    buildAll: function (sysDef, cb) { builder.buildAll(sysDef, cb) },

    start: function (sysDef, name, count, cb) { system.start(sysDef, name, count, cb) },
    startAll: function (sysDef, count, cb) { system.startAll(sysDef, count, cb) },
    stop: function (sysDef, name, count, cb) { system.stop(sysDef, name, count, cb) },
    stopAll: function (sysDef, cb) { system.stopAll(sysDef, cb) },
    preview: function (sysDef, name, cb) { previewer.preview(sysDef, name, cb) },
    previewAll: function (sysDef, cb) { previewer.previewAll(sysDef, cb) },
    debug: function (sysDef, name, cb) { system.debug(sysDef, name, cb) },

    watch: function (sysDef, name) { return system.watch(sysDef, name) },
    watchAll: function (sysDef) { return system.watchAll(sysDef) },
    unwatch: function (sysDef, name) { return system.unwatch(sysDef, name) },
    unwatchAll: function (sysDef) { return system.unwatchAll(sysDef) },
    tail: function (sysDef, name, count) { return system.tail(sysDef, name, count) },
    tailAll: function (sysDef) { return system.tailAll(sysDef) },
    untail: function (sysDef, name) { return system.untail(sysDef, name) },
    untailAll: function (sysDef) { return system.untailAll(sysDef) },

    processes: function () { return system.processes() },
    isProcessRunning: function (name) { return util.findProcess(system.processes(), name) },

    grep: function (system, name, search, cb) { util.grep(system.global.log_path, name, search, cb) },
    grepAll: function (system, search, cb) { util.grepAll(system, search, cb) },

    sendMessage: function (sysDef, name, message) { system.sendMessage(sysDef, name, message) }
  }
}

