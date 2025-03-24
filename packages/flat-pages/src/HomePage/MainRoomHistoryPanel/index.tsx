// import "../MainRoomListPanel/MainRoomList.less";

import React, { useCallback, useMemo } from "react";
import { observer } from "mobx-react-lite";
import { ListRoomsType } from "@netless/flat-server-api";
import { RoomList } from "flat-components";
import { useTranslate } from "@netless/flat-i18n";
import { RoomStore } from "@netless/flat-stores";
import { MainRoomList } from "../MainRoomListPanel/MainRoomList";
import { Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";

interface MainRoomHistoryPanelProps {
    roomStore: RoomStore;
    refreshRooms: () => Promise<void>;
    isMobile?: boolean;
    onClose?: () => void;
}

export const MainRoomHistoryPanel = observer<MainRoomHistoryPanelProps>(
    function MainRoomHistoryPanel({ roomStore, refreshRooms, isMobile, onClose }) {
        const t = useTranslate();

        const onScrollToBottom = useCallback((): void => {
            void roomStore.fetchMoreRooms(ListRoomsType.History);
        }, [roomStore]);

        const title = useMemo(() => {
            if (isMobile) {
                return (
                    <div className="room-history-title-mobile">
                        <span>{t("history")}</span>
                        <Button 
                            type="link" 
                            icon={<CloseOutlined />} 
                            onClick={onClose}
                            className="mobile-close-button"
                        />
                    </div>
                );
            }
            return t("history");
        }, [isMobile, t, onClose]);

        const roomList = useMemo(() => (
            <MainRoomList
                listRoomsType={ListRoomsType.History}
                refreshRooms={refreshRooms}
                roomStore={roomStore}
            />
        ), [refreshRooms, roomStore]);

        return (
            <div className={`room-history-panel${isMobile ? " mobile" : ""}`}>
                <RoomList 
                    title={title}
                    onScrollToBottom={onScrollToBottom}
                >
                    {roomList}
                </RoomList>
            </div>
        );
    },
);

export default MainRoomHistoryPanel;
