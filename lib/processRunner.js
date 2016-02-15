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
var execSync = require('child_process').execSync;
var psTree = require('ps-tree');


module.exports = function() {
  var baseCmd = 'test -f ~/.bashrc && source ~/.bashrc; test -f ~/.bash_profile && source ~/.bash_profile; ';
  var isWin = /^win/.test(process.platform);


  var handleIpAddress = function(container, cmd) {
    var ipAddress;

    ipAddress = container.specific.ipAddress || '127.0.0.1';
    cmd = cmd.replace(/__TARGETIP__/g, ipAddress);
    return cmd;
  };



  var generateEnvironment = function(containerEnv) {
    var envArgs = ' ';
    _.each(_.keys(containerEnv), function(key) {
      if (isWin) {
        envArgs += 'set ' + key + '=' + containerEnv[key] + '&&';
      }
      else {
        envArgs += 'export ' + key + '=' + containerEnv[key] + ';';
      }
    });
    return envArgs;
  };



  var run = function(mode, container, exitCb, cb) {
    var toExec;
    var cmd;
    var cwd;
    var env;
    var child = {};
    var envArgs = '';
    var called = false;

    cmd = container.specific.execute.exec;
    cwd = container.specific.path;
    if (cmd.slice(0, 5) === 'node ' && cmd.slice(0, 7) !== 'node -r') {
      // use same node running fuge
      cmd = process.argv[0] + ' -r fuge ' + cmd.slice(5);
      container.type = 'node';
    }

    if (container.specific && container.specific.environment) {
      envArgs = generateEnvironment(container.specific.environment);
    }

    if (isWin) {
      toExec = envArgs + ' ' + cmd;
    }
    else {
      toExec = baseCmd + envArgs + ' exec ' + cmd;
    }

    toExec = handleIpAddress(container, toExec);

    env = Object.create(process.env);
    if (mode !== 'preview') {
      var options = {cwd: cwd, env: env, stdio: [0, 'pipe', 'pipe'], detached: false};
      if (container.type === 'node') {
        options.stdio[3] = 'ipc';
      }

      if (isWin) {
        child = spawn(process.env.comspec, ['/c', toExec], options);
      }
      else {
        child = spawn('/bin/bash', ['-c', toExec], options);
      }

      child.unref();

      child.on('error', function(err) {
        if (!called) {
          called = true;
          exitCb(child.pid, container.name, err);
        }
      });

      child.on('exit', function(code) {
        if (!called) {
          called = true;
          exitCb(child.pid, container.name, code);
        }
      });
    }
    else {
      child.detail = { cmd: cmd,
                       environment: container.specific.environment,
                       cwd: cwd };
    }

    cb(null, child);
  };



  var start = function(mode, container, config, exitCb, cb) {
    if (container && container.specific && container.specific.execute && container.specific.execute.exec) {
      if (container.type === 'docker' && !config.runDocker) {
        console.log('docker disabled, skipping: ' + container.specific.execute.exec);
        cb();
      }
      else {
        run(mode, container, exitCb, cb);
      }
    }
    else {
      if (container.name !== '__proxy') {
        console.log('warning: ' + container.name + ' not started, missing execute statement');
      }
      cb();
    }
  };



  var getContainerId = function(psOutput, container) {
    var lines = psOutput.split('\n');
    var re = new RegExp('^([a-f0-9]+)\\s+' + container.specific.execute.image + '.*');
    var id = null;
    var match;

    _.each(lines, function(line) {
      match = re.exec(line);
      if (match) {
        id = match[1];
      }
    });
    return id;
  };



  var stop = function stop(container, pid, cb) {
    var psOutput;
    var id;

    if (pid) {
      try {
        if (container.type === 'docker') {
          if (!psOutput) {
            psOutput = execSync('docker ps').toString();
          }
          id = getContainerId(psOutput, container);
          if (id) {
            execSync('docker kill ' + id);
          }
        }
        if (isWin) {
          var procs = '' + execSync('wmic process where(ParentProcessId=' + pid + ') get ProcessId');
          var pids = procs.trim().split('\r\n');
          if (pids.length > 1) {
            process.kill(pids[1], 'SIGKILL');
          }
        }
        else {
          psTree(pid, function(err, children) {
            spawn('kill', ['-9'].concat(children.map(function (p) { return p.PID; })));
          });
        }
        process.kill(pid, 'SIGKILL');
      }
      catch (e) {
        console.log(e);
      }
    }
    cb(null);
  };



  return {
    start: start,
    stop: stop
  };
};
