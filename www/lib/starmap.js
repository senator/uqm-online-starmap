define(["jquery", "knockout", "starmap/constants", "starmap/util",
  "starmap/ui", "starmap/datamgr", "starmap/transform"],
  function($, ko, constants, util, ui, datamgr, transform) {

  window.ko = ko; // XXX temporary
  window.$ = $; // XXX temporary

  var CANVAS_NAMES = ["underlay", "canvas", "overlay"];
  var OTHER_ELEMENT_NAMES = ["menu", "readout"];
  var HIT_THRESHOLD_MAP_UNITS = 100;

  function _find_required_elements(root) {
    var elements = {};

    CANVAS_NAMES.concat(OTHER_ELEMENT_NAMES).forEach(
      function(id) { elements[id] = root.find("#" + id).get(0); }
    );

    return elements;
  }


  function StarMap() { this._init.apply(this, arguments); }
  StarMap.prototype = {

    _init: function _init(opts) {
      if (typeof opts != "object")
        throw new Error("opts must be of type object");

      opts.rootElement = opts.rootElement || opts.viewPortElement;

      this.viewport = new ui.ViewPort(opts.viewPortElement);
      this.elements = _find_required_elements($(opts.rootElement));

      /* The StarMap object manipuates the [middle] canvas element directly,
       * while letting other objects manage the other elements, so
       * keeping direct references to that canvas and its context saves
       * typing and lookups. */
      this.canvas = this.elements.canvas;
      this.star_ctx = this.canvas.getContext("2d");

      this.grid = new ui.Grid(this.elements.underlay);

      this.overlay = new ui.Overlay(this.elements.overlay,
          this.canvas_hit_test.bind(this));

      this.readout = new ui.ReadOut(this.elements.readout);

      this.prepare_game_data(opts.data);

      this.scale = new transform.Scale();
      this.offset = new transform.Offset();

      this.on_resize(); /* Once now, and... */
      $(window).off("resize").resize(this.on_resize.bind(this)); /* on resize */
    },

    canvas_hit_test: function canvas_hit_test(event_x, event_y) {
      var coords = this.map_coordinates(event_x, event_y);
      var star_index = this.find_nearest_star(coords[0], coords[1],
          HIT_THRESHOLD_MAP_UNITS / this.scale.zoom_level);

      if (star_index != null) { // Important: can be zero
        if (star_index == this.last_hit)
          return -1;

        this.last_hit = star_index;

        var star = this.describe_star(star_index);
        this.readout.display(star.display);

        /* Return canvas coordinates of star so the overlay object can
         * draw a crosshair. */
        return util.star_coords_to_canvas(star.x, star.y,
            this.scale, this.offset);

      } else {
        this.last_hit = null;
        this.readout.clear();

        return null;
      }
    },

    on_resize: function on_resize() {
      this.size_elements_to_viewport(this.viewport.calculate());
      this.set_canvas_position();
      this.scale.update(this.canvas);

      this.draw_all();
    },

    draw_all: function draw_all(skip_blank_all) {
      if (!skip_blank_all)
        this.blank_all();

      this.grid.draw_grid(this.scale, this.offset);
      this.draw_stars();
      this.overlay.reset();
    },

    size_elements_to_viewport: function size_elements_to_viewport(dims) {
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
    },

    /* The values we care about from this.canvas.getBoundingClientRect()
     * should only change on window resize, and we can run this method on
     * such an event, but we need to consult the values much more often,
     * so it (hopefully) constitutes an optimization that we save the
     * needed values here instead of calling .getBoundingClientRect()
     * all the time.  */
    set_canvas_position: function set_canvas_position() {
      var rect = this.canvas.getBoundingClientRect();

      this.canvas_left = rect.left;
      this.canvas_top = rect.top;
    },

    prepare_game_data: function prepare_game_data(game_data) {
      this.stars = new datamgr.StarData(game_data.stars);
      this.worlds = new datamgr.WorldData(game_data.worlds,
          game_data.world_types, game_data.world_names, game_data.romans);

      this.size_lookup = game_data.sizes;
      this.color_lookup = game_data.colors;
      this.prefix_lookup = game_data.prefixes;
      this.name_lookup = game_data.names;
    },

    draw_stars: function draw_stars() {
      var len = this.stars.length();

      for (var i = 0; i < len; i++) {
        var params = this.stars.drawing_parameters(i, this.scale, this.offset,
            this.size_lookup, this.color_lookup);

        this.star_ctx.beginPath();
        this.star_ctx.arc(params.x, params.y, params.radius, 0,
            constants.CIRCLE_RADIAN);
        this.star_ctx.closePath();
        this.star_ctx.fillStyle = params.color_rgb;
        this.star_ctx.fill();
      }
    },

    /* map coords must be within 0..constants.NOMINAL_WIDTH,
     * 0..constants.NOMINAL_HEIGHT */
    clamp_map_coords: function clamp_map_coords(x, y) {
      if (x < 0)
        x = 0;
      else if (x >= constants.NOMINAL_WIDTH)
        x = constants.NOMINAL_WIDTH - 1;

      if (y < 0)
        y = 0;
      else if (y >= constants.NOMINAL_HEIGHT)
        y = constants.NOMINAL_HEIGHT - 1;

      return [x, y];
    },

    map_coordinates: function map_coordinates(event_x, event_y) {
      var canvas_x = event_x - this.canvas_left;
      var canvas_y = event_y - this.canvas_top;

      return [canvas_x / this.scale.xfactor + this.offset.left,
        (constants.NOMINAL_HEIGHT / this.scale.zoom_level) -
          (canvas_y / this.scale.yfactor) + this.offset.bottom];
    },

    describe_star: function describe_star(index) {
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
          color_rgb: this.color_lookup[data[3]].rgb,
          name: (data[5] ? (this.prefix_lookup[data[5]] + " ") : "") +
            this.name_lookup[data[6]],
          type: this.color_lookup[data[3]].name + " " +
            this.size_lookup[data[2]].name,
          bullet: String.fromCharCode(this.size_lookup[data[2]].bullet),
          index: index
        }
      };
    },

    /* Find the nearest start to *map* coordinates x and y (not canvas or
     * screen coordinates) and return its index.  If threshold is defined,
     * only return an answer that's at least that close in map units to
     * (x, y), and if there is none, return null.
     */
    find_nearest_star: function(x, y, threshold) {
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
    },

    blank: function blank() {
      this.star_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    blank_all: function blank_all() {
      this.grid.blank();
      this.blank();
      this.overlay.blank();
    },

    /* XXX Think more about this API (move_x, move_y, zoom).  Not only
     * is it (obviously) only suited to simple stepwise panning and zooming,
     * but it doesn't give us anything to know whether move movement in any
     * direction will be possible. */
    move_y: function move_y(direction) {
      var viewable_height = constants.NOMINAL_HEIGHT / this.scale.zoom_level;
      var step = viewable_height * direction;

      if (this.offset.bottom + step <=
            constants.NOMINAL_HEIGHT - viewable_height &&
          this.offset.bottom + step >= 0)
        this.offset.bottom += step;

      this.draw_all();
    },

    move_x: function move_x(direction) {
      var viewable_width = constants.NOMINAL_WIDTH / this.scale.zoom_level;
      var step = viewable_width * direction;

      if (this.offset.left + step <= constants.NOMINAL_WIDTH - viewable_width &&
          this.offset.left + step >= 0)
        this.offset.left += step;

      this.draw_all();
    },

    zoom: function zoom(level) {
      if (!level)
        return this.scale.zoom();

      try {
        this.scale.zoom(level);
        this.draw_all();
      } catch (e) {
        console.warn(e);
      }
    }
  };

  /* exports */
  return {
    StarMap: StarMap
  };
});
