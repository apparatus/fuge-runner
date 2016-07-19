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



module.exports = function (config) {
  var puller = require('./lib/gitPuller')(config)
  var builder = require('./lib/processBuilder')(config)
  var previewer = require('./lib/previewer')(config)
  var system = require('./lib/system')(config)
  var util = require('./lib/util')()

  var start = function (sysDef, name, count, cb) { system.start(sysDef, name, count, cb) }
  var startAll = function (sysDef, count, cb) { system.startAll(sysDef, count, cb) }
  var debug = function (sysDef, name, cb) { system.debug(sysDef, name, cb) }
  var profile = function (sysDef, name, cb) { system.profile(sysDef, name, cb) }
  var stop = function (sysDef, name, count, cb) { system.stop(sysDef, name, count, cb) }
  var stopAll = function (sysDef, cb) { system.stopAll(sysDef, cb) }

  var generate = function (name, cb) { puller.generate(name, cb) }
  var pullAll = function (sysDef, cb) { puller.pullAll(sysDef, cb) }

  var buildAll = function (sysDef, cb) { builder.buildAll(sysDef, cb) }

  var watch = function (sysDef, name) { system.watch(sysDef, name) }
  var watchAll = function (sysDef) { system.watchAll(sysDef) }
  var unwatch = function (sysDef, name) { system.unwatch(sysDef, name) }
  var unwatchAll = function (sysDef) { system.unwatchAll(sysDef) }
  var tail = function (sysDef, name, count) { system.tail(sysDef, name, count) }
  var tailAll = function (sysDef) { system.tailAll(sysDef) }
  var untail = function (sysDef, name) { system.untail(sysDef, name) }
  var untailAll = function (sysDef) { system.untailAll(sysDef) }

  var processes = function () { return system.processes() }
  var isProcessRunning = function (name) { return util.findProcess(system.processes(), name) }
  var preview = function (sysDef, name, cb) { previewer.preview(sysDef, name, cb) }
  var previewAll = function (sysDef, cb) { previewer.previewAll(sysDef, cb) }

  var grep = function (name, config, search, cb) { util.grep(name, config, search, cb) }
  var grepAll = function (system, config, search, cb) { util.grepAll(system, config, search, cb) }

  var heap = function (sysDef, name) { system.heap(sysDef, name) }
  var sendMessage = function (sysDef, name, message) { system.sendMessage(sysDef, name, message) }
  var startReport = function (sysDef, name) { system.startReport(sysDef, name) }
  var stopReport = function (sysDef, name) { system.stopReport(sysDef, name) }

  return {
    start: start,
    startAll: startAll,
    debug: debug,
    profile: profile,
    stop: stop,
    stopAll: stopAll,

    generate: generate,
    pullAll: pullAll,

    buildAll: buildAll,

    watch: watch,
    watchAll: watchAll,
    unwatch: unwatch,
    unwatchAll: unwatchAll,

    tail: tail,
    tailAll: tailAll,
    untail: untail,
    untailAll: untailAll,

    processes: processes,
    isProcessRunning: isProcessRunning,
    previewAll: previewAll,
    preview: preview,

    grep: grep,
    grepAll: grepAll,

    heap: heap,
    sendMessage: sendMessage,
    startReport: startReport,
    stopReport: stopReport
  }
}
