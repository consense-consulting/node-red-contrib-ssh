'use strict';

module.exports = function (RED) {

    var options = null;
    var node = null;
    var client = null;
    var isConnected = false;

    function _connectClient(callback){
        if(isConnected) {
            callback(client);
            return;
        }

        let SshClient = require('ssh2').Client;

        // Ssh client handler
        client = new SshClient();
        client.on('ready', () => {
            isConnected = true;
            node.log("Ssh client ready");
            node.status({ fill: "green", shape: "dot", text: 'Connected' });
            callback(client);
        });

        client.on('close', (err) => {
            isConnected = false;
            node.status({ fill: "red", shape: "dot", text: 'Disconnected' });
            node.error('Ssh client was closed.', err);
        });

        client.on('error', (err) => {
            node.error('Ssh client error', err);
        });

        //node.log("SSH Key:"+config.ssh);
        client.connect(options);
    }

    function NodeRedSsh(config) {
        RED.nodes.createNode(this, config);
        node = this;

        node.status({ fill: "blue", shape: "dot", text: "Initializing" });

        // Handle node close
        node.on('close', function () {
            node.warn('Ssh client dispose');
            client && client.close();
            client && client.dispose();
        });

        options = {
            host: config.hostname,
            port: 22,
            username: node.credentials.username ? node.credentials.username : undefined,
            password: node.credentials.password ? node.credentials.password : undefined,
            privateKey: config.ssh ? require('fs').readFileSync(config.ssh) : undefined
        };

        // Session handler
        var session = {
            code: 0,
            stdout: [],
            stderr: []
        };

        var notify = (type, data) => {
            switch (type) {
                case 0:
                    session.code = data;
                    node.send(session);
                    session = {
                        code: 0,
                        stdout: [],
                        stderr: []
                    };
                    break;
                case 1:
                    session.stdout.push(data.toString());
                    break;
                case 2:
                    session.stderr.push(data.toString());
                    break;
            }
        };

        node.on('input', (msg) => {
            if (!msg.payload) {
                node.warn("Invalid msg.payload.");
                return;
            }
            node.debug("Getting client connection...");
            _connectClient((conn) => {
                conn.exec(msg.payload, (err, stream) => {
                    node.log("Ssh client error in input.");
                    if (err) throw err;
                    stream.on('close', function (code, signal) {
                        node.warn('Stream :: close :: code: ' + code + ', signal: ' + signal);
                        conn.end();
                        notify(0, code);
                    }).on('data', (data) => {
                        //node.status({ fill: "green", shape: "dot", text: data.toString() });
                        notify(1, data);
                    }).stderr.on('data', (data) => {
                        //node.status({ fill: "black", shape: "dot", text: data.toString() });
                        notify(2, data);
                    });
                });
            });
        });

        _connectClient((conn) => { node.debug("SSH-CLI initial connection succeeded."); });

        node.debug("SSH-CLI setup done.");
    }

    // Register this node
    RED.nodes.registerType("ssh-client-v2", NodeRedSsh, {
        credentials: {
            email: { type: "text" },
            username: { type: "text" },
            password: { type: "password" }
        }
    });
}
