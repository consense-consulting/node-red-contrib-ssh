<script type="text/javascript">
    RED.nodes.registerType('ssh-client-v2', {
        category: 'input',
        defaults: {
            debug: {value:false},
            ssh: { value: "" },
            hostname: { value: "" },
            name: { value: "" },
        },
        credentials: {
            username: { type: "text" },
            password: { type: "password" }
        },
        inputs: 1,
        outputs: 1,
        icon: "www.png",
        label: function () {
            return this.name || "ssh client";
        }
    });
</script>

<script type="text/x-red" data-template-name="ssh-client-v2">
    <div class="form-row">
        <label for="node-input-debug"><i class="fa fa-server"></i> Debug</label>
        <input type="checkbox" id="node-input-debug" placeholder="">
    </div>
    <div class="form-row">
        <label for="node-input-ssh"><i class="fa fa-podcast"></i> Ssh</label>
        <input type="text" id="node-input-ssh" placeholder="/home/user/.ssh/id_rsa">
    </div>
    <div class="form-row">
        <label for="node-input-hostname"><i class="fa fa-podcast"></i> Hostname</label>
        <input type="text" id="node-input-hostname" placeholder="127.0.0.1">
    </div>
    <div class="form-row">
        <label for="node-input-name"><i class="icon-tag"></i> Name</label>
        <input type="text" id="node-input-name" placeholder="Name">
    </div>
    <div class="form-row">
        <label for="node-input-username"><i class="fa fa-user-circle-o"></i> Username</label>
        <input type="text" id="node-input-username" placeholder="Username">
    </div>
    <div class="form-row">
        <label for="node-input-password"><i class="fa fa-user-secret"></i> Password</label>
        <input type="text" id="node-input-password" placeholder="Password">
    </div>
</script>

<script type="text/x-red" data-help-name="ssh-client-v2">
    <p>A simple node that handle ssh client</p>
</script>
nodered@raspberrypi:~/node-red-contrib-ssh-v2 $ cat src/ssh-client-v2.js
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
