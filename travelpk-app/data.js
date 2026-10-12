/* Travel.pk demo app - data + itinerary engine (sample data, no live booking) */
const TravelData = (() => {
  const AIRPORTS = {
    LHE: { city: "Lahore", name: "Allama Iqbal Intl", country: "Pakistan" },
    KHI: { city: "Karachi", name: "Jinnah Intl", country: "Pakistan" },
    ISB: { city: "Islamabad", name: "Islamabad Intl", country: "Pakistan" },
    PEW: { city: "Peshawar", name: "Bacha Khan Intl", country: "Pakistan" },
    MUX: { city: "Multan", name: "Multan Intl", country: "Pakistan" },
    LYP: { city: "Faisalabad", name: "Faisalabad Intl", country: "Pakistan" },
    DXB: { city: "Dubai", name: "Dubai Intl", country: "UAE" },
    SHJ: { city: "Sharjah", name: "Sharjah Intl", country: "UAE" },
    AUH: { city: "Abu Dhabi", name: "Zayed Intl", country: "UAE" },
    JED: { city: "Jeddah", name: "King Abdulaziz Intl", country: "Saudi Arabia" },
    RUH: { city: "Riyadh", name: "King Khalid Intl", country: "Saudi Arabia" },
    DMM: { city: "Dammam", name: "King Fahd Intl", country: "Saudi Arabia" },
    DOH: { city: "Doha", name: "Hamad Intl", country: "Qatar" },
    MCT: { city: "Muscat", name: "Muscat Intl", country: "Oman" },
    BAH: { city: "Bahrain", name: "Bahrain Intl", country: "Bahrain" },
    KWI: { city: "Kuwait City", name: "Kuwait Intl", country: "Kuwait" },
    IST: { city: "Istanbul", name: "Istanbul Airport", country: "Turkiye" },
    LHR: { city: "London", name: "Heathrow", country: "United Kingdom" },
    MAN: { city: "Manchester", name: "Manchester Airport", country: "United Kingdom" },
    BHX: { city: "Birmingham", name: "Birmingham Airport", country: "United Kingdom" },
    CDG: { city: "Paris", name: "Charles de Gaulle", country: "France" },
    YYZ: { city: "Toronto", name: "Toronto Pearson", country: "Canada" },
    JFK: { city: "New York", name: "JFK Intl", country: "USA" },
    KUL: { city: "Kuala Lumpur", name: "KL Intl", country: "Malaysia" },
    BKK: { city: "Bangkok", name: "Suvarnabhumi", country: "Thailand" },
    SIN: { city: "Singapore", name: "Changi", country: "Singapore" },
    PEK: { city: "Beijing", name: "Capital Intl", country: "China" },
    CAN: { city: "Guangzhou", name: "Baiyun Intl", country: "China" },
  };

  const PAK = ["LHE", "KHI", "ISB", "PEW", "MUX", "LYP"];

  const AIRLINES = {
    PK: { name: "PIA", full: "Pakistan International Airlines" },
    PA: { name: "Airblue", full: "Airblue" },
    PF: { name: "AirSial", full: "AirSial" },
    ER: { name: "Serene Air", full: "Serene Air" },
    EK: { name: "Emirates", full: "Emirates" },
    QR: { name: "Qatar Airways", full: "Qatar Airways" },
    TK: { name: "Turkish Airlines", full: "Turkish Airlines" },
    SV: { name: "Saudia", full: "Saudia" },
    FZ: { name: "flydubai", full: "flydubai" },
    G9: { name: "Air Arabia", full: "Air Arabia" },
    WY: { name: "Oman Air", full: "Oman Air" },
  };

  // Typical nonstop availability from Pakistan (sample network)
  const NONSTOP = {
    DXB: ["PK", "PA", "PF", "ER", "EK", "FZ"],
    SHJ: ["G9", "PA", "PK"],
    AUH: ["PK", "PA"],
    JED: ["PK", "PA", "SV", "ER"],
    RUH: ["PK", "SV", "PA"],
    DMM: ["PK", "PA"],
    DOH: ["QR", "PK", "PA"],
    MCT: ["WY", "PK", "PA"],
    BAH: ["PK"],
    KWI: ["PK"],
    IST: ["TK", "PK"],
    LHR: ["PK"],
    MAN: ["PK"],
    KUL: ["PK", "PA"],
    BKK: ["PK"],
    PEK: ["PK"],
    CAN: ["PK"],
  };

  // One-stop hubs used for connecting itineraries
  const HUBS = [
    { code: "DXB", airlines: ["EK", "FZ"] },
    { code: "DOH", airlines: ["QR"] },
    { code: "IST", airlines: ["TK"] },
    { code: "JED", airlines: ["SV"] },
    { code: "SHJ", airlines: ["G9"] },
    { code: "MCT", airlines: ["WY"] },
  ];

  // Base one-way economy fare buckets in PKR (sample)
  const BASE_FARE = {
    DXB: 68000, SHJ: 62000, AUH: 70000, JED: 95000, RUH: 98000, DMM: 90000,
    DOH: 72000, MCT: 78000, BAH: 88000, KWI: 92000, IST: 135000, LHR: 195000,
    MAN: 198000, BHX: 205000, CDG: 185000, YYZ: 295000, JFK: 310000,
    KUL: 115000, BKK: 125000, SIN: 145000, PEK: 150000, CAN: 155000,
  };

  const AIRLINE_MULT = { PK: 1.0, PA: 0.97, PF: 0.95, ER: 0.96, EK: 1.28, QR: 1.24, TK: 1.18, SV: 1.05, FZ: 0.92, G9: 0.88, WY: 1.08 };
  const CABIN_MULT = { Economy: 1, Business: 2.6 };
  const FLIGHT_HOURS = {
    DXB: 3.0, SHJ: 3.0, AUH: 3.2, JED: 4.2, RUH: 3.8, DMM: 3.5, DOH: 3.1, MCT: 2.8,
    BAH: 3.4, KWI: 3.6, IST: 6.0, LHR: 8.5, MAN: 8.8, BHX: 9.0, CDG: 8.2,
    YYZ: 15.5, JFK: 16.5, KUL: 5.8, BKK: 5.5, SIN: 6.2, PEK: 6.8, CAN: 6.5,
  };
  const BAGGAGE = {
    PK: "30kg + 7kg cabin", PA: "30kg + 7kg cabin", PF: "25kg + 7kg cabin",
    ER: "25kg + 7kg cabin", EK: "30kg + 7kg cabin", QR: "30kg + 7kg cabin",
    TK: "30kg + 8kg cabin", SV: "30kg + 7kg cabin", FZ: "20kg + 7kg cabin",
    G9: "20kg + 7kg cabin", WY: "30kg + 7kg cabin",
  };

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(seed) {
    let a = seed;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function pad(n) { return String(n).padStart(2, "0"); }
  function fmtPKR(n) { return "PKR " + Math.round(n).toLocaleString("en-PK"); }
  function fmtDur(mins) {
    const h = Math.floor(mins / 60), m = Math.round(mins % 60);
    return h + "h " + pad(m) + "m";
  }
  function addMins(hhmm, mins) {
    const [h, m] = hhmm.split(":").map(Number);
    const t = (h * 60 + m + mins) % 1440;
    return pad(Math.floor(t / 60)) + ":" + pad(t % 60);
  }

  const FARE_TYPES = [
    { id: "saver", name: "Saver", changeFee: 15000, refund: "Non-refundable", note: "Date change allowed with fee + fare difference. No refund on cancellation." },
    { id: "flex", name: "Flex", changeFee: 7500, refund: "Refundable with fee", note: "Date change allowed with reduced fee. Refund allowed with airline cancellation fee." },
    { id: "plus", name: "Flex Plus", changeFee: 0, refund: "Fully refundable", note: "Free date changes and full refund before departure. Priority check-in where offered." },
  ];

  function genItineraries(from, to, dateISO, travelers, cabin) {
    const rng = mulberry32(hashStr(from + to + dateISO + cabin));
    const results = [];
    const base = BASE_FARE[to] || 120000;
    const hours = FLIGHT_HOURS[to] || 6;
    let idn = 1;

    // Nonstop options
    const nsAirlines = (NONSTOP[to] || ["PK"]).slice();
    const nNs = 1 + Math.floor(rng() * Math.min(3, nsAirlines.length));
    for (let i = 0; i < nNs; i++) {
      const al = nsAirlines.splice(Math.floor(rng() * nsAirlines.length), 1)[0];
      const depH = 1 + Math.floor(rng() * 22), depM = pick(rng, [0, 15, 25, 30, 40, 45, 55]);
      const dep = pad(depH) + ":" + pad(depM);
      const dur = Math.round(hours * 60 * (0.97 + rng() * 0.08));
      const price = base * AIRLINE_MULT[al] * CABIN_MULT[cabin] * (0.92 + rng() * 0.25);
      results.push({
        id: "IT" + (idn++), airline: al, stops: 0, segments: [{ from, to, dep, arr: addMins(dep, dur) }],
        durationMins: dur, baggage: BAGGAGE[al],
        price: Math.round(price / 500) * 500,
        fare: pick(rng, FARE_TYPES), aircraft: pick(rng, ["A320", "A321neo", "B737-800", "B777-200ER", "A330-200"]),
      });
    }

    // One-stop options via hubs
    const nCon = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < nCon; i++) {
      const hub = pick(rng, HUBS);
      if (hub.code === to) continue;
      const al = pick(rng, hub.airlines);
      const leg1 = Math.round(hours * 0.45 * 60), leg2 = Math.round(hours * 0.62 * 60);
      const layover = pick(rng, [75, 95, 120, 150, 180, 210, 260]);
      const depH = 1 + Math.floor(rng() * 22), depM = pick(rng, [5, 20, 35, 50]);
      const dep = pad(depH) + ":" + pad(depM);
      const arr1 = addMins(dep, leg1), dep2 = addMins(arr1, layover), arr2 = addMins(dep2, leg2);
      const dur = leg1 + layover + leg2;
      const price = base * AIRLINE_MULT[al] * CABIN_MULT[cabin] * (0.78 + rng() * 0.2);
      results.push({
        id: "IT" + (idn++), airline: al, stops: 1, via: hub.code,
        segments: [
          { from, to: hub.code, dep, arr: arr1 },
          { from: hub.code, to, dep: dep2, arr: arr2 },
        ],
        durationMins: dur, layoverMins: layover, baggage: BAGGAGE[al],
        price: Math.round(price / 500) * 500,
        fare: pick(rng, FARE_TYPES), aircraft: pick(rng, ["A320", "A321neo", "B737-800", "B777-300ER", "A350-900"]),
      });
    }

    results.sort((a, b) => a.price - b.price);
    return results.slice(0, 10);
  }

  function bookingRef(rngSeed) {
    const rng = mulberry32(hashStr(String(rngSeed) + Date.now()));
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(rng() * chars.length)];
    return "TP-" + s;
  }

  const POPULAR_ROUTES = [
    { from: "LHE", to: "DXB", label: "Lahore to Dubai", tag: "Shopping & business" },
    { from: "KHI", to: "JED", label: "Karachi to Jeddah", tag: "Umrah gateway" },
    { from: "ISB", to: "LHR", label: "Islamabad to London", tag: "UK bound" },
    { from: "LHE", to: "YYZ", label: "Lahore to Toronto", tag: "Visit family" },
    { from: "KHI", to: "DXB", label: "Karachi to Dubai", tag: "Weekend trips" },
    { from: "ISB", to: "IST", label: "Islamabad to Istanbul", tag: "History & food" },
  ];

  const GUIDES = [
    {
      id: "dubai", city: "Dubai", country: "UAE", code: "DXB",
      tagline: "Skyscrapers, souks and desert safaris, a 3-hour hop from Pakistan.",
      bestTime: "November to March", currency: "UAE Dirham (AED)", lang: "Arabic, English, Urdu widely spoken",
      visa: "UAE tourist visa, usually processed in 3 to 5 working days through airlines or travel agents.",
      highlights: ["Burj Khalifa and Dubai Mall", "Deira and Bur Dubai souks", "Desert safari with dinner", "JBR beach and Marina walk", "Day trip to Abu Dhabi and the Sheikh Zayed Mosque"],
      tips: ["Book flights 6 to 8 weeks ahead for the best fares from Lahore and Karachi.", "Carry AED or a multi-currency card; cards are accepted almost everywhere.", "Friday mornings are quiet; malls open after Jummah."],
    },
    {
      id: "london", city: "London", country: "United Kingdom", code: "LHR",
      tagline: "Museums, markets and the Thames, the classic Pakistan to UK route.",
      bestTime: "April to June, September to October", currency: "British Pound (GBP)", lang: "English",
      visa: "UK Standard Visitor visa. Apply online; biometrics at the visa centre in Pakistan. Decide early, processing takes around 3 weeks.",
      highlights: ["British Museum and Natural History Museum (free entry)", "Tower of London and Tower Bridge", "Southall and Whitechapel for desi food", "Hyde Park and Camden Market", "Day trip to Oxford or Windsor"],
      tips: ["PIA flies nonstop from Islamabad; one-stop options via the Gulf are often cheaper.", "Get an Oyster card or use contactless for the Tube.", "Book refundable fares if your visa decision is still pending."],
    },
    {
      id: "jeddah", city: "Jeddah", country: "Saudi Arabia", code: "JED",
      tagline: "Gateway to Makkah for Umrah and Hajj pilgrims.",
      bestTime: "Year-round; avoid midday heat in summer", currency: "Saudi Riyal (SAR)", lang: "Arabic; Urdu understood in pilgrim areas",
      visa: "Umrah visa through an authorised agent, or tourist e-visa for eligible travellers. Nusuk registration needed for Rawdah visits.",
      highlights: ["Makkah Haram (45 min by Haramain train)", "Madinah and Masjid Nabawi", "Jeddah Corniche and Al-Balad old town", "Taif mountain day trip"],
      tips: ["Umrah packages from Pakistan usually bundle flights, hotels and transfers.", "Carry Ihram in hand luggage; wear it before the meeqat.", "The Haramain high-speed train saves hours between Jeddah, Makkah and Madinah."],
    },
    {
      id: "istanbul", city: "Istanbul", country: "Turkiye", code: "IST",
      tagline: "Where Europe meets Asia, Blue Mosque to Grand Bazaar.",
      bestTime: "April to May, September to November", currency: "Turkish Lira (TRY)", lang: "Turkish; English in tourist areas",
      visa: "Turkish sticker visa via the embassy/consulate, or e-visa for eligible Pakistani travellers with valid US/UK/Schengen visas.",
      highlights: ["Blue Mosque and Hagia Sophia", "Grand Bazaar and Spice Bazaar", "Bosphorus sunset cruise", "Topkapi Palace", "Istiklal Street and Galata Tower"],
      tips: ["Turkish Airlines offers generous baggage on Pakistan routes.", "Get an Istanbulkart for trams, ferries and metro.", "Try testi kebab and baklava in Sultanahmet."],
    },
    {
      id: "toronto", city: "Toronto", country: "Canada", code: "YYZ",
      tagline: "CN Tower, Niagara Falls and a huge Pakistani community.",
      bestTime: "May to October", currency: "Canadian Dollar (CAD)", lang: "English",
      visa: "Canadian visitor visa (TRV). Apply online; biometrics in Pakistan. Processing can take several weeks, apply early.",
      highlights: ["CN Tower and Harbourfront", "Niagara Falls day trip", "Little Pakistan on Danforth Avenue", "Royal Ontario Museum", "Toronto Islands ferry"],
      tips: ["One-stop routings via the Gulf or Istanbul are usually cheapest from Lahore.", "Winter fares drop but pack for minus 15C.", "Carry CAD; most places accept cards."],
    },
    {
      id: "kualalumpur", city: "Kuala Lumpur", country: "Malaysia", code: "KUL",
      tagline: "Petronas Towers, street food and easy e-visa travel.",
      bestTime: "December to February", currency: "Malaysian Ringgit (MYR)", lang: "Malay, English widely spoken",
      visa: "Malaysia eVISA available online for Pakistani passport holders, usually approved within days.",
      highlights: ["Petronas Twin Towers", "Batu Caves", "Jalan Alor food street", "KL Bird Park", "Day trip to Genting Highlands"],
      tips: ["Among the cheapest international fares from Pakistan.", "Grab app works like Uber across the city.", "Halal food is everywhere; no worries on that front."],
    },
  ];

  const UMRAH = {
    title: "Umrah and Hajj Planning",
    intro: "Travel.pk helps pilgrims from Pakistan plan every step of the journey, from visa and flights to hotels near the Haram and ground transfers.",
    steps: [
      { t: "Choose your month", d: "Ramadan and December are peak season with higher prices. Rabi-ul-Awwal and Shawwal are calmer and cheaper." },
      { t: "Umrah visa and documents", d: "Valid passport (8+ months), CNIC copy, photographs, and vaccination proof. Your agent submits these for the Umrah visa." },
      { t: "Flights", d: "Fly into Jeddah (closest to Makkah) or Madinah. Group departures from Karachi, Lahore and Islamabad run weekly in season." },
      { t: "Hotels", d: "Makkah hotels near the Haram fill fast. Decide your walking-distance vs shuttle-service tradeoff before booking." },
      { t: "Transfers", d: "Private or shared transfers between Jeddah, Makkah and Madinah. The Haramain train is the fastest option." },
      { t: "Ziyarat plan", d: "Makkah: Mina, Arafat, Muzdalifah. Madinah: Masjid Nabawi, Quba, Uhud. Book Rawdah slots on Nusuk early." },
    ],
    docs: ["Passport valid 8+ months", "CNIC copy", "4 passport-size photos (blue background)", "Vaccination certificate", "Marriage certificate (for couples, if required)", "Nusuk app installed for Rawdah permits"],
  };

  const VISA_CHECKLIST = [
    { t: "Passport validity", d: "Most countries need 6 months validity beyond your return date. Renew early; NADRA offices get busy." },
    { t: "Bank statement", d: "Last 6 months, showing steady income and enough balance for the trip. Sudden large deposits raise questions." },
    { t: "Employment proof", d: "Salary slips, employment letter or business registration. Students: bonafide letter from the university." },
    { t: "Travel plan", d: "Flight reservation, hotel bookings and a day-wise itinerary. Refundable bookings are safer before visa approval." },
    { t: "Biometrics appointment", d: "UK, Schengen and Canada need biometrics at visa centres in Karachi, Lahore or Islamabad. Slots fill fast in summer." },
    { t: "Travel insurance", d: "Mandatory for Schengen; recommended everywhere. Covers medical emergencies and trip cancellation." },
  ];

  const FAQS = [
    { q: "How do I book a flight on Travel.pk?", a: "Search your route and date, compare the fares across 300+ airlines, pick an itinerary, enter passenger details, and choose a payment method. You get a booking reference instantly and your e-ticket by email and WhatsApp." },
    { q: "Which payment methods are accepted?", a: "Debit and credit cards, direct bank transfer, and in-person payment at the Travel.pk office in DHA Lahore. For assistance with payments, call +92-42-35692952 (Mon to Fri, 10am to 7pm PKT) or message on WhatsApp." },
    { q: "Can I cancel or change my booking?", a: "Yes, subject to your fare's rules. Saver fares usually allow date changes for a fee but no refund; Flex fares allow changes at lower fees and refunds with an airline cancellation charge. Share your booking reference with support and they will process the request." },
    { q: "Are there any service fees?", a: "Fares shown include airline taxes. A small service fee may apply per ticket for assisted bookings; it is always shown before you pay, never added afterwards." },
    { q: "How long does booking processing take?", a: "Online bookings are confirmed instantly with a booking reference. Assisted bookings over phone or WhatsApp are usually ticketed within 2 working hours during office hours (Mon to Fri, 10am to 7pm PKT)." },
    { q: "How will I receive my e-ticket?", a: "Your e-ticket and booking confirmation are emailed to you and can also be sent on WhatsApp. Carry a printed or phone copy with your passport; most airlines accept the mobile e-ticket." },
  ];

  const CONTACT = {
    phone: "+92-42-35692952",
    phoneHref: "tel:+924235692952",
    whatsapp: "https://wa.me/924235692952?text=Assalam-o-Alaikum%2C%20I%20need%20help%20with%20a%20Travel.pk%20booking.",
    email: "info@travel.pk",
    hours: "Mon to Fri, 10am to 7pm PKT",
    address: "231-B Main Boulevard, Commercial Broadway, Sector B, Phase 8, DHA Lahore",
  };

  return {
    AIRPORTS, PAK, AIRLINES, POPULAR_ROUTES, GUIDES, UMRAH, VISA_CHECKLIST, FAQS, CONTACT,
    FARE_TYPES, genItineraries, bookingRef, fmtPKR, fmtDur, hashStr,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = TravelData;
