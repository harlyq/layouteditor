var gutil = require('gulp-util');
var gulp = require('gulp');
var tsc = require('gulp-typescript-compiler');
var uglify = require('gulp-uglify');
var less = require('gulp-less');
var concat = require('gulp-concat');
var run = require('gulp-run');
//var tap = require('gulp-tap');

gulp.task('less', function() {
    return gulp
        .src('src/*.less')
        .pipe(less())
        .pipe(gulp.dest('dist'));
});

gulp.task('typescript', function() {
    run('tsc.cmd --out dist/layouteditor.js src/layouteditor.ts').exec().on('error', gutil.log);

    // This should work, but actually generates a non --out file in layouteditor.js
    // return gulp
    //     .src('src/layouteditor.ts')
    //     .pipe(tsc({
    //         out: 'blah.js'
    //     }))
    //     .pipe(gulp.dest('dist'));
});

gulp.task('typescript_final', function() {
    return gulp
        .src('src/*.ts')
        .pipe(concat('layout.ts'))
        .pipe(tsc({
            module: '',
            sourcemap: false,
            logErrors: true
        }))
        .pipe(uglify({
            preserveComments: 'some'
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('html', function() {
    return gulp
        .src('src/*.html')
        .pipe(gulp.dest('dist'));
});

gulp.task('image', function() {
    return gulp
        .src('src/*.jpg')
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
    gulp.watch('src/*.ts', ['typescript']);
    gulp.watch('src/*.less', ['less']);
    gulp.watch('src/*.jpg', ['image']);
    gulp.watch('src/*.html', ['html']);
});

gulp.task('default', ['typescript', 'less', 'html', 'image', 'watch']);

gulp.task('final', ['typescript_final', 'html', 'image', 'less']);
