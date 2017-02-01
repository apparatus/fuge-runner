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

var async = require('async')
var spawn = require('child_process').spawn
var winPsTree = require('winpstree')
var util = require('./util')()


module.exports = function () {

  var run = function (mode, container, exitCb, cb) {
    var child = {}
    var cwd = container.path
    var called = false
    var toks
    var cmd
    var args
    var env

    console.log('running: ' + container.run)

    toks = util.tokenizeCommand(container.run)
    if (container.type === 'node') {
      cmd = process.argv[0]

      if (toks[0] === 'node') {
        args = toks.splice(1)
      } else {
        args = toks
      }
    } else {
      cmd = toks[0]
      args = toks.splice(1)
    }

    env = Object.assign({}, process.env)
    if (container.environment) {
      env = Object.assign(env, container.environment)
    }

    if (mode !== 'preview') {
      var options = {cwd: cwd, env: env, stdio: [0, 'pipe', 'pipe'], detached: false}

      child = spawn(cmd, args, options)
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
        environment: env,
        cwd: cwd }
    }

    cb(null, child)
  }



  var start = function (system, mode, container, exitCb, cb) {
    if (container && container.run) {
      run(mode, container, exitCb, cb)
    } else {
      console.log('warning: ' + container.name + ' not started, missing execute statement')
      cb()
    }
  }



  var kill = function kill (container, pid, signal, cb) {

    if (pid) {
      try {
        winPsTree(pid, function (err, childPids) {
          if (err) { return cb(err) }

          async.eachSeries(childPids, function (childPid, next) {
            console.log('sending ' + signal + ' to child process: ' + childPid)
            try {
              process.kill(childPid, signal)
            } catch (e) {}
            next()
          }, function () {
            console.log('sending ' + signal + ' to parent process: ' + pid)
            try {
              process.kill(pid, signal)
            } catch (e) {}
            cb(null)
          })
        })
      } catch (e) {
        console.log(e)
      }
    }
  }



  var stop = function stop (container, pid, cb) {
    kill(container, pid, 'SIGKILL', cb)
  }



  return {
    start: start,
    stop: stop
  }
}

