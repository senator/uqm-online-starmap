requirejs.config({
    "baseUrl": "lib",
    "paths": {
      "jquery": "../thirdparty/jquery.min"
    }
});

requirejs(["starmap"]);
