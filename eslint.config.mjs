import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'domain:gstr2a',
              onlyDependOnLibsWithTags: [
                'domain:gstr2a',
                'domain:gstr1',
                'domain:auth',
                'domain:e-invoices',
              ],
            },
            {
              sourceTag: 'domain:gstr2b',
              onlyDependOnLibsWithTags: [
                'domain:gstr2b',
                'domain:gstr1',
                'domain:auth',
                'domain:e-invoices',
              ],
            },
            {
              sourceTag: 'domain:gstr3b',
              onlyDependOnLibsWithTags: [
                'domain:gstr3b',
                'domain:gstr1',
                'domain:auth',
                'domain:e-invoices',
              ],
            },
            {
              sourceTag: 'domain:gstr1',
              onlyDependOnLibsWithTags: ['*'],
            },
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
