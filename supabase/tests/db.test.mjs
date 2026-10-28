// npm run test:db
// Valida las migraciones y el seed en un Postgres local (PGlite + PostGIS) imitando el entorno de Supabase.
import { PGlite } from '@electric-sql/pglite';
import { postgis } from '@electric-sql/pglite-postgis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrations = fs.readdirSync(path.join(dir, 'migrations')).sort().map((f) => fs.readFileSync(path.join(dir, 'migrations', f), 'utf8'));
const seed = fs.readFileSync(path.join(dir, 'seed.sql'), 'utf8');
const db = new PGlite({ extensions: { postgis } });
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK  ' : 'FAIL') + ' ' + msg); if (!cond) fails++; };
const q = async (sql, params) => (await db.query(sql, params)).rows;
const as = async (uid, fn) => {
  await db.exec(uid ? `set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false);` : `set role anon; select set_config('request.jwt.claim.sub','',false);`);
  try { return await fn(); } finally { await db.exec('reset role;'); }
};
const err = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

// Entorno tipo Supabase
await db.exec(`
  create schema extensions;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public, extensions, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);

for (const m of migrations) await db.exec(m);
console.log(`${migrations.length} migración(es) aplicada(s)`);
await db.exec(seed); console.log('seed aplicado');

const [{ n }] = await q(`select count(*)::int n from restaurants where status='approved' and location is not null`);
ok(n === 28, `seed: 28 aprobados con location generada (${n})`);

const mk = async (name) => (await q(`insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('username',$2::text)) returning id`, [name + '@x.com', name]))[0].id;
const alice = await mk('alice'), bob = await mk('bobby'), admin = await mk('admin1');
ok((await q(`select count(*)::int n from profiles`))[0].n === 3, 'trigger crea perfiles al registrarse');
ok((await q(`select username_available('ALICE') a`))[0].a === false, 'username_available ignora mayúsculas');

ok((await as(null, () => q(`select count(*)::int n from restaurants`)))[0].n === 28, 'anónimo ve solo aprobados');
ok(!!(await err(() => as(null, () => q(`insert into restaurants (name,category,menu_url,latitude,longitude) values ('X','bar','https://x.com',-34.6,-58.4)`)))), 'anónimo no puede insertar');

const ins = (uid, url, extra = '') => as(uid, () => q(`insert into restaurants (name,category,menu_url,latitude,longitude${extra ? ',status,submitted_by' : ''}) values ('Lugar','bar',$1,-34.6,-58.4${extra}) returning *`, [url]));
const [r1] = await ins(alice, 'https://alice.com/menu', `,'approved','${bob}'`);
ok(r1.status === 'pending' && r1.submitted_by === alice, 'insert fuerza pending y autor aunque el cliente mande otra cosa');

ok((await as(bob, () => q(`select count(*)::int n from restaurants where id=$1`, [r1.id])))[0].n === 0, 'otro usuario no ve el pendiente ajeno');
ok((await as(null, () => q(`select count(*)::int n from restaurants where id=$1`, [r1.id])))[0].n === 0, 'anónimo no ve pendientes');
ok((await as(alice, () => q(`select count(*)::int n from restaurants where id=$1`, [r1.id])))[0].n === 1, 'el autor ve su pendiente');

await as(alice, () => q(`update restaurants set status='approved', name='Lugar editado' where id=$1`, [r1.id]));
const [after] = await q(`select status,name from restaurants where id=$1`, [r1.id]);
ok(after.status === 'pending' && after.name === 'Lugar editado', 'el autor puede editar pero no auto-aprobarse');

ok(!!(await err(() => as(alice, () => q(`select review_restaurant($1,'approved')`, [r1.id])))), 'usuario común no puede usar review_restaurant');
ok((await as(bob, () => q(`delete from restaurants where id=$1 returning id`, [r1.id]))).length === 0, 'otro usuario no puede borrar el aporte');

await q(`update profiles set role='admin' where id=$1`, [admin]);
ok((await as(admin, () => q(`select count(*)::int n from restaurants where status='pending'`)))[0].n === 1, 'admin ve la cola de pendientes');
await as(admin, () => q(`select review_restaurant($1,'approved','')`, [r1.id]));
const [rev] = await q(`select status, reviewed_by, review_note from restaurants where id=$1`, [r1.id]);
ok(rev.status === 'approved' && rev.reviewed_by === admin && rev.review_note === null, 'admin aprueba con review_restaurant');
ok((await q(`select points from profiles where id=$1`, [alice]))[0].points === 10, 'aprobar suma 10 puntos al autor');
ok((await as(alice, () => q(`delete from restaurants where id=$1 returning id`, [r1.id]))).length === 0, 'el autor no puede borrar un aporte ya aprobado');

const dup = await err(() => ins(bob, 'https://ALICE.com/menu'));
ok(dup?.code === '23505', `menu_url duplicado (sin importar mayúsculas) se rechaza (${dup?.code})`);

const [r2] = await ins(bob, 'https://bob.com/1');
await as(admin, () => q(`select review_restaurant($1,'rejected','link roto')`, [r2.id]));
ok((await q(`select status, review_note from restaurants where id=$1`, [r2.id]))[0].review_note === 'link roto', 'rechazo guarda el motivo');
const [r3] = await ins(bob, 'https://bob.com/1');
ok(!!r3, 'un link rechazado se puede volver a enviar');
ok((await as(bob, () => q(`delete from restaurants where id=$1 returning id`, [r3.id]))).length === 1, 'el autor puede retirar su pendiente');

const [ra] = await ins(admin, 'https://admin.com/menu');
ok(ra.status === 'approved', 'aporte de admin se publica directo');

for (let i = 0; i < 9; i++) await ins(bob, `https://spam.com/${i}`);
const spam = await err(() => ins(bob, 'https://spam.com/10'));
ok(/límite/.test(spam?.message ?? ''), `límite de 10 aportes por día (${spam?.message})`);

const near = await as(null, () => q(`select name from restaurants_nearby(-34.6037, -58.3816, 1500)`));
ok(near.length > 0 && near.length < 28, `restaurants_nearby devuelve los cercanos (${near.length}: ${near.slice(0, 3).map((r) => r.name).join(', ')}…)`);

const bad = await err(() => ins(alice, 'javascript:alert(1)'));
ok(bad?.code === '23514', 'menu_url que no es http(s) se rechaza');

// ── Notas de admin ──
const addNote = (uid, body) => as(uid, () => q(`insert into admin_notes (body) values ($1) returning *`, [body]));
ok((await as(null, () => q(`select count(*)::int n from admin_notes`)))[0].n === 0, 'anónimo no ve notas');
ok(!!(await err(() => addNote(alice, 'idea de alice'))), 'usuario común no puede crear notas');
const [note] = await addNote(admin, 'Sumar modo admin');
ok(note.created_by === admin && note.done === false, 'admin crea nota con autor automático');
ok((await as(alice, () => q(`select count(*)::int n from admin_notes`)))[0].n === 0, 'usuario común no ve notas');
ok((await as(alice, () => q(`update admin_notes set done = true where id = $1 returning id`, [note.id]))).length === 0, 'usuario común no puede editar notas');
await as(admin, () => q(`update admin_notes set done = true where id = $1`, [note.id]));
ok((await q(`select done from admin_notes where id = $1`, [note.id]))[0].done === true, 'admin marca nota como hecha');
ok(!!(await err(() => as(admin, () => q(`insert into admin_notes (body, created_by) values ('x', $1)`, [alice])))), 'no se puede crear una nota a nombre de otro');
ok(!!(await err(() => addNote(admin, '   '))), 'nota vacía se rechaza');
ok((await as(admin, () => q(`delete from admin_notes where id = $1 returning id`, [note.id]))).length === 1, 'admin borra nota');

console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
process.exit(fails ? 1 : 0);
