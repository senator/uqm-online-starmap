define(["starmap/constants"], function(constants) {

  var ZOOM_LEVELS = [1, 2, 4, 8];


  function Scale() { this._init.apply(this, arguments); }
  Scale.prototype = {
    zoom_level: 1,

    _init: function _init() {
    },

    /* update base factors based on canvas dimensions */
    update: function update(canvas) {
      this.base_xfactor = canvas.width / constants.NOMINAL_WIDTH;
      this.base_yfactor = canvas.height / constants.NOMINAL_HEIGHT;
      this.base_star_size_factor =
        ((this.base_xfactor + this.base_yfactor) / 2) *
        constants.NOMINAL_DWARF_SIZE;

      this.consider_zoom_level();
    },

    zoom: function zoom(level) {
      if (ZOOM_LEVELS.indexOf(level) == -1)
        throw new Error("Zoom level " + level + " not supported");

      this.zoom_level = level;
      this.consider_zoom_level();
    },

    consider_zoom_level: function consider_zoom_level() {
      var zl = this.zoom_level;

      this.xfactor = this.base_xfactor * zl;
      this.yfactor = this.base_yfactor * zl;

      /* [Formerly]
       * this.star_size_factor = this.base_star_size_factor * zl;
       *
       * XXX It is not necessarily desirable to have the size of star dots
       * scale up as the user zooms in.  Perhaps the in-game starmap avoids
       * it for a reason.  Even all the way zoomed in, Vela would always be
       * occluded by Zeeman if the dots scale up in size.  So let's not. */
      this.star_size_factor = this.base_star_size_factor;
    }
  };


  /* Units are map units (on the 10k scale).  XXX TODO figure out
   * what methods are more helpful here for the object's users than
   * just direct access to {left, bottom}.
   */
  function Offset() { this._init.apply(this, arguments); }
  Offset.prototype = {
    left: 0,
    bottom: 0,

    _init: function _init() {
    }
  };


  /* exports */
  return {
    Scale: Scale,
    Offset: Offset,
    ZOOM_LEVELS: ZOOM_LEVELS
  };

});

