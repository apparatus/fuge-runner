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
var fs = require('fs')
var path = require('path')
var dotenv = require('dotenv')

module.exports = function () {
  var isWin = /^win/.test(process.platform)


  var handleIpAddress = function (container, cmd) {
    var ipAddress

    ipAddress = container.specific.ipAddress || '127.0.0.1'
    cmd = cmd.replace(/__TARGETIP__/g, ipAddress)
    return cmd
  }



  var generateEnvironment = function (containerEnv) {
    var envArgs = isWin ? ' ' : 'env '
    _.each(_.keys(containerEnv), function (key) {
      if (isWin) {
        envArgs += 'set ' + key + '=' + containerEnv[key] + '&&'
      } else {
        envArgs += '"' + key + '=' + containerEnv[key] + '" '
      }
    })
    return envArgs
  }



  var run = function (mode, container, exitCb, cb) {
    var cmd = container.specific.execute.exec
    var cwd = container.specific.path
    var envFile = getEnvFile(container)

    var env
    var toExec
    var child = {}
    var envArgs = ''
    var called = false

    if (cmd.slice(0, 5) === 'node ' && cmd.slice(0, 7) !== 'node -r') {
      // use same node running fuge
      // and quote windows path to handle potential spaces
      var fugePath = '"' + process.mainModule.filename + '"'

      // quote windows path to handle potential spaces
      var nodePath = isWin ? ('"' + process.argv[0] + '"') : process.argv[0]

      cmd = nodePath + ' -r ' + fugePath + ' ' + cmd.slice(5)
      container.type = 'node'
    }

    if (envFile && !fs.existsSync(envFile)) {
      return cb('Error: ' + envFile + ' does not exist')
    }

    if (container.specific && container.specific.environment) {
      envArgs = generateEnvironment(container.specific.environment)
    }

    if (envFile) {
      var envFileData = dotenv.parse(fs.readFileSync(envFile))
      envArgs += ' ' + generateEnvironment(envFileData || {})
    }

    if (isWin) {
      toExec = envArgs + ' ' + cmd
    } else {
      toExec = envArgs + 'bash -c "exec ' + cmd + '"'
    }



    toExec = handleIpAddress(container, toExec)

    console.log('running: ' + toExec)

    env = Object.create(process.env)
    if (mode !== 'preview') {
      var options = {cwd: cwd, env: env, stdio: [0, 'pipe', 'pipe'], detached: false}
      if (container.type === 'node' && !isWin) {
        options.stdio[3] = 'ipc'
      }

      if (isWin) {
        // allows quoted args to cmd.exe
        options.windowsVerbatimArguments = true

        // /s encodes inner quotes so the whole command itself can be quoted correctly
        child = spawn(process.env.comspec, ['/s', '/c', '"', toExec, '"'], options)
      } else {
        child = spawn('/bin/bash', ['-c', toExec], options)
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
        environment: container.specific.environment,
        cwd: cwd }
    }

    cb(null, child)



    function getEnvFile (container) {
      /* jshint ignore:start */
      var envFile = container.specific.source.env_file
      /* jshint ignore:end */
      var yamlPath = container.specific.yamlPath
      return envFile && path.resolve(path.dirname(yamlPath), envFile)
    }
  }



  var start = function (mode, container, config, exitCb, cb) {
    if (container && container.specific && container.specific.execute && container.specific.execute.exec) {
      if (container.type === 'docker' && !config.runDocker) {
        console.log('docker disabled, skipping: ' + container.specific.execute.exec)
        cb()
      } else {
        run(mode, container, exitCb, cb)
      }
    } else {
      if (container.name !== '__proxy') {
        console.log('warning: ' + container.name + ' not started, missing execute statement')
      }
      cb()
    }
  }



  var getContainerId = function (psOutput, container) {
    var lines = psOutput.split('\n')
    var re = new RegExp('^([a-f0-9]+)\\s+' + container.specific.execute.image + '.*')
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
        if (container.type === 'docker') {
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
