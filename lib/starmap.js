define(["jquery", "timer", "triggers_interface"],
  function($, timer, triggers_interface) {

  /* Module-wide "private" variables */

  var CIRCLE_RADIAN = 2 * Math.PI;
  var NOMINAL_WIDTH = 10000;
  var NOMINAL_HEIGHT = 10000;
  var NOMINAL_DWARF_SIZE = 10;

  /* Module-wide "private" methods */

  function star_coords_to_canvas(x, y, scale) {
    return [Math.round(x * scale.xfactor),
        Math.round((NOMINAL_HEIGHT - y) * scale.yfactor)];
  }

  /* "private" classes */

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

    // "private" methods

    /* This method trusts that x and y are within the map bounds. */
    function keys_from_coords(x, y) {
      return [Math.floor(x / X_DIVISOR), Math.floor(y / Y_DIVISOR)];
    }

    // "public" methods

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
        var keys = keys_from_coords(list[i][0], list[i][1]);
        this.buckets[keys[0]][keys[1]].push(i);
      }
    };

    /* This method would be an especially good candiate for a unit test.
     * Return as many as nine buckets, including the exact hit. */
    this.adjacent_buckets = function(x, y) {
      var exact = keys_from_coords(x, y);
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
    function distance_squared(x1, y1, x2, y2) {
      return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
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
      var point = star_coords_to_canvas(row[0], row[1], scale);

      return {
        color_rgb: color_row.rgb,
        x: point[0],
        y: point[1],
        radius: size_lookup[row[2]].factor * scale.star_size_factor + 1
      };
    };

    this.get = function(index) {
      return this.list[index];
    };

    this.find_nearest = function(x, y) {
      var self = this;

      var nearest = this.bucket_index.get_stars_near(x, y).map(
        function(idx) {
          /* return [index, dist from (x,y)] */
          return [idx,
            distance_squared(x, y, self.list[idx][0], self.list[idx][1])];
        }
      ).sort(
        function(a, b) {
          /* sort lowest distance to highest */
          return a[1] - b[1];
        }
      )[0];

      /* Note: Only now do we need the *correct* distance between our given x,y
       * and the nearest star's coordinates.  We don't need it for sorting,
       * so it's computationally cheaper to avoid Math.sqrt() until now.  */
      return [nearest[0], Math.sqrt(nearest[1])];
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

    this._init = function(underlay) {
      this.underlay = underlay;
    };

    this.draw_grid = function draw_grid(scale) {
      if (!scale)
        throw new Error("This method requires an instance of StarMapScale " +
            "as an argument");

      this.grid_ctx = this.underlay.getContext("2d");
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
      this.underlay.getContext("2d").clearRect(
          0, 0, this.underlay.width, this.underlay.height);
    };

    this._init.apply(this, arguments);
  }

  function StarMapOverlay() {
    var OVERLAY_STROKE_STYLE = "#ff00ff";

    this._init = function(overlay, hit_test) {
      this.overlay = overlay;
      this.hit_test = hit_test;

      this.reset();

      this.overlay.addEventListener("mousemove", this.on_mousemove.bind(this));
    };

    this.on_mousemove = function(evt) {
      /* this.hit_test() should return
       *  null for clear,
       *  -1 for no change, or
       *  [x,y] for new star.
       */
      var result = this.hit_test(evt.clientX, evt.clientY);

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

    this.reset = function reset() {
      this.overlay_ctx = overlay.getContext("2d");
      this.overlay_ctx.strokeStyle = OVERLAY_STROKE_STYLE;
      this.blank();
    };

    this._init.apply(this, arguments);
  }


  function StarMapViewPort() {
    /* These constants should agree with the CSS, and are expressed as ratio
     * where the denomiator is screen width or height, according to the
     * variable name. */
    var LANDSCAPE_MENU = 0.08;
    var LANDSCAPE_MIN_READOUT = 0.2;
    var LANDSCAPE_MIN_CANVAS = 1 - LANDSCAPE_MIN_READOUT - LANDSCAPE_MENU;

    this._init = function _init(ref_dom_obj) {
      this.ref_dom_obj = ref_dom_obj;
    };

    this.calculate = function calculate(ref_dom_obj) {
      if (!ref_dom_obj)
        ref_dom_obj = this.ref_dom_obj;

      var w = ref_dom_obj.clientWidth, h = ref_dom_obj.clientHeight;
      /* When the viewport is square, CSS media queries for portrait mode,
       * not landscape, seem to apply, at least in Chromium. Is that reliable?
       */
      if (w > h) {
        /* landscape */
        var pref2w = h;
        var pref3w = w - Math.ceil(LANDSCAPE_MENU * w) - h;

        if (pref3w < LANDSCAPE_MIN_READOUT * w) {
            pref3w = Math.floor(LANDSCAPE_MIN_READOUT * w);
            pref2w = Math.floor(LANDSCAPE_MIN_CANVAS * w);
        }

        return {
          dominant: "width",
          canvas: [pref2w, pref2w],
          readout: [pref3w - 1, h]
        };
      } else {
        /* portrait */
        var pref2h = w;
        var pref3h = h - Math.ceil(LANDSCAPE_MENU * h) - w;

        if (pref3h < LANDSCAPE_MIN_READOUT * h) {
            pref3h = Math.floor(LANDSCAPE_MIN_READOUT * h);
            pref2h = Math.floor(LANDSCAPE_MIN_CANVAS * h);
        }

        return {
          dominant: "height",
          canvas: [pref2h, pref2h],
          readout: [w, pref3h - 1]
        };
      }
    };

    this._init.apply(this, arguments);
  }


  /* main exported class */
  function StarMap() {

    triggers_interface.mixin(this);

    var CANVAS_NAMES = ["underlay", "canvas", "overlay"];
    var OTHER_ELEMENT_NAMES = ["menu", "readout"];

    /* "private" (and "static") methods */

    function find_required_elements(root) {
      var elements = {};

      CANVAS_NAMES.concat(OTHER_ELEMENT_NAMES).forEach(
        function(id) { elements[id] = root.find("#" + id).get(0); }
      );

      return elements;
    }

    /* "public" methods */

    this._init = function(viewport, root_el) {
      this.viewport = viewport;
      this.elements = find_required_elements(root_el);

      /* The StarMap object manipuates the [middle] canvas element directly,
       * while letting other objects manage the other elements, so
       * keeping direct references to that canvas and its context saves
       * typing and lookups. */
      this.canvas = this.elements.canvas;
      this.star_ctx = this.canvas.getContext("2d");

      this.grid = new StarMapGrid(this.elements.underlay);

      this.overlay = new StarMapOverlay(this.elements.overlay,
          this.canvas_hit_test.bind(this));
      
      /* XXX If I use Require to load the data, I can get rid of this
       * custom when/trigger stuff... */
      this.when("loaded", ["stars","sizes","colors","names","prefixes"],
          (function() {
            this.on_resize(); /* Once now, and... */
            $(window).off("resize").resize(this.on_resize.bind(this));
          }).bind(this));

      this.load_data();
    };

    this.canvas_hit_test = function canvas_hit_test(event_x, event_y) {
      var coords = this.map_coordinates(event_x, event_y);
      var star_index = this.find_nearest_star(coords[0], coords[1],
          100 /* XXX Don't hardcode. Scale with size of
                 canvas and zoom level. */);
      if (star_index != null) { // Important: can be zero
        if (star_index == this.last_hit)
          return -1;

        this.last_hit = star_index;
        var star = this.describe_star(star_index);

        /* XXX get readout manager. Pump data to div where star info is displayed to user. */
        var d = star.display;
        $(this.elements.readout).html("<div class='star_name'>" + d.name +
            "</div><div><span style='font-weight: bold; color: " +
            star.color_rgb + "'>" +
            d.bullet + " " + d.type + "</span> at " +
            d.x + " x " + d.y + "</div>");

        /* Return canvas coordinates of star so the overlay object can
         * draw a crosshair. */
        return star_coords_to_canvas(star.x, star.y, this.scale);
      } else {

        this.last_hit = null;
        $(this.elements.readout).empty(); // XXX readout manager

        return null;
      }
    };

    this.on_resize = function on_resize() {
      this.size_elements_to_viewport(this.viewport.calculate());
      this.set_canvas_position();
      this.set_map_scale();
      this.grid.draw_grid(this.scale);
      this.draw_all();
      this.overlay.reset();
    };

    this.size_elements_to_viewport = function(dims) {
      var self = this;

      CANVAS_NAMES.forEach(function(name) {
        self.elements[name].width = dims.canvas[0];
        self.elements[name].height = dims.canvas[1];
      });

      /* Kludgey: We don't otherwise "know" about the canvases' parent
       * element. */
      if (dims.dominant == "width")
        $(this.elements.canvas.parentElement).width(dims.canvas[0]);
      else
        $(this.elements.canvas.parentElement).height(dims.canvas[1]);

      $(this.elements.readout).width(dims.readout[0]);
      $(this.elements.readout).height(dims.readout[1]);
    };

    this.set_map_scale = function() {
      this.scale = new StarMapScale(this.canvas.width, this.canvas.height);
    };

    /* The values we care about from this.canvas.getBoundingClientRect()
     * should only change on window resize, and we can run this method on
     * such an event, but we need to consult the values much more often,
     * so it (hopefully) constitutes an optimization that we save the
     * needed values here instead of calling .getBoundingClientRect()
     * all the time.  */
    this.set_canvas_position = function() {
      var rect = this.canvas.getBoundingClientRect();

      this.canvas_left = rect.left;
      this.canvas_top = rect.top;
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
      var canvas_x = event_x - this.canvas_left;
      var canvas_y = event_y - this.canvas_top;

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
        color_rgb: this.color_lookup[data[3]].rgb,
        size: this.size_lookup[data[2]].name,
        display: {
          x: data[0] / 10,
          y: data[1] / 10,
          name: (data[5] ? (this.prefix_lookup[data[5]] + " ") : "") +
            this.name_lookup[data[6]],
          type: this.color_lookup[data[3]].name + " " +
            this.size_lookup[data[2]].name,
          bullet: String.fromCharCode(this.size_lookup[data[2]].bullet)
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

    this.blank = function blank() {
      this.star_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };

    this.blank_all = function blank_all() {
      this.grid.blank();
      this.blank();
      this.overlay.blank();
    };

    this._init.apply(this, arguments);
  }

  // exports
  return {StarMap: StarMap, StarMapViewPort: StarMapViewPort};
});
