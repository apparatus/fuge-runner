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
var spawn = require('child_process').spawn
var async = require('async')
var util = require('./util')()


module.exports = function (config) {
  var processes = {}

  var defaultBuildScript = _.get(config, 'defaults.build', false)
  var buildContainer = function (mode, container, exitCb, cb) {
    var toExec
    var cmd
    var cwd
    var env
    var child = {}
    var called = false
    var buildScript = _.get(container, 'specific.buildScript', defaultBuildScript)

    cmd = buildScript
    cwd = container.specific.path

    toExec = cmd

    env = Object.create(process.env)
    if (mode !== 'preview') {
      child = spawn('/bin/bash', ['-c', toExec],
        {cwd: cwd, env: env, stdio: [0, 'pipe', 'pipe'], detached: false})

      child.on('error', function (err) {
        if (!called) {
          called = true
          exitCb(child.pid, toExec, err)
        }
      })

      child.on('exit', function (code) {
        if (!called) {
          called = true
          exitCb(child.pid, toExec, code)
        }
      })
    } else {
      child.detail = {
        cmd: cmd,
        environment: container.specific.environment,
        cwd: cwd
      }
    }

    cb(null, child)
  }


  var runBuild = function (mode, container, exitCb, cb) {
    var buildScript = _.get(container, 'specific.buildScript', defaultBuildScript)

    if (!buildScript) {
      return cb(new Error('missing buildScript statement for container: ' + container.id + ' aborting'))
    }

    buildContainer(mode, container, exitCb, function (err, child) {
      cb(err, child)
    })
  }

  var buildAll = function (system, cb) {
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var container = system.topology.containers[key]
      if (util.isExecutableContainer(container) && container.type === 'process') {
        console.log('building: ' + container.name)
        runBuild('live', container, function (/* childPid, toExec, code */) {
          next()
        }, function (err, child) {
          if (err) {
            return
          }
          if (child) {
            processes[child.pid] = {
              container: container,
              identifier: container.name,
              running: true,
              exitCode: null,
              colour: util.selectColour(),
              tail: true,
              child: child
            }
            util.streamOutput(processes[child.pid], config)
          }
        })
      } else {
        next()
      }
    }, function (err) {
      cb(err)
    })
  }



  return {
    buildAll: buildAll
  }
}
