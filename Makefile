include config.mk

JSDEPS=www/thirdparty/require.js \
	   www/thirdparty/jquery.min.js \
	   www/thirdparty/knockout-3.3.0.js

all: gamedata deps

clean:
	rm -f config.mk
	rm -f www/lib/gamedata/condensed.js

test:
	@echo "Tests not yet implemented"

gamedata: www/lib/gamedata/condensed.js

www/lib/gamedata/condensed.js:
	@echo "Building game data..."
	$(NODEJS) scripts/build-data.js

www/thirdparty/require.js:
	test -f $@ || wget -O $@ 'http://requirejs.org/docs/release/2.1.20/minified/require.js'

www/thirdparty/jquery.min.js:
	test -f $@ || wget -O $@ 'https://code.jquery.com/jquery-1.11.3.min.js'

www/thirdparty/knockout-3.3.0.js:
	test -f $@ || wget -O $@ 'http://knockoutjs.com/downloads/knockout-3.3.0.js'

deps: $(JSDEPS)
