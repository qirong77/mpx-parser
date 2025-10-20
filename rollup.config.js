import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/parser/mpxTemplateParser/addRef.ts',
  output: [
    {
      file: 'dist/addRef.min.js',
      format: 'es',
      sourcemap: true,
    //   plugins: [terser()]
    }
  ],
  plugins: [
    resolve({
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.build.json',
      declaration: true,
      declarationDir: 'dist/types',
      exclude: ['**/*.test.ts', '**/*.spec.ts']
    })
  ],
  external: []
};