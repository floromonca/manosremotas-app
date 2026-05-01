"use client";

import type { CSSProperties } from "react";
import {
    cardStyle,
    mutedTextStyle,
    sectionTitleStyle,
} from "../memberDetailStyles";

type Props = {
    loadingHoursPay: boolean;
    children: React.ReactNode;
};

export default function MemberHoursPayCard({
    loadingHoursPay,
    children,
}: Props) {
    return (
        <section style={cardStyle}>
            <div style={sectionTitleStyle}>Hours & Pay</div>

            {loadingHoursPay ? (
                <div style={mutedTextStyle}>
                    Loading hours and pay...
                </div>
            ) : (
                children
            )}
        </section>
    );
}
