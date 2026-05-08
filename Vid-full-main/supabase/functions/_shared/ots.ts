const OTS_CALENDAR_URLS = [
  'https://a.pool.opentimestamps.org',
  'https://b.pool.opentimestamps.org',
  'https://c.pool.opentimestamps.org',
];

export function isSha256Hash(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export async function submitHashToOTS(hashHex: string): Promise<Uint8Array> {
  const normalizedHash = hashHex.trim().toLowerCase();
  if (!isSha256Hash(normalizedHash)) {
    throw new Error('INVALID_SHA256_HASH');
  }

  const hashBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hashBytes[i] = parseInt(normalizedHash.slice(i * 2, i * 2 + 2), 16);
  }

  const header = new Uint8Array([
    0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00,
    0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94, 0x00,
  ]);
  const version = new Uint8Array([0x01]);
  const sha256Op = new Uint8Array([0x08]);
  const digestTag = new Uint8Array([0x20]);
  const calendarTag = new Uint8Array([0x83]);

  const errors: string[] = [];
  for (const calUrl of OTS_CALENDAR_URLS) {
    try {
      const response = await fetch(`${calUrl}/digest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: hashBytes,
      });

      if (!response.ok) {
        errors.push(`${calUrl}: HTTP ${response.status}`);
        continue;
      }

      const calBytes = new Uint8Array(await response.arrayBuffer());
      const calUrlBytes = new TextEncoder().encode(calUrl);
      const calUrlLen = new Uint8Array([calUrlBytes.length]);
      const otsFile = new Uint8Array(
        header.length + version.length + sha256Op.length + digestTag.length + hashBytes.length +
        calendarTag.length + calUrlLen.length + calUrlBytes.length + calBytes.length
      );

      let offset = 0;
      otsFile.set(header, offset); offset += header.length;
      otsFile.set(version, offset); offset += version.length;
      otsFile.set(sha256Op, offset); offset += sha256Op.length;
      otsFile.set(digestTag, offset); offset += digestTag.length;
      otsFile.set(hashBytes, offset); offset += hashBytes.length;
      otsFile.set(calendarTag, offset); offset += calendarTag.length;
      otsFile.set(calUrlLen, offset); offset += calUrlLen.length;
      otsFile.set(calUrlBytes, offset); offset += calUrlBytes.length;
      otsFile.set(calBytes, offset);

      return otsFile;
    } catch (err) {
      errors.push(`${calUrl}: ${err}`);
    }
  }

  throw new Error(`All OTS calendars failed: ${errors.join('; ')}`);
}
