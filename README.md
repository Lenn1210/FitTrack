# FitTrack PWA

FitTrack is een installeerbare webapp (Progressive Web App) gebouwd met React Native, Expo en JavaScript. Dezelfde app werkt in een moderne browser op desktop en mobiel. Trainings, oefeningen en doelen worden lokaal op het apparaat opgeslagen.

## Starten en bouwen

Installeer dependencies en start de webapp lokaal:

```powershell
npm install
npm start
```

Maak een productie-export:

```powershell
npm run build:web
```

De statische website staat daarna in `dist`. Publiceer de inhoud van die map op een hostingprovider die HTTPS ondersteunt, bijvoorbeeld GitHub Pages, Netlify of Vercel. HTTPS (of `localhost` tijdens ontwikkeling) is nodig voor installatie en offline opslag via de service worker. Als je de app onder een submap host, controleer dan dat de hostingprovider bestanden in die submap serveert met behoud van de relatieve paden.

## Publiceren op Cloudflare Pages

De repository bevat `wrangler.jsonc` met `dist` als Pages-outputmap en `public/_headers` met cache- en service-workerheaders. Koppel de GitHub-repository aan Cloudflare Pages met deze instellingen:

- **Build command:** `npm run build:web`
- **Build output directory:** `dist`
- **Root directory:** `FitTrack` als de repository de bovenliggende projectmap bevat; anders `/`

Cloudflare Pages kopieert de bestanden uit `public` tijdens de build. De PWA heeft geen server-side functies of geheime omgevingsvariabelen nodig. Na het koppelen publiceert Cloudflare automatisch nieuwe builds bij pushes naar de ingestelde branch.

Je kunt ook vanaf de opdrachtregel publiceren met `npx wrangler pages deploy dist --project-name=fittrack` nadat `npm run build:web` is uitgevoerd en je met `npx wrangler login` bent aangemeld.

## Installeren

- **iPhone/iPad:** open de HTTPS-site in Safari, tik op Delen en kies **Zet op beginscherm**.
- **Android:** open de site in Chrome en kies **App installeren** of **Toevoegen aan startscherm**.
- **Desktop:** gebruik het installatie-icoon in de adresbalk van een ondersteunde browser.

De service worker cachet de app na het eerste online bezoek, zodat de eerder geladen versie offline kan openen. Nieuwe versies worden via de browser bijgewerkt. Trainingsgegevens blijven in de lokale browseropslag; ze worden niet automatisch tussen apparaten gesynchroniseerd. Wissen van browsergegevens kan deze lokale data verwijderen.

## Apple Gezondheid

Een webapp kan niet rechtstreeks HealthKit of gegevens uit Apple Gezondheid uitlezen. FitTrack toont daarom geen verzonnen gezondheidsmetingen; de Apple Gezondheid-sectie meldt dat deze koppeling niet beschikbaar is in de PWA. Rechtstreekse HealthKit-toegang vereist een aparte native iOS-app en kan niet door installatie als PWA worden toegevoegd.

## Functies

- Home-dashboard en weekoverzicht.
- Trainingskalender, geschiedenis en oefeningenbibliotheek.
- Trainingen en oefeningen vastleggen met sets, herhalingen, gewicht en notities.
- Voortgang, trainingsfrequentie en persoonlijke records.
- Profiel en doelen lokaal opslaan.
