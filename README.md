# dazzling-task [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
> Customizable task manager toolkit


## Install

```sh
$ npm install --save dazzling-task
```

## Usage

```js
import dazzlingTask from 'dazzling-task';

//Define a list of supported commands.
const commands = {
  readData: {
    description: 'Reads the configuration',
    funct: (params, callback) => {
      //...
      /*
      params.task: the task name (readData),
      command: the command name (readData),
      tags: an array of tags which could be used by function,
      keys: an array of paths which are used to read the data,
      data: an array of data based on the keys,
      general: the general configuration.
      */
    }
  },
  beautify: {
    description: 'Beautify json',
    funct: (params, callback) => {
      //...
    }
  }
};

/*Define a script. In practice, the script will be loaded from an external file. In other words, you should be able to have many scripts using a same list of commands.
*/
const script = {
  tasks: {
    metadata: [
      {
        c: 'readData',
        t: ['tag1','tag2'],
        k: ['metadata']
      },
      {
        c: 'beautify'
      }
    ],
    license: [
      {
        c: 'readData',
        t: ['license-tag'],
        k: ['metadata.license']
      }
    ],
    author: [
      {
        c: 'readData',
        t: ['tag3'],
        k: ['metadata.author']
      }
    ]

  },
  jobs: {
    go: [
      ['metadata', 'license'],
      ['author']
    ]
  },
  data: {
    metadata: {
      author: 'aradhna',
      license: 'MIT'
    }
  }
};
const jobs = dazzlingTask({
  commands: commands,
  script: scripts
});

jobs.run('go', (err, result) => {
  /* Will run the job go: metadata and license in parallel, followed by author

  If successful, you may want to read jobs.general().tasks
  */
});
```

## License

MIT © [Olivier Huin]()


[npm-image]: https://badge.fury.io/js/dazzling-task.svg
[npm-url]: https://npmjs.org/package/dazzling-task
[travis-image]: https://travis-ci.org/flarebyte/dazzling-task.svg?branch=master
[travis-url]: https://travis-ci.org/flarebyte/dazzling-task
[daviddm-image]: https://david-dm.org/flarebyte/dazzling-task.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/flarebyte/dazzling-task
[coveralls-image]: https://coveralls.io/repos/flarebyte/dazzling-task/badge.svg
[coveralls-url]: https://coveralls.io/r/flarebyte/dazzling-task
