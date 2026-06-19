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

// === API ===

// === Stato ===

// === Render ===

// === Eventi ===
