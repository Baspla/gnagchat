# Gnagchat

Gnagchat ist eine Chat-App für meine Freundesgruppe mit sehr spezifischen Features nach unseren Wünschen.
Das Ziel ist keine Massentaugliche Anwendung mit 1000+ Nutzer skalierbarkeit.
Dennoch sollte die App reproduzierbar in anderen Deployments laufen können.

## Techstack
- Backend: Bun, ElysiaJS, Eden Treaty, Drizzle, SQLite, Better-Auth
- Frontend: Svelte 5, SvelteKit, Eden Treaty, TailwindCSS, Lucide Icons, Bits UI, Skeleton UI, Tanstack Virtual, Better-Auth
- VoIP: Livekit
- Websockets (Pub/Sub): Centrifugo

Alle genaueren genutzten Libraries sind in den jeweiligen frontend/package.json und backend/package.json Dateien zu finden.

## Auth
Zur Authentifizierung wird ein OIDC Provider vorausgesetzt. Ich nutze PocketID, da es perfekt für kleine Deplyments geeignet ist.

## Datenschutz
Da diese App *nicht* für die breite Masse gedacht ist und nur für meine Freundesgruppe, ist die App nicht DSGVO konform ausgelegt.
Es werden keine Daten an Dritte gesendet, es sollte aber jedem Nutzer bewusst sein das alle Nachrichten unverschlüsselt auf dem Server gespeichert werden.
Ich empfehle *niemandem* die Anwendung öffentlich zugänglich zu machen oder außerhalb einer geschlossenen Gruppe zu nutzen.
Ich kann keine der Anforderungen der DSGVO garantieren.

## Deployment
Die App wird bei jedem Commit automatisch als Docker Image gebaut und ist im GitHub Container Registry verfügbar.
Die Compose Datei für das Deployment ist in docker-compose.yml zu finden.
Diese Datei sollte up-to-date mit meinem aktuellen Deployment sein, spezifische Anpassungen hinsichtlich Netzwerk, Ports, Volumes und Secrets müssen eventuell noch gemacht werden.

## LLM-Nutzung
Beim erstellen des Codes wurde ein LLM (Deepseek V4) genutzt, das mich bei der Eintwicklung unterstützt hat.