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


module.exports = function () {

  var start = function (container, changedCb, cb) {
    var watcherArgs = {persistent: true, ignoreInitial: true}

    // do not monitor docker conatiners
    if (container.type === 'docker' || container.type === 'container') {
      return cb(null)
    }

    watcherArgs.ignored = container.monitor_excludes

    var watcher = chokidar.watch(container.path, watcherArgs)
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

