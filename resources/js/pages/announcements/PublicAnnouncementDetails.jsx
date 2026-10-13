import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Info, MapPin, Megaphone, MessageCircle, Reply, ThumbsDown, ThumbsUp } from 'lucide-react';
import Footer from '../../components/landing/Footer';
import Header from '../../components/landing/Header';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/format';
import { announcementStatusLabel, announcementStatusLink, normalizeAnnouncement } from '../../utils/announcements';

const tagTones = {
    Distribution: 'bg-green-100 text-green-800',
    Insurance: 'bg-violet-100 text-violet-800',
    Advisory: 'bg-red-100 text-red-800',
    Announcement: 'bg-blue-100 text-blue-800',
    Program: 'bg-yellow-100 text-yellow-800',
    Event: 'bg-blue-100 text-blue-800',
};

export default function PublicAnnouncementDetails() {
    const { id } = useParams();
    const { user } = useAuth();
    const commentsPath = `/announcements/${id}/comments${user ? '/manage' : ''}`;
    const [announcement, setAnnouncement] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const statusHref = announcementStatusLink(announcement?.type);
    const statusLabel = announcementStatusLabel(announcement?.type);

    useEffect(() => {
        setLoading(true);
        api.get(`/announcements/${id}`)
            .then((response) => setAnnouncement(normalizeAnnouncement(response.data)))
            .catch(() => setAnnouncement(null))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        api.get(commentsPath)
            .then((response) => setComments(response.data.data || []))
            .catch(() => setComments([]));
    }, [commentsPath]);

    const refreshComments = () => {
        api.get(commentsPath)
            .then((response) => setComments(response.data.data || []))
            .catch(() => setComments([]));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white text-slate-900">
                <Header />
                <main className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 lg:px-8">
                    <p className="text-sm font-semibold text-slate-500">Loading announcement...</p>
                </main>
                <Footer />
            </div>
        );
    }

    if (!announcement) {
        return (
            <div className="min-h-screen bg-white text-slate-900">
                <Header />
                <main className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 lg:px-8">
                    <Link className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#1a4731] transition hover:opacity-75" to="/">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Back to home
                    </Link>
                    <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <Megaphone className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
                        <h1 className="mt-4 text-2xl font-bold text-slate-950">Announcement not found</h1>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            The announcement may have been moved or removed from the public landing page.
                        </p>
                        <Link className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#c8952a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b68425]" to="/#announcements">
                            View latest updates
                        </Link>
                    </section>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <Header />
            <main>
                <section className="relative overflow-hidden bg-[#1a4731] text-white">
                    <img src={announcement.img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" aria-hidden="true" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(26,71,49,0.96),rgba(26,71,49,0.76),rgba(26,71,49,0.5))]" />
                    <div className="relative mx-auto max-w-screen-xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
                        <Link className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white" to="/#home">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Back to landing
                        </Link>
                        <div className="max-w-3xl">
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <span className={`rounded px-2.5 py-1 text-xs font-bold ${tagTones[announcement.tag] || 'bg-white/15 text-white'}`}>
                                    {announcement.tag}
                                </span>
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/70">
                                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                                    {announcement.date}
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{announcement.title}</h1>
                            <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">{announcement.excerpt}</p>
                        </div>
                    </div>
                </section>

                <section className="mx-auto grid max-w-screen-xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-16">
                    <article>
                        <div className="mb-8">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#c8952a]">Announcement Details</p>
                            <h2 className="text-2xl font-bold text-slate-950">What beneficiaries need to know</h2>
                        </div>

                        <div className="space-y-5 text-sm leading-7 text-slate-700 sm:text-base">
                            {announcement.body.split(/\n+/).filter(Boolean).map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </div>

                        <div className="mt-10 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Announcement type</p>
                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{announcement.tag}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Published</p>
                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{announcement.date}</p>
                            </div>
                        </div>

                        <section className="mt-10 rounded-lg border border-emerald-100 bg-emerald-50 p-5">
                            <div className="mb-4 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-[#1a4731]" aria-hidden="true" />
                                <h2 className="text-lg font-bold text-slate-950">Important Reminders</h2>
                            </div>
                            <ul className="space-y-3">
                                <li className="flex gap-3 text-sm leading-6 text-slate-700">
                                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#c8952a]" aria-hidden="true" />
                                    <span>Coordinate with the Municipal Agriculture Office or your sector office for questions about this announcement.</span>
                                </li>
                            </ul>
                        </section>

                        <CommentSection
                            announcementId={id}
                            comments={comments}
                            onChanged={refreshComments}
                        />
                    </article>

                    <aside className="lg:sticky lg:top-28 lg:self-start">
                        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
                            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#1a4731] text-white">
                                <Info className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-950">Need assistance?</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Visit the Municipal Agriculture Office or coordinate with your barangay agriculture staff for verification, reporting, and schedule questions.
                            </p>
                            <div className="mt-5 space-y-3 text-sm text-slate-700">
                                <p className="flex gap-3">
                                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#c8952a]" aria-hidden="true" />
                                    Municipal Hall Compound, Tubigon, Bohol
                                </p>
                                <p className="flex gap-3">
                                    <Megaphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#c8952a]" aria-hidden="true" />
                                    Bring your MAO Digital ID or registry number when requesting assistance.
                                </p>
                            </div>
                            <div className="mt-6 grid gap-2">
                                <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#c8952a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b68425] focus:outline-none focus:ring-2 focus:ring-[#c8952a]/30" to="/signup" state={{ from: { pathname: '/registration' } }}>
                                    Register as Beneficiary
                                </Link>
                                <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#1a4731] px-4 py-2 text-sm font-semibold text-[#1a4731] transition hover:bg-[#f0f6f2] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/25" to={statusHref}>
                                    {statusLabel}
                                </Link>
                            </div>
                        </div>
                    </aside>
                </section>
            </main>
            <Footer />
        </div>
    );
}

function CommentSection({ announcementId, comments, onChanged }) {
    const [search, setSearch] = useState('');
    const matches = (comment) => `${comment.author_name} ${comment.body}`.toLowerCase().includes(search.toLowerCase()) || comment.replies?.some(matches);
    const visible = comments.filter(matches);
    return (
        <section className="mt-10 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a4731] text-white">
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-950">Public Comments</h2>
                    <p className="text-sm text-slate-500">{comments.length} comment{comments.length === 1 ? '' : 's'}</p>
                </div>
            </div>

            <CommentForm announcementId={announcementId} onSaved={onChanged} />
            <input className="field mt-4" aria-label="Search comments by name or message" placeholder="Search comments by name or message" value={search} onChange={(event) => setSearch(event.target.value)} />

            <div className="mt-8 space-y-5">
                {visible.map((comment) => (
                    <CommentItem key={comment.id} announcementId={announcementId} comment={comment} onChanged={onChanged} />
                ))}
                {!visible.length && (
                    <p className="rounded-lg bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                        {search ? 'No matching comments.' : 'Be the first to comment on this announcement.'}
                    </p>
                )}
            </div>
        </section>
    );
}

function CommentForm({ announcementId, parentId, onSaved, onCancel, compact = false }) {
    const { user } = useAuth();
    const [authorName, setAuthorName] = useState('');
    const [body, setBody] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            await api.post(`/announcements/${announcementId}/comments${user ? '/authenticated' : ''}`, {
                author_name: user?.name || authorName,
                body,
                parent_id: parentId,
            });
            setAuthorName('');
            setBody('');
            onSaved();
            onCancel?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className={compact ? 'space-y-3' : 'rounded-lg bg-slate-50 p-4'} onSubmit={handleSubmit}>
            <div className="grid gap-3">
                <input
                    className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-[#1a4731] focus:ring-2 focus:ring-[#1a4731]/15"
                    value={user?.name || authorName}
                    readOnly={Boolean(user)}
                    aria-label="Your name"
                    onChange={(event) => setAuthorName(event.target.value)}
                    placeholder="Your name"
                    maxLength={80}
                    required
                />
                <textarea
                    className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#1a4731] focus:ring-2 focus:ring-[#1a4731]/15"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={parentId ? 'Write a reply...' : 'Write a public comment...'}
                    aria-label={parentId ? 'Reply message' : 'Comment message'}
                    maxLength={1000}
                    required
                />
            </div>
            {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
                {onCancel && (
                    <button type="button" className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100" onClick={onCancel}>
                        Cancel
                    </button>
                )}
                <button type="submit" className="inline-flex min-h-10 items-center rounded-lg bg-[#c8952a] px-4 text-sm font-semibold text-white transition hover:bg-[#b68425] disabled:cursor-not-allowed disabled:opacity-60" disabled={saving}>
                    {saving ? 'Posting...' : parentId ? 'Post Reply' : 'Post Comment'}
                </button>
            </div>
        </form>
    );
}

function CommentItem({ announcementId, comment, onChanged }) {
    const { user } = useAuth();
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState('');
    const unavailable = comment.hidden || comment.removed;
    async function manage(action) {
        let body;
        let reason;
        if (action === 'edit') { body = window.prompt('Edit your comment', comment.body); if (!body?.trim()) return; }
        if (action === 'hide' || action === 'report') { reason = window.prompt(action === 'hide' ? 'Reason for hiding this comment' : 'Reason for reporting this comment'); if (!reason?.trim()) return; }
        if (action === 'delete' && !window.confirm('Delete your comment?')) return;
        setBusy(true);
        setFeedback('');
        try {
            const response = await api.post(`/announcements/${announcementId}/comments/${comment.id}/manage`, { action, body, reason });
            setFeedback(response.data.message);
            onChanged();
        } catch (error) { setFeedback(error.message || 'Unable to update comment.'); }
        finally { setBusy(false); }
    }
    const [replying, setReplying] = useState(false);
    const createdAt = comment.created_at ? formatDate(comment.created_at) : '';

    const react = async (reaction) => {
        setBusy(true);
        try { await api.post(`/announcements/${announcementId}/comments/${comment.id}/react`, { reaction }); onChanged(); }
        catch (error) { setFeedback(error.message || 'Unable to react.'); }
        finally { setBusy(false); }
    };

    return (
        <article className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-slate-950">{comment.author_name}</h3>
                    {comment.official && <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">MAO Staff · Official</span>}
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{createdAt}</p>
                </div>
                <div className="flex items-center gap-1" inert={busy || unavailable ? true : undefined}>
                    <button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-[#1a4731]" onClick={() => react('like')}>
                        <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                        {comment.likes_count || 0}
                    </button>
                    <button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-700" onClick={() => react('dislike')}>
                        <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                        {comment.dislikes_count || 0}
                    </button>
                </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{comment.body}</p>
            <div className="mt-2 flex flex-wrap gap-2">
                {comment.can_edit && <><button className="mini-btn" type="button" disabled={busy} onClick={() => manage('edit')}>Edit</button><button className="mini-btn text-red-700" type="button" disabled={busy} onClick={() => manage('delete')}>Delete</button></>}
                {comment.can_moderate && <button className="mini-btn" type="button" disabled={busy} onClick={() => manage(comment.hidden ? 'restore' : 'hide')}>{comment.hidden ? 'Restore comment' : 'Hide comment'}</button>}
                {user && !unavailable && <button className="mini-btn" type="button" disabled={busy} onClick={() => manage('report')}>Report comment</button>}
            </div>
            {feedback && <p role="status" className="mt-2 text-sm">{feedback}</p>}
            <button type="button" disabled={unavailable || busy} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg text-sm font-semibold text-[#1a4731] transition hover:opacity-75 disabled:opacity-50" onClick={() => setReplying((open) => !open)}>
                <Reply className="h-4 w-4" aria-hidden="true" />
                Reply
            </button>
            {replying && (
                <div className="mt-3 border-l-2 border-[#c8952a]/40 pl-4">
                    <CommentForm announcementId={announcementId} parentId={comment.id} onSaved={onChanged} onCancel={() => setReplying(false)} compact />
                </div>
            )}
            {!!comment.replies?.length && (
                <div className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4">
                    {comment.replies.map((reply) => (
                        <CommentItem key={reply.id} announcementId={announcementId} comment={reply} onChanged={onChanged} />
                    ))}
                </div>
            )}
        </article>
    );
}
