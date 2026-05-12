#!/usr/bin/env node

const { execSync } = require('child_process');

function generateComponent(projectName, type, name, style = 'scss', skipTests = true) {
  try {
    const fullType = type === 'c' ? 'components' : type === 'p' ? 'pages' : type;

    const command = [
      'pnpm exec nx g @schematics/angular:component',
      `--project=${projectName}`,
      `--name=${fullType}/${name}`,
      `--style=${style}`,
      skipTests ? '--skip-tests' : '',
    ]
      .filter(Boolean)
      .join(' ');

    console.log(`🚀 Generating component: ${name}`);
    console.log(`📁 Project: ${projectName}`);
    console.log(`📂 Type: ${fullType}`);
    console.log(`🎨 Style: ${style}`);
    console.log('');

    execSync(command, { stdio: 'inherit', cwd: process.cwd() });

    console.log(`✅ Successfully generated ${fullType}/${name} in ${projectName}`);
  } catch (error) {
    console.error(`❌ Error generating component: ${error.message}`);
    process.exit(1);
  }
}

function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const questions = [
    { key: 'projectName', prompt: 'Enter project name (e.g., ramsoft-web or my-domain-feature-name): ' },
    { key: 'type', prompt: 'Enter type (c for components / p for pages): ' },
    { key: 'name', prompt: 'Enter component name: ' },
    { key: 'style', prompt: 'Enter style format (scss/css) [scss]: ' },
    { key: 'skipTests', prompt: 'Skip tests? (y/n) [y]: ' },
  ];

  const answers = {};
  let currentQuestion = 0;

  function askQuestion() {
    if (currentQuestion >= questions.length) {
      rl.close();
      const style = answers.style || 'scss';
      const skipTests = answers.skipTests === '' || answers.skipTests.toLowerCase() !== 'n';
      generateComponent(answers.projectName, answers.type, answers.name, style, skipTests);
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
🔧 Angular Component Generator

Usage: node scripts/generate-component.js <projectName> <type> <name> [style] [skipTests]
       node scripts/generate-component.js --interactive

Parameters:
  projectName  - Nx project name (e.g., 'ramsoft-web' or 'core-feature-dashboard')
  type         - 'c' for components or 'p' for pages
  name         - component name (e.g., 'header')
  style        - scss/css [default: scss]
  skipTests    - true/false [default: true]

Examples:
  node scripts/generate-component.js ramsoft-web c header
  node scripts/generate-component.js ramsoft-web p home
  node scripts/generate-component.js --interactive
`);
    process.exit(0);
  }

  if (args.includes('-i') || args.includes('--interactive')) {
    interactiveMode();
    return;
  }

  if (args.length < 3) {
    console.error('❌ Error: projectName, type, and name are required');
    process.exit(1);
  }

  const [projectName, type, name, style = 'scss', skipTests = 'true'] = args;
  generateComponent(projectName, type, name, style, skipTests.toLowerCase() === 'true');
}

module.exports = { generateComponent };
