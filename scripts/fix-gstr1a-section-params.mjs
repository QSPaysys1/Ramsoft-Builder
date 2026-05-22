#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.page.ts') && dir.includes('/src/lib')) files.push(p);
  }
}
walk(path.join(root, 'libs/gstr1a/feature'));

const oldBlock = `  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      this.gstin.set((pm.get('gstin') ?? '').trim().toUpperCase());
      this.retPeriod.set((pm.get('retPeriod') ?? '').trim());
      void this.loadSection();
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.filingLabel.set((qm.get('filing_status') ?? '').trim());
    });`;

const newBlock = `  constructor() {
    const syncRouteParams = (): void => {
      const pm = this.route.snapshot.paramMap;
      const qm = this.route.snapshot.queryParamMap;
      this.gstin.set((qm.get('gstin') ?? pm.get('gstin') ?? '').trim().toUpperCase());
      this.retPeriod.set((qm.get('ret_period') ?? pm.get('retPeriod') ?? '').trim());
      this.filingLabel.set((qm.get('filing_status') ?? '').trim());
      void this.loadSection();
    };
    syncRouteParams();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => syncRouteParams());
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => syncRouteParams());`;

for (const file of files) {
  if (!file.includes('-section.page.ts') && !file.includes('at-add-statewise')) continue;
  let c = fs.readFileSync(file, 'utf8');
  if (c.includes('syncRouteParams')) continue;
  if (!c.includes("pm.get('retPeriod')")) continue;
  c = c.replace(oldBlock, newBlock);
  fs.writeFileSync(file, c);
  console.log('Fixed', path.relative(root, file));
}
