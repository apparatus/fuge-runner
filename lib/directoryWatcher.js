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

var chokidar = require('chokidar')
var path = require('path')
var _ = require('lodash')


module.exports = function () {

  var start = function (container, config, changedCb, cb) {
    var watcherArgs = {persistent: true,
                       ignoreInitial: true}

    if (config && config.exclude) {
      watcherArgs.ignored = config.exclude
    }

    var monitor = container && _.get(config,
      ['overrides', container.name, 'monitor'], true)

    if (!monitor) {
      return cb(null)
    }

    // do not monitor docker conatiners!!
    if (container.type === 'docker') {
      return cb(null)
    }

    if (Object(monitor) === monitor && monitor.exclude) {
      watcherArgs.ignored = !(config && config.exclude)
        ? monitor.exclude
          : Array.isArray(config.exclude)
            ? [monitor.exclude, config.exclude]
            : [monitor.exclude].concat(config.exclude)
    }

    if (container.specific.path[container.specific.path.length - 1] === '/' ||
        container.specific.path[container.specific.path.length - 1] === '\\') {
      container.specific.path = path.resolve(container.specific.path)
    }

    var watcher = chokidar.watch(container.specific.path, watcherArgs)
    watcher.on('add', changedCb)
    watcher.on('change', changedCb)
    watcher.on('unlink', changedCb)
    watcher.on('addDir', changedCb)
    watcher.on('unlinkdir', changedCb)
    cb(watcher)
  }



  var stop = function stop (watcher) {
    if (watcher && watcher.close) {
      watcher.close()
    }
  }



  return {
    start: start,
    stop: stop
  }
}

