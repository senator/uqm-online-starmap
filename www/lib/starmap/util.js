define(["starmap/constants"], function(constants) {

  /* Static methods used widely */

  return {
    star_coords_to_canvas: function star_coords_to_canvas(x, y, scale, offset) {
      return [
        Math.round(
          (x - offset.left) * scale.xfactor
        ),
        Math.round(
          (constants.NOMINAL_HEIGHT / scale.zoom_level - y + offset.bottom) *
            scale.yfactor
        )
      ];
    }
  }
});
