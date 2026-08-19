# Gnagchat Backend

Das Backend läuft auf Bun mit ElysiaJS.
Für eine Typsichere Schnittstelle zum Frontend nutze ich Eden Treaty.
Um auch in den Centrifugo Nachrichten die Typen zu haben, gibt es klare Data-Transfer-Objects (DTOs) im /shared Ordner.
Centrifugo wird als Pub/Sub Server genutzt, um Nachrichten an alle Clients zu verteilen. Hier habe ich mich dafür entschieden jedem Nutzer ein eigenes Topic zu geben, quasi wie ein Briefkasten. Somit ist der aufwand, welchem Topic gefolgt werden muss auf dem Client gering gehalten.
Die Datenbank wird mit Drizzle und SQLite betrieben.
