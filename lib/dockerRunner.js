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

var Docker = require('dockerode')
var parseUrl = require('parse-url')



/**
 * docker container runner for fuge
 */
module.exports = function () {
  var docker = null

  function connectToEngine (url) {
    var connect = parseUrl(url)
    var docker = null

    if (connect.protocol === 'file') {
      docker = new Docker({socketPath: connect.pathname})
    } else if (connect.protocol === 'http') {
      docker = new Docker({protocol: connect.protocol, host: connect.resource, port: connect.port})
    }
    return docker
  }



  function start (system, mode, container, exitCb, cb) {
    var child = {}

    if (!system.global.run_containers) {
      console.log('containers disabled, skipping: ' + container.name)
      return cb()
    }

    if (docker === null) {
      docker = connectToEngine(system.global.container_engine_url)
      if (!docker) {
        return cb('container engine protocol not supported')
      }
    }

    var ep = {}
    var pb = {}
    Object.keys(container.ports).forEach(function (key) {
      ep[container.ports[key][0] + '/tcp'] = {}
      if (container.ports[key][1]) {
        pb[container.ports[key][1] + '/tcp'] = [{HostIp: container.host, HostPort: container.ports[key][0]}]
      } else {
        pb[container.ports[key][0] + '/tcp'] = [{HostIp: container.host, HostPort: container.ports[key][0]}]
      }
    })

    var createOpts = {Image: container.image,
      Tty: false,
      HostConfig: {
        ExposedPorts: ep,
        PortBindings: pb
      }
    }

    if (mode === 'preview') {
      child.detail = { cmd: JSON.stringify(createOpts, null, 2),
        environment: container.environment,
        cwd: '' }
      return cb(null, child)
    }

    docker.createContainer(createOpts, function (err, c) {
      if (err) { return cb(err) }

      c.attach({stream: true, stdout: true}, function (err, so) {
        if (err) { return cb(err) }

        c.attach({stream: true, stderr: true}, function (err, se) {
          if (err) { return cb(err) }

          c.start({}, function (err, data) {
            if (err) { return cb(err) }

            child.pid = c.id
            child.stdout = so
            child.stderr = se
            cb(null, child)

            c.wait(function () {
              exitCb(c.id, container.name)
            })
          })
        })
      })
    })
  }



  function stop (container, pid, cb) {
    var c = docker.getContainer(pid)
    console.log(pid)
    console.log('STOP: ' + container)
    if (c) {
      c.stop({}, function (err) {
        cb(err)
      })
    } else {
      cb()
    }
  }



  return {
    start: start,
    stop: stop
  }
}

