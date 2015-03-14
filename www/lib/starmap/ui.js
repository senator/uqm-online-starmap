define(["knockout", "starmap/constants"], function(ko, constants) {
 
  var GRID_X_STEP = constants.NOMINAL_WIDTH / 20;
  var GRID_Y_STEP = constants.NOMINAL_HEIGHT / 20;
  var GRID_STROKE_STYLE = "#003399";

  function Grid() { this._init.apply(this, arguments); }
  Grid.prototype = {

    _init: function _init(underlay) {
      this.underlay = underlay;
    },

    draw_grid: function draw_grid(scale, offset) {
      if (!scale || !offset) {
        throw new Error("This method requires a " +
            "starmap.transform.Scale object and a " +
            "starmap.transform.Offset object");
      }

      this.grid_ctx = this.underlay.getContext("2d");
      this.grid_ctx.strokeStyle = GRID_STROKE_STYLE;

      /* vertical lines, left to right */
      for (var x = (offset.left % GRID_X_STEP) || GRID_X_STEP;
          x < constants.NOMINAL_WIDTH;
          x += GRID_X_STEP) {
        var startx = Math.round(x * scale.xfactor);
        this.grid_ctx.beginPath();
        this.grid_ctx.moveTo(startx, 0);
        this.grid_ctx.lineTo(startx, this.underlay.height);
        this.grid_ctx.stroke();
      }

      /* horizontal lines, top to bottom */
      for (var y = (offset.bottom % GRID_Y_STEP) || GRID_Y_STEP;
          y < constants.NOMINAL_HEIGHT;
          y += GRID_Y_STEP) {
        var starty = Math.round(y * scale.yfactor);
        this.grid_ctx.beginPath();
        this.grid_ctx.moveTo(0, starty);
        this.grid_ctx.lineTo(this.underlay.width, starty);
        this.grid_ctx.closePath();
        this.grid_ctx.stroke();
      }
    },

    blank: function blank() {
      this.underlay.getContext("2d").clearRect(
          0, 0, this.underlay.width, this.underlay.height);
    }
  };


  var OVERLAY_STROKE_STYLE = "#ff00ff";

  function Overlay() { this._init.apply(this, arguments); }
  Overlay.prototype = {

    _init: function(overlay, hit_test, on_click) {
      this.overlay = overlay;
      this.hit_test = hit_test;

      this.reset();

      this.overlay.addEventListener("mousemove", this.on_mousemove.bind(this));
      
      /* XXX FIXME depends on mousemove to aim us first (disregards click
       * position) and therefore is probably useless on mobile */
      this.overlay.addEventListener("click", on_click);
    },

    on_mousemove: function on_mousemove(evt) {
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
    },

    highlight: function highlight(canvas_x, canvas_y) {
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
      this.overlay_ctx.arc(canvas_x, canvas_y, radius, 0,
          constants.CIRCLE_RADIAN);
      this.overlay_ctx.stroke();
    },

    blank: function blank() {
      this.overlay_ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    },

    reset: function reset() {
      this.overlay_ctx = overlay.getContext("2d");
      this.overlay_ctx.strokeStyle = OVERLAY_STROKE_STYLE;
      this.blank();
    }
  };


  /* These constants should agree with the CSS, and are expressed as ratio
   * where the denomiator is screen width or height, according to the
   * variable name. */
  var LANDSCAPE_MENU = 0.08;
  var LANDSCAPE_MIN_READOUT = 0.2;
  var LANDSCAPE_MIN_CANVAS = 1 - LANDSCAPE_MIN_READOUT - LANDSCAPE_MENU;

  function ViewPort() { this._init.apply(this, arguments); }
  ViewPort.prototype = {
    _init: function _init(ref_dom_obj) {
      this.ref_dom_obj = ref_dom_obj;
    },

    calculate: function calculate(ref_dom_obj) {
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
    }
  };


  function ReadOutViewModel() {
    this.clear = ko.observable(true);
    this.star_name = ko.observable();
    this.star_color_rgb = ko.observable();
    this.star_bullet = ko.observable();
    this.star_type = ko.observable();
    this.star_x = ko.observable();
    this.star_y = ko.observable();
    this.star_index = ko.observable();
  }

  function ReadOut() { this._init.apply(this, arguments); }
  ReadOut.prototype = {
    _init: function _init(/* DOM element */ div) {
      this.view_model = new ReadOutViewModel();
      ko.applyBindings(this.view_model, div);
    },

    clear: function clear() {
      this.view_model.clear(true);
    },

    display: function display(disp) {
      this.view_model.clear(false);
      this.view_model.star_name(disp.name);
      this.view_model.star_color_rgb(disp.color_rgb);
      this.view_model.star_bullet(disp.bullet);
      this.view_model.star_type(disp.type);
      this.view_model.star_x(disp.x);
      this.view_model.star_y(disp.y);
      this.view_model.star_index(disp.index);
    }
  };


  function world_model_mapper(w) {
    return {
      name: w.name,
      type: w.type,
      mineral_wealth: w.minerals.reduce(
        function(a,b) { return a + (b.valuePer * b.count); }, 0),
      bio_data: w.bio_data,
      moons: w.moons ? w.moons.map(world_model_mapper) : []
    };
  }

  function PopupViewModel() {
    this.show_system = ko.observable(false);
    this.show_world = ko.observable(false);
    this.pop = ko.computed(
      function() { return this.show_system() || this.show_world(); }, this
    );
    this.star_name = ko.observable();
    this.worlds = ko.observableArray();
  }

  function Popup() { this._init.apply(this, arguments); }
  Popup.prototype = {
    _init: function(popup) {
      this.view_model = new PopupViewModel();
      ko.applyBindings(this.view_model, popup);
    },
    
    display_system: function(system, worlds) {
      this.view_model.star_name(system.display.name);
      this.view_model.worlds(worlds.map(world_model_mapper));
      this.view_model.show_system(true);
    }
  };


  /* exports */
  return {
    Grid: Grid,
    Overlay: Overlay,
    ViewPort: ViewPort,
    ReadOut: ReadOut,
    Popup: Popup
  };

});
