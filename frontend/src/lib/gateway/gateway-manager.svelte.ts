import { page } from "$app/state";
import { env } from "$env/dynamic/public";
import { api } from "$lib/api";
import type { WsEvent, WsMessage } from "$shared/dto/ws-message";
import { Centrifuge, type PublicationContext } from "centrifuge";
import { createLogger, getConfiguredLevel } from "$lib/logger";
import { toaster } from "$lib/toaster";

const logger = createLogger("gateway");

type WsEventType = WsEvent["type"];
type WsEventData<T extends WsEventType> = Extract<WsEvent, { type: T }>["data"];

type WsEventHandler = (data: WsEvent["data"], message: WsMessage) => void;

export class GatewayManager {
    private getToken = async () => {
        // only call this from the browser, not from server-side rendering
        if (typeof window === "undefined") {
            return "";
        }
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
                maxReconnectDelay: 10000, // default is 2000
                // Only enable Centrifuge debug logging when our log level is debug
                //debug: getConfiguredLevel() === "debug",
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
        logger.debug("registering handler for event type", { type });
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
        logger.info("connecting to Centrifugo");
        this.centrifuge.on("error", (context) => {
            logger.error(context.error.message)
            if(context.error.message = "transport closed"){
                toaster.error({
                    title: "Error connecting to Realtime Messaging Server",
                })
            }
        });
        this.centrifuge.on("connected", (context) => {
            logger.info("Centrifugo connected");
            if (!this.userId) {
                logger.error("no user ID found");
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
                logger.error("failed to subscribe to user channel", { userId: this.userId, error: String(error) });
            }
        });
        this.centrifuge.on("disconnected", (context) => {
            logger.info("Centrifugo disconnected");
        });
        this.centrifuge.connect();
    }

    private handleWsMessage(msg: WsMessage) {
        const { type, data } = msg.payload;
        logger.debug("received message", { type });

        const specificHandlers = this.handlers.get(type);
        if (specificHandlers) {
            for (const handler of specificHandlers) {
                handler(data, msg);
            }
        } else {
            logger.debug("no handler registered for event type", { type });
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
