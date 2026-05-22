#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const srcPages = path.join(root, 'libs/gstr1/feature/login/src/lib/pages');
const mappings = [
  { src: 'gstr1a-view.page', dest: 'feature/dashboard/src/lib', exportName: 'Gstr1aHubPageComponent', file: 'gstr1a-hub.page' },
  { src: 'gstr1a-b2b-section.page', dest: 'feature/b2b/src/lib', exportName: 'Gstr1aB2bSectionPageComponent', file: 'gstr1a-b2b-section.page' },
  { src: 'gstr1a-b2cl-section.page', dest: 'feature/b2cl/src/lib', exportName: 'Gstr1aB2clSectionPageComponent', file: 'gstr1a-b2cl-section.page' },
  { src: 'gstr1a-b2cs-section.page', dest: 'feature/b2cs/src/lib', exportName: 'Gstr1aB2csSectionPageComponent', file: 'gstr1a-b2cs-section.page' },
  { src: 'gstr1a-exp-section.page', dest: 'feature/exp/src/lib', exportName: 'Gstr1aExpSectionPageComponent', file: 'gstr1a-exp-section.page' },
  { src: 'gstr1a-nil-section.page', dest: 'feature/nil/src/lib', exportName: 'Gstr1aNilSectionPageComponent', file: 'gstr1a-nil-section.page' },
  { src: 'gstr1a-cdnr-section.page', dest: 'feature/cdnr/src/lib', exportName: 'Gstr1aCdnrSectionPageComponent', file: 'gstr1a-cdnr-section.page' },
  { src: 'gstr1a-cdnur-section.page', dest: 'feature/cdnur/src/lib', exportName: 'Gstr1aCdnurSectionPageComponent', file: 'gstr1a-cdnur-section.page' },
  { src: 'gstr1a-at-section.page', dest: 'feature/at/src/lib', exportName: 'Gstr1aAtSectionPageComponent', file: 'gstr1a-at-section.page' },
  { src: 'gstr1a-at-add-statewise.page', dest: 'feature/atadja/src/lib', exportName: 'Gstr1aAtAddStatewisePageComponent', file: 'gstr1a-at-add-statewise.page' },
  { src: 'gstr1a-hsn-section.page', dest: 'feature/hsn/src/lib', exportName: 'Gstr1aHsnSectionPageComponent', file: 'gstr1a-hsn-section.page' },
];

const replaceRules = [
  [/from '@ramsoft-builder\/gstr1\/data-access\/gstzen-auth'/g, "from '@ramsoft-builder/gstr1/data-access/gstzen-auth'"],
  [/from '\.\.\/constants\/gstr1-download-workspace\.constants'/g, "from '@ramsoft-builder/gstr1a/utils/constants'"],
  [/GSTR1_AMEND_RECORD_DETAIL_TILES/g, 'GSTR1A_AMEND_RECORD_DETAIL_TILES'],
  [/\/gstr1\/workspace\/gstr1a-view/g, '/gstr1a/hub'],
  [/\/gstr1\/workspace\/gstr1a-b2b/g, '/gstr1a/b2b'],
  [/\/gstr1\/workspace\/gstr1a-b2cl/g, '/gstr1a/b2cl'],
  [/\/gstr1\/workspace\/gstr1a-b2cs/g, '/gstr1a/b2cs'],
  [/\/gstr1\/workspace\/gstr1a-exp/g, '/gstr1a/exp'],
  [/\/gstr1\/workspace\/gstr1a-nil/g, '/gstr1a/nil'],
  [/\/gstr1\/workspace\/gstr1a-cdnr/g, '/gstr1a/cdnr'],
  [/\/gstr1\/workspace\/gstr1a-cdnur/g, '/gstr1a/cdnur'],
  [/\/gstr1\/workspace\/gstr1a-at/g, '/gstr1a/at'],
  [/\/gstr1\/workspace\/gstr1a-hsn/g, '/gstr1a/hsn'],
];

for (const { src, dest, exportName, file } of mappings) {
  const destDir = path.join(root, 'libs/gstr1a', dest);
  fs.mkdirSync(destDir, { recursive: true });
  for (const ext of ['ts', 'html', 'scss']) {
    const from = path.join(srcPages, `${src}.${ext}`);
    const to = path.join(destDir, `${file}.${ext}`);
    if (!fs.existsSync(from)) continue;
    let content = fs.readFileSync(from, 'utf8');
    if (ext === 'ts') {
      for (const [re, rep] of replaceRules) content = content.replace(re, rep);
      if (src === 'gstr1a-view.page') {
        content = content.replace(/Gstr1aViewPageComponent/g, exportName);
        content = content.replace(/gstr1a-view\.page/g, 'gstr1a-hub.page');
        content = content.replace(/lib-gstr1a-view-page/g, 'lib-gstr1a-hub-page');
      }
    }
    fs.writeFileSync(to, content);
  }
  const indexPath = path.join(root, 'libs/gstr1a', dest.replace('/src/lib', ''), 'src/index.ts');
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(
    indexPath,
    `export { ${exportName} } from './lib/${file}';\n`,
  );
  console.log('Migrated', src, '->', dest);
}
