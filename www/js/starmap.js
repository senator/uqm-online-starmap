requirejs.config({
    "baseUrl": "js",
    "paths": {
      "jquery": "./thirdparty/jquery.min",
      "knockout": "./thirdparty/knockout-3.3.0"
    }
});

requirejs(["starmap/main"]);
