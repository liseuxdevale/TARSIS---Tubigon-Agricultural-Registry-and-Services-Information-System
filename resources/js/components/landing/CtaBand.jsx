import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const points = ['RSBSA-aligned registration', 'Digital ID verification', 'MAO program updates'];

export default function CtaBand() {
    return (
        <section className="bg-[#1a4731] py-12 text-white sm:py-14">
            <div className="mx-auto flex max-w-screen-xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#f1c35f]">Ready to Register with TARSIS?</p>
                    <h2 className="text-2xl font-bold leading-tight sm:text-3xl">Create your MAO beneficiary record online.</h2>
                    <div className="mt-5 flex flex-wrap gap-3">
                        {points.map((point) => (
                            <span key={point} className="inline-flex items-center gap-2 rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white/85">
                                <CheckCircle2 className="h-4 w-4 text-[#f1c35f]" aria-hidden="true" />
                                {point}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                    <Link
                        to="/signup"
                        state={{ from: { pathname: '/registration' } }}
                        className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#c8952a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b68425] focus:outline-none focus:ring-2 focus:ring-[#f1c35f]/40"
                    >
                        Register Now <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link
                        to="/track/assistance"
                        className="inline-flex min-h-12 items-center rounded-lg border border-white/45 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                    >
                        Log in to TARSIS
                    </Link>
                </div>
            </div>
        </section>
    );
}
