import React from 'react';
import { QrCode, ShieldCheck } from 'lucide-react';

export default function DigitalIdSection() {
    return (
        <section id="digital-id" className="bg-white py-16 sm:py-20">
            <div className="mx-auto grid max-w-screen-xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-8">
                <div className="order-2 lg:order-1">
                    <DigitalIdCard />
                </div>

                <div className="order-1 lg:order-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#c8952a]">MAO Digital ID</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                        One QR-coded identity for faster beneficiary verification.
                    </h2>
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                        TARSIS issues a municipal digital ID that can be scanned by authorized MAO personnel to confirm registry details, reduce duplicate records, and support transparent release of agriculture and fishery services.
                    </p>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        <InfoTile icon={QrCode} title="QR-linked profile" copy="Scans open the public verification profile maintained by the MAO." />
                        <InfoTile icon={ShieldCheck} title="Validated records" copy="Registry numbers, barangay data, and ownership details stay consistent across services." />
                    </div>
                </div>
            </div>
        </section>
    );
}

function InfoTile({ icon: Icon, title, copy }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <Icon className="h-5 w-5 text-[#1a4731]" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-bold text-slate-950">{title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p>
        </div>
    );
}

function DigitalIdCard() {
    return (
        <div className="mx-auto w-full max-w-2xl rounded-lg border border-[#d8eadf] bg-[#f0f6f2] p-4 shadow-xl shadow-slate-950/10">
            <img
                src="/images/tarsis-digital-id-card.png"
                alt="TARSIS digital ID card for farmers and fishers"
                className="block w-full rounded-lg border border-[#1a4731]/15 bg-white object-cover"
            />
        </div>
    );
}
