# Websocket Events

Welche Events über den Websocket an den Client gesendet werden.
Viel bei Discord abgekupfert.

## Channel Create

Sent to all users that can view the new channel when a channel is created.

```json
{
  "type": "channel_create",
  "data": {
    "roomId": "...",
    "name": "General",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "type": "channel"
  }
}
```

The payload is a full `DtoChannel`, so clients can add the channel to their reactive store without an extra fetch.

## Channel Update

## Channel Delete

Sent to all users that could view the channel before its deletion.

```json
{
  "type": "channel_delete",
  "data": {
    "channelId": "..."
  }
}
```

`channelId` is the room id of the deleted channel. Clients remove the channel from their store (idempotent).

## Channel Pins Update

## Server Update

## Emoji Update

## Member Add

## Member Remove

## Member Update

## Role Create 

## Role Update

## Role Delete

## Message Create

## Message Update

## Message Delete

## Message Delete Bulk

## Message Reaction Add

## Message Reaction Remove

## Message Reaction Remove All

## Message Reaction Remove Emoji

## Presence Update

## Typing Start

## Voice State Update