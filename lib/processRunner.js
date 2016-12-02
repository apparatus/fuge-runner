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
var spawn = require('child_process').spawn
var execSync = require('child_process').execSync
var psTree = require('ps-tree')
var winPsTree = require('winpstree')


module.exports = function () {
  var isWin = /^win/.test(process.platform)

  var run = function (mode, container, exitCb, cb) {
    var cmd = container.run
    var cwd = container.path
    var env
    var child = {}
    var called = false

    console.log('running: ' + container.run)

    if (container.profiling && cmd.slice(0, 5) === 'node ' && cmd.slice(0, 7) !== 'node -r') {

      // use same node running fuge and quote windows path to handle potential spaces
      var fugePath = '"' + process.mainModule.filename + '"'

      // quote windows path to handle potential spaces
      var nodePath = isWin ? ('"' + process.argv[0] + '"') : process.argv[0]

      cmd = nodePath + ' -r ' + fugePath + ' ' + cmd.slice(5)
      container.type = 'node'
    }

    env = Object.create(process.env)
    if (container.environment) {
      env = _.merge(env, container.environment)
    }

    if (mode !== 'preview') {
      var options = {cwd: cwd, env: env, stdio: [0, 'pipe', 'pipe'], detached: false}
      if (container.type === 'node' && !isWin) {
        options.stdio[3] = 'ipc'
      }

      if (isWin) {

        // allows quoted args to cmd.exe, /s encodes inner quotes so the whole command itself can be quoted correctly
        options.windowsVerbatimArguments = true
        child = spawn(process.env.comspec, ['/s', '/c', '"', cmd, '"'], options)
      } else {
        child = spawn('/bin/bash', ['-c', cmd], options)
      }

      child.unref()

      child.on('error', function (err) {
        if (!called) {
          called = true
          exitCb(child.pid, container.name, err)
        }
      })

      child.on('exit', function (code) {
        if (!called) {
          called = true
          exitCb(child.pid, container.name, code)
        }
      })
    } else {
      child.detail = { cmd: cmd,
                       environment: container.environment,
                       cwd: cwd }
    }

    cb(null, child)
  }



  var start = function (mode, container, runContainers, exitCb, cb) {
    if (container && container.run) {
      if (container.type === 'container' && !runContainers) {
        console.log('docker disabled, skipping: ' + container.run)
        cb()
      } else {
        run(mode, container, exitCb, cb)
      }
    } else {
      console.log('warning: ' + container.name + ' not started, missing execute statement')
      cb()
    }
  }



  var getContainerId = function (psOutput, container) {
    var lines = psOutput.split('\n')
    var re = new RegExp('^([a-f0-9]+)\\s+' + container.image + '.*')
    var id = null
    var match

    _.each(lines, function (line) {
      match = re.exec(line)
      if (match) {
        id = match[1]
      }
    })
    return id
  }



  var kill = function kill (container, pid, signal, cb) {
    var psOutput
    var id

    if (pid) {
      try {
        if (container.type === 'container' || container.type === 'docker') {
          if (!psOutput) {
            psOutput = execSync('docker ps').toString()
          }
          id = getContainerId(psOutput, container)
          if (id) {
            execSync('docker kill ' + id)
          }
          cb(null)
        } else {
          if (isWin) {
            winPsTree(pid, function (err, childPids) {
              if (err) {
                return cb(err)
              }
              async.eachSeries(childPids, function (childPid, next) {
                console.log('sending ' + signal + ' to child process: ' + childPid)
                try { process.kill(childPid, signal) } catch (e) {}
                next()
              }, function () {
                console.log('sending ' + signal + ' to parent process: ' + pid)
                try { process.kill(pid, signal) } catch (e) {}
                cb(null)
              })
            })
          } else {
            psTree(pid, function (err, children) {
              if (err) {
                return cb(err)
              }
              async.eachSeries(children, function (child, next) {
                console.log('sending ' + signal + ' to  child process: ' + child.PID)
                try { process.kill(child.PID, signal) } catch (e) {}
                next()
              }, function () {
                console.log('sending ' + signal + ' to  parent process: ' + pid)
                try { process.kill(pid, signal) } catch (e) {}
                cb(null)
              })
            })
          }
        }
      } catch (e) {
        console.log(e)
      }
    }
  }



  var stop = function stop (container, pid, cb) {
    kill(container, pid, 'SIGKILL', cb)
  }



  return {
    kill: kill,
    start: start,
    stop: stop
  }
}

