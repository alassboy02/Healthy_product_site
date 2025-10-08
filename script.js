/* Rar.js - pro version (updated)
   - chemins d'images relatifs (images/...)
   - filtres + recherche
   - fallback image
   - effet "chargement" au clic commander
   - accessible lightbox
*/

/* Config */
const WA_NUMBER = "22793980078";
const PROVENANCE = "Site RAR Healthy Product";
const PLACEHOLDER_IMG = "images/placeholder.jpg"; // add a small placeholder image or leave to show broken image handling

/* Products array (modifiable) - note category field */
const products = [
  { id:"p1", name:"Pâte de sésame enrichie", price:"250 FCFA", desc:"Aliment énergétique, enrichi au lait.", img:"Sésame.jpg", category:"aliment" },
  { id:"p2", name:"Extrait de concombre", price:"300 FCFA", desc:"Hydratation et cosmétique naturelle.", img:"Jus-Concombre.jpg", category:"cosmetique" },
  { id:"p3", name:"Extrait de carottes", price:"300 FCFA", desc:"Antioxydant, bon pour la peau et la vue.", img:"Jus-Carotte.jpg", category:"boisson" },
  { id:"p4", name:"Corète potagère", price:"3000 FCFA", desc:"Riche en fibres, utilisée en cuisine.", img:"Fokou.jpg", category:"aliment" },
  { id:"p5", name:"Extrait de cola", price:"300 FCFA", desc:"Stimulant naturel.", img:"Jus-Cola.jpg", category:"boisson" },
  { id:"p6", name:"Thé glacé au Kinkeliba", price:"300 FCFA", desc:"Détox et digestion.", img:"Jus-Kenkeliba.jpg", category:"boisson" },
  { id:"p7", name:"Artemisia annua", price:"2000 FCFA", desc:"Feuilles et tisanes pour prévention du paludisme.", img:"Tézaraga.jpg", category:"plante" }
];

/* Utilities */
function $(sel){ return document.querySelector(sel) }
function $all(sel){ return Array.from(document.querySelectorAll(sel)) }

/* Build products into the grid (with filtering params) */
function buildProducts({ search = "", category = "all" } = {}){
  const grid = $("#produits-grid");
  grid.innerHTML = "";

  const q = search.trim().toLowerCase();

  const filtered = products.filter(p => {
    if(category !== "all" && p.category !== category) return false;
    if(!q) return true;
    return (p.name + " " + p.desc + " " + (p.category || "")).toLowerCase().includes(q);
  });

  if(filtered.length === 0){
    const empty = document.createElement("div");
    empty.className = "empty-msg";
    empty.textContent = "Aucun produit trouvé.";
    grid.appendChild(empty);
    return;
  }

  filtered.forEach(p=>{
    const card = document.createElement("article");
    card.className = "produit";
    card.dataset.id = p.id;
    card.dataset.name = p.name;
    card.dataset.price = p.price;
    card.dataset.img = p.img;
    card.dataset.category = p.category || "";
    card.innerHTML = `
      <img class="zoomable" src="${p.img}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'">
      <h3>${escapeHtml(p.name)}</h3>
      <p class="desc">${escapeHtml(p.desc)}</p>
      <div class="prix">${escapeHtml(p.price)}</div>
      <div class="actions">
        <button class="btn btn-primary order-btn">Commander</button>
        <button class="btn btn-outline view-btn">Voir</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // init interactions for newly created elements
  initOrderButtons(); // idempotent due to delegation implementation
}

/* Escape helper for safety */
function escapeHtml(str){
  if(!str) return "";
  return String(str).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* IntersectionObserver for simple appear animations */
const animObserver = new IntersectionObserver(entries=>{
  entries.forEach(ent=>{
    if(ent.isIntersecting) ent.target.classList.add("appear");
  });
},{ threshold:0.12 });

function initAnimations(){
  $all(".produit, .title, .hero-title, .apropos-card, .portfolio-card").forEach(el=>{
    animObserver.observe(el);
  });
}

/* Lightbox (modal) */
function initModal(){
  const modal = $("#myModal");
  const modalImg = $("#img01");
  const closeBtn = modal.querySelector(".close");

  document.addEventListener("click", e=>{
    // click on image or "Voir" button
    if(e.target.classList.contains("zoomable") || e.target.classList.contains("view-btn")){
      const card = e.target.closest(".produit");
      const imgEl = card ? card.querySelector(".zoomable") : (e.target.classList.contains("zoomable") ? e.target : null);
      if(imgEl){
        modal.style.display = "flex";
        modalImg.src = imgEl.src;
        modal.setAttribute("aria-hidden","false");
        // focus close for accessibility
        closeBtn.focus();
      }
    }
  });

  function closeModal(){
    modal.style.display = "none";
    modal.setAttribute("aria-hidden","true");
    $("#whatsapp-fab").focus();
  }

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (ev)=> {
    if(ev.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && modal.style.display === "flex"){
      closeModal();
    }
  });
}

/* WhatsApp floating behavior */
(function initWhatsAppFab(){
  const fab = $("#whatsapp-fab");
  if(fab){
    fab.addEventListener("click", (e)=>{
      // default generic message
      // use a short text
      e.preventDefault();
      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Bonjour, je souhaite passer une commande.")}`;
      window.open(url, "_blank", "noopener");
    });
  }
})();

/* Order buttons: use event delegation to be safe for dynamic content.
   Show a quick "loading" state then open WhatsApp.
*/
function initOrderButtons(){
  const grid = $("#produits-grid");
  if(!grid) return;

  // Remove existing handler to avoid duplicates (simple guard)
  grid.removeEventListener("__orderDelegation__", orderDelegationHandler);
  grid.addEventListener("click", orderDelegationHandler);
}

function orderDelegationHandler(e){
  if(e.target.classList.contains("order-btn")){
    const btn = e.target;
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = "Préparation...";
    const prodCard = btn.closest(".produit");
    const name = prodCard?.dataset.name || prodCard?.querySelector("h3")?.innerText || "Produit";
    const price = prodCard?.dataset.price || prodCard?.querySelector(".prix")?.innerText || "";
    const id = prodCard?.dataset.id || "";
    const img = prodCard?.dataset.img || prodCard?.querySelector("img")?.src || "";
    const now = new Date();
    const timestamp = now.toLocaleString();
    // small delay to show the animation effect, then open wa
    setTimeout(()=>{
      let msg = `Bonjour, je souhaite commander : ${name} (${price})%0AID: ${id}%0AProvenance: ${PROVENANCE}%0ADate: ${encodeURIComponent(timestamp)}`;
      if(img) msg += `%0AImage: ${encodeURIComponent(img)}`;
      const url = `https://wa.me/${WA_NUMBER}?text=${msg}`;
      window.open(url, "_blank", "noopener");
      // restore button (in case user returns)
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 750);
  }
}

/* Smooth scroll for nav links */
function initNavScroll(){
  $all(".nav-link").forEach(a=>{
    a.addEventListener("click", (e)=>{
      e.preventDefault();
      const target = document.querySelector(a.getAttribute("href"));
      if(target){
        target.scrollIntoView({behavior:"smooth", block:"start"});
      }
    });
  });
}

/* Keyboard accessibility: focus outline for tab users */
document.addEventListener("keydown", e=>{
  if(e.key === "Tab") document.body.classList.add("user-is-tabbing");
});

/* Search + Category filter */
function initFilters(){
  const searchInput = $("#search-input");
  const categorySelect = $("#category-filter");

  function applyFilters(){
    buildProducts({ search: searchInput.value, category: categorySelect.value });
    initAnimations();
  }

  let debounceTimer = null;
  searchInput.addEventListener("input", ()=>{
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 180);
  });

  categorySelect.addEventListener("change", applyFilters);
}

/* Initialize everything */
document.addEventListener("DOMContentLoaded", ()=>{
  // Build initial product list
  buildProducts();
  initAnimations();
  initModal();
  initNavScroll();
  initFilters();

  // Observe dynamic additions (if later you change products array)
  const grid = $("#produits-grid");
  const mo = new MutationObserver(()=>{
    setTimeout(()=>{ initAnimations(); initOrderButtons(); }, 40);
  });
  if(grid) mo.observe(grid, {childList:true});
});
