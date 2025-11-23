/**
 * @fileoverview Production build script
 * @description Bundles the application for production deployment
 */

const result = await Bun.build({
  entrypoints: ['./src/index.js'],
  outdir: './dist',
  target: 'bun', // O 'node' si necesitas compatibilidad con Node.js
  minify: {
    whitespace: true,
    identifiers: false, // No minificar nombres de variables para mejor debugging
    syntax: true
  },
  sourcemap: 'external', // Sourcemaps para debugging en producción
  splitting: false, // No dividir en chunks (mejor para servers monolíticos)
});

if (result.success) {
  console.log('✅ Build exitoso para producción');
  console.log(`📦 Archivos generados en ./dist/`);
  console.log(`📊 Tamaño total: ${(result.outputs.reduce((acc, o) => acc + o.size, 0) / 1024).toFixed(2)} KB`);
} else {
  console.error('❌ Error en el build:');
  console.error(result.logs);
  process.exit(1);
}
