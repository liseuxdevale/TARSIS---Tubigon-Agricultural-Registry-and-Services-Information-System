import React from 'react';

export default function MaoSeal({ size = 56, className = '', variant = 'default' }) {
    if (variant === 'dark') {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 56 56"
                fill="none"
                className={className}
                role="img"
                aria-label="MAO Tubigon seal"
            >
                <circle cx="28" cy="28" r="25" fill="#2b2b28" stroke="#595955" strokeWidth="1.5" />
                <circle cx="28" cy="28" r="18" fill="none" stroke="#4d4d49" strokeWidth="1" />
                <text x="28" y="25" textAnchor="middle" fill="#d7d7d0" fontSize="7" fontWeight="700">MAO</text>
                <text x="28" y="34" textAnchor="middle" fill="#b8b8b0" fontSize="5" fontWeight="600">seal</text>
            </svg>
        );
    }

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 56 56"
            fill="none"
            className={className}
            role="img"
            aria-label="MAO Tubigon seal placeholder"
        >
            <circle cx="28" cy="28" r="27" fill="#1a4731" stroke="#c8952a" strokeWidth="2" />
            <circle cx="28" cy="28" r="21" fill="none" stroke="#c8952a" strokeDasharray="3 2" />
            <text x="28" y="22" textAnchor="middle" fill="#c8952a" fontSize="6" fontWeight="700" letterSpacing="1">MAO</text>
            <text x="28" y="30" textAnchor="middle" fill="#ffffff" fontSize="5">TUBIGON</text>
            <text x="28" y="37" textAnchor="middle" fill="#ffffff" fontSize="4">BOHOL</text>
            <path d="M18 42q10 4 20 0" stroke="#c8952a" strokeWidth="1" strokeLinecap="round" />
        </svg>
    );
}
