/* eslint handle-callback-err: 0 */
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
var psTree = require('ps-tree')
var util = require('./util')()


module.exports = function () {
  var isWin = /^win/.test(process.platform)

  var run = function (mode, container, exitCb, cb) {
    var child = {}
    var cwd = container.path
    var called = false
    var cmd
    var args
    var env
    var toks
    toks = util.tokenizeCommand(container.run)
    if (container.type === 'node') {
      cmd = process.argv[0]
      if (toks[0] === 'node') {
        args = toks.splice(1)
      } else {
        args = toks
      }

      if (container.debugMode) {
        args.unshift('--inspect')
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
      var options = {cwd: cwd, env: env, stdio: ['ignore', 'pipe', 'pipe'], detached: false}
<<<<<<< HEAD
      if (container.type === 'node' && !isWin) {
        options.stdio[3] = 'ipc'
      }
=======

      if (container.type === 'node' && !isWin) { options.stdio[3] = 'ipc' }
>>>>>>> 4927133899398767c7c6bcd04b56aea58608315a
      if (isWin && cmd === 'npm') { cmd = 'npm.cmd' }

      child = spawn(cmd, args, options)
      child.unref()

      child.on('error', function (err) {
        if (!called) {
          called = true
          exitCb(err, container, child, -1)
        }
      })

      child.on('exit', function (code) {
        if (!called) {
          called = true
          exitCb(null, container, child, code)
        }
      })

    } else {
      child.detail = { cmd: cmd,
        args: args,
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
      cb(container.name + ' not started, missing execute statement')
    }
  }


  var kill = function kill (container, pid, signal, cb) {
    if (pid) {
      psTree(pid, function (err, children) {
        async.eachSeries(children, function (child, next) {
          console.log('sending ' + signal + ' to  child process: ' + child.PID)
          try {
            process.kill(child.PID, signal)
          } catch (e) {}
          next()
        }, function () {
          console.log('sending ' + signal + ' to  parent process: ' + container.name + ' PID:' + pid)
          try {
            process.kill(pid, signal)
          } catch (e) {}
          cb(null)
        })
      })
    }
  }



  var stop = function stop (container, pid, cb) {
    // kill(container, pid, 'SIGKILL', cb)
    kill(container, pid, 'SIGINT', cb)

  }



  function exitCb (cb) {
    return function (err, container, child, code) {
      if (err) {
        console.log(container.name + ' eeeeerror: ' + err)
      }
      cb(err || null)
    }
  }



  function runCommand (system, container, command, commandName, cb) {
    var c
    var process
    var procColour = util.selectColourWhite()

    c = _.cloneDeep(container)
    c.run = command
    c.name = c.name + '_' + commandName
    c.type = 'process'
    start(system, 'live', c, exitCb(cb), function (err, child) {

      process = {identifier: c.name,
        running: true,
        exitCode: null,
        colour: procColour,
        child: child,
        startTime: Date.now(),
        monitor: false,
        tail: true}

      util.streamOutput({process: process, name: c.name, tail: true}, system.global.log_path, true)
    })
  }



  return {
    start: start,
    stop: stop,
    runCommand: runCommand,
    run: run
  }
}

