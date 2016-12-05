const gulp = require('gulp');

const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sourcemaps = require('gulp-sourcemaps');

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
		.pipe(gulp.dest('./dist'));
}

gulp.task(js);

gulp.task('default', js);

if (process.argv.indexOf('--watch') !== -1) {
	gulp.watch('./src/**/*.js', js);
}