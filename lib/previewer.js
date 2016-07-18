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
var chalk = require('chalk')
var processRunner = require('./processRunner')()
var async = require('async')
var util = require('./util')()


module.exports = function (config) {
  var _mode


  var processExitCb = function () {
    return function (pid, name) {
      console.log(chalk.red('process exit [' + pid + ']: ' + name))
    }
  }



  var preview = function (system, name, cb) {
    var result = null
    _mode = 'preview'

    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var container = system.topology.containers[key]
      if (container.name === name) {
        if (util.isExecutableContainer(container)) {
          processRunner.start(_mode, container, config, processExitCb(), function (err, child) {
            if (err) { return next(err) }
            result = child
            next()
          })
        } else {
          next()
        }
      } else {
        next()
      }
    }, function (err) {
      cb(err, result)
    })
  }



  var previewAll = function (system, cb) {
    var finalResult = []
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var container = system.topology.containers[key]
      preview(system, container.name, function (err, result) {
        if (err) {
          console.log(chalk.red('preview error for container ' + container.name + ': ' + err))
        } else if (result) {
          finalResult.push(result)
        }
        next()
      })
    }, function (err) {
      cb(err, finalResult)
    })
  }



  return {
    preview: preview,
    previewAll: previewAll
  }
}

