define(["jquery", "timer", "triggers_interface"],
  function($, timer, triggers_interface) {

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

  /* Sort the stars into 100 buckets covering the map in a 10x10 grid.
   * This may be helpful in optimizing lookups based on mouse hovering
   * and tapping the map, or it may be premature optimization.  The cost
   * of building the index is low (~ 1ms) with the V8 Javascript engine
   * on an average PC.  Unclear as to performance on mobile devices or IE,
   * but even at 100 ms, no biggie.
   */
  function StarBucketIndex() {
    var X_BUCKETS = 10;
    var Y_BUCKETS = 10;

    var X_DIVISOR = NOMINAL_WIDTH / X_BUCKETS;
    var Y_DIVISOR = NOMINAL_HEIGHT / Y_BUCKETS;

    this._init = function(list) {
      this.create_empty_buckets();
      this.bucketize(list);
    };

    this.create_empty_buckets = function() {
      this.buckets = [];

      for (var x = 0; x < X_BUCKETS; x++) {
        this.buckets.push([]);
        for (var y = 0; y < Y_BUCKETS; y++) {
          this.buckets[x].push([]);
        }
      }
    };

    this.bucketize = function(list) {
      for (var i = 0; i < list.length; i++) {
        var keys = this.keys_from_coords(list[i][0], list[i][1]);
        this.buckets[keys[0]][keys[1]].push(i);
      }
    };

    /* This method trusts that x and y are within the map bounds. */
    this.keys_from_coords = function(x, y) {
      return [Math.floor(x / X_DIVISOR), Math.floor(y / Y_DIVISOR)];
    };

    /* This method would be an especially good candiate for a unit test.
     * Return as many as nine buckets, including the exact hit. */
    this.adjacent_buckets = function(x, y) {
      var exact = this.keys_from_coords(x, y);
      var results = [];

      for (var x = exact[0] - 1; x < exact[0] + 2; x++) {
        for (var y = exact[1] - 1; y < exact[1] + 2; y++) {
          if (x >= 0 && y >= 0 && x < X_BUCKETS && y < Y_BUCKETS) {
            results.push([x, y]);
          }
        }
      }

      return results;
    };

    /* Given (x, y) return all stars in immediate and adjancent buckets. */
    this.get_stars_near = function(x, y) {
      var self = this;

      return this.adjacent_buckets(x, y).reduce(
        function(a, b) { return a.concat(self.buckets[b[0]][b[1]]); }, []
      );
    };

    this._init.apply(this, arguments);
  }

  function StarData() {
    function compute_distance(x1, y1, x2, y2) { // Thanks Pythagoras
      return Math.sqrt( Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) );
    }

    this._init = function(star_data_list) {

      this.list = star_data_list;

      // x 0
      // y 1
      // size_index 2
      // color_index 3
      // generator 4
      // prefix_index 5
      // name_index 6

      var self = this;

      timer.time_sync_op(
        function() { self.bucket_index = new StarBucketIndex(self.list); },
        "Building bucketed star index"
      );
    };

    this.drawing_parameters = function(index,scale,size_lookup,color_lookup) {
      var row = this.list[index];
      var color_row = color_lookup[row[3]];

      return {
        color_rgb: color_row.rgb,
        x: Math.round(row[0] * scale.xfactor),
        y: Math.round((NOMINAL_HEIGHT - row[1]) * scale.yfactor),
        radius: size_lookup[row[2]].factor * scale.star_size_factor + 1
      };
    };

    this.get = function(index) {
      return this.list[index];
    };

    this.find_nearest = function(x, y) {
      var self = this;

      var nearby_sorted = this.bucket_index.get_stars_near(x, y).map(
        function(idx) {
          /* return [index, dist from (x,y)] */
          return [idx,
            compute_distance(x, y, self.list[idx][0], self.list[idx][1])];
        }
      ).sort(
        function(a, b) {
          /* sort lowest distance to highest */
          return a[1] - b[1];
        }
      );

      return nearby_sorted[0];
    };

    this.length = function() {
      return this.list.length;
    };

    this._init.apply(this, arguments);
  }

  function StarMapGrid() {
    var GRID_X_STEP = NOMINAL_WIDTH / 20;
    var GRID_Y_STEP = NOMINAL_HEIGHT / 20;
    var GRID_STROKE_STYLE = "#003399";

    this._init = function(underlay, scale) {
      this.underlay = underlay;
      this.grid_ctx = underlay.getContext("2d");

      this.draw_grid(scale);
    };

    this.draw_grid = function(scale) {
      this.grid_ctx.strokeStyle = GRID_STROKE_STYLE;

      for (var x = GRID_X_STEP; x < NOMINAL_WIDTH; x += GRID_X_STEP) {
        var startx = Math.round(x * scale.xfactor);
        this.grid_ctx.beginPath();
        this.grid_ctx.moveTo(startx, 0);
        this.grid_ctx.lineTo(startx, NOMINAL_HEIGHT);
        this.grid_ctx.stroke();
      }

      for (var y = GRID_Y_STEP; y < NOMINAL_HEIGHT; y += GRID_Y_STEP) {
        var starty = Math.round(y * scale.yfactor);
        this.grid_ctx.beginPath();
        this.grid_ctx.moveTo(0, starty);
        this.grid_ctx.lineTo(NOMINAL_WIDTH, starty);
        this.grid_ctx.closePath();
        this.grid_ctx.stroke();
      }
    };

    this.blank = function() {
      this.grid_ctx.clearRect(0, 0, this.underlay.width, this.underlay.height);
    };

    this._init.apply(this, arguments);
  }

  function StarMapOverlay() {
    var OVERLAY_STROKE_STYLE = "#ff00ff";

    this._init = function(overlay, hit_test) {
      this.overlay = overlay;
      this.overlay_ctx = overlay.getContext("2d");
      this.overlay_ctx.strokeStyle = OVERLAY_STROKE_STYLE;

      this.hit_test = hit_test;
      var self = this;

      this.overlay.addEventListener("mousemove",
          function(evt) { self.on_mousemove(evt); });
    };

    this.on_mousemove = function(evt) {
      var result = this.hit_test(evt); /* null for clear, -1 for no change, [x,y] for new star */

      if (result) {
        if (result == -1)
          return;

        this.blank();
        this.highlight(result[0], result[1]);
      } else {
        this.blank();
      }
    };

    this.highlight = function(canvas_x, canvas_y) {
      var radius = ((this.overlay.width + this.overlay.height) / 2) / 40;

      this.overlay_ctx.beginPath();
      this.overlay_ctx.moveTo(0, canvas_y);
      this.overlay_ctx.lineTo(this.overlay.width, canvas_y);
      this.overlay_ctx.stroke();

      this.overlay_ctx.beginPath();
      this.overlay_ctx.moveTo(canvas_x, 0);
      this.overlay_ctx.lineTo(canvas_x, this.overlay.height);
      this.overlay_ctx.stroke();

      this.overlay_ctx.beginPath();
      this.overlay_ctx.arc(canvas_x, canvas_y, radius, 0, CIRCLE_RADIAN);
      this.overlay_ctx.stroke();
    };

    this.blank = function() {
      this.overlay_ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    };

    this._init.apply(this, arguments);
  }

  /* main, exported class */
  function StarMap() {

    triggers_interface.mixin(this);

    this._init = function(underlay, canvas, overlay) {
      /* We assume these three canvases are all the same in width and height,
       * and they are stacked from bottom-most to top-most with appopriate
       * z-index. */

      var self = this;

      this.canvas = canvas;
      this.star_ctx = canvas.getContext("2d");

      this.set_scale(canvas);
      this.grid = new StarMapGrid(underlay, this.scale);

      /* XXX obviously, define the method given as a callback to StarMapOverlay
       * somewhere else. */
      this.overlay = new StarMapOverlay(overlay, function(evt) {
        var coords = self.map_coordinates(evt.clientX, evt.clientY);
        var star_index = self.find_nearest_star(coords[0], coords[1],
            100 /* XXX Don't hardcode. Scale with size of
                   canvas and zoom level. */);
        if (star_index != null) { // Important: can be zero
          if (star_index == self.last_hit)
            return -1;

          self.last_hit = star_index;
          var star = self.describe_star(star_index);
          var d = star.display;

          /* XXX Pump data to div where star info is displayed to user. */
          console.log(d.name + ":", d.type, "at", d.x, "x", d.y);

          /* Return canvas coordinates of star (not same thing as evt coords)
           * for the overlay object to draw a crosshair. */

          /* XXX This calculation is now duplicated in a couple of places.
           * Refactor. */
          return [Math.round(star.x) * self.scale.xfactor,
            Math.round((NOMINAL_HEIGHT - star.y) * self.scale.yfactor)];
        } else {

          self.last_hit = null;
          /* XXX Clear div where star info is displayed to user. */

          return null;
        }
      });

      this.when("loaded", ["stars","sizes","colors","names","prefixes"],
          function() {
            self.draw_all();
          });

      this.load_data();
    };

    this.set_scale = function(canvas) {
      this.scale = new StarMapScale(canvas.width, canvas.height);
    };

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

      $.getJSON("data/prefixes.json", function(data) {
        self.prefix_lookup = data;
        self.trigger("loaded", "prefixes");
      });

      $.getJSON("data/names.json", function(data) {
        self.name_lookup = data;
        self.trigger("loaded", "names");
      });
    };

    this.draw_all = function() {
      var len = this.stars.length();

      for (var i = 0; i < len; i++) {
        var params = this.stars.drawing_parameters(i, this.scale,
            this.size_lookup, this.color_lookup);

        this.star_ctx.beginPath();
        this.star_ctx.arc(params.x, params.y, params.radius, 0, CIRCLE_RADIAN);
        this.star_ctx.closePath();
        this.star_ctx.fillStyle = params.color_rgb;
        this.star_ctx.fill();
      }
    };

    /* map coords must be within 0..NOMINAL_WIDTH, 0..NOMINAL_HEIGHT */
    this.clamp_map_coords = function(x, y) {
      if (x < 0)
        x = 0;
      else if (x >= NOMINAL_WIDTH)
        x = NOMINAL_WIDTH - 1;

      if (y < 0)
        y = 0;
      else if (y >= NOMINAL_HEIGHT)
        y = NOMINAL_HEIGHT - 1;

      return [x, y];
    };

    this.map_coordinates = function(event_x, event_y) {

      /* We can't necessarily store this rect, since it changes if the page
       * scrolls or zooms. */
      var rect = this.canvas.getBoundingClientRect();

      /* Padding creates waste space that needs to be considered. Maybe
       * margins do too. */
      var x_waste = (rect.width - this.canvas.width) / 2;
      var y_waste = (rect.height - this.canvas.height) / 2;

      var canvas_x = (event_x - x_waste) - rect.left;
      var canvas_y = (event_y - y_waste) - rect.top;

      return [canvas_x / this.scale.xfactor,
        (this.canvas.height - canvas_y) / this.scale.yfactor];
    };

    this.describe_star = function(index) {
      var data = this.stars.get(index);

      return {
        x: data[0],
        y: data[1],
        prefix: this.prefix_lookup[data[5]],
        name: this.name_lookup[data[6]],
        color: this.color_lookup[data[3]].name,
        size: this.size_lookup[data[2]].name,
        display: {
          x: data[0] / 10,
          y: data[1] / 10,
          name: (data[5] ? (this.prefix_lookup[data[5]] + " ") : "") +
            this.name_lookup[data[6]],
          type: this.color_lookup[data[3]].name + " " +
            this.size_lookup[data[2]].name
        }
      }
    };

    /* Find the nearest start to *map* coordinates x and y (not canvas or
     * screen coordinates) and return its index.  If threshold is defined,
     * only return an answer that's at least that close in map units to
     * (x, y), and if there is none, return null.
     */
    this.find_nearest_star = function(x, y, threshold) {
      var clamped = this.clamp_map_coords(x, y);

      var index_and_distance = this.stars.find_nearest(clamped[0], clamped[1]);

      if (typeof index_and_distance == "undefined") {
        throw new Error("find_nearest_star(): stars.find_nearest() didn't " +
            "return anything! Shouldn't happen.");
      }

      if (typeof threshold == "undefined") {
        return index_and_distance[0];
      } else {
        if (index_and_distance[1] <= threshold) {
          return index_and_distance[0];
        } else {
          return null;
        }
      }
    };

    this.blank = function() {
      this.star_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };

    this.blank_all = function() {
      this.grid.blank();
      this.blank();

      this.overlay.getContext("2d").clearRect(  // XXX move into overlay object
          0, 0, this.overlay.width, this.overlay.height);
    };

    this._init.apply(this, arguments);
  }

  return {StarMap: StarMap};
});
