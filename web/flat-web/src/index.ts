import "./index.less";

// 添加crypto.randomUUID的polyfill
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
    // @ts-ignore 
    // 忽略类型检查，因为我们只是为了兼容性添加polyfill
    crypto.randomUUID = () => {
        // 简单的UUID生成实现
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, 
                  v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
}

import { tasks } from "./tasks";

void (async () => {
    for (const task of tasks) {
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await task();
    }
})();
