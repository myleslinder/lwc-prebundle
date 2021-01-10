# lwc-prebundle

Use external dependencies from `node_modules` in your lwc component bundles without having to deal with static resources, lost typings, having to bundle them yourself, or cluttering up your `lwc` folder in your sfdx projects.

Upgrade dependencies as you would in any off-platform project.
Let yarn/npm still take care of your lock files.
Runs on CI machines as long as they can run node and allow for `fs` operations.

If Salesforce ever does provide a way to use code from `node_modules` (unlikely, although the a [few TC-39 propsals might help](https://github.com/tc39/proposal-ses)) within your LWC components you can just not call lwc-prebundle before deploying with no need to change your code at all.

As i'm sure goes without saying, NOT RECOMMENDED FOR PRODUCTION.

## Overview

Before you deploy your code to Salesforce lwc-prebundle will scan all the `.js` files in your `lwc/` sub-folders for imports to `node_modules` and redirect them to an LWC component with the same name. The LWC component simply imports the actual third party code into a utility file, that is ignored by Salesforce, and re-exports everything that's imported. When the code is uploaded to Salesforce the only code that is imported or exported is from one LWC to another.

Once your deployment is finished, lwc-prebundle resets your import statements back to the original `node_modules` location so that you get all the typings, etc that the original package provides.

lwc-prebundle will put each package into it's own LWC bundle, as opposed to a singular LWC bundle for all dependencies, for a few reasons:

1. Each LWC bundle can only be 128kb
2. Avoid namespace collisions between packages as everything needs to be re-exported through a singular js file named the same as the component
3. Improved stacktraces that represent the actual external package name
4. Ensures that no dependency code from another component in the same project has to be parsed for any component that doesn't use that dependency. This component should be treeshaken by lwc when it builds that particular component.

A common concern with providing a unique LWC bundle for each external dependency is that it will clutter up the `lwc/` folder in your sfdx project. To mitigate this lwc-prebundle only stores the external dependency LWC bundle within the `lwc` folder until the deployment is complete and hides it away when not in use. This also allows for treating this external code the same way you would in any other project, not part of your authored code.

lwc-prebundle keeps track of the specific imports you've used from the dependencies and will only re-bundle the dependency if somewhere in your code you add or remove an import from that dependency. Deploying to Salesforce already takes long enough, wherever possible we try not to increase the bundling time.

## Usage

1. Call `lwc-bundle init` to add the proper globs to your `.gitignore` and `.forceignore` files.
2. Call `lwc-bundle prepare` whenever you push or deploy to Salesforce
3. Call `lwc-bundle cleanup` after your deployment is complete

It's easiest to add your scripts to `package.json` like so:

```json
  "prepare": "lwc-prebundle prepare",
  "cleanup": "lwc-prebundle cleanup",
  "push": "lwc-prebundle prepare && sfdx force:source:push && lwc-prebundle cleanup",
```

If you need to pass flags to the `sfdx push` or `sfdx deploy` commands you can string them together yourself:

```sh-session
  yarn prepare && sfdx force:source:push -FLAGS && yarn cleanup
```

https://stackoverflow.com/questions/50835221/pass-command-line-argument-to-child-script-in-yarn

## TODO

0. If a dependency no longer exists delete the cmp folder of the cache so it doesn't take up disk space unnecessarily
1. Make available as SFDX plugin to take advantage of predeploy and postdeploy hooks
   - This is only going to be worth doing if the predeploy hook gets called if nothing in the source seems to have changed and if the postdeploy hooks get called if the deployment fails, which I don't think that it will, so.

## Roadmap

### Typescript Support

Add prompts on `init` to select if looking for Typescript for non-component files. We will still only pass .ts files to rollup.

We can offer expirimental support for component files using the comment approach but it is very much experimental.

We will look in the root of the lwc folder for a tsconfig file to use, falling back to the root if it doesn't exist there.

It's interesting to consider ts support for non-cmp files because how much code actually gets written outside of cmp files? I mean it would be nice to be able to have all utilities written with types, etc. You could also get in the habit of writing most of your code in the non-cmp file but that adds indirection so I don't know.

### Terser

[Using the rollup terser plugin](https://www.npmjs.com/package/rollup-plugin-terser) is easy once the config file is available. This would be your way to decrease the likelihood that a particular module will exceed the limit.
It might be a waste of time though because lwc is going to minify your code anyway so not doing this saves build time. They don't minify before saving, just before serving, so do this if you need to get under the limit and this will do that, but don't waste build time otherwise.

### Babel Support

Babel support can be setup through the config file if desired.

The reason I would offer TypeScript support first-class and not babel is because when Salesforce does it's own bundling I'm pretty sure it uses babel and rollup as well so the only real reason you would need babel is to get like top-level await or something (although optional chaining still doesn't seem to be available by default in lwc)

### Post-CSS Support

[Ability to run post-css on cmp {css|scss} files](https://www.npmjs.com/package/rollup-plugin-postcss)
support if desired needs to be introduced as first class, if it were to exist, as right now we only deal with the `.js` files and ignore the `.html` and `.css` files. An option would be to scan for css and scss files, if there's a configuration for one.

I'm not entirely sure how useful this feature would be generally though. Being able to use sass would be nice but css is already scoped and can be shared with `@import` statements. You also don't end up with much css in a given component if you use slds. It would be interesting to have a css service module and just import it into every component but because of the trash that is closed shadow roots and the way lwc scopes css it would be _insanely_ expensive to do that, so.

I would love to be able to support Tailwind for a particular component (I know slds exists but I don't like the provided utilities). However, because of the lack of any global styles it's really not something that should be done because even if you were willing to run purgecss each and every time per component for the entire nearly 4MB tailwind dev build you would run into the same cost with bundling a unique scoped version of each utility class per component.

### Config file support

Will support a lwc-prebundle.config.{js|json} with keys for every file that you want to bundle. All external dependencies are bundled by default but this offers an opportunity to inject rollup configuration for a particular dependency. No non-external code is bundled unless the component bundle name is listed in the configuration file.

This will basically support anything rollup supports, with the exceptions being you can't overwrite certain required configuration such as the output being set to type `esm`.

All the sub files of a component with this setup need to have the same configuration which I guess isn't the end of the world and I also imagine that you really just want to set the configuration for all files so you can use something like typescript (or terser or post-css [with emit] until we add it)

Will need a way to pass a flag to the CLI, or to set it here, so that if you want to run some version of the configuration for everything, with the specific ones falling back to that (or being merged with that).

You would get a mapping like `a.js` -> `a.bundle.js` within the same component but because we can't run rollup on the cmp js file itself we'll need to modify those imports also which isn't a big deal because it's the same as what we're already doing and rollup obviously preserves exports.

```javascript
import typescript from '@rollup/plugin-typescript'
export default {
  // external dependency
  robot3: {
    include: '*', // optional, unlikely to provide for an external dep but this shows everything,
  },
  // authored component
  myComponent: {
    include: ['utils.ts'], // need to provide extension per, could offer string|string[]
    input: {
      plugins: [
        typescript,
        /* plugin function references, do not call them */
      ],
    },
    output: {
      file: ['utils.js'], // this is a nice way to do it if you write ts so no need
    },
  },
}
```

### LWC Single File Components

Basically identical to vue components just an html file that supports a top level template tag, style tag, and script tag.

Just need to set your editor to treat .lwc files as html files to get syntax highlighting. Will need to see how eslint handles this, if they check the script section of html files in the project, probably not so that's worth considering.

### Alternative Foldering

Having to have all components at the same level of the singular `lwc/` folder starts to get really unwieldly very quickly (yes you could split them out into multiple packages but code organization is **absolutely not** the reason to do that).

It would be great to be able to have a `src/` folder and nest the components to 2 depths so you can organize them better at least.

```fs
  src
    feature-1
      cmp-a
      cmp-b
    cmp-c
```

# Known Issues & Limitations

- You cannot have an LWC component named the same as an external dependency
- If your deployment fails then the script afterward doesn't run...but this monstrosity is a current workaround:
  ```bash
  lwc-prebundle prepare && (sfdx force:source:push || lwc-prebundle cleanup) && lwc-prebundle cleanup
  ```
- If you have a string literal in a code file that matches **exactly** with the name of an imported module, such as `let str = "lodash/fp"`, you will experience issues with that being replaced with `let str = "c/lodash/fp"`
- There's the chance that an imported package name will break the rules of what lwc folders can be named
  - lwc-prebundle can handle path based imports such as `lodash/fp` but there [are other restrictions](https://developer.salesforce.com/docs/component-library/documentation/en/lwc/lwc.create_components_folder) that are not handled
- There is known size limitation of 128KB for each treeshaken external module that gets included
  - A common concern surrounds adopting an external module and exceeding the size limit only as you begin to use additional pieces of the package.
  - [BundlePhobia](https://bundlephobia.com/) is your friend when evaluating a dependency

### Codebase

- [ ] Publish to npm
- [ ] Consider migrating to reghex to parse the imports and their items
- [ ] Evaluate if snowpack might be better here than rollup

# Notes

You cannot accomplish this in any way that requires actually parsing the component js files (such as rollup plugin alias, babel, etc) because you will need to transform the decorators,which means Salesforce won't accept that code.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/lwc-prebundle.svg)](https://npmjs.org/package/lwc-prebundle)
[![Downloads/week](https://img.shields.io/npm/dw/lwc-prebundle.svg)](https://npmjs.org/package/lwc-prebundle)
[![License](https://img.shields.io/npm/l/lwc-prebundle.svg)](https://github.com/myleslinder/lwc-prebundle/blob/master/package.json)

<!-- toc -->

- [Usage](#usage)
- [Commands](#commands)
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

- [`lwc-prebundle help [COMMAND]`](#lwc-prebundle-help-command)
- [`lwc-prebundle cleanup [LWC_ROOT]`](#lwc-prebundle-cleanup-file)
- [`lwc-prebundle init`](#lwc-prebundle-init)
- [`lwc-prebundle prepare [LWC-ROOT]`](#lwc-prebundle-prepare-lwc-root)

## `lwc-prebundle cleanup [LWC_ROOT]`

describe the command here

```
USAGE
  $ lwc-prebundle cleanup [FILE]

OPTIONS
  -h, --help       show CLI help
  -r               (optional) the path to the lwc folder
```

_See code: [src/commands/cleanup.ts](https://github.com/myleslinder/lwc-prebundle/blob/v0.0.1/src/commands/cleanup.ts)_

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

## `lwc-prebundle init`

Configure your project for usage with lwc-prebundle

```
USAGE
  $ lwc-prebundle init

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/init.ts](https://github.com/myleslinder/lwc-prebundle/blob/v0.0.1/src/commands/init.ts)_

## `lwc-prebundle prepare [LWC-ROOT]`

describe the command here

```
USAGE
  $ lwc-prebundle prepare [LWC-ROOT]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -r, --name=name  the path from the project root the lwc directory
```

_See code: [src/commands/prepare.ts](https://github.com/myleslinder/lwc-prebundle/blob/v0.0.1/src/commands/prepare.ts)_

<!-- commandsstop -->
