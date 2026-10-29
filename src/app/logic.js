import { DCLogic } from '../runtime/dc.js';

export default class Component extends DCLogic {
  uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  pad2(n) { return (n < 10 ? '0' : '') + n; }
  ymd(d) { return d.getFullYear() + '-' + this.pad2(d.getMonth() + 1) + '-' + this.pad2(d.getDate()); }
  dt(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  add(s, k) { var d = this.dt(s); d.setDate(d.getDate() + k); return this.ymd(d); }
  K() {
    if (this._k) return this._k;
    this._k = {
      today: this.ymd(new Date()),
      months: ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'],
      mon: ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'],
      wd: ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'],
      wdS: ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'],
      vols: [4, 5, 6, 7, 8, 10, 12, 15, 20, 27, 30],
      drivers: ['ზ. ხალვაში', 'თ. ბოლქვაძე', 'გ. ნიჟარაძე', 'ლ. აბაშიძე']
    };
    return this._k;
  }
  days(d) { return Math.round((this.dt(this.K().today) - this.dt(d)) / 86400000); }
  weekStart(s) { var d = this.dt(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return this.ymd(d); }
  dShort(s) { var p = String(s).split('-'); return (+p[2]) + ' ' + this.K().mon[+p[1] - 1]; }
  dLong(s) {
    var K = this.K(), p = String(s).split('-'), n = this.days(s);
    var base = (+p[2]) + ' ' + K.months[+p[1] - 1];
    if (n === 0) return 'დღეს, ' + base;
    if (n === 1) return 'გუშინ, ' + base;
    return K.wd[this.dt(s).getDay()] + ', ' + base;
  }
  fmt(n) {
    var v = Math.round(n || 0);
    var s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + s + ' ₾';
  }
  num(v) {
    var n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/[^\d.]/g, ''));
    return isFinite(n) ? n : 0;
  }
  vl(v) { return String(v).replace('.', ',') + ' მ³'; }
  vb(v) { return String(v).replace('.', ',') + 'მ³'; }
  r5(x) { return Math.round(x / 5) * 5; }
  tariff(type, vol) {
    if (type === 'pickup' || !(vol > 0)) return 0;
    return this.r5(40 + 6 * vol) + this.r5(60 + 13 * vol);
  }
  short(c) { return String(c && c.name || '').replace(/^(შპს|სს|ი\/მ)\s+/, ''); }
  typeMeta(t) {
    if (t === 'deliver') return { label: 'მიტანა', solid: '#145AFF', wash: '#EEF3FF', line: '#D3E0FD' };
    if (t === 'pickup') return { label: 'გატანა', solid: '#0B7A6E', wash: '#E8F6F3', line: '#C3E8DF' };
    return { label: 'შეცვლა', solid: '#7A3FE0', wash: '#F4EEFF', line: '#E2D5FC' };
  }
  pill(st) {
    if (st === 'paid') return { t: 'გადახდილი', dot: '#16CA2E' };
    if (st === 'partial') return { t: 'ნაწილობრივ', dot: '#FFA64D' };
    if (st === 'overdue') return { t: 'ვადაგადაცილებული', dot: '#F26052' };
    if (st === 'incl') return { t: '', dot: 'transparent' };
    return { t: 'გადაუხდელი', dot: '#3B82F6' };
  }
  codeNum(code) { var m = /-(\d+)$/.exec(code); return m ? +m[1] : 0; }
  blankForm(mode, extra) {
    var f = { type: 'deliver', client: '', address: '', vol: 7, cont: '', place: '', date: this.K().today, driver: '', price: '', priceAuto: true, paidNow: false, puPay: 'none', puAmt: null };
    if (mode === 'demo') { f.client = 'c2'; f.address = 'ანგისის ქ. 7'; f.vol = 20; f.cont = 'K20-03'; f.driver = 'ლ. აბაშიძე'; }
    if (mode === 'swapdemo') { f.type = 'swap'; f.place = 'K7-02'; f.vol = 5; f.driver = 'თ. ბოლქვაძე'; }
    return Object.assign(f, extra || {});
  }
  blankPay(client, fixed) { return { client: client || '', amount: null, method: 'bank', fixed: !!fixed }; }
  blankNc(fromForm) { return { kind: 'company', name: '', code: '', phone: '', address: '', fromForm: !!fromForm }; }
  blankOb(mode, a, c) {
    if (mode === 'edit' && c) return { mode: 'edit', owner: c.owner || '', form: c.form || 'შპს', name: c.name || '', code: c.code || '', phone: String(c.phone || '').replace(/^\+995/, '').replace(/\D/g, ''), city: c.city || 'ბათუმი', terms: true, logo: c.logo || '' };
    return { mode: 'register', owner: (a && a.owner) || '', form: 'შპს', name: '', code: '', phone: '', city: 'ბათუმი', terms: false, logo: '' };
  }
  sa(arr) {
    return arr.map(function (x, i) { return [x, i]; }).sort(function (A, B) {
      return A[0].date < B[0].date ? -1 : A[0].date > B[0].date ? 1 : A[1] - B[1];
    }).map(function (z) { return z[0]; });
  }
  sd(arr) { return this.sa(arr).reverse(); }
  pkeys(per) {
    var T = this.K().today, keys = [], i;
    if (per === 'day') { for (i = 6; i >= 0; i--) keys.push(this.add(T, -i)); }
    else if (per === 'week') { var ws = this.weekStart(T); for (i = 7; i >= 0; i--) keys.push(this.add(ws, -7 * i)); }
    else {
      var y0 = +T.slice(0, 4), m0 = +T.slice(5, 7);
      for (i = 5; i >= 0; i--) { var mm = m0 - i, yy = y0; while (mm < 1) { mm += 12; yy--; } keys.push(yy + '-' + this.pad2(mm)); }
    }
    return keys;
  }
  pkey(per, d) { return per === 'day' ? d : per === 'week' ? this.weekStart(d) : d.slice(0, 7); }
  phead(per, k, idx, last) {
    var K = this.K();
    if (per === 'day') return this.dLong(k);
    if (per === 'week') {
      var we = this.add(k, 6), a = this.dt(k), b = this.dt(we);
      var rng = a.getMonth() === b.getMonth() ? a.getDate() + '–' + b.getDate() + ' ' + K.months[b.getMonth()] : this.dShort(k) + ' – ' + this.dShort(we);
      return (idx === last ? 'ეს კვირა · ' : idx === last - 1 ? 'წინა კვირა · ' : '') + rng;
    }
    return (idx === last ? 'ეს თვე · ' : '') + K.months[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4);
  }
  plabel(per, k) {
    var K = this.K();
    if (per === 'day') return K.wdS[this.dt(k).getDay()];
    if (per === 'week') { var d = this.dt(k); return d.getDate() + '.' + this.pad2(d.getMonth() + 1); }
    return K.mon[+k.slice(5, 7) - 1];
  }

  seed() {
    var self = this, K = this.K(), T = K.today;
    var D = function (o) { return self.add(T, o); };
    var clients = [
      { id: 'c1', name: 'შპს დელტა ბილდი', kind: 'company', code: '', phone: '', address: 'ხიმშიაშვილის ქ. 12' },
      { id: 'c2', name: 'შპს ომეგა კონსტრაქშენ', kind: 'company', code: '', phone: '', address: 'ანგისის ქ. 7' },
      { id: 'c3', name: 'შპს ბეტა რემონტი', kind: 'company', code: '', phone: '', address: 'გორგილაძის ქ. 88' },
      { id: 'c4', name: 'გიორგი ბ.', kind: 'person', code: '', phone: '', address: 'ფიროსმანის ქ. 33' },
      { id: 'c5', name: 'შპს სიგმა დეველოპმენტი', kind: 'company', code: '', phone: '', address: 'ბაგრატიონის ქ. 102' },
      { id: 'c6', name: 'შპს კაპა სერვისი', kind: 'company', code: '', phone: '', address: 'ინასარიძის ქ. 4' }
    ];
    var addr = {};
    clients.forEach(function (c) { addr[c.id] = c.address; });
    var containers = [];
    [[4, 4], [5, 4], [7, 10], [10, 6], [20, 4]].forEach(function (vq) {
      for (var i = 1; i <= vq[1]; i++) {
        var code = 'K' + vq[0] + '-' + self.pad2(i);
        containers.push({ id: code, code: code, vol: vq[0], added: D(-240) });
      }
    });
    var volOf = {};
    containers.forEach(function (c) { volOf[c.code] = c.vol; });
    var trips = [], payments = [], n = 0;
    var TR = function (off, type, client, code, drv, newCode) {
      n++;
      var t = { id: 't' + n, date: D(off), type: type, client: client, cont: code, newCont: newCode || '', address: addr[client], driver: K.drivers[drv || 0], price: self.tariff(type, volOf[type === 'swap' ? newCode : code]) };
      trips.push(t);
      return t;
    };
    var P = function (off, client, amount, method, trip) {
      n++;
      payments.push({ id: 'p' + n, date: D(off), client: client, amount: amount, method: method, trip: trip ? trip.id : '' });
    };

    var seedN = 20261022;
    var rnd = function () {
      seedN = (seedN + 0x6D2B79F5) | 0;
      var t = Math.imul(seedN ^ (seedN >>> 15), 1 | seedN);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var hc = ['c1', 'c2', 'c4', 'c5', 'c6'];
    var hist = [];
    ['K7-07', 'K7-08', 'K10-03', 'K20-03', 'K4-03'].forEach(function (code, j) {
      var d = -186 + j * 3;
      while (d < -24) {
        var skip = 0.5 * Math.max(0, (-d - 20) / 170);
        if (rnd() < skip) { d += 3 + Math.floor(rnd() * 6); continue; }
        var cl = hc[Math.floor(rnd() * hc.length)], drv = Math.floor(rnd() * 4);
        var tt = TR(d, 'deliver', cl, code, drv); tt._o = d; hist.push(tt);
        var pu = Math.min(d + 4 + Math.floor(rnd() * 9), -10);
        tt = TR(pu, 'pickup', cl, code, drv); tt._o = pu; hist.push(tt);
        d = pu + 1 + Math.floor(rnd() * 5);
      }
    });
    var hb = {}, hk = [];
    hist.forEach(function (t) {
      var w = Math.floor((t._o + 200) / 14), key = t.client + '|' + w;
      if (!hb[key]) { hb[key] = { client: t.client, w: w, sum: 0 }; hk.push(key); }
      hb[key].sum += t.price;
      delete t._o;
    });
    hk.forEach(function (key) {
      var b = hb[key], end = b.w * 14 - 200 + 13;
      if (b.sum > 0) P(Math.min(end + 2 + Math.floor(rnd() * 5), -2), b.client, b.sum, rnd() < 0.3 ? 'cash' : 'bank');
    });

    var a1 = TR(-58, 'deliver', 'c3', 'K10-01', 0);
    TR(-50, 'deliver', 'c1', 'K7-01', 1);
    TR(-50, 'deliver', 'c1', 'K7-02', 1);
    TR(-44, 'swap', 'c3', 'K10-01', 0, 'K10-04');
    TR(-40, 'deliver', 'c2', 'K20-01', 3);
    TR(-37, 'swap', 'c1', 'K7-01', 1, 'K7-09');
    TR(-33, 'pickup', 'c3', 'K10-04', 0);
    TR(-30, 'deliver', 'c4', 'K4-01', 2);
    TR(-26, 'swap', 'c2', 'K20-01', 3, 'K20-02');
    TR(-23, 'pickup', 'c4', 'K4-01', 2);
    TR(-21, 'deliver', 'c5', 'K7-03', 0);
    TR(-21, 'deliver', 'c5', 'K10-02', 0);
    TR(-17, 'swap', 'c1', 'K7-02', 1, 'K7-04');
    TR(-14, 'deliver', 'c6', 'K7-05', 2);
    TR(-12, 'swap', 'c2', 'K20-02', 3, 'K20-01');
    TR(-9, 'swap', 'c5', 'K10-02', 0, 'K10-05');
    var a17 = TR(-7, 'deliver', 'c3', 'K7-06', 1);
    TR(-6, 'pickup', 'c6', 'K7-05', 2);
    TR(-5, 'swap', 'c1', 'K7-09', 1, 'K7-01');
    TR(-4, 'swap', 'c5', 'K7-03', 0, 'K5-01');
    TR(-3, 'swap', 'c1', 'K7-04', 1, 'K7-02');
    TR(-2, 'deliver', 'c2', 'K20-04', 3);
    TR(-1, 'swap', 'c3', 'K7-06', 1, 'K7-03');
    TR(-1, 'deliver', 'c6', 'K7-05', 2);
    var z1 = TR(0, 'deliver', 'c4', 'K4-02', 2);
    TR(0, 'swap', 'c1', 'K7-01', 1, 'K7-09');

    P(-56, 'c3', 290, 'cash', a1);
    P(-30, 'c1', 460, 'bank');
    P(-20, 'c2', 480, 'bank');
    P(-20, 'c4', 175, 'cash');
    P(-14, 'c5', 520, 'bank');
    P(-10, 'c1', 460, 'bank');
    P(-8, 'c2', 480, 'bank');
    P(-5, 'c3', 230, 'bank', a17);
    P(-4, 'c6', 230, 'cash');
    P(0, 'c4', 175, 'cash', z1);

    return { clients: clients, containers: containers, trips: trips, payments: payments };
  }

  S() {
    var D = this.props.data;
    if (!D) {
      if (!this._seed) {
        this._seed = this.seed();
        this._seed.acct = { provider: 'google', email: 'owner@example.com', owner: 'გიორგი მ.' };
        this._seed.company = { name: 'ალფა კონტეინერი', form: 'შპს', code: '405123456', phone: '+995 555 00 11 22', city: 'ბათუმი', owner: 'გიორგი მ.', provider: 'google', email: 'owner@example.com', logo: '', prices: null };
      }
      if (!this._seed.members) this._seed.members = [{ id: 'm1', name: 'ლევან ბერიძე', email: 'levan@example.com', created: '2026-10-12' }];
      D = this._seed;
    }
    if (!this._seed) this._seed = D;
    var live = !!this.props.data;
    var start = this.props.start || 'home';
    var screens = { login: 'login', onboard: 'onboard', profile: 'home', home: 'home', stats: 'home', trips: 'trips', 'new': 'new', swap: 'new', containers: 'containers', reg: 'containers', clients: 'clients', newclient: 'clients', client: 'client', pay: 'clients', cash: 'cash', debts: 'debts', tripact: 'trips', tripdel: 'trips', payask: 'containers', pickpay: 'trips', menu: 'home', prices: 'home', team: 'home' };
    var acct = D.acct || { provider: '', email: '', owner: '' };
    var nc = this.blankNc(false);
    if (start === 'newclient') { nc.name = 'შპს ალგო მშენებელი'; nc.address = 'ტბელ აბუსერიძის ქ. 21'; }
    var tSheet = '', nextInit = null, delAskInit = false;
    if (start === 'tripact' || start === 'tripdel' || start === 'pickpay') {
      var st0 = this._seed.trips;
      var pickT = start !== 'tripdel'
        ? st0.filter(function (t) { return t.type === 'swap'; }).pop()
        : st0.filter(function (t) { return t.type === 'deliver' && t.cont === 'K4-02'; }).pop();
      if (pickT) {
        tSheet = pickT.id;
        if (start === 'tripact') nextInit = { trip: pickT.id, mode: 'swap', vol: 5, cont: '', priceMode: 'same', price: '', date: this.K().today, driver: pickT.driver || '', paidNow: false, puPay: 'none', puAmt: null };
        else if (start === 'pickpay') nextInit = { trip: pickT.id, mode: 'pickup', vol: 7, cont: '', priceMode: 'same', price: '', date: this.K().today, driver: pickT.driver || '', paidNow: false, puPay: 'cash', puAmt: null };
        else delAskInit = true;
      }
    }
    var contSheet0 = '', payAsk0 = null;
    if (start === 'payask') { contSheet0 = 'K7-09'; payAsk0 = { code: 'K7-09', method: 'cash', ctx: 'cont' }; }
    if (start === 'pickpay') payAsk0 = { kind: 'pickup', src: 'next', amt: null, method: 'cash' };
    var base = {
      screen: screens[start] || 'home',
      period: start === 'stats' ? 'month' : 'week', statSel: -1, series: 'both',
      cfPeriod: 'week', cfSel: -1, cfMethod: 'all',
      clients: D.clients || [], containers: D.containers || [], trips: D.trips || [], payments: D.payments || [],
      filter: 'all', query: '', tripLimit: 30,
      contFilter: 'all', contVol: 0,
      clientQ: '', placeQ: '', picker: { open: null, q: '' },
      debtQ: '', debtFilter: 'all', debtSort: 'amount', debtsBack: 'home',
      clientId: live ? '' : (start === 'client' ? 'c3' : 'c1'), back: 'clients', clientTab: 'trips',
      form: this.blankForm(start === 'new' ? 'demo' : start === 'swap' ? 'swapdemo' : ''), formErr: '',
      sheet: tSheet ? 'trip' : contSheet0 ? 'cont' : start === 'prices' ? 'prices' : start === 'team' ? 'team' : start === 'reg' ? 'reg' : start === 'newclient' ? 'client-new' : start === 'pay' ? 'pay' : start === 'profile' ? 'profile' : null,
      tripSheet: tSheet, contSheet: contSheet0, payAsk: payAsk0, next: nextInit, nextErr: '', delAsk: delAskInit, delPays: true,
      pay: this.blankPay(!live && start === 'pay' ? 'c1' : '', false), payErr: '',
      nc: nc, ncErr: '',
      reg: { vol: '7', custom: '', other: false, qty: '10' }, regErr: '',
      registered: live ? !!D.company : !(start === 'login' || start === 'onboard'), authBusy: '', authErr: '', acct: acct,
      staffEmail: '', staffPass: '', staffShow: false, staffBusy: false,
      members: (D.members || []).slice(), teamForm: null, teamEdit: null, teamBusy: false, teamErr: '', teamCreated: null, teamCopied: false,
      company: D.company ? Object.assign({ logo: '' }, D.company) : { name: '', form: 'შპს', code: '', phone: '', city: 'ბათუმი', owner: acct.owner || '', provider: acct.provider || '', email: acct.email || '', logo: '' },
      menuOpen: start === 'menu', logoErr: '', prices: (D.company && D.company.prices && Object.keys(D.company.prices).length) ? D.company.prices : null, pricesDraft: null, pricesErr: '',
      ob: this.blankOb('register', acct), obErr: '',
      toast: ''
    };
    return Object.assign(base, this.state || {});
  }
  flash(patch, t) {
    var self = this;
    clearTimeout(this._t1); clearTimeout(this._tt); clearTimeout(this._t2);
    this.setState(Object.assign({}, patch, { toast: t, toastPh: 'enter' }));
    this._t1 = setTimeout(function () { self.setState({ toastPh: 'on' }); }, 40);
    this._tt = setTimeout(function () { self.setState({ toastPh: 'leave' }); }, 2500);
    this._t2 = setTimeout(function () { self.setState({ toast: null }); }, 2760);
  }
  genPass() {
    var A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    while (!(/\d/.test(out) && /[a-z]/.test(out) && /[A-Z]/.test(out))) {
      var r = new Uint32Array(10);
      (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(r) : r.forEach(function (_, i) { r[i] = Math.floor(Math.random() * 4294967295); });
      out = ''; for (var i = 0; i < r.length; i++) out += A.charAt(r[i] % A.length);
    }
    return out;
  }
  authMsg(er, fallback) {
    var m = String((er && er.message) || '');
    if ((er && er.code === 'invalid_credentials') || /invalid login credentials/i.test(m)) return 'ელფოსტა ან პაროლი არასწორია';
    if (/not confirmed/i.test(m)) return 'ელფოსტა დადასტურებული არ არის';
    if (/rate limit|too many/i.test(m)) return 'ძალიან ბევრი მცდელობა — სცადეთ ცოტა ხანში';
    if (/failed to fetch|network/i.test(m)) return 'ინტერნეტთან კავშირი ვერ დამყარდა';
    return m || fallback;
  }
  staffLogin() {
    var self = this, s = this.S();
    if (s.staffBusy) return;
    var em = String(s.staffEmail || '').trim().toLowerCase(), pw = String(s.staffPass || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { this.setState({ authErr: 'მიუთითეთ სწორი ელფოსტა' }); return; }
    if (!pw) { this.setState({ authErr: 'შეიყვანეთ პაროლი' }); return; }
    if (!this.props.api) {
      this.flash({ screen: s.registered ? 'home' : 'login', sheet: null, staffPass: '', authErr: '' }, { title: 'შესვლა შესრულდა', detail: em });
      return;
    }
    this.setState({ staffBusy: true, authErr: '' });
    // success reloads the page through onAuthStateChange
    this.props.api.signInPassword(em, pw).catch(function (er) {
      self.setState({ staffBusy: false, authErr: self.authMsg(er, 'შესვლა ვერ მოხერხდა') });
    });
  }
  teamCall(body) {
    if (this.props.api && this.props.api.team) return this.props.api.team(body);
    var self = this;
    return new Promise(function (res) {
      setTimeout(function () {
        if (body.action === 'add') res({ member: { user_id: self.uid(), name: body.name, email: body.email, created_at: new Date().toISOString() } });
        else res({ ok: true });
      }, 500);
    });
  }
  teamVals(s, set, val, LINE) {
    var self = this;
    var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    var members = s.members || [], tf = s.teamForm || { name: '', email: '', password: '' }, te = s.teamEdit || null;
    var setF = function (patch) { set({ teamForm: Object.assign({}, tf, patch), teamErr: '' }); };
    var fail = function (er) { self.setState({ teamBusy: false, teamErr: (er && er.message) || 'მოქმედება ვერ შესრულდა' }); };
    var ini = function (n) { var w = String(n || '').trim().split(/\s+/); return (((w[0] || '').charAt(0)) + ((w[1] || '').charAt(0))) || '?'; };
    var created = s.teamCreated;
    var rows = members.map(function (m, j) {
      var mine = te && te.id === m.id;
      var setE = function (patch) { set({ teamEdit: Object.assign({}, te, patch), teamErr: '' }); };
      return {
        name: m.name, email: m.email, initials: ini(m.name), border: j === 0 ? '0' : LINE,
        added: m.created ? 'დაემატა ' + self.dShort(String(m.created).slice(0, 10)) : '',
        idle: !mine, isPass: !!mine && te.mode === 'pass', isRemove: !!mine && te.mode === 'remove',
        newPass: mine && te.pass != null ? te.pass : '',
        startPass: function () { set({ teamEdit: { id: m.id, mode: 'pass', pass: self.genPass() }, teamErr: '', teamCreated: null }); },
        startRemove: function () { set({ teamEdit: { id: m.id, mode: 'remove' }, teamErr: '', teamCreated: null }); },
        cancel: function () { set({ teamEdit: null, teamErr: '' }); },
        setPass: function (e) { setE({ pass: String(val(e)).trim() }); },
        genPass: function () { setE({ pass: self.genPass() }); },
        savePass: function () {
          var pw = String((te && te.pass) || '');
          if (pw.length < 8) { set({ teamErr: 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო' }); return; }
          if (s.teamBusy) return;
          set({ teamBusy: true, teamErr: '' });
          self.teamCall({ action: 'password', user_id: m.id, password: pw }).then(function () {
            self.flash({ teamBusy: false, teamEdit: null, teamCopied: false, teamCreated: { title: 'პაროლი შეიცვალა', name: m.name, email: m.email, password: pw } },
              { title: 'პაროლი შეიცვალა', detail: m.name });
          }).catch(fail);
        },
        confirmRemove: function () {
          if (s.teamBusy) return;
          set({ teamBusy: true, teamErr: '' });
          self.teamCall({ action: 'remove', user_id: m.id }).then(function () {
            self.flash({ teamBusy: false, teamEdit: null, members: (self.S().members || []).filter(function (x) { return x.id !== m.id; }) },
              { title: 'თანამშრომელი წაიშალა', detail: m.name });
          }).catch(fail);
        }
      };
    });
    return {
      rows: rows, empty: members.length === 0, count: members.length ? String(members.length) : '',
      name: tf.name, email: tf.email, password: tf.password,
      setName: function (e) { setF({ name: val(e) }); },
      setEmail: function (e) { setF({ email: val(e) }); },
      setPassword: function (e) { setF({ password: String(val(e)).trim() }); },
      gen: function () { setF({ password: self.genPass() }); },
      busy: !!s.teamBusy, hasErr: !!s.teamErr, err: s.teamErr || '',
      addBtn: s.teamBusy && !te ? 'ემატება…' : 'თანამშრომლის დამატება',
      hasCreated: !!created, created: created || { title: '', name: '', email: '', password: '' },
      copyLabel: s.teamCopied ? 'დაკოპირდა' : 'კოპირება',
      copy: function () {
        if (!created) return;
        var txt = created.email + '\n' + created.password;
        try { navigator.clipboard.writeText(txt).then(function () { self.setState({ teamCopied: true }); }, function () {}); } catch (er) {}
      },
      hideCreated: function () { set({ teamCreated: null, teamCopied: false }); },
      add: function () {
        var name = String(tf.name || '').trim(), em = String(tf.email || '').trim().toLowerCase(), pw = String(tf.password || '');
        var err = !name ? 'მიუთითეთ თანამშრომლის სახელი'
          : !EMAIL.test(em) ? 'მიუთითეთ სწორი ელფოსტა'
          : pw.length < 8 ? 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო'
          : members.some(function (m) { return String(m.email).toLowerCase() === em; }) ? 'ეს თანამშრომელი უკვე დამატებულია'
          : '';
        if (err) { set({ teamErr: err }); return; }
        if (s.teamBusy) return;
        set({ teamBusy: true, teamErr: '', teamEdit: null });
        self.teamCall({ action: 'add', name: name, email: em, password: pw }).then(function (res) {
          var r = (res && res.member) || {};
          var m = { id: r.user_id, name: r.name || name, email: r.email || em, created: r.created_at || '' };
          self.flash({ teamBusy: false, members: (self.S().members || []).concat([m]), teamForm: { name: '', email: '', password: self.genPass() }, teamCopied: false,
            teamCreated: { title: 'თანამშრომელი დაემატა', name: m.name, email: m.email, password: pw } },
            { title: 'თანამშრომელი დაემატა', detail: m.name });
        }).catch(fail);
      }
    };
  }
  componentWillUnmount() { clearTimeout(this._t1); clearTimeout(this._tt); clearTimeout(this._t2); clearTimeout(this._at); }

  renderVals() {
    var self = this, K = this.K(), s = this.S(), T = K.today;
    var isOwner = (this.props.role || 'owner') === 'owner';
    var set = function (o) { self.setState(o); };
    var noop = function () {};
    var val = function (e) { return e && e.target ? e.target.value : e; };
    var LINE = '1px solid #E2E8F0';
    var CLOSED = { open: null, q: '' };
    var BLUE = '#145AFF', INK = '#020520';
    var seg = function (on) { return { bg: on ? '#F0F4FE' : '#FFFFFF', fg: on ? BLUE : '#374151', border: on ? BLUE : '#E2E8F0', weight: on ? 600 : 500, cc: on ? BLUE : '#6B7280' }; };
    var tabSt = function (on) { return { bg: on ? '#FFFFFF' : 'transparent', fg: on ? BLUE : '#374151', weight: on ? 600 : 500, shadow: on ? 'rgba(0,0,0,0.25) 0px 0px 4px -2px, rgba(0,0,0,0.06) 0px 1px 2px' : 'none' }; };

    var byId = {};
    s.clients.forEach(function (c) { byId[c.id] = c; });
    var volOf = {};
    s.containers.forEach(function (c) { volOf[c.code] = c.vol; });

    var L = {};
    s.clients.forEach(function (c) { L[c.id] = { billed: 0, paid: 0, trips: [], pays: [] }; });
    s.trips.forEach(function (t) { var l = L[t.client]; if (!l) return; l.billed += t.price; l.trips.push(t); });
    s.payments.forEach(function (p) { var l = L[p.client]; if (!l) return; l.paid += p.amount; l.pays.push(p); });
    var info = {};
    Object.keys(L).forEach(function (cid) {
      var c = L[cid], linked = {}, pool = 0, part = {}, multi = [];
      c.pays.forEach(function (p) {
        if (p.trips && p.trips.length) multi.push(p);
        else if (p.trip) linked[p.trip] = (linked[p.trip] || 0) + p.amount;
        else pool += p.amount;
      });
      var sorted = self.sa(c.trips);
      var priced = sorted.filter(function (t) { return t.price > 0; });
      sorted.forEach(function (t) { if (!(t.price > 0)) pool += linked[t.id] || 0; });
      priced.forEach(function (t) { var lk = linked[t.id] || 0, used = Math.min(lk, t.price); part[t.id] = used; pool += lk - used; });
      priced.forEach(function (t) { var a = Math.min(pool, t.price - part[t.id]); part[t.id] += a; pool -= a; });
      multi.forEach(function (p) {
        var rest = p.amount;
        priced.forEach(function (t) {
          if (rest > 0 && p.trips.indexOf(t.id) >= 0) { var a = Math.min(rest, t.price - part[t.id]); part[t.id] += a; rest -= a; }
        });
        pool += rest;
      });
      priced.forEach(function (t) { var a = Math.min(pool, t.price - part[t.id]); part[t.id] += a; pool -= a; });
      sorted.forEach(function (t) {
        var age = self.days(t.date);
        if (!(t.price > 0)) { info[t.id] = { part: 0, left: 0, st: 'incl', age: age }; return; }
        var pt = part[t.id];
        var st = pt >= t.price ? 'paid' : pt > 0 ? 'partial' : 'unpaid';
        if (st !== 'paid' && age > 30) st = 'overdue';
        info[t.id] = { part: pt, left: t.price - pt, st: st, age: age };
      });
      c.balance = c.billed - c.paid; c.open = 0;
      c.trips.forEach(function (t) { var st = info[t.id].st; if (st !== 'paid' && st !== 'incl') c.open++; });
      var lp = self.sa(c.pays).pop();
      c.lastPay = lp ? lp.date : null;
    });
    var isOpen = function (t) { var st = info[t.id] && info[t.id].st; return st && st !== 'paid' && st !== 'incl'; };

    var loc = {}, chist = {}, chainAt = {}, closeChain = {};
    var pushH = function (code, t) { if (code) (chist[code] = chist[code] || []).push(t); };
    this.sa(s.trips).forEach(function (t) {
      pushH(t.cont, t);
      if (t.type === 'deliver') {
        chainAt[t.cont] = [t.id];
        loc[t.cont] = { client: t.client, address: t.address, since: t.date, trip: t.id, chain: chainAt[t.cont] };
      } else if (t.type === 'pickup') {
        closeChain[t.id] = chainAt[t.cont] || [];
        chainAt[t.cont] = null; loc[t.cont] = null;
      } else if (t.type === 'swap') {
        var ch = (chainAt[t.cont] || []).concat([t.id]);
        chainAt[t.cont] = null; loc[t.cont] = null;
        if (t.newCont) { pushH(t.newCont, t); chainAt[t.newCont] = ch; loc[t.newCont] = { client: t.client, address: t.address, since: t.date, trip: t.id, chain: ch }; }
      }
    });
    var tById = {};
    s.trips.forEach(function (t) { tById[t.id] = t; });
    var chainSum = function (ids) {
      var r = { price: 0, left: 0, part: 0, overdue: false, trips: [], ids: [] };
      (ids || []).forEach(function (id) {
        var t = tById[id], inf = info[id];
        if (!t || !inf) return;
        r.trips.push(t); r.ids.push(id); r.price += t.price; r.left += inf.left || 0; r.part += inf.part || 0;
        if (inf.st === 'overdue') r.overdue = true;
      });
      r.st = r.price <= 0 ? 'incl' : r.left <= 0 ? 'paid' : r.overdue ? 'overdue' : r.part > 0 ? 'partial' : 'unpaid';
      return r;
    };
    var chainComp = function (r) {
      var nD = 0, nS = 0;
      r.trips.forEach(function (t) { if (t.type === 'deliver') nD++; else if (t.type === 'swap') nS++; });
      return (nD ? 'მიტანა' : '') + (nS ? (nD ? ' + ' : '') + nS + ' შეცვლა' : '');
    };
    var isFree = function (code) { return !loc[code]; };
    var activeCodeOf = function (t) {
      var code = t.type === 'deliver' ? t.cont : t.type === 'swap' ? t.newCont : '';
      return code && loc[code] && loc[code].trip === t.id ? code : '';
    };
    var contsSorted = s.containers.slice().sort(function (a, b) { return a.vol - b.vol || self.codeNum(a.code) - self.codeNum(b.code) || (a.code < b.code ? -1 : 1); });
    var vols = [], vs = {};
    contsSorted.forEach(function (c) {
      if (!vs[c.vol]) { vs[c.vol] = { total: 0, free: 0 }; vols.push(c.vol); }
      vs[c.vol].total++;
      if (isFree(c.code)) vs[c.vol].free++;
    });
    var priceOf = function (type, v) {
      if (type === 'pickup' || !(v > 0)) return 0;
      var x = s.prices ? +s.prices[String(v)] : 0;
      return x > 0 ? x : self.tariff(type, v);
    };
    var cFree = 0;
    contsSorted.forEach(function (c) { if (isFree(c.code)) cFree++; });

    var go = function (screen, extra) { set(Object.assign({ screen: screen, sheet: null, picker: CLOSED, menuOpen: false }, extra || {})); };
    var openClient = function (cid, back) { go('client', { clientId: cid, clientTab: 'trips', back: back }); };
    var openCont = function (code) { set({ sheet: 'cont', contSheet: code, contDelAsk: '' }); };
    var askMark = function (ids, method, ctx) { set({ payAsk: { ids: ids.slice(), method: method, ctx: ctx || 'trip' } }); };

    var tripCode = function (t) { return t.type === 'swap' && t.newCont ? t.cont + ' → ' + t.newCont : t.cont; };
    var tripVol = function (t) {
      if (t.type === 'swap' && t.newCont) {
        var a = volOf[t.cont], b = volOf[t.newCont];
        if (!a || !b) return (a || b) ? self.vb(a || b) : ''; // a deleted container keeps its trips, not its volume
        return a === b ? self.vb(b) : String(a).replace('.', ',') + '→' + String(b).replace('.', ',');
      }
      return volOf[t.cont] ? self.vb(volOf[t.cont]) : '';
    };
    var tripVM = function (t, mode, i) {
      var inf = info[t.id] || { st: 'unpaid' }, c = byId[t.client], tm = self.typeMeta(t.type);
      var isPu = t.type === 'pickup', stx = inf.st, p = self.pill(stx);
      var cs = self.short(c), l2 = cs + ' · ' + self.dShort(t.date), l3 = t.address;
      if (mode === 'grouped') { l2 = cs; l3 = t.address + (t.driver ? ' · ' + t.driver : ''); }
      if (mode === 'client') { l2 = t.address; l3 = self.dShort(t.date) + (t.driver ? ' · ' + t.driver : ''); }
      return {
        typeLabel: tm.label, code: tripCode(t), vol: tripVol(t), badgeBg: tm.solid, badgeFg: '#FFFFFF',
        typeFg: tm.solid, cardBg: tm.wash, cardLine: tm.line, active: !!activeCodeOf(t),
        l2: l2, l3: l3, amount: isPu ? '' : '+' + self.fmt(t.price), pill: p.t, dot: p.dot, hasPill: !isPu && stx !== 'incl',
        border: i === 0 ? '0' : LINE,
        open: function () { set({ sheet: 'trip', tripSheet: t.id, next: null, nextErr: '', delAsk: false, delPays: true }); }
      };
    };

    var PU0 = { has: false, due: '', dueN: 0, lines: [], canPay: false, allPaid: false, paidNote: '', methodSeg: [], paying: false, amount: '', amt: 0, method: 'none', setAmount: noop, quick: [], hasQuick: false, explain: '', ids: [], client: '', address: '', code: '' };
    var mkPU = function (code, st, setFn) {
      var lc = code ? loc[code] : null;
      if (!lc) return PU0;
      var r = chainSum(lc.chain), cBal = Math.max(0, L[lc.client] ? L[lc.client].balance : 0), due = r.left;
      var method = st.method === 'bank' ? 'bank' : 'cash';
      var amtStr = st.amt == null ? '' : String(st.amt);
      var amt = self.num(amtStr), paying = amt > 0;
      var quick = [];
      if (due > 0) quick.push(['სრული თანხა', due]);
      if (cBal > due) quick.push(['კლიენტის სრული ვალი', cBal]);
      var explain = !paying ? 'თანხას თუ არ შეიყვანთ, დადასტურდება მხოლოდ გატანა.'
        : amt < due ? 'დარჩება ვალი ' + self.fmt(due - amt) + '.'
        : amt === due ? 'ობიექტის ვალი სრულად დაიფარება.'
        : 'ზედმეტი ' + self.fmt(amt - due) + (amt > cBal ? ' — კლიენტის სხვა ვალს დაფარავს, დანარჩენი აისახება ავანსად.' : ' დაფარავს კლიენტის სხვა ვალს.');
      return {
        has: true, due: self.fmt(due), dueN: due,
        lines: r.trips.map(function (t, j) {
          var inf = info[t.id] || {};
          return { label: self.typeMeta(t.type).label + ' · ' + tripCode(t) + ' · ' + self.dShort(t.date), value: inf.left > 0 ? self.fmt(inf.left) : 'გადახდილია', color: inf.left > 0 ? INK : '#6B7280', border: j === 0 ? '0' : LINE };
        }),
        canPay: due > 0 || cBal > 0, allPaid: due <= 0, paidNote: 'ამ ობიექტზე ყველა რეისი გადახდილია.',
        methodSeg: [['cash', 'ნაღდით'], ['bank', 'გადარიცხვით']].map(function (x) {
          var on = method === x[0], s2 = tabSt(on);
          return { label: x[1], pressed: on, bg: s2.bg, fg: s2.fg, weight: s2.weight, shadow: s2.shadow, pick: function () { setFn({ method: x[0] }); } };
        }),
        paying: paying, amount: amtStr, amt: amt, method: method,
        setAmount: function (e) { setFn({ amt: val(e) }); },
        quick: quick.map(function (q) {
          var on = amt === q[1], s2 = seg(on);
          return { label: q[0], value: self.fmt(q[1]), pressed: on, bg: s2.bg, fg: s2.fg, border: s2.border, weight: s2.weight, pick: function () { setFn({ amt: String(q[1]) }); } };
        }),
        hasQuick: quick.length > 0, explain: explain,
        ids: r.ids, client: lc.client, address: lc.address, code: code
      };
    };

    var totalOut = 0;
    s.clients.forEach(function (c) { totalOut += Math.max(0, L[c.id].balance); });
    var debtors = s.clients.filter(function (c) { return L[c.id].balance > 0; }).sort(function (a, b) { return L[b.id].balance - L[a.id].balance; });
    var openTrips = 0;
    s.trips.forEach(function (t) { if (isOpen(t)) openTrips++; });
    var maxBal = debtors.length ? L[debtors[0].id].balance : 1;
    var topDebtors = debtors.slice(0, 4).map(function (c, i) {
      var l = L[c.id];
      return {
        name: self.short(c), amount: self.fmt(l.balance),
        barW: Math.max(4, Math.round(l.balance / maxBal * 100)) + '%', border: i === 0 ? '0' : LINE,
        open: function () { openClient(c.id, 'home'); }
      };
    });
    var recent = this.sd(s.trips).slice(0, 3).map(function (t, i) { return tripVM(t, 'home', i); });
    var volStats = vols.map(function (v, i) {
      var x = vs[v];
      return {
        label: self.vl(v), free: String(x.free), total: '/ ' + x.total,
        freeW: (x.total ? Math.round(x.free / x.total * 100) : 0) + '%', freeColor: x.free ? INK : '#C2362A',
        border: i === 0 ? '0' : LINE,
        open: function () { go('containers', { contVol: v, contFilter: 'all' }); }
      };
    });

    var per = s.period, keys = this.pkeys(per), last = keys.length - 1;
    var B = {};
    keys.forEach(function (k) { B[k] = { n: 0, recv: 0, debt: 0, deliver: 0, pickup: 0, swap: 0 }; });
    s.trips.forEach(function (t) { var b = B[self.pkey(per, t.date)]; if (!b) return; b.n++; b[t.type]++; if (info[t.id]) b.debt += info[t.id].left; });
    s.payments.forEach(function (p) { var b = B[self.pkey(per, p.date)]; if (b) b.recv += p.amount; });
    var ser = s.series, showR = ser !== 'debt', showD = ser !== 'recv';
    var mx = 1;
    keys.forEach(function (k) { mx = Math.max(mx, showR ? B[k].recv : 0, showD ? B[k].debt : 0); });
    var hgt = function (v) { return v > 0 ? Math.max(3, Math.round(v / mx * 104)) : 0; };
    var bw = ser === 'both' ? '10px' : '18px';
    var sel = s.statSel >= 0 && s.statSel <= last ? s.statSel : last;
    var bars = keys.map(function (k, idx) {
      var b = B[k], on = idx === sel;
      return {
        hR: (showR ? hgt(b.recv) : 0) + 'px', wR: showR ? bw : '0px',
        hD: (showD ? hgt(b.debt) : 0) + 'px', wD: showD ? bw : '0px',
        label: self.plabel(per, k), bg: on ? '#F0F4FE' : 'transparent', fw: on ? 600 : 400, lc: on ? BLUE : '#6B7280', pressed: on,
        aria: self.phead(per, k, idx, last) + ': ' + b.n + ' რეისი, ჩარიცხული ' + self.fmt(b.recv) + ', ასაღები ვალი ' + self.fmt(b.debt),
        pick: function () { set({ statSel: idx }); }
      };
    });
    var SB = B[keys[sel]];
    var statTiles = [{ label: 'რეისი', value: String(SB.n), color: INK, dot: 'transparent', dotW: '0px' }];
    if (showR) statTiles.push({ label: 'ჩარიცხული', value: this.fmt(SB.recv), color: BLUE, dot: BLUE, dotW: '6px' });
    if (showD) statTiles.push({ label: 'ასაღები ვალი', value: this.fmt(SB.debt), color: INK, dot: '#FFA64D', dotW: '6px' });
    var periodSeg = [['day', 'დღე'], ['week', 'კვირა'], ['month', 'თვე']].map(function (x) {
      var on = per === x[0], st = tabSt(on);
      return { label: x[1], pressed: on, bg: st.bg, fg: st.fg, weight: st.weight, shadow: st.shadow, pick: function () { set({ period: x[0], statSel: -1 }); } };
    });
    var seriesSeg = [['recv', 'ჩარიცხული', [BLUE]], ['debt', 'ასაღები ვალი', ['#FFA64D']], ['both', 'ორივე', [BLUE, '#FFA64D']]].map(function (x) {
      var on = ser === x[0], st = tabSt(on);
      return { label: x[1], pressed: on, bg: st.bg, fg: st.fg, weight: st.weight, shadow: st.shadow, dots: x[2].map(function (c) { return { c: c }; }), pick: function () { set({ series: x[0] }); } };
    });

    var cp = s.cfPeriod, ckeys = this.pkeys(cp), clast = ckeys.length - 1;
    var C = {};
    ckeys.forEach(function (k) { C[k] = { bank: 0, cash: 0, n: 0 }; });
    s.payments.forEach(function (p) { var b = C[self.pkey(cp, p.date)]; if (!b) return; b[p.method === 'cash' ? 'cash' : 'bank'] += p.amount; b.n++; });
    var cmx = 1;
    ckeys.forEach(function (k) { cmx = Math.max(cmx, C[k].bank + C[k].cash); });
    var csel = s.cfSel >= 0 && s.cfSel <= clast ? s.cfSel : clast;
    var cfBars = ckeys.map(function (k, idx) {
      var b = C[k], on = idx === csel, tot = b.bank + b.cash;
      var ht = tot > 0 ? Math.max(4, Math.round(tot / cmx * 112)) : 0;
      var hc = tot > 0 ? Math.round(ht * b.cash / tot) : 0;
      return {
        hTot: ht + 'px', hCash: hc + 'px', sep: b.cash > 0 && b.bank > 0 ? '1px solid #FFFFFF' : '0',
        label: self.plabel(cp, k), bg: on ? '#F0F4FE' : 'transparent', fw: on ? 600 : 400, lc: on ? BLUE : '#6B7280', pressed: on,
        aria: self.phead(cp, k, idx, clast) + ': გადარიცხვით ' + self.fmt(b.bank) + ', ნაღდით ' + self.fmt(b.cash),
        pick: function () { set({ cfSel: idx }); }
      };
    });
    var CS = C[ckeys[csel]], cselKey = ckeys[csel];
    var cfPeriodSeg = [['day', 'დღე'], ['week', 'კვირა'], ['month', 'თვე']].map(function (x) {
      var on = cp === x[0], st = tabSt(on);
      return { label: x[1], pressed: on, bg: st.bg, fg: st.fg, weight: st.weight, shadow: st.shadow, pick: function () { set({ cfPeriod: x[0], cfSel: -1 }); } };
    });
    var inSel = s.payments.filter(function (p) { return self.pkey(cp, p.date) === cselKey; });
    var cfMethodChips = [['all', 'ყველა'], ['bank', 'გადარიცხვა'], ['cash', 'ნაღდი']].map(function (x) {
      var on = s.cfMethod === x[0], st = seg(on);
      var cnt = inSel.filter(function (p) { return x[0] === 'all' || (x[0] === 'cash') === (p.method === 'cash'); }).length;
      return { label: x[1], count: String(cnt), pressed: on, bg: st.bg, fg: st.fg, border: st.border, weight: st.weight, cc: st.cc, pick: function () { set({ cfMethod: x[0] }); } };
    });
    var cfList = this.sd(inSel.filter(function (p) { return s.cfMethod === 'all' || (s.cfMethod === 'cash') === (p.method === 'cash'); })).slice(0, 60).map(function (p, j) {
      var cash = p.method === 'cash';
      return {
        title: self.short(byId[p.client]), meta: self.dShort(p.date) + ' · ' + (cash ? 'ნაღდი' : 'გადარიცხვა') + (p.trip ? ' · რეისზე' : p.trips ? ' · ობიექტის რეისებზე' : ''),
        amount: '+' + self.fmt(p.amount),
        isCash: cash, isBank: !cash, iconBg: cash ? '#F1F5F9' : '#F0F4FE', iconFg: cash ? '#374151' : BLUE,
        border: j === 0 ? '0' : LINE,
        open: function () { openClient(p.client, 'cash'); }
      };
    });

    var qRaw = String(s.query || '').trim().toLowerCase();
    var qC = qRaw.replace(/\s+/g, '').toUpperCase();
    var matchQ = function (t) {
      if (!qRaw) return true;
      var c = byId[t.client];
      return (t.cont + (t.newCont || '')).toUpperCase().indexOf(qC) >= 0 ||
        (c && c.name.toLowerCase().indexOf(qRaw) >= 0) ||
        String(t.address).toLowerCase().indexOf(qRaw) >= 0;
    };
    var fdefs = [
      ['all', 'ყველა', function () { return true; }],
      ['active', 'აქტიური', function (t) { return !!activeCodeOf(t); }],
      ['open', 'გადაუხდელი', function (t) { return isOpen(t); }],
      ['overdue', 'ვადაგადაცილებული', function (t) { return info[t.id].st === 'overdue'; }],
      ['paid', 'გადახდილი', function (t) { return info[t.id].st === 'paid'; }]
    ];
    var baseTrips = s.trips.filter(matchQ);
    var filters = fdefs.map(function (fd) {
      var on = s.filter === fd[0], st = seg(on);
      return {
        label: fd[1], count: baseTrips.filter(fd[2]).length, pressed: on, bg: st.bg, fg: st.fg, border: st.border, weight: st.weight, cc: st.cc,
        pick: function () { set({ filter: fd[0], tripLimit: 30 }); }
      };
    });
    var fsel = fdefs.filter(function (fd) { return fd[0] === s.filter; })[0] || fdefs[0];
    var tlist = this.sd(baseTrips.filter(fsel[2]));
    var shown = tlist.slice(0, s.tripLimit);
    var groups = [], cur = null;
    shown.forEach(function (t) {
      if (!cur || cur.date !== t.date) { cur = { date: t.date, items: [], sum: 0 }; groups.push(cur); }
      cur.items.push(t); cur.sum += t.price;
    });
    var tripGroups = groups.map(function (g) {
      return { label: self.dLong(g.date), sum: self.fmt(g.sum), items: g.items.map(function (t, j) { return tripVM(t, 'grouped', j); }) };
    });

    var pk = s.picker || CLOSED;
    var cmatch = function (c, q) {
      if (!q) return true;
      return [c.name, c.code, c.phone, c.address].join(' ').toLowerCase().indexOf(q) >= 0;
    };
    var byName = function (a, b) { return self.short(a).localeCompare(self.short(b), 'ka'); };
    var mkPicker = function (ctx, selId, onPick, subOf, order) {
      var open = pk.open === ctx, q = String(pk.q || '').trim().toLowerCase();
      var all = order.filter(function (c) { return cmatch(c, q); });
      var items = all.slice(0, 60).map(function (c, j) {
        var on = selId === c.id;
        return { name: c.name, sub: subOf(c), on: on, bg: on ? '#F0F4FE' : '#FFFFFF', border: j === 0 ? '0' : LINE, pick: function () { onPick(c); } };
      });
      var selC = selId ? byId[selId] : null;
      return {
        open: open, query: pk.q || '', items: items, empty: items.length === 0,
        hasMore: all.length > 60, moreNote: 'ნაჩვენებია 60, სულ ' + all.length + ' — დააზუსტეთ ძებნა',
        label: selC ? selC.name : 'აირჩიეთ კლიენტი', sub: selC ? subOf(selC) : 'სულ ' + order.length + ' კლიენტი — შეეხეთ ასარჩევად',
        labelColor: selC ? '#14141E' : '#6B7280', border: open ? BLUE : '#E2E8F0',
        chevron: open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6',
        toggle: function () { set({ picker: open ? CLOSED : { open: ctx, q: '' } }); },
        setQuery: function (e) { set({ picker: { open: ctx, q: val(e) } }); }
      };
    };

    var fm = s.form;
    var setF = function (patch) { set({ form: Object.assign({}, fm, patch), formErr: '' }); };
    var fv = +fm.vol;
    var needsNew = fm.type !== 'pickup';
    var freeList = contsSorted.filter(function (c) { return c.vol === fv && isFree(c.code); });
    var effCont = '';
    if (needsNew) effCont = (fm.cont && volOf[fm.cont] === fv && isFree(fm.cont)) ? fm.cont : (freeList[0] ? freeList[0].code : '');
    var placeQ = String(s.placeQ || '').trim().toLowerCase();
    var places = contsSorted.filter(function (c) { return !isFree(c.code); });
    var placesShown = places.filter(function (c) {
      if (!placeQ) return true;
      var lc = loc[c.code], cl = byId[lc.client];
      return (c.code + ' ' + (cl ? cl.name : '') + ' ' + lc.address).toLowerCase().indexOf(placeQ) >= 0;
    });
    var effPlace = (fm.type !== 'deliver' && fm.place && loc[fm.place]) ? fm.place : '';
    var effVol = needsNew ? fv : 0;
    var tariffNow = priceOf(fm.type, effVol);
    var priceVal = fm.priceAuto ? (tariffNow ? String(tariffNow) : '') : fm.price;
    var f = {
      date: function (e) { setF({ date: val(e) }); },
      driver: function (e) { setF({ driver: val(e) }); },
      address: function (e) { setF({ address: val(e) }); },
      price: function (e) { setF({ price: val(e), priceAuto: false }); },
      paidNow: function (e) { setF({ paidNow: e && e.target ? !!e.target.checked : !fm.paidNow }); }
    };
    var typeSeg = [['deliver', 'მიტანა'], ['pickup', 'გატანა'], ['swap', 'შეცვლა']].map(function (x) {
      var on = fm.type === x[0], st = Object.assign({}, tabSt(on), on ? { fg: self.typeMeta(x[0]).solid } : {});
      return { label: x[1], pressed: on, bg: st.bg, fg: st.fg, weight: st.weight, shadow: st.shadow, pick: function () { set({ form: Object.assign({}, fm, { type: x[0], priceAuto: true }), formErr: '', placeQ: '', picker: CLOSED }); } };
    });
    var typeHint = fm.type === 'deliver' ? 'ცარიელი კონტეინერი მიდის ობიექტზე.'
      : fm.type === 'pickup' ? 'კონტეინერი ბრუნდება საწყობში და თავისუფლდება.'
      : 'სავსე კონტეინერი ბრუნდება, ობიექტზე რჩება ახალი — ნებისმიერი თავისუფალი, სხვა მოცულობისაც.';
    var cpForm = mkPicker('form', fm.client, function (c) {
      set({ form: Object.assign({}, fm, { client: c.id, address: c.address || fm.address }), picker: CLOSED, formErr: '' });
    }, function (c) { return c.address || (c.phone || ''); }, s.clients.slice().sort(byName));
    var volChips = vols.map(function (v) {
      var fr = vs[v].free, on = fv === v, dis = fr === 0;
      return {
        label: self.vl(v), sub: fr ? fr + ' თავისუფალი' : 'არ არის', pressed: on, disabled: dis,
        bg: on ? '#F0F4FE' : dis ? '#F1F5F9' : '#FFFFFF', fg: on ? BLUE : dis ? '#6B7280' : INK, border: on ? BLUE : '#E2E8F0', sc: on ? BLUE : '#6B7280',
        pick: function () { if (!dis) setF({ vol: v, cont: '', priceAuto: true }); }
      };
    });
    var freeChips = freeList.map(function (c) {
      var on = effCont === c.code, st = seg(on);
      return { code: c.code, pressed: on, bg: st.bg, fg: on ? BLUE : INK, border: st.border, pick: function () { setF({ cont: c.code }); } };
    });
    var placeRows = placesShown.map(function (c, j) {
      var lc = loc[c.code], on = effPlace === c.code;
      return {
        code: c.code, vol: self.vb(c.vol), client: self.short(byId[lc.client]),
        sub: lc.address + ' · ' + self.days(lc.since) + ' დღე ობიექტზე',
        bg: on ? '#F0F4FE' : '#FFFFFF', ring: on ? BLUE : '#CBD5E1', dot: on ? BLUE : '#FFFFFF',
        pressed: on, border: j === 0 ? '0' : LINE,
        pick: function () {
          var patch = { place: c.code, puAmt: null };
          if (fm.type === 'swap') { patch.vol = c.vol; patch.cont = ''; patch.priceAuto = true; }
          setF(patch);
        }
      };
    });
    var priceHint = tariffNow ? (fm.type === 'swap' ? 'ტარიფი ახალი კონტეინერის მიხედვით: ' : 'ტარიფი: ') + this.vl(effVol) + ' — ' + this.fmt(tariffNow) : '';
    var priceReset = (!fm.priceAuto && tariffNow && this.num(fm.price) !== tariffNow)
      ? { show: true, text: 'ტარიფის დაბრუნება — ' + this.fmt(tariffNow), go: function () { setF({ priceAuto: true }); } }
      : { show: false, text: '', go: noop };
    var saveTrip = function (confirmed) {
      var price = fm.type === 'pickup' ? 0 : self.num(priceVal), err = '', date = fm.date || T, t, id = self.uid();
      var drv = String(fm.driver).trim();
      if (fm.type === 'deliver') {
        if (!fm.client) err = 'აირჩიეთ კლიენტი';
        else if (!String(fm.address).trim()) err = 'მიუთითეთ ობიექტის მისამართი';
        else if (!effCont) err = 'ამ მოცულობის თავისუფალი კონტეინერი არ არის';
      } else if (!effPlace) err = 'აირჩიეთ ობიექტზე მდგარი კონტეინერი';
      else if (fm.type === 'swap' && !effCont) err = 'აირჩიეთ ახალი კონტეინერი';
      if (!err && fm.type !== 'pickup' && !(price > 0)) err = 'მიუთითეთ ფასი';
      if (err) { set({ formErr: err }); return; }
      if (fm.type === 'pickup' && confirmed !== true) { set({ payAsk: { kind: 'pickup', src: 'form', amt: null, method: 'cash' } }); return; }
      var fpp = fm.type === 'pickup' ? mkPU(effPlace, s.payAsk || {}, noop) : PU0;
      var puPaid = fpp.paying;
      if (fm.type === 'deliver') {
        t = { id: id, date: date, type: 'deliver', client: fm.client, cont: effCont, newCont: '', address: String(fm.address).trim(), driver: drv, price: price };
      } else {
        var lc = loc[effPlace];
        t = { id: id, date: date, type: fm.type, client: lc.client, cont: effPlace, newCont: fm.type === 'swap' ? effCont : '', address: lc.address, driver: drv, price: price };
      }
      var pays = s.payments;
      if (fm.paidNow && price > 0) pays = pays.concat([{ id: self.uid(), date: date, client: t.client, amount: price, method: 'cash', trip: id }]);
      if (puPaid) pays = pays.concat([{ id: self.uid(), date: date, client: t.client, amount: fpp.amt, method: fpp.method, trips: fpp.ids }]);
      self.flash({ trips: s.trips.concat([t]), payments: pays, screen: 'trips', sheet: null, picker: CLOSED, filter: 'all', query: '', tripLimit: 30, placeQ: '', form: self.blankForm(''), formErr: '', payAsk: null },
        puPaid ? { title: 'გატანა და გადახდა აისახა', amount: '+' + self.fmt(fpp.amt), detail: t.cont + ' · ' + self.short(byId[t.client]) + ' · ' + (fpp.method === 'cash' ? 'ნაღდი' : 'გადარიცხვა') } : { title: 'რეისი შენახულია', amount: price > 0 ? self.fmt(price) : '', detail: self.typeMeta(t.type).label + ' · ' + tripCode(t) + ' · ' + self.short(byId[t.client]) + (fm.paidNow && price > 0 ? ' · გადახდილია ადგილზე' : '') });
    };

    var cv = s.contVol, cf = s.contFilter;
    var inVol = contsSorted.filter(function (c) { return !cv || c.vol === cv; });
    var contChips = [['all', 'ყველა'], ['free', 'თავისუფალი'], ['busy', 'ობიექტზე']].map(function (x) {
      var cnt = inVol.filter(function (c) { return x[0] === 'all' || (x[0] === 'free') === isFree(c.code); }).length;
      var on = cf === x[0], st = seg(on);
      return { label: x[1], count: String(cnt), pressed: on, bg: st.bg, fg: st.fg, border: st.border, weight: st.weight, cc: st.cc, pick: function () { set({ contFilter: x[0] }); } };
    });
    var contRows = inVol.filter(function (c) { return cf === 'all' || (cf === 'free') === isFree(c.code); }).map(function (c, j) {
      var lc = loc[c.code];
      return {
        code: c.code, vol: self.vb(c.vol),
        pill: lc ? 'ობიექტზე' : 'თავისუფალი', dot: lc ? '#FFA64D' : '#16CA2E',
        sub: lc ? self.short(byId[lc.client]) + ' · ' + lc.address : 'საწყობში',
        days: lc ? self.days(lc.since) + ' დღე' : '', border: j === 0 ? '0' : LINE,
        open: function () { openCont(c.code); }
      };
    });
    var volCards = vols.map(function (v) {
      var x = vs[v], on = cv === v;
      return {
        label: self.vl(v), total: String(x.total), freeText: x.free + ' თავისუფალი', busyText: (x.total - x.free) + ' ობიექტზე',
        freeW: (x.total ? Math.round(x.free / x.total * 100) : 0) + '%', freeColor: x.free ? BLUE : '#C2362A',
        pressed: on, bg: on ? '#F0F4FE' : '#FFFFFF', border: on ? BLUE : '#E2E8F0',
        pick: function () { set({ contVol: on ? 0 : v }); }
      };
    });

    var csC = s.contSheet ? contsSorted.filter(function (c) { return c.code === s.contSheet; })[0] : null;
    var cs = { code: '', vol: '', volLabel: '', status: '', statusSub: '', dot: '#16CA2E', free: false, busy: false, hist: [], noHist: true, deliver: noop, pickup: noop, swap: noop, hasDue: false, dueLeft: '', dueTrip: '', markBank: noop, markCash: noop,
      canDelete: false, delAsk: false, delBlocked: false, delText: '', askDelete: noop, cancelDelete: noop, confirmDelete: noop };
    if (csC) {
      var clc = loc[csC.code], h = (chist[csC.code] || []).slice().reverse().slice(0, 6);
      var hLabel = function (t) {
        if (t.type !== 'swap') return self.typeMeta(t.type).label;
        return t.newCont === csC.code ? 'შეცვლა — დატოვეს' : 'შეცვლა — გაიტანეს';
      };
      cs = {
        code: csC.code, vol: this.vb(csC.vol), volLabel: this.vl(csC.vol) + ' კონტეინერი',
        free: !clc, busy: !!clc,
        status: clc ? 'ობიექტზეა — ' + this.short(byId[clc.client]) : 'თავისუფალია',
        statusSub: clc ? clc.address + ' · ' + this.dShort(clc.since) + '-დან, ' + this.days(clc.since) + ' დღე' : (h.length ? 'საწყობში · ბოლო რეისი ' + this.dShort(h[0].date) : 'საწყობში · ახალი'),
        dot: clc ? '#FFA64D' : '#16CA2E',
        hist: h.map(function (t, j) { return { k: self.dShort(t.date) + ' · ' + hLabel(t), v: self.short(byId[t.client]), border: j === 0 ? '0' : LINE }; }),
        noHist: !h.length,
        deliver: function () { go('new', { form: self.blankForm('', { type: 'deliver', vol: csC.vol, cont: csC.code }), formErr: '', placeQ: '' }); },
        pickup: function () { go('new', { form: self.blankForm('', { type: 'pickup', place: csC.code }), formErr: '', placeQ: '' }); },
        swap: function () { go('new', { form: self.blankForm('', { type: 'swap', place: csC.code, vol: csC.vol }), formErr: '', placeQ: '' }); },
        hasDue: false, dueLeft: '', dueTrip: '', markBank: noop, markCash: noop
      };
      // delete: owner only, and only a container standing in the warehouse; its past trips stay in history
      var nTrips = (chist[csC.code] || []).length, cDelAsk = !!s.contDelAsk && s.contDelAsk === csC.code;
      cs.canDelete = isOwner && !clc && !cDelAsk;
      cs.delAsk = isOwner && !clc && cDelAsk;
      cs.delBlocked = isOwner && !!clc;
      cs.delText = nTrips
        ? csC.code + ' გაქრება კონტეინერების სიიდან. მისი ' + nTrips + ' რეისი ისტორიაში დარჩება, ვალები და ჩარიცხვები არ შეიცვლება.'
        : csC.code + ' გაქრება კონტეინერების სიიდან. რეისებში ჯერ არ ყოფილა.';
      cs.askDelete = function () { if (isOwner) set({ contDelAsk: csC.code }); };
      cs.cancelDelete = function () { set({ contDelAsk: '' }); };
      cs.confirmDelete = function () {
        if (!isOwner || loc[csC.code]) return;
        self.flash({ containers: s.containers.filter(function (c) { return c.id !== csC.id; }), sheet: null, contSheet: '', contDelAsk: '' },
          { title: 'კონტეინერი წაიშალა', detail: csC.code + ' · ' + self.vl(csC.vol) });
      };
      var cr = clc ? chainSum(clc.chain) : null;
      if (cr && cr.left > 0) {
        cs.hasDue = true;
        cs.dueLeft = this.fmt(cr.left);
        cs.dueTrip = chainComp(cr) + ' · ' + this.short(byId[clc.client]);
        cs.markBank = function () { askMark(cr.ids, 'bank', 'cont'); };
        cs.markCash = function () { askMark(cr.ids, 'cash', 'cont'); };
      }
    }

    var rg = s.reg;
    var setR = function (patch) { set({ reg: Object.assign({}, rg, patch), regErr: '' }); };
    var rVol = rg.other ? this.num(rg.custom) : +rg.vol;
    var rQty = parseInt(String(rg.qty).replace(/\D/g, ''), 10) || 0;
    var rPrefix = 'K' + String(rVol) + '-';
    var rMax = 0;
    s.containers.forEach(function (c) { if (c.code.indexOf(rPrefix) === 0) rMax = Math.max(rMax, self.codeNum(c.code)); });
    s.trips.forEach(function (t) { [t.cont, t.newCont].forEach(function (c) { if (c && c.indexOf(rPrefix) === 0) rMax = Math.max(rMax, self.codeNum(c)); }); });
    var rW = Math.max(2, String(rMax + rQty).length);
    var rCode = function (k) { var x = String(k); while (x.length < rW) x = '0' + x; return rPrefix + x; };
    var rOk = rVol > 0 && rQty > 0 && rQty <= 200;
    var rPreview = rOk ? (rQty === 1 ? rCode(rMax + 1) : rCode(rMax + 1) + ' … ' + rCode(rMax + rQty)) : '—';
    var rHave = vs[rVol] ? vs[rVol].total : 0;
    var regVolChips = K.vols.map(function (v) {
      var on = !rg.other && +rg.vol === v, st = seg(on);
      return { label: String(v), pressed: on, bg: st.bg, fg: on ? BLUE : INK, border: st.border, weight: st.weight, pick: function () { setR({ vol: String(v), other: false }); } };
    });
    var ro = seg(!!rg.other);
    var regOther = { pressed: !!rg.other, bg: ro.bg, fg: ro.fg, border: ro.border, weight: ro.weight, pick: function () { setR({ other: true }); } };
    var regQuick = [1, 5, 10, 20].map(function (q) {
      var on = rQty === q, st = seg(on);
      return { label: String(q), pressed: on, bg: st.bg, fg: on ? BLUE : INK, border: st.border, weight: st.weight, pick: function () { setR({ qty: String(q) }); } };
    });
    var saveReg = function () {
      var err = '';
      if (!(rVol > 0)) err = 'მიუთითეთ მოცულობა';
      else if (!(rQty > 0)) err = 'მიუთითეთ რაოდენობა';
      else if (rQty > 200) err = 'ერთ ჯერზე მაქსიმუმ 200 კონტეინერი';
      if (err) { set({ regErr: err }); return; }
      var addC = [];
      for (var k = 1; k <= rQty; k++) { var code = rCode(rMax + k); addC.push({ id: self.uid(), code: code, vol: rVol, added: T }); }
      self.flash({ containers: s.containers.concat(addC), sheet: null, screen: 'containers', contVol: rVol, contFilter: 'all', regErr: '' },
        { title: rQty === 1 ? 'კონტეინერი შეიქმნა' : 'კონტეინერები შეიქმნა', amount: rQty + ' × ' + self.vl(rVol), detail: rPreview });
    };

    var siteCount = {};
    Object.keys(loc).forEach(function (code) { var lc = loc[code]; if (lc) siteCount[lc.client] = (siteCount[lc.client] || 0) + 1; });
    var cq = String(s.clientQ || '').trim().toLowerCase();
    var clientsShown = s.clients.filter(function (c) { return cmatch(c, cq); }).sort(function (a, b) { return L[b.id].balance - L[a.id].balance || byName(a, b); });
    var clientRows = clientsShown.slice(0, 80).map(function (c, j) {
      var l = L[c.id], w = self.short(c).split(' '), sc = siteCount[c.id] || 0;
      return {
        name: self.short(c), initials: (w[0] ? w[0].charAt(0) : '') + (w[1] ? w[1].charAt(0) : ''),
        sub: l.balance > 0 ? l.open + ' გადაუხდელი რეისი' : l.balance < 0 ? 'ავანსი' : 'დავალიანება არ აქვს',
        sub2: sc ? sc + ' კონტეინერი ობიექტზე' : (l.lastPay ? 'ბოლო ჩარიცხვა: ' + self.dShort(l.lastPay) : (l.trips.length ? 'ობიექტზე კონტეინერი არ დგას' : 'ახალი კლიენტი')),
        amount: l.balance < 0 ? '+' + self.fmt(-l.balance) : self.fmt(l.balance),
        amtColor: l.balance > 0 ? INK : '#6B7280',
        border: j === 0 ? '0' : LINE,
        open: function () { openClient(c.id, 'clients'); }
      };
    });

    var mKey = T.slice(0, 7), mBank = 0, mCash = 0;
    s.payments.forEach(function (p) { if (String(p.date).slice(0, 7) === mKey) { if (p.method === 'cash') mCash += p.amount; else mBank += p.amount; } });

    var dAgg = {}, overdueTotal = 0;
    s.trips.forEach(function (t) {
      var inf = info[t.id];
      if (!inf || !(inf.left > 0) || !(L[t.client] && L[t.client].balance > 0)) return;
      var d = dAgg[t.client] || (dAgg[t.client] = { overdue: 0, oldest: 0 });
      if (inf.st === 'overdue') { d.overdue += inf.left; overdueTotal += inf.left; }
      d.oldest = Math.max(d.oldest, inf.age);
    });
    var dOf = function (c) { return dAgg[c.id] || { overdue: 0, oldest: 0 }; };
    var dq = String(s.debtQ || '').trim().toLowerCase();
    var debtBase = debtors.filter(function (c) { return cmatch(c, dq); });
    var debtFilters = [['all', 'ყველა'], ['overdue', 'ვადაგადაცილებული']].map(function (x) {
      var on = s.debtFilter === x[0], st = seg(on);
      var cnt = debtBase.filter(function (c) { return x[0] === 'all' || dOf(c).overdue > 0; }).length;
      return { label: x[1], count: String(cnt), pressed: on, bg: st.bg, fg: st.fg, border: st.border, weight: st.weight, cc: st.cc, pick: function () { set({ debtFilter: x[0] }); } };
    });
    var byAge = s.debtSort === 'age';
    var debtShown = debtBase.filter(function (c) { return s.debtFilter !== 'overdue' || dOf(c).overdue > 0; }).sort(function (a, b) {
      var bal = L[b.id].balance - L[a.id].balance;
      return byAge ? (dOf(b).oldest - dOf(a).oldest || bal) : bal;
    });
    var debtRows = debtShown.slice(0, 100).map(function (c, j) {
      var l = L[c.id], di = dOf(c), w = self.short(c).split(' '), od = di.overdue > 0;
      return {
        name: self.short(c), initials: (w[0] ? w[0].charAt(0) : '') + (w[1] ? w[1].charAt(0) : ''),
        amount: self.fmt(l.balance),
        sub: l.open + ' გადაუხდელი რეისი · უძველესი ' + di.oldest + ' დღის',
        status: od ? 'ვადაგადაცილებული ' + self.fmt(di.overdue) : 'ვადაში',
        dot: od ? '#F26052' : '#FFA64D',
        barW: Math.max(4, Math.round(l.balance / maxBal * 100)) + '%',
        odW: Math.min(100, Math.round(di.overdue / l.balance * 100)) + '%',
        border: j === 0 ? '0' : LINE,
        open: function () { openClient(c.id, 'debts'); }
      };
    });

    var cc = byId[s.clientId] || s.clients[0] || { id: '', name: '', kind: 'company', code: '', phone: '', address: '' };
    var c0 = L[cc.id] || { billed: 0, paid: 0, trips: [], pays: [], balance: 0, open: 0, lastPay: null };
    var clTripsArr = this.sd(c0.trips), clPaysArr = this.sd(c0.pays);
    var infoRows = [];
    if (cc.phone) infoRows.push(['ტელეფონი', cc.phone]);
    if (cc.address) infoRows.push(['მისამართი', cc.address]);
    if (cc.code) infoRows.push([cc.kind === 'person' ? 'პირადი ნომერი' : 'ს/კ', cc.code]);
    var site = contsSorted.filter(function (c) { return loc[c.code] && loc[c.code].client === cc.id; }).map(function (c) {
      return { code: c.code, meta: self.vl(c.vol) + ' · ' + self.days(loc[c.code].since) + ' დღე', open: function () { openCont(c.code); } };
    });
    var cl = {
      name: cc.name, kindLabel: cc.kind === 'person' ? 'ფიზიკური პირი' : 'იურიდიული პირი',
      balance: this.fmt(Math.max(0, c0.balance)), billed: this.fmt(c0.billed), paid: this.fmt(c0.paid),
      sub: c0.open ? c0.open + ' გადაუხდელი რეისი' : (c0.trips.length ? 'ყველა რეისი გადახდილია' : 'რეისი ჯერ არ ყოფილა'),
      hasInfo: infoRows.length > 0, info: infoRows.map(function (r, j) { return { k: r[0], v: r[1], border: j === 0 ? '0' : LINE }; }),
      hasSite: site.length > 0, site: site,
      trips: clTripsArr.map(function (t, j) { return tripVM(t, 'client', j); }),
      pays: clPaysArr.map(function (p, j) {
        var cash = p.method === 'cash';
        return { title: cash ? 'ნაღდი ფული' : 'საბანკო გადარიცხვა', meta: self.dShort(p.date) + (p.trip ? ' · კონკრეტულ რეისზე' : p.trips ? ' · ობიექტის რეისებზე' : ''), amount: '+' + self.fmt(p.amount), iconBg: cash ? '#F1F5F9' : '#F0F4FE', iconFg: cash ? '#374151' : BLUE, border: j === 0 ? '0' : LINE };
      }),
      noTrips: clTripsArr.length === 0, noPays: clPaysArr.length === 0
    };
    var clTabs = [['trips', 'რეისები · ' + clTripsArr.length], ['pays', 'ჩარიცხვები · ' + clPaysArr.length]].map(function (x) {
      var on = s.clientTab === x[0], st = tabSt(on);
      return { label: x[1], pressed: on, bg: st.bg, fg: st.fg, weight: st.weight, shadow: st.shadow, pick: function () { set({ clientTab: x[0] }); } };
    });

    var pay = s.pay, pc = pay.client ? byId[pay.client] : null;
    var pBal = pc ? L[pc.id].balance : 0;
    var amtStr = pay.amount == null ? (pBal > 0 ? String(pBal) : '') : pay.amount;
    var pAmt = this.num(amtStr);
    var setP = function (patch) { set({ pay: Object.assign({}, pay, patch), payErr: '' }); };
    var payOrder = debtors.concat(s.clients.filter(function (c) { return !(L[c.id].balance > 0); }).sort(byName));
    var cpPay = mkPicker('pay', pay.client, function (c) {
      set({ pay: Object.assign({}, pay, { client: c.id, amount: null }), picker: CLOSED, payErr: '' });
    }, function (c) { var b = L[c.id].balance; return b > 0 ? 'ჩასარიცხი ' + self.fmt(b) : 'დავალიანება არ აქვს'; }, payOrder);
    var methodSeg = [['bank', 'გადარიცხვა'], ['cash', 'ნაღდი']].map(function (x) {
      var on = pay.method === x[0], st = tabSt(on);
      return { label: x[1], pressed: on, bg: st.bg, fg: st.fg, weight: st.weight, shadow: st.shadow, pick: function () { setP({ method: x[0] }); } };
    });
    var after = pBal - pAmt;
    var payExplain = !pc ? 'აირჩიეთ კლიენტი — თანხა ავტომატურად შეივსება სრული დავალიანებით.'
      : 'თარიღი: დღეს. თანხა ჯერ ყველაზე ძველ გადაუხდელ რეისებს ფარავს. ' + (after > 0 ? 'დარჩება ჩასარიცხი ' + this.fmt(after) + '.' : after < 0 ? 'ზედმეტი ' + this.fmt(-after) + ' აისახება ავანსად.' : 'დავალიანება სრულად დაიფარება.');
    var savePay = function () {
      if (!pc) { set({ payErr: 'აირჩიეთ კლიენტი' }); return; }
      if (!(pAmt > 0)) { set({ payErr: 'შეიყვანეთ თანხა' }); return; }
      var p = { id: self.uid(), date: T, client: pc.id, amount: pAmt, method: pay.method, trip: '' };
      self.flash({ payments: s.payments.concat([p]), sheet: null, picker: CLOSED, pay: self.blankPay('', false), payErr: '' }, { title: 'ჩარიცხვა აისახა', amount: '+' + self.fmt(pAmt), detail: self.short(pc) + ' · ' + (pay.method === 'cash' ? 'ნაღდი' : 'გადარიცხვა') });
    };

    var nc = s.nc;
    var setN = function (patch) { set({ nc: Object.assign({}, nc, patch), ncErr: '' }); };
    var ncKindSeg = [['company', 'იურიდიული პირი'], ['person', 'ფიზიკური პირი']].map(function (x) {
      var on = nc.kind === x[0], st = tabSt(on);
      return { label: x[1], pressed: on, bg: st.bg, fg: st.fg, weight: st.weight, shadow: st.shadow, pick: function () { setN({ kind: x[0] }); } };
    });
    var saveNc = function () {
      var name = String(nc.name).trim();
      if (!name) { set({ ncErr: nc.kind === 'person' ? 'მიუთითეთ სახელი და გვარი' : 'მიუთითეთ დასახელება' }); return; }
      if (s.clients.some(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })) { set({ ncErr: 'ასეთი კლიენტი უკვე არსებობს' }); return; }
      var id = self.uid();
      var c = { id: id, name: name, kind: nc.kind, code: String(nc.code).trim(), phone: String(nc.phone).trim(), address: String(nc.address).trim() };
      var list = s.clients.concat([c]);
      if (nc.fromForm) {
        self.flash({ clients: list, sheet: null, picker: CLOSED, nc: self.blankNc(false), ncErr: '', form: Object.assign({}, fm, { client: id, address: c.address || fm.address }) }, { title: 'კლიენტი დაემატა', detail: name });
      } else {
        self.flash({ clients: list, sheet: null, picker: CLOSED, nc: self.blankNc(false), ncErr: '', screen: 'client', clientId: id, back: 'clients', clientTab: 'trips' }, { title: 'კლიენტი დაემატა', detail: name });
      }
    };

    var tsT = s.tripSheet ? s.trips.filter(function (t) { return t.id === s.tripSheet; })[0] : null;
    var ts = { typeLabel: '', code: '', vol: '', badgeBg: BLUE, badgeFg: '#FFFFFF', address: '', left: '', pill: '', dot: '#CBD5E1', rows: [], clientShort: '', priced: false, unpaid: false, markBank: noop, markCash: noop, openClient: noop, active: false, activeTitle: '', activeSub: '' };
    var nxV = { modes: [], isSwap: false, isPickup: false, hasMode: false, volChips: [], contChips: [], noFree: false, priceOpts: [], isCustom: false, price: '', setPrice: noop, date: '', setDate: noop, driver: '', setDriver: noop, paidNow: false, setPaid: noop, pickupNote: '', hasErr: false, err: '', btn: '', save: noop };
    var nextCodeV = '', nextSaveFn = noop;
    var delV = { title: '', what: '', blocked: false, allowed: false, blockText: '', effect: '', hasLinked: false, linkedText: '', payChecked: true, togglePays: noop, ask: noop, cancel: noop, confirm: noop, openBlocker: noop };
    if (tsT) {
      var inf = info[tsT.id], tm = this.typeMeta(tsT.type), tp = this.pill(inf.st), tc = byId[tsT.client];
      var rows = [['კლიენტი', tc ? tc.name : '']];
      if (tsT.type === 'swap') {
        rows.push(['გაიტანეს', tsT.cont + (volOf[tsT.cont] ? ' · ' + this.vl(volOf[tsT.cont]) : '')]);
        rows.push(['დატოვეს', tsT.newCont + (volOf[tsT.newCont] ? ' · ' + this.vl(volOf[tsT.newCont]) : '')]);
      } else {
        rows.push(['კონტეინერი', tsT.cont + (volOf[tsT.cont] ? ' · ' + this.vl(volOf[tsT.cont]) : '')]);
      }
      rows.push(['თარიღი', this.dLong(tsT.date)]);
      rows.push(['მძღოლი', tsT.driver || '—']);
      if (tsT.type === 'pickup') {
        // price is already counted in the delivery / swap trips
      } else if (tsT.price > 0) {
        rows.push(['ფასი', this.fmt(tsT.price)]);
        rows.push(['ჩარიცხული', this.fmt(inf.part)]);
        if (inf.left > 0) rows.push(['რეისიდან გასულია', inf.age + ' დღე']);
      } else {
        rows.push(['ფასი', this.fmt(tsT.price)]);
      }
      var mark = function (method) {
        return function () {
          var p = { id: self.uid(), date: T, client: tsT.client, amount: inf.left, method: method, trip: tsT.id };
          self.flash({ payments: s.payments.concat([p]) }, { title: 'რეისი გადახდილად მოინიშნა', amount: '+' + self.fmt(inf.left), detail: self.short(byId[tsT.client]) + ' · ' + (method === 'cash' ? 'ნაღდი' : 'გადარიცხვა') });
        };
      };
      ts = {
        typeLabel: tm.label, code: tripCode(tsT), vol: tripVol(tsT), badgeBg: tm.solid, badgeFg: '#FFFFFF', address: tsT.address,
        left: this.fmt(inf.left), pill: tp.t, dot: tp.dot,
        rows: rows.map(function (r, j) { return { k: r[0], v: r[1], border: j === 0 ? '0' : LINE }; }),
        clientShort: this.short(tc), priced: tsT.price > 0, unpaid: inf.left > 0, markBank: function () { askMark([tsT.id], 'bank'); }, markCash: function () { askMark([tsT.id], 'cash'); },
        openClient: function () { openClient(tsT.client, s.screen === 'client' ? s.back : s.screen); }
      };

      var aCode = activeCodeOf(tsT);
      ts.active = !!aCode;
      ts.activeTitle = aCode ? aCode + ' ობიექტზეა · ' + this.days(loc[aCode].since) + ' დღე' : '';
      var acr = aCode ? chainSum(loc[aCode].chain) : null;
      ts.activeSub = acr ? (acr.left > 0 ? 'დაგროვილი ვალი: ' + this.fmt(acr.left) + ' (' + chainComp(acr) + ')' : 'ამ ობიექტზე ვალი არ არის') : '';
      if (aCode) {
        var nxS = (s.next && s.next.trip === tsT.id) ? s.next : { trip: tsT.id, mode: '', vol: volOf[aCode], cont: '', priceMode: 'same', price: '', date: T, driver: tsT.driver || '', paidNow: false, puPay: 'none', puAmt: null };
        var setNx = function (patch) { set({ next: Object.assign({}, nxS, patch), nextErr: '' }); };
        var nxVol = +nxS.vol;
        var nxFree = contsSorted.filter(function (c) { return c.vol === nxVol && isFree(c.code); });
        var nxCont = (nxS.cont && volOf[nxS.cont] === nxVol && isFree(nxS.cont)) ? nxS.cont : (nxFree[0] ? nxFree[0].code : '');
        var nxSame = tsT.price, nxTar = priceOf('swap', nxVol);
        var nxOpts = [];
        if (nxSame > 0) nxOpts.push(['same', 'იგივე ფასი', this.fmt(nxSame)]);
        if (nxTar > 0 && nxTar !== nxSame) nxOpts.push(['tariff', 'ტარიფი ' + this.vl(nxVol), this.fmt(nxTar)]);
        nxOpts.push(['custom', 'სხვა ფასი', String(nxS.price).trim() ? this.fmt(this.num(nxS.price)) : 'ხელით']);
        var nxPm = nxOpts.some(function (o) { return o[0] === nxS.priceMode; }) ? nxS.priceMode : nxOpts[0][0];
        var nxPrice = nxPm === 'same' ? nxSame : nxPm === 'tariff' ? nxTar : this.num(nxS.price);
        var nxIsSwap = nxS.mode === 'swap', nxIsPu = nxS.mode === 'pickup';
        var VIO = '#7A3FE0', VIOW = '#F4EEFF';
        nextCodeV = aCode;
        var saveNext = function (confirmed) {
          var err = '', date = nxS.date || T;
          if (!nxS.mode) err = 'აირჩიეთ გატანა ან შეცვლა';
          else if (nxIsSwap && !nxCont) err = 'აირჩიეთ თავისუფალი კონტეინერი';
          else if (nxIsSwap && !(nxPrice > 0)) err = 'მიუთითეთ შემდეგი რეისის ფასი';
          else if (date < tsT.date) err = 'თარიღი ვერ იქნება მიმდინარე რეისზე ადრე';
          if (err) { set({ nextErr: err }); return; }
          if (nxIsPu && confirmed !== true) { set({ payAsk: { kind: 'pickup', src: 'next', amt: null, method: 'cash' } }); return; }
          var npp = nxIsPu ? mkPU(aCode, s.payAsk || {}, noop) : PU0;
          var puPaid = npp.paying;
          var lc = loc[aCode], id = self.uid();
          var nt = { id: id, date: date, type: nxS.mode, client: lc.client, cont: aCode, newCont: nxIsSwap ? nxCont : '', address: lc.address, driver: String(nxS.driver).trim(), price: nxIsSwap ? nxPrice : 0 };
          var pays = s.payments;
          if (nxIsSwap && nxS.paidNow) pays = pays.concat([{ id: self.uid(), date: date, client: nt.client, amount: nxPrice, method: 'cash', trip: id }]);
          if (puPaid) pays = pays.concat([{ id: self.uid(), date: date, client: nt.client, amount: npp.amt, method: npp.method, trips: npp.ids }]);
          self.flash({ trips: s.trips.concat([nt]), payments: pays, sheet: null, next: null, nextErr: '', payAsk: null },
            puPaid ? { title: 'გატანა და გადახდა აისახა', amount: '+' + self.fmt(npp.amt), detail: aCode + ' · ' + self.short(byId[nt.client]) + ' · ' + (npp.method === 'cash' ? 'ნაღდი' : 'გადარიცხვა') } : { title: nxIsSwap ? 'შეცვლა დარეგისტრირდა' : 'გატანა დარეგისტრირდა', amount: nt.price > 0 ? self.fmt(nt.price) : '', detail: tripCode(nt) + ' · ' + self.short(byId[nt.client]) + (nxIsSwap && nxS.paidNow ? ' · გადახდილია ადგილზე' : '') });
        };
        nxV = {
          modes: [['pickup', 'გატანა'], ['swap', 'შეცვლა']].map(function (x) {
            var on = nxS.mode === x[0], tmx = self.typeMeta(x[0]);
            return { label: x[1], pressed: on, bg: on ? tmx.wash : '#FFFFFF', fg: on ? tmx.solid : INK, border: on ? tmx.solid : '#E2E8F0', weight: on ? 600 : 500, pick: function () { setNx({ mode: x[0] }); } };
          }),
          isSwap: nxIsSwap, isPickup: nxIsPu, hasMode: nxIsSwap || nxIsPu,
          volChips: vols.map(function (v) {
            var fr = vs[v].free, on = nxVol === v, dis = fr === 0;
            return {
              label: self.vl(v), sub: fr ? fr + ' თავისუფალი' : 'არ არის', pressed: on, disabled: dis,
              bg: on ? VIOW : dis ? '#F1F5F9' : '#FFFFFF', fg: on ? VIO : dis ? '#6B7280' : INK, border: on ? VIO : '#E2E8F0', sc: on ? VIO : '#6B7280',
              pick: function () { if (!dis) setNx({ vol: v, cont: '' }); }
            };
          }),
          contChips: nxFree.map(function (c) {
            var on = nxCont === c.code;
            return { code: c.code, pressed: on, bg: on ? VIOW : '#FFFFFF', fg: on ? VIO : INK, border: on ? VIO : '#E2E8F0', pick: function () { setNx({ cont: c.code }); } };
          }),
          noFree: nxFree.length === 0,
          priceOpts: nxOpts.map(function (o) {
            var on = nxPm === o[0];
            return {
              label: o[1], sub: o[2], pressed: on, bg: on ? VIOW : '#FFFFFF', fg: on ? VIO : INK, border: on ? VIO : '#E2E8F0', sc: on ? VIO : '#6B7280',
              pick: function () { setNx({ priceMode: o[0], price: o[0] === 'custom' && !String(nxS.price).trim() ? String(nxSame || nxTar || '') : nxS.price }); }
            };
          }),
          isCustom: nxPm === 'custom', price: nxS.price,
          setPrice: function (e) { setNx({ price: val(e), priceMode: 'custom' }); },
          date: nxS.date, setDate: function (e) { setNx({ date: val(e) }); },
          driver: nxS.driver, setDriver: function (e) { setNx({ driver: val(e) }); },
          paidNow: !!nxS.paidNow, setPaid: function (e) { setNx({ paidNow: e && e.target ? !!e.target.checked : !nxS.paidNow }); },
          pickupNote: aCode + ' დაბრუნდება საწყობში და გათავისუფლდება.',
          hasErr: !!s.nextErr, err: s.nextErr,
          btn: nxIsSwap ? 'შეცვლის დადასტურება' + (nxPrice > 0 ? ' · ' + this.fmt(nxPrice) : '') : 'გატანის დადასტურება',
          save: saveNext
        };
        nextSaveFn = saveNext;
      }

      var blocker = null, blockCode = '';
      [tsT.cont, tsT.newCont].forEach(function (code) {
        if (!code || blocker) return;
        var h = chist[code] || [], lastT = h[h.length - 1];
        if (lastT && lastT.id !== tsT.id) { blocker = lastT; blockCode = code; }
      });
      var linked = s.payments.filter(function (p) { return p.trip === tsT.id; }), linkedSum = 0;
      linked.forEach(function (p) { linkedSum += p.amount; });
      var eff = tsT.type === 'deliver' ? tsT.cont + ' დაბრუნდება თავისუფალ სტატუსში.'
        : tsT.type === 'pickup' ? tsT.cont + ' ისევ ობიექტზე ჩაითვლება — ' + this.short(tc) + '.'
        : tsT.cont + ' დაბრუნდება ობიექტზე, ' + tsT.newCont + ' გათავისუფლდება.';
      if (tsT.price > 0) eff += ' კლიენტს დარიცხულ თანხას მოაკლდება ' + this.fmt(tsT.price) + '.';
      var delPays = s.delPays !== false;
      delV = {
        title: blocker ? 'რეისს ვერ გააუქმებთ' : 'გავაუქმოთ რეისი?',
        what: tm.label + ' · ' + tripCode(tsT) + ' · ' + this.short(tc) + ' · ' + this.dShort(tsT.date) + (tsT.price > 0 ? ' · ' + this.fmt(tsT.price) : ''),
        blocked: !!blocker, allowed: !blocker,
        blockText: blocker ? blockCode + '-ზე ამ რეისის შემდეგ უკვე ჩაწერილია „' + this.typeMeta(blocker.type).label + '“ (' + this.dShort(blocker.date) + '). ჯერ ის გააუქმეთ, შემდეგ — ეს.' : '',
        effect: eff,
        hasLinked: linked.length > 0, linkedText: 'მიბმული ჩარიცხვაც გაუქმდეს — ' + this.fmt(linkedSum),
        payChecked: delPays,
        togglePays: function (e) { set({ delPays: e && e.target ? !!e.target.checked : !delPays }); },
        ask: function () { if (isOwner) set({ delAsk: true, delPays: true }); },
        cancel: function () { set({ delAsk: false }); },
        openBlocker: function () { if (blocker) set({ tripSheet: blocker.id, delAsk: false, next: null, nextErr: '' }); },
        confirm: function () {
          if (blocker || !isOwner) return;
          var pays = delPays
            ? s.payments.filter(function (p) { return p.trip !== tsT.id; })
            : s.payments.map(function (p) { return p.trip === tsT.id ? Object.assign({}, p, { trip: '' }) : p; });
          pays = pays.map(function (p) { return p.trips && p.trips.indexOf(tsT.id) >= 0 ? Object.assign({}, p, { trips: p.trips.filter(function (x) { return x !== tsT.id; }) }) : p; });
          self.flash({ trips: s.trips.filter(function (x) { return x.id !== tsT.id; }), payments: pays, sheet: null, tripSheet: '', delAsk: false, next: null, nextErr: '' },
            { title: 'რეისი გაუქმდა', detail: tm.label + ' · ' + tripCode(tsT) + ' · ' + self.short(tc) });
        }
      };
    }

    var pq = s.payAsk || null, paOk = false;
    var pa = { title: '', amount: '', methodLabel: '', isCash: false, isBank: false, rows: [], note: '', confirmLabel: '', cancel: function () { set({ payAsk: null }); }, confirm: noop };
    var mkRows = function (arr) { return arr.map(function (r, j) { return { k: r[0], v: r[1], border: j === 0 ? '0' : LINE }; }); };
    var puV = { what: '', due: '', lines: [], allPaid: false, paidNote: '', canPay: false, amount: '', setAmount: noop, quick: [], hasQuick: false, methodSeg: [], explain: '', btn: '', cancel: noop, confirm: noop }, puOk = false;
    if (pq && pq.kind === 'pickup') {
      var puCode = pq.src === 'form' ? effPlace : nextCodeV;
      var setPA = function (patch) { set({ payAsk: Object.assign({}, pq, patch) }); };
      var PP = mkPU(puCode, pq, setPA);
      if (PP.has) {
        puOk = true;
        puV = Object.assign({}, PP, {
          what: puCode + ' · ' + this.short(byId[PP.client]) + ' · ' + PP.address,
          btn: PP.paying ? 'გატანა + გადახდა · ' + this.fmt(PP.amt) : 'მხოლოდ გატანის დადასტურება',
          cancel: function () { set({ payAsk: null }); },
          confirm: function () { (pq.src === 'form' ? saveTrip : nextSaveFn)(true); }
        });
      }
    }
    if (pq && pq.kind !== 'pickup') {
      var paIds = pq.ids || (pq.code && loc[pq.code] ? loc[pq.code].chain : []);
      var pr0 = chainSum(paIds);
      if (pr0.left > 0) {
        paOk = true;
        var paCash = pq.method === 'cash', paC = byId[pr0.trips[0].client];
        var openIds = pr0.trips.filter(function (t) { return info[t.id] && info[t.id].left > 0; });
        var paRows = [['კლიენტი', paC ? paC.name : '']];
        if (openIds.length === 1) paRows.push(['რეისი', this.typeMeta(openIds[0].type).label + ' · ' + tripCode(openIds[0]) + ' · ' + this.dShort(openIds[0].date)]);
        else paRows.push(['შედგენილობა', openIds.length + ' გადაუხდელი რეისი · ' + chainComp(pr0)]);
        pa.title = 'გადახდილად მოვნიშნოთ?';
        pa.amount = this.fmt(pr0.left);
        pa.methodLabel = paCash ? 'ნაღდი ფულით' : 'საბანკო გადარიცხვით';
        pa.isCash = paCash; pa.isBank = !paCash;
        pa.rows = mkRows(paRows);
        pa.note = 'თანხა აისახება შემოსავლებში ' + (paCash ? 'ნაღდის' : 'გადარიცხვის') + ' სახით, დღევანდელი თარიღით.';
        pa.confirmLabel = 'დიახ, გადახდილია';
        pa.confirm = function () {
          var ids = openIds.map(function (t) { return t.id; });
          var p = { id: self.uid(), date: T, client: paC ? paC.id : pr0.trips[0].client, amount: pr0.left, method: paCash ? 'cash' : 'bank' };
          if (ids.length === 1) p.trip = ids[0]; else p.trips = ids;
          self.flash({ payments: s.payments.concat([p]), payAsk: null },
            { title: 'გადახდილად მოინიშნა', amount: '+' + self.fmt(pr0.left), detail: self.short(paC) + ' · ' + (paCash ? 'ნაღდი' : 'გადარიცხვა') });
        };
      }
    }

    var pz = { rows: [], adjust: [], save: noop, reset: noop, hasErr: false, err: '', hasChanges: false, changesText: '' };
    var mkDraft = function (useFormula) {
      var d = {};
      vols.forEach(function (v) { d[String(v)] = String(useFormula ? self.tariff('deliver', v) : priceOf('deliver', v)); });
      return d;
    };
    if (s.sheet === 'prices') {
      var pd = s.pricesDraft || mkDraft(false);
      var nChanged = 0;
      pz.rows = vols.map(function (v) {
        var k = String(v), ch = self.num(pd[k]) !== priceOf('deliver', v);
        if (ch) nChanged++;
        return {
          label: self.vl(v), price: pd[k] == null ? '' : pd[k], aria: self.vl(v) + ' — ფასი', border: ch ? BLUE : '#E2E8F0',
          setPrice: function (e) { var o = Object.assign({}, pd); o[k] = String(val(e)).replace(/[^\d]/g, ''); set({ pricesDraft: o, pricesErr: '' }); }
        };
      });
      pz.hasChanges = nChanged > 0;
      pz.changesText = nChanged + ' ფასი შეიცვალა — შეინახეთ, რომ ახალ რეისებზე აისახოს.';
      pz.adjust = [-10, -5, 5, 10].map(function (pct) {
        return {
          label: (pct > 0 ? '+' : '−') + Math.abs(pct) + '%',
          pick: function () {
            var o = {};
            Object.keys(pd).forEach(function (k) { var x = self.num(pd[k]); o[k] = x > 0 ? String(Math.max(5, self.r5(x * (1 + pct / 100)))) : pd[k]; });
            set({ pricesDraft: o, pricesErr: '' });
          }
        };
      });
      pz.reset = function () { set({ pricesDraft: mkDraft(true), pricesErr: '' }); };
      pz.hasErr = !!s.pricesErr; pz.err = s.pricesErr || '';
      pz.save = function () {
        if (!isOwner) return;
        if (vols.some(function (v) { return !(self.num(pd[String(v)]) > 0); })) { set({ pricesErr: 'ყველა ფასი უნდა იყოს 0-ზე მეტი' }); return; }
        var np = Object.assign({}, s.prices);
        vols.forEach(function (v) { np[String(v)] = self.num(pd[String(v)]); });
        self.flash({ prices: np, pricesDraft: null, pricesErr: '', sheet: null }, { title: 'ფასები განახლდა', detail: 'ახალ მიტანასა და შეცვლაზე ავტომატურად ჩაიწერება' });
      };
    }

    var co = s.company, acct = s.acct || {};
    // Team: the owner (Google / Apple account that registered the company) manages employees;
    // employees sign in with the email + password the owner gave them.
    var team = this.teamVals(s, set, val, LINE);
    var provLabel = function (p) { return p === 'apple' ? 'Apple ID' : p === 'google' ? 'Google ანგარიში' : 'ელფოსტა'; };
    var cw = String(co.name || '').split(' ');
    var coInitials = ((cw[0] || '').charAt(0) + (cw[1] || '').charAt(0)) || '?';
    var signIn = function (provider) {
      return function () {
        if (s.authBusy) return;
        set({ authBusy: provider, authErr: '' });
        if (self.props.api) {
          self.props.api.signIn(provider).catch(function (er) { self.setState({ authBusy: '', authErr: (er && er.message) || 'ავტორიზაცია ვერ მოხერხდა' }); });
          return;
        }
        clearTimeout(self._at);
        self._at = setTimeout(function () {
          var a = provider === 'google' ? { provider: 'google', email: 'owner@example.com', owner: 'გიორგი მ.' } : { provider: 'apple', email: '', owner: 'გიორგი მ.' };
          if (s.registered) {
            self.flash({ screen: 'home', sheet: null, authBusy: '', acct: a, company: Object.assign({}, co, { provider: a.provider, email: a.email }) }, { title: 'შესვლა შესრულდა', detail: provLabel(provider) });
          } else {
            self.setState({ screen: 'onboard', sheet: null, authBusy: '', acct: a, ob: self.blankOb('register', a), obErr: '' });
          }
        }, 900);
      };
    };
    var ob = s.ob || this.blankOb('register', acct);
    var setO = function (patch) { set({ ob: Object.assign({}, ob, patch), obErr: '' }); };
    var codeLen = ob.form === 'ი/მ' ? 11 : 9;
    var obAcct = ob.mode === 'edit' ? { provider: co.provider, email: co.email } : acct;
    var obFormSeg = ['შპს', 'ი/მ', 'სს'].map(function (x) {
      var on = ob.form === x, st = tabSt(on);
      return { label: x, pressed: on, bg: st.bg, fg: st.fg, weight: st.weight, shadow: st.shadow, pick: function () { setO({ form: x, code: String(ob.code).slice(0, x === 'ი/მ' ? 11 : 9) }); } };
    });
    var saveOb = function () {
      var owner = String(ob.owner).trim(), name = String(ob.name).trim().replace(/^(შპს|სს|ი\/მ)\s+/, ''), code = String(ob.code).replace(/\D/g, ''), phone = String(ob.phone).replace(/\D/g, ''), err = '';
      if (!owner) err = 'მიუთითეთ მფლობელის სახელი და გვარი';
      else if (!name) err = 'მიუთითეთ კომპანიის დასახელება';
      else if (code.length !== codeLen) err = (ob.form === 'ი/მ' ? 'პირადი ნომერი' : 'საიდენტიფიკაციო კოდი') + ' უნდა შედგებოდეს ' + codeLen + ' ციფრისგან';
      else if (phone.length !== 9) err = 'მიუთითეთ 9-ნიშნა მობილურის ნომერი';
      else if (ob.mode !== 'edit' && !ob.terms) err = 'დაეთანხმეთ მომსახურების პირობებს';
      if (err) { set({ obErr: err }); return; }
      var pf = phone.replace(/^(\d{3})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4');
      var nco = { name: name, form: ob.form, code: code, phone: '+995 ' + pf, city: ob.city, owner: owner, provider: obAcct.provider || 'google', email: obAcct.email || '', logo: ob.logo || '' };
      if (ob.mode === 'edit') self.flash({ company: nco, screen: 'home', sheet: 'profile', obErr: '' }, { title: 'პროფილი განახლდა', detail: ob.form + ' ' + name });
      else self.flash({ company: nco, registered: true, screen: 'home', sheet: null, obErr: '' }, { title: 'კომპანია დარეგისტრირდა', detail: ob.form + ' ' + name });
    };
    var profRows = [
      ['მფლობელი', co.owner],
      ['სამართლებრივი ფორმა', co.form],
      [co.form === 'ი/მ' ? 'პირადი ნომერი' : 'ს/კ', co.code],
      ['ტელეფონი', co.phone],
      ['ქალაქი', co.city],
      ['ანგარიში', provLabel(co.provider) + (co.email ? ' · ' + co.email : ' · ელფოსტა დამალულია')]
    ].filter(function (r) { return r[1]; });
    if (!isOwner) profRows = profRows.filter(function (r) { return r[0] !== 'ანგარიში'; }).concat([['თქვენი ანგარიში', (acct.owner ? acct.owner + ' · ' : '') + (acct.email || '') + ' · თანამშრომელი']]);
    profRows = profRows.map(function (r, j) { return { k: r[0], v: r[1], border: j === 0 ? '0' : LINE }; });

    var tab = s.screen === 'client' ? 'clients' : s.screen;
    var navOf = function (k) {
      var on = tab === k;
      return { bg: on ? '#F0F4FE' : 'transparent', fg: on ? BLUE : '#6B7280', weight: on ? 600 : 500, current: on ? 'page' : 'false' };
    };
    var todayD = this.dt(T);
    var tq = s.toast && typeof s.toast === 'object' ? s.toast : { title: s.toast ? String(s.toast) : '' };
    var ph = s.toastPh || 'on', tOn = ph === 'on', tEnter = ph === 'enter';
    var toastV = {
      title: tq.title || '', amount: tq.amount || '', detail: tq.detail || '',
      hasAmount: !!tq.amount, hasDetail: !!tq.detail,
      bdOp: tOn ? '1' : '0', cardOp: tOn ? '1' : '0',
      cardTf: tEnter ? 'translateY(18px) scale(0.86)' : ph === 'leave' ? 'translateY(-8px) scale(0.96)' : 'translateY(0) scale(1)',
      cardTr: ph === 'leave' ? 'opacity 220ms ease-in, transform 240ms ease-in' : 'opacity 240ms ease-out, transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      discTf: tEnter ? 'scale(0.3)' : 'scale(1)',
      chkOff: tEnter ? '24' : '0',
      ringTf: tEnter ? 'scale(1)' : 'scale(1.8)', ringOp: tEnter ? '0.4' : '0'
    };

    return {
      isHome: s.screen === 'home', isTrips: s.screen === 'trips', isNew: s.screen === 'new',
      isContainers: s.screen === 'containers', isClients: s.screen === 'clients', isClient: s.screen === 'client', isCash: s.screen === 'cash',
      isLogin: s.screen === 'login', isOnboard: s.screen === 'onboard', isDebts: s.screen === 'debts',
      showNav: s.screen !== 'new' && s.screen !== 'login' && s.screen !== 'onboard',
      showTrip: s.sheet === 'trip' && !!tsT, showPay: s.sheet === 'pay', showNc: s.sheet === 'client-new',
      showCont: s.sheet === 'cont' && !!csC, showReg: s.sheet === 'reg', showProfile: s.sheet === 'profile',
      hasToast: !!s.toast, toast: toastV,
      dismissToast: function () {
        clearTimeout(self._t1); clearTimeout(self._tt); clearTimeout(self._t2);
        set({ toastPh: 'leave' });
        self._t2 = setTimeout(function () { self.setState({ toast: null }); }, 260);
      },
      nav: { home: navOf('home'), trips: navOf('trips'), containers: navOf('containers'), clients: navOf('clients'), cash: navOf('cash'), debts: navOf('debts') },
      goHome: function () { go('home'); },
      goTrips: function () { go('trips'); },
      goContainers: function () { go('containers', { contVol: 0, contFilter: 'all' }); },
      goClients: function () { go('clients'); },
      goCash: function () { go('cash'); },
      goNew: function () { go('new', { form: self.blankForm(''), formErr: '', placeQ: '' }); },
      closeSheet: function () { set({ sheet: null, picker: CLOSED, payErr: '', regErr: '', payAsk: null, delAsk: false }); },

      todayLabel: K.wd[todayD.getDay()] + ', ' + todayD.getDate() + ' ' + K.months[todayD.getMonth()],
      totalOut: this.fmt(totalOut),
      heroSub: debtors.length + ' კლიენტი · ' + openTrips + ' გადაუხდელი რეისი',
      openPayAny: function () { set({ sheet: 'pay', pay: self.blankPay('', false), payErr: '', picker: { open: 'pay', q: '' } }); },
      periodSeg: periodSeg, seriesSeg: seriesSeg, bars: bars, statTiles: statTiles,
      statHeading: this.phead(per, keys[sel], sel, last),
      statTypes: 'მიტანა ' + SB.deliver + ' · გატანა ' + SB.pickup + ' · შეცვლა ' + SB.swap,
      volStats: volStats, topDebtors: topDebtors, recent: recent,

      monthIncomeLabel: 'შემოსავალი · ' + K.months[+mKey.slice(5, 7) - 1],
      monthIncome: this.fmt(mBank + mCash), monthBank: this.fmt(mBank), monthCash: this.fmt(mCash),
      goIncome: function () { go('cash', { cfPeriod: 'month', cfSel: -1, cfMethod: 'all' }); },
      goDebts: function () { go('debts', { debtsBack: 'home', debtQ: '', debtFilter: 'all' }); },
      goDebtsFromClients: function () { go('debts', { debtsBack: 'clients', debtQ: '', debtFilter: 'all' }); },
      backFromDebts: function () { go(s.debtsBack || 'home'); },
      debtOverdue: this.fmt(overdueTotal), debtCurrent: this.fmt(totalOut - overdueTotal),
      debtQ: s.debtQ, setDebtQ: function (e) { set({ debtQ: val(e) }); },
      debtFilters: debtFilters, debtRows: debtRows, noDebts: debtRows.length === 0,
      noDebtsText: debtors.length ? 'ამ ფილტრით კლიენტი ვერ მოიძებნა.' : 'ჩასარიცხი თანხა არცერთ კლიენტს არ აქვს.',
      debtCountLabel: debtShown.length + ' კლიენტი',
      debtSortLabel: byAge ? 'დალაგება: ხანდაზმულობით' : 'დალაგება: თანხით',
      toggleDebtSort: function () { set({ debtSort: byAge ? 'amount' : 'age' }); },

      cfPeriodSeg: cfPeriodSeg, cfBars: cfBars, cfMethodChips: cfMethodChips, cfList: cfList, cfEmpty: cfList.length === 0,
      cfHeading: this.phead(cp, cselKey, csel, clast),
      cfTotal: this.fmt(CS.bank + CS.cash), cfBank: this.fmt(CS.bank), cfCash: this.fmt(CS.cash),
      cfCount: CS.n + ' ჩარიცხვა',

      tripsTotalLabel: 'სულ ' + s.trips.length + ' რეისი',
      query: s.query, setQuery: function (e) { set({ query: val(e), tripLimit: 30 }); },
      filters: filters, tripGroups: tripGroups, noTrips: tripGroups.length === 0,
      hasMoreTrips: tlist.length > shown.length, moreLabel: 'მეტის ჩვენება · კიდევ ' + (tlist.length - shown.length),
      moreTrips: function () { set({ tripLimit: s.tripLimit + 30 }); },

      form: fm, f: f, typeSeg: typeSeg, typeHint: typeHint,
      isDeliver: fm.type === 'deliver', isPlaceType: fm.type !== 'deliver', isPickup: fm.type === 'pickup',
      needsNewCont: needsNew, hasPrice: needsNew,
      cpForm: cpForm,
      volChips: volChips, freeChips: freeChips, noFree: needsNew && freeList.length === 0,
      volLegend: fm.type === 'swap' ? 'ახალი კონტეინერის მოცულობა' : 'კონტეინერის მოცულობა',
      contLegend: fm.type === 'swap' ? 'ახალი კონტეინერი (თავისუფალი)' : 'თავისუფალი კონტეინერი',
      placeRows: placeRows, noPlaces: placeRows.length === 0,
      noPlacesText: places.length ? 'ძებნით ვერაფერი მოიძებნა.' : 'ამჟამად არცერთი კონტეინერი არ დგას ობიექტზე.',
      placeQ: s.placeQ, setPlaceQ: function (e) { set({ placeQ: val(e) }); },
      placeLegend: fm.type === 'pickup' ? 'რომელი კონტეინერი გააქვთ?' : 'რომელ კონტეინერს ცვლით?',
      addClientFromForm: function () { set({ sheet: 'client-new', nc: self.blankNc(true), ncErr: '', picker: CLOSED }); },
      priceVal: priceVal, hasPriceHint: !!priceHint, priceHint: priceHint, priceReset: priceReset,
      formTotal: this.fmt(this.num(priceVal)), hasFormErr: !!s.formErr, formErr: s.formErr,
      saveLabel: fm.type === 'pickup' ? 'გატანის შენახვა' : 'რეისის შენახვა',
      saveTrip: saveTrip, cancelNew: function () { go('home', { formErr: '' }); },

      cTotal: String(contsSorted.length), cFree: String(cFree), cBusy: String(contsSorted.length - cFree),
      volCards: volCards, contChips: contChips, contRows: contRows,
      contListTitle: (cv ? this.vl(cv) : 'ყველა მოცულობა') + ' — ' + contRows.length + ' კონტეინერი',
      hasVolFilter: !!cv, clearVol: function () { set({ contVol: 0 }); },
      openReg: function () { set({ sheet: 'reg', regErr: '' }); },
      cs: cs,

      reg: rg, regVolChips: regVolChips, regOther: regOther, regQuick: regQuick,
      setRegCustom: function (e) { setR({ custom: val(e) }); },
      setRegQty: function (e) { setR({ qty: String(val(e)).replace(/\D/g, '') }); },
      regDec: function () { setR({ qty: String(Math.max(1, rQty - 1)) }); },
      regInc: function () { setR({ qty: String(Math.min(200, rQty + 1)) }); },
      regPreview: rPreview,
      regAfter: rVol > 0 ? 'შექმნის შემდეგ ' + this.vl(rVol) + ' კონტეინერი იქნება სულ ' + (rHave + (rOk ? rQty : 0)) + ' ცალი' : '',
      regBtn: rOk ? rQty + ' × ' + this.vl(rVol) + ' — შექმნა' : 'შექმნა',
      hasRegErr: !!s.regErr, regErr: s.regErr, saveReg: saveReg,

      clientRows: clientRows, noClients: clientRows.length === 0,
      clientsCountLabel: 'სულ ' + s.clients.length + ' კლიენტი' + (cq ? ' · ნაპოვნია ' + clientsShown.length : ''),
      clientQ: s.clientQ, setClientQ: function (e) { set({ clientQ: val(e) }); },
      openNewClient: function () { set({ sheet: 'client-new', nc: self.blankNc(false), ncErr: '' }); },

      cl: cl, clTabs: clTabs, clTabTrips: s.clientTab !== 'pays', clTabPays: s.clientTab === 'pays',
      backFromClient: function () { go(s.back || 'clients'); },
      openPayClient: function () { set({ sheet: 'pay', pay: self.blankPay(cc.id, true), payErr: '', picker: CLOSED }); },

      payPick: !pay.fixed, payFixed: !!pay.fixed, cpPay: cpPay,
      payClientName: pc ? pc.name : '', payDebt: this.fmt(Math.max(0, pBal)),
      payAmt: amtStr, setPayAmt: function (e) { setP({ amount: val(e) }); },
      methodSeg: methodSeg, payExplain: payExplain,
      payBtn: pAmt > 0 ? 'ასახვა · ' + this.fmt(pAmt) : 'ასახვა',
      hasPayErr: !!s.payErr, payErr: s.payErr, savePay: savePay,

      nc: nc, n: {
        name: function (e) { setN({ name: val(e) }); },
        code: function (e) { setN({ code: val(e) }); },
        phone: function (e) { setN({ phone: val(e) }); },
        address: function (e) { setN({ address: val(e) }); }
      },
      ncKindSeg: ncKindSeg,
      ncNameLabel: nc.kind === 'person' ? 'სახელი, გვარი' : 'დასახელება',
      ncNamePh: nc.kind === 'person' ? 'მაგ. ნინო კ.' : 'შპს …',
      ncCodeLabel: nc.kind === 'person' ? 'პირადი ნომერი' : 'საიდენტიფიკაციო კოდი',
      hasNcErr: !!s.ncErr, ncErr: s.ncErr, saveNc: saveNc,
      closeNc: function () { set({ sheet: null, ncErr: '' }); },

      ts: ts, nx: nxV, tdel: delV, pa: pa, showPayAsk: paOk, pu: puV, showPuAsk: puOk, showDelAsk: s.sheet === 'trip' && !!tsT && !!s.delAsk,

      companyShort: co.name, companyFull: (co.form ? co.form + ' ' : '') + co.name, coInitials: coInitials,
      openProfile: function () { set({ sheet: 'profile', menuOpen: false }); },
      openPrices: function () { if (isOwner) set({ sheet: 'prices', menuOpen: false, pricesDraft: null, pricesErr: '' }); },
      isOwner: isOwner, isStaff: !isOwner, team: team, showTeam: s.sheet === 'team' && isOwner,
      openTeam: function () { if (isOwner) set({ sheet: 'team', menuOpen: false, teamErr: '', teamEdit: null, teamCreated: null, teamCopied: false, teamForm: { name: '', email: '', password: self.genPass() } }); },
      showPrices: s.sheet === 'prices', pz: pz,
      menuOpen: !!s.menuOpen, showMenu: !!s.menuOpen && s.screen === 'home',
      toggleMenu: function () { set({ menuOpen: !s.menuOpen }); },
      closeMenu: function () { set({ menuOpen: false }); },
      menuSub: isOwner ? co.owner + (co.email ? ' · ' + co.email : '') : (acct.owner ? acct.owner + ' · ' : '') + 'თანამშრომელი',
      hasLogo: !!co.logo, noLogo: !co.logo, coLogo: co.logo || '',
      goDebtsNav: function () { go('debts', { debtsBack: 'home' }); },
      profRows: profRows,
      editProfile: function () { if (isOwner) go('onboard', { ob: self.blankOb('edit', null, co), obErr: '' }); },
      signOut: function () { if (self.props.api) { set({ menuOpen: false }); self.props.api.signOut(); return; } clearTimeout(self._at); self.flash({ screen: 'login', sheet: null, picker: CLOSED, authBusy: '', menuOpen: false }, { title: 'ანგარიშიდან გამოხვედით' }); },
      gBtn: { show: !self.props.api || !!(self.props.providers && self.props.providers.google), label: s.authBusy === 'google' ? 'დაკავშირება…' : 'Google-ით გაგრძელება', disabled: !!s.authBusy, go: signIn('google') },
      aBtn: { show: !self.props.api || !!(self.props.providers && self.props.providers.apple), label: s.authBusy === 'apple' ? 'დაკავშირება…' : 'Apple-ით გაგრძელება', disabled: !!s.authBusy, go: signIn('apple') },
      noOwnerLogin: !!self.props.api && !(self.props.providers && (self.props.providers.google || self.props.providers.apple)),
      staffEmail: s.staffEmail || '', staffPass: s.staffPass || '', staffBusy: !!s.staffBusy,
      staffPassType: s.staffShow ? 'text' : 'password', staffEyeLabel: s.staffShow ? 'პაროლის დამალვა' : 'პაროლის ჩვენება',
      staffBtn: s.staffBusy ? 'შესვლა…' : 'შესვლა',
      setStaffEmail: function (e) { set({ staffEmail: val(e), authErr: '' }); },
      setStaffPass: function (e) { set({ staffPass: val(e), authErr: '' }); },
      toggleStaffPass: function () { set({ staffShow: !s.staffShow }); },
      staffKey: function (e) { if (e && e.key === 'Enter') { e.preventDefault(); self.staffLogin(); } },
      staffSubmit: function () { self.staffLogin(); },
      hasAuthErr: !!s.authErr, authErr: s.authErr || '',
      authBusyOn: !!s.authBusy, authBusyText: s.authBusy ? provLabel(s.authBusy) + ' — ავტორიზაცია მიმდინარეობს…' : '',
      ob: ob, obFormSeg: obFormSeg,
      obSet: {
        owner: function (e) { setO({ owner: val(e) }); },
        name: function (e) { setO({ name: val(e) }); },
        code: function (e) { setO({ code: String(val(e)).replace(/\D/g, '').slice(0, codeLen) }); },
        phone: function (e) { setO({ phone: String(val(e)).replace(/\D/g, '').slice(0, 9) }); },
        city: function (e) { setO({ city: val(e) }); },
        terms: function (e) { setO({ terms: e && e.target ? !!e.target.checked : !ob.terms }); },
        logoClear: function () { set({ ob: Object.assign({}, ob, { logo: '' }), logoErr: '' }); },
        logo: function (e) {
          var inp = e && e.target, file = inp && inp.files && inp.files[0];
          if (!file) return;
          if (!/^image\//.test(file.type || '')) { set({ logoErr: 'აირჩიეთ სურათის ფაილი (PNG, JPG ან SVG)' }); return; }
          if (file.size > 2 * 1024 * 1024) { set({ logoErr: 'ფაილი 2 მბ-ზე დიდია' }); return; }
          var put = function (url) { self.setState({ ob: Object.assign({}, self.S().ob, { logo: url }), logoErr: '' }); };
          var rd = new FileReader();
          rd.onload = function () {
            var src = String(rd.result || '');
            if (file.type === 'image/svg+xml') { put(src); return; }
            var im = new Image();
            im.onload = function () {
              try {
                var k = Math.min(1, 256 / Math.max(im.width || 1, im.height || 1)), cv = document.createElement('canvas');
                cv.width = Math.max(1, Math.round(im.width * k)); cv.height = Math.max(1, Math.round(im.height * k));
                cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
                put(cv.toDataURL('image/png'));
              } catch (er) { put(src); }
            };
            im.onerror = function () { self.setState({ logoErr: 'სურათის წაკითხვა ვერ მოხერხდა' }); };
            im.src = src;
          };
          rd.onerror = function () { self.setState({ logoErr: 'ფაილის წაკითხვა ვერ მოხერხდა' }); };
          rd.readAsDataURL(file);
          try { inp.value = ''; } catch (er) {}
        }
      },
      obHasLogo: !!ob.logo, obNoLogo: !ob.logo, obLogoBorder: ob.logo ? 'solid' : 'dashed',
      obLogoBtn: ob.logo ? 'ლოგოს შეცვლა' : 'ლოგოს ატვირთვა',
      hasLogoErr: !!s.logoErr, logoErr: s.logoErr || '',
      obTitle: ob.mode === 'edit' ? 'პროფილის რედაქტირება' : 'კომპანიის რეგისტრაცია',
      obIsReg: ob.mode !== 'edit',
      obCodeLabel: ob.form === 'ი/მ' ? 'პირადი ნომერი (11 ციფრი)' : 'საიდენტიფიკაციო კოდი (9 ციფრი)',
      obCodePh: ob.form === 'ი/მ' ? '___________' : '_________',
      acctV: { label: provLabel(obAcct.provider), email: obAcct.email || 'ელფოსტა დამალულია', bg: obAcct.provider === 'apple' ? INK : '#F0F4FE', fg: obAcct.provider === 'apple' ? '#FFFFFF' : BLUE },
      obBtn: ob.mode === 'edit' ? 'ცვლილებების შენახვა' : 'რეგისტრაციის დასრულება',
      hasObErr: !!s.obErr, obErr: s.obErr, saveOb: saveOb,
      obBack: function () { if (ob.mode === 'edit') go('home', { sheet: 'profile' }); else if (self.props.api) self.props.api.signOut(); else { clearTimeout(self._at); set({ screen: 'login', authBusy: '' }); } }
    };
  }
}
