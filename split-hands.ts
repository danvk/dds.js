/**
 * Load a .pbn file and split it into separate pages for each player.
 * This is intended to be run from the command-line:
 *
 *   ts-node split-hands.ts boards.pbn
 *
 */

import * as fs from 'fs';
import {loadDeals, dealsToHTML} from './pbn-splitter';

const [,, pbnFile] = process.argv;

const data = fs.readFileSync(pbnFile).toString();
const deals = loadDeals(data);

fs.writeFileSync('deals.html', dealsToHTML(deals));

console.log('Rendered ', deals.length, ' deals --> deals.html');
