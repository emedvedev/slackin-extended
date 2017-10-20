import gulp from 'gulp'
import babel from 'gulp-babel'
import rimraf from 'gulp-rimraf'
import sass from 'gulp-sass'

const paths = {
  in: {
    js: 'lib/*.js',
    assets: 'assets/*',
    sass: 'scss/*.scss',
  },
  out: {
    js: 'dist',
    assets: 'dist/assets',
    sass: 'dist/assets',
  },
}

gulp.task('transpile', () => {
  return gulp.src(paths.in.js)
  .pipe(babel())
  .pipe(gulp.dest(paths.out.js))
})

gulp.task('assets', () => {
  return gulp.src(paths.in.assets)
  .pipe(gulp.dest(paths.out.assets))
})

gulp.task('sass', () => {
  return gulp.src(paths.in.sass)
  .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
  .pipe(gulp.dest(paths.out.assets))
})

gulp.task('clean', () => {
  return gulp.src(paths.out.js, {
    read: false,
  })
  .pipe(rimraf())
})

gulp.task('default', ['transpile', 'assets', 'sass'])
