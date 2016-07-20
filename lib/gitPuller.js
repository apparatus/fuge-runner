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
var githubParser = require('parse-github-url')
var isGitUrl = require('is-git-url')


module.exports = function (config) {
  var processes = {}
  var baseCmd = 'test -f ~/.bashrc && source ~/.bashrc; test -f ~/.bash_profile && source ~/.bash_profile; '

  var pullContainer = function (cmd, cwd, exitCb, cb) {
    var toExec
    var env
    var child = {}
    var called = false

    toExec = baseCmd + ' exec ' + cmd

    env = Object.create(process.env)
    child = spawn('/bin/bash', ['-c', toExec], {cwd: cwd, env: env, stdio: [0, 'pipe', 'pipe'], detached: false})
    child.unref()

    child.on('error', function (err) {
      if (!called) {
        called = true
        if (exitCb) {
          exitCb(child.pid, toExec, err)
        }
      }
    })

    child.on('exit', function (code) {
      if (!called) {
        called = true
        if (exitCb) {
          exitCb(child.pid, toExec, code)
        }
      }
    })
    cb(null, child)
  }



  var generate = function (name, cb) {
    var repoUrl

    if (isGitUrl(name)) {
      repoUrl = name
    }

    if (!repoUrl) {
      var github = githubParser(name)
      if (!github || !github.host || !github.repo) {
        return cb(new Error('could not parse github url: ' + name))
      }

      repoUrl = 'https://' + github.host + '/' + github.repo + '.git'
    }

    console.log(repoUrl)

    var cmd = 'git clone ' + repoUrl
    pullContainer(cmd, '.', null, cb)
  }



  var runPull = function (container, exitCb, cb) {
    if (!(container && container.specific && container.specific.execute && container.specific.execute.exec)) {
      return cb(new Error('missing execute statement for container: ' + container.id + ' aborting'))
    }

    var cmd = 'git pull'
    pullContainer(cmd, container.specific.path, exitCb, cb)
  }



  var pullAll = function (system, cb) {
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var container = system.topology.containers[key]
      if (util.isExecutableContainer(container) && container.type === 'process') {
        console.log('pulling: ' + container.name)
        runPull(container, function (/* childPid, toExec, code */) {
          next()
        }, function (err, child) {
          if (err) {
            return
          }
          if (child) {
            processes[child.pid] = {container: container,
                                    identifier: container.name,
                                    running: true,
                                    exitCode: null,
                                    colour: util.selectColour(),
                                    tail: true,
                                    child: child}
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
    pullAll: pullAll,
    generate: generate
  }
}
