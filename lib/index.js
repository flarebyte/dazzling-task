import Joi from 'joi';
import _ from 'lodash';
import async from 'async';

const commandSchema = Joi.object().keys({
  description: Joi.string().min(1).required(),
  funct: Joi.func().required()
});

const scriptSchema = Joi.object().keys({
  tasks: Joi.object().min(1).required(),
  jobs: Joi.object().min(1).required(),
  data: Joi.object().min(1).required()
});

const taskSchema = (commands) =>{
  return Joi.object().keys({
    c: Joi.string().valid(commands).required().description('A command'),
    t: Joi.array().items(Joi.string().min(1)).description('List of tags'),
    k: Joi.array().items(Joi.string().min(1)).description('List of json paths')
  });
};

const confSchema = Joi.object().keys({
  commands: Joi.object().required(),
  script: Joi.object().required()
});

const assertCommands = (commands) => {
  _.forEach(commands, (cmd) => {
    Joi.assert(cmd, commandSchema, `Command ${cmd} is invalid`);
  });
};

const assertTasks = (tasks, commands) => {
  const tasksSchema = Joi.array().items(taskSchema(commands));
  _.forEach(tasks, (task) => {
    Joi.assert(task, tasksSchema, `Task ${task} is invalid`);
  });
};

const assertJobs = (jobs, tasks) => {
  const jobsSchema = Joi.array().items(Joi.string().valid(tasks));
  _.forEach(jobs, (job, jobName) => {
    _.forEach(job, (jobPart) => {
      Joi.assert(jobPart, jobsSchema, `Job ${jobName} is invalid`);
    });
  });
};

export default function (cfg) {

  Joi.assert(cfg, confSchema);
  Joi.assert(cfg.script, scriptSchema);
  assertCommands(cfg.commands);
  assertTasks(cfg.script.tasks, _.keys(cfg.commands));
  assertJobs(cfg.script.jobs, _.keys(cfg.script.tasks));

  const scriptData = cfg.script.data;

  var general = {};

  const resetGeneral = () => {
    general = {
      tasks: {}
    };
    _.forEach(_.keys(cfg.script.tasks), (t) => {
      general.tasks[t] = {};
    });

  };
  resetGeneral();
  const asTaskParams = (taskName) => {
    const asSubTaskParams = (subTask) => {
      const subTaskData = _.map(subTask.k, (key) => {
        return _.get(scriptData, key);
      });
      return {
        task: taskName,
        command: subTask.c,
        tags: subTask.t,
        keys: subTask.k,
        data: subTaskData,
        general: general
      };
    };
    const subTasks = _.get(cfg, ['script', 'tasks', taskName]);
    return _.map(subTasks, asSubTaskParams);
  };

  const asSubTasks = (taskName) => {
    const taskParams = asTaskParams(taskName);
    return _.map(taskParams, (subTaskParams) => {
      return function (callback) {
        const fn = cfg.commands[subTaskParams.command].funct;
        fn(subTaskParams, callback);
      };
    });
  };

  const asTaskSeries = (taskName, callback) => {
    async.series(asSubTasks(taskName), callback);
  };

  const processParallelTasks = (taskNames, callback) => {
    const tasks = _.map(taskNames, (taskName) => {
      return function (cb) {
        asTaskSeries(taskName, cb);
      };
    });
    async.parallel(tasks, callback);
  };

  const processSerialSteps = (jobName, callback) => {
    const subJobs = _.get(cfg, ['script', 'jobs', jobName]);
    const serialSteps = _.map(subJobs, (taskNames) => {
      return function (cb) {
        processParallelTasks(taskNames, cb);
      };
    });
    async.series(serialSteps, callback);
  };

  const runTask = (taskName, callback) => {
    Joi.assert(taskName, Joi.string().valid(_.keys(cfg.script.tasks)));
    resetGeneral();
    asTaskSeries(taskName, callback);
  };

  const run = (jobName, callback) => {
    Joi.assert(jobName, Joi.string().valid(_.keys(cfg.script.jobs)));
    resetGeneral();
    processSerialSteps(jobName, callback);
  };

  return {
    asTaskParams: asTaskParams,
    asSubTasks: asSubTasks,
    runTask: runTask,
    run: run,
    config: _.clone(cfg),
    general: () => {
      return _.clone(general);
    }
  };
}
