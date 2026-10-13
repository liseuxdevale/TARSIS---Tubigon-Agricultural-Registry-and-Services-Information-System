import React from 'react';

const LOGO_SRC = '/images/tarsis-official-logo.jpg';

export default function MaoSeal({ size = 56, className = '', variant = 'default' }) {
    const toneClass = variant === 'dark'
        ? 'border-white/20 bg-white/10'
        : 'border-[#1a4731]/15 bg-white';

    return (
        <img
            src={LOGO_SRC}
            width={size}
            height={size}
            className={`inline-block rounded-full border object-cover shadow-sm ${toneClass} ${className}`.trim()}
            alt="Office of the Municipal Agriculturist Tubigon, Bohol official logo"
        />
    );
}
