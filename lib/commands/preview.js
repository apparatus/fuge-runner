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

var _ = require('lodash')
var processRunner = require('../support/processRunner')()
var dockerRunner = require('../support/dockerRunner')()


module.exports = function (config) {

  var processExitCb = function () {
    return null
  }



  function output (command, container, display) {
    var env = ''
    var result = {}

    result.run = command.detail.cmd + ' ' + command.detail.args
    result.cwd = command.detail.cwd
    result.repository = container.repository_url
    result.test = container.test
    result.environment = command.detail.environment
    console.log('run: ' + result.run)
    console.log('directory: ' + command.detail.cwd)
    console.log('repository: ' + (container.repository_url || 'not set'))
    console.log('test: ' + (container.test || 'not set'))

    if (display === 'full') {
      _.each(_.keys(command.detail.environment), function (key) {
        env += '  ' + key + '=' + command.detail.environment[key] + '\n'
      })
      console.log('environment:\n' + env)
    }
    return result
  }



  var preview = function (system, name, display, cb) {
    var container

    container = _.find(system.topology.containers, function (c) { return c.name === name })
    if (!container) { return cb('container not found: ' + name) }

    if (container.type === 'process') {
      processRunner.start(system, 'preview', container, processExitCb(), function (err, command) {
        cb(err, output(command, container, display))
      })
    } else {
      dockerRunner.start(system, 'preview', container, processExitCb(), function (err, command) {
        cb(err, output(command, container, display))
      })
    }
  }



  return {
    preview: preview
  }
}

