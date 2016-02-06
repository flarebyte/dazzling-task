import test from 'tape';
import dazzlingTask from '../src';

const OK = 'OK';

const basicCommands = {
  readData: {
    description: 'Reads the configuration',
    funct: (params, callback) => {
      const taskData = params.general.tasks[params.task];
      taskData.data = params.data;
      taskData.status = OK;
      const previousStage = taskData.stage ? taskData.stage + '->' : '';
      taskData.stage = `${previousStage}${params.task}-${params.command}`;
      callback(null, OK);
    }
  },
  beautify: {
    description: 'Beautify json',
    funct: (params, callback) => {
      const taskData = params.general.tasks[params.task];
      taskData.beauty = `${taskData.status}+beautify`;
      taskData.status = 'beautify';
      const previousStage = taskData.stage ? taskData.stage + '->' : '';
      taskData.stage = `${previousStage}${params.task}-${params.command}`;
      callback(null, OK);
    }
  },
  willFail: {
    description: 'Will fail if call',
    funct: (params, callback) => {
      callback(new Error(`${params.task}-${params.command} is failing`));
    }
  }
};

const basicScript = {
  tasks: {
    metadata: [
      {
        c: 'readData',
        t: ['file:json'],
        k: ['metadata']
      },
      {
        c: 'beautify'
      }
    ],
    license: [
      {
        c: 'readData',
        t: ['license'],
        k: ['metadata.license']
      }
    ],
    author: [
      {
        c: 'readData',
        k: ['metadata.author']
      }
    ],
    wouldFail: [
      {
        c: 'willFail'
      }
    ]
  },
  jobs: {
    go: [
      ['metadata', 'license'],
      ['author']
    ],
    licensing: [
      ['license']
    ],
    gofail: [
      ['metadata', 'wouldFail'],
      ['author']
    ]
  },
  data: {
    metadata: {
      author: 'olivier',
      license: 'MIT'
    }
  }
};


const basicConf = {
  commands: basicCommands,
  script: basicScript
};


test('should validate configuration', (t) => {
  t.plan(1);
  var a = dazzlingTask(basicConf);
  t.ok(a !== null, 'We can validate configuration');
});

test('should populate task params', (t) => {
  t.plan(1);
  const a = dazzlingTask(basicConf);
  const result = a.asTaskParams('license');
  const expected = [{
    task: 'license',
    command: 'readData',
    tags: ['license'],
    keys: ['metadata.license'],
    data: ['MIT'],
    general: {
      tasks: {
        author: {},
        license: {},
        metadata: {},
        wouldFail: {}
      }
    }
  }];
  t.deepEqual(result, expected, 'License task params');
});

test('should produce sub tasks', (t) => {
  t.plan(3);
  const a = dazzlingTask(basicConf);
  const subTasks = a.asSubTasks('license');
  //assert.isFunction(subTasks[0], 'license sub task');
  subTasks[0](function (err, result) {
    t.ok(err === null, 'no error for task');
    t.deepEqual(result, OK, 'result should be OK');
    t.deepEqual(a.general().tasks.license, {
      data: ['MIT'],
      stage: 'license-readData',
      status: OK
    }, 'license data should be correct');
    t.end();
  });
});
test('should run a simple task such as license', (t) => {
  t.plan(3);
  var a = dazzlingTask(basicConf);
  a.runTask('license', function (err, result) {
    t.ok(err === null, 'no error for task');
    t.deepEqual(result, [OK], 'result should be [OK]');
    t.deepEqual(a.general().tasks.license, {
      data: ['MIT'],
      stage: 'license-readData',
      status: OK
    }, 'license data should be present');
    t.end();
  });
});
test('should run a task with two sub tasks such as metadata', (t) => {
  t.plan(3);
  var a = dazzlingTask(basicConf);
  a.runTask('metadata', function (err, result) {
    t.ok(err === null, 'no error for task');
    t.deepEqual(result, [OK, OK], 'result should be [OK,OK]');
    t.deepEqual(a.general().tasks.metadata, {
      data: [{
        author: 'olivier',
        license: 'MIT'
      }],
      status: 'beautify',
      stage: 'metadata-readData->metadata-beautify',
      beauty: 'OK+beautify'
    }, 'metadata should be present');
    t.end();
  });
});

test('should run a job', (t) => {
  t.plan(5);
  var a = dazzlingTask(basicConf);
  a.run('go', function (err, result) {
    t.ok(err === null, 'no error for task');
    t.deepEqual(result, [[[OK, OK], [OK]], [[OK]]], 'job should be OK');
    t.deepEqual(a.general().tasks.license, {
      data: ['MIT'],
      stage: 'license-readData',
      status: OK
    }, 'license should be present');
    t.deepEqual(a.general().tasks.author, {
      data: ['olivier'],
      stage: 'author-readData',
      status: OK
    }, 'author should be present');
    t.deepEqual(a.general().tasks.metadata, {
      data: [{
        author: 'olivier',
        license: 'MIT'
      }],
      status: 'beautify',
      stage: 'metadata-readData->metadata-beautify',
      beauty: 'OK+beautify'
    }, 'metadata should be present');
    t.end();
  });
});

test('should recognize a failing job', (t) => {
  t.plan(4);
  var a = dazzlingTask(basicConf);
  a.run('gofail', function (err) {
    t.equal(err.message, 'wouldFail-willFail is failing', 'should have specific error');
    t.deepEqual(a.general().tasks.license, {}, 'license should be present');
    t.deepEqual(a.general().tasks.author, {}, 'author should be present');
    t.deepEqual(a.general().tasks.metadata.data, [{
        author: 'olivier',
        license: 'MIT'
      }], 'metadata should be present');
    t.end();
  });
});
