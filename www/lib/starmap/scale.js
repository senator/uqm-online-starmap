define(["starmap/constants"], function(constants) {

  function Scale() {
    this._init = function(canvas_width, canvas_height) {
      this.xfactor = canvas_width / constants.NOMINAL_WIDTH;
      this.yfactor = canvas_height / constants.NOMINAL_HEIGHT;
      this.star_size_factor = ((this.xfactor + this.yfactor) / 2) *
        constants.NOMINAL_DWARF_SIZE;
    };

    this._init.apply(this, arguments);
  }

  /* exports */
  return {
    Scale: Scale
  };

});

