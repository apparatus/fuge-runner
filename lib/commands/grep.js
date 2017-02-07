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

var fs = require('fs')
var path = require('path')
var _ = require('lodash')
var async = require('async')
var sgrep = require('simple-grep')


module.exports = function () {


  function grep (system, name, search, cb) {
    var searchPath = path.join(system.global.log_path, name + '.log')
    var result = []

    if (fs.existsSync(searchPath)) {
      sgrep(search, searchPath, function (list) {
        _.each(list, function (item) {
          _.each(item.results, function (loc) {
            var output = item.file + ' ' + loc['line_number'] + ': ' + loc.line
            console.log(output)
            result.push(output)
          })
        })
        cb(result)
      })
    } else {
      cb(result)
    }
  }



  function walkSync (dir, filelist) {
    var files = fs.readdirSync(dir)

    files.forEach(function (file) {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
        filelist = walkSync(path.join(dir, file), filelist)
      } else {
        filelist.push(path.join(dir, file))
      }
    })
    return filelist
  }



  var grepAll = function (system, search, cb) {
    var filelist = walkSync(system.global.log_path, [])
    var result = []

    async.eachSeries(filelist, function (file, next) {
      sgrep(search, file, function (list) {
        _.each(list, function (item) {
          _.each(item.results, function (loc) {
            var output = item.file + ' ' + loc['line_number'] + ': ' + loc.line
            console.log(output)
            result.push(output)
          })
        })
        next()
      })
    }, function () {
      cb(result)
    })
  }



  return {
    grep: grep,
    grepAll: grepAll
  }
}

