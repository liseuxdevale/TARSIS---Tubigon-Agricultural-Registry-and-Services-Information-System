import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformSync } from 'rolldown/experimental';

const source = readFileSync(new URL('../resources/js/pages/announcements/AnnouncementManagement.jsx', import.meta.url), 'utf8');
const cardSource = source.slice(source.indexOf('function AnnouncementCard('), source.indexOf('function AnnouncementDialog('));
const cardCode = transformSync('card.jsx', cardSource, { jsx: { runtime: 'classic' } }).code;
const Card = new Function('React', 'ImageOff', `${cardCode}; return AnnouncementCard;`)(React, () => null);

test('photo cards hide announcement metadata and expose responsive, keyboard-accessible actions', () => {
    const row = { id: 1, title: 'Office advisory', body: 'Secret card text', image_url: '/storage/test.jpg', publish_at: '2026-10-12' };
    const html = renderToStaticMarkup(Card({ row, onOpen() {}, onShare() {} }));
    assert.ok(html.includes('aspect-[4/3]'));
    assert.ok(html.includes('View announcement: Office advisory'));
    assert.ok(html.includes('Share to Facebook'));
    assert.ok(!html.includes('Secret card text'));
    assert.ok(!html.includes('2026-10-12'));
    assert.ok(html.includes('>Office advisory</h3>'));
    assert.ok(source.includes('md:grid-cols-2 xl:grid-cols-3'));
});

test('photo click opens details and Facebook button does not open details', () => {
    const row = { id: 1, title: 'Advisory' };
    const opened = [], shared = [];
    const element = Card({ row, onOpen: (item) => opened.push(item), onShare: (item) => shared.push(item) });
    let stopped = 0;
    element.props.children[0].props.onClick({ stopPropagation() { stopped++; } });
    assert.deepEqual(opened, [row]);
    element.props.children[1].props.children[0].props.onClick({ stopPropagation() { stopped++; } });
    assert.deepEqual(shared, [row]);
    assert.equal(opened.length, 1);
    assert.equal(stopped, 2);
});

const shareCode = source.slice(source.indexOf('    function share(row)'), source.indexOf('    const filteredRows'));
function sharing(host, popup) {
    const messages = [], links = [];
    const window = { location: { hostname: host, origin: `https://${host}` }, open: (...args) => { links.push(args); return popup; } };
    const share = new Function('window', 'setError', 'setNotice', `${shareCode}; return share;`)(window, (value) => messages.push(value), (value) => messages.push(value));
    share({ id: 12 });
    return { messages, links };
}
test('sharing blocks localhost and reports blocked popups without publication claims', () => {
    const local = sharing('127.0.0.1', {});
    assert.equal(local.links.length, 0);
    assert.ok(local.messages.at(-1).includes('public HTTPS'));
    assert.ok(sharing('tarsis.example', null).messages.at(-1).includes('blocked'));
});
test('sharing uses the announcement public URL, detaches opener, and reports unconfirmed outcome', () => {
    const popup = {};
    const result = sharing('tarsis.example', popup);
    assert.equal(new URL(result.links[0][0]).searchParams.get('u'), 'https://tarsis.example/announcements/12');
    assert.equal(popup.opener, null);
    assert.ok(result.messages.at(-1).includes('cannot verify'));
});

test('delete requires confirmation, refreshes data, and surfaces failures', async () => {
    const code = source.slice(source.indexOf('    async function remove(row)'), source.indexOf('    function share(row)'));
    const calls = [], errors = [];
    let confirmed = false, fail = false;
    const remove = new Function('window', 'api', 'load', 'setDeleting', 'setError', 'setDetails', 'setNotice', `${code}; return remove;`)(
        { confirm: () => confirmed }, { delete: async (url) => { if (fail) throw Error('Failed'); calls.push(url); } },
        async () => calls.push('refresh'), () => {}, (value) => errors.push(value), () => {}, () => {},
    );
    await remove({ id: 7 });
    assert.equal(calls.length, 0);
    confirmed = true;
    await remove({ id: 7 });
    assert.deepEqual(calls, ['/announcements/7', 'refresh']);
    fail = true;
    await remove({ id: 7 });
    assert.ok(errors.at(-1).includes('Unable to delete'));
});

test('edit saves populated data through the existing endpoint and handles errors', async () => {
    const code = source.slice(source.indexOf('    async function submit(event)'), source.indexOf('    return (', source.indexOf('    async function submit(event)')));
    const calls = [], errors = [];
    const form = { title: 'Current title', body: 'Full message', send_push: true, target_sectors: ['farmer'], photo: null };
    let fail = false;
    const submit = new Function('busy', 'setBusy', 'setError', 'form', 'editing', 'row', 'api', 'onSaved', 'onClose', `${code}; return submit;`)(
        false, () => {}, (value) => errors.push(value), form, true, { id: 7 },
        { post: async (url, payload) => { if (fail) throw Error('Failed'); calls.push([url, Object.fromEntries(payload)]); } },
        async () => calls.push('saved'), () => calls.push('closed'),
    );
    await submit({ preventDefault() {} });
    assert.equal(calls[0][0], '/announcements/7');
    assert.equal(calls[0][1].title, 'Current title');
    assert.equal(calls[0][1]._method, 'PUT');
    assert.deepEqual(calls.slice(1), ['saved', 'closed']);
    fail = true;
    await submit({ preventDefault() {} });
    assert.ok(errors.at(-1).includes('Unable to save'));
});
