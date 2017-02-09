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

var Emitter = require('events')
var Readable = require('stream').Readable

var failCreate
var failAttach1
var failAttach2
var failStart
var failPull
var failFollow


function container (id, createOpts) {
  var emitter = new Emitter()
  var attachCount = 0

  function attach (args, cb) {

    if (failAttach1 && attachCount === 0) { return cb('fail') }
    if (failAttach2 && attachCount === 1) { return cb('fail') }

    ++attachCount

    if (args.stream && args.stdout) {
      return cb(null, process.stdout)
    } else if (args.stream && args.stderr) {
      return cb(null, process.stderr)
    } else {
      cb(null)
    }
  }


  function start (args, cb) {
    if (failStart) { return cb('fail') }
    cb(null, null)
  }


  function wait (cb) {
    emitter.on('stop', cb)
  }


  function stop (args, cb) {
    emitter.emit('stop')
    cb(null)
  }

  return {
    attach: attach,
    start: start,
    wait: wait,
    stop: stop,
    id: id
  }
}


module.exports.failCreate = function () {
  failCreate = true
  failAttach1 = false
  failAttach2 = false
  failStart = false
}

module.exports.failAttach1 = function () {
  failCreate = false
  failAttach1 = true
  failAttach2 = false
  failStart = false
}

module.exports.failAttach2 = function () {
  failCreate = false
  failAttach1 = false
  failAttach2 = true
  failStart = false
}

module.exports.failStart = function () {
  failCreate = false
  failAttach1 = false
  failAttach2 = false
  failStart = true
}


module.exports.failPull = function () {
  failPull = true
  failFollow = false
}


module.exports.failFollow = function () {
  failPull = false
  failFollow = true
}


var _rs = null
var _output = []
module.exports.setOutput = function (out) {
  _output = out
}


module.exports.Docker = function Docker (args) {
  this.containers = {}
  this.idCount = 42

  this.createContainer = function createContainer (createOpts, cb) {
    if (failCreate) { return cb('fail') }
    this.containers[this.idCount] = container(this.idCount, createOpts)
    cb(null, this.containers[this.idCount])
    ++this.idCount
  }

  this.getContainer = function (id) {
    return this.containers[id]
  }


  this.pull = function (image, cb) {
    if (failPull) { return cb('fail pull test') }
    _rs = new Readable()
    _rs._read = function () {
      _output.forEach(function (line) {
        _rs.push(line + '\n')
      })
      _rs.push(null)
    }
    cb(null, _rs)
  }


  this.modem = {
    followProgress: function (stream, cb) {
      setTimeout(function () {
        if (failFollow) {
          cb('fail follow test')
        } else {
          cb(null)
        }
      }, 500)
    }
  }
}

