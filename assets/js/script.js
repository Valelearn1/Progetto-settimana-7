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
      col.className = "col-md-4";
      col.innerHTML = `
    <div class="card" data-id="${squadra.id}">
      <img src="${squadra.badge}" alt="${squadra.team}" class="card-img-top">
      <div class="card-body">
        <h5>${squadra.team}</h5>
        <p>${squadra.league} — ${squadra.country}</p>
      </div>
    </div>
  `;
      cardsContainer.appendChild(col);
    });
  }
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
    prossimi.forEach((evento) => {
      const li = document.createElement("li");
      li.textContent = `${evento.formattaData()} — ${evento.homeTeam} vs ${evento.awayTeam}`;
      listaProssimi.appendChild(li);
    });
  }

  if (ultimi.length === 0) {
    listaUltimi.innerHTML = "<li>Nessun risultato disponibile.</li>";
  } else {
    ultimi.forEach((evento) => {
      const li = document.createElement("li");
      let score;
      if (evento.punteggio() === null) {
        score = "—";
      } else {
        score = evento.punteggio();
      }
      li.textContent = `${evento.formattaData()} — ${evento.homeTeam} vs ${evento.awayTeam} ${score}`;
      listaUltimi.appendChild(li);
    });
  }
}

// === Eventi ===
const spinner = document.getElementById("spinner");
const errore = document.getElementById("errore");

async function gestisciRicerca(e) {
  e.preventDefault();
  const query = document.getElementById("search").value.trim();
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

document.getElementById("form-ricerca").addEventListener("submit", gestisciRicerca);

async function gestisciClickCard(e) {
  // risale il DOM dal punto cliccato fino all'elemento con classe .card
  const card = e.target.closest(".card");
  // se il click non era su una card (es. spazio vuoto del container), ignora
  if (!card) return;

  // legge l'id della squadra salvato nell'attributo data-id
  const id = card.dataset.id;

  spinner.classList.remove("d-none");
  errore.classList.add("d-none");

  try {
    // chiama entrambi gli endpoint in parallelo e attende i risultati
    const dettagli = await caricaDettagli(id);
    // popola le due liste con prossimi eventi e ultimi risultati
    renderDettagli(dettagli.prossimi, dettagli.ultimi);
    // scambia le sezioni visibili
    document.getElementById("risultati-section").hidden = true;
    document.getElementById("dettagli-section").hidden = false;
  } catch (err) {
    errore.textContent = "Impossibile caricare i dettagli. Riprova.";
    errore.classList.remove("d-none");
  } finally {
    // lo spinner si spegne sempre, anche in caso di errore
    spinner.classList.add("d-none");
  }
}

document.getElementById("cards-container").addEventListener("click", gestisciClickCard);

function gestisciIndietro() {
  // nasconde i dettagli e torna ai risultati
  document.getElementById("dettagli-section").hidden = true;
  document.getElementById("risultati-section").hidden = false;
}

document.getElementById("btn-indietro").addEventListener("click", gestisciIndietro);
