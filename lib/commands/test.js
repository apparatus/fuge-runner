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

  function test (system, name, cb) {
    var container

    container = _.find(system.topology.containers, function (c) { return c.name === name })
    if (!container) { return cb('container not found: ' + name) }

    if (container.type === 'process') {
      if (!container.test) { return cb('missing test script for: ' + name) }
      console.log('testing [' + container.name + ']: ' + container.test)
      processRunner.runCommand(system, container, container.test, 'test', cb)
    } else {
      console.log('testing not suuported for this container type: ' + container.type)
      cb('testing not suuported for this container type: ' + container.type)
    }
  }



  function testAll (system, cb) {
    async.eachSeries(_.keys(system.topology.containers), function (key, next) {
      var c = system.topology.containers[key]
      if (c.type === 'process' && c.test) {
        test(system, c.name, function () {
          next()
        })
      } else {
        if (c.type === 'process') {
          console.log('skipping [' + c.name + '] - no test script specified')
        }
        next()
      }
    }, function (err) {
      cb(err || null)
    })
  }



  return {
    test: test,
    testAll: testAll
  }
}

