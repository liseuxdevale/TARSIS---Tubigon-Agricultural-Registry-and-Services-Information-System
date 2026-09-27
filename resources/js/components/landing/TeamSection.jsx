import React from 'react';
import { ShieldCheck, UsersRound } from 'lucide-react';
import { agricultureOfficeTeam, leadershipTeam } from '../../data/aboutTarsis';

export default function TeamSection() {
    const people = [...leadershipTeam, ...agricultureOfficeTeam];

    return (
        <section id="team" className="bg-[#f3f7f5] py-16 sm:py-20">
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c8952a]">Municipal Agriculture Office</p>
                    <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">Heads and staff</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-600">Municipal leadership and the service roles supporting agriculture registration, field coordination, and beneficiary assistance.</p>
                </div>
                <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    {people.map((person) => (
                        <article key={`${person.name}-${person.position}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-200 ease-out hover:scale-105 hover:shadow-lg">
                            <div className="aspect-[4/3] bg-[#e5efe9]">
                                {person.photo ? (
                                    <img src={person.photo} alt={person.name} className="h-full w-full object-cover" loading="lazy" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-[#1a4731]"><UsersRound className="h-9 w-9" aria-hidden="true" /></div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#1a4731]">
                                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                    {person.pending ? 'Roster to be confirmed' : 'Official listing'}
                                </div>
                                <h3 className="text-sm font-extrabold leading-5 text-slate-950">{person.name}</h3>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{person.position}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
