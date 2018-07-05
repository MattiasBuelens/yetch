test: node_modules/ lint build

lint: node_modules/
	./node_modules/.bin/jshint src/**/*.js test/*.js

node_modules/:
	npm install

build:
	npm run build

clean:
	rm -rf ./bower_components ./node_modules

.PHONY: clean lint test
