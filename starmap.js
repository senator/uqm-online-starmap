// exports StarMap to the global namespace, and depends on $ being jQuery.

(function() {

  var CIRCLE_RADIAN = 2 * Math.PI;
  var NOMINAL_WIDTH = 10000;
  var NOMINAL_HEIGHT = 10000;
  var NOMINAL_DWARF_SIZE = 10;

  function StarMapScale() {
    this._init = function(canvas_width, canvas_height) {
      this.xfactor = canvas_width / NOMINAL_WIDTH;
      this.yfactor = canvas_height / NOMINAL_HEIGHT;
      this.star_size_factor = ((this.xfactor + this.yfactor) / 2) *
        NOMINAL_DWARF_SIZE;
    };

    this._init.apply(this, arguments);
  }

  function StarData() {
    this._init = function(star_data_list) {
      this.list = star_data_list;
      //x = raw[0];
      //y = raw[1];
      //size_index = raw[2];
      //color_index = raw[3];
      //generator = raw[4];
      //prefix_index = raw[5];
      //name_index = raw[6];
    };

    this.drawing_parameters = function(index,scale,size_lookup,color_lookup) {
      var row = this.list[index];
      var color_row = color_lookup[row[3]];

      return {
        color_rgb: color_row.rgb,
        color_name: color_row.name,
        x: Math.round(row[0] * scale.xfactor),
        y: Math.round((10000 - row[1]) * scale.yfactor),
        radius: size_lookup[row[2]].factor * scale.star_size_factor + 1
      };
    };

    this.length = function() {
      return this.list.length;
    };

    this._init.apply(this, arguments);
  }

  // main, exported class
  function StarMap() {

    this._init = function(canvas) {
      this.canvas = canvas;
      this.scale = new StarMapScale(canvas.width, canvas.height);
      this.ctx = canvas.getContext("2d");

      this.triggers = [];

      var self = this;

      this.when("loaded", ["stars","sizes","colors"],
          function() {
            // self.draw_all();
            console.log("would call draw_all() here");
          });

      this.load_data();
    };

    // XXX TODO Beginning here, separate out these methods as
    // the "collecting trigger" interface.

    this.when = function(trigger, list, callback) {
      this.triggers[trigger] = {callback: callback, desired: list, have: []};
    };

    this.trigger = function(trigger, element) {
      if (!(trigger in this.triggers)) {
        console.warn("trigger " + trigger + " not registered");
        return;
      }

      console.log(trigger + " " + element);

      this.triggers[trigger].have.push(element);

      if (this._check_trigger(trigger)) {
        console.log("It's go time for " + trigger);
        var cb = this.triggers[trigger].callback;
        delete this.triggers[trigger];
        cb();
      }
    };

    this._check_trigger = function(trigger) {
      var c = 0;
      var T = this.triggers[trigger];
      for (var i = 0; i < T.desired.length; i++) {
        if (T.have.indexOf(T.desired[i]) != -1)
          c++;
      }

      return c == T.desired.length;
    }

    // XXX TODO ... end "collecting trigger" interface.

    this.load_data = function() {
      var self = this;

      $.getJSON("data/stars.json", function(data) {
        self.stars = new StarData(data);
        self.trigger("loaded", "stars");
      });

      $.getJSON("data/sizes.json", function(data) {
        self.size_lookup = data;
        self.trigger("loaded", "sizes");
      });

      $.getJSON("data/colors.json", function(data) {
        self.color_lookup = data;
        self.trigger("loaded", "colors");
      });
    };

    this.draw_all = function() {
      var len = this.stars.length();

      for (var i = 0; i < len; i++) {
        var params = this.stars.drawing_parameters(i, this.scale,
            this.size_lookup, this.color_lookup);

        this.ctx.beginPath();
        this.ctx.arc(params.x, params.y, params.radius, 0, CIRCLE_RADIAN);
        this.ctx.closePath();
        this.ctx.fillStyle = params.color_rgb;
        this.ctx.fill();
      }
    };

    this.map_coordinates = function(event_x, event_y) {

      // We can't necessarily store this rect, since it changes if the page
      // scrolls or zooms.
      var rect = this.canvas.getBoundingClientRect();

      // Padding creates waste space that needs to be considered. Maybe
      // margins do too.
      var x_waste = (rect.width - this.canvas.width) / 2;
      var y_waste = (rect.height - this.canvas.height) / 2;

      var canvas_x = (event_x - x_waste) - rect.left;
      var canvas_y = (event_y - y_waste) - rect.top;

      return [canvas_x / this.scale.xfactor,
        (this.canvas.height - canvas_y) / this.scale.yfactor];
    };

    this._init.apply(this, arguments);
  }

  window.StarMap = StarMap;
})();
