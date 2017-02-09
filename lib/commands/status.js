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


  function stat (system, name, cb) {
    var container

    container = _.find(system.topology.containers, function (c) { return c.name === name })
    if (!container) { return cb('container not found: ' + name) }

    if (container.type === 'process') {
      if (!container.repository_url) { return cb('missing repository url for: ' + name) }

      console.log('status[' + container.name + ']: ' + container.repository_url)
      processRunner.runCommand(system, container, 'git status', 'status', function () {
        processRunner.runCommand(system, container, 'git branch', 'status', cb)
      })
    } else {
      cb('status not suuported for this container type: ' + container.type)
    }
  }



  function statAll (system, cb) {
    var targets = {}

    _.each(system.topology.containers, function (c) {
      if (c.type !== 'docker' && c.type !== 'container') {
        if (c.repository_url && !targets[c.repository_url]) {
          targets[c.repository_url] = c
        } else {
          console.log('skipping [' + c.name + '] - no repository url specified or duplicate url')
        }
      }
    })

    async.eachSeries(_.keys(targets), function (key, next) {
      stat(system, targets[key].name, function (err) {
        next(err)
      })
    }, function (err) {
      cb(err || null)
    })
  }



  return {
    stat: stat,
    statAll: statAll
  }
}

