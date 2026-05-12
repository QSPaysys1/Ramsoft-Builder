#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WORKSPACE_SCOPE = '@ramsoft-builder';

function deleteDefaultComponent(domain, type, name) {
  const componentName = `${domain}-${type}-${name}`;
  const componentDir = path.join(
    process.cwd(),
    'libs',
    domain,
    type,
    name,
    'src',
    'lib',
    componentName,
  );

  if (fs.existsSync(componentDir)) {
    console.log(`🗑️  Deleting default component: ${componentName}`);
    fs.rmSync(componentDir, { recursive: true, force: true });
    console.log(`   ✓ Deleted directory ${componentName}/`);
  }
}

function cleanupIndexExport(domain, type, name) {
  const indexPath = path.join(
    process.cwd(),
    'libs',
    domain,
    type,
    name,
    'src',
    'index.ts',
  );

  if (fs.existsSync(indexPath)) {
    const componentName = `${domain}-${type}-${name}`;
    const content = fs.readFileSync(indexPath, 'utf-8');
    const cleanedContent = content
      .split('\n')
      .filter(
        (line) =>
          !line.includes(`${componentName}/${componentName}`) &&
          !/export \* from '\.\/lib\/.*';/.test(line),
      )
      .join('\n');
    fs.writeFileSync(indexPath, cleanedContent, 'utf-8');
    console.log(`   ✓ Cleaned up index.ts exports`);
  }
}

function deleteDefaultJsLibFiles(domain, type, name) {
  const libName = `${domain}-${type}-${name}`;
  const libDir = path.join(process.cwd(), 'libs', domain, type, name, 'src', 'lib');
  const defaultTs = path.join(libDir, `${libName}.ts`);
  const defaultSpec = path.join(libDir, `${libName}.spec.ts`);

  if (fs.existsSync(defaultTs)) {
    fs.rmSync(defaultTs, { force: true });
    console.log(`   ✓ Deleted default file ${libName}.ts`);
  }
  if (fs.existsSync(defaultSpec)) {
    fs.rmSync(defaultSpec, { force: true });
    console.log(`   ✓ Deleted default spec ${libName}.spec.ts`);
  }
}

function cleanupJsIndexExport(domain, type, name) {
  const libName = `${domain}-${type}-${name}`;
  const indexPath = path.join(
    process.cwd(),
    'libs',
    domain,
    type,
    name,
    'src',
    'index.ts',
  );

  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const cleanedContent = content
      .split('\n')
      .filter(
        (line) =>
          !line.includes(`./lib/${libName}`) &&
          !line.includes(`.\\lib\\${libName}`),
      )
      .join('\n');
    fs.writeFileSync(indexPath, cleanedContent, 'utf-8');
    console.log(`   ✓ Cleaned up index.ts exports`);
  }
}

function generateLibrary(
  libraryType,
  domain,
  type,
  name,
  tags = {},
  buildable = true,
) {
  try {
    if (!['angular', 'js'].includes(libraryType)) {
      throw new Error(
        `Invalid library type: ${libraryType}. Use 'angular' or 'js'.`,
      );
    }
    if (!domain || !type || !name) {
      throw new Error(`Missing required args: domain, type, name.`);
    }

    const tagsString = Object.entries(tags)
      .map(([key, value]) => `${key}:${value}`)
      .join(',');

    let generator;
    let additionalOptions = [];

    if (libraryType === 'js') {
      generator = '@nx/js:lib';
      additionalOptions = ['--includeBabelRc=false'];
      if (buildable) {
        additionalOptions.push('--bundler=tsc');
      } else {
        additionalOptions.push('--bundler=none', '--buildable=false');
      }
    } else {
      generator = '@nx/angular:lib';
    }

    const libName = `${domain}-${type}-${name}`;
    const directory = `libs/${domain}/${type}/${name}`;
    const importPath = `${WORKSPACE_SCOPE}/${domain}/${type}/${name}`;

    const command = [
      'pnpm exec nx g',
      generator,
      `--name=${libName}`,
      `--directory=${directory}`,
      `--import-path=${importPath}`,
      tagsString ? `--tags=${tagsString}` : '',
      ...additionalOptions,
    ]
      .filter(Boolean)
      .join(' ');

    console.log(`🚀 Generating ${libraryType} library: ${libName}`);
    console.log(`📁 Directory: ${directory}`);
    console.log(`🏷️  Tags: ${tagsString || '(none)'}`);
    console.log(`📦 Import path: ${importPath}`);
    console.log(`🛠️  Generator: ${generator}`);
    if (libraryType === 'js') {
      console.log(`🔨 Buildable: ${buildable ? 'Yes' : 'No'}`);
    }
    console.log('');

    execSync(command, { stdio: 'inherit', cwd: process.cwd() });

    console.log(`✅ Successfully generated ${libraryType} library: ${libName}`);

    if (libraryType === 'angular') {
      deleteDefaultComponent(domain, type, name);
      cleanupIndexExport(domain, type, name);
    }

    if (libraryType === 'js') {
      deleteDefaultJsLibFiles(domain, type, name);
      cleanupJsIndexExport(domain, type, name);
    }
  } catch (error) {
    console.error(`❌ Error generating library: ${error.message}`);
    process.exit(1);
  }
}

function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const questions = [
    { key: 'libraryType', prompt: "Enter library type ('angular' or 'js'): " },
    { key: 'domain', prompt: 'Enter domain (e.g., core/shared): ' },
    { key: 'type', prompt: 'Enter type (feature/data-access/ui/utils/models): ' },
    { key: 'name', prompt: 'Enter library name: ' },
    { key: 'buildable', prompt: 'Should this library be buildable? (y/n, default: y, only for js): ' },
  ];

  const answers = {};
  let currentQuestion = 0;

  function askQuestion() {
    if (currentQuestion >= questions.length) {
      rl.close();

      const libType = answers.libraryType?.trim().toLowerCase();
      if (!['angular', 'js'].includes(libType)) {
        console.error(`❌ Error: library type must be 'angular' or 'js'.`);
        process.exit(1);
      }

      const tags = { type: answers.type, domain: answers.domain };
      const buildable = answers.buildable?.toLowerCase() !== 'n' && answers.buildable?.toLowerCase() !== 'no';

      generateLibrary(libType, answers.domain, answers.type, answers.name, tags, buildable);
      return;
    }

    const question = questions[currentQuestion];
    rl.question(question.prompt, (answer) => {
      answers[question.key] = answer.trim();
      currentQuestion++;
      askQuestion();
    });
  }

  askQuestion();
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log(`
🔧 Nx Library Generator — Ramsoft-Builder

Usage: node scripts/generate-lib.js <libraryType> <domain> <type> <name> [tags] [buildable]

Where:
  <libraryType>  - 'angular' or 'js'
  <domain>       - e.g., 'core', 'shared'
  <type>         - e.g., 'feature', 'data-access', 'ui', 'utils', 'models'
  <name>         - library name, e.g., 'dashboard'
  [tags]         - optional tags in "key:value,key2:value2" format
  [buildable]    - 'true' or 'false' (default: true, only for js)

Options:
  -i, --interactive  - Interactive mode
  -h, --help         - Show this help

Examples:
  node scripts/generate-lib.js angular core feature dashboard "type:feature,domain:core"
  node scripts/generate-lib.js js shared utils formatting "type:utils,domain:shared" true
  node scripts/generate-lib.js --interactive
`);
    process.exit(0);
  }

  if (args.includes('-i') || args.includes('--interactive')) {
    interactiveMode();
    return;
  }

  if (args.length < 4) {
    console.error('❌ Error: libraryType, domain, type, and name are required');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  const [libraryTypeRaw, domain, type, name, tagsString, buildableString] = args;
  const libraryType = libraryTypeRaw.toLowerCase();

  if (!['angular', 'js'].includes(libraryType)) {
    console.error(`❌ Error: Invalid library type '${libraryTypeRaw}'. Use 'angular' or 'js'.`);
    process.exit(1);
  }

  const tags = {};
  if (tagsString) {
    tagsString.split(',').forEach((tag) => {
      const [key, value] = tag.split(':');
      if (key && value) tags[key.trim()] = value.trim();
    });
  }

  const buildable = buildableString ? buildableString.toLowerCase() === 'true' : true;

  generateLibrary(libraryType, domain, type, name, tags, buildable);
}

module.exports = { generateLibrary };
