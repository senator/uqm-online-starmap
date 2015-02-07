define([], function() {
  return {
    /* does naming the function here break not-V8? */
    time_sync_op: function time_sync_op(callback, task_description) {
      var time_used, start = (new Date()).getTime();
      callback();
      var ms_used = (new Date()).getTime() - start;

      if (task_description)
        console.log(task_description, "completed in", ms_used, "ms");
      return ms_used;
    }
  };
});
