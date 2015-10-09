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

'use strict';

var _ = require('lodash');
var spawn = require('child_process').spawn;


module.exports = function() {
  var baseCmd = 'test -f ~/.bashrc && source ~/.bashrc; test -f ~/.bash_profile && source ~/.bash_profile; ';



  var handleIpAddress = function(container, cmd) {
    var ipAddress;

    ipAddress = container.specific.ipAddress || '127.0.0.1';
    cmd = cmd.replace(/__TARGETIP__/g, ipAddress);
    return cmd;
  };



  var generateEnvironment = function(containerEnv) {
    var envArgs = ' ';
    _.each(_.keys(containerEnv), function(key) {
      envArgs += 'export ' + key + '=' + containerEnv[key] + ';';
    });
    return envArgs;
  };



  var run = function(container, exitCb, cb) {
    var toExec;
    var cmd;
    var cwd;
    var env;
    var child;
    var envArgs = '';

    cmd = container.specific.execute.exec;
    cwd = container.specific.path;

    if (container.specific && container.specific.environment) {
      envArgs = generateEnvironment(container.specific.environment);
    }

    toExec = baseCmd + envArgs + ' exec ' + cmd;
    toExec = handleIpAddress(container, toExec);

    env = Object.create(process.env);
    child = spawn('/bin/bash', ['-c', toExec], {cwd: cwd, env: env, stdio: [0, 'pipe', 'pipe'], detached: false,});
    child.unref();

    child.on('exit', function(code) {
      exitCb(child.pid, toExec, code);
    });

    cb(null, child);
  };



  var start = function(container, exitCb, cb) {
    if (!(container && container.specific && container.specific.execute && container.specific.execute.exec)) {
      return cb(new Error('missing execute statement for container: ' + container.id + ' aborting'));
    }

    run(container, exitCb, function(err, child) {
      cb(err, child);
    });
  };



  var stop = function stop(pid, cb) {
    if (pid) {
      try {
        process.kill(pid, 'SIGTERM');
      }
      catch (e) {
        return cb(e);
      }
    }
    cb(null);
  };



  return {
    start: start,
    stop: stop,
  };
};

