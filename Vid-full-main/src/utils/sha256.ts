export async function calculateSHA256(input: File | string): Promise<string> {
  let buffer: ArrayBuffer;

  if (typeof input === 'string') {
    const encoder = new TextEncoder();
    buffer = encoder.encode(input).buffer;
  } else {
    buffer = await input.arrayBuffer();
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  console.log('Data processed locally. No data transmitted.');
  return hashHex;
}
