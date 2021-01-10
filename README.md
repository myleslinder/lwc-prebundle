lwc-prebundle
=============

Use external dependencies from `node_modules` in your lwc component bundles

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/lwc-prebundle.svg)](https://npmjs.org/package/lwc-prebundle)
[![Downloads/week](https://img.shields.io/npm/dw/lwc-prebundle.svg)](https://npmjs.org/package/lwc-prebundle)
[![License](https://img.shields.io/npm/l/lwc-prebundle.svg)](https://github.com/myleslinder/lwc-prebundle/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g lwc-prebundle
$ lwc-prebundle COMMAND
running command...
$ lwc-prebundle (-v|--version|version)
lwc-prebundle/0.0.1 darwin-x64 node-v15.1.0
$ lwc-prebundle --help [COMMAND]
USAGE
  $ lwc-prebundle COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`lwc-prebundle hello [FILE]`](#lwc-prebundle-hello-file)
* [`lwc-prebundle help [COMMAND]`](#lwc-prebundle-help-command)

## `lwc-prebundle hello [FILE]`

describe the command here

```
USAGE
  $ lwc-prebundle hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ lwc-prebundle hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/myleslinder/lwc-prebundle/blob/v0.0.1/src/commands/hello.ts)_

## `lwc-prebundle help [COMMAND]`

display help for lwc-prebundle

```
USAGE
  $ lwc-prebundle help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.1/src/commands/help.ts)_
<!-- commandsstop -->
