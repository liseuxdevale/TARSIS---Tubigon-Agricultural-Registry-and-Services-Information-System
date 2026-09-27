import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, MessageSquare, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { EmptyState, PageLoader, StatusBadge } from '../../components/common';
import { useResource } from '../../hooks/useResource';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';
import { normalizeAnnouncement } from '../../utils/announcements';

const feedbackDefaults = { reaction: '', comments: [] };

export default function AdvisoryDetails() {
    const { id } = useParams();
    const { data, loading, error } = useResource(() => api.get(`/announcements/${id}`).then((response) => response.data), [id]);
    const announcement = useMemo(() => data ? normalizeAnnouncement(data) : null, [data]);

    if (loading) return <PageLoader />;
    if (error) return <EmptyState title="Announcement unavailable" detail={error} />;

    return (
        <section className="space-y-6">
            <article className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm shadow-emerald-950/10">
                <div className="relative min-h-[320px] overflow-hidden bg-emerald-950 text-white">
                    <img src={announcement.img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-950/80 to-emerald-900/35" />
                    <div className="relative flex min-h-[320px] flex-col justify-end px-6 py-8 sm:px-8 lg:px-10">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <StatusBadge status={data.type} />
                            <span className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                                <CalendarDays className="h-4 w-4" />
                                {formatDate(data.publish_at || data.created_at)}
                            </span>
                        </div>
                        <h1 className="max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{data.title}</h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">{data.body}</p>
                    </div>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Announcement Details</p>
                        <h2 className="mt-3 text-2xl font-black text-slate-950">What beneficiaries need to know</h2>
                        <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
                            {data.body.split(/\n+/).filter(Boolean).map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </div>
                    </div>

                    <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                        <dl className="grid gap-4 text-sm">
                            <Meta label="Publish" value={formatDate(data.publish_at)} />
                            <Meta label="Expires" value={formatDate(data.expires_at)} />
                            <Meta label="Push" value={data.send_push ? 'Enabled' : 'Disabled'} />
                            <Meta label="Facebook" value={data.facebook_post_id || (data.publish_to_facebook ? 'Queued' : 'Disabled')} />
                        </dl>
                    </aside>
                </div>
            </article>

            <AnnouncementFeedback announcementId={data.id} />
        </section>
    );
}

function Meta({ label, value }) {
    return (
        <div>
            <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 font-bold text-slate-900">{value || 'Not set'}</dd>
        </div>
    );
}

function AnnouncementFeedback({ announcementId }) {
    const storageKey = `tarsis-announcement-feedback-${announcementId}`;
    const [feedback, setFeedback] = useState(feedbackDefaults);
    const [comment, setComment] = useState('');
    const [replyDrafts, setReplyDrafts] = useState({});

    useEffect(() => {
        try {
            setFeedback({ ...feedbackDefaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') });
        } catch {
            setFeedback(feedbackDefaults);
        }
    }, [storageKey]);

    function persist(next) {
        setFeedback(next);
        localStorage.setItem(storageKey, JSON.stringify(next));
    }

    function react(reaction) {
        persist({ ...feedback, reaction: feedback.reaction === reaction ? '' : reaction });
    }

    function addComment(event) {
        event.preventDefault();
        const text = comment.trim();
        if (! text) return;
        persist({
            ...feedback,
            comments: [{ id: crypto.randomUUID(), text, createdAt: new Date().toISOString(), replies: [] }, ...feedback.comments],
        });
        setComment('');
    }

    function addReply(commentId) {
        const text = (replyDrafts[commentId] || '').trim();
        if (! text) return;
        persist({
            ...feedback,
            comments: feedback.comments.map((item) => item.id === commentId
                ? { ...item, replies: [...item.replies, { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }] }
                : item),
        });
        setReplyDrafts({ ...replyDrafts, [commentId]: '' });
    }

    return (
        <section className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-950/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Community Feedback</p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">Reactions and comments</h2>
                </div>
                <div className="flex gap-2">
                    <button type="button" className={reactionClass(feedback.reaction === 'like')} onClick={() => react('like')}>
                        <ThumbsUp className="h-4 w-4" /> Like
                    </button>
                    <button type="button" className={reactionClass(feedback.reaction === 'dislike')} onClick={() => react('dislike')}>
                        <ThumbsDown className="h-4 w-4" /> Dislike
                    </button>
                </div>
            </div>

            <form className="mt-5 flex gap-3" onSubmit={addComment}>
                <input className="field" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment or question..." />
                <button className="btn-primary shrink-0" type="submit"><Send className="h-4 w-4" /> Post</button>
            </form>

            <div className="mt-6 space-y-4">
                {! feedback.comments.length && (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                        <MessageSquare className="mb-2 h-5 w-5" /> No comments yet.
                    </div>
                )}
                {feedback.comments.map((item) => (
                    <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold leading-6 text-slate-900">{item.text}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{formatDate(item.createdAt)}</p>
                        <div className="mt-3 space-y-2">
                            {item.replies.map((reply) => (
                                <div key={reply.id} className="ml-4 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                    <p className="text-sm text-slate-700">{reply.text}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">{formatDate(reply.createdAt)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                            <input className="field" value={replyDrafts[item.id] || ''} onChange={(event) => setReplyDrafts({ ...replyDrafts, [item.id]: event.target.value })} placeholder="Reply..." />
                            <button type="button" className="btn-secondary shrink-0" onClick={() => addReply(item.id)}>Reply</button>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

function reactionClass(active) {
    return [
        'inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition',
        active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50',
    ].join(' ');
}
