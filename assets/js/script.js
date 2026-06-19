// SportsHub — Week Project Settimana VII
//
// Devi fare 4 cose per la Versione Base:
// 1. Definire le classi Squadra ed Evento (mappano i dati di TheSportsDB)
// 2. Funzione async cercaSquadre(query) che chiama /searchteams.php
// 3. Funzione async caricaDettagli(idTeam) che chiama in parallelo
//    eventsnext.php + eventslast.php usando Promise.all
// 4. Render dinamico: card squadre, lista prossimi eventi, lista risultati
//
// Endpoint base: https://www.thesportsdb.com/api/v1/json/3/
// Il `3` nell'URL è la chiave API pubblica di test di TheSportsDB: gratis, non serve registrarsi.
//
// Per le versioni Intermedia/Avanzata: localStorage preferiti, debounce, Promise.all multi.

// === Classi ===
class Squadra {
  constructor(dati) {
    this.id = dati.idTeam;
    this.team = dati.strTeam;
    this.badge = dati.strBadge;
    this.league = dati.strLeague;
    this.country = dati.strCountry;
  }
}

class Evento {
  constructor(evento) {
    this.id = evento.idEvent;
    this.date = evento.dateEvent;
    this.homeTeam = evento.strHomeTeam;
    this.awayTeam = evento.strAwayTeam;
    this.homeScore = evento.intHomeScore;
    this.awayScore = evento.intAwayScore;
  }

  // per mettere la data in formato europeo
  formattaData() {
    return new Date(this.date).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  punteggio() {
    if (this.homeScore !== null) {
      return `${this.homeScore} - ${this.awayScore}`;
    }
    return null;
  }
}

// === Preferiti ===

// Chiave usata per identificare i dati nel localStorage
const STORAGE_KEY = "sportshub_preferiti";

// Legge l'array dei preferiti dal localStorage (o restituisce [] se vuoto)
function leggiPreferiti() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

// Sovrascrive l'array dei preferiti nel localStorage
function salvaPreferiti(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// Aggiunge una squadra ai preferiti (solo se non è già presente)
function aggiungiPreferito(squadra) {
  const preferiti = leggiPreferiti();
  if (preferiti.find((s) => s.id === squadra.id)) return; // già nei preferiti: esci
  preferiti.push({
    id: squadra.id,
    team: squadra.team,
    badge: squadra.badge,
    league: squadra.league,
    country: squadra.country,
  });
  salvaPreferiti(preferiti);
}

// Rimuove la squadra con quell'id dai preferiti
function rimuoviPreferito(id) {
  salvaPreferiti(leggiPreferiti().filter((s) => s.id !== id));
}

// Ritorna true se la squadra con quell'id è già nei preferiti
function èPreferito(id) {
  return leggiPreferiti().some((s) => s.id === id);
}

async function cercaSquadre(query) {
  const risposta = await fetch(
    `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${query}`,
  );

  const dati = await risposta.json();
  if (dati.teams === null) {
    return [];
  } else {
    return dati.teams.map((team) => new Squadra(team));
  }
}

async function caricaDettagli(teamId) {
  const [rispostaNext, rispostaLast] = await Promise.all([
    fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${teamId}`,
    ),
    fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${teamId}`,
    ),
  ]);

  const [datiNext, datiLast] = await Promise.all([
    rispostaNext.json(),
    rispostaLast.json(),
  ]);
  return {
    prossimi: (datiNext.events || []).map((e) => new Evento(e)),
    ultimi: (datiLast.results || []).map((e) => new Evento(e)),
  };
}

// Disegna le card dei preferiti nella sezione "Le tue squadre"
function renderPreferiti() {
  const preferiti = leggiPreferiti();
  const sezione = document.getElementById("sezione-preferiti");
  const msg = document.getElementById("msg-preferiti");

  // Cerca (o crea al primo render) il contenitore delle card preferite
  let container = document.getElementById("cards-preferiti");
  if (!container) {
    container = document.createElement("div");
    container.id = "cards-preferiti";
    container.className = "row g-3 mt-2";
    sezione.appendChild(container);
  }
  container.innerHTML = ""; // svuota prima di ridisegnare

  if (preferiti.length === 0) {
    msg.style.display = ""; // "" rimuove lo stile inline → il paragrafo torna visibile
    return;
  }
  msg.style.display = "none"; // nasconde il paragrafo quando ci sono preferiti

  preferiti.forEach((dati) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-4 col-lg-3";
    col.innerHTML = `
      <div class="card" data-id="${dati.id}">
        <img src="${dati.badge}" alt="${dati.team}" class="card-img-top">
        <div class="card-body">
          <h5>${dati.team}</h5>
          <p>${dati.league} — ${dati.country}</p>
          <button class="btn-rimuovi" data-id="${dati.id}">Rimuovi</button>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

// Carica e mostra i dettagli di una squadra dato il suo id.
// Estratta qui per riutilizzarla sia dal click su card di ricerca
// che dal click su card dei preferiti.
async function mostraDettagli(id) {
  spinner.classList.remove("d-none");
  errore.classList.add("d-none");
  try {
    const dettagli = await caricaDettagli(id);
    renderDettagli(dettagli.prossimi, dettagli.ultimi);
    document.getElementById("risultati-section").hidden = true;
    document.getElementById("dettagli-section").hidden = false;
  } catch (err) {
    errore.textContent = "Impossibile caricare i dettagli. Riprova.";
    errore.classList.remove("d-none");
  } finally {
    spinner.classList.add("d-none");
  }
}

// === API ===

// === Stato ===
// variabili globali
let squadreCorrente = []; // ricorda l'ultimo array di ricerca
let squadraSelezionata = null; // ricorda su quale card hai cliccato

// === Render ===
function renderSquadre(squadre) {
  const cardsContainer = document.querySelector("#cards-container");
  cardsContainer.innerHTML = "";
  if (squadre.length === 0) {
    cardsContainer.textContent = "Nessuna squadra trovata";
    return;
  } else {
    squadre.forEach((squadra) => {
      const col = document.createElement("div");
      col.className = "col-12 col-md-4 col-lg-3";
      // data-id sull'elemento .card permette di risalire all'id dal click
      col.innerHTML = `
    <div class="card" data-id="${squadra.id}">
      <img src="${squadra.badge}" alt="${squadra.team}" class="card-img-top">
      <div class="card-body">
        <h5>${squadra.team}</h5>
        <p>${squadra.league} — ${squadra.country}</p>
        <button class="btn-preferito" data-id="${squadra.id}">
          ${èPreferito(squadra.id) ? "★ Rimuovi dai preferiti" : "☆ Aggiungi ai preferiti"}
        </button>
      </div>
    </div>
  `;
      cardsContainer.appendChild(col);
    });
  }
}

// Crea un <li> cliccabile per un evento, con i dati salvati come data-*
function creaLiEvento(evento, mostraPunteggio) {
  const li = document.createElement("li");
  li.className = "event-item";
  // salva i dati sull'elemento per leggerli quando si apre il modal
  li.dataset.home = evento.homeTeam;
  li.dataset.away = evento.awayTeam;
  li.dataset.date = evento.date;
  li.dataset.homeScore = evento.homeScore ?? "";
  li.dataset.awayScore = evento.awayScore ?? "";

  const punteggio = evento.punteggio();
  li.innerHTML = `
    <span class="event-date">${evento.formattaData()}</span>
    <span class="event-teams">${evento.homeTeam} vs ${evento.awayTeam}</span>
    ${mostraPunteggio && punteggio ? `<span class="event-score">${punteggio}</span>` : ""}
  `;
  return li;
}

function renderDettagli(prossimi, ultimi) {
  const listaProssimi = document.getElementById("lista-prossimi");
  const listaUltimi = document.getElementById("lista-ultimi");

  // svuota le liste prima di popolarle
  listaProssimi.innerHTML = "";
  listaUltimi.innerHTML = "";

  if (prossimi.length === 0) {
    listaProssimi.innerHTML = "<li>Nessun evento in programma.</li>";
  } else {
    // false = non mostrare punteggio (eventi futuri non ce l'hanno)
    prossimi.forEach((evento) => listaProssimi.appendChild(creaLiEvento(evento, false)));
  }

  if (ultimi.length === 0) {
    listaUltimi.innerHTML = "<li>Nessun risultato disponibile.</li>";
  } else {
    // true = mostra il punteggio finale
    ultimi.forEach((evento) => listaUltimi.appendChild(creaLiEvento(evento, true)));
  }
}

// Popola e apre il modal Bootstrap con i dati dell'evento cliccato
function apriModalEvento(li) {
  const home = li.dataset.home;
  const away = li.dataset.away;
  const data = new Date(li.dataset.date).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const homeScore = li.dataset.homeScore;
  const awayScore = li.dataset.awayScore;
  const hasPunteggio = homeScore !== "";

  document.getElementById("modal-evento-titolo").textContent = `${home} vs ${away}`;
  document.getElementById("modal-evento-corpo").innerHTML = `
    <p><strong>Data:</strong> ${data}</p>
    <p><strong>Casa:</strong> ${home}</p>
    <p><strong>Trasferta:</strong> ${away}</p>
    ${hasPunteggio ? `<p><strong>Risultato:</strong> ${homeScore} – ${awayScore}</p>` : ""}
  `;

  // bootstrap.Modal è disponibile perché Bootstrap JS è caricato nell'HTML
  new bootstrap.Modal(document.getElementById("modal-evento")).show();
}

// === Eventi ===
const spinner = document.getElementById("spinner");
const errore = document.getElementById("errore");

// Ritorna una versione "ritardata" di fn: la esegue solo dopo `delay` ms
// di silenzio. Ogni nuova chiamata azzera il timer precedente.
function debounce(fn, delay) {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

// Logica della ricerca estratta qui per condividerla tra
// il submit del form e il listener input con debounce
async function eseguiRicerca(query) {
  if (!query) return;
  spinner.classList.remove("d-none");
  errore.classList.add("d-none");
  try {
    squadreCorrente = await cercaSquadre(query);
    renderSquadre(squadreCorrente);
  } catch (err) {
    errore.textContent = "Errore durante la ricerca. Riprova.";
    errore.classList.remove("d-none");
  } finally {
    spinner.classList.add("d-none");
  }
}

async function gestisciRicerca(e) {
  e.preventDefault();
  const query = document.getElementById("search").value.trim();
  await eseguiRicerca(query);
}

document
  .getElementById("form-ricerca")
  .addEventListener("submit", gestisciRicerca);

async function gestisciClickCard(e) {
  // controlla prima se il click era sul bottone preferiti (non sulla card intera)
  const btnPreferito = e.target.closest(".btn-preferito");
  if (btnPreferito) {
    const id = btnPreferito.dataset.id;
    if (èPreferito(id)) {
      rimuoviPreferito(id);
    } else {
      // cerca la squadra nell'ultimo array di ricerca per avere tutti i dati
      const squadra = squadreCorrente.find((s) => s.id === id);
      if (squadra) aggiungiPreferito(squadra);
    }
    renderPreferiti(); // ridisegna la sezione preferiti
    // aggiorna il testo del bottone senza ridisegnare tutte le card
    btnPreferito.textContent = èPreferito(id)
      ? "★ Rimuovi dai preferiti"
      : "☆ Aggiungi ai preferiti";
    return; // non proseguire: non caricare i dettagli
  }

  // risale il DOM dal punto cliccato fino all'elemento con classe .card
  const card = e.target.closest(".card");
  // se il click non era su una card (es. spazio vuoto del container), ignora
  if (!card) return;

  await mostraDettagli(card.dataset.id);
}

document
  .getElementById("cards-container")
  .addEventListener("click", gestisciClickCard);

function gestisciIndietro() {
  // nasconde i dettagli e torna ai risultati
  document.getElementById("dettagli-section").hidden = true;
  document.getElementById("risultati-section").hidden = false;
}

document
  .getElementById("btn-indietro")
  .addEventListener("click", gestisciIndietro);

// Gestisce i click dentro la sezione preferiti:
// - bottone "Rimuovi" → toglie il preferito e ridisegna
// - click sulla card  → carica i dettagli della squadra
document.getElementById("sezione-preferiti").addEventListener("click", async (e) => {
  const btnRimuovi = e.target.closest(".btn-rimuovi");
  if (btnRimuovi) {
    rimuoviPreferito(btnRimuovi.dataset.id);
    renderPreferiti();
    return;
  }
  const card = e.target.closest(".card");
  if (!card) return;
  await mostraDettagli(card.dataset.id);
});

// Avvia la ricerca automaticamente dopo 400ms di pausa nella digitazione
document.getElementById("search").addEventListener(
  "input",
  debounce(() => eseguiRicerca(document.getElementById("search").value.trim()), 400),
);

// Click su un evento nella lista → apre il modal con i dettagli
["lista-prossimi", "lista-ultimi"].forEach((listaId) => {
  document.getElementById(listaId).addEventListener("click", (e) => {
    const li = e.target.closest(".event-item");
    if (li) apriModalEvento(li);
  });
});

// Mostra subito i preferiti salvati al caricamento della pagina
renderPreferiti();
