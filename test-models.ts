async function test() {
  try {
    const res = await fetch('https://api.paxsenix.org/v1/models', {
      method: 'GET'
    });
    const data = await res.json();
    const claudeModels = data.data.filter((m: any) => m.id.includes('claude') || (m.name && m.name.toLowerCase().includes('claude')));
    console.log(claudeModels.map((m: any) => m.id).join('\\n'));
  } catch (e) {
    console.error(e);
  }
}
test();
