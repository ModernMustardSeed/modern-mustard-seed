import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * Next 16 removed `next lint`, so `pnpm lint` had been pointing at a command
 * that no longer existed and the preflight gate's lint step was silently dead.
 * This is the ESLint CLI replacement the Next 16 docs prescribe.
 *
 * ESLint is pinned to 9 on purpose: eslint-config-next declares `eslint >=9`,
 * but the eslint-plugin-react it pulls in supports only up to ^9.7 and throws
 * "contextOrFilename.getFilename is not a function" on ESLint 10.
 *
 * Flat config resolves plugin names per config object, so a bare
 * `rules: { 'react-hooks/...': 'warn' }` sitting beside the spread fails with
 * "could not find plugin react-hooks". The plugin instances are therefore
 * lifted off the Next config itself and re-registered here. Reusing the same
 * objects rather than importing the plugins separately keeps this working under
 * pnpm's non-hoisted node_modules, where those packages are not resolvable from
 * the repo root.
 */
const pluginsOf = (config, key) => config.find((c) => c.plugins?.[key])?.plugins ?? {};
const nextPlugins = pluginsOf(nextVitals, 'react-hooks');
const tsPlugins = pluginsOf(nextTs, '@typescript-eslint');

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    plugins: {
      'react-hooks': nextPlugins['react-hooks'],
      react: nextPlugins.react,
      '@typescript-eslint': tsPlugins['@typescript-eslint'],
    },
    rules: {
      // BACKLOG, NOT A PARDON. The React Compiler rule family in
      // eslint-plugin-react-hooks 6 lands 172 errors on code written before
      // these rules existed, 134 of them the ordinary
      // `useEffect(() => { load() }, [load])` fetch-on-mount pattern. Clearing
      // them means rearchitecting data fetching across the admin, which is its
      // own piece of work with its own testing. They stay visible as warnings
      // so the count gets driven down deliberately instead of hidden.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',

      // Off for good. This is a copy-heavy marketing site and the rule fires on
      // every apostrophe in ordinary prose. React escapes these correctly; the
      // rule predates that and only ever produced noise here.
      'react/no-unescaped-entities': 'off',

      // `any` is used deliberately at third-party boundaries where the vendor
      // ships no types. Visible, not fatal.
      '@typescript-eslint/no-explicit-any': 'warn',

      // An argument prefixed with _ is the documented way to keep a signature.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // A .cjs file is CommonJS by definition. require() is correct there.
    files: ['**/*.cjs'],
    plugins: { '@typescript-eslint': tsPlugins['@typescript-eslint'] },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  globalIgnores([
    // Default ignores of eslint-config-next.
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generated, vendored, or not ours to lint.
    'node_modules/**',
    '.vercel/**',
    'public/**',
    'supabase/migrations/**',
  ]),
]);
