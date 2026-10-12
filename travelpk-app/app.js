/* Travel.pk demo app - UI layer (sample data, no live booking) */
(function () {
  "use strict";
  const D = TravelData;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const store = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  const state = {
    search: null, results: [], sort: "price", selected: null,
    passengers: [], booking: null, lastAlert: null,
  };

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
  }

  function airportLabel(code) { const a = D.AIRPORTS[code]; return a ? a.city + " (" + code + ")" : code; }
  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }
  function todayISO() { const d = new Date(); return d.toISOString().slice(0, 10); }
  function plusDaysISO(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

  /* ---------- seed demo data ---------- */
  function seedTrips() {
    if (store.get("tp_trips", null)) return;
    const r1 = D.genItineraries("LHE", "DXB", plusDaysISO(21), 1, "Economy")[0];
    const r2 = D.genItineraries("KHI", "JED", plusDaysISO(-40), 2, "Economy")[1];
    store.set("tp_trips", [
      {
        ref: "TP-7KQ2MD", status: "Confirmed", bookedOn: plusDaysISO(-9),
        search: { from: "LHE", to: "DXB", date: plusDaysISO(21), travelers: 1, cabin: "Economy" },
        itin: r1, passengers: [{ first: "Ahmed", last: "Raza" }], total: r1.price,
      },
      {
        ref: "TP-3BX9PL", status: "Completed", bookedOn: plusDaysISO(-52),
        search: { from: "KHI", to: "JED", date: plusDaysISO(-40), travelers: 2, cabin: "Economy" },
        itin: r2, passengers: [{ first: "Fatima", last: "Khan" }, { first: "Bilal", last: "Khan" }], total: r2.price * 2,
      },
    ]);
  }
  function getTrips() { seedTrips(); return store.get("tp_trips", []); }
  function saveTrips(t) { store.set("tp_trips", t); }
  function getAlerts() { return store.get("tp_alerts", []); }
  function saveAlerts(a) { store.set("tp_alerts", a); }

  /* ---------- shared components ---------- */
  function header(title, opts) {
    opts = opts || {};
    return '<header class="appbar">' +
      (opts.back ? '<button class="iconbtn" data-back aria-label="Back">&#8592;</button>' : "") +
      '<h1>' + esc(title) + "</h1>" +
      (opts.action || "") + "</header>";
  }
  function tabbar(active) {
    const tabs = [
      ["home", "Home", "&#8962;"],
      ["trips", "My Trips", "&#9992;"],
      ["alerts", "Alerts", "&#128276;"],
      ["guides", "Guides", "&#9775;"],
      ["more", "More", "&#8942;"],
    ];
    return '<nav class="tabbar">' + tabs.map(([r, l, i]) =>
      '<a href="#/' + r + '" class="tab' + (active === r ? " active" : "") + '"><span class="tabicon">' + i + '</span><span>' + l + "</span></a>"
    ).join("") + "</nav>";
  }
  function airportOptions(sel) {
    return Object.keys(D.AIRPORTS).map((c) =>
      '<option value="' + c + '"' + (c === sel ? " selected" : "") + ">" + esc(D.AIRPORTS[c].city + " (" + c + ")") + "</option>"
    ).join("");
  }
  function statusPill(s) {
    const cls = s === "Confirmed" ? "ok" : s === "Completed" ? "done" : s === "Cancelled" ? "bad" : "warn";
    return '<span class="pill ' + cls + '">' + esc(s) + "</span>";
  }
  function fareCard(itin, showPrice) {
    const al = D.AIRLINES[itin.airline];
    const segs = itin.segments.map((s) =>
      '<div class="seg"><span class="seg-time">' + s.dep + '</span><span class="seg-route">' + s.from + " &#8594; " + s.to +
      '</span><span class="seg-time">' + s.arr + "</span></div>"
    ).join("");
    const stops = itin.stops === 0 ? "Nonstop" : "1 stop" + (itin.via ? " via " + itin.via : "");
    return '<div class="flightcard">' +
      '<div class="fc-top"><span class="airline">' + esc(al.name) + '</span>' +
      '<span class="faretag">' + esc(itin.fare.name) + "</span></div>" +
      '<div class="fc-route"><strong>' + itin.segments[0].from + '</strong><span class="fc-line"></span><strong>' + itin.segments[itin.segments.length - 1].to + "</strong></div>" +
      segs +
      '<div class="fc-meta"><span>&#128337; ' + D.fmtDur(itin.durationMins) + "</span><span>&#10548; " + esc(stops) + "</span><span>&#128188; " + esc(itin.baggage) + "</span></div>" +
      (showPrice ? '<div class="fc-price"><div><span class="price">' + D.fmtPKR(itin.price) + '</span><span class="per"> per traveler</span></div></div>' : "") +
      "</div>";
  }

  /* ---------- views ---------- */
  const views = {};

  views.home = function () {
    const popular = D.POPULAR_ROUTES.map((r) =>
      '<button class="destcard" data-route="' + r.from + ":" + r.to + '">' +
      '<span class="dest-from">' + r.from + '</span><span class="dest-arrow">&#8594;</span><span class="dest-to">' + r.to + "</span>" +
      '<span class="dest-label">' + esc(r.label) + '</span><span class="dest-tag">' + esc(r.tag) + '</span></button>'
    ).join("");
    return header("Travel.pk") +
      '<div class="screen"><div class="hero">' +
      '<h2>Find cheap flights from Pakistan</h2>' +
      '<p>Compare 300+ airlines in PKR. Urdu and English support.</p></div>' +
      '<div class="card"><h3>Search flights</h3>' +
      '<form id="searchForm">' +
      '<div class="grid2">' +
      '<label>From<select name="from" id="fFrom">' + airportOptions("LHE") + "</select></label>" +
      '<label>To<select name="to" id="fTo">' + airportOptions("DXB") + "</select></label></div>" +
      '<label>Departure date<input type="date" name="date" id="fDate" min="' + todayISO() + '" value="' + plusDaysISO(30) + '" required></label>' +
      '<div class="grid2">' +
      '<label>Travelers<select name="travelers">' + [1, 2, 3, 4, 5, 6].map((n) => '<option value="' + n + '">' + n + (n === 1 ? " traveler" : " travelers") + "</option>").join("") + "</select></label>" +
      '<label>Cabin<select name="cabin"><option>Economy</option><option>Business</option></select></label></div>' +
      '<button class="btn primary big" type="submit">Search flights</button>' +
      '<p class="fineprint">Sample fares for demonstration. Live booking opens in the full release.</p>' +
      "</form></div>" +
      '<h3 class="sectitle">Popular routes</h3><div class="hscroll">' + popular + "</div>" +
      '<h3 class="sectitle">Plan your trip</h3><div class="quickgrid">' +
      '<a class="quick" href="#/umrah"><span class="qicon">&#128330;</span>Umrah planning</a>' +
      '<a class="quick" href="#/visa"><span class="qicon">&#128196;</span>Visa guidance</a>' +
      '<a class="quick" href="#/guides"><span class="qicon">&#127758;</span>Destination guides</a>' +
      '<a class="quick" href="#/alerts"><span class="qicon">&#128276;</span>Price alerts</a>' +
      '<a class="quick" href="#/support"><span class="qicon">&#128172;</span>Support</a>' +
      '<a class="quick" href="#/trips"><span class="qicon">&#9992;</span>My trips</a></div>' +
      '<div class="contactstrip"><div><strong>Need help booking?</strong><span>' + esc(D.CONTACT.hours) + "</span></div>" +
      '<a class="btn small" href="' + D.CONTACT.phoneHref + '">Call</a></div>' +
      "</div>" + tabbar("home");
  };

  views.results = function () {
    const s = state.search;
    if (!s || !state.results.length) return header("Results", { back: true }) + '<div class="screen"><p class="empty">No search yet. <a href="#/home">Search flights</a> first.</p></div>' + tabbar("home");
    const sorted = state.results.slice().sort((a, b) => state.sort === "price" ? a.price - b.price : a.durationMins - b.durationMins);
    const cards = sorted.map((it, i) =>
      '<div class="card resultcard" data-itid="' + it.id + '">' + fareCard(it, true) +
      '<button class="linkbtn faretoggle">Fare conditions &#9662;</button>' +
      '<div class="farerules hidden"><strong>' + esc(it.fare.name) + " fare</strong><p>" + esc(it.fare.note) + "</p>" +
      '<ul><li>Refund: ' + esc(it.fare.refund) + "</li><li>Change fee: " + D.fmtPKR(it.fare.changeFee) + " + fare difference</li><li>Aircraft: " + esc(it.aircraft) + "</li></ul></div>" +
      '<button class="btn primary selectbtn" data-itid="' + it.id + '">Select flight</button></div>'
    ).join("");
    return header("Flights", { back: true }) +
      '<div class="screen"><div class="resultsum"><strong>' + s.from + " &#8594; " + s.to + "</strong><span>" +
      fmtDate(s.date) + " &middot; " + s.travelers + " traveler" + (s.travelers > 1 ? "s" : "") + " &middot; " + esc(s.cabin) +
      '</span></div><div class="sortrow"><span>Sort:</span>' +
      '<button class="chip' + (state.sort === "price" ? " on" : "") + '" data-sort="price">Price</button>' +
      '<button class="chip' + (state.sort === "duration" ? " on" : "") + '" data-sort="duration">Duration</button></div>' +
      '<p class="fineprint">' + sorted.length + " sample itineraries. Fares in PKR, per traveler.</p>" +
      cards + "</div>" + tabbar("home");
  };

  views.passengers = function () {
    if (!state.selected) return views.results();
    const n = state.search.travelers;
    let blocks = "";
    for (let i = 0; i < n; i++) {
      blocks += '<div class="card"><h3>Traveler ' + (i + 1) + "</h3>" +
        '<div class="grid2"><label>First name<input name="p' + i + '_first" required placeholder="As on passport"></label>' +
        '<label>Last name<input name="p' + i + '_last" required placeholder="As on passport"></label></div>' +
        '<div class="grid2"><label>Date of birth<input type="date" name="p' + i + '_dob" required max="' + todayISO() + '"></label>' +
        '<label>Passport number<input name="p' + i + '_pp" required placeholder="e.g. AB1234567"></label></div></div>';
    }
    return header("Passenger details", { back: true }) +
      '<div class="screen">' + fareCard(state.selected, true) +
      '<form id="paxForm">' + blocks +
      '<div class="card"><h3>Contact for e-ticket</h3>' +
      '<label>Email<input type="email" name="email" required placeholder="you@example.com"></label>' +
      '<label>Mobile (WhatsApp)<input name="mobile" required placeholder="03xx xxxxxxx" pattern="[0-9+\\- ]{7,15}"></label></div>' +
      '<button class="btn primary big" type="submit">Continue to review</button></form></div>' + tabbar("home");
  };

  views.review = function () {
    if (!state.selected || !state.passengers.length) return views.passengers();
    const total = state.selected.price * state.search.travelers;
    const pax = state.passengers.map((p, i) => "<li>" + esc(p.first + " " + p.last) + " <span class='muted'>(" + esc(p.pp) + ")</span></li>").join("");
    state.booking = { total };
    return header("Review booking", { back: true }) +
      '<div class="screen"><h3 class="sectitle">Your itinerary</h3>' + fareCard(state.selected, false) +
      '<div class="card"><h3>Travelers</h3><ul class="paxlist">' + pax + "</ul>" +
      "<p><strong>Date:</strong> " + fmtDate(state.search.date) + "<br><strong>Cabin:</strong> " + esc(state.search.cabin) + "</p></div>" +
      '<div class="card"><h3>Fare rules</h3><p><strong>' + esc(state.selected.fare.name) + " fare:</strong> " + esc(state.selected.fare.note) + "</p>" +
      "<ul><li>Refund: " + esc(state.selected.fare.refund) + "</li><li>Change fee: " + D.fmtPKR(state.selected.fare.changeFee) + " + fare difference</li></ul></div>" +
      '<div class="card totalrow"><span>Total (' + state.search.travelers + " traveler" + (state.search.travelers > 1 ? "s" : "") + ")</span><strong>" + D.fmtPKR(total) + "</strong></div>" +
      '<a class="btn primary big" href="#/payment">Continue to payment</a>' +
      '<p class="fineprint">Demo checkout. No real payment is processed.</p></div>' + tabbar("home");
  };

  views.payment = function () {
    if (!state.booking) return views.review();
    const total = state.booking.total;
    return header("Payment", { back: true }) +
      '<div class="screen"><div class="card totalrow"><span>Amount due</span><strong>' + D.fmtPKR(total) + "</strong></div>" +
      '<form id="payForm"><div class="card"><h3>Payment method</h3>' +
      [["card", "Debit / credit card", "Pay securely by card (demo)"],
       ["bank", "Bank transfer", "IBFT to Travel.pk account, share receipt on WhatsApp"],
       ["office", "Pay at office", "Visit 231-B Main Boulevard, DHA Lahore, Mon to Fri 10am-7pm"]].map(([v, t, d], i) =>
        '<label class="payopt"><input type="radio" name="pay" value="' + v + '"' + (i === 0 ? " checked" : "") + "><span><strong>" + t + "</strong><small>" + d + "</small></span></label>"
      ).join("") + "</div>" +
      '<div class="card hidden" id="cardBox"><h3>Card details (demo)</h3>' +
      '<label>Card number<input inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19"></label>' +
      '<div class="grid2"><label>Expiry<input placeholder="MM/YY" maxlength="5"></label><label>CVC<input inputmode="numeric" placeholder="123" maxlength="4"></label></div></div>' +
      '<button class="btn primary big" type="submit">Pay ' + D.fmtPKR(total) + "</button>" +
      '<p class="fineprint">Demo checkout. No real payment is processed.</p></form></div>' + tabbar("home");
  };

  views.confirm = function () {
    const b = state.booking;
    if (!b || !b.ref) return views.home();
    return header("Booking confirmed") +
      '<div class="screen"><div class="successcheck">&#10003;</div>' +
      '<h2 class="center">Shukriya! Your trip is booked.</h2>' +
      '<p class="center muted">Booking reference</p><p class="refcode">' + esc(b.ref) + "</p>" +
      '<div class="ticket">' + fareCard(b.itin, false) +
      "<p><strong>Date:</strong> " + fmtDate(b.search.date) + "<br><strong>Travelers:</strong> " + esc(b.passengers.map((p) => p.first + " " + p.last).join(", ")) +
      "<br><strong>Paid:</strong> " + D.fmtPKR(b.total) + " via " + esc(b.payLabel) + "</p></div>" +
      '<p class="fineprint center">E-ticket will be emailed and shared on WhatsApp (demo).</p>' +
      '<a class="btn primary big" href="#/trips">View my trips</a>' +
      '<a class="btn ghost big" href="#/home">Book another flight</a></div>' + tabbar("trips");
  };

  views.trips = function () {
    const trips = getTrips();
    const cards = trips.map((t) =>
      '<a class="card tripcard" href="#/trip/' + t.ref + '"><div class="tc-top"><strong>' + t.search.from + " &#8594; " + t.search.to + "</strong>" + statusPill(t.status) + "</div>" +
      "<p>" + fmtDate(t.search.date) + " &middot; " + esc(D.AIRLINES[t.itin.airline].name) + "</p>" +
      '<p class="muted small">Ref ' + esc(t.ref) + " &middot; " + D.fmtPKR(t.total) + "</p></a>"
    ).join("");
    return header("My Trips") + '<div class="screen">' +
      (trips.length ? cards : '<p class="empty">No trips yet.</p>') +
      '<p class="fineprint">Includes sample bookings for demonstration.</p></div>' + tabbar("trips");
  };

  views.tripDetail = function (ref) {
    const t = getTrips().find((x) => x.ref === ref);
    if (!t) return header("Trip", { back: true }) + '<div class="screen"><p class="empty">Trip not found.</p></div>' + tabbar("trips");
    return header("Trip " + t.ref, { back: true }) +
      '<div class="screen"><div class="card"><div class="tc-top"><h3>' + t.search.from + " &#8594; " + t.search.to + "</h3>" + statusPill(t.status) + "</div>" +
      fareCard(t.itin, false) +
      "<p><strong>Date:</strong> " + fmtDate(t.search.date) + "<br><strong>Travelers:</strong> " + esc(t.passengers.map((p) => p.first + " " + p.last).join(", ")) +
      "<br><strong>Total paid:</strong> " + D.fmtPKR(t.total) + "<br><strong>Booked on:</strong> " + fmtDate(t.bookedOn) + "</p></div>" +
      (t.status === "Confirmed" ?
        '<div class="card"><h3>Request change or cancellation</h3><form id="changeForm" data-ref="' + esc(t.ref) + '">' +
        '<label>Request type<select name="rtype"><option>Change date</option><option>Change name spelling</option><option>Cancel booking</option><option>Add baggage</option></select></label>' +
        '<label>Details<textarea name="rdetail" rows="3" required placeholder="Tell us what you need changed"></textarea></label>' +
        '<button class="btn primary" type="submit">Send request</button></form>' +
        '<p class="fineprint">Fare rules apply: ' + esc(t.itin.fare.note) + "</p></div>"
        : "") +
      "</div>" + tabbar("trips");
  };

  views.alerts = function () {
    const alerts = getAlerts();
    const items = alerts.map((a, i) => {
      const cur = currentLowest(a.from, a.to);
      const hit = cur <= a.target;
      return '<div class="card alertcard"><div class="tc-top"><strong>' + a.from + " &#8594; " + a.to + "</strong>" +
        '<button class="iconbtn delalert" data-i="' + i + '" aria-label="Delete">&#10005;</button></div>' +
        "<p>Target: <strong>" + D.fmtPKR(a.target) + "</strong> &middot; Now from <strong>" + D.fmtPKR(cur) + "</strong></p>" +
        (hit ? '<span class="pill ok">Below target! Book now.</span>' : '<span class="pill warn">Watching</span>') +
        '<p class="muted small">Alert for ' + esc(a.email || a.mobile || "app") + "</p></div>";
    }).join("");
    return header("Price Alerts") +
      '<div class="screen"><div class="card"><h3>Create price alert</h3><form id="alertForm">' +
      '<div class="grid2"><label>From<select name="from">' + airportOptions("LHE") + "</select></label>" +
      '<label>To<select name="to">' + airportOptions("DXB") + "</select></label></div>" +
      '<label>Target price (PKR)<input type="number" name="target" min="5000" step="500" value="70000" required></label>' +
      '<label>Email or mobile<input name="contact" placeholder="For alert notifications"></label>' +
      '<button class="btn primary big" type="submit">Create alert</button></form></div>' +
      '<h3 class="sectitle">Active alerts</h3>' +
      (alerts.length ? items : '<p class="empty">No alerts yet. Create one above and we will watch the fare for you.</p>') +
      "</div>" + tabbar("alerts");
  };

  function currentLowest(from, to) {
    const r = D.genItineraries(from, to, plusDaysISO(30), 1, "Economy");
    return Math.min.apply(null, r.map((x) => x.price));
  }

  views.guides = function () {
    const cards = D.GUIDES.map((g) =>
      '<a class="card guidecard" href="#/guide/' + g.id + '"><div class="guidehead"><span class="gcode">' + g.code + "</span>" +
      "<div><strong>" + esc(g.city) + ", " + esc(g.country) + "</strong><p class='muted small'>" + esc(g.tagline) + "</p></div></div></a>"
    ).join("");
    return header("Travel Guides") +
      '<div class="screen">' +
      '<a class="card feature" href="#/umrah"><strong>&#128330; Umrah and Hajj planning</strong><p class="muted small">Visa, flights, hotels and ziyarat, step by step.</p></a>' +
      '<a class="card feature" href="#/visa"><strong>&#128196; Visa guidance</strong><p class="muted small">Checklists for UK, Schengen, UAE, Saudi and more.</p></a>' +
      '<h3 class="sectitle">Destinations</h3>' + cards + "</div>" + tabbar("guides");
  };

  views.guideDetail = function (id) {
    const g = D.GUIDES.find((x) => x.id === id);
    if (!g) return header("Guide", { back: true }) + '<div class="screen"><p class="empty">Guide not found.</p></div>' + tabbar("guides");
    return header(g.city, { back: true }) +
      '<div class="screen"><div class="card"><span class="gcode big">' + g.code + "</span><h2>" + esc(g.city) + ", " + esc(g.country) + "</h2>" +
      "<p>" + esc(g.tagline) + "</p>" +
      '<ul class="facts"><li><strong>Best time:</strong> ' + esc(g.bestTime) + "</li><li><strong>Currency:</strong> " + esc(g.currency) + "</li><li><strong>Language:</strong> " + esc(g.lang) + "</li></ul>" +
      '<h3>Visa</h3><p>' + esc(g.visa) + "</p><h3>Top highlights</h3><ul>" + g.highlights.map((h) => "<li>" + esc(h) + "</li>").join("") + "</ul>" +
      '<h3>Traveler tips</h3><ul>' + g.tips.map((h) => "<li>" + esc(h) + "</li>").join("") + "</ul></div>" +
      '<a class="btn primary big" href="#/home">Search flights to ' + g.code + "</a></div>" + tabbar("guides");
  };

  views.umrah = function () {
    const u = D.UMRAH;
    return header("Umrah and Hajj", { back: true }) +
      '<div class="screen"><div class="card"><h2>' + esc(u.title) + "</h2><p>" + esc(u.intro) + "</p></div>" +
      '<h3 class="sectitle">Plan in 6 steps</h3>' +
      u.steps.map((s, i) => '<div class="card step"><span class="stepnum">' + (i + 1) + "</span><div><strong>" + esc(s.t) + "</strong><p class='muted'>" + esc(s.d) + "</p></div></div>").join("") +
      '<h3 class="sectitle">Documents you will need</h3><div class="card"><ul>' + u.docs.map((d) => "<li>" + esc(d) + "</li>").join("") + "</ul></div>" +
      '<div class="contactstrip"><div><strong>Talk to a pilgrimage specialist</strong><span>' + esc(D.CONTACT.hours) + "</span></div>" +
      '<a class="btn small" href="' + D.CONTACT.whatsapp + '">WhatsApp</a></div></div>' + tabbar("guides");
  };

  views.visa = function () {
    return header("Visa Guidance", { back: true }) +
      '<div class="screen"><div class="card"><h2>Visa checklist for Pakistani travelers</h2>' +
      "<p>Get these six things right and most visit visas become straightforward.</p></div>" +
      D.VISA_CHECKLIST.map((v, i) => '<div class="card step"><span class="stepnum">' + (i + 1) + "</span><div><strong>" + esc(v.t) + "</strong><p class='muted'>" + esc(v.d) + "</p></div></div>").join("") +
      '<div class="card"><h3>Country notes</h3><ul>' +
      "<li><strong>UAE:</strong> tourist visa in 3 to 5 working days.</li>" +
      "<li><strong>Saudi Arabia:</strong> Umrah visa via authorised agents; tourist e-visa for eligible travelers.</li>" +
      "<li><strong>Turkiye:</strong> sticker visa, or e-visa with a valid US, UK or Schengen visa.</li>" +
      "<li><strong>Malaysia:</strong> eVISA online, usually approved within days.</li>" +
      "<li><strong>UK / Schengen / Canada:</strong> apply 6 to 8 weeks before travel; biometrics in Pakistan.</li></ul></div>" +
      '<p class="fineprint">Guidance only. Rules change; confirm with the embassy or Travel.pk support before applying.</p></div>' + tabbar("guides");
  };

  views.support = function () {
    const faqs = D.FAQS.map((f, i) =>
      '<div class="card faq"><button class="faq-q">' + esc(f.q) + '<span>&#9662;</span></button><div class="faq-a hidden"><p>' + esc(f.a) + "</p></div></div>"
    ).join("");
    return header("Support", { back: true }) +
      '<div class="screen"><h3 class="sectitle">Frequently asked questions</h3>' + faqs +
      '<h3 class="sectitle">Talk to us</h3><div class="card">' +
      '<a class="btn primary big" href="' + D.CONTACT.whatsapp + '">WhatsApp chat</a>' +
      '<a class="btn ghost big" href="' + D.CONTACT.phoneHref + '">Call ' + esc(D.CONTACT.phone) + "</a>" +
      '<a class="btn ghost big" href="mailto:' + D.CONTACT.email + '">Email ' + esc(D.CONTACT.email) + "</a>" +
      "<p class='muted small center'>" + esc(D.CONTACT.hours) + "<br>" + esc(D.CONTACT.address) + "</p></div></div>" + tabbar("more");
  };

  views.more = function () {
    const row = (href, icon, t, d) => '<a class="card menurrow" href="' + href + '"><span class="qicon">' + icon + "</span><div><strong>" + t + "</strong><p class='muted small'>" + d + "</p></div><span class='chev'>&#8250;</span></a>";
    return header("More") + '<div class="screen">' +
      row("#/support", "&#128172;", "Support and FAQs", "Booking help, payments, cancellations") +
      row("#/about", "&#8505;", "About Travel.pk", "Who we are and what we do") +
      row("#/terms", "&#128196;", "Terms summary", "Booking terms in plain words") +
      '<div class="card"><h3>Contact</h3><p><strong>' + esc(D.CONTACT.phone) + "</strong><br>" + esc(D.CONTACT.email) + "<br><span class='muted small'>" + esc(D.CONTACT.address) + "<br>" + esc(D.CONTACT.hours) + "</span></p></div>" +
      '<p class="fineprint center">Travel.pk demo app &middot; Sample data for demonstration</p></div>' + tabbar("more");
  };

  views.about = function () {
    return header("About Travel.pk", { back: true }) +
      '<div class="screen"><div class="card"><h2>Pakistan\'s travel companion</h2>' +
      "<p>Travel.pk is Pakistan's online travel platform for comparing flights across 300+ airlines, with fares in PKR and support in Urdu and English.</p>" +
      "<ul><li>Flight comparison with clear fare rules</li><li>Destination guides written for Pakistani travelers</li><li>Umrah and Hajj pilgrimage planning</li><li>Visa guidance and price alerts</li><li>Booking support by phone, WhatsApp and email</li></ul>" +
      "<p><strong>Office:</strong> " + esc(D.CONTACT.address) + "<br><strong>Hours:</strong> " + esc(D.CONTACT.hours) + "</p></div></div>" + tabbar("more");
  };

  views.terms = function () {
    return header("Terms Summary", { back: true }) +
      '<div class="screen"><div class="card"><h2>Booking terms in plain words</h2><ul>' +
      "<li>Fares are per traveler and include airline taxes. Service fees, if any, are shown before you pay.</li>" +
      "<li>Ticket rules depend on your fare: Saver (changes for a fee, no refund), Flex (cheaper changes, refund with fee), Flex Plus (free changes, full refund).</li>" +
      "<li>Name spellings must match your passport exactly, or the airline may deny boarding.</li>" +
      "<li>Visas are the traveler's responsibility. Check entry requirements before booking non-refundable fares.</li>" +
      "<li>Cancellations and date changes are processed during office hours: Mon to Fri, 10am to 7pm PKT.</li>" +
      "<li>This demo app uses sample data; no live booking or payment is processed here.</li></ul></div></div>" + tabbar("more");
  };

  /* ---------- router ---------- */
  function render() {
    const hash = location.hash || "#/home";
    const parts = hash.replace(/^#\//, "").split("/");
    const name = parts[0] || "home";
    const arg = decodeURIComponent(parts[1] || "");
    let html;
    switch (name) {
      case "home": html = views.home(); break;
      case "results": html = views.results(); break;
      case "passengers": html = views.passengers(); break;
      case "review": html = views.review(); break;
      case "payment": html = views.payment(); break;
      case "confirm": html = views.confirm(); break;
      case "trips": html = views.trips(); break;
      case "trip": html = views.tripDetail(arg); break;
      case "alerts": html = views.alerts(); break;
      case "guides": html = views.guides(); break;
      case "guide": html = views.guideDetail(arg); break;
      case "umrah": html = views.umrah(); break;
      case "visa": html = views.visa(); break;
      case "support": html = views.support(); break;
      case "more": html = views.more(); break;
      case "about": html = views.about(); break;
      case "terms": html = views.terms(); break;
      default: html = views.home();
    }
    $("#view").innerHTML = html;
    window.scrollTo(0, 0);
    wireView(name);
  }

  /* ---------- event wiring ---------- */
  function wireView(name) {
    $$("[data-back]").forEach((b) => b.addEventListener("click", () => history.back()));

    if (name === "home") {
      $("#searchForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target;
        const from = f.from.value, to = f.to.value;
        if (from === to) { toast("From and To cannot be the same city."); return; }
        if (!f.date.value) { toast("Please pick a departure date."); return; }
        state.search = { from, to, date: f.date.value, travelers: parseInt(f.travelers.value, 10), cabin: f.cabin.value };
        state.sort = "price";
        state.results = D.genItineraries(from, to, f.date.value, state.search.travelers, state.search.cabin);
        location.hash = "#/results";
      });
      $$(".destcard").forEach((b) => b.addEventListener("click", () => {
        const [from, to] = b.dataset.route.split(":");
        $("#fFrom").value = from; $("#fTo").value = to; $("#fDate").value = plusDaysISO(30);
        $("#searchForm").requestSubmit();
      }));
    }

    if (name === "results") {
      $$("[data-sort]").forEach((c) => c.addEventListener("click", () => { state.sort = c.dataset.sort; render(); }));
      $$(".faretoggle").forEach((t) => t.addEventListener("click", () => {
        const box = t.parentElement.querySelector(".farerules");
        box.classList.toggle("hidden");
        t.innerHTML = "Fare conditions " + (box.classList.contains("hidden") ? "&#9662;" : "&#9652;");
      }));
      $$(".selectbtn").forEach((b) => b.addEventListener("click", () => {
        state.selected = state.results.find((x) => x.id === b.dataset.itid);
        state.passengers = [];
        location.hash = "#/passengers";
      }));
    }

    if (name === "passengers") {
      $("#paxForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target, pax = [];
        for (let i = 0; i < state.search.travelers; i++) {
          const first = f["p" + i + "_first"].value.trim(), last = f["p" + i + "_last"].value.trim();
          if (!first || !last) { toast("Please fill every traveler's name."); return; }
          pax.push({ first, last, dob: f["p" + i + "_dob"].value, pp: f["p" + i + "_pp"].value.trim() });
        }
        state.passengers = pax;
        state.contact = { email: f.email.value.trim(), mobile: f.mobile.value.trim() };
        location.hash = "#/review";
      });
    }

    if (name === "payment") {
      const boxes = { card: $("#cardBox") };
      $$('input[name="pay"]').forEach((r) => r.addEventListener("change", () => {
        Object.keys(boxes).forEach((k) => boxes[k] && boxes[k].classList.add("hidden"));
        if (boxes[r.value]) boxes[r.value].classList.remove("hidden");
      }));
      $("#payForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const pay = e.target.pay.value;
        const labels = { card: "card (demo)", bank: "bank transfer", office: "pay at office" };
        const ref = D.bookingRef(state.search.from + state.search.to);
        const booking = {
          ref, status: "Confirmed", bookedOn: todayISO(),
          search: Object.assign({}, state.search),
          itin: state.selected, passengers: state.passengers,
          total: state.booking.total, payLabel: labels[pay], contact: state.contact,
        };
        const trips = getTrips(); trips.unshift(booking); saveTrips(trips);
        state.booking = booking;
        location.hash = "#/confirm";
      });
    }

    if (name === "trip" || name === "trips") {
      const form = $("#changeForm");
      if (form) form.addEventListener("submit", (e) => {
        e.preventDefault();
        const trips = getTrips();
        const t = trips.find((x) => x.ref === form.dataset.ref);
        if (t) { t.status = "Change requested"; saveTrips(trips); }
        toast("Request sent. Support will confirm on WhatsApp.");
        render();
      });
    }

    if (name === "alerts") {
      $("#alertForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target;
        if (f.from.value === f.to.value) { toast("From and To cannot be the same."); return; }
        const alerts = getAlerts();
        alerts.unshift({ from: f.from.value, to: f.to.value, target: parseInt(f.target.value, 10), contact: f.contact.value.trim(), created: todayISO() });
        saveAlerts(alerts);
        toast("Price alert created.");
        render();
      });
      $$(".delalert").forEach((b) => b.addEventListener("click", () => {
        const alerts = getAlerts(); alerts.splice(parseInt(b.dataset.i, 10), 1); saveAlerts(alerts);
        toast("Alert deleted."); render();
      }));
    }

    if (name === "support") {
      $$(".faq-q").forEach((q) => q.addEventListener("click", () => {
        const a = q.parentElement.querySelector(".faq-a");
        a.classList.toggle("hidden");
        q.querySelector("span").innerHTML = a.classList.contains("hidden") ? "&#9662;" : "&#9652;";
      }));
    }
  }

  window.addEventListener("hashchange", render);
  document.addEventListener("DOMContentLoaded", () => { render(); });
})();
