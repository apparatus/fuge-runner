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

var test = require('tape')
var githubParser = require('parse-github-url')
var proxyquire = require('proxyquire')

test('git puller test', function (t) {
  t.test('invalid github url', function (t) {
    var url = 'invalidRepo'
    var gitPuller = require('../lib/gitPuller.js')()

    gitPuller.pull(url, function (err, value) {
      t.notEqual(err, undefined)
      t.end()
    })
  })

  t.test('github url construction user/repo', function (t) {
    var url = 'senecajs/seneca'
    var spawnProxy = {
      child_process: {
        spawn: function (bash, params, options) {
          var paramsArray = params[1].split(' ')
          var githubUrl = paramsArray[paramsArray.length - 1]

          var github = githubParser(githubUrl)
          t.equal(url, github.repo)

          t.end()

          var unref = function () {}
          var on = function () {}
          return {
            unref: unref,
            on: on
          }
        }
      }
    }
    var gitPuller = proxyquire('../lib/gitPuller.js', spawnProxy)()
    gitPuller.pull(url, function (err, value) {
      t.notOk(err)
      console.log('gitPuller pull')
    })
  })
})
