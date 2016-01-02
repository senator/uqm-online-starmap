include config.mk

JSDEPS=www/js/thirdparty/require.js \
	   www/js/thirdparty/jquery.min.js \
	   www/js/thirdparty/knockout-3.3.0.js

all: gamedata deps

clean:
	rm -f config.mk
	rm -f www/js/gamedata/condensed.js

test:
	@echo "Tests not yet implemented"

gamedata: www/js/gamedata/condensed.js

www/js/gamedata/condensed.js:
	@echo "Building game data..."
	$(NODEJS) scripts/build-data.js

www/js/thirdparty/require.js:
	test -f $@ || wget -O $@ 'http://requirejs.org/docs/release/2.1.22/minified/require.js'

www/js/thirdparty/jquery.min.js:
	test -f $@ || wget -O $@ 'https://code.jquery.com/jquery-1.11.3.min.js'

www/js/thirdparty/knockout-3.3.0.js:
	test -f $@ || wget -O $@ 'http://knockoutjs.com/downloads/knockout-3.3.0.js'

deps: $(JSDEPS)
