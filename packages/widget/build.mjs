import * as esbuild from 'esbuild'
import { argv } from 'process'

const watch = argv.includes('--watch')

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/halite-widget.js',
  format: 'iife',
  globalName: 'HaliteWidget',
  target: ['es2017', 'chrome80', 'firefox75', 'safari13'],
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  banner: {
    js: '/* Halite Intelligence Widget v0.1.0 | https://haliteintelligence.com */',
  },
})

if (watch) {
  await ctx.watch()
  console.log('Watching for changes...')
} else {
  await ctx.rebuild()
  await ctx.dispose()
  console.log('Build complete → dist/halite-widget.js')
}
