import { page } from "$app/state";
import { env } from "$env/dynamic/public";
import { api } from "$lib/api";
import type { WsEvent, WsMessage } from "$shared/dto/ws-message";
import { Centrifuge, type PublicationContext } from "centrifuge";

type WsEventType = WsEvent["type"];
type WsEventData<T extends WsEventType> = Extract<WsEvent, { type: T }>["data"];

type WsEventHandler = (data: WsEvent["data"], message: WsMessage) => void;

export class GatewayManager {
    private getToken = async () => {
        const token = await api.gateway.token
            .get({ query: { deviceId: "default" } })
            .then((res) => {
                return res.data?.token;
            });
        return token || "";
    };
    private userId = page.data?.user?.id;

    private centrifuge = $state<Centrifuge>(
        new Centrifuge(
            env.PUBLIC_GNAGCHAT_CENTRIFUGO_WS_ENDPOINT || "http://localhost:8000",
            {
                getToken: this.getToken,
                debug: true,
            },
        ),
    );

    private handlers = new Map<WsEventType | "*", Set<WsEventHandler>>();

    /**
     * Register a handler for a specific event type.
     * Returns an unsubscribe function.
     */
    on<T extends WsEventType>(
        type: T,
        handler: (data: WsEventData<T>, message: WsMessage) => void,
    ): () => void {
        console.log("[DEBUG] Registering handler for event type:", type);
        const set = this.handlers.get(type) ?? new Set<WsEventHandler>();
        const wrapped = handler as WsEventHandler;
        set.add(wrapped);
        this.handlers.set(type, set);

        return () => {
            set.delete(wrapped);
            if (set.size === 0) {
                this.handlers.delete(type);
            }
        };
    }

    /**
     * Register a handler that is invoked for every incoming message,
     * regardless of its type.
     * Returns an unsubscribe function.
     */
    onAny(handler: WsEventHandler): () => void {
        const set = this.handlers.get("*") ?? new Set<WsEventHandler>();
        set.add(handler);
        this.handlers.set("*", set);

        return () => {
            set.delete(handler);
            if (set.size === 0) {
                this.handlers.delete("*");
            }
        };
    }

    connect() {
        console.log("[DEBUG] Connecting to Centrifugo...");
        console.log("[DEBUG] GatewayManager initialized with endpoint:", env.PUBLIC_GNAGCHAT_CENTRIFUGO_WS_ENDPOINT);
        this.centrifuge.connect();
        console.log("[DEBUG] Centrifugo connection initiated.");
        this.centrifuge.on("connected", (context) => {
            console.log("[DEBUG] Centrifugo connected:", context);
            if (!this.userId) {
                console.error("No user ID found");
                return;
            }
            try {
                const sub = this.centrifuge.newSubscription("user:" + this.userId, {
                    getToken: this.getToken,
                })
                sub.subscribe();
                sub.on("publication", (context: PublicationContext) => {
                    const msg = context.data as WsMessage;
                    this.handleWsMessage(msg);
                });
            } catch (error) {
            }
        });
        this.centrifuge.on("disconnected", (context) => {
            console.log("[DEBUG] Centrifugo disconnected:", context);
        });
    }

    private handleWsMessage(msg: WsMessage) {
        const { type, data } = msg.payload;
        console.log("[DEBUG] Received message of type:", type, "with data:", data);

        const specificHandlers = this.handlers.get(type);
        if (specificHandlers) {
            for (const handler of specificHandlers) {
                handler(data, msg);
            }
        } else {
            console.debug("[DEBUG] No handler registered for event type:", type, msg);
        }

        const anyHandlers = this.handlers.get("*");
        if (anyHandlers) {
            for (const handler of anyHandlers) {
                handler(data, msg);
            }
        }
    }

    disconnect() {
        this.centrifuge.disconnect();
    }
}