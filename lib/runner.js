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

var processRunner = require('./processRunner')()
var dockerRunner = require('./dockerRunner')()

module.exports = function () {

  function start (system, mode, container, exitCb, cb) {
    console.log('runner: ' + container.type)
    if (container.type === 'process') {
      processRunner.start(system, mode, container, exitCb, cb)
    }
    if (container.type === 'container') {
      dockerRunner.start(system, mode, container, exitCb, cb)
    }
  }



  function stop (container, pid, cb) {
    console.log('RUNNER STOP')
    if (container.type === 'process') {
      processRunner.stop(container, pid, cb)
    }
    if (container.type === 'container') {
      dockerRunner.stop(container, pid, cb)
    }
  }



  function kill (container, pid, sig, cb) {
    processRunner.kill(container, pid, sig, cb)
  }



  return {
    start: start,
    stop: stop,
    kill: kill
  }
}

