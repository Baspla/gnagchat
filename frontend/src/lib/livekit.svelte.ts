import {
    Room,
    RoomEvent,
    Participant,
    LocalParticipant,
    RemoteParticipant,
    ParticipantEvent,
    Track,
    TrackPublication,
    TrackEvent,
    ConnectionState,
    ConnectionQuality,
    type RoomConnectOptions,
    type RoomOptions,
    type VideoCaptureOptions,
    type AudioCaptureOptions,
    type ScreenShareCaptureOptions,
    type DataPublishOptions,
    type RpcInvocationData
} from 'livekit-client';
import { SvelteMap } from 'svelte/reactivity';
import type { Action } from 'svelte/action';
import { api } from './api';
import { env } from '$env/dynamic/public';

/**
 * ==========================================
 * LIVEKIT SVELTE 5 REACTIVE WRAPPERS
 * ==========================================
 */

export class ReactiveTrackPublication {
    publication: TrackPublication;
    track = $state<Track | undefined>();
    isMuted = $state(false);
    isSubscribed = $state(false);

    constructor(publication: TrackPublication) {
        this.publication = publication;
        this.track = publication.track;
        this.isMuted = publication.isMuted;
        this.isSubscribed = publication.isSubscribed;

        this.onMuted = this.onMuted.bind(this);
        this.onUnmuted = this.onUnmuted.bind(this);
        this.onSubscribed = this.onSubscribed.bind(this);
        this.onUnsubscribed = this.onUnsubscribed.bind(this);

        this.publication.on(TrackEvent.Muted, this.onMuted);
        this.publication.on(TrackEvent.Unmuted, this.onUnmuted);
        this.publication.on(TrackEvent.Subscribed, this.onSubscribed);
        this.publication.on(TrackEvent.Unsubscribed, this.onUnsubscribed);
    }

    private onMuted() {
        this.isMuted = true;
    }

    private onUnmuted() {
        this.isMuted = false;
    }

    private onSubscribed(track: Track) {
        this.track = track;
        this.isSubscribed = true;
    }

    private onUnsubscribed() {
        this.track = undefined;
        this.isSubscribed = false;
    }

    destroy() {
        this.publication.off(TrackEvent.Muted, this.onMuted);
        this.publication.off(TrackEvent.Unmuted, this.onUnmuted);
        this.publication.off(TrackEvent.Subscribed, this.onSubscribed);
        this.publication.off(TrackEvent.Unsubscribed, this.onUnsubscribed);
    }
}

export class ReactiveParticipant {
    participant: Participant;
    identity = $state('');
    name = $state('');
    metadata = $state('');
    isSpeaking = $state(false);
    connectionQuality = $state(ConnectionQuality.Unknown);
    permissions = $state<Participant['permissions']>();
    attributes = $state<Record<string, string>>({});

    // SvelteMap allows deep reactivity when iterating in getters / derived states
    tracks = new SvelteMap<string, ReactiveTrackPublication>();

    constructor(participant: Participant) {
        this.participant = participant;
        this.identity = participant.identity;
        this.name = participant.name ?? '';
        this.metadata = participant.metadata ?? '';
        this.isSpeaking = participant.isSpeaking;
        this.connectionQuality = participant.connectionQuality;
        this.permissions = participant.permissions;
        this.attributes = { ...participant.attributes };

        for (const [sid, pub] of participant.trackPublications) {
            this.tracks.set(sid, new ReactiveTrackPublication(pub));
        }

        this.onTrackPublished = this.onTrackPublished.bind(this);
        this.onTrackUnpublished = this.onTrackUnpublished.bind(this);
        this.onTrackSubscribed = this.onTrackSubscribed.bind(this);
        this.onTrackUnsubscribed = this.onTrackUnsubscribed.bind(this);
        this.onTrackMuted = this.onTrackMuted.bind(this);
        this.onTrackUnmuted = this.onTrackUnmuted.bind(this);
        this.onIsSpeakingChanged = this.onIsSpeakingChanged.bind(this);
        this.onConnectionQualityChanged = this.onConnectionQualityChanged.bind(this);
        this.onParticipantMetadataChanged = this.onParticipantMetadataChanged.bind(this);
        this.onParticipantPermissionsChanged = this.onParticipantPermissionsChanged.bind(this);
        this.onAttributesChanged = this.onAttributesChanged.bind(this);

        participant.on(ParticipantEvent.TrackPublished, this.onTrackPublished);
        participant.on(ParticipantEvent.TrackUnpublished, this.onTrackUnpublished);
        participant.on(ParticipantEvent.TrackSubscribed, this.onTrackSubscribed);
        participant.on(ParticipantEvent.TrackUnsubscribed, this.onTrackUnsubscribed);
        participant.on(ParticipantEvent.TrackMuted, this.onTrackMuted);
        participant.on(ParticipantEvent.TrackUnmuted, this.onTrackUnmuted);
        participant.on(ParticipantEvent.IsSpeakingChanged, this.onIsSpeakingChanged);
        participant.on(ParticipantEvent.ConnectionQualityChanged, this.onConnectionQualityChanged);
        participant.on(ParticipantEvent.ParticipantMetadataChanged, this.onParticipantMetadataChanged);
        participant.on(ParticipantEvent.ParticipantPermissionsChanged, this.onParticipantPermissionsChanged);
        participant.on(ParticipantEvent.AttributesChanged, this.onAttributesChanged);

        if (participant instanceof LocalParticipant) {
            participant.on(ParticipantEvent.LocalTrackPublished, this.onTrackPublished);
            participant.on(ParticipantEvent.LocalTrackUnpublished, this.onTrackUnpublished);
        }
    }

    private onTrackPublished(pub: TrackPublication) {
        if (!this.tracks.has(pub.trackSid)) {
            this.tracks.set(pub.trackSid, new ReactiveTrackPublication(pub));
        }
    }

    private onTrackUnpublished(pub: TrackPublication) {
        const reactivePub = this.tracks.get(pub.trackSid);
        if (reactivePub) {
            reactivePub.destroy();
            this.tracks.delete(pub.trackSid);
        }
    }

    private onTrackSubscribed(track: Track, pub: TrackPublication) {
        let reactivePub = this.tracks.get(pub.trackSid);
        if (!reactivePub) {
            reactivePub = new ReactiveTrackPublication(pub);
            this.tracks.set(pub.trackSid, reactivePub);
        }
        // Subscribed state is updated automatically via the ReactiveTrackPublication
    }

    private onTrackUnsubscribed(track: Track, pub: TrackPublication) {
        // Unsubscribed state is handled within the ReactiveTrackPublication
    }

    private onTrackMuted(pub: TrackPublication) {
        const reactivePub = this.tracks.get(pub.trackSid);
        if (reactivePub) reactivePub.isMuted = true;
    }

    private onTrackUnmuted(pub: TrackPublication) {
        const reactivePub = this.tracks.get(pub.trackSid);
        if (reactivePub) reactivePub.isMuted = false;
    }

    private onIsSpeakingChanged(speaking: boolean) {
        this.isSpeaking = speaking;
    }

    private onConnectionQualityChanged(quality: ConnectionQuality) {
        this.connectionQuality = quality;
    }

    private onParticipantMetadataChanged(metadata: string | undefined) {
        this.metadata = metadata ?? '';
    }

    private onParticipantPermissionsChanged() {
        this.permissions = this.participant.permissions;
    }

    private onAttributesChanged(attributes: Record<string, string>) {
        this.attributes = { ...this.participant.attributes };
    }

    // Reactive getters utilizing SvelteMap traversal
    get cameraTrack() {
        for (const pub of this.tracks.values()) {
            if (pub.publication.source === Track.Source.Camera) return pub;
        }
        return undefined;
    }

    get microphoneTrack() {
        for (const pub of this.tracks.values()) {
            if (pub.publication.source === Track.Source.Microphone) return pub;
        }
        return undefined;
    }

    get screenShareTrack() {
        for (const pub of this.tracks.values()) {
            if (pub.publication.source === Track.Source.ScreenShare) return pub;
        }
        return undefined;
    }

    get screenShareAudioTrack() {
        for (const pub of this.tracks.values()) {
            if (pub.publication.source === Track.Source.ScreenShareAudio) return pub;
        }
        return undefined;
    }
    
    get isLocalParticipant() {
        return false; // Default to false; overridden in ReactiveLocalParticipant
    }

    destroy() {
        this.participant.off(ParticipantEvent.TrackPublished, this.onTrackPublished);
        this.participant.off(ParticipantEvent.TrackUnpublished, this.onTrackUnpublished);
        this.participant.off(ParticipantEvent.TrackSubscribed, this.onTrackSubscribed);
        this.participant.off(ParticipantEvent.TrackUnsubscribed, this.onTrackUnsubscribed);
        this.participant.off(ParticipantEvent.TrackMuted, this.onTrackMuted);
        this.participant.off(ParticipantEvent.TrackUnmuted, this.onTrackUnmuted);
        this.participant.off(ParticipantEvent.IsSpeakingChanged, this.onIsSpeakingChanged);
        this.participant.off(ParticipantEvent.ConnectionQualityChanged, this.onConnectionQualityChanged);
        this.participant.off(ParticipantEvent.ParticipantMetadataChanged, this.onParticipantMetadataChanged);
        this.participant.off(ParticipantEvent.ParticipantPermissionsChanged, this.onParticipantPermissionsChanged);
        this.participant.off(ParticipantEvent.AttributesChanged, this.onAttributesChanged);

        if (this.participant instanceof LocalParticipant) {
            this.participant.off(ParticipantEvent.LocalTrackPublished, this.onTrackPublished);
            this.participant.off(ParticipantEvent.LocalTrackUnpublished, this.onTrackUnpublished);
        }

        for (const pub of this.tracks.values()) {
            pub.destroy();
        }
        this.tracks.clear();
    }
}

export class ReactiveLocalParticipant extends ReactiveParticipant {
    declare participant: LocalParticipant;

    constructor(participant: LocalParticipant) {
        super(participant);
    }

    syncState() {
        this.identity = this.participant.identity;
        this.name = this.participant.name ?? '';
        this.metadata = this.participant.metadata ?? '';
        this.attributes = { ...this.participant.attributes };
    }

    async setCameraEnabled(enabled: boolean, options?: VideoCaptureOptions) {
        return this.participant.setCameraEnabled(enabled, options);
    }

    async setMicrophoneEnabled(enabled: boolean, options?: AudioCaptureOptions) {
        return this.participant.setMicrophoneEnabled(enabled, options);
    }

    async setScreenShareEnabled(enabled: boolean, options?: ScreenShareCaptureOptions) {
        return this.participant.setScreenShareEnabled(enabled, options);
    }

    async sendText(text: string, options: { topic: string }) {
        return this.participant.sendText(text, options);
    }

    async streamText(options: { topic: string }) {
        return this.participant.streamText(options);
    }

    async sendFile(file: File, options: { topic: string, mimeType?: string, onProgress?: (progress: number) => void }) {
        return this.participant.sendFile(file, options);
    }

    async streamBytes(options: { topic: string, name: string }) {
        return this.participant.streamBytes(options);
    }

    async performRpc(destinationIdentity: string, method: string, payload: string, responseTimeout?: number) {
        return this.participant.performRpc({ destinationIdentity, method, payload, responseTimeout });
    }
    
    
    get isCameraEnabled(): boolean {
        const track = this.cameraTrack;
        return track ? !track.isMuted : false;
    }

    get isMicrophoneEnabled(): boolean {
        const track = this.microphoneTrack;
        return track ? !track.isMuted : false;
    }

    get isScreenShareEnabled(): boolean {
        const track = this.screenShareTrack;
        return track ? !track.isMuted : false;
    }

    get isScreenShareAudioEnabled(): boolean {
        const track = this.screenShareAudioTrack;
        return track ? !track.isMuted : false;
    }

    get isLocalParticipant(): boolean {
        return true;
    }
}

export class ReactiveRoom {
    room: Room;

    state = $state(ConnectionState.Disconnected);
    metadata = $state('');
    participants = new SvelteMap<string, ReactiveParticipant>();
    localParticipant = $state<ReactiveLocalParticipant | undefined>();
    activeSpeakers = $state<ReactiveParticipant[]>([]);
    private dataListeners = new Set<(payload: Uint8Array, participant?: ReactiveParticipant, topic?: string) => void>();

    constructor(options?: RoomOptions) {
        this.room = new Room(options);
        this.state = this.room.state;
        this.metadata = this.room.metadata ?? '';

        this.localParticipant = new ReactiveLocalParticipant(this.room.localParticipant);

        this.onConnected = this.onConnected.bind(this);
        this.onDisconnected = this.onDisconnected.bind(this);
        this.onConnectionStateChanged = this.onConnectionStateChanged.bind(this);
        this.onParticipantConnected = this.onParticipantConnected.bind(this);
        this.onParticipantDisconnected = this.onParticipantDisconnected.bind(this);
        this.onActiveSpeakersChanged = this.onActiveSpeakersChanged.bind(this);
        this.onRoomMetadataChanged = this.onRoomMetadataChanged.bind(this);
        this.onDataReceived = this.onDataReceived.bind(this);

        this.room.on(RoomEvent.Connected, this.onConnected);
        this.room.on(RoomEvent.Disconnected, this.onDisconnected);
        this.room.on(RoomEvent.ConnectionStateChanged, this.onConnectionStateChanged);
        this.room.on(RoomEvent.ParticipantConnected, this.onParticipantConnected);
        this.room.on(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected);
        this.room.on(RoomEvent.ActiveSpeakersChanged, this.onActiveSpeakersChanged);
        this.room.on(RoomEvent.RoomMetadataChanged, this.onRoomMetadataChanged);
        this.room.on(RoomEvent.DataReceived, this.onDataReceived);
    }

    private onConnected() {
        if (this.localParticipant) {
            this.localParticipant.syncState();
        }
        this.participants.clear();
        for (const [identity, p] of this.room.remoteParticipants) {
            this.participants.set(identity, new ReactiveParticipant(p));
        }
    }

    private onDisconnected() {
        this.state = ConnectionState.Disconnected;
        for (const p of this.participants.values()) {
            p.destroy();
        }
        this.participants.clear();
        this.activeSpeakers = [];
    }

    private onConnectionStateChanged(state: ConnectionState) {
        this.state = state;
    }

    private onParticipantConnected(p: RemoteParticipant) {
        if (!this.participants.has(p.identity)) {
            this.participants.set(p.identity, new ReactiveParticipant(p));
        }
    }

    private onParticipantDisconnected(p: RemoteParticipant) {
        const rp = this.participants.get(p.identity);
        if (rp) {
            rp.destroy();
            this.participants.delete(p.identity);
        }
    }

    private onActiveSpeakersChanged(speakers: Participant[]) {
        this.activeSpeakers = speakers.map(s => {
            if (s === this.room.localParticipant && this.localParticipant) {
                return this.localParticipant;
            }
            return this.participants.get(s.identity);
        }).filter((p): p is ReactiveParticipant => p !== undefined);
    }

    private onRoomMetadataChanged(metadata: string) {
        this.metadata = metadata;
    }

    private onDataReceived(payload: Uint8Array, participant?: RemoteParticipant, _kind?: any, topic?: string) {
        const reactiveParticipant = participant ? this.participants.get(participant.identity) : undefined;
        for (const listener of this.dataListeners) {
            listener(payload, reactiveParticipant, topic);
        }
    }

    onTextStream(topic: string, handler: (reader: any, participantInfo: any) => void) {
        this.room.registerTextStreamHandler(topic, handler);
    }

    onByteStream(topic: string, handler: (reader: any, participantInfo: any) => void) {
        this.room.registerByteStreamHandler(topic, handler);
    }


    subscribeToData(callback: (payload: Uint8Array, participant?: ReactiveParticipant, topic?: string) => void) {
        this.dataListeners.add(callback);
        return () => this.dataListeners.delete(callback);
    }

    registerRpcMethod(method: string, handler: (data: any) => Promise<string>) {
        this.room.registerRpcMethod(method, handler);
    }

    unregisterRpcMethod(method: string) {
        this.room.unregisterRpcMethod(method);
    }

    // Helper to get an array of remote participants
    get remoteParticipants() {
        return Array.from(this.participants.values());
    }

    get allParticipants() {
        const participants: ReactiveParticipant[] = [];
        if (this.localParticipant) {
            participants.push(this.localParticipant);
        }
        participants.push(...this.remoteParticipants);
        return participants;
    }

    async connect(options?: RoomConnectOptions) {
        const url = env.PUBLIC_GNAGCHAT_LIVEKIT_URL || 'ws://localhost:7880';
        const token = await api.livekit.token
            .get({ query: { roomName: "default-room", deviceId: "default-device" } })
            .then((res) => {
                if (res.status !== 200) {
                    console.error("Failed to get token:", res);
                    return;
                }
                if (res.data && res.data.token) {
                    return res.data.token;
                } else {
                    console.error("Token not found in response:", res);
                }
            });
        if (!token) {
            throw new Error("Failed to retrieve LiveKit token");
        }
        await this.room.connect(url, token, options);
    }

    async disconnect(stopTracks?: boolean) {
        await this.room.disconnect(stopTracks);
    }

    destroy() {
        this.room.off(RoomEvent.Connected, this.onConnected);
        this.room.off(RoomEvent.Disconnected, this.onDisconnected);
        this.room.off(RoomEvent.ConnectionStateChanged, this.onConnectionStateChanged);
        this.room.off(RoomEvent.ParticipantConnected, this.onParticipantConnected);
        this.room.off(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected);
        this.room.off(RoomEvent.ActiveSpeakersChanged, this.onActiveSpeakersChanged);
        this.room.off(RoomEvent.RoomMetadataChanged, this.onRoomMetadataChanged);
        this.room.off(RoomEvent.DataReceived, this.onDataReceived);

        this.dataListeners.clear();

        this.onDisconnected();
        if (this.localParticipant) {
            this.localParticipant.destroy();
            this.localParticipant = undefined;
        }
        this.room.removeAllListeners();
    }
}

/**
 * ==========================================
 * SVELTE ACTION FOR MEDIA ELEMENTS
 * ==========================================
 * Attach this safely to a video or audio element. 
 * Re-attaches if track reactively updates.
 */
export const attachTrack: Action<HTMLMediaElement, Track | undefined> = (node, track) => {
    if (track) {
        track.attach(node);
    }

    return {
        update(newTrack) {
            if (track !== newTrack) {
                if (track) track.detach(node);
                if (newTrack) newTrack.attach(node);
                track = newTrack;
            }
        },
        destroy() {
            if (track) {
                track.detach(node);
            }
        }
    };
};