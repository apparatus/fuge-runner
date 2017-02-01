module.exports = {
  name: 'sudc',
  id: 'e7bb3963-fd16-4b1b-ae9f-5fa16e2d192d',
  path: '/Users/pelger/work/nearform/code/microbial/xeno/xeno-compiler/test/fixture/system1',
  containerDefinitions: [
    {
      specific: {
        type: 'blank-container'
      },
      type: 'blank-container',
      id: 'root',
      name: 'root'
    },
    {
      specific: {
        type: 'process',
        path: '/Users/pelger/work/nearform/code/microbial/xeno/xeno-compiler/test/fixture/system1/docsrv',
        proxyPort: 'auto',
        servicePort: 'auto',
        execute: {
        }
      },
      type: 'process',
      id: 'docsrv',
      name: 'docsrv'
    },
    {
      specific: {
        type: 'process',
        path: '/Users/pelger/work/nearform/code/microbial/xeno/xeno-compiler/test/fixture/system1/docsrv',
        proxyPort: 'auto',
        servicePort: 'auto',
        execute: {
        }
      },
      type: 'process',
      id: 'srv2',
      name: 'srv2'
    }
  ],
  topology: {
    containers: {
      'root-6f718f4': {
        id: 'root-6f718f4',
        name: 'root',
        containedBy: 'root-6f718f4',
        containerDefinitionId: 'root',
        type: 'blank-container',
        contains: [
          'docsrv-4a8ac373',
          'srv2-4a8ac373'
        ],
        specific: {
          type: 'blank-container',
          environment: {
            PROXY_HOST: '__TARGETIP__',
            web_PORT: 10000,
            docsrv_PORT: 10001,
            histsrv_PORT: 10002,
            realsrv_PORT: 10003
          }
        }
      },
      'docsrv-4a8ac373': {
        id: 'docsrv-4a8ac373',
        name: 'docsrv',
        monitor: true,
        containedBy: 'root-6f718f4',
        containerDefinitionId: 'docsrv',
        type: 'process',
        contains: [],
        specific: {
          type: 'process',
          path: '/Users/pelger/work/nearform/code/microbial/fuge/fuge-runner/test/fixture/system2',
          proxyPort: 10001,
          servicePort: 20001,
          execute: {
            exec: 'node willfail.js'
          },
          environment: {
            PROXY_HOST: '__TARGETIP__',
            web_PORT: 10000,
            docsrv_PORT: 10001,
            histsrv_PORT: 10002,
            realsrv_PORT: 10003,
            SERVICE_HOST: '0.0.0.0',
            SERVICE_PORT: 20001
          }
        }
      },
      'srv2-4a8ac373': {
        id: 'srv2-4a8ac373',
        name: 'srv2',
        monitor: true,
        containedBy: 'root-6f718f4',
        containerDefinitionId: 'srv2',
        type: 'process',
        contains: [],
        specific: {
          type: 'process',
          path: '/Users/pelger/work/nearform/code/microbial/fuge/fuge-runner/test/fixture/system',
          proxyPort: 10001,
          servicePort: 20001,
          execute: {
            exec_intentionally_wrong: 'node fish.js'
          },
          environment: {
            PROXY_HOST: '__TARGETIP__',
            web_PORT: 10000,
            docsrv_PORT: 10001,
            histsrv_PORT: 10002,
            realsrv_PORT: 10003,
            SERVICE_HOST: '0.0.0.0',
            SERVICE_PORT: 20001
          }
        }
      }
    }
  }
}

