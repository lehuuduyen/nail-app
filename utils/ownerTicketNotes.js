/** Ghi chú owner ticket: `note · card:x · cash:y · ...` */

export function parseOwnerTicketNotes(notes) {
  const out = {
    noteStub: '',
    cardPaid: '0',
    cashPaid: '0',
    giftPaid: '0',
    checkPaid: '0',
    discounts: '0',
  };
  const s = String(notes || '').trim();
  if (!s) return out;
  const free = [];
  for (const part of s
    .split(' · ')
    .map((p) => p.trim())
    .filter(Boolean)) {
    const m = /^(card|cash|gift|check|disc):(.+)$/i.exec(part);
    if (m) {
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (key === 'card') out.cardPaid = val;
      else if (key === 'cash') out.cashPaid = val;
      else if (key === 'gift') out.giftPaid = val;
      else if (key === 'check') out.checkPaid = val;
      else if (key === 'disc') out.discounts = val;
    } else {
      free.push(part);
    }
  }
  out.noteStub = free.join(' · ');
  return out;
}

export function buildOwnerTicketNotes(noteStub, cardPaid, cashPaid, giftPaid, checkPaid, discounts) {
  return [
    noteStub || '',
    `card:${cardPaid}`,
    `cash:${cashPaid}`,
    `gift:${giftPaid}`,
    `check:${checkPaid}`,
    `disc:${discounts}`,
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 500);
}
