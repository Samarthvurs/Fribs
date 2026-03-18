/**
 * FRIBS - Fraud-Resistant Intelligent Booking System
 * Main Application JavaScript
 * ============================================================
 */

/* ============================================================
   APPLICATION STATE
   ============================================================ */
const App = {
  currentUser: null,
  selectedEvent: null,
  selectedSeats: [],
  lastBooking: null,

  // Mock user database
  users: [
    { id: 'USR001', name: 'Alice Johnson', email: 'alice@example.com', password: 'pass123', role: 'user'  },
    { id: 'USR002', name: 'Bob Kumar',     email: 'bob@example.com',   password: 'pass123', role: 'admin' },
  ],

  // Mock events data
  events: [
    {
      id: 'EVT001', type: 'Movie', icon: '🎬',
      title: 'Dune: Part Three',
      date: 'Sat, Apr 12, 2025', time: '7:30 PM',
      location: 'PVR IMAX, Bangalore',
      price: 350, vipPrice: 650,
      badge: 'trending',
      color: '#c2540a',
      totalSeats: 80, bookedSeats: ['A3','A4','B1','B6','C2','C3','D5','D8','E1','E9'],
    },
    {
      id: 'EVT002', type: 'Concert', icon: '🎵',
      title: 'Coldplay: Music of the Spheres',
      date: 'Sun, Apr 20, 2025', time: '6:00 PM',
      location: 'DY Patil Stadium, Mumbai',
      price: 2500, vipPrice: 8000,
      badge: 'hot',
      color: '#1d4ed8',
      totalSeats: 60, bookedSeats: ['A1','A2','A3','B4','B5','C6','C7','D1','D2'],
    },
    {
      id: 'EVT003', type: 'Flight', icon: '✈️',
      title: 'BLR → DEL — IndiGo 6E-201',
      date: 'Fri, Apr 18, 2025', time: '9:15 AM',
      location: 'Kempegowda Intl, Bangalore',
      price: 4299, vipPrice: 9999,
      badge: null,
      color: '#0f766e',
      totalSeats: 50, bookedSeats: ['1A','1B','2C','3D','4A','4B','5C','6D'],
    },
    {
      id: 'EVT004', type: 'Comedy', icon: '😂',
      title: 'Zakir Khan: Haq Se Single',
      date: 'Wed, Apr 23, 2025', time: '8:00 PM',
      location: 'Chowdiah Memorial Hall, BLR',
      price: 799, vipPrice: 1500,
      badge: 'selling fast',
      color: '#7c3aed',
      totalSeats: 70, bookedSeats: ['A5','A6','B2','B3','C4','C5'],
    },
    {
      id: 'EVT005', type: 'Sports', icon: '🏏',
      title: 'IPL: RCB vs CSK',
      date: 'Sat, Apr 26, 2025', time: '3:30 PM',
      location: 'M. Chinnaswamy Stadium, BLR',
      price: 999, vipPrice: 3500,
      badge: 'trending',
      color: '#991b1b',
      totalSeats: 90, bookedSeats: ['B1','B2','B3','C4','C5','D6','D7','E8','E9'],
    },
    {
      id: 'EVT006', type: 'Theater', icon: '🎭',
      title: 'Hamlet — NSD Repertory',
      date: 'Thu, Apr 17, 2025', time: '6:30 PM',
      location: 'Ranga Shankara, Bangalore',
      price: 450, vipPrice: 850,
      badge: null,
      color: '#854d0e',
      totalSeats: 48, bookedSeats: ['A1','A2','C3','C4'],
    },
  ],

  // Mock booking history
  bookings: [
    {
      id: 'BKG8821', eventId: 'EVT001', userId: 'USR001',
      seats: ['C5','C6'], total: 700, status: 'paid',
      date: 'Mar 10, 2025',
    },
    {
      id: 'BKG7743', eventId: 'EVT004', userId: 'USR001',
      seats: ['D3'], total: 799, status: 'paid',
      date: 'Mar 5, 2025',
    },
  ],

  // Mock admin data
  adminUsers: [
    { id:'USR001', name:'Alice Johnson',  email:'alice@example.com',   bookings:14, flag: 'safe',    lastActivity:'2m ago'  },
    { id:'USR003', name:'Riya Sharma',    email:'riya@domain.com',     bookings:2,  flag: 'safe',    lastActivity:'1h ago'  },
    { id:'USR004', name:'Unknown Device', email:'temp_usr@proxy.xyz',  bookings:87, flag: 'danger',  lastActivity:'5s ago'  },
    { id:'USR005', name:'Carlos M.',      email:'carlos@example.com',  bookings:31, flag: 'warning', lastActivity:'15m ago' },
    { id:'USR006', name:'Script Bot',     email:'bot_447@tempmail.net',bookings:203,flag: 'danger',  lastActivity:'2s ago'  },
    { id:'USR007', name:'Priya T.',       email:'priya@mail.com',      bookings:7,  flag: 'safe',    lastActivity:'3h ago'  },
  ],

  activityLog: [
    { time:'09:41:02', user:'USR006', action:'Bulk seat hold — 22 seats',  type:'danger',  ip:'104.28.9.12'  },
    { time:'09:40:55', user:'USR004', action:'Rapid checkout attempt x5',  type:'danger',  ip:'185.220.101.4'},
    { time:'09:40:30', user:'USR005', action:'Multiple IP logins detected', type:'warn',   ip:'52.14.88.201' },
    { time:'09:38:11', user:'USR001', action:'Booking confirmed BKG8821',   type:'success', ip:'106.51.2.88'  },
    { time:'09:37:45', user:'USR003', action:'Seat selection EVT002',       type:'info',    ip:'49.207.4.11'  },
    { time:'09:35:22', user:'USR006', action:'Account created (disposable)',type:'danger',  ip:'104.28.9.12'  },
    { time:'09:34:00', user:'USR007', action:'Login successful',            type:'info',    ip:'103.21.1.44'  },
    { time:'09:32:10', user:'USR004', action:'Payment method changed x3',   type:'warn',   ip:'185.220.101.4'},
  ],
};


/* ============================================================
   PAGE NAVIGATION
   ============================================================ */

/** Navigate to a specific page by its ID */
function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll('.page, .auth-page, .dashboard-page, .seat-page, .confirm-page, .admin-page, .my-bookings-page')
    .forEach(p => p.classList.remove('active'));

  // Show target
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Update navbar active state */
function setNavActive(section) {
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === section);
  });
}


/* ============================================================
   AUTHENTICATION
   ============================================================ */

/** Handle login form submission */
function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  clearErrors('loginForm');
  let valid = true;

  if (!email)    { showError('loginEmailErr', 'Email is required');       valid = false; }
  if (!password) { showError('loginPasswordErr', 'Password is required'); valid = false; }

  if (!valid) return;

  // Find user
  const user = App.users.find(u => u.email === email && u.password === password);

  if (!user) {
    showError('loginPasswordErr', 'Invalid email or password');
    shakeElement(document.getElementById('loginForm'));
    return;
  }

  // Login success
  App.currentUser = user;
  updateNavUser();

  showToast('success', 'Welcome back!', `Logged in as ${user.name}`);
  showSpinner('Signing you in…');

  setTimeout(() => {
    hideSpinner();
    if (user.role === 'admin') {
      navigateTo('adminPage');
      renderAdminDashboard();
    } else {
      navigateTo('homePage');
      renderEvents();
    }
  }, 1200);
}

/** Handle registration form submission */
function handleRegister(e) {
  e.preventDefault();

  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;

  clearErrors('registerForm');
  let valid = true;

  if (!name)                     { showError('regNameErr',  'Full name required');              valid = false; }
  if (!email || !isValidEmail(email)) { showError('regEmailErr', 'Valid email required');       valid = false; }
  if (password.length < 6)       { showError('regPasswordErr', 'Min 6 characters');             valid = false; }
  if (password !== confirm)      { showError('regConfirmErr', 'Passwords do not match');         valid = false; }

  if (!valid) return;

  // Check duplicate email
  if (App.users.find(u => u.email === email)) {
    showError('regEmailErr', 'Email already registered');
    return;
  }

  // Create user
  const newUser = {
    id:   'USR' + Math.floor(Math.random() * 900 + 100),
    name, email, password, role: 'user',
  };
  App.users.push(newUser);
  App.currentUser = newUser;
  updateNavUser();

  showToast('success', 'Account created!', 'Welcome to FRIBS');
  showSpinner('Setting up your account…');

  setTimeout(() => {
    hideSpinner();
    navigateTo('homePage');
    renderEvents();
  }, 1500);
}

/** Logout */
function logout() {
  App.currentUser = null;
  App.selectedEvent = null;
  App.selectedSeats = [];
  showToast('info', 'Logged out', 'See you next time!');
  navigateTo('loginPage');
  document.getElementById('loginForm').reset();
}

/** Update navbar with user info */
function updateNavUser() {
  const u = App.currentUser;
  if (!u) return;
  const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  document.querySelectorAll('.nav-avatar').forEach(el => {
    el.textContent = initials;
    el.title = u.name;
  });
  // Show/hide admin link
  const adminLink = document.getElementById('adminNavLink');
  if (adminLink) adminLink.style.display = u.role === 'admin' ? '' : 'none';
}


/* ============================================================
   HOME PAGE / EVENTS
   ============================================================ */

/** Render events cards */
function renderEvents(filter = 'all', query = '') {
  const grid  = document.getElementById('eventsGrid');
  const count = document.getElementById('eventsCount');
  if (!grid) return;

  let list = App.events;

  // Apply category filter
  if (filter !== 'all') {
    list = list.filter(e => e.type.toLowerCase() === filter.toLowerCase());
  }

  // Apply search query
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q)
    );
  }

  if (count) count.textContent = `(${list.length})`;

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔍</div>
        <h3>No events found</h3>
        <p>Try a different search or category</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map((ev, i) => `
    <div class="event-card fade-up fade-up-delay-${Math.min(i % 4 + 1, 4)}"
         onclick="openSeatSelection('${ev.id}')">
      <div class="event-poster-wrap">
        <div class="event-poster-placeholder"
             style="background: linear-gradient(135deg, ${ev.color}22, ${ev.color}44)">
          <span style="font-size:3rem">${ev.icon}</span>
        </div>
        ${ev.badge ? `<span class="event-badge ${ev.badge === 'trending' ? 'trending' : ''}">${ev.badge}</span>` : ''}
      </div>
      <div class="event-info">
        <div class="event-type">${typeIcon(ev.type)} ${ev.type}</div>
        <div class="event-title">${ev.title}</div>
        <div class="event-meta">
          <div class="event-meta-item"><i class="fas fa-calendar-alt"></i> ${ev.date} · ${ev.time}</div>
          <div class="event-meta-item"><i class="fas fa-map-marker-alt"></i> ${ev.location}</div>
          <div class="event-meta-item"><i class="fas fa-chair"></i> ${ev.totalSeats - ev.bookedSeats.length} seats left</div>
        </div>
        <div class="event-footer">
          <div class="event-price">
            ₹${ev.price.toLocaleString()}
            <small>onwards</small>
          </div>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openSeatSelection('${ev.id}')">
            Book Now <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

/** Return icon for event type */
function typeIcon(type) {
  const map = {
    'Movie':'🎬','Concert':'🎵','Flight':'✈️','Comedy':'😂','Sports':'🏏','Theater':'🎭'
  };
  return map[type] || '🎫';
}


/* ============================================================
   SEAT SELECTION PAGE
   ============================================================ */

/** Open seat selection for an event */
function openSeatSelection(eventId) {
  if (!App.currentUser) { navigateTo('loginPage'); return; }

  App.selectedEvent = App.events.find(e => e.id === eventId);
  App.selectedSeats = [];

  if (!App.selectedEvent) return;

  renderSeatPage();
  navigateTo('seatPage');
  setNavActive('home');
}

/** Render the seat selection page */
function renderSeatPage() {
  const ev = App.selectedEvent;
  if (!ev) return;

  // Update page header
  document.getElementById('seatPageTitle').textContent = ev.title;
  document.getElementById('seatPageSubtitle').textContent = `${ev.date} · ${ev.time} · ${ev.location}`;

  // Event summary in panel
  document.getElementById('panelEventIcon').textContent = ev.icon;
  document.getElementById('panelEventName').textContent = ev.title;
  document.getElementById('panelEventMeta').textContent = `${ev.date} · ${ev.time}`;

  // Render seat grid
  renderSeatGrid();
  updateBookingPanel();
}

/** Generate seat layout based on event type */
function renderSeatGrid() {
  const ev     = App.selectedEvent;
  const grid   = document.getElementById('seatGrid');
  const isFlightType = ev.type === 'Flight';

  if (isFlightType) {
    renderFlightSeats(grid, ev);
  } else {
    renderTheatreSeats(grid, ev);
  }
}

/** Render theatre/event style seats */
function renderTheatreSeats(grid, ev) {
  const rows = ['A','B','C','D','E','F','G','H'];
  const cols = [1,2,3,4,5,6,7,8,9,10];
  const vipRows = ['A','B'];

  // Section labels
  let html = `
    <div class="seat-section-label">VIP / Premium</div>
  `;

  rows.forEach((row, ri) => {
    if (ri === 2) html += `<div class="seat-section-label" style="margin-top:1rem">Regular</div>`;

    html += `<div class="seat-row">
      <span class="row-label">${row}</span>`;

    // Left block
    [1,2,3,4].forEach(col => {
      const seatId = `${row}${col}`;
      const isBooked   = ev.bookedSeats.includes(seatId);
      const isSelected = App.selectedSeats.includes(seatId);
      const isVip      = vipRows.includes(row);
      const cls = isBooked ? 'booked' : isSelected ? 'selected' : isVip ? 'vip available' : 'available';
      html += `<button class="seat ${cls}" title="${seatId} ${isBooked ? '(Booked)' : isVip ? '(VIP)' : ''}"
        data-seat="${seatId}" data-vip="${isVip}"
        ${isBooked ? 'disabled' : `onclick="toggleSeat('${seatId}', this)"`}></button>`;
    });

    html += `<span class="seat-aisle"></span>`;

    // Right block
    [5,6,7,8,9,10].forEach(col => {
      const seatId = `${row}${col}`;
      const isBooked   = ev.bookedSeats.includes(seatId);
      const isSelected = App.selectedSeats.includes(seatId);
      const isVip      = vipRows.includes(row);
      const cls = isBooked ? 'booked' : isSelected ? 'selected' : isVip ? 'vip available' : 'available';
      html += `<button class="seat ${cls}" title="${seatId} ${isBooked ? '(Booked)' : isVip ? '(VIP)' : ''}"
        data-seat="${seatId}" data-vip="${isVip}"
        ${isBooked ? 'disabled' : `onclick="toggleSeat('${seatId}', this)"`}></button>`;
    });

    html += `</div>`;
  });

  grid.innerHTML = html;
}

/** Render flight-style seats */
function renderFlightSeats(grid, ev) {
  const rows  = [1,2,3,4,5,6,7,8,9,10,11,12];
  const cols  = ['A','B','C','D','E','F'];
  const bCols = ['A','B','C'];
  const eCols = ['D','E','F'];

  let html = `<div class="seat-section-label">Economy Class</div>`;

  rows.forEach(row => {
    html += `<div class="seat-row"><span class="row-label">${row}</span>`;

    bCols.forEach(col => {
      const seatId = `${row}${col}`;
      const isBooked   = ev.bookedSeats.includes(seatId);
      const isSelected = App.selectedSeats.includes(seatId);
      const cls = isBooked ? 'booked' : isSelected ? 'selected' : 'available';
      html += `<button class="seat ${cls}" title="${seatId}"
        data-seat="${seatId}" data-vip="false"
        ${isBooked ? 'disabled' : `onclick="toggleSeat('${seatId}', this)"`}></button>`;
    });

    html += `<span class="seat-aisle"></span>`;

    eCols.forEach(col => {
      const seatId = `${row}${col}`;
      const isBooked   = ev.bookedSeats.includes(seatId);
      const isSelected = App.selectedSeats.includes(seatId);
      const cls = isBooked ? 'booked' : isSelected ? 'selected' : 'available';
      html += `<button class="seat ${cls}" title="${seatId}"
        data-seat="${seatId}" data-vip="false"
        ${isBooked ? 'disabled' : `onclick="toggleSeat('${seatId}', this)"`}></button>`;
    });

    html += `</div>`;
  });

  grid.innerHTML = html;
}

/** Toggle seat selection */
function toggleSeat(seatId, el) {
  const isVip   = el.dataset.vip === 'true';
  const idx     = App.selectedSeats.indexOf(seatId);
  const MAX     = 8;

  if (idx === -1) {
    // Select
    if (App.selectedSeats.length >= MAX) {
      showToast('warning', 'Max seats reached', `You can select up to ${MAX} seats`);
      return;
    }
    App.selectedSeats.push(seatId);
    el.classList.remove('available', 'vip');
    el.classList.add('selected');
    if (isVip) el.classList.add('vip');
  } else {
    // Deselect
    App.selectedSeats.splice(idx, 1);
    el.classList.remove('selected');
    el.classList.add(isVip ? 'vip available' : 'available');
    // Re-add vip class if needed
    if (isVip) { el.classList.add('available'); }
  }

  updateBookingPanel();
}

/** Update right-side booking summary panel */
function updateBookingPanel() {
  const ev = App.selectedEvent;
  if (!ev) return;

  // Seat tags
  const list = document.getElementById('selectedSeatsList');
  if (App.selectedSeats.length === 0) {
    list.innerHTML = `<span class="seat-placeholder">No seats selected</span>`;
  } else {
    list.innerHTML = App.selectedSeats.map(s => `<span class="seat-tag">${s}</span>`).join('');
  }

  // Price calculation
  const seatPrices = App.selectedSeats.map(s => {
    const row = s[0];
    const isVip = ['A','B'].includes(row) && ev.type !== 'Flight';
    return isVip ? ev.vipPrice : ev.price;
  });

  const subtotal    = seatPrices.reduce((a, b) => a + b, 0);
  const convenience = Math.round(subtotal * 0.03);
  const gst         = Math.round(subtotal * 0.18);
  const total       = subtotal + convenience + gst;

  document.getElementById('priceSubtotal').textContent   = `₹${subtotal.toLocaleString()}`;
  document.getElementById('priceConvenience').textContent = `₹${convenience.toLocaleString()}`;
  document.getElementById('priceGST').textContent         = `₹${gst.toLocaleString()}`;
  document.getElementById('priceTotal').textContent       = `₹${total.toLocaleString()}`;

  // Enable/disable confirm button
  const btn = document.getElementById('confirmBookingBtn');
  if (btn) {
    btn.disabled = App.selectedSeats.length === 0;
    btn.classList.toggle('btn-primary', App.selectedSeats.length > 0);
  }

  // Store total for modal
  App._currentTotal = total;
}

/** Open booking confirmation modal */
function openBookingModal() {
  if (App.selectedSeats.length === 0) {
    showToast('warning', 'No seats', 'Please select at least one seat');
    return;
  }

  const ev = App.selectedEvent;
  document.getElementById('modalEventName').textContent  = ev.title;
  document.getElementById('modalSeats').textContent      = App.selectedSeats.join(', ');
  document.getElementById('modalDateTime').textContent   = `${ev.date} · ${ev.time}`;
  document.getElementById('modalTotal').textContent      = `₹${App._currentTotal?.toLocaleString() || 0}`;

  document.getElementById('bookingModal').classList.add('active');
}

/** Confirm booking — simulate payment */
function confirmBooking() {
  document.getElementById('bookingModal').classList.remove('active');

  showSpinner('Processing your booking…');

  setTimeout(() => {
    hideSpinner();

    // Create booking record
    const booking = {
      id:      'BKG' + Math.floor(Math.random() * 9000 + 1000),
      eventId: App.selectedEvent.id,
      userId:  App.currentUser.id,
      seats:   [...App.selectedSeats],
      total:   App._currentTotal,
      status:  'paid',
      date:    new Date().toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }),
    };

    App.bookings.push(booking);
    App.lastBooking = booking;

    // Mark seats as booked
    App.selectedEvent.bookedSeats.push(...App.selectedSeats);

    // Show confirmation page
    renderConfirmationPage(booking);
    navigateTo('confirmPage');

    showToast('success', 'Booking Confirmed! 🎉', `Booking ID: ${booking.id}`);
  }, 2200);
}


/* ============================================================
   BOOKING CONFIRMATION PAGE
   ============================================================ */

/** Render the booking confirmation page */
function renderConfirmationPage(booking) {
  const ev = App.events.find(e => e.id === booking.eventId);
  if (!ev) return;

  document.getElementById('confEventIcon').textContent  = ev.icon;
  document.getElementById('confEventName').textContent  = ev.title;
  document.getElementById('confEventType').textContent  = ev.type;
  document.getElementById('confBookingId').textContent  = booking.id;
  document.getElementById('confSeats').textContent      = booking.seats.join(', ');
  document.getElementById('confDate').textContent       = ev.date;
  document.getElementById('confTime').textContent       = ev.time;
  document.getElementById('confLocation').textContent   = ev.location;
  document.getElementById('confTotal').textContent      = `₹${booking.total?.toLocaleString()}`;
  document.getElementById('confStatus').innerHTML       = `<span class="status-pill paid">✓ Paid</span>`;
  document.getElementById('confName').textContent       = App.currentUser?.name || '—';
  document.getElementById('confQrId').textContent       = booking.id;
}


/* ============================================================
   MY BOOKINGS PAGE
   ============================================================ */

/** Render the user's booking history */
function renderMyBookings() {
  const container = document.getElementById('myBookingsList');
  if (!container) return;

  const userBookings = App.bookings.filter(b => b.userId === App.currentUser?.id);

  if (userBookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎫</div>
        <h3>No bookings yet</h3>
        <p>Book your first event!</p>
        <button class="btn btn-primary mt-3" onclick="navigateTo('homePage')">Browse Events</button>
      </div>`;
    return;
  }

  container.innerHTML = userBookings.map(b => {
    const ev = App.events.find(e => e.id === b.eventId);
    if (!ev) return '';
    return `
      <div class="booking-item fade-up">
        <div class="thumb-placeholder"
             style="background: linear-gradient(135deg, ${ev.color}22, ${ev.color}44)">
          ${ev.icon}
        </div>
        <div class="booking-item-info">
          <div class="booking-item-title">${ev.title}</div>
          <div class="booking-item-meta">
            <span><i class="fas fa-calendar-alt"></i> ${ev.date}</span>
            <span><i class="fas fa-clock"></i> ${ev.time}</span>
            <span><i class="fas fa-chair"></i> ${b.seats.join(', ')}</span>
            <span><i class="fas fa-hashtag"></i> ${b.id}</span>
          </div>
        </div>
        <div class="booking-item-right">
          <div class="booking-item-price">₹${b.total?.toLocaleString() || 0}</div>
          <div class="booking-item-seats"><span class="status-pill paid">Paid</span></div>
        </div>
      </div>`;
  }).join('');
}


/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */

/** Render the admin dashboard */
function renderAdminDashboard() {
  renderAdminStats();
  renderAdminTable();
  renderActivityLog();
}

/** Render summary stat cards */
function renderAdminStats() {
  const total      = App.adminUsers.length;
  const suspicious = App.adminUsers.filter(u => u.flag !== 'safe').length;
  const blocked    = App.adminUsers.filter(u => u.flag === 'danger').length;
  const bookings   = App.bookings.length + 12; // mock total

  const el = document.getElementById('adminStats');
  if (!el) return;

  el.innerHTML = `
    <div class="stat-card fade-up">
      <div class="stat-icon orange"><i class="fas fa-users"></i></div>
      <div class="stat-info">
        <label>Total Users</label>
        <div class="stat-value">${total}</div>
      </div>
    </div>
    <div class="stat-card fade-up fade-up-delay-1">
      <div class="stat-icon blue"><i class="fas fa-ticket-alt"></i></div>
      <div class="stat-info">
        <label>Total Bookings</label>
        <div class="stat-value">${bookings}</div>
      </div>
    </div>
    <div class="stat-card fade-up fade-up-delay-2">
      <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
      <div class="stat-info">
        <label>Suspicious</label>
        <div class="stat-value">${suspicious}</div>
      </div>
    </div>
    <div class="stat-card fade-up fade-up-delay-3">
      <div class="stat-icon green"><i class="fas fa-shield-alt"></i></div>
      <div class="stat-info">
        <label>Flagged & Blocked</label>
        <div class="stat-value">${blocked}</div>
      </div>
    </div>
  `;
}

/** Render users table */
function renderAdminTable() {
  const tbody = document.getElementById('adminUsersBody');
  if (!tbody) return;

  tbody.innerHTML = App.adminUsers.map(u => {
    const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
    const isSusp   = u.flag !== 'safe';
    return `
      <tr class="${isSusp ? 'suspicious' : ''}">
        <td>
          <div class="user-cell">
            <div class="user-mini-avatar">${initials}</div>
            <div>
              <div class="user-mini-name">${u.name}</div>
              <div class="user-mini-email">${u.email}</div>
            </div>
          </div>
        </td>
        <td><code style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted)">${u.id}</code></td>
        <td>
          <span style="font-weight:700;color:${u.bookings > 50 ? 'var(--danger)' : 'var(--text-primary)'}">
            ${u.bookings}
          </span>
          ${u.bookings > 50 ? ' <i class="fas fa-exclamation-circle" style="color:var(--danger);font-size:0.75rem"></i>' : ''}
        </td>
        <td><span class="status-pill ${u.flag}">${u.flag === 'safe' ? '✓ Safe' : u.flag === 'warning' ? '⚠ Warning' : '✕ Danger'}</span></td>
        <td style="color:var(--text-muted);font-size:0.8rem">${u.lastActivity}</td>
        <td>
          <div class="flex gap-1">
            <button class="btn btn-sm btn-secondary" onclick="showToast('info','Action','Viewing user ${u.id}')">
              <i class="fas fa-eye"></i>
            </button>
            ${isSusp ? `<button class="btn btn-sm btn-danger" onclick="blockUser('${u.id}')">
              <i class="fas fa-ban"></i>
            </button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

/** Render activity log */
function renderActivityLog() {
  const tbody = document.getElementById('activityLogBody');
  if (!tbody) return;

  tbody.innerHTML = App.activityLog.map(log => `
    <tr>
      <td style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted)">${log.time}</td>
      <td><code style="font-family:var(--font-mono);font-size:0.8rem;color:var(--accent)">${log.user}</code></td>
      <td>
        <div class="log-action">
          <span class="log-dot ${log.type}"></span>
          ${log.action}
        </div>
      </td>
      <td style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted)">${log.ip}</td>
    </tr>
  `).join('');
}

/** Block a suspicious user */
function blockUser(userId) {
  const user = App.adminUsers.find(u => u.id === userId);
  if (user) {
    user.flag = 'danger';
    renderAdminTable();
    showToast('warning', 'User flagged', `${user.name} has been blocked`);
  }
}


/* ============================================================
   UI HELPERS
   ============================================================ */

/** Show a toast notification */
function showToast(type, title, message) {
  const container = document.getElementById('toastContainer');
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
  const faIcons = { success:'fa-check', error:'fa-times', warning:'fa-exclamation', info:'fa-info' };

  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${faIcons[type]}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
    <div class="toast-border"></div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

/** Show loading spinner */
function showSpinner(label = 'Loading…') {
  const overlay = document.getElementById('spinnerOverlay');
  const lbl     = document.getElementById('spinnerLabel');
  if (lbl) lbl.textContent = label;
  if (overlay) overlay.classList.add('active');
}

/** Hide loading spinner */
function hideSpinner() {
  const overlay = document.getElementById('spinnerOverlay');
  if (overlay) overlay.classList.remove('active');
}

/** Show a field-level error */
function showError(errId, message) {
  const el = document.getElementById(errId);
  if (el) { el.textContent = message; el.classList.add('show'); }
}

/** Clear all errors in a form */
function clearErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
  form.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
}

/** Shake an element to signal invalid input */
function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => el.style.animation = '', 400);
}

/** Email validation */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Toggle password visibility */
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const btn   = input?.parentElement?.querySelector('.toggle-pw i');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) { btn.classList.remove('fa-eye'); btn.classList.add('fa-eye-slash'); }
  } else {
    input.type = 'password';
    if (btn) { btn.classList.remove('fa-eye-slash'); btn.classList.add('fa-eye'); }
  }
}

/** Password strength checker */
function checkPasswordStrength(val) {
  const bar   = document.getElementById('pwStrengthFill');
  const label = document.getElementById('pwStrengthLabel');
  if (!bar || !label) return;

  let score = 0;
  if (val.length >= 8)          score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const levels = [
    { pct: '0%',    color: 'transparent', text: '' },
    { pct: '25%',   color: '#ef4444',     text: 'Weak' },
    { pct: '50%',   color: '#f59e0b',     text: 'Fair' },
    { pct: '75%',   color: '#3b82f6',     text: 'Good' },
    { pct: '100%',  color: '#22c55e',     text: 'Strong' },
  ];

  const lvl = levels[score] || levels[0];
  bar.style.width      = lvl.pct;
  bar.style.background = lvl.color;
  label.textContent    = lvl.text;
  label.style.color    = lvl.color;
}

/* Shake keyframes via JS injection */
(function injectShakeKeyframes() {
  const style = document.createElement('style');
  style.textContent = `@keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-8px)}
    40%{transform:translateX(8px)}
    60%{transform:translateX(-6px)}
    80%{transform:translateX(6px)}
  }`;
  document.head.appendChild(style);
})();


/* ============================================================
   EVENT LISTENERS & INITIALIZATION
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Login form ---------- */
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  /* ---------- Register form ---------- */
  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  /* ---------- Password strength on register page ---------- */
  const regPw = document.getElementById('regPassword');
  if (regPw) regPw.addEventListener('input', e => checkPasswordStrength(e.target.value));

  /* ---------- Filter tabs ---------- */
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const query = document.getElementById('searchBar')?.value || '';
      renderEvents(tab.dataset.filter, query);
    });
  });

  /* ---------- Search bar ---------- */
  const searchBar = document.getElementById('searchBar');
  if (searchBar) {
    searchBar.addEventListener('input', debounce(e => {
      const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
      renderEvents(activeFilter, e.target.value);
    }, 250));
  }

  /* ---------- Navbar links ---------- */
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = el.dataset.page;

      if (page === 'logout') { logout(); return; }
      if (page === 'home')   { navigateTo('homePage'); renderEvents(); setNavActive('home'); return; }
      if (page === 'mybookings') {
        navigateTo('myBookingsPage');
        renderMyBookings();
        setNavActive('mybookings');
        return;
      }
      if (page === 'admin') {
        navigateTo('adminPage');
        renderAdminDashboard();
        setNavActive('admin');
        return;
      }
    });
  });

  /* ---------- Mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
      }
    });
  }

  /* ---------- Modal close ---------- */
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  /* ---------- Show login page initially ---------- */
  navigateTo('loginPage');
});

/* ---------- Debounce helper ---------- */
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
