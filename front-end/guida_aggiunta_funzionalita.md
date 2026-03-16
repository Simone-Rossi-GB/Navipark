# Guida all'aggiunta di una funzionalità

Come affrontare l'implementazione di qualsiasi feature quando non sai da dove iniziare.

---

## 1. Capire cosa serve concettualmente (prima del codice)

Scrivi a parole la feature come se la spiegassi a un non-tecnico. Esempio:
> "L'utente compila un form, clicca invia, e vede un messaggio di conferma."

Da questa frase estrai i **verbi** — quelli sono le cose che il codice deve fare:
- **Raccogliere** i dati del form
- **Inviare** i dati a un server
- **Mostrare** il risultato all'utente

I verbi ti dicono *cosa* costruire. Non partire dal codice, parti dal comportamento.

---

## 2. Tradurre i verbi in domande tecniche

Per ogni verbo, chiedi: *"Esiste già qualcosa che lo fa?"*

La risposta è quasi sempre sì. Il lavoro del programmatore non è inventare — è **trovare lo strumento giusto e collegarlo**.

Esempio:

| Cosa fare | Domanda da cercare |
|---|---|
| Posizione GPS dell'utente | "javascript get user location" |
| Calcolare un percorso su strada | "routing api" / "directions api" |
| Inviare email | "transactional email service" |
| Autenticare un utente | "auth library react" |

Come cercare: usa Google o la documentazione ufficiale della libreria/framework che stai usando. Cerca sempre prima nella doc ufficiale, poi su Stack Overflow, poi su GitHub Issues.

---

## 3. Capire i dati che si scambiano

Prima di scrivere una riga di codice, disegna (mentalmente o su carta) il flusso dei dati:

```
[Input] → [Elaborazione] → [Output]
```

Esempio per un percorso su mappa:
```
[Coordinate utente] → [API Directions] → [GeoJSON percorso] → [Disegno su mappa]
```

Questo ti dice:
- **Cosa entra** in ogni pezzo di codice
- **Cosa esce** da ogni pezzo
- **Chi dipende da chi**

Se non riesci a disegnare il flusso, non hai ancora capito abbastanza la feature. Fermati e studia prima.

---

## 4. Decidere dove mettere il codice

Regola semplice: **una responsabilità per file**.

Quando ti chiedi "dove metto questa cosa?", rispondi con:
- È **logica di stato o side effect**? → custom hook (`useNomeFeature.js`)
- È **interfaccia visiva**? → componente (`NomeComponente.jsx`)
- È **chiamata a un'API esterna**? → file services (`api.js` o simile)
- È **condivisa tra più componenti**? → Context o store globale

Non mettere tutto in un unico file enorme. Non creare un file nuovo per ogni cosa banale. Il criterio è: *se questa cosa dovesse cambiare, cosa cambierebbe insieme a lei?* Quelle cose vanno nello stesso file.

---

## 5. Costruire pezzo per pezzo, verificando ogni pezzo

Mai costruire tutto insieme. Ordine consigliato:

1. Fai funzionare il pezzo più interno/semplice → verificalo con un `console.log`
2. Aggiungi il pezzo successivo → verificalo
3. Collega i pezzi tra loro
4. Aggiungi la UI solo alla fine

Esempio pratico:
1. Prima fai funzionare la chiamata API → logga la risposta in console
2. Poi estrai i dati che ti servono dalla risposta
3. Poi salvali nello stato del componente
4. Poi rendili nella UI

Se salti i passaggi intermedi, quando qualcosa non funziona non sai dove cercare il problema.

---

## 6. Il vero skill: leggere la documentazione

La cosa più utile che puoi imparare è **come leggere la doc di una libreria**:

1. **Quickstart / Get started** — ti dà il pattern minimo funzionante, copialo e fallo girare
2. **Examples / Guide** — codice già scritto per casi comuni, cerca quello più simile al tuo
3. **API Reference** — usala solo quando ti serve un parametro specifico, non leggerla tutta

Non cercare di capire tutto prima di iniziare. Parti dall'esempio minimo, fallo funzionare, poi espandilo.

---

## 7. Quando sei bloccato

In ordine di priorità:

1. Leggi il messaggio di errore per intero — spesso dice esattamente cosa manca
2. Cerca il messaggio di errore su Google (copia-incolla il testo esatto)
3. Controlla la documentazione ufficiale della cosa che stai usando
4. Semplifica: riduci il codice al minimo indispensabile e verifica che funzioni quello
5. Chiedi aiuto con contesto: *cosa stai cercando di fare*, *cosa ti aspetti*, *cosa succede invece*

---

## Schema riassuntivo

```
1. Descrivi la feature a parole → estrai i verbi
2. Per ogni verbo → trova lo strumento esistente
3. Disegna il flusso dei dati → capisci le dipendenze
4. Decidi dove va ogni pezzo di codice → una responsabilità per file
5. Costruisci dal pezzo più semplice → verifica ogni step
6. Leggi la doc → Quickstart prima, Reference dopo
```
