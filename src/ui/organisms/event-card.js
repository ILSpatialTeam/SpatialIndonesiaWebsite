// Organisme: daftar agenda di kartu Event.
//
// Barisnya dibangun dari data, bukan ditulis tangan di template. Sumbernya
// sama dengan sudut planet Event dan papan misi — jadi tidak mungkin ada
// tanggal yang berbeda di dua tempat.
import { el } from '../atoms/el.js';
import { tanggalID as tanggal } from '../../data/panels.js';
import { saveIcs } from './hero-board.js';
import { openEvent } from './event-detail.js';

export const css = `/* -- daftar agenda di kartu Event --
   Isinya datang dari agenda-data.js, sumber yang sama dengan sudut planet
   Event dan papan misi. Saat data pindah ke API nanti, ketiganya ikut sekaligus
   karena semuanya membaca satu fungsi yang sama. */
.ag-row { position: relative; display: flex; flex-direction: column; gap: 5px; padding: 16px 0; border-top: 1px solid rgba(243,242,248,.1); }

.ag-row:last-child { border-bottom: 1px solid rgba(243,242,248,.1); }

.ag-row.past { opacity: .4; }

.ag-row.next::before {
  content: ''; position: absolute; left: -15px; top: 22px; width: 6px; height: 6px; border-radius: 50%;
  background: var(--hud-iris); box-shadow: 0 0 10px rgba(158,148,249,.95);
}

.ag-row .top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }

.ag-row .kind { font-family: 'Poppins', sans-serif; font-size: 12px; color: var(--hud-iris); }

.ag-row .when { flex: 0 0 auto; font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .16em; color: var(--hud-dim); }

.ag-row.next .when { color: var(--hud-mint); }

.ag-row .ttl { font-size: 17px; font-weight: 500; line-height: 1.3; }

/* Judul jadi tombol saat acaranya punya halaman sendiri.
   Tombol, bukan seluruh barisnya yang diberi onclick: baris itu juga memuat
   tombol kalender, dan tombol di dalam tombol adalah markup yang tidak bisa
   dinavigasi dengan keyboard maupun dibacakan pembaca layar dengan benar. */
.ag-row button.ttl {
  padding: 0; border: 0; background: transparent; color: var(--hud-paper);
  font-family: inherit; font-size: 17px; font-weight: 500; line-height: 1.3;
  text-align: left; cursor: pointer; transition: color .2s;
}

.ag-row button.ttl:hover { color: var(--hud-iris); }

/* Panah muncul saat disorot — petunjuk bahwa ada isi di baliknya, tanpa
   menambah satu baris teks di setiap baris daftar. */
.ag-row button.ttl::after {
  content: ' →'; opacity: 0; transition: opacity .2s;
  font-family: var(--hud-mono); font-size: 13px;
}

.ag-row button.ttl:hover::after, .ag-row button.ttl:focus-visible::after { opacity: 1; }

.ag-row .where { font-size: 12.5px; color: var(--hud-muted); }

.ag-row .note { font-size: 12px; line-height: 1.5; color: var(--hud-dim); }

/* Keterangan kursi di daftar. Angkanya ikut cache bootstrap, jadi ia
   keterangan — bukan janji; yang mengikat adalah angka di halaman detail. */
.ag-row .seats {
  font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .16em; color: var(--hud-mint);
}

.ag-row .seats.tight { color: var(--hud-hot); }

.ag-row .seats.gone { color: var(--hud-dim); }

.ag-row .acts { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }

.ag-row .add, .ag-row .reg {
  padding: 6px 11px; border: 0; border-radius: 999px;
  background: transparent; box-shadow: inset 0 0 0 1px rgba(243,242,248,.14);
  color: var(--hud-muted); font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .16em; cursor: pointer;
  transition: color .2s, box-shadow .2s, background .2s;
}

.ag-row .add:hover { color: var(--hud-paper); box-shadow: inset 0 0 0 1px rgba(158,148,249,.6); }

/* Tombol daftar diberi isian penuh: di dalam satu daftar acara, tindakan yang
   paling mungkin diinginkan orang harus terlihat lebih dulu daripada
   "+ CALENDAR" yang cuma menyimpan pengingat. */
.ag-row .reg { background: var(--hud-accent); box-shadow: none; color: #fff; }

.ag-row .reg:hover { background: #7a68f0; color: #fff; }`;

export function reset() { agendaStamp = ''; }

// Panel ini milik template, dan kerangka kerjanya bisa merender ulang kapan
// saja — saat itu terjadi, isinya terhapus. Alih-alih menebak kapan, awasi
// wadahnya: begitu ia kosong padahal kita punya datanya, gambar lagi.
let lastState = null, watched = null, watcher = null;
function watch(host) {
  if (watched === host) return;
  watched = host;
  if (watcher) watcher.disconnect();
  watcher = new MutationObserver(() => {
    if (host.children.length === 0 && lastState) { agendaStamp = ''; paint(lastState); }
  });
  watcher.observe(host, { childList: true });
}

const DAY = 86400000;
let agendaStamp = '';
export const paint = st => {
  const host = document.querySelector('[data-agenda-list]');
  if (!host || !st || !st.list) return;
  lastState = st;
  watch(host);
  // Sisa kursi ikut cap.
  //
  // Tanpa itu, daftar yang sudah tergambar tidak pernah digambar ulang saat
  // ada orang lain mendaftar: id acaranya tidak berubah, jumlahnya tidak
  // berubah, dan capnya cocok — jadi `paint()` pulang lebih awal dan angka
  // kursinya membeku sampai halaman dimuat ulang.
  const stamp = st.list.map(a => a.id + ':' + (a.registration?.seatsTaken ?? '-')).join(',') +
    '|' + (st.next ? st.next.id : '-') + '|' + st.days;
  if (stamp === agendaStamp && host.children.length) return;
  agendaStamp = stamp;
  const now = Date.now();
  host.replaceChildren(...st.list.map(a => {
    const left = Math.ceil((a.at - now) / DAY);
    const isNext = !!(st.next && st.next.id === a.id);
    const cls = 'ag-row' + (isNext ? ' next' : '') + (a.at < now ? ' past' : '');
    const when = a.at < now ? 'DONE' : (left <= 0 ? 'TODAY' : left + ' DAYS AWAY');
    return el('div', { class: cls }, [
      el('div', { class: 'top' }, [
        el('span', { class: 'kind', text: a.kind }),
        el('span', { class: 'when', text: when })
      ]),
      judul,
      el('span', { class: 'where', text: tanggal(a.date) + ' · ' + a.place }),
      a.note ? el('span', { class: 'note', text: a.note }) : null,
      a.at < now ? null : el('button', { class: 'add', text: '+ CALENDAR', onclick: () => saveIcs(a) })
    ]);
  }));
};
