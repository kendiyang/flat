import { useEffect, useState } from "react";

export function useIsPhoneScreen(): boolean {
    const [isPhone, setIsPhone] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const checkIsPhone = () => {
            setIsPhone(window.innerWidth <= 768);
        };

        window.addEventListener("resize", checkIsPhone);
        return () => window.removeEventListener("resize", checkIsPhone);
    }, []);

    return isPhone;
} 