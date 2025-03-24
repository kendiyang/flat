import "./style.less";

import React, { useCallback, useContext, useEffect, useState, useMemo } from "react";
import { observer } from "mobx-react-lite";
import { ListRoomsType } from "@netless/flat-server-api";
import { errorTips, useSafePromise } from "flat-components";
import { Button } from "antd";
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
import { useIsPhoneScreen } from "../hooks/useIsPhoneScreen";

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
    const isPhone = useIsPhoneScreen();

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

    // 添加消息通道错误处理
    useEffect(() => {
        const handleUnload = () => {
            // 清理所有挂起的消息通道
            if (window.chrome && chrome.runtime && chrome.runtime.lastError) {
                console.warn('清理消息通道:', chrome.runtime.lastError);
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            handleUnload();
        };
    }, []);

    // 优化错误边界处理
    const [hasError, setHasError] = useState(false);
    useEffect(() => {
        const handleError = (error: ErrorEvent) => {
            console.error('HomePage Error:', error);
            setHasError(true);
            // 错误上报
            if (window.Sentry) {
                window.Sentry.captureException(error);
            }
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            console.error('Unhandled Promise Rejection:', event.reason);
            // 错误上报
            if (window.Sentry) {
                window.Sentry.captureException(event.reason);
            }
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
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

    const refreshRooms = useCallback(
        async function refreshRooms() {
            try {
                await Promise.all([
                    sp(roomStore.listRooms(activeTab)),
                    sp(roomStore.listRooms(ListRoomsType.History)),
                ]);
            } catch (e) {
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

    const hasHistoryRooms = useMemo(() => {
        return roomStore.historyRooms && roomStore.historyRooms.length > 0;
    }, [roomStore.historyRooms]);

    const MobileLayoutContent = useMemo(() => (
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
            {showHistory && hasHistoryRooms && (
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
    ), [activeTab, refreshRooms, roomStore, showHistory, hasHistoryRooms]);

    const DesktopLayoutContent = useMemo(() => (
        <div className="homepage-layout-vertical-container">
            <MainRoomMenu />
            <div className="homepage-layout-vertical-content">
                <MainRoomListPanel
                    activeTab={activeTab}
                    refreshRooms={refreshRooms}
                    roomStore={roomStore}
                    setActiveTab={setActiveTab}
                    isMobile={false}
                />
                {!isPhone && hasHistoryRooms && (
                    <MainRoomHistoryPanel 
                        refreshRooms={refreshRooms} 
                        roomStore={roomStore}
                        isMobile={false}
                    />
                )}
            </div>
            <RoomNotBeginModal />
            <AppUpgradeModal />
        </div>
    ), [activeTab, refreshRooms, roomStore, isPhone, hasHistoryRooms]);

    return isMobile ? MobileLayoutContent : DesktopLayoutContent;
});

export default HomePage;
