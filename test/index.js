import chai from 'chai';
const assert = chai.assert;
import dazzlingTask from '../lib';

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


describe('dazzling-task', function () {
  it('should validate configuration', function () {
    var a = dazzlingTask(basicConf);
    assert(a !== null, 'we expected this package author to add actual unit tests.');
  });
  it('should populate task params', function () {
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
    assert.deepEqual(result, expected, 'License task params');
  });
  it('should produce sub tasks', function (done) {
    const a = dazzlingTask(basicConf);
    const subTasks = a.asSubTasks('license');
    assert.isFunction(subTasks[0], 'license sub task');
    subTasks[0](function (err, result) {
      assert.isNull(err);
      assert.deepEqual(result, OK);
      assert.deepEqual(a.general().tasks.license, {
        data: ['MIT'],
        stage: 'license-readData',
        status: OK
      });
      done();
    });
  });
  it('should run a simple task such as license', function (done) {
    var a = dazzlingTask(basicConf);
    a.runTask('license', function (err, result) {
      assert.isNull(err);
      assert.deepEqual(result, [OK]);
      assert.deepEqual(a.general().tasks.license, {
        data: ['MIT'],
        stage: 'license-readData',
        status: OK
      });
      done();
    });
  });
  it('should run a task with two sub tasks such as metadata', function (done) {
    var a = dazzlingTask(basicConf);
    a.runTask('metadata', function (err, result) {
      assert.isNull(err);
      assert.deepEqual(result, [OK, OK]);
      assert.deepEqual(a.general().tasks.metadata, {
        data: [{
          author: 'olivier',
          license: 'MIT'
        }],
        status: 'beautify',
        stage: 'metadata-readData->metadata-beautify',
        beauty: 'OK+beautify'
      });
      done();
    });
  });

  it('should run a job', function (done) {
    var a = dazzlingTask(basicConf);
    a.run('go', function (err, result) {
      assert.isNull(err);
      assert.deepEqual(result, [[[OK, OK], [OK]], [[OK]]]);
      assert.deepEqual(a.general().tasks.license, {
        data: ['MIT'],
        stage: 'license-readData',
        status: OK
      });
      assert.deepEqual(a.general().tasks.author, {
        data: ['olivier'],
        stage: 'author-readData',
        status: OK
      });
      assert.deepEqual(a.general().tasks.metadata, {
        data: [{
          author: 'olivier',
          license: 'MIT'
        }],
        status: 'beautify',
        stage: 'metadata-readData->metadata-beautify',
        beauty: 'OK+beautify'
      });
      done();
    });
  });

  it('should recognize a failing job', function (done) {
    var a = dazzlingTask(basicConf);
    a.run('gofail', function (err) {
      assert.equal(err, 'Error: wouldFail-willFail is failing');
      assert.deepEqual(a.general().tasks.license, {});
      assert.deepEqual(a.general().tasks.author, {});
      assert.deepEqual(a.general().tasks.metadata, {
        data: [{
          author: 'olivier',
          license: 'MIT'
        }],
        status: 'beautify',
        stage: 'metadata-readData->metadata-beautify',
        beauty: 'OK+beautify'
      });
      done();
    });
  });

});
