requirejs.config({
    "baseUrl": "lib",
    "paths": {
      "jquery": "../thirdparty/jquery.min",
      "knockout": "../thirdparty/knockout-3.3.0"
    }
});

requirejs(["starmap"]);
