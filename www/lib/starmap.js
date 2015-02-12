define(["jquery", "starmap/constants", "starmap/util", "starmap/ui",
  "starmap/datamgr", "starmap/scale"],
  function($, constants, util, ui, datamgr, scale) {

  function StarMap() {

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

    this._init = function _init(opts) {
      if (typeof opts != "object")
        throw new Error("opts must be of type object");

      opts.rootElement = opts.rootElement || opts.viewPortElement;

      this.viewport = new ui.ViewPort(opts.viewPortElement);
      this.elements = find_required_elements($(opts.rootElement));

      /* The StarMap object manipuates the [middle] canvas element directly,
       * while letting other objects manage the other elements, so
       * keeping direct references to that canvas and its context saves
       * typing and lookups. */
      this.canvas = this.elements.canvas;
      this.star_ctx = this.canvas.getContext("2d");

      this.grid = new ui.Grid(this.elements.underlay);

      this.overlay = new ui.Overlay(this.elements.overlay,
          this.canvas_hit_test.bind(this));
    
      this.prepare_game_data(opts.data);

      this.on_resize(); /* Once now, and... */
      $(window).off("resize").resize(this.on_resize.bind(this));
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

        /* XXX get readout manager. Pump data to div where star info is
         * displayed to user. */
        var d = star.display;
        $(this.elements.readout).html("<div class='star_name'>" + d.name +
            "</div><div><span style='font-weight: bold; color: " +
            star.color_rgb + "'>" +
            d.bullet + " " + d.type + "</span> at " +
            d.x + " x " + d.y + "</div>");

        /* Return canvas coordinates of star so the overlay object can
         * draw a crosshair. */
        return util.star_coords_to_canvas(star.x, star.y, this.scale);
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
      this.scale = new scale.Scale(this.canvas.width, this.canvas.height);
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

    this.prepare_game_data = function(game_data) {
        this.stars = new datamgr.StarData(game_data.stars);
        this.size_lookup = game_data.sizes;
        this.color_lookup = game_data.colors;
        this.prefix_lookup = game_data.prefixes;
        this.name_lookup = game_data.names;
    };

    this.draw_all = function() {
      var len = this.stars.length();

      for (var i = 0; i < len; i++) {
        var params = this.stars.drawing_parameters(i, this.scale,
            this.size_lookup, this.color_lookup);

        this.star_ctx.beginPath();
        this.star_ctx.arc(params.x, params.y, params.radius, 0,
            constants.CIRCLE_RADIAN);
        this.star_ctx.closePath();
        this.star_ctx.fillStyle = params.color_rgb;
        this.star_ctx.fill();
      }
    };

    /* map coords must be within 0..constants.NOMINAL_WIDTH,
     * 0..constants.NOMINAL_HEIGHT */
    this.clamp_map_coords = function(x, y) {
      if (x < 0)
        x = 0;
      else if (x >= constants.NOMINAL_WIDTH)
        x = constants.NOMINAL_WIDTH - 1;

      if (y < 0)
        y = 0;
      else if (y >= constants.NOMINAL_HEIGHT)
        y = constants.NOMINAL_HEIGHT - 1;

      return [x, y];
    };

    this.map_coordinates = function map_coordinates(event_x, event_y) {
      var canvas_x = event_x - this.canvas_left;
      var canvas_y = event_y - this.canvas_top;

      return [canvas_x / this.scale.xfactor,
        constants.NOMINAL_HEIGHT - (canvas_y / this.scale.yfactor)];
    };

    this.describe_star = function describe_star(index) {
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

  /* exports */
  return {
    StarMap: StarMap
  };
});
