import React, { useMemo, useCallback, ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { RoomList } from "flat-components";
import { ListRoomsType } from "@netless/flat-server-api";
import { useTranslate } from "@netless/flat-i18n";
import { RoomStore } from "@netless/flat-stores";
import { MainRoomList } from "./MainRoomList";
import { Button } from "antd";
import { HistoryOutlined } from "@ant-design/icons";

export type ActiveTabType = Exclude<ListRoomsType, ListRoomsType.History>;

interface MainRoomListPanelProps {
    activeTab: ActiveTabType;
    setActiveTab: (activeTab: ActiveTabType) => void;
    roomStore: RoomStore;
    refreshRooms: () => Promise<void>;
    isMobile?: boolean;
    onShowHistory?: () => void;
}

export const MainRoomListPanel = observer<MainRoomListPanelProps>(function MainRoomListPanel({
    activeTab,
    setActiveTab,
    roomStore,
    refreshRooms,
    isMobile,
    onShowHistory,
}) {
    const t = useTranslate();

    const filters = useMemo<Array<{ key: ActiveTabType; title: string }>>(
        () => [
            {
                key: ListRoomsType.All,
                title: t("all"),
            },
            {
                key: ListRoomsType.Today,
                title: t("today"),
            },
            {
                key: ListRoomsType.Periodic,
                title: t("periodic"),
            },
        ],
        [t],
    );

    const title = useMemo<ReactNode>(() => {
        if (isMobile) {
            return (
                <div className="room-list-title-mobile">
                    <span>{t("room-list")}</span>
                    <Button 
                        type="link" 
                        icon={<HistoryOutlined />}
                        onClick={onShowHistory}
                        className="mobile-history-button"
                    >
                        {t("history")}
                    </Button>
                </div>
            );
        }
        return t("room-list");
    }, [isMobile, t, onShowHistory]);

    const handleTabActive = useCallback((activeTab: ActiveTabType) => {
        setActiveTab(activeTab);
    }, [setActiveTab]);

    return (
        <RoomList
            activeTab={activeTab}
            filters={filters}
            title={title}
            onTabActive={handleTabActive}
        >
            <MainRoomList
                listRoomsType={activeTab}
                refreshRooms={refreshRooms}
                roomStore={roomStore}
            />
        </RoomList>
    );
});

export default MainRoomListPanel;
