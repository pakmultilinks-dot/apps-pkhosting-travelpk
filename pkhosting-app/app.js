/* PKHosting App - logic (no backend; cart, tickets and profile stored locally) */
(function(){
"use strict";

/* ---------------- Data ---------------- */
var PLANS = [
  {id:"personal", name:"Personal", monthly:699,
   features:["1 website","5 GB SSD storage","5 email accounts","Free SSL certificate","1-click WordPress install","Daily backups"]},
  {id:"business", name:"Business", monthly:1999, popular:true,
   features:["5 websites","25 GB SSD storage","25 email accounts","Free SSL certificate","1-click WordPress install","Daily backups","Free website migration","Priority support"]},
  {id:"professional", name:"Professional", monthly:3999,
   features:["10 websites","50 GB SSD storage","50 email accounts","Free SSL certificate","1-click WordPress install","Daily backups","Free website migration","Priority support"]}
];
var TLDS = [
  {tld:".com",    price:3999, per:"/yr"},
  {tld:".pk",     price:4699, per:"/2 yrs"},
  {tld:".com.pk", price:4699, per:"/2 yrs"},
  {tld:".org.pk", price:4699, per:"/2 yrs"},
  {tld:".net.pk", price:4699, per:"/2 yrs"},
  {tld:".net",    price:4499, per:"/yr"},
  {tld:".org",    price:3499, per:"/yr"}
];
var VPS = [
  {id:"vps1", name:"VPS Starter", monthly:4999, specs:["2 vCPU cores","4 GB RAM","80 GB NVMe storage","2 TB bandwidth","Full root access"]},
  {id:"vps2", name:"VPS Business", monthly:9999, specs:["4 vCPU cores","8 GB RAM","160 GB NVMe storage","4 TB bandwidth","Full root access"]},
  {id:"vps3", name:"VPS Pro", monthly:19999, specs:["8 vCPU cores","16 GB RAM","320 GB NVMe storage","8 TB bandwidth","Full root access"]}
];
var DEDICATED = [
  {id:"ds1", name:"DS Entry", monthly:34999, specs:["Xeon E-2236, 6 cores","32 GB DDR4 RAM","2 x 480 GB SSD","10 TB bandwidth","IPMI / KVM access"]},
  {id:"ds2", name:"DS Power", monthly:64999, specs:["2 x Xeon Silver 4210","64 GB DDR4 RAM","2 x 960 GB NVMe","20 TB bandwidth","IPMI / KVM access"]}
];
var FAQS = [
  {q:"How do I point my domain to PKHosting?",
   a:"Point your domain to our nameservers: ns1.pkhosting.com and ns2.pkhosting.com. You can change this at your domain registrar (or PKNIC for .pk domains). Changes usually take effect within a few hours, and up to 24-48 hours worldwide."},
  {q:"Do you offer free website migration?",
   a:"Yes. Our engineers will migrate your website, databases and email accounts from your old host completely free. Most migrations are finished within 24 hours. Just order a plan and open a ticket under Migration Help."},
  {q:"What payment methods do you accept?",
   a:"We accept bank transfer, JazzCash, Easypaisa and debit/credit cards. Invoices can be paid from the Client Area, and our billing team confirms manual payments within a few working hours."},
  {q:"Do you provide SSL certificates?",
   a:"Yes, a free SSL certificate is included with every hosting plan and is installed automatically, so your site loads over HTTPS. Paid premium SSL options are available from support if you need warranty or EV validation."},
  {q:"How often are backups taken?",
   a:"Backups run automatically every day on all shared hosting plans and the last 7 daily copies are kept. File or full-account restores are free: just open a support ticket and we will restore it for you."},
  {q:"Can I upgrade my plan later?",
   a:"Yes, you can upgrade at any time from the Client Area. You only pay the price difference for the remaining billing period, and the upgrade is applied without downtime."}
];
var DEMO_SERVICES = [
  {name:"Business Hosting", detail:"example.pk", status:"Active", renews:"Renews 12 Nov 2026"},
  {name:"VPS Starter", detail:"vps-1042.pkhosting.cloud", status:"Active", renews:"Renews 03 Dec 2026"},
  {name:"Domain: myshop.pk", detail:"Registered via PKNIC", status:"Active", renews:"Expires 21 Jan 2028"}
];
var DEMO_INVOICES = [
  {no:"#INV-2041", desc:"Business Hosting - Annual", amount:"Rs 19,990", status:"Paid"},
  {no:"#INV-2044", desc:"myshop.pk renewal (2 yrs)", amount:"Rs 4,699", status:"Due"}
];
var DEMO_TICKETS = [
  {id:"#T-1021", subject:"SSL not renewing on example.pk", status:"Open", date:"10 Oct 2026"}
];

/* ---------------- Helpers ---------------- */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function money(n){ return "Rs " + n.toLocaleString("en-PK"); }
function toast(msg){
  var t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(function(){ t.classList.remove("show"); }, 2200);
}
function load(k, fb){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }catch(e){ return fb; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

/* ---------------- State ---------------- */
var cart = load("pkh_cart", []);
var tickets = load("pkh_tickets", []);
var profile = load("pkh_profile", {name:"Demo User", email:"demo@example.pk", phone:""});
var billing = "monthly";
var checkoutStep = 1;
var checkoutData = {};
var lastOrder = null;

/* ---------------- Navigation ---------------- */
function go(view){
  document.querySelectorAll(".view").forEach(function(v){
    v.classList.toggle("active", v.getAttribute("data-view") === view);
  });
  document.querySelectorAll(".tab").forEach(function(t){
    t.classList.toggle("on", t.getAttribute("data-go") === view);
  });
  window.scrollTo(0,0);
  if(view === "cart") renderCart();
  if(view === "checkout") renderCheckout();
  if(view === "client") renderClient();
  if(view === "hosting") renderPlans();
  if(view === "servers") renderServers();
}
document.addEventListener("click", function(e){
  var el = e.target.closest("[data-go]");
  if(el){ go(el.getAttribute("data-go")); }
});
$("brandHome").addEventListener("click", function(){ go("home"); });
$("cartBtn").addEventListener("click", function(){ go("cart"); });

/* ---------------- Cart ---------------- */
function cartCount(){ return cart.reduce(function(n,i){ return n + (i.qty||1); }, 0); }
function updateBadge(){
  var b = $("cartBadge"), n = cartCount();
  b.style.display = n ? "flex" : "none"; b.textContent = n;
}
function addToCart(item){
  var found = cart.find(function(i){ return i.key === item.key; });
  if(found){ found.qty = (found.qty||1) + 1; }
  else { item.qty = 1; cart.push(item); }
  save("pkh_cart", cart); updateBadge();
  toast(item.name + " added to cart");
}
function cartTotal(){ return cart.reduce(function(s,i){ return s + i.price*(i.qty||1); }, 0); }

/* ---------------- Hosting plans ---------------- */
function renderPlans(){
  var html = "";
  PLANS.forEach(function(p){
    var price = billing === "monthly" ? p.monthly : p.monthly*10;
    var per = billing === "monthly" ? "/mo" : "/yr";
    var feats = p.features.map(function(f){ return "<li>"+esc(f)+"</li>"; }).join("");
    html += '<div class="card plan'+(p.popular?' popular':'')+'">'
      + (p.popular?'<span class="pop">MOST POPULAR</span>':'')
      + "<h3>"+esc(p.name)+"</h3>"
      + '<div class="price">'+money(price)+"<small>"+per+"</small></div>"
      + "<ul>"+feats+"</ul>"
      + '<button class="btn btn-primary btn-block" data-order-plan="'+p.id+'">Order '+esc(p.name)+"</button>"
      + "</div>";
  });
  $("planList").innerHTML = html;
}
$("billMonthly").addEventListener("click", function(){ billing="monthly"; $("billMonthly").classList.add("on"); $("billAnnual").classList.remove("on"); renderPlans(); });
$("billAnnual").addEventListener("click", function(){ billing="annual"; $("billAnnual").classList.add("on"); $("billMonthly").classList.remove("on"); renderPlans(); });
document.addEventListener("click", function(e){
  var b = e.target.closest("[data-order-plan]");
  if(b){
    var p = PLANS.find(function(x){ return x.id === b.getAttribute("data-order-plan"); });
    var price = billing === "monthly" ? p.monthly : p.monthly*10;
    addToCart({key:"host-"+p.id+"-"+billing, type:"hosting", name:p.name+" Hosting",
      detail: billing==="monthly" ? "Billed monthly" : "Billed annually (2 months free)", price:price});
  }
  var v = e.target.closest("[data-order-vps]");
  if(v){
    var all = VPS.concat(DEDICATED);
    var s = all.find(function(x){ return x.id === v.getAttribute("data-order-vps"); });
    addToCart({key:"srv-"+s.id, type:"server", name:s.name, detail:"Billed monthly", price:s.monthly});
  }
  var d = e.target.closest("[data-order-domain]");
  if(d){
    var tld = TLDS.find(function(x){ return x.tld === d.getAttribute("data-order-domain"); });
    var name = d.getAttribute("data-domain-name");
    addToCart({key:"dom-"+name+tld.tld, type:"domain", name:name+tld.tld, detail:"Domain registration "+tld.per, price:tld.price});
  }
});

/* ---------------- Domains ---------------- */
function renderTlds(){
  $("tldList").innerHTML = TLDS.map(function(t){
    return '<div class="tldrow"><span class="t">'+esc(t.tld)+'</span><span class="p">'+money(t.price)+" "+esc(t.per)+"</span></div>";
  }).join("");
}
function hashStr(s){ var h=0; for(var i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))>>>0; } return h; }
function checkDomain(name){
  name = name.trim().toLowerCase().replace(/\s+/g,"").replace(/\.(com|pk|net|org).*$/,"");
  if(!/^[a-z0-9-]{2,63}$/.test(name)) return null;
  return TLDS.slice(0,5).map(function(t){
    var taken = (hashStr(name+t.tld) % 10) < 4; /* deterministic demo result */
    return {name:name, tld:t.tld, price:t.price, per:t.per, available:!taken};
  });
}
function runDomainSearch(inputId){
  var raw = $(inputId).value;
  var res = checkDomain(raw);
  if(!res){ toast("Enter a valid name (letters, numbers, hyphens)"); return; }
  var clean = res[0].name;
  var html = res.map(function(r){
    return '<div class="dom-result"><div><div class="dom-name">'+esc(r.name+r.tld)+'</div>'
      + '<div class="dom-price">'+money(r.price)+" "+esc(r.per)+"</div></div>"
      + (r.available
          ? '<div style="text-align:right"><span class="pill ok">Available</span><br><button class="btn btn-primary btn-sm" style="margin-top:6px" data-order-domain="'+esc(r.tld)+'" data-domain-name="'+esc(r.name)+'">Register</button></div>'
          : '<span class="pill no">Taken</span>');
  }).join("");
  if(inputId === "domainInput"){
    $("domainResultList").innerHTML = html;
    $("domainResults").style.display = "block";
  } else {
    go("domains");
    $("domainInput").value = clean;
    $("domainResultList").innerHTML = html;
    $("domainResults").style.display = "block";
  }
}
$("domainBtn").addEventListener("click", function(){ runDomainSearch("domainInput"); });
$("domainInput").addEventListener("keydown", function(e){ if(e.key==="Enter") runDomainSearch("domainInput"); });
$("homeDomainBtn").addEventListener("click", function(){ runDomainSearch("homeDomainInput"); });
$("homeDomainInput").addEventListener("keydown", function(e){ if(e.key==="Enter") runDomainSearch("homeDomainInput"); });

/* ---------------- Servers ---------------- */
function serverCard(s){
  var specs = s.specs.map(function(x){ return "<span>"+esc(x)+"</span>"; }).join("");
  return '<div class="card"><h3 class="stitle" style="margin-top:0">'+esc(s.name)+'</h3>'
    + '<div class="price" style="font-size:24px;font-weight:800;color:var(--navy)">'+money(s.monthly)+'<small style="font-size:13px;color:var(--muted)">/mo</small></div>'
    + '<div class="spec">'+specs+'</div>'
    + '<button class="btn btn-navy btn-block" data-order-vps="'+s.id+'">Order '+esc(s.name)+"</button></div>";
}
function renderServers(){
  $("vpsList").innerHTML = VPS.map(serverCard).join("");
  $("dedList").innerHTML = DEDICATED.map(serverCard).join("");
}

/* ---------------- Cart view ---------------- */
function renderCart(){
  var body = $("cartBody");
  if(!cart.length){
    body.innerHTML = '<div class="card"><div class="empty"><div class="ic">🛒</div><p>Your cart is empty.<br>Browse hosting plans, servers or domains to get started.</p><button class="btn btn-primary" data-go="hosting">View Hosting Plans</button></div></div>';
    return;
  }
  var items = cart.map(function(i,idx){
    return '<div class="cart-item"><div><div class="n">'+esc(i.name)+'</div><div class="d">'+esc(i.detail)
      + (i.qty>1 ? " × "+i.qty : "") +'</div><button class="rm" data-rm="'+idx+'">Remove</button></div>'
      + '<div class="p">'+money(i.price*(i.qty||1))+"</div></div>";
  }).join("");
  body.innerHTML = '<div class="card">'+items
    + '<div class="kv" style="margin-top:8px"><span class="k"><strong>Total</strong></span><span class="v" style="font-size:18px">'+money(cartTotal())+"</span></div></div>"
    + '<button class="btn btn-primary btn-block" id="toCheckout">Proceed to Checkout</button>'
    + '<button class="btn btn-outline btn-block" id="clearCart" style="margin-top:8px">Clear Cart</button>';
  $("toCheckout").addEventListener("click", function(){ checkoutStep = 1; checkoutData = {}; go("checkout"); });
  $("clearCart").addEventListener("click", function(){ cart = []; save("pkh_cart",cart); updateBadge(); renderCart(); });
}
document.addEventListener("click", function(e){
  var r = e.target.closest("[data-rm]");
  if(r){ cart.splice(parseInt(r.getAttribute("data-rm"),10),1); save("pkh_cart",cart); updateBadge(); renderCart(); }
});

/* ---------------- Checkout ---------------- */
function paintSteps(){
  document.querySelectorAll("#stepsBar .step").forEach(function(s){
    var n = parseInt(s.getAttribute("data-s"),10);
    s.classList.toggle("now", n === checkoutStep);
    s.classList.toggle("done", n < checkoutStep);
  });
}
function validEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function renderCheckout(){
  paintSteps();
  var body = $("checkoutBody");
  if(!cart.length && checkoutStep < 4){
    body.innerHTML = '<div class="card"><div class="empty"><div class="ic">🛒</div><p>Your cart is empty. Add something before checking out.</p><button class="btn btn-primary" data-go="hosting">View Hosting Plans</button></div></div>';
    return;
  }
  if(checkoutStep === 1){
    var items = cart.map(function(i){
      return '<div class="kv"><span class="k">'+esc(i.name)+(i.qty>1?" × "+i.qty:"")+'<br><small>'+esc(i.detail)+"</small></span>"
        + '<span class="v">'+money(i.price*(i.qty||1))+"</span></div>";
    }).join("");
    body.innerHTML = '<div class="card">'+items
      + '<div class="kv"><span class="k"><strong>Total due today</strong></span><span class="v" style="font-size:18px">'+money(cartTotal())+"</span></div></div>"
      + '<button class="btn btn-primary btn-block" id="coNext1">Continue</button>';
    $("coNext1").addEventListener("click", function(){ checkoutStep = 2; renderCheckout(); });
  }
  if(checkoutStep === 2){
    var d = checkoutData;
    body.innerHTML = '<div class="card">'
      + fld("coName","Full name", d.name||"", "text", "e.g. Ali Raza")
      + fld("coEmail","Email", d.email||"", "email", "you@example.com")
      + fld("coPhone","Phone / WhatsApp", d.phone||"", "tel", "03xx xxxxxxx")
      + fld("coCity","City", d.city||"", "text", "e.g. Lahore")
      + '</div><button class="btn btn-primary btn-block" id="coNext2">Continue to Payment</button>';
    $("coNext2").addEventListener("click", function(){
      var ok = true;
      ok = need("coName", function(v){return v.trim().length>=3;}, "Enter your full name.") && ok;
      ok = need("coEmail", validEmail, "Enter a valid email address.") && ok;
      ok = need("coPhone", function(v){return v.replace(/\D/g,"").length>=10;}, "Enter a valid phone number.") && ok;
      ok = need("coCity", function(v){return v.trim().length>=2;}, "Enter your city.") && ok;
      if(!ok) return;
      checkoutData = {name:$("coName").value.trim(), email:$("coEmail").value.trim(),
                      phone:$("coPhone").value.trim(), city:$("coCity").value.trim()};
      checkoutStep = 3; renderCheckout();
    });
  }
  if(checkoutStep === 3){
    var methods = [
      {id:"card", t:"Debit / Credit Card", s:"Visa, Mastercard - processed securely"},
      {id:"bank", t:"Bank Transfer", s:"You will receive our bank details after ordering"},
      {id:"jazzcash", t:"JazzCash", s:"Pay from your JazzCash account"},
      {id:"easypaisa", t:"Easypaisa", s:"Pay from your Easypaisa account"}
    ];
    body.innerHTML = '<div class="card"><h3 class="stitle" style="margin-top:0">Total due: '+money(cartTotal())+'</h3>'
      + methods.map(function(m,i){
          return '<div class="payopt'+(i===0?' sel':'')+'" data-pay="'+m.id+'"><div class="radio"></div><div><div class="t">'+m.t+'</div><div class="s">'+m.s+"</div></div></div>";
        }).join("")
      + '<p class="hint">Demo checkout: no real payment is processed.</p></div>'
      + '<button class="btn btn-primary btn-block" id="coPlace">Place Order</button>';
    var sel = "card";
    body.querySelectorAll(".payopt").forEach(function(p){
      p.addEventListener("click", function(){
        body.querySelectorAll(".payopt").forEach(function(x){x.classList.remove("sel");});
        p.classList.add("sel"); sel = p.getAttribute("data-pay");
      });
    });
    $("coPlace").addEventListener("click", function(){
      var ref = "PKH-2026-" + Math.floor(1000 + Math.random()*9000);
      lastOrder = {ref:ref, total:cartTotal(), items:cart.slice(), name:checkoutData.name,
                   email:checkoutData.email, method:sel, date:new Date().toLocaleDateString("en-PK")};
      cart = []; save("pkh_cart", cart); updateBadge();
      checkoutStep = 4; renderCheckout();
    });
  }
  if(checkoutStep === 4){
    var o = lastOrder;
    var items = o.items.map(function(i){
      return '<div class="kv"><span class="k">'+esc(i.name)+'</span><span class="v">'+money(i.price*(i.qty||1))+"</span></div>";
    }).join("");
    body.innerHTML = '<div class="card"><div class="confirm"><div class="big">✅</div>'
      + "<h2>Order placed!</h2><p>Thank you, "+esc(o.name)+". Your order is confirmed.</p>"
      + '<div class="orderref">'+esc(o.ref)+"</div>"
      + '<div style="text-align:left;margin-top:8px">'+items
      + '<div class="kv"><span class="k"><strong>Total</strong></span><span class="v">'+money(o.total)+"</span></div>"
      + '<div class="kv"><span class="k">Payment method</span><span class="v">'+esc(payName(o.method))+"</span></div>"
      + '<div class="kv"><span class="k">Confirmation sent to</span><span class="v">'+esc(o.email)+"</span></div></div>"
      + '<div class="demo-note"><strong>Demo note:</strong> this order was created locally on your device. No real payment was taken and no account was created. To place a real order, visit pkhosting.com or call (042) 35692952.</div>'
      + '</div></div>'
      + '<button class="btn btn-primary btn-block" data-go="home">Back to Home</button>';
  }
}
function payName(id){
  return {card:"Debit / Credit Card", bank:"Bank Transfer", jazzcash:"JazzCash", easypaisa:"Easypaisa"}[id] || id;
}
function fld(id, label, val, type, ph){
  return '<div class="field" id="f_'+id+'"><label for="'+id+'">'+label+'</label>'
    + '<input id="'+id+'" type="'+type+'" value="'+esc(val)+'" placeholder="'+esc(ph||"")+'">'
    + '<div class="err"></div></div>';
}
function need(id, test, msg){
  var wrap = $("f_"+id), input = $(id), errEl = wrap.querySelector(".err");
  var ok = test(input.value);
  wrap.classList.toggle("invalid", !ok);
  errEl.textContent = ok ? "" : msg;
  return ok;
}
$("checkoutBack").addEventListener("click", function(){
  if(checkoutStep > 1 && checkoutStep < 4){ checkoutStep--; renderCheckout(); }
  else { go("cart"); }
});

/* ---------------- Client area ---------------- */
function renderClient(){
  $("svcList").innerHTML = DEMO_SERVICES.map(function(s){
    return '<div class="svc"><div class="top"><div class="nm">'+esc(s.name)+'</div><span class="st st-active">'+s.status+'</span></div>'
      + '<div class="meta">'+esc(s.detail)+" · "+esc(s.renews)+"</div></div>";
  }).join("");
  $("invList").innerHTML = DEMO_INVOICES.map(function(i){
    var cls = i.status === "Paid" ? "st-paid" : "st-due";
    return '<div class="svc"><div class="top"><div class="nm">'+esc(i.no)+'</div><span class="st '+cls+'">'+i.status+'</span></div>'
      + '<div class="meta">'+esc(i.desc)+" · <strong>"+esc(i.amount)+"</strong></div></div>";
  }).join("");
  renderTickets();
  $("pfName").value = profile.name || "";
  $("pfEmail").value = profile.email || "";
  $("pfPhone").value = profile.phone || "";
}
function renderTickets(){
  var all = DEMO_TICKETS.concat(tickets);
  $("ticketList").innerHTML = all.map(function(t){
    var cls = /open/i.test(t.status) ? "st-open" : "st-closed";
    return '<div class="svc"><div class="top"><div class="nm">'+esc(t.id)+" · "+esc(t.subject)+'</div><span class="st '+cls+'">'+esc(t.status)+'</span></div>'
      + '<div class="meta">'+esc(t.date)+"</div></div>";
  }).join("");
}
$("tkSubmit").addEventListener("click", function(){
  var s = $("tkSubject"), m = $("tkMsg");
  var sw = s.closest(".field");
  var mw = document.getElementById("tkMsg").closest(".field");
  var sok = s.value.trim().length >= 4, mok = m.value.trim().length >= 10;
  sw.classList.toggle("invalid", !sok); sw.querySelector(".err").textContent = sok?"":"Please enter a subject.";
  mw.classList.toggle("invalid", !mok); mw.querySelector(".err").textContent = mok?"":"Please describe your issue (min 10 characters).";
  if(!sok || !mok) return;
  var t = {id:"#T-"+(1022+tickets.length), subject:s.value.trim(), status:"Open",
           date:new Date().toLocaleDateString("en-PK"), dept:$("tkDept").value};
  tickets.unshift(t); save("pkh_tickets", tickets);
  s.value = ""; m.value = "";
  renderTickets(); toast("Ticket "+t.id+" submitted");
});
$("pfSave").addEventListener("click", function(){
  profile = {name:$("pfName").value.trim(), email:$("pfEmail").value.trim(), phone:$("pfPhone").value.trim()};
  save("pkh_profile", profile); toast("Profile saved");
});

/* ---------------- FAQ ---------------- */
function renderFaqs(){
  $("faqList").innerHTML = FAQS.map(function(f,i){
    return '<div class="faq" data-faq="'+i+'"><div class="q">'+esc(f.q)+'<span class="arw">▾</span></div>'
      + '<div class="a">'+esc(f.a)+"</div></div>";
  }).join("");
}
document.addEventListener("click", function(e){
  var f = e.target.closest("[data-faq]");
  if(f){ f.classList.toggle("open"); }
});

/* ---------------- Init ---------------- */
renderTlds();
renderFaqs();
updateBadge();
go("home");
if("serviceWorker" in navigator){
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("sw.js").catch(function(){});
  });
}
})();
