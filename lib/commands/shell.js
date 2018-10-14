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
var async = require('async')
var processRunner = require('../support/processRunner')()


module.exports = function () {
  var isWin = /^win/.test(process.platform)


  function run (system, container, command, commandName, cb) {
    var cmd = command
    if (winBash()) {
      cmd = 'bash -c "' + command + '"'
    } else if (isWin) {
      cmd = 'cmd /C ' + command
    } else {
      cmd = 'bash -c "' + command + '"'
    }
    processRunner.runCommand(system, container, cmd, commandName, cb)
  }


  function winBash () {
    var bashos = 'windows'
    var path = process.env.PATH
    if ((path.indexOf('\\usr\\bin') > -1)) {
      return bashos
    }
  }


  function shell (system, command, cb) {
    var container
    var c

    _.each(system.topology.containers, function (c) {
      if (c.type !== 'docker' && c.type !== 'container') {
        container = c
      }
    })

    c = _.cloneDeep(container)
    c.run = command
    c.name = ''
    c.path = process.cwd()
    c.type = 'process'
    run(system, c, command, 'shell', cb)
  }


  function apply (system, command, cb) {
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      if (system.topology.containers[key].type === 'process' || system.topology.containers[key].type === 'node') {
        console.log('[' + system.topology.containers[key].name + ']')
        run(system, system.topology.containers[key], command, 'apply', function (err) {
          next(err)
        })
      } else {
        next()
      }
    }, function (err) {
      cb(err || null)
    })
  }



  function papply (system, command, cb) {
    async.each(_.keys(system.topology.containers), function (key, next) {
      if (system.topology.containers[key].type === 'process' || system.topology.containers[key].type === 'node') {
        console.log('[' + system.topology.containers[key].name + ']')
        run(system, system.topology.containers[key], command, 'apply', function (err) {
          next(err)
        })
      } else {
        next()
      }
    }, function (err) {
      cb(err || null)
    })
  }



  return {
    run: run,
    shell: shell,
    papply: papply,
    apply: apply
  }
}

