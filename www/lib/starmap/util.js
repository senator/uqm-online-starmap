define(["starmap/constants"], function(constants) {

  /* Static methods used widely */

  return {
    star_coords_to_canvas: function star_coords_to_canvas(x, y, scale) {
      return [Math.round(x * scale.xfactor),
          Math.round((constants.NOMINAL_HEIGHT - y) * scale.yfactor)];
    }
  }
});
