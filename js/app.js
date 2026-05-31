/**
 * FundMate — Main Alpine.js Application Component
 * Handles routing, state management, and all screen logic
 */

// Firebase is loaded dynamically in init() to allow offline fallback



window.fundmate = function() {
  return {
    // ==================== ROUTING ====================
    screen: localStorage.getItem('fundmate-household-id') 
      ? (localStorage.getItem('fundmate-pin-active') === 'true' ? 'login' : 'home')
      : 'onboarding',
    previousScreen: null,

    // ==================== AUTH & USER ====================
    householdId: localStorage.getItem('fundmate-household-id') || null,
    userName: localStorage.getItem('fundmate-username') || '',
    userPin: '',
    partnerName: '',
    partnerPin: '',
    isPinActive: localStorage.getItem('fundmate-pin-active') === 'true',
    appTheme: localStorage.getItem('fundmate-theme') || 'auto',
    

    // ==================== REGISTER FLOW ====================
    registerStep: 1,
    pinInput: '',
    pinConfirm: '',
    pinError: false,
    joinCode: '',
    useDummyData: true,
    showJoinSheet: false,

    // ==================== DATA ====================
    accounts: [],
    categories: [],
    transactions: [],
    allTransactions: [],
    planners: [],
    notifications: [],

    // ==================== TOAST ====================
    toast: { show: false, message: '', type: 'info', icon: 'fa-circle-info' },

    // ==================== BOTTOM SHEETS ====================
    showAccountSheet: false,
    showHistorySheet: false,
    showAddTransaction: false,
    historyFilterMode: 'all',
    historyFilterValue: null,
    showTxDetail: false,
    showClearDataModal: false,
    clearDataConfirmText: '',
    selectedTx: null,

    viewTransactionDetail(tx) {
      this.selectedTx = tx;
      this.showTxDetail = true;
    },
    showNotifications: false,
    showAddAccountSheet: false,
    showAddGoalSheet: false,
    showContributeSheet: false,
    showEditProfileSheet: false,
    showManageCategories: false,
    manageCategoryType: 'Expense',
    newCategoryName: '',
    selectedCategoryIcon: 'fa-solid fa-tag',
    iconOptions: [
      'fa-solid fa-tag', 'fa-solid fa-utensils', 'fa-solid fa-cart-shopping', 
      'fa-solid fa-car', 'fa-solid fa-house', 'fa-solid fa-bolt', 
      'fa-solid fa-heart-pulse', 'fa-solid fa-gamepad', 'fa-solid fa-graduation-cap',
      'fa-solid fa-money-bill-wave', 'fa-solid fa-wallet', 'fa-solid fa-briefcase',
      'fa-solid fa-piggy-bank', 'fa-solid fa-gifts', 'fa-solid fa-plane'
    ],

    // ==================== TRANSACTION FORM ====================
    txType: 'Expense',
    txAmount: '',
    txSourceAccount: '',
    txDestAccount: '',
    txCategory: '',
    txNote: '',
    

    // ==================== ACCOUNT FORM ====================
    newAccountName: '',
    newAccountType: 'Bank',
    newAccountBalance: '',

    // ==================== GOAL FORM ====================
    newGoalTitle: '',
    newGoalType: 'Goal',
    newGoalAmount: '',
    selectedGoal: null,
    contributeAmount: '',
    contributeAccount: '',

    // ==================== PROFILE ====================
    editName: '',
    editUserPin: '',
    editPartnerName: '',
    editPartnerPin: '',

    // ==================== ANALYTICS ====================
    analyticsPeriod: 'monthly',
    analyticsMonth: new Date().toISOString().substring(0, 7),

    get availableMonths() {
      const result = [];
      const d = new Date();
      d.setDate(1); // Set to 1st to avoid day overflow issues
      for (let i = 0; i < 12; i++) {
        const monthStr = d.toISOString().substring(0, 7);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
        result.push({ value: monthStr, label });
        d.setMonth(d.getMonth() - 1);
      }
      return result;
    },

    // ==================== UNSUBSCRIBERS ====================
    

    // ==================== COMPUTED ====================
    get totalBalance() {
      return this.accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    },

    get totalIncome() {
      const now = new Date(this.analyticsMonth + "-01T00:00:00");
      return this.allTransactions
        .filter(t => t.type === 'Income' && t.date && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
        .reduce((sum, t) => sum + t.amount, 0);
    },

    get totalExpense() {
      const now = new Date(this.analyticsMonth + "-01T00:00:00");
      return this.allTransactions
        .filter(t => t.type === 'Expense' && t.date && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
        .reduce((sum, t) => sum + t.amount, 0);
    },

    get currentMonthName() {
      const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
      return months[new Date(this.analyticsMonth + "-01T00:00:00").getMonth()];
    },

    get currentYear() {
      return new Date(this.analyticsMonth + "-01T00:00:00").getFullYear();
    },

    get filteredCategories() {
      const type = this.txType === 'Income' ? 'Income' : 'Expense';
      return this.categories.filter(c => c.type === type);
    },

    get expenseByCategory() {
      const now = new Date(this.analyticsMonth + "-01T00:00:00");
      const expenses = this.allTransactions.filter(t => 
        t.type === 'Expense' && t.date && 
        new Date(t.date).getMonth() === now.getMonth() && 
        new Date(t.date).getFullYear() === now.getFullYear()
      );
      const catMap = {};
      const chartColors = ['#6C5CE7','#00D2D3','#FF6B6B','#FECA57','#48DBFB','#FF9FF3','#54A0FF','#5F27CD','#01A3A4','#F368E0','#EE5A24','#0ABDE3'];

      expenses.forEach(t => {
        const catId = t.category_id || 'other';
        if (!catMap[catId]) catMap[catId] = { id: catId, amount: 0, name: '' };
        catMap[catId].amount += t.amount;
        catMap[catId].name = this.getCategoryById(t.category_id)?.name || 'Lainnya';
      });

      const total = Object.values(catMap).reduce((s, v) => s + v.amount, 0) || 1;
      return Object.values(catMap)
        .sort((a, b) => b.amount - a.amount)
        .map((item, i) => ({
          id: item.id,
          name: item.name,
          amount: item.amount,
          percentage: Math.round((item.amount / total) * 100),
          color: chartColors[i % chartColors.length]
        }));
    },

    get donutChartStyle() {
      if (this.expenseByCategory.length === 0) {
        return 'background: conic-gradient(var(--border-color) 0% 100%)';
      }
      let segments = [];
      let cumulative = 0;
      this.expenseByCategory.forEach(item => {
        const start = cumulative;
        cumulative += item.percentage;
        segments.push(`${item.color} ${start}% ${cumulative}%`);
      });
      return `background: conic-gradient(${segments.join(', ')})`;
    },

    get lastMonthExpense() {
      const now = new Date(this.analyticsMonth + "-01T00:00:00");
      let lastMonth = now.getMonth() - 1;
      let year = now.getFullYear();
      if (lastMonth < 0) {
        lastMonth = 11;
        year -= 1;
      }
      return this.allTransactions.filter(t => 
        t.type === 'Expense' && t.date && 
        new Date(t.date).getMonth() === lastMonth && 
        new Date(t.date).getFullYear() === year
      ).reduce((s, t) => s + t.amount, 0);
    },

    get momChangePercentage() {
      if (this.lastMonthExpense === 0) return this.totalExpense > 0 ? 100 : 0;
      return Math.round(((this.totalExpense - this.lastMonthExpense) / this.lastMonthExpense) * 100);
    },

    get averageDailySpend() {
      const now = new Date(this.analyticsMonth + "-01T00:00:00");
      let daysPassed = now.getMonth() === new Date().getMonth() && now.getFullYear() === new Date().getFullYear() ? new Date().getDate() : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      return Math.round(this.totalExpense / daysPassed);
    },

    get topCategory() {
      if (this.expenseByCategory.length === 0) return null;
      return this.expenseByCategory[0];
    },

    get weeklyData() {
      const days = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
      const today = new Date();
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay() || 7;
      startOfWeek.setDate(today.getDate() - dayOfWeek + 1);
      startOfWeek.setHours(0,0,0,0);

      const data = days.map((label, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const fullDateStr = date.toISOString().substring(0, 10);
        
        const dayTxs = this.allTransactions.filter(t => {
          if (!t.date) return false;
          const td = new Date(t.date);
          return td.getDate() === date.getDate() && td.getMonth() === date.getMonth() && td.getFullYear() === date.getFullYear();
        });
        
        const income = dayTxs.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
        const expense = dayTxs.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

        return {
          label,
          fullDate: fullDateStr,
          income,
          expense,
          isToday: date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
        };
      });

      const maxAmount = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);

      data.forEach(d => { 
        d.incomeHeight = Math.max(1, (d.income / maxAmount) * 100); 
        d.expenseHeight = Math.max(1, (d.expense / maxAmount) * 100); 
      });
      return data;
    },

    get totalWeeklyExpense() {
      if (!this.weeklyData) return 0;
      return this.weeklyData.reduce((s, d) => s + d.expense, 0);
    },

    get topWeeklyCategory() {
      const today = new Date();
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay() || 7;
      startOfWeek.setDate(today.getDate() - dayOfWeek + 1);
      startOfWeek.setHours(0,0,0,0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);

      const weeklyExpenses = this.allTransactions.filter(t => {
        if (t.type !== 'Expense' || !t.date) return false;
        const d = new Date(t.date);
        return d >= startOfWeek && d <= endOfWeek;
      });

      const catMap = {};
      weeklyExpenses.forEach(t => {
        catMap[t.category_id] = (catMap[t.category_id] || 0) + t.amount;
      });

      const sorted = Object.keys(catMap).sort((a,b) => catMap[b] - catMap[a]);
      if (sorted.length === 0) return null;
      return {
        category: this.getCategoryById(sorted[0]) || { name: 'Lainnya', icon_class: 'fa-solid fa-circle', color_index: 1 },
        amount: catMap[sorted[0]]
      };
    },

    get todayExpense() {
      return this.todayTransactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    },

    get topDailyCategory() {
      const dailyExpenses = this.todayTransactions.filter(t => t.type === 'Expense');
      const catMap = {};
      dailyExpenses.forEach(t => {
        catMap[t.category_id] = (catMap[t.category_id] || 0) + t.amount;
      });

      const sorted = Object.keys(catMap).sort((a,b) => catMap[b] - catMap[a]);
      if (sorted.length === 0) return null;
      return {
        category: this.getCategoryById(sorted[0]) || { name: 'Lainnya', icon_class: 'fa-solid fa-circle', color_index: 1 },
        amount: catMap[sorted[0]]
      };
    },

    get filteredHistory() {
      let txs = this.allTransactions;
      if (this.historyFilterMode === 'type' && this.historyFilterValue) {
        txs = txs.filter(t => t.type === this.historyFilterValue);
        // Only show current month if we came from analytics
        const currentMonthStart = new Date(this.analyticsMonth + "-01T00:00:00");
        txs = txs.filter(t => {
          if (!t.date) return false;
          const d = new Date(t.date);
          return d.getMonth() === currentMonthStart.getMonth() && d.getFullYear() === currentMonthStart.getFullYear();
        });
      } else if (this.historyFilterMode === 'category' && this.historyFilterValue) {
        txs = txs.filter(t => t.category_id === this.historyFilterValue);
        const currentMonthStart = new Date(this.analyticsMonth + "-01T00:00:00");
        txs = txs.filter(t => {
          if (!t.date) return false;
          const d = new Date(t.date);
          return d.getMonth() === currentMonthStart.getMonth() && d.getFullYear() === currentMonthStart.getFullYear();
        });
      } else if (this.historyFilterMode === 'day' && this.historyFilterValue) {
        txs = txs.filter(t => t.date && t.date.substring(0, 10) === this.historyFilterValue);
      }
      return txs.sort((a,b) => new Date(b.date) - new Date(a.date));
    },

    get groupedHistory() {
      const txs = this.filteredHistory;
      if (!txs || txs.length === 0) return [];
      
      const groups = {};
      txs.forEach(tx => {
        // Just extract YYYY-MM-DD
        const dateKey = tx.date ? tx.date.split('T')[0] : 'Unknown';
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(tx);
      });
      
      return Object.keys(groups).sort((a,b) => new Date(b) - new Date(a)).map(date => ({
        date: date,
        transactions: groups[date]
      }));
    },

    showFilteredHistory(mode, value) {
      this.historyFilterMode = mode; // 'all', 'type', 'category', 'day'
      this.historyFilterValue = value;
      this.showHistorySheet = true;
    },

    get todayTransactions() {
      const today = new Date();
      return this.allTransactions.filter(t => {
        if (!t.date) return false;
        const td = new Date(t.date);
        return td.getDate() === today.getDate() && td.getMonth() === today.getMonth() && td.getFullYear() === today.getFullYear();
      });
    },

    // ==================== INIT ====================
    async init() {
      // Restore theme
      this.appTheme = localStorage.getItem('fundmate-theme') || 'auto';
      this.applyTheme();

      // Dynamically load Firebase so the app won't crash if offline/blocked
      try {
        await import('./firebase.js');
      } catch (err) {
        console.warn("Firebase failed to load. Running in offline-only mode.", err);
        this.showToast("Berjalan dalam mode offline", "info", "fa-wifi");
      }

      if (window.fb && window.fb.initAuth) {
        try {
          await window.fb.initAuth();
        } catch (e) {
          console.error("Firebase auth failed:", e);
        }
      }

      // Check for existing session
      const savedHousehold = localStorage.getItem('fundmate-household-id');
      this.userName = localStorage.getItem('fundmate-username') || 'Budi';
      this.userPin = localStorage.getItem('fundmate-user-pin') || '';
      this.partnerName = localStorage.getItem('fundmate-partner-name') || '';
      this.partnerPin = localStorage.getItem('fundmate-partner-pin') || '';
      
      this.editName = this.userName;
      this.editUserPin = this.userPin;
      this.editPartnerName = this.partnerName;
      this.editPartnerPin = this.partnerPin;

      const savedUserName = localStorage.getItem('fundmate-username');

      if (savedHousehold && savedUserName) {
        this.householdId = savedHousehold;
        this.userName = savedUserName;
        this.isPinActive = localStorage.getItem('fundmate-pin-active') === 'true';
        
        // If the user already successfully logged in while Firebase was loading, 
        // or if they didn't have a PIN to begin with, load their data.
        if (this.screen === 'home') {
          await this.loadData();
        }
      } else {
        // Check URL for join link
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get('join');
        if (joinId) {
          this.joinCode = joinId;
          this.showJoinSheet = true;
        } else {
          // If no household and no join link, ensure ghost data is wiped
          localStorage.removeItem('fundmate-partner-name');
          localStorage.removeItem('fundmate-partner-pin');
          this.partnerName = '';
          this.partnerPin = '';
          this.editPartnerName = '';
          this.editPartnerPin = '';
        }
      }
    },

    // ==================== HAPTIC ====================
    triggerHaptic() {
      if (navigator.vibrate) {
        navigator.vibrate([10]);
      }
    },

    // ==================== NAVIGATION ====================
    navigateTo(target) {
      if (this.screen === target) return;
      this.previousScreen = this.screen;
      this.screen = target;
      
      // Generate QR when going to profile
      if (target === 'profile') {
        this.$nextTick(() => this.generateQR());
      }
    },

    // ==================== PIN HANDLING ====================
    handlePinKey(key, mode) {
      if (key === 'del') {
        if (mode === 'create') this.pinInput = this.pinInput.slice(0, -1);
        else if (mode === 'confirm') this.pinConfirm = this.pinConfirm.slice(0, -1);
        else if (mode === 'login') this.pinInput = this.pinInput.slice(0, -1);
        this.pinError = false;
        return;
      }

      if (mode === 'create') {
        if (this.pinInput.length < 4) {
          this.pinInput = (this.pinInput + key).substring(0, 4);
          if (this.pinInput.length === 4) {
            clearTimeout(this._pinTimeout);
            this._pinTimeout = setTimeout(() => { this.registerStep = 3; }, 200);
          }
        }
      } else if (mode === 'confirm') {
        if (this.pinConfirm.length < 4) {
          this.pinConfirm = (this.pinConfirm + key).substring(0, 4);
          if (this.pinConfirm.length === 4) {
            clearTimeout(this._pinTimeout);
            this._pinTimeout = setTimeout(() => this.confirmPin(), 200);
          }
        }
      } else if (mode === 'login') {
        if (this.pinInput.length < 4) {
          this.pinInput = (this.pinInput + key).substring(0, 4);
          if (this.pinInput.length === 4) {
            clearTimeout(this._pinTimeout);
            this._pinTimeout = setTimeout(() => this.verifyLogin(), 200);
          }
        }
      }
    },

    async confirmPin() {
      if (this.pinInput === this.pinConfirm) {
        await this.createNewHousehold();
      } else {
        this.pinError = true;
        this.pinConfirm = '';
        setTimeout(() => { this.pinError = false; }, 600);
        this.showToast('PIN tidak cocok, coba lagi', 'error', 'fa-circle-exclamation');
      }
    },

    async verifyLogin() {
      const savedPin = localStorage.getItem('fundmate-pin');
      if (this.pinInput === atob(savedPin)) {
        this.pinInput = '';
        this.screen = 'home';
        await this.loadData();
        this.showToast('Selamat datang kembali! 👋', 'success', 'fa-circle-check');
      } else {
        this.pinError = true;
        this.pinInput = '';
        setTimeout(() => { this.pinError = false; }, 600);
        this.showToast('PIN salah, coba lagi', 'error', 'fa-circle-exclamation');
      }
    },

    // ==================== HOUSEHOLD ====================
    async createNewHousehold() {
      try {
        // Generate household ID (local-first, Firestore later)
        const cleanName = this.userName.trim().replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'user';
        const randomPart = this.generateToken().substring(0, 8);
        const id = `${cleanName}-${randomPart}`;
        this.householdId = id;

        // Save to localStorage
        localStorage.setItem('fundmate-household-id', id);
        localStorage.setItem('fundmate-username', this.userName);
        localStorage.setItem('fundmate-pin', btoa(this.pinInput));
        localStorage.setItem('fundmate-pin-active', 'true');
        this.isPinActive = true;

        // Load data (will seed if empty and setup sync)
        await this.loadData();

        this.pinInput = '';
        this.pinConfirm = '';
        this.screen = 'home';
        this.showToast('Akun berhasil dibuat! 🎉', 'success', 'fa-circle-check');
      } catch (err) {
        console.error('Create household error:', err);
        this.showToast('Gagal membuat akun', 'error', 'fa-circle-exclamation');
      }
    },
    qrScanner: null,

    startScanner() {
      const qrReaderElement = document.getElementById('qr-reader');
      if (qrReaderElement.style.display === 'block') {
        // Stop scanning
        if (this.qrScanner) {
          this.qrScanner.stop().then(() => {
            this.qrScanner.clear();
            qrReaderElement.style.display = 'none';
          });
        }
        return;
      }
      
      qrReaderElement.style.display = 'block';
      this.qrScanner = new Html5Qrcode("qr-reader");
      this.qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          this.joinCode = decodedText;
          this.qrScanner.stop().then(() => {
            this.qrScanner.clear();
            qrReaderElement.style.display = 'none';
          });
        },
        (errorMessage) => {
          // ignore scan errors, it throws per frame when no QR is found
        }
      ).catch((err) => {
        console.error("Camera error:", err);
        this.showToast('Gagal mengakses kamera', 'error', 'fa-video-slash');
        qrReaderElement.style.display = 'none';
      });
    },

    async joinExistingHousehold() {
      if (!this.joinCode.trim()) return;
      
      // For now, simulate join with localStorage sync
      const joinId = this.joinCode.trim().toLowerCase();
      this.householdId = joinId;
      
      if (!this.userName) {
        this.showJoinSheet = false;
        this.screen = 'register';
        return;
      }

      localStorage.setItem('fundmate-household-id', joinId);
      localStorage.setItem('fundmate-username', this.userName);
      localStorage.setItem('fundmate-pin-active', 'false');
      this.isPinActive = false;

      this.showJoinSheet = false;
      this.seedLocalData();
      this.screen = 'home';
      this.showToast('Berhasil bergabung! 🎉', 'success', 'fa-circle-check');
    },

    // ==================== LOCAL DATA (Demo Mode) ====================
    seedLocalData() {
      // Default accounts
      if (!localStorage.getItem(`fundmate-accounts-${this.householdId}`)) {
        if (this.useDummyData) {
          this.accounts = [
            { id: 'acc1', name: 'BCA', type: 'Bank', icon_class: 'fa-solid fa-building-columns', balance: 5000000, owner: this.userName },
            { id: 'acc2', name: 'GoPay', type: 'E-Wallet', icon_class: 'fa-solid fa-wallet', balance: 500000, owner: this.userName },
            { id: 'acc3', name: 'OVO', type: 'E-Wallet', icon_class: 'fa-solid fa-wallet', balance: 250000, owner: this.userName }
          ];
        } else {
          this.accounts = [];
        }
        this.saveAccounts();
      } else {
        this.accounts = JSON.parse(localStorage.getItem(`fundmate-accounts-${this.householdId}`));
      }

      // Default master categories
      const masterCategories = [
        // Income
        { id: 'cat-i1', name: 'Gaji', type: 'Income', icon_class: 'fa-solid fa-briefcase', color_index: 3 },
        { id: 'cat-i2', name: 'Freelance', type: 'Income', icon_class: 'fa-solid fa-laptop', color_index: 5 },
        { id: 'cat-i3', name: 'Hadiah', type: 'Income', icon_class: 'fa-solid fa-gift', color_index: 1 },
        { id: 'cat-i4', name: 'Investasi', type: 'Income', icon_class: 'fa-solid fa-chart-line', color_index: 10 },
        { id: 'cat-i5', name: 'Lainnya', type: 'Income', icon_class: 'fa-solid fa-ellipsis', color_index: 9 },
        // Expense
        { id: 'cat-e1', name: 'Makanan', type: 'Expense', icon_class: 'fa-solid fa-utensils', color_index: 4 },
        { id: 'cat-e2', name: 'Transport', type: 'Expense', icon_class: 'fa-solid fa-car', color_index: 5 },
        { id: 'cat-e3', name: 'Belanja', type: 'Expense', icon_class: 'fa-solid fa-bag-shopping', color_index: 6 },
        { id: 'cat-e4', name: 'Hiburan', type: 'Expense', icon_class: 'fa-solid fa-gamepad', color_index: 9 },
        { id: 'cat-e5', name: 'Tagihan', type: 'Expense', icon_class: 'fa-solid fa-file-invoice', color_index: 2 },
        { id: 'cat-e6', name: 'Kesehatan', type: 'Expense', icon_class: 'fa-solid fa-heart-pulse', color_index: 11 },
        { id: 'cat-e7', name: 'Pendidikan', type: 'Expense', icon_class: 'fa-solid fa-graduation-cap', color_index: 7 },
        { id: 'cat-e8', name: 'Lainnya', type: 'Expense', icon_class: 'fa-solid fa-ellipsis', color_index: 12 }
      ];
      
      let existingCats = JSON.parse(localStorage.getItem(`fundmate-categories-${this.householdId}`) || '[]');
      if (existingCats.length === 0) {
        this.categories = [...masterCategories];
      } else {
        // Sync existing categories with master icons & colors
        this.categories = existingCats.map(cat => {
          const master = masterCategories.find(m => m.name === cat.name && m.type === cat.type);
          if (master) {
            return { ...cat, icon_class: master.icon_class, color_index: master.color_index };
          }
          return cat;
        });
      }
      this.saveCategories();

      // Load transactions
      this.transactions = JSON.parse(localStorage.getItem(`fundmate-transactions-${this.householdId}`) || '[]');
      this.allTransactions = [...this.transactions];

      // Load planners
      this.planners = JSON.parse(localStorage.getItem(`fundmate-planners-${this.householdId}`) || '[]');

      // Seed demo transactions if empty and useDummyData is true
      if (this.transactions.length === 0 && this.useDummyData) {
        this.seedDemoTransactions();
      }
    },

    seedDemoTransactions() {
      const now = new Date();
      const demoData = [
        { amount: 8500000, type: 'Income', category_id: 'cat-i1', note: 'Gaji Mei', date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), created_by: this.userName },
        { amount: 45000, type: 'Expense', category_id: 'cat-e1', note: 'Nasi Padang', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString(), created_by: this.userName },
        { amount: 25000, type: 'Expense', category_id: 'cat-e2', note: 'Grab ke kantor', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString(), created_by: this.userName },
        { amount: 150000, type: 'Expense', category_id: 'cat-e3', note: 'Skincare', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).toISOString(), created_by: this.userName },
        { amount: 75000, type: 'Expense', category_id: 'cat-e4', note: 'Netflix', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3).toISOString(), created_by: this.userName },
        { amount: 500000, type: 'Expense', category_id: 'cat-e5', note: 'Listrik', date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(), created_by: this.userName },
        { amount: 35000, type: 'Expense', category_id: 'cat-e1', note: 'Kopi & snack', date: new Date().toISOString(), created_by: this.userName },
        { amount: 200000, type: 'Transfer', source_account_id: 'acc1', destination_account_id: 'acc2', category_id: '', note: 'Top up GoPay', date: new Date().toISOString(), created_by: this.userName },
      ];

      demoData.forEach(tx => {
        tx.id = 'tx-' + Math.random().toString(36).substring(2, 10);
        if (!tx.source_account_id) tx.source_account_id = tx.type === 'Expense' ? 'acc1' : null;
        if (!tx.destination_account_id) tx.destination_account_id = tx.type === 'Income' ? 'acc1' : null;
      });

      this.transactions = demoData.sort((a, b) => new Date(b.date) - new Date(a.date));
      this.allTransactions = [...this.transactions];
      this.saveTransactions();

      // Demo planner
      this.planners = [
        { id: 'pl1', title: 'Liburan Bali', target_amount: 5000000, current_amount: 2350000, type: 'Goal', created_at: new Date().toISOString() },
        { id: 'pl2', title: 'iPhone 16', target_amount: 18000000, current_amount: 7500000, type: 'Goal', created_at: new Date().toISOString() },
      ];
      this.savePlanners();
    },

    async loadData() {
      // Load from localStorage immediately for fast boot
      this.accounts = JSON.parse(localStorage.getItem(`fundmate-accounts-${this.householdId}`) || '[]');
      this.categories = JSON.parse(localStorage.getItem(`fundmate-categories-${this.householdId}`) || '[]');
      this.transactions = JSON.parse(localStorage.getItem(`fundmate-transactions-${this.householdId}`) || '[]');
      this.allTransactions = [...this.transactions];
      this.planners = JSON.parse(localStorage.getItem(`fundmate-planners-${this.householdId}`) || '[]');

      // Setup real-time listeners from Firestore
      if (window.fb && window.fb.db) {
        const { db, doc, getDoc, onSnapshot } = window.fb;
        
        // Seed if completely empty (no local & no remote)
        const accountsRef = doc(db, 'households', this.householdId, 'data', 'accounts');
        getDoc(accountsRef).then(snap => {
          if (!snap.exists() && this.accounts.length === 0) {
            this.seedLocalData();
          }
        }).catch(err => {
          console.error('getDoc error:', err);
          if (err.code === 'permission-denied') {
             this.showToast('Firestore Permission Denied. Cek Rules!', 'error', 'fa-triangle-exclamation');
          }
          if (this.accounts.length === 0) {
            this.seedLocalData();
          }
        });

        const setupSync = (type, localKey, stateKey) => {
          const ref = doc(db, 'households', this.householdId, 'data', type);
          onSnapshot(ref, (snapshot) => {
            if (snapshot.exists()) {
              this[stateKey] = snapshot.data().items || [];
              if (stateKey === 'transactions') this.allTransactions = [...this.transactions];
              localStorage.setItem(localKey, JSON.stringify(this[stateKey]));
            }
          });
        };

        setupSync('accounts', `fundmate-accounts-${this.householdId}`, 'accounts');
        setupSync('categories', `fundmate-categories-${this.householdId}`, 'categories');
        setupSync('transactions', `fundmate-transactions-${this.householdId}`, 'transactions');
        setupSync('planners', `fundmate-planners-${this.householdId}`, 'planners');
      } else {
        if (this.accounts.length === 0) {
          this.seedLocalData();
        }
      }
    },

    // ==================== PERSISTENCE ====================
    saveAccounts() {
      localStorage.setItem(`fundmate-accounts-${this.householdId}`, JSON.stringify(this.accounts));
      if (window.fb && window.fb.db) {
         window.fb.setDoc(window.fb.doc(window.fb.db, 'households', this.householdId, 'data', 'accounts'), { items: this.accounts }).catch(e => console.error('Save Accounts Error:', e));
      }
    },
    saveCategories() {
      localStorage.setItem(`fundmate-categories-${this.householdId}`, JSON.stringify(this.categories));
      if (window.fb && window.fb.db) {
         window.fb.setDoc(window.fb.doc(window.fb.db, 'households', this.householdId, 'data', 'categories'), { items: this.categories }).catch(e => console.error('Save Categories Error:', e));
      }
    },
    saveTransactions() {
      localStorage.setItem(`fundmate-transactions-${this.householdId}`, JSON.stringify(this.transactions));
      if (window.fb && window.fb.db) {
         window.fb.setDoc(window.fb.doc(window.fb.db, 'households', this.householdId, 'data', 'transactions'), { items: this.transactions }).catch(e => console.error('Save Transactions Error:', e));
      }
    },
    savePlanners() {
      localStorage.setItem(`fundmate-planners-${this.householdId}`, JSON.stringify(this.planners));
      if (window.fb && window.fb.db) {
         window.fb.setDoc(window.fb.doc(window.fb.db, 'households', this.householdId, 'data', 'planners'), { items: this.planners }).catch(e => console.error('Save Planners Error:', e));
      }
    },

    // ==================== TRANSACTIONS ====================
    handleAmountKey(key) {
      this.triggerHaptic();
      if (key === 'del') {
        this.txAmount = this.txAmount.slice(0, -1);
        return;
      }
      if (this.txAmount.length >= 12) return;
      if (this.txAmount === '0' && key !== '000') {
        this.txAmount = key;
      } else {
        this.txAmount += key;
      }
    },

    saveTransaction() {
      const amount = parseInt(this.txAmount) || 0;
      if (amount <= 0) return;

      if (this.txType === 'Expense' && this.txSourceAccount) {
        const acc = this.accounts.find(a => a.id === this.txSourceAccount);
        if (acc && acc.balance < amount) {
          this.showToast('Saldo tidak mencukupi!', 'error', 'fa-circle-exclamation');
          return;
        }
      } else if (this.txType === 'Transfer' && this.txSourceAccount) {
        const acc = this.accounts.find(a => a.id === this.txSourceAccount);
        if (acc && acc.balance < amount) {
          this.showToast('Saldo tidak mencukupi!', 'error', 'fa-circle-exclamation');
          return;
        }
      }

      const tx = {
        id: 'tx-' + Math.random().toString(36).substring(2, 10),
        amount,
        type: this.txType,
        source_account_id: this.txSourceAccount || null,
        destination_account_id: this.txDestAccount || null,
        category_id: this.txCategory || '',
        date: new Date().toISOString(),
        note: this.txNote,
        created_by: this.userName,
      };

      // Update account balances
      if (tx.type === 'Income' && tx.destination_account_id) {
        const acc = this.accounts.find(a => a.id === tx.destination_account_id);
        if (acc) acc.balance += amount;
      } else if (tx.type === 'Expense' && tx.source_account_id) {
        const acc = this.accounts.find(a => a.id === tx.source_account_id);
        if (acc) acc.balance -= amount;
      } else if (tx.type === 'Transfer') {
        const src = this.accounts.find(a => a.id === tx.source_account_id);
        const dst = this.accounts.find(a => a.id === tx.destination_account_id);
        if (src) src.balance -= amount;
        if (dst) dst.balance += amount;
      }

      this.transactions.unshift(tx);
      this.allTransactions = [...this.transactions];
      this.saveTransactions();
      this.saveAccounts();

      // Reset form
      this.txAmount = '';
      this.txSourceAccount = '';
      this.txDestAccount = '';
      this.txCategory = '';
      this.txNote = '';
      this.showAddTransaction = false;

      this.showToast('Transaksi berhasil disimpan! ✅', 'success', 'fa-circle-check');
    },

    // ==================== ACCOUNTS ====================
    addNewAccount() {
      if (!this.newAccountName.trim()) return;
      const initialBalance = parseInt(this.newAccountBalance) || 0;
      if (initialBalance < 0) {
        this.showToast('Saldo awal tidak boleh negatif!', 'error', 'fa-circle-exclamation');
        return;
      }

      const acc = {
        id: 'acc-' + Math.random().toString(36).substring(2, 10),
        name: this.newAccountName.trim(),
        type: this.newAccountType,
        icon_class: this.newAccountType === 'Bank' ? 'fa-solid fa-building-columns' : 'fa-solid fa-wallet',
        balance: initialBalance,
        owner: this.userName
      };

      this.accounts.push(acc);
      this.saveAccounts();

      this.newAccountName = '';
      this.newAccountBalance = '';
      this.showAddAccountSheet = false;
      this.showToast('Akun berhasil ditambahkan!', 'success', 'fa-circle-check');
    },

    // ==================== CATEGORIES ====================
    editingCategoryId: null,

    saveCategory() {
      if (!this.newCategoryName.trim()) return;
      if (this.editingCategoryId) {
        const cat = this.categories.find(c => c.id === this.editingCategoryId);
        if (cat) {
          cat.name = this.newCategoryName.trim();
          cat.icon_class = this.selectedCategoryIcon;
          cat.icon = this.selectedCategoryIcon; // Keep for backwards compatibility
        }
        this.editingCategoryId = null;
        this.showToast('Kategori berhasil diperbarui!', 'success', 'fa-circle-check');
      } else {
        const cat = {
          id: 'cat-' + Math.random().toString(36).substring(2, 10),
          name: this.newCategoryName.trim(),
          type: this.manageCategoryType,
          icon_class: this.selectedCategoryIcon,
          icon: this.selectedCategoryIcon, // fallback
          color_index: this.manageCategoryType === 'Income' ? 3 : 12, // default colors
          color: 'blue'
        };
        this.categories.push(cat);
        this.showToast('Kategori berhasil ditambahkan!', 'success', 'fa-circle-check');
      }
      this.saveCategories();
      this.newCategoryName = '';
      this.selectedCategoryIcon = 'fa-solid fa-tag';
    },

    editCategory(cat) {
      this.editingCategoryId = cat.id;
      this.newCategoryName = cat.name;
      this.selectedCategoryIcon = cat.icon_class || cat.icon;
    },

    deleteCategory(id) {
      this.categories = this.categories.filter(c => c.id !== id);
      this.saveCategories();
      this.showToast('Kategori berhasil dihapus!', 'success', 'fa-trash');
    },

    // ==================== GOALS / PLANNERS ====================
    handleGoalAmountKey(key) {
      this.triggerHaptic();
      if (typeof this.newGoalAmount !== 'string') this.newGoalAmount = String(this.newGoalAmount || '');
      if (key === 'del') {
        this.newGoalAmount = this.newGoalAmount.slice(0, -1);
        return;
      }
      if (this.newGoalAmount.length >= 12) return;
      if (this.newGoalAmount === '0' && key !== '000') {
        this.newGoalAmount = key;
      } else {
        this.newGoalAmount += key;
      }
    },
    handleContributeAmountKey(key) {
      this.triggerHaptic();
      if (typeof this.contributeAmount !== 'string') this.contributeAmount = String(this.contributeAmount || '');
      if (key === 'del') {
        this.contributeAmount = this.contributeAmount.slice(0, -1);
        return;
      }
      if (this.contributeAmount.length >= 12) return;
      if (this.contributeAmount === '0' && key !== '000') {
        this.contributeAmount = key;
      } else {
        this.contributeAmount += key;
      }
    },

    addNewGoal() {
      if (!this.newGoalTitle.trim() || !this.newGoalAmount) return;

      const goal = {
        id: 'pl-' + Math.random().toString(36).substring(2, 10),
        title: this.newGoalTitle.trim(),
        target_amount: parseInt(this.newGoalAmount) || 0,
        current_amount: 0,
        type: this.newGoalType,
        created_at: new Date().toISOString()
      };

      this.planners.push(goal);
      this.savePlanners();

      this.newGoalTitle = '';
      this.newGoalAmount = '';
      this.showAddGoalSheet = false;
      this.showToast('Target berhasil dibuat! 🎯', 'success', 'fa-circle-check');
    },

    showContributeGoal(goal) {
      this.selectedGoal = goal;
      this.contributeAmount = '';
      this.contributeAccount = '';
      this.showContributeSheet = true;
    },

    contributeToGoal() {
      if (!this.contributeAmount || !this.selectedGoal || !this.contributeAccount) return;
      const amount = parseInt(this.contributeAmount) || 0;
      if (amount <= 0) return;

      const acc = this.accounts.find(a => a.id === this.contributeAccount);
      if (!acc) return;
      if (acc.balance < amount) {
        this.showToast('Saldo sumber dana tidak mencukupi', 'error', 'fa-circle-exclamation');
        return;
      }
      
      const goal = this.planners.find(p => p.id === this.selectedGoal.id);
      if (goal) {
        // Deduct from account
        acc.balance -= amount;
        this.saveAccounts();

        // Add to goal
        goal.current_amount += amount;
        this.savePlanners();

        // Add to transaction history
        const tx = {
          id: 'tx-' + Math.random().toString(36).substring(2, 10),
          amount,
          type: 'Expense',
          source_account_id: this.contributeAccount,
          destination_account_id: null,
          category_id: 'cat-goal-contribution',
          date: new Date().toISOString(),
          note: 'Kontribusi Target: ' + goal.title,
          created_by: this.userName,
        };
        this.transactions.unshift(tx);
        this.allTransactions = [...this.transactions];
        this.saveTransactions();
      }
      this.showContributeSheet = false;
      this.contributeAmount = '';
      this.contributeAccount = '';
      this.showToast('Kontribusi ditambahkan! 💰', 'success', 'fa-circle-check');
    },

    // ==================== PROFILE ====================
    openEditProfile() {
      this.editName = this.userName || '';
      this.editUserPin = this.userPin || '';
      this.editPartnerName = this.partnerName || '';
      this.editPartnerPin = this.partnerPin || '';
      this.showEditProfileSheet = true;
    },

    saveProfile() {
      if (!this.editName.trim()) return;
      this.userName = this.editName.trim();
      this.userPin = this.editUserPin;
      this.partnerName = this.editPartnerName.trim();
      this.partnerPin = this.editPartnerPin;
      
      localStorage.setItem('fundmate-username', this.userName);
      if (this.userPin.length === 4) {
        localStorage.setItem('fundmate-pin', btoa(this.userPin));
      }
      localStorage.setItem('fundmate-partner-name', this.partnerName);
      localStorage.setItem('fundmate-partner-pin', this.partnerPin);
      
      this.showEditProfileSheet = false;
      this.showToast('Profil berhasil diperbarui!', 'success', 'fa-circle-check');
    },

    applyTheme() {
      localStorage.setItem('fundmate-theme', this.appTheme);
      let isDark = false;
      if (this.appTheme === 'dark') {
        isDark = true;
      } else if (this.appTheme === 'auto') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    },

    async clearDataHousehold() {
      if (this.clearDataConfirmText !== 'YA, HAPUS') {
        this.showToast('Konfirmasi tidak sesuai!', 'error', 'fa-xmark');
        return;
      }
      
      // Delete from Firestore if available
      if (window.fb && window.fb.db && this.householdId) {
        try {
          const { db, doc, deleteDoc } = window.fb;
          await deleteDoc(doc(db, 'households', this.householdId, 'data', 'accounts'));
          await deleteDoc(doc(db, 'households', this.householdId, 'data', 'categories'));
          await deleteDoc(doc(db, 'households', this.householdId, 'data', 'transactions'));
          await deleteDoc(doc(db, 'households', this.householdId, 'data', 'planners'));
          await deleteDoc(doc(db, 'households', this.householdId)); 
        } catch (e) {
          console.error('Failed to delete from DB:', e);
        }
      }

      this.accounts = [];
      this.categories = [];
      this.transactions = [];
      this.allTransactions = [];
      this.planners = [];
      
      this.saveAccounts();
      this.saveCategories();
      this.saveTransactions();
      this.savePlanners();

      localStorage.removeItem('fundmate-household-id');
      localStorage.removeItem('fundmate-username');
      localStorage.removeItem('fundmate-user-pin');
      localStorage.removeItem('fundmate-partner-name');
      localStorage.removeItem('fundmate-partner-pin');
      localStorage.removeItem('fundmate-pin-active');
      this.showToast('Data berhasil dihapus!', 'success', 'fa-trash');
      this.showClearDataModal = false;
      this.clearDataConfirmText = '';
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },

    togglePinSetting() {
      localStorage.setItem('fundmate-pin-active', this.isPinActive ? 'true' : 'false');
      this.showToast(this.isPinActive ? 'PIN diaktifkan 🔒' : 'PIN dinonaktifkan 🔓', 'info', 'fa-circle-info');
    },

    // ==================== QR CODE ====================
    generateQR() {
      const container = document.getElementById('qrcode-container');
      if (!container || !this.householdId) return;
      container.innerHTML = '';
      
      if (typeof qrcode !== 'undefined') {
        const qr = qrcode(0, 'M');
        const shareUrl = window.location.origin + window.location.pathname + '?join=' + this.householdId;
        qr.addData(shareUrl);
        qr.make();
        container.innerHTML = qr.createSvgTag({ scalable: true, cellSize: 4, margin: 0 });
        
        // Style the SVG
        const svg = container.querySelector('svg');
        if (svg) {
          svg.style.width = '160px';
          svg.style.height = '160px';
        }
      }
    },

    copyShareLink() {
      const url = window.location.origin + window.location.pathname + '?join=' + this.householdId;
      navigator.clipboard.writeText(url).then(() => {
        this.showToast('Link berhasil disalin! 📋', 'success', 'fa-circle-check');
      }).catch(() => {
        this.showToast('Gagal menyalin link', 'error', 'fa-circle-exclamation');
      });
    },

    shareLink() {
      const url = window.location.origin + window.location.pathname + '?join=' + this.householdId;
      if (navigator.share) {
        navigator.share({
          title: 'Gabung ke FundMate',
          text: 'Ayo kelola keuangan bersama di FundMate!',
          url: url,
        }).catch((error) => {});
      } else {
        this.copyShareLink();
      }
    },

    // ==================== HELPERS ====================
    getCategoryById(id) {
      if (id === 'cat-goal-contribution') {
        return { id: 'cat-goal-contribution', name: 'Tabungan', type: 'Expense', icon: 'fa-solid fa-piggy-bank', color: 'brand' };
      }
      return this.categories.find(c => c.id === id) || null;
    },

    getAccountById(id) {
      return this.accounts.find(a => a.id === id) || null;
    },

    formatCurrency(amount) {
      if (amount === 0 || amount === undefined || amount === null) return 'Rp0';
      const abs = Math.abs(amount);
      if (abs >= 1000000000) return 'Rp' + (abs / 1000000000).toFixed(1).replace('.0', '').replace('.', ',') + 'M';
      if (abs >= 1000000) return 'Rp' + (abs / 1000000).toFixed(1).replace('.0', '').replace('.', ',') + 'Jt';
      if (abs >= 1000) return 'Rp' + (abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1).replace('.', ',') + 'K';
      return 'Rp' + abs;
    },

    formatCurrencyFull(amount) {
      if (amount === undefined || amount === null) return 'Rp0';
      return 'Rp' + Math.abs(amount).toLocaleString('id-ID');
    },

    formatDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    },

    formatRelativeDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffDays === 0) return 'Hari ini';
      if (diffDays === 1) return 'Kemarin';
      if (diffDays < 7) return diffDays + ' hari lalu';
      return this.formatDate(dateStr);
    },

    formatTime(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    },

    getGreeting() {
      const h = new Date().getHours();
      if (h < 11) return 'Selamat Pagi ☀️';
      if (h < 15) return 'Selamat Siang 🌤️';
      if (h < 18) return 'Selamat Sore 🌅';
      return 'Selamat Malam 🌙';
    },

    generateToken() {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    },

    // ==================== TOAST ====================
    showToast(message, type = 'info', icon = 'fa-circle-info') {
      this.toast = { show: true, message, type, icon };
      setTimeout(() => { this.toast.show = false; }, 3000);
    },
  };
}
