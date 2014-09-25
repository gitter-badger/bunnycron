(function() {
  var BunnyCron, Cron, Worker, app, async, exec, exports, noop, options, parallel, redis, sanitizeUrl, _;

  Cron = require("./cron");

  _ = require("lodash");

  exec = require("child_process").exec;

  async = require('async');

  Worker = require('./worker');

  redis = require("./redis");

  app = options = void 0;

  noop = function() {};

  BunnyCron = function(options) {
    var createWorker, self;
    this.options = options != null ? options : {};
    self = this;
    createWorker = function() {
      var job, _i, _len, _ref, _results;
      self.jobs = Cron.loadFile(self.options.cronFile);
      self.worker = [];
      _ref = self.jobs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        job = _ref[_i];
        _results.push(self.worker.push(new Worker(job)));
      }
      return _results;
    };
    if (this.options.cronFile != null) {
      createWorker();
    }
    return this;
  };

  sanitizeUrl = function(url) {
    if (url.length > 0 && url[url.length - 1] !== '/') {
      url += '/';
    }
    return url;
  };

  exports = module.exports = function(options) {
    var cronFile, _options;
    if (options == null) {
      options = {};
    }
    if (options.cronFile) {
      cronFile = options.cronFile.replace(/\/$/, '') + '/Cronfile';
    } else {
      cronFile = require('path').dirname(require.main.filename) + '/Cronfile';
    }
    _options = {
      prefix: options.prefix || "bunny",
      cronFile: cronFile
    };
    redis.setupConfig(_options);
    exports.client = Worker.client = redis.createClient();
    Worker.prefix = _options.prefix;
    exports.options = _options;
    return exports;
  };

  Object.defineProperty(exports, 'app', {
    get: function() {
      return (app = require("./http"));
    }
  });

  exports.startCron = function() {
    if (!BunnyCron.singleton) {
      BunnyCron.singleton = new BunnyCron(exports.options);
    }
    return BunnyCron.singleton;
  };

  exports.version = require("../package.json").version;

  BunnyCron.prototype.init = function() {
    return async.parallel([this.clearInactiveJobs.bind(this), this.clearRunningJobs.bind(this), this.clearInactiveLogs.bind(this)], function() {});
  };


  /* 
  When you changed jobs on Cronfile. Old jobs key won't deleted.
   */

  BunnyCron.prototype.clearInactiveJobs = function(callback) {
    var hash, self;
    self = this;
    hash = this.options.prefix + ":job*";
    return this.client.keys(hash, (function(_this) {
      return function(err, keys) {
        var eachTaskFn, inactiveJobs;
        if ((err != null) || keys.length === 0) {
          return callback();
        }
        inactiveJobs = _this.filterInactiveJobs(keys, _this.jobs);
        eachTaskFn = function(id, done) {
          return self.client.del(id, done);
        };
        return parallel(inactiveJobs, eachTaskFn, callback);
      };
    })(this));
  };

  BunnyCron.prototype.clearRunningJobs = function(callback) {
    var hash, self;
    self = this;
    hash = this.options.prefix + ":job*";
    return this.client.keys(hash, function(err, keys) {
      var eachTaskFn;
      if ((err != null) || keys.length === 0) {
        return callback();
      }
      eachTaskFn = function(key, done) {
        var id;
        id = key.split(":")[2];
        return self.del(id, "is_run", done);
      };
      return parallel(keys, eachTaskFn, callback);
    });
  };

  BunnyCron.prototype.clearInactiveLogs = function(callback) {
    var hash, self;
    self = this;
    hash = this.options.prefix + ":log*";
    return this.client.keys(hash, (function(_this) {
      return function(err, keys) {
        var eachTaskFn, inactiveJobs;
        if ((err != null) || keys.length === 0) {
          return callback();
        }
        inactiveJobs = _this.filterInactiveJobs(keys, _this.jobs);
        eachTaskFn = function(id, done) {
          return self.client.del(id, done);
        };
        return parallel(inactiveJobs, eachTaskFn, callback);
      };
    })(this));
  };

  BunnyCron.prototype.filterInactiveJobs = function(keys, jobs) {
    return _.filter(keys, function(item) {
      var id;
      id = item.split(':')[2];
      return !(_.find(jobs, {
        id: id
      }));
    });
  };

  sanitizeUrl = function(url) {
    if (url.length > 0 && url[url.length - 1] !== '/') {
      url += '/';
    }
    return url;
  };

  BunnyCron.prototype.del = function(id, key, callback) {
    var hash;
    hash = this.options.prefix + ":job:" + id;
    return this.client.hdel(hash, key, callback || noop);
  };

  BunnyCron.prototype.shutdown = exports.shutdown = function() {
    return BunnyCron.singleton = null;
  };

  exports.parallel = parallel = function(tasks, fn, done) {
    var fns, task, _fn, _i, _len;
    fns = [];
    _fn = function(task) {
      return fns.push(function(cb) {
        return fn(task, cb);
      });
    };
    for (_i = 0, _len = tasks.length; _i < _len; _i++) {
      task = tasks[_i];
      _fn(task);
    }
    return async.parallel(fns, done);
  };

}).call(this);