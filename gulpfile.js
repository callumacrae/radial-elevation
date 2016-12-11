const gulp = require('gulp');

const nodemon = require('nodemon');
const browserSync = require('browser-sync').create();

const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sourcemaps = require('gulp-sourcemaps');

function server() {
	nodemon({
		script: './server/index.js',
		watch: './server',
		stdout: false
	})
		.on('start', () => console.log('App starting…'))
		.on('quit', () => {
			console.log('App has quit, shutting down…');
			process.exit(0);
		})
		.on('restart', () => console.log('App restarting…'))
		.on('stdout', function (data) {
			console.log(data.toString());

			var match = /Listening on port (\d+)/.exec(data.toString());
			if (match) {
				start(match[1]);
			}
		})
		.on('stderr', function (data) {
			var dataString = data.toString();
			console.error(dataString);

			if (dataString.indexOf('EADDRINUSE') !== -1) {
				process.nextTick(function () {
					process.exit(1);
				});
			}
		});

	function start(port) {
		// Only start once
		start = function () {};

		var files = [
			'static/index.html',
			'static/dist/*.js'
		];

		browserSync.init(files, {
			proxy: 'http://localhost:' + port
		});
	}
}

function js() {
	const b = browserify({
		entries: './src/script.js',
		debug: true
	});

	return b.bundle()
		.pipe(source('app.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./static/dist'));
}

gulp.task(server);
gulp.task(js);

gulp.task('default', js);

if (process.argv.indexOf('--watch') !== -1) {
	gulp.watch('./src/**/*.js', js);

	server();
}