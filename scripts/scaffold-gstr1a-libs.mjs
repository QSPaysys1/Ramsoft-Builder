#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'libs', 'gstr1a');

const jsLibs = [
  ...['api', 'services', 'stores', 'facades', 'guards', 'state', 'interceptors', 'resolvers'].map(
    (n) => ({ layer: 'data-access', name: n, libType: 'data-access' }),
  ),
  ...['requests', 'responses', 'entities', 'dto', 'enums', 'interfaces'].map((n) => ({
    layer: 'models',
    name: n,
    libType: 'models',
  })),
  ...[
    'amendment-calculators',
    'transformers',
    'validators',
    'constants',
    'mappers',
    'diff-utils',
    'helpers',
  ].map((n) => ({ layer: 'utils', name: n, libType: 'utils' })),
  ...['session', 'return-period', 'amendment-engine', 'caching', 'filters', 'pagination', 'error-handler'].map(
    (n) => ({ layer: 'shared', name: n, libType: 'shared' }),
  ),
];

const angularLibs = [
  ...[
    'amendment-table',
    'invoice-comparison',
    'amendment-summary-cards',
    'change-highlighter',
    'filters',
    'loaders',
    'filing-status',
    'empty-state',
    'shared',
  ].map((n) => ({ layer: 'ui', name: n, libType: 'ui' })),
  ...[
    'dashboard',
    'amendment-summary',
    'shared',
    'b2b',
    'b2cl',
    'b2cs',
    'exp',
    'cdnr',
    'cdnur',
    'at',
    'nil',
    'hsn',
    'b2ba',
    'b2cla',
    'b2csa',
    'expa',
    'cdnra',
    'cdnura',
    'ata',
    'txpa',
    'txpda',
    'atadja',
    'ecoma',
    'supecoa',
    'nil-amendments',
    'hsn-amendments',
    'docs-amendments',
    'filing',
  ].map((n) => ({ layer: 'feature', name: n, libType: 'feature' })),
];

function depth(layer) {
  return layer === 'data-access' || layer === 'models' || layer === 'utils' || layer === 'shared'
    ? 4
    : 3;
}

function writeLib({ layer, name, libType }, isAngular) {
  const libDir = path.join(root, layer, name);
  const nxName = `gstr1a-${libType}-${name}`;
  const d = depth(layer);
  const relBase = '../'.repeat(d);

  fs.mkdirSync(path.join(libDir, 'src', 'lib'), { recursive: true });

  const projectJson = {
    name: nxName,
    $schema: `${relBase}node_modules/nx/schemas/project-schema.json`,
    sourceRoot: `libs/gstr1a/${layer}/${name}/src`,
    prefix: 'lib',
    projectType: 'library',
    tags: [`type:${libType}`, 'domain:gstr1a'],
    targets: { lint: { executor: '@nx/eslint:lint' } },
  };

  fs.writeFileSync(path.join(libDir, 'project.json'), JSON.stringify(projectJson, null, 2) + '\n');

  const tsconfig = {
    extends: `${relBase}tsconfig.base.json`,
    compilerOptions: {
      target: 'es2022',
      module: 'preserve',
      noImplicitOverride: true,
      noPropertyAccessFromIndexSignature: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
    },
    files: [],
    include: [],
    references: [{ path: './tsconfig.lib.json' }],
  };
  if (isAngular) {
    tsconfig.angularCompilerOptions = {
      enableI18nLegacyMessageIdFormat: false,
      strictInjectionParameters: true,
      strictInputAccessModifiers: true,
      typeCheckHostBindings: true,
      strictTemplates: true,
    };
  }
  fs.writeFileSync(path.join(libDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n');

  const tsconfigLib = {
    extends: './tsconfig.json',
    compilerOptions: {
      outDir: `${relBase}dist/out-tsc`,
      declaration: true,
      declarationMap: true,
      inlineSources: true,
      types: [],
    },
    exclude: ['src/**/*.spec.ts', 'jest.config.ts', 'src/**/*.test.ts'],
    include: ['src/**/*.ts'],
  };
  fs.writeFileSync(path.join(libDir, 'tsconfig.lib.json'), JSON.stringify(tsconfigLib, null, 2) + '\n');

  const eslintDepth = '../'.repeat(d + 1);
  const eslint = `import nx from '@nx/eslint-plugin';
import baseConfig from '${eslintDepth}eslint.config.mjs';

export default [
  ...baseConfig,
  ${isAngular ? "...nx.configs['flat/angular'],\n  ...nx.configs['flat/angular-template'],\n  " : ''}{
    files: ['**/*.ts'],
    rules: {},
  },
];
`;
  fs.writeFileSync(path.join(libDir, 'eslint.config.mjs'), eslint);

  fs.writeFileSync(path.join(libDir, 'src', 'index.ts'), '// GSTR-1A library — exports added during implementation.\n');
}

for (const lib of jsLibs) writeLib(lib, false);
for (const lib of angularLibs) writeLib(lib, true);

console.log(`Scaffolded ${jsLibs.length + angularLibs.length} gstr1a libraries.`);
