import {
  getStockLevel,
  getStockLevels,
  canSell,
  validateStockMovement
} from '../src/utils/stock';
import { PosItem, StockMovement } from '../src/types/hms';

let passed = 0;
let total = 0;

function assert(condition: boolean, desc: string) {
  total++;
  if (!condition) {
    console.error(`❌ FAILED: ${desc}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ [${passed}] ${desc}`);
}

console.log('--- Testing Stock Pure Helpers ---');

const items: PosItem[] = [
  {
    id: 'item-beer',
    name: 'Craft Beer',
    category: 'Beverages',
    price: 1500,
    available: true,
    isActive: true,
    trackStock: true,
    lowStockThreshold: 5,
    unit: 'bottle'
  },
  {
    id: 'item-wine',
    name: 'Red Wine',
    category: 'Beverages',
    price: 8000,
    available: true,
    isActive: true,
    trackStock: true,
    lowStockThreshold: 2,
    unit: 'bottle'
  },
  {
    id: 'item-zero',
    name: 'Mineral Water',
    category: 'Beverages',
    price: 500,
    available: true,
    isActive: true,
    trackStock: true,
    lowStockThreshold: 5,
    unit: 'bottle'
  },
  {
    id: 'item-meal',
    name: 'Grilled Tilapia',
    category: 'Meals',
    price: 6500,
    available: true,
    isActive: true,
    trackStock: false,
    unit: 'plate'
  }
];

const movements: StockMovement[] = [
  {
    id: 'sm-1',
    branchId: 'branch-1',
    itemId: 'item-beer',
    type: 'opening',
    quantity: 10,
    createdAt: '2026-11-10 08:00',
    recordedBy: 'Manager'
  },
  {
    id: 'sm-2',
    branchId: 'branch-1',
    itemId: 'item-beer',
    type: 'sale',
    quantity: -4,
    createdAt: '2026-11-10 12:00',
    recordedBy: 'Front Desk'
  },
  {
    id: 'sm-3',
    branchId: 'branch-1',
    itemId: 'item-beer',
    type: 'receive',
    quantity: 2,
    createdAt: '2026-11-10 14:00',
    recordedBy: 'Manager'
  },
  {
    id: 'sm-4',
    branchId: 'branch-2',
    itemId: 'item-beer',
    type: 'opening',
    quantity: 20,
    createdAt: '2026-11-10 08:00',
    recordedBy: 'Manager'
  },
  {
    id: 'sm-5',
    branchId: 'branch-1',
    itemId: 'item-wine',
    type: 'opening',
    quantity: 2,
    createdAt: '2026-11-10 08:00',
    recordedBy: 'Manager'
  }
];

// 1. getStockLevel
assert(getStockLevel(movements, 'item-beer', 'branch-1') === 8, '1a. getStockLevel sums branch-1 movements (10 - 4 + 2 = 8)');
assert(getStockLevel(movements, 'item-beer', 'branch-2') === 20, '1b. getStockLevel isolates branch-2 movements (20)');
assert(getStockLevel(movements, 'item-zero', 'branch-1') === 0, '1c. getStockLevel returns 0 when item has no movements');

// 2. getStockLevels
const levelsB1 = getStockLevels(items, movements, 'branch-1');
const beerRow = levelsB1.find((r) => r.itemId === 'item-beer');
const wineRow = levelsB1.find((r) => r.itemId === 'item-wine');
const zeroRow = levelsB1.find((r) => r.itemId === 'item-zero');
const mealRow = levelsB1.find((r) => r.itemId === 'item-meal');

assert(beerRow?.level === 8 && beerRow?.state === 'ok', '2a. item above threshold has state ok');
assert(wineRow?.level === 2 && wineRow?.state === 'low', '2b. item at threshold (2 <= 2) has state low');
assert(zeroRow?.level === 0 && zeroRow?.state === 'out', '2c. tracked item with 0 stock has state out');
assert(mealRow?.state === 'untracked' && mealRow?.level === 0, '2d. untracked item always has state untracked even with 0 movements');

const defaultThresholdItems: PosItem[] = [
  { id: 'item-def', name: 'Juice', category: 'Beverages', price: 1000, available: true, trackStock: true }
];
const defMovements: StockMovement[] = [
  { id: 'sm-d1', branchId: 'branch-1', itemId: 'item-def', type: 'opening', quantity: 5, createdAt: '2026-11-10 08:00', recordedBy: 'Manager' }
];
const defRows = getStockLevels(defaultThresholdItems, defMovements, 'branch-1');
assert(defRows[0].state === 'low', '2e. default lowStockThreshold of 5 marks level 5 as low');

// 3. canSell
const sellOk = canSell(items, movements, 'branch-1', [
  { itemId: 'item-beer', qty: 5 },
  { itemId: 'item-meal', qty: 99 } // untracked ignored
]);
assert(sellOk.ok && sellOk.shortages.length === 0, '3a. canSell allows valid tracked + untracked quantities');

const sellShort = canSell(items, movements, 'branch-1', [
  { itemId: 'item-beer', qty: 9 }
]);
assert(
  !sellShort.ok && sellShort.shortages.length === 1 && sellShort.shortages[0].available === 8 && sellShort.shortages[0].requested === 9,
  '3b. canSell rejects single line exceeding stock'
);

const sellDuplicateLines = canSell(items, movements, 'branch-1', [
  { itemId: 'item-beer', qty: 5 },
  { itemId: 'item-beer', qty: 4 } // 5 + 4 = 9 > 8
]);
assert(
  !sellDuplicateLines.ok && sellDuplicateLines.shortages.length === 1 && sellDuplicateLines.shortages[0].requested === 9,
  '3c. canSell sums multiple lines for the same itemId before checking availability'
);

const sellOutItem = canSell(items, movements, 'branch-1', [
  { itemId: 'item-zero', qty: 1 }
]);
assert(!sellOutItem.ok && sellOutItem.shortages[0].available === 0, '3d. canSell rejects tracked item with 0 stock');

// 4. validateStockMovement
assert(!validateStockMovement({ type: 'receive', quantity: 1.5 }, 5).valid, '4a. non-integer quantity is rejected');
assert(!validateStockMovement({ type: 'receive', quantity: 0 }, 5).valid, '4b. receive <= 0 is rejected');
assert(validateStockMovement({ type: 'receive', quantity: 4 }, 5).valid, '4c. receive > 0 is valid');

assert(!validateStockMovement({ type: 'return', quantity: -1 }, 5).valid, '4d. return <= 0 is rejected');
assert(validateStockMovement({ type: 'return', quantity: 2 }, 5).valid, '4e. return > 0 is valid');

assert(!validateStockMovement({ type: 'waste', quantity: 0, reason: 'Broken' }, 5).valid, '4f. waste <= 0 is rejected');
assert(!validateStockMovement({ type: 'waste', quantity: 2, reason: 'no' }, 5).valid, '4g. waste with reason < 3 chars is rejected');
assert(!validateStockMovement({ type: 'waste', quantity: 6, reason: 'Spoiled batch' }, 5).valid, '4h. waste dropping below 0 is rejected');
assert(validateStockMovement({ type: 'waste', quantity: 3, reason: 'Spoiled batch' }, 5).valid, '4i. valid waste passes');

assert(!validateStockMovement({ type: 'adjust', quantity: 0, reason: 'Stock count' }, 5).valid, '4j. adjust with 0 quantity is rejected');
assert(!validateStockMovement({ type: 'adjust', quantity: -2, reason: 'ok' }, 5).valid, '4k. adjust with reason < 3 chars is rejected');
assert(!validateStockMovement({ type: 'adjust', quantity: -6, reason: 'Stock count' }, 5).valid, '4l. adjust dropping below 0 is rejected');
assert(validateStockMovement({ type: 'adjust', quantity: -2, reason: 'Stock count' }, 5).valid, '4m. negative adjust within stock passes');
assert(validateStockMovement({ type: 'adjust', quantity: 4, reason: 'Stock count' }, 5).valid, '4n. positive adjust passes');

assert(!validateStockMovement({ type: 'opening', quantity: -1 }, 0, false).valid, '4o. opening < 0 is rejected');
assert(!validateStockMovement({ type: 'opening', quantity: 10 }, 5, true).valid, '4p. opening when movements already exist is rejected');
assert(validateStockMovement({ type: 'opening', quantity: 10 }, 0, false).valid, '4q. valid opening passes');

console.log(`\nAll ${total} stock pure helper tests passed successfully!`);
