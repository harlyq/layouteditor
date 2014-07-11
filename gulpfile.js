var gutil = require('gulp-util');
var gulp = require('gulp');
var tsc = require('gulp-typescript-compiler');
var uglify = require('gulp-uglify');
var less = require('gulp-less');

gulp.task('less', function() {
    return gulp
        .src('src/*.less')
        .pipe(less())
        .pipe(gulp.dest('dist'));
});

gulp.task('typescript', function() {
    return gulp
        .src('src/*.ts')
        .pipe(tsc({
            module: '',
            sourcemap: false,
            logErrors: true
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('typescript_final', function() {
    return gulp
        .src('src/*.ts')
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
