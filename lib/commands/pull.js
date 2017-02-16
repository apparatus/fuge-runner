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
var dockerRunner = require('../support/dockerRunner')()


module.exports = function () {


  function pull (system, name, cb) {
    var container

    container = _.find(system.topology.containers, function (c) { return c.name === name })
    if (!container) { return cb('container not found: ' + name) }


    if (container.type === 'process' || container.type === 'node') {
      if (!container.repository_url) { return cb('missing repository url for: ' + name) }

      console.log('pulling [' + container.name + ']: ' + container.repository_url)
      processRunner.runCommand(system, container, 'git pull', 'pull', cb)
    } else {
      if (!container.image) { return cb('missing image tag for: ' + name) }

      console.log('pulling [' + container.name + ']: ' + container.image)
      dockerRunner.pull(system, container, cb)
    }
  }



  function pullAll (system, cb) {
    var targets = {}

    _.each(system.topology.containers, function (c) {
      if (c.type !== 'docker' && c.type !== 'container') {
        if (c.repository_url && !targets[c.repository_url]) {
          targets[c.repository_url] = c
        } else {
          console.log('skipping [' + c.name + '] - no repository url specified or duplicate url')
        }
      } else {
        if (c.image && system.global.run_containers) {
          targets[c.image] = c
        } else {
          console.log('skipping [' + c.name + '] - no image specified or not running containers')
        }
      }
    })

    async.eachSeries(_.keys(targets), function (key, next) {
      pull(system, targets[key].name, function (err) {
        next(err)
      })
    }, function (err) {
      cb(err || null)
    })
  }



  return {
    pull: pull,
    pullAll: pullAll
  }
}

