# lwc-prebundle

This project is **experimental** and modifies your code, if you're trying it out please ensure you've commited prior.

Use external dependencies from `node_modules` in your lwc component bundles without having to deal with static resources, lost typings, having to bundle them yourself, or cluttering up your `lwc` folder in your sfdx projects.

Upgrade dependencies as you would in any off-platform project.
Let yarn/npm still take care of your lock files.
Runs on CI machines as long as they can run node and allow for `fs` operations.

If Salesforce ever does provide a way to use code from `node_modules` (unlikely, although a [few TC-39 propsals might help](https://github.com/tc39/proposal-ses)) within your LWC components you can just not call lwc-prebundle before deploying with no need to change your code at all.

As i'm sure goes without saying, NOT RECOMMENDED FOR PRODUCTION.

[The Salesforce recommended way to include third party dependencies](https://developer.salesforce.com/docs/component-library/documentation/lwc/js_third_party_library.html) is to upload the js file as a static resource and then load the script the first time your component renders.

- I hope they load that from a cache if you have multiple components on the same page request the same static resource
- It is quite unfortunate that you can only fetch the file once your component is finished rendering for the first time. All your component code has to get downloaded and parsed and they have to finish an initial render of your component before you can make the request to download the external js file and then parse that.
- It's also unfortunate that you get no dead-code elimination in that file, you load the entire library file no matter what

## Overview

Before you deploy your code to Salesforce lwc-prebundle will scan all the `.js` files in your `lwc/` sub-folders for imports to `node_modules` and redirect them to an LWC component with the same name as the dependency. That LWC component simply imports the actual dependency into a utility file, that is ignored by Salesforce, and re-exports everything that's imported. When the code is uploaded to Salesforce the only code that is imported or exported is from one LWC to another.

Once your deployment is finished, calling `lwc-prebundle cleanup` resets your import statements back to the original `node_modules` location so that you get all the typings, etc that the original package provides.

If you think about it, this is very similar to the 'Deploy to Salesforce' button just metadata deploying some Apex classes into your org 😂.

lwc-prebundle will put each package into it's own LWC bundle, as opposed to a singular LWC bundle for all dependencies, for a few reasons:

1. Each LWC bundle can only be 128kb
2. Avoid namespace collisions between packages as everything needs to be re-exported through a singular js file named the same as the component
3. Improved stacktraces that represent the actual external package name
4. Ensures that no dependency code from another component in the same project has to be parsed for any component that doesn't use that dependency. This component should be treeshaken by lwc when it builds that particular component.

A common concern with providing a unique LWC bundle for each external dependency is that it will clutter up the `lwc/` folder in your sfdx project. To mitigate this lwc-prebundle only stores the external dependency LWC bundle within the `lwc` folder until the deployment is complete and hides it away when not in use. This also allows for treating this external code the same way you would in any other project, not part of your authored code.

lwc-prebundle keeps track of the specific imports you've used from the dependencies and will only re-bundle the dependency if somewhere in your code you add or remove an import from that dependency. Deploying to Salesforce already takes long enough, wherever possible we try not to increase the bundling time.

The cleanup step is optional if you want to perform a one-time import. `lwc-prebundle` will still keep track of the dependency so you can call `lwc-prebundle cleanup` at any point in the future.

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
1. Offer a purge command to clear the cache
2. Make available as SFDX plugin to take advantage of predeploy and postdeploy hooks
   - This is only going to be worth doing if the predeploy hook gets called if nothing in the source seems to have changed and if the postdeploy hooks get called if the deployment fails, which I don't think that it will, so.
3. I think it'll serve from the cache even if you have one less import now

- Obviously not ideal as it you need to be able to remove unused deps

## Roadmap

### Typescript Support

Add prompts on `init` to select if looking for Typescript for non-component files. We will still only pass .ts files to rollup.

We can offer expirimental support for component files using the comment approach but it is very much experimental.

We will look in the root of the lwc folder for a tsconfig file to use, falling back to the root if it doesn't exist there. We will use a recommended one if one does not exist in the root either.

It's interesting to consider ts support for non-cmp files because how much code actually gets written outside of cmp files? I mean it would be nice to be able to have all utilities written with types, etc. You could also get in the habit of writing most of your code in the non-cmp file but that adds indirection so I don't know.

### Terser

[Using the rollup terser plugin](https://www.npmjs.com/package/rollup-plugin-terser) is easy once the config file is available. This would be your way to decrease the likelihood that a particular module will exceed the limit.
It might be a waste of time though because lwc is going to minify your code anyway so not doing this saves build time. They don't minify before saving, just before serving, so do this if you need to get under the limit and this will do that, but don't waste build time otherwise.

### Babel Support

Babel support can be setup through the config file if desired.

The reason I would offer TypeScript support first-class and not babel is because when Salesforce does it's own bundling I'm pretty sure it uses babel and rollup as well so the only real reason you would need babel is to get like top-level await or something (although optional chaining still doesn't seem to be available by default in lwc)

Plus there's no way to ship sourcemaps but I guess with like an esnext target of babel it would look a lot like your code.

### Post-CSS Support

[Ability to run post-css on cmp {css|scss} files](https://www.npmjs.com/package/rollup-plugin-postcss)
support if desired needs to be introduced as first class, if it were to exist, as right now we only deal with the `.js` files and ignore the `.html` and `.css` files. An option would be to scan for css and scss files, if there's a configuration for one.

I'm not entirely sure how useful this feature would be generally though. Being able to use sass would be nice but css is already scoped and can be shared with `@import` statements. You also don't end up with much css in a given component if you use slds. It would be interesting to have a css service module and just import it into every component but because of the trash that is closed shadow roots and the way lwc scopes css it would be _insanely_ expensive to do that, so.

I would love to be able to support Tailwind for a particular component (I know slds exists but I don't like the provided utilities). However, because of the lack of any global styles it's really not something that should be done because even if you were willing to run purgecss each and every time per component for the entire nearly 4MB tailwind dev build you would run into the same cost with bundling a unique scoped version of each utility class per component.

### Config file support

Will support a lwc-prebundle.config.{js|json} to allow providing config for all, or any particular file, that you want to bundle. All external dependencies are bundled by default but this offers an opportunity to inject rollup configuration for a particular dependency, or to have a component js/ts file bundled. No non-external code is bundled unless the component bundle name is listed in the configuration file, or the project is initialized as a ts project.

This will basically support anything rollup supports, with the exceptions being you can't overwrite certain required configuration such as the output being set to type `esm`.

All the sub files of a component with this setup need to have the same configuration which I guess isn't the end of the world and I also imagine that you really just want to set the configuration for all files so you can use something like typescript (or terser or post-css [with emit] until we add it)

You would get a mapping like `a.js` -> `a.bundle.js` within the same component but because we can't run rollup on the cmp js file itself we'll need to modify those imports also which isn't a big deal because it's the same as what we're already doing and rollup obviously preserves exports.

We could accept the extension in the config file or as part of init, likely as part of init so that it can be added to the ignores. Actually, the forceignore needs to contain the name of the _unbundled_ file which is dynamic. So I would dynamically add and remove from the forceignore file on each predeploy call for each of the files that are being bundled.

We could just do it the same way we do the external stuff by adding the `.bundle.js` file only while uploading. We do have the file contents (we're currently clearing them to save space) but we could compare those values and serve from cache if unchanged?
Alternatively we would literally just delete it and rebundle every time.

This model below doesn't allow for any output modifications.

```javascript
import typescript from '@rollup/plugin-typescript'
export default {
  dependencies: {
    input: {
      plugins: [
        /* rollup plugins */
      ],
    },
  },
  components: {
    '*': {
      /* wildcard, matches all, same options, merged with specific */
    },
    'cmpName/filename': {
      input: {
        plugins: [
          /* rollup plugins */
        ],
      },
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

- Dependencies with both named and default exports are not currently supported
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

- [ ] Consider migrating to reghex to parse the imports and their items
- [ ] Evaluate if snowpack might be better here than rollup
- [ ] Detect filesize and roll back if it's going to be too big and provide error notice

# Notes

You cannot accomplish this in any way that requires actually parsing the component js files (such as rollup plugin alias, babel, etc) because you will need to transform the decorators,which means Salesforce won't accept the generated code.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/lwc-prebundle.svg)](https://npmjs.org/package/lwc-prebundle)
[![Downloads/week](https://img.shields.io/npm/dw/lwc-prebundle.svg)](https://npmjs.org/package/lwc-prebundle)
[![License](https://img.shields.io/npm/l/lwc-prebundle.svg)](https://github.com/myleslinder/lwc-prebundle/blob/master/package.json)

<!-- toc -->

- [lwc-prebundle](#lwc-prebundle)
- [Known Issues & Limitations](#known-issues--limitations)
- [Notes](#notes)
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
lwc-prebundle/0.0.2 darwin-x64 node-v15.1.0
$ lwc-prebundle --help [COMMAND]
USAGE
  $ lwc-prebundle COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`lwc-prebundle cleanup`](#lwc-prebundle-cleanup)
- [`lwc-prebundle help [COMMAND]`](#lwc-prebundle-help-command)
- [`lwc-prebundle init`](#lwc-prebundle-init)
- [`lwc-prebundle prepare`](#lwc-prebundle-prepare)

## `lwc-prebundle cleanup`

describe the command here

```
USAGE
  $ lwc-prebundle cleanup

OPTIONS
  -h, --help       show CLI help
  -r, --root=root  the path from the project root to the lwc directory
```

_See code: [src/commands/cleanup.ts](https://github.com/myleslinder/lwc-prebundle/blob/v0.0.2/src/commands/cleanup.ts)_

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

_See code: [src/commands/init.ts](https://github.com/myleslinder/lwc-prebundle/blob/v0.0.2/src/commands/init.ts)_

## `lwc-prebundle prepare`

describe the command here

```
USAGE
  $ lwc-prebundle prepare

OPTIONS
  -h, --help       show CLI help
  -r, --root=root  the path from the project root the lwc directory
```

_See code: [src/commands/prepare.ts](https://github.com/myleslinder/lwc-prebundle/blob/v0.0.2/src/commands/prepare.ts)_

<!-- commandsstop -->
