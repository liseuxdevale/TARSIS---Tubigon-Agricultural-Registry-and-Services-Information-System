import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Database, ExternalLink, ShieldCheck, UsersRound } from 'lucide-react';
import Footer from '../components/landing/Footer';
import Header from '../components/landing/Header';
import MaoSeal from '../components/landing/MaoSeal';
import {
    aboutDetails,
    aboutMetrics,
    aboutSources,
    agricultureOfficeTeam,
    leadershipTeam,
    officeContacts,
} from '../data/aboutTarsis';

const processSteps = [
    'Beneficiaries submit or update agriculture and fishery records.',
    'MAO personnel validate details against local requirements and RSBSA-aligned data.',
    'Approved records support digital IDs, assistance tracking, insurance coordination, and advisories.',
];

export default function AboutTarsis() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header />
            <main id="main-content">
                <section className="relative overflow-hidden bg-[#153a2a] text-white">
                    <img
                        src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1600&h=900&fit=crop&auto=format"
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-20"
                        aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,58,42,0.98),rgba(21,58,42,0.74))]" />
                    <div className="relative mx-auto grid max-w-screen-xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.72fr] lg:items-center lg:px-8">
                        <div>
                            <Link
                                to="/#about"
                                className="mb-8 inline-flex items-center gap-2 rounded-md text-sm font-semibold text-white/80 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                            >
                                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                Back to landing
                            </Link>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d6a63a]">About TARSIS</p>
                            <h1 className="mt-4 max-w-3xl break-words text-3xl font-extrabold leading-tight sm:text-5xl">
                                More information about Tubigon Agricultural Registry and Services Information System
                            </h1>
                            <p className="mt-5 max-w-3xl text-base leading-8 text-white/78 sm:text-lg">
                                TARSIS is the digital registry and service coordination platform for the Municipal Agriculture Office of Tubigon, Bohol. It brings beneficiary records, validation workflows, digital ID support, advisories, assistance tracking, and insurance coordination into one public-facing system.
                            </p>
                        </div>

                        <div className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur">
                            <div className="flex items-center gap-4 border-b border-white/15 pb-5">
                                <MaoSeal size={58} className="shrink-0" />
                                <div>
                                    <p className="text-sm font-bold">Municipal Agriculture Office</p>
                                    <p className="text-xs leading-5 text-white/65">Tubigon, Bohol</p>
                                </div>
                            </div>
                            <div className="mt-5 grid gap-3">
                                {officeContacts.map((item) => (
                                    <div key={item.label} className="rounded-md bg-white/10 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#d6a63a]">{item.label}</p>
                                        <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white py-14">
                    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-4 sm:grid-cols-3">
                            {aboutMetrics.map((item) => (
                                <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-3xl font-extrabold text-[#1a4731]">{item.value}</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-600">{item.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 grid gap-5 lg:grid-cols-3">
                            {aboutDetails.map((item) => (
                                <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
                                    <BadgeCheck className="h-6 w-6 text-[#c8952a]" aria-hidden="true" />
                                    <h2 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h2>
                                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.copy}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="bg-[#f4f8f6] py-14">
                    <div className="mx-auto grid max-w-screen-xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:px-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c8952a]">How it supports MAO</p>
                            <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">A clearer service path from registration to release.</h2>
                            <p className="mt-4 text-sm leading-7 text-slate-600">
                                The official LGU site describes local offices as the operational arms that deliver services and implement policies for community welfare. TARSIS supports that mandate by giving the agriculture office a cleaner way to validate people, locations, programs, and records.
                            </p>
                        </div>
                        <div className="grid gap-3">
                            {processSteps.map((step, index) => (
                                <div key={step} className="flex gap-4 rounded-lg border border-[#d8eadf] bg-white p-4">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a4731] text-sm font-bold text-white">
                                        {index + 1}
                                    </span>
                                    <p className="pt-1 text-sm leading-6 text-slate-600">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="bg-white py-14">
                    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c8952a]">Admins and Staff</p>
                                <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">Agriculture service team</h2>
                            </div>
                            <p className="max-w-2xl text-sm leading-6 text-slate-600">
                                Municipal leadership is shown from the official Tubigon page. The agriculture-office staff roster is prepared here for the exact names and photos once the public MAO listing is available.
                            </p>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Municipal Administrators</h3>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {leadershipTeam.map((person) => (
                                    <TeamCard key={person.name} person={person} />
                                ))}
                            </div>
                        </div>

                        <div className="mt-10">
                            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">MAO Staff Directory</h3>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {agricultureOfficeTeam.map((person) => (
                                    <TeamCard key={person.position} person={person} />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-950 py-12 text-white">
                    <div className="mx-auto grid max-w-screen-xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d6a63a]">References</p>
                            <h2 className="mt-3 text-2xl font-bold">Official source links</h2>
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                                The page keeps direct links to the TARSIS Facebook profile and Tubigon LGU references so staff details can be reconciled against official public sources.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <SourceLink href={aboutSources.facebook} label="TARSIS Facebook" />
                            <SourceLink href={aboutSources.offices} label="Offices and Functions" />
                            <SourceLink href={aboutSources.municipalOfficials} label="Municipal Officials" />
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

function TeamCard({ person }) {
    return (
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
            <div className="aspect-[4/3] bg-slate-100">
                {person.photo ? (
                    <img src={person.photo} alt={person.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#edf5f1] text-[#1a4731]">
                        <UsersRound className="h-10 w-10" aria-hidden="true" />
                    </div>
                )}
            </div>
            <div className="p-4">
                <div className="mb-3 flex items-center gap-2 text-[#1a4731]">
                    {person.pending ? <Database className="h-4 w-4" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                    <span className="text-[11px] font-bold uppercase tracking-wide">{person.pending ? 'Pending official roster' : 'Official listing'}</span>
                </div>
                <h3 className="text-sm font-extrabold leading-6 text-slate-950">{person.name}</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{person.position}</p>
            </div>
        </article>
    );
}

function SourceLink({ href, label }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#d6a63a] hover:text-[#d6a63a] focus:outline-none focus:ring-2 focus:ring-[#d6a63a]/40"
        >
            {label}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
    );
}
