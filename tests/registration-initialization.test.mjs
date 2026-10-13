import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../resources/js/pages/registration/Register.jsx', import.meta.url), 'utf8');
const defaults = source.slice(source.indexOf('const educationOptions'), source.indexOf('export default function Register'));
const helpers = source.slice(source.indexOf('function normalizeForm('));
const livelihood = source.slice(source.indexOf('function selectedMainLivelihoods('), source.indexOf('function parcelFromRegistrant('));
const ownership = source.slice(source.indexOf('function ownershipForForm('), source.indexOf('function findMatchingRegistrant('));
const { initialForm, normalizeForm } = new Function(`${defaults}\n${helpers}\n${livelihood}\n${ownership}\nreturn { initialForm, normalizeForm };`)();
const loadEffect = source.slice(source.indexOf('    useEffect(() => {'), source.indexOf('    useEffect(() => {\n        setBarangaysLoading'));

function loadAccount(user, storage) {
    let form;
    let loadedKey;
    new Function('useEffect', 'user', 'isStaff', 'draftKey', 'localStorage', 'initialForm', 'normalizeForm', 'setForm', 'setLoadedDraftKey', loadEffect)(
        (callback) => callback(), user, false, `rsbsa-registration-draft:${user.id}`, storage,
        initialForm, normalizeForm, (next) => { form = next; }, (key) => { loadedKey = key; },
    );
    assert.equal(loadedKey, `rsbsa-registration-draft:${user.id}`);
    return form;
}

test('a new account ignores shared and other-account drafts and starts with signup details', () => {
    const entries = new Map([
        ['rsbsa-registration-draft', JSON.stringify({ middle_name: 'Previous', birthday: '1990-01-01' })],
        ['rsbsa-registration-draft:1', JSON.stringify({ address_line: 'Previous address' })],
    ]);
    const form = loadAccount({ id: 2, name: 'Maria Dela Cruz', email: 'maria@example.com', phone: '09123456789' }, {
        getItem: (key) => entries.get(key), removeItem: (key) => entries.delete(key),
    });
    assert.equal(form.first_name, 'Maria');
    assert.equal(form.last_name, 'Dela Cruz');
    assert.equal(form.email, 'maria@example.com');
    assert.equal(form.phone, '09123456789');
    for (const [key, value] of Object.entries(form)) {
        if (['first_name', 'last_name', 'email', 'phone', 'enrollment_type', 'date_administered', 'rotation_farmers', 'parcels'].includes(key)) continue;
        assert.deepEqual(value, Array.isArray(value) ? [] : '', key);
    }
    assert.deepEqual(form.rotation_farmers, ['', '', '']);
    for (const [key, value] of Object.entries(form.parcels[0])) {
        if (key === 'commodities') {
            assert.ok(value.every((row) => Object.values(row).every((field) => field === '')));
        } else assert.equal(value, '', key);
    }
});

test('an account can resume its own draft, preserving blank answers', () => {
    const form = loadAccount({ id: 3, name: 'Juan Cruz', email: 'juan@example.com', phone: '09987654321' }, {
        getItem: () => JSON.stringify({ address_line: '123', main_livelihood: ['Fisherfolk'], household_head: '', parcels: [{ ownership_type: '', ancestral_domain: '' }] }),
        removeItem() {},
    });
    assert.equal(form.address_line, '123');
    assert.deepEqual(form.main_livelihood, ['Fisherfolk']);
    assert.equal(form.household_head, '');
    assert.equal(form.parcels[0].ownership_type, '');
    assert.equal(form.parcels[0].ancestral_domain, '');
});

test('an invalid account draft falls back to signup details', () => {
    let removed;
    const form = loadAccount({ id: 4, name: 'Ana Cruz', email: 'ana@example.com', phone: '09123456789' }, {
        getItem: () => 'invalid json', removeItem: (key) => { removed = key; },
    });
    assert.equal(removed, 'rsbsa-registration-draft:4');
    assert.equal(form.first_name, 'Ana');
    assert.equal(form.address_line, '');
});

test('signup name parts populate the matching RSBSA fields without splitting compound names', () => {
    const form = loadAccount({ id: 5, name: 'Juan Carlo Santos Dela Cruz', first_name: 'Juan Carlo', middle_name: 'Santos', last_name: 'Dela Cruz' }, {
        getItem: () => null, removeItem() {},
    });
    assert.equal(form.first_name, 'Juan Carlo');
    assert.equal(form.middle_name, 'Santos');
    assert.equal(form.last_name, 'Dela Cruz');
});

test('date administered uses today’s local date even when restoring an older draft', () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    assert.equal(initialForm.date_administered, expected);
    assert.equal(normalizeForm({ date_administered: '' }).date_administered, expected);
    assert.equal(normalizeForm({ date_administered: '2020-01-01' }).date_administered, expected);
});
