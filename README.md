# node-red-contrib-ssh-v2
Available on NPM as https://www.npmjs.com/package/node-red-contrib-ssh-v2-reconnection <br>
Based on https://github.com/yroffin/node-red-contrib-ssh which does not seem to be maintained.

# Why?
I added this so I could turn on my linux HTPC via Alexa, triggering a WOL packet and then turn it off using SSH.<br>
That's why SSH reconnection was important.

# Changelog
- fix unusable ssh key config
- add reconnection attempts to the ssh client

# Usage
Input: msg.payload has to contain the command. <br>
Output: none

## Configuration
- Ssh: ssh key path (optional but recommended)
- Hostname: address of the target SSH server
- Name: name of the node
- Username: username of the target SSH server
- Password: password of the target SSH server (set this if not using ssh key)

# To-Do (help wanted)
1. Add feature to reuse hosts/accounts instead of having to re-add every time
1. Add output so that other nodes can consume the result
1. Add option to consume more information(e.g. hostname) from other node

