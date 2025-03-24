import "./style.less";

import React, { useCallback, useContext, useEffect, useState, useMemo } from "react";
import { observer } from "mobx-react-lite";
import { ListRoomsType } from "@netless/flat-server-api";
import { errorTips, useSafePromise } from "flat-components";
import { MainRoomMenu } from "./MainRoomMenu";
import { ActiveTabType, MainRoomListPanel } from "./MainRoomListPanel";
import { MainRoomHistoryPanel } from "./MainRoomHistoryPanel";
import { useLoginCheck } from "../utils/use-login-check";
import {
    GlobalStoreContext,
    PageStoreContext,
    RoomStoreContext,
} from "../components/StoreProvider";
import { AppUpgradeModal } from "../components/AppUpgradeModal";
import { RoomNotBeginModal } from "../components/RoomNotBeginModal";
import { Button } from "flat-components";

// 设备类型检测函数
const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

// 防抖函数
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
    let timeout: ReturnType<typeof setTimeout>;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    } as T;
};

export const HomePage = observer(function HomePage() {
    const sp = useSafePromise();
    const pageStore = useContext(PageStoreContext);
    const roomStore = useContext(RoomStoreContext);
    const globalStore = useContext(GlobalStoreContext);

    const [activeTab, setActiveTab] = useState<ActiveTabType>(ListRoomsType.All);
    const [showHistory, setShowHistory] = useState(false);
    const [isMobile, setIsMobile] = useState(isMobileDevice());

    // 使用防抖优化窗口大小变化处理
    const debouncedHandleResize = useMemo(
        () => debounce(() => setIsMobile(isMobileDevice()), 250),
        []
    );

    // 监听窗口大小变化
    useEffect(() => {
        window.addEventListener('resize', debouncedHandleResize);
        return () => {
            window.removeEventListener('resize', debouncedHandleResize);
        };
    }, [debouncedHandleResize]);

    useEffect(() => pageStore.configure(), [pageStore]);

    const isLogin = useLoginCheck();

    // 性能监控
    useEffect(() => {
        const startTime = performance.now();
        
        return () => {
            const endTime = performance.now();
            console.info(`HomePage render time: ${endTime - startTime}ms`);
        };
    }, []);

    // 错误边界处理
    const [hasError, setHasError] = useState(false);
    useEffect(() => {
        const handleError = (error: ErrorEvent) => {
            console.error('HomePage Error:', error);
            setHasError(true);
            // 可以在这里添加错误上报逻辑
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    if (hasError) {
        return (
            <div className="homepage-error">
                <h1>页面出现错误</h1>
                <Button onClick={() => window.location.reload()}>
                    刷新页面
                </Button>
            </div>
        );
    }

    // 优化刷新房间列表
    const refreshRooms = useCallback(
        async function refreshRooms() {
            try {
                const startTime = performance.now();
                await Promise.all([
                    sp(roomStore.listRooms(activeTab)),
                    sp(roomStore.listRooms(ListRoomsType.History)),
                ]);
                const endTime = performance.now();
                console.info(`Room refresh time: ${endTime - startTime}ms`);
            } catch (e) {
                console.error('Room refresh error:', e);
                errorTips(e);
            }
        },
        [activeTab, roomStore, sp],
    );

    useEffect(() => {
        if (!isLogin) {
            return;
        }

        void refreshRooms();
        void globalStore.updatePmiRoomList();

        const ticket = window.setInterval(refreshRooms, 30 * 1000);

        return () => {
            window.clearInterval(ticket);
        };
    }, [refreshRooms, isLogin, globalStore]);

    useEffect(() => {
        if (isLogin && globalStore.requestRefreshRooms) {
            void refreshRooms();
            globalStore.updateRequestRefreshRooms(false);
        }
    }, [refreshRooms, isLogin, globalStore.requestRefreshRooms]);

    // 使用useMemo优化移动端和桌面端布局
    const MobileLayout = useMemo(() => (
        <div className="homepage-layout-mobile-container">
            <MainRoomMenu />
            <div className="homepage-layout-mobile-content">
                <MainRoomListPanel
                    activeTab={activeTab}
                    refreshRooms={refreshRooms}
                    roomStore={roomStore}
                    setActiveTab={setActiveTab}
                    isMobile={true}
                    onShowHistory={() => setShowHistory(true)}
                />
            </div>
            {showHistory && (
                <div className="homepage-layout-mobile-history">
                    <MainRoomHistoryPanel 
                        refreshRooms={refreshRooms} 
                        roomStore={roomStore}
                        isMobile={true}
                        onClose={() => setShowHistory(false)}
                    />
                </div>
            )}
            <RoomNotBeginModal />
            <AppUpgradeModal />
        </div>
    ), [activeTab, refreshRooms, roomStore, showHistory]);

    const DesktopLayout = useMemo(() => (
        <div className="homepage-layout-horizontal-container">
            <MainRoomMenu />
            <div className="homepage-layout-horizontal-content">
                <MainRoomListPanel
                    activeTab={activeTab}
                    refreshRooms={refreshRooms}
                    roomStore={roomStore}
                    setActiveTab={setActiveTab}
                    isMobile={false}
                />
                <MainRoomHistoryPanel 
                    refreshRooms={refreshRooms} 
                    roomStore={roomStore}
                    isMobile={false}
                />
            </div>
            <RoomNotBeginModal />
            <AppUpgradeModal />
        </div>
    ), [activeTab, refreshRooms, roomStore]);

    return isMobile ? <MobileLayout /> : <DesktopLayout />;
});

export default HomePage;
