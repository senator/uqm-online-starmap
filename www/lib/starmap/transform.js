define(["starmap/constants"], function(constants) {

  var ZOOM_LEVELS = [1, 2, 4, 8];


  function Scale() { this._init.apply(this, arguments); }
  Scale.prototype = {
    zoom_level: 1,

    _init: function _init() {
    },

    /* Update factors based on canvas dimensions */
    update: function update(canvas) {
      /* These aren't to be used directly; see the xfactor and yfactor
       * properties which consider zoom level. */
      this.base_xfactor = canvas.width / constants.NOMINAL_WIDTH;
      this.base_yfactor = canvas.height / constants.NOMINAL_HEIGHT;

      /* This is used directly (unaffected by zoom). */
      this.star_size_factor = ((this.base_xfactor + this.base_yfactor) / 2) *
        constants.NOMINAL_DWARF_SIZE;

      this.consider_zoom_level();
    },

    zoom: function zoom(level) {
      if (!level)
        return this.zoom_level;

      if (ZOOM_LEVELS.indexOf(level) == -1)
        throw new Error("Zoom level " + level + " not supported");

      this.zoom_level = level;
      this.consider_zoom_level();
    },

    consider_zoom_level: function consider_zoom_level() {
      this.xfactor = this.base_xfactor * this.zoom_level;
      this.yfactor = this.base_yfactor * this.zoom_level;
    }
  };


  /* Units are map units (on the 10k scale).  */
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

