// ============================================================
// FundMate – Firestore CRUD Operations
// All functions are async. Household‑scoped via subcollections.
// ============================================================

import {
  db,
  getHouseholdRef,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  increment,
} from './firebase.js';

import { hashPin, verifyPinHash } from './utils.js';

// ════════════════════════════════════════════════════════════
//  HOUSEHOLDS
// ════════════════════════════════════════════════════════════

/**
 * Create a new household document.
 * @param {string} pin        – plain‑text PIN (will be hashed)
 * @param {string} memberName – display name of the creator
 * @returns {Promise<string>} – the new household document ID
 */
export async function createHousehold(pin, memberName) {
  const householdData = {
    pin: hashPin(pin),
    is_pin_active: true,
    members: [
      {
        name: memberName,
        joinedAt: Timestamp.now(),
      },
    ],
    created_at: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'households'), householdData);
  return ref.id;
}

/**
 * Fetch a household document.
 * @returns {Promise<object|null>}
 */
export async function getHousehold(householdId) {
  const snap = await getDoc(getHouseholdRef(householdId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Add a member to the household's members array.
 */
export async function joinHousehold(householdId, memberName) {
  await updateDoc(getHouseholdRef(householdId), {
    members: arrayUnion({
      name: memberName,
      joinedAt: Timestamp.now(),
    }),
  });
}

/**
 * Verify a plain‑text PIN against the stored hash.
 * @returns {Promise<boolean>}
 */
export async function verifyPin(householdId, pin) {
  const household = await getHousehold(householdId);
  if (!household) return false;
  // If PIN protection is disabled, allow access
  if (!household.is_pin_active) return true;
  return verifyPinHash(pin, household.pin);
}

/**
 * Update the household PIN.
 */
export async function updatePin(householdId, newPin) {
  await updateDoc(getHouseholdRef(householdId), {
    pin: hashPin(newPin),
  });
}

/**
 * Toggle PIN protection on/off.
 */
export async function togglePin(householdId, isActive) {
  await updateDoc(getHouseholdRef(householdId), {
    is_pin_active: isActive,
  });
}

// ════════════════════════════════════════════════════════════
//  ACCOUNTS
// ════════════════════════════════════════════════════════════

/** Subcollection reference helper. */
function accountsCol(householdId) {
  return collection(db, 'households', householdId, 'accounts');
}

/**
 * Add a new account.
 * @param {string} householdId
 * @param {{ name:string, type:'Bank'|'E-Wallet', icon_class:string, balance:number, owner:string }} data
 * @returns {Promise<string>} – account document ID
 */
export async function addAccount(householdId, data) {
  const ref = await addDoc(accountsCol(householdId), {
    name: data.name,
    type: data.type,
    icon_class: data.icon_class || 'fa-solid fa-wallet',
    balance: data.balance || 0,
    owner: data.owner || '',
  });
  return ref.id;
}

/**
 * Get all accounts for a household.
 * @returns {Promise<Array>}
 */
export async function getAccounts(householdId) {
  const snap = await getDocs(accountsCol(householdId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Update a single account's balance.
 */
export async function updateAccountBalance(householdId, accountId, newBalance) {
  const ref = doc(db, 'households', householdId, 'accounts', accountId);
  await updateDoc(ref, { balance: newBalance });
}

/**
 * Delete an account document.
 */
export async function deleteAccount(householdId, accountId) {
  const ref = doc(db, 'households', householdId, 'accounts', accountId);
  await deleteDoc(ref);
}

/**
 * Real‑time listener for accounts.
 * @param {string} householdId
 * @param {function} callback – called with array of account objects
 * @returns {function} unsubscribe
 */
export function subscribeAccounts(householdId, callback) {
  return onSnapshot(accountsCol(householdId), (snap) => {
    const accounts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(accounts);
  });
}

// ════════════════════════════════════════════════════════════
//  CATEGORIES
// ════════════════════════════════════════════════════════════

function categoriesCol(householdId) {
  return collection(db, 'households', householdId, 'categories');
}

/**
 * Seed default categories for a new household.
 * Safe to call multiple times – uses deterministic doc IDs so duplicates
 * are overwritten rather than duplicated.
 */
export async function seedDefaultCategories(householdId) {
  const defaults = [
    // ── Income ──
    { id: 'inc_gaji',      name: 'Gaji',      type: 'Income',  icon_class: 'fa-solid fa-briefcase',      color_index: 1 },
    { id: 'inc_freelance',  name: 'Freelance',  type: 'Income',  icon_class: 'fa-solid fa-laptop',         color_index: 2 },
    { id: 'inc_hadiah',     name: 'Hadiah',     type: 'Income',  icon_class: 'fa-solid fa-gift',           color_index: 3 },
    { id: 'inc_investasi',  name: 'Investasi',  type: 'Income',  icon_class: 'fa-solid fa-chart-line',     color_index: 4 },
    { id: 'inc_lainnya',    name: 'Lainnya',    type: 'Income',  icon_class: 'fa-solid fa-ellipsis',       color_index: 5 },

    // ── Expense ──
    { id: 'exp_makanan',    name: 'Makanan',    type: 'Expense', icon_class: 'fa-solid fa-utensils',       color_index: 1 },
    { id: 'exp_transport',  name: 'Transport',  type: 'Expense', icon_class: 'fa-solid fa-car',            color_index: 2 },
    { id: 'exp_belanja',    name: 'Belanja',    type: 'Expense', icon_class: 'fa-solid fa-bag-shopping',   color_index: 3 },
    { id: 'exp_hiburan',    name: 'Hiburan',    type: 'Expense', icon_class: 'fa-solid fa-gamepad',        color_index: 4 },
    { id: 'exp_tagihan',    name: 'Tagihan',    type: 'Expense', icon_class: 'fa-solid fa-file-invoice',   color_index: 5 },
    { id: 'exp_kesehatan',  name: 'Kesehatan',  type: 'Expense', icon_class: 'fa-solid fa-heart-pulse',    color_index: 6 },
    { id: 'exp_pendidikan', name: 'Pendidikan', type: 'Expense', icon_class: 'fa-solid fa-graduation-cap', color_index: 7 },
    { id: 'exp_lainnya',    name: 'Lainnya',    type: 'Expense', icon_class: 'fa-solid fa-ellipsis',       color_index: 8 },
  ];

  const col = categoriesCol(householdId);
  const promises = defaults.map(({ id, ...data }) =>
    setDoc(doc(col, id), data),
  );
  await Promise.all(promises);
}

/**
 * Get all categories.
 * @returns {Promise<Array>}
 */
export async function getCategories(householdId) {
  const snap = await getDocs(categoriesCol(householdId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Add a custom category.
 */
export async function addCategory(householdId, data) {
  const ref = await addDoc(categoriesCol(householdId), {
    name: data.name,
    type: data.type,
    icon_class: data.icon_class || 'fa-solid fa-tag',
    color_index: data.color_index || 1,
  });
  return ref.id;
}

/**
 * Delete a category.
 */
export async function deleteCategory(householdId, categoryId) {
  const ref = doc(db, 'households', householdId, 'categories', categoryId);
  await deleteDoc(ref);
}

// ════════════════════════════════════════════════════════════
//  TRANSACTIONS
// ════════════════════════════════════════════════════════════

function transactionsCol(householdId) {
  return collection(db, 'households', householdId, 'transactions');
}

/**
 * Add a transaction AND update account balance(s) accordingly.
 *
 * Balance logic:
 *   Income   → destination_account  += amount
 *   Expense  → source_account       -= amount
 *   Transfer → source -= amount, destination += amount
 *
 * @param {string} householdId
 * @param {{
 *   amount: number,
 *   type: 'Income'|'Expense'|'Transfer',
 *   source_account_id: string|null,
 *   destination_account_id: string|null,
 *   category_id: string,
 *   date: Date|Timestamp,
 *   note: string,
 *   created_by: string,
 * }} data
 * @returns {Promise<string>} – transaction document ID
 */
export async function addTransaction(householdId, data) {
  const txDate = data.date instanceof Date
    ? Timestamp.fromDate(data.date)
    : (data.date || Timestamp.now());

  const txData = {
    amount: data.amount,
    type: data.type,
    source_account_id: data.source_account_id || null,
    destination_account_id: data.destination_account_id || null,
    category_id: data.category_id || '',
    date: txDate,
    note: data.note || '',
    created_by: data.created_by || '',
    created_at: serverTimestamp(),
  };

  // Persist transaction
  const ref = await addDoc(transactionsCol(householdId), txData);

  // ── Update account balances ───────────────────────────
  await _applyBalanceChange(householdId, data, +1);

  return ref.id;
}

/**
 * Internal: apply or reverse balance changes for a transaction.
 * @param {number} direction  +1 to apply, ‑1 to reverse
 */
async function _applyBalanceChange(householdId, tx, direction) {
  const amt = tx.amount * direction;

  if (tx.type === 'Income' && tx.destination_account_id) {
    const accSnap = await getDoc(doc(db, 'households', householdId, 'accounts', tx.destination_account_id));
    if (accSnap.exists()) {
      await updateDoc(accSnap.ref, { balance: (accSnap.data().balance || 0) + amt });
    }
  }

  if (tx.type === 'Expense' && tx.source_account_id) {
    const accSnap = await getDoc(doc(db, 'households', householdId, 'accounts', tx.source_account_id));
    if (accSnap.exists()) {
      await updateDoc(accSnap.ref, { balance: (accSnap.data().balance || 0) - amt });
    }
  }

  if (tx.type === 'Transfer') {
    if (tx.source_account_id) {
      const srcSnap = await getDoc(doc(db, 'households', householdId, 'accounts', tx.source_account_id));
      if (srcSnap.exists()) {
        await updateDoc(srcSnap.ref, { balance: (srcSnap.data().balance || 0) - amt });
      }
    }
    if (tx.destination_account_id) {
      const dstSnap = await getDoc(doc(db, 'households', householdId, 'accounts', tx.destination_account_id));
      if (dstSnap.exists()) {
        await updateDoc(dstSnap.ref, { balance: (dstSnap.data().balance || 0) + amt });
      }
    }
  }
}

/**
 * Fetch recent transactions, ordered newest‑first.
 * @param {number} limitCount – max number to return (default 50)
 * @returns {Promise<Array>}
 */
export async function getTransactions(householdId, limitCount = 50) {
  const q = query(
    transactionsCol(householdId),
    orderBy('date', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get all transactions for a specific month (0‑indexed).
 */
export async function getTransactionsByMonth(householdId, year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const q = query(
    transactionsCol(householdId),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get transactions within a date range (for weekly analytics).
 * @param {Date} startDate
 * @param {Date} endDate
 */
export async function getTransactionsByWeek(householdId, startDate, endDate) {
  const q = query(
    transactionsCol(householdId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Delete a transaction and REVERSE its balance effect.
 */
export async function deleteTransaction(householdId, transactionId) {
  const txRef = doc(db, 'households', householdId, 'transactions', transactionId);
  const txSnap = await getDoc(txRef);
  if (!txSnap.exists()) return;

  const txData = txSnap.data();

  // Reverse the balance change (direction = ‑1)
  await _applyBalanceChange(householdId, txData, -1);

  await deleteDoc(txRef);
}

/**
 * Real‑time listener for transactions, newest‑first.
 * @param {string} householdId
 * @param {function} callback – called with array of transaction objects
 * @param {number} limitCount – max items (default 50)
 * @returns {function} unsubscribe
 */
export function subscribeTransactions(householdId, callback, limitCount = 50) {
  const q = query(
    transactionsCol(householdId),
    orderBy('date', 'desc'),
    limit(limitCount),
  );
  return onSnapshot(q, (snap) => {
    const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(txs);
  });
}

// ════════════════════════════════════════════════════════════
//  PLANNERS  (Goals & Bills)
// ════════════════════════════════════════════════════════════

function plannersCol(householdId) {
  return collection(db, 'households', householdId, 'planners');
}

/**
 * Add a new planner (Goal or Bill).
 * @param {string} householdId
 * @param {{ title:string, target_amount:number, current_amount?:number, type:'Goal'|'Bill' }} data
 * @returns {Promise<string>}
 */
export async function addPlanner(householdId, data) {
  const ref = await addDoc(plannersCol(householdId), {
    title: data.title,
    target_amount: data.target_amount,
    current_amount: data.current_amount || 0,
    type: data.type || 'Goal',
    created_at: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Get all planners.
 * @returns {Promise<Array>}
 */
export async function getPlanners(householdId) {
  const snap = await getDocs(plannersCol(householdId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Increment a planner's current_amount.
 * @param {number} addAmount – amount to add (can be negative to subtract)
 */
export async function updatePlannerAmount(householdId, plannerId, addAmount) {
  const ref = doc(db, 'households', householdId, 'planners', plannerId);
  await updateDoc(ref, {
    current_amount: increment(addAmount),
  });
}

/**
 * Delete a planner.
 */
export async function deletePlanner(householdId, plannerId) {
  const ref = doc(db, 'households', householdId, 'planners', plannerId);
  await deleteDoc(ref);
}

/**
 * Real‑time listener for planners.
 * @param {string} householdId
 * @param {function} callback – called with array of planner objects
 * @returns {function} unsubscribe
 */
export function subscribePlanners(householdId, callback) {
  return onSnapshot(plannersCol(householdId), (snap) => {
    const planners = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(planners);
  });
}
