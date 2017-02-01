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


/**
 * profile code ripped out of system.js - for DMC to review and update
 */
module.exports = function () {

/*
 * in stop:

        if (process.container.profiling) {
          runner.kill(process.container, process.child.pid, 'SIGINT', function () {
            container.profiling = false
            container.monitor = container._cachedMonitorStatus
            container.run = container._cachedRun
            delete container._cachedRun
            delete container._cachedMonitorStatus
            waitStop(process.child.pid, next)
          })
        } else {
*/




  var profile = function (system, args, cb) {
    if (process.platform === 'win32') {
      console.log('Sorry! Profiling isn\'t supported on Windows')
      return cb()
    }
    var name = args.process
    var container = _.find(system.topology.containers, function (c) { return c.name === name })
    if (container && util.isNodeProcess(container)) {

      spawn('sudo', ['-n', 'true'])
        .on('exit', function (code) {
          if (code !== 0) {
            console.log('Profiling requires sudo access:')
          }

          spawn('sudo', ['true'])
            .on('exit', function (code) {
              if (code) {
                console.log('The profiler cannot be executed without sudo access.')
                return cb()
              }
              // todo reliably find 0x bin (maybe 0x does require('0x/where'))
              var flags = Object.keys(args.options).map(function (k) {
                return '--' + k + '=' + args.options[k]
              }).join(' ')

              var cmd = 'node ' + path.join(__dirname, '..', 'run-0x') + ' -q ' + flags + ' node '
              container._cachedRun = container.run
              container.run = container.run.replace(/node/g, cmd)
              container._cachedMonitorStatus = container.monitor
              container.monitor = false
              container.profiling = true
              start(system, name, 1, function () {
                cb()
              })
            })
        })
    } else {
      console.log('Only node processes can be profiled!')
      cb()
    }
  }



  var heap = function (system, name) {
    var proc = util.findProcess(processes, name)
    if (!proc || !proc.child || typeof proc.child.send !== 'function') {
      console.log('connected child process not found')
      return
    }

    console.log('creating heap snapshot: ' + name)
    proc.child.send({ command: 'heapdump-create' })
  }


  var messageHandler = function (message) {
    if (message && typeof message === 'object') {
      message = JSON.stringify(message, null, '  ')
    }

    console.log(message)
  }


  var startReport = function (system, name) {
    var proc = util.findProcess(processes, name)
    if (!proc || !proc.child) {
      console.log('child process not found')
      return
    }

    console.log('Reporting messages for: ' + name)
    proc.child.on('message', messageHandler)
  }



  var stopReport = function (system, name) {
    var proc = util.findProcess(processes, name)
    if (!proc || !proc.child) {
      console.log('child process not found')
      return
    }

    console.log('Stopping messages for: ' + name)
    proc.child.removeListener('message', messageHandler)
  }


  return {
    profile: profile,
    heap: heap,
    startReport: startReport,
    stopReport: stopReport,
    start: start,
    stop: stop
  }
}

