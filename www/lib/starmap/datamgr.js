define(["starmap/constants", "starmap/util"], function(constants, util) {

  /* Module-wide constants and helpers: */
  var X_BUCKETS = 10;
  var Y_BUCKETS = 10;

  var X_DIVISOR = constants.NOMINAL_WIDTH / X_BUCKETS;
  var Y_DIVISOR = constants.NOMINAL_HEIGHT / Y_BUCKETS;


  /* This method trusts that x and y are within the map bounds. */
  function keys_from_coords(x, y) {
    return [Math.floor(x / X_DIVISOR), Math.floor(y / Y_DIVISOR)];
  }

  function distance_squared(x1, y1, x2, y2) {
    return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  }


  /* Sort the stars into 100 buckets covering the map in a 10x10 grid.
   * This may be helpful in optimizing lookups based on mouse hovering
   * and tapping the map, or it may be premature optimization.  The cost
   * of building the index is low (~ 1ms) with the V8 Javascript engine
   * on an average PC.  Unclear as to performance on mobile devices or IE,
   * but even at 100 ms, no biggie.
   */
  function BucketIndex() { this._init.apply(this, arguments); }
  BucketIndex.prototype = {
    _init: function _init(list) {
      this.create_empty_buckets();
      this.bucketize(list);
    },

    create_empty_buckets: function create_empty_buckets() {
      this.buckets = [];

      for (var x = 0; x < X_BUCKETS; x++) {
        this.buckets.push([]);
        for (var y = 0; y < Y_BUCKETS; y++) {
          this.buckets[x].push([]);
        }
      }
    },

    bucketize: function bucketize(list) {
      for (var i = 0; i < list.length; i++) {
        var keys = keys_from_coords(list[i][0], list[i][1]);
        this.buckets[keys[0]][keys[1]].push(i);
      }
    },

    /* This method would be an especially good candiate for a unit test.
     * Return as many as nine buckets, including the exact hit. */
    adjacent_buckets: function adjacent_buckets(x, y) {
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
    },

    /* Given (x, y) return all stars in immediate and adjancent buckets. */
    get_stars_near: function get_stars_near(x, y) {
      var self = this;

      return this.adjacent_buckets(x, y).reduce(
        function(a, b) { return a.concat(self.buckets[b[0]][b[1]]); }, []
      );
    }
  };


  function StarData() { this._init.apply(this, arguments); }
  StarData.prototype = {
    _init: function _init(star_data_list) {

      this.list = star_data_list;

      // x 0
      // y 1
      // size_index 2
      // color_index 3
      // generator 4
      // prefix_index 5
      // name_index 6

      this.bucket_index = new BucketIndex(this.list);
    },

    /* XXX TODO since this method relies so heavily on properties of
     * the StarMap object, maybe that's where it ought to be moved? */
    drawing_parameters: function drawing_parameters(index,scale,offset,size_lookup,color_lookup) {
      var row = this.list[index];
      var color_row = color_lookup[row[3]];
      var point = util.star_coords_to_canvas(row[0], row[1], scale, offset);

      return {
        color_rgb: color_row.rgb,
        x: point[0],
        y: point[1],
        radius: size_lookup[row[2]].factor * scale.star_size_factor + 1
      };
    },

    get: function get(index) {
      return this.list[index];
    },

    find_nearest: function find_nearest(x, y) {
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
    },

    length: function length() {
      return this.list.length;
    }
  };


  /* Constants for the WorldData class */
  var MOON_INDEX = 15;

  function WorldData() { this._init.apply(this, arguments); }
  WorldData.prototype = {
    _init: function _init(worlds, world_types, world_names, romans,
               mineral_types) {
      this.world_lookup = worlds;
      this.world_type_lookup = world_types;
      this.world_name_lookup = world_names;
      this.roman_lookup = romans;
      this.mineral_type_lookup = mineral_types;
    },

    get_world_name: function get_world_name(nkey, tkey, wkey, mkey) {
      if (tkey == 38 || tkey == 42) { /* StarBases and Sa-Matra */
        return this.world_type_lookup[tkey];
      } else if (nkey) {
        return this.world_name_lookup[nkey];
      } else {
        var world_name = "Planet " + this.roman_lookup[wkey];
        if (typeof mkey != "undefined")
          world_name += String.fromCharCode(97 + mkey);

        return world_name;
      }
    },

    describe: function describe(star_key, world_key, moon_key) {
      var world = this.world_lookup[star_key][world_key];

      if (typeof moon_key != "undefined")
        world = world[MOON_INDEX][moon_key];

      var minerals = world.slice(7, 15).map(
        (function(mineral, idx) {
          return {
            name: this.mineral_type_lookup[idx][1],
            valuePer: this.mineral_type_lookup[idx][0],
            count: mineral
          };
        }).bind(this)
      );

      var result = {
        name: this.get_world_name(world[0], world[1], world_key, moon_key),
        type: this.world_type_lookup[world[1]],
        tectonics: world[2],
        weather: world[3],
        temperature: world[4],
        gravity: world[5],
        bio_data: null, // XXX fix data
        bio_danger: world[6],
        minerals: minerals,
        mineral_wealth: minerals.reduce(
          function(a,b) { return a + (b.valuePer * b.count); }, 0)
      };

      /* Moons can't have their own moons in our universe. */
      if (typeof moon_key == "undefined") {
        if (world[MOON_INDEX]) {
          var i = 0;
          result.moons = world[MOON_INDEX].map(
            (function() {
              return this.describe(star_key, world_key, i++);
            }).bind(this)
          );
        } else {
          result.moons = [];
        }
      }

      return result;
    },

    describe_for_star: function describe_for_star(star_key) {
      var i = 0;
      return this.world_lookup[star_key].map(
        (function() {
          return this.describe(star_key, i++);
        }).bind(this)
      );
    }
  };


  /* exports */
  return {
    StarData: StarData,
    WorldData: WorldData
  };

});
