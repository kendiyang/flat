import { makeAutoObservable, observable } from "mobx";
import { ListRoomsType, RoomStatus, RoomType } from "@netless/flat-server-api";
import { FlatServices } from "@netless/flat-services";

export interface Room {
    roomUUID: string;
    title: string;
    beginTime: number;
    endTime: number;
    roomType: RoomType;
    roomStatus: RoomStatus;
    ownerUUID: string;
    ownerName: string;
}

export class RoomStore {
    private readonly flatService: FlatServices;
    public rooms = observable.array<Room>([]);
    public historyRooms = observable.array<Room>([]);

    constructor(flatService: FlatServices) {
        this.flatService = flatService;
        makeAutoObservable(this);
    }

    async listRooms(type: ListRoomsType): Promise<void> {
        try {
            const rooms = await this.flatService.listRooms(type);
            if (type === ListRoomsType.History) {
                this.historyRooms.replace(rooms);
            } else {
                this.rooms.replace(rooms);
            }
        } catch (e) {
            console.error("Failed to list rooms:", e);
            throw e;
        }
    }

    // ... existing methods ...
} 