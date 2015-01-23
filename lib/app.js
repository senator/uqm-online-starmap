requirejs.config({
    "baseUrl": "lib",
    "paths": {
      "jquery": "//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min"
    }
});

requirejs(["starmap"]);
