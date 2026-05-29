import fs from 'fs';

async function test() {
  try {
    const res = await fetch('https://api.paxsenix.org/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] })
    });
    console.log('STATUS:', res.status);
    console.log('CONTENT-TYPE:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('BODY:', text.slice(0, 300));
  } catch (e) {
    console.error(e);
  }
}
test();
