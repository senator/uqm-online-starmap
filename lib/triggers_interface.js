define(function() {
  return {

    when: function(trigger, list, callback) {
      this.triggers[trigger] = {callback: callback, desired: list, have: []};
    },

    trigger: function(trigger, element) {
      if (!(trigger in this.triggers)) {
        console.warn("trigger " + trigger + " not registered");
        return;
      }

      console.log(trigger + " " + element);

      this.triggers[trigger].have.push(element);

      if (this._check_trigger(trigger)) {
        console.log("Trigger '" + trigger + "' is ready; firing callback.");
        var cb = this.triggers[trigger].callback;
        delete this.triggers[trigger];
        cb();
      }
    },

    "_check_trigger": function(trigger) {
      var c = 0;
      var T = this.triggers[trigger];
      for (var i = 0; i < T.desired.length; i++) {
        if (T.have.indexOf(T.desired[i]) != -1)
          c++;
      }

      return c == T.desired.length;
    },

    mixin: function(obj) {
      for (var key in this) {
        obj[key] = this[key];
      }

      obj.triggers = [];
    }
  };
});

