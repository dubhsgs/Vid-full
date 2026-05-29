const OTS_CALENDAR_URLS = [
  'https://a.pool.opentimestamps.org',
  'https://b.pool.opentimestamps.org',
  'https://c.pool.opentimestamps.org',
];

const OTS_HEADER = new Uint8Array([
  0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00,
  0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
]);

const OTS_MAJOR_VERSION = 1;
const OP_SHA256 = 0x08;
const OP_APPEND = 0xf0;
const OP_PREPEND = 0xf1;
const OP_REVERSE = 0xf2;
const OP_HEXLIFY = 0xf3;

const TAG_FORK = 0xff;
const TAG_ATTESTATION = 0x00;

const PENDING_ATTESTATION_TAG = '83dfe30d2ef90c8e';
const BITCOIN_ATTESTATION_TAG = '0588960d73d71901';

type OTSOp = {
  tag: number;
  arg?: Uint8Array;
  stamp: OTSTimestamp;
};

type OTSAttestation = {
  tagHex: string;
  payload: Uint8Array;
  uri?: string;
};

type OTSTimestamp = {
  msg: Uint8Array;
  attestations: OTSAttestation[];
  ops: OTSOp[];
};

type DetachedOTS = {
  hashBytes: Uint8Array;
  timestamp: OTSTimestamp;
  normalized: boolean;
};

type PendingStamp = {
  stamp: OTSTimestamp;
  uri: string;
};

class OTSReader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get position(): number {
    return this.offset;
  }

  readByte(): number {
    if (this.offset >= this.bytes.length) {
      throw new Error('OTS_TRUNCATED');
    }
    return this.bytes[this.offset++];
  }

  readBytes(length: number): Uint8Array {
    if (this.offset + length > this.bytes.length) {
      throw new Error('OTS_TRUNCATED');
    }
    const chunk = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return chunk;
  }

  readVaruint(): number {
    let value = 0;
    let shift = 0;

    for (let i = 0; i < 10; i++) {
      const byte = this.readByte();
      value |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) {
        return value;
      }
      shift += 7;
    }

    throw new Error('OTS_VARUINT_TOO_LONG');
  }

  readVarbytes(maxLength: number, minLength = 0): Uint8Array {
    const length = this.readVaruint();
    if (length > maxLength || length < minLength) {
      throw new Error('OTS_VARBYTES_LENGTH_INVALID');
    }
    return this.readBytes(length);
  }

  assertEof(): void {
    if (this.offset !== this.bytes.length) {
      throw new Error('OTS_TRAILING_GARBAGE');
    }
  }
}

class OTSWriter {
  private bytes: number[] = [];

  writeByte(value: number): void {
    this.bytes.push(value & 0xff);
  }

  writeBytes(value: Uint8Array): void {
    for (const byte of value) {
      this.writeByte(byte);
    }
  }

  writeVaruint(value: number): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('OTS_INVALID_VARUINT');
    }

    if (value === 0) {
      this.writeByte(0);
      return;
    }

    let remaining = value;
    while (remaining !== 0) {
      let byte = remaining & 0x7f;
      remaining >>= 7;
      if (remaining !== 0) {
        byte |= 0x80;
      }
      this.writeByte(byte);
    }
  }

  writeVarbytes(value: Uint8Array): void {
    this.writeVaruint(value.length);
    this.writeBytes(value);
  }

  output(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

export function isSha256Hash(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function sha256Bytes(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

function applyOp(opTag: number, msg: Uint8Array, arg?: Uint8Array): Uint8Array {
  switch (opTag) {
    case OP_SHA256:
      throw new Error('OTS_ASYNC_SHA256_REQUIRED');
    case OP_APPEND:
      if (!arg) throw new Error('OTS_APPEND_ARG_MISSING');
      return concatBytes(msg, arg);
    case OP_PREPEND:
      if (!arg) throw new Error('OTS_PREPEND_ARG_MISSING');
      return concatBytes(arg, msg);
    case OP_REVERSE:
      return new Uint8Array(Array.from(msg).reverse());
    case OP_HEXLIFY:
      return new TextEncoder().encode(bytesToHex(msg));
    default:
      throw new Error(`OTS_UNKNOWN_OP_${opTag.toString(16)}`);
  }
}

async function applyOpAsync(opTag: number, msg: Uint8Array, arg?: Uint8Array): Promise<Uint8Array> {
  if (opTag === OP_SHA256) {
    return sha256Bytes(msg);
  }
  return applyOp(opTag, msg, arg);
}

function readAttestation(reader: OTSReader): OTSAttestation {
  const tag = reader.readBytes(8);
  const payload = reader.readVarbytes(8192);
  const tagHex = bytesToHex(tag);

  if (tagHex === PENDING_ATTESTATION_TAG) {
    const payloadReader = new OTSReader(payload);
    const uriBytes = payloadReader.readVarbytes(1000);
    payloadReader.assertEof();
    return {
      tagHex,
      payload,
      uri: new TextDecoder('ascii').decode(uriBytes),
    };
  }

  return { tagHex, payload };
}

async function readTimestamp(reader: OTSReader, msg: Uint8Array): Promise<OTSTimestamp> {
  const timestamp: OTSTimestamp = { msg, attestations: [], ops: [] };

  async function readTagOrAttestation(tag: number): Promise<void> {
    if (tag === TAG_ATTESTATION) {
      timestamp.attestations.push(readAttestation(reader));
      return;
    }

    let arg: Uint8Array | undefined;
    if (tag === OP_APPEND || tag === OP_PREPEND) {
      arg = reader.readVarbytes(4096, 1);
    } else if (![OP_SHA256, OP_REVERSE, OP_HEXLIFY].includes(tag)) {
      throw new Error(`OTS_UNSUPPORTED_OP_${tag.toString(16)}`);
    }

    const result = await applyOpAsync(tag, msg, arg);
    const child = await readTimestamp(reader, result);
    timestamp.ops.push({ tag, arg, stamp: child });
  }

  let tag = reader.readByte();
  while (tag === TAG_FORK) {
    await readTagOrAttestation(reader.readByte());
    tag = reader.readByte();
  }
  await readTagOrAttestation(tag);

  return timestamp;
}

function writeAttestation(writer: OTSWriter, attestation: OTSAttestation): void {
  writer.writeBytes(hexToBytes(attestation.tagHex));
  writer.writeVarbytes(attestation.payload);
}

function writeTimestamp(writer: OTSWriter, timestamp: OTSTimestamp): void {
  const branches: (() => void)[] = [];

  for (const attestation of timestamp.attestations) {
    branches.push(() => {
      writer.writeByte(TAG_ATTESTATION);
      writeAttestation(writer, attestation);
    });
  }

  for (const op of timestamp.ops) {
    branches.push(() => {
      writer.writeByte(op.tag);
      if (op.tag === OP_APPEND || op.tag === OP_PREPEND) {
        if (!op.arg) throw new Error('OTS_BINARY_OP_ARG_MISSING');
        writer.writeVarbytes(op.arg);
      }
      writeTimestamp(writer, op.stamp);
    });
  }

  if (branches.length === 0) {
    throw new Error('OTS_EMPTY_TIMESTAMP');
  }

  for (let i = 0; i < branches.length; i++) {
    if (i < branches.length - 1) {
      writer.writeByte(TAG_FORK);
    }
    branches[i]();
  }
}

function serializeDetachedOTS(detached: DetachedOTS): Uint8Array {
  const writer = new OTSWriter();
  writer.writeBytes(OTS_HEADER);
  writer.writeVaruint(OTS_MAJOR_VERSION);
  writer.writeByte(OP_SHA256);
  writer.writeBytes(detached.hashBytes);
  writeTimestamp(writer, detached.timestamp);
  return writer.output();
}

async function parseStandardDetachedOTS(bytes: Uint8Array): Promise<DetachedOTS> {
  const reader = new OTSReader(bytes);
  const header = reader.readBytes(OTS_HEADER.length);
  if (!equalBytes(header, OTS_HEADER)) {
    throw new Error('OTS_BAD_HEADER');
  }

  const version = reader.readVaruint();
  if (version !== OTS_MAJOR_VERSION) {
    throw new Error(`OTS_UNSUPPORTED_VERSION_${version}`);
  }

  const hashOp = reader.readByte();
  if (hashOp !== OP_SHA256) {
    throw new Error('OTS_UNSUPPORTED_FILE_HASH_OP');
  }

  const hashBytes = reader.readBytes(32);
  const timestamp = await readTimestamp(reader, hashBytes);
  reader.assertEof();
  return { hashBytes, timestamp, normalized: false };
}

function tryNormalizeLegacyVAIDOTS(bytes: Uint8Array, expectedHashHex?: string): Uint8Array | null {
  const legacyHeader = concatBytes(OTS_HEADER, new Uint8Array([0x00]));
  if (bytes.length < legacyHeader.length + 1 + 1 + 1 + 32) return null;
  if (!equalBytes(bytes.slice(0, legacyHeader.length), legacyHeader)) return null;

  const offset = legacyHeader.length;
  if (bytes[offset] !== OTS_MAJOR_VERSION || bytes[offset + 1] !== OP_SHA256 || bytes[offset + 2] !== 0x20) return null;

  const hashBytes = bytes.slice(offset + 3, offset + 35);
  const expectedHashBytes = expectedHashHex ? hexToBytes(expectedHashHex.toLowerCase()) : null;
  if (expectedHashBytes && !equalBytes(hashBytes, expectedHashBytes)) {
    throw new Error('OTS_LEGACY_HASH_MISMATCH');
  }

  const calendarTagOffset = offset + 35;
  if (bytes[calendarTagOffset] !== 0x83) return null;

  const calendarUrlLength = bytes[calendarTagOffset + 1];
  const calendarResponseOffset = calendarTagOffset + 2 + calendarUrlLength;
  if (calendarResponseOffset >= bytes.length) return null;

  const calendarResponse = bytes.slice(calendarResponseOffset);
  return concatBytes(OTS_HEADER, new Uint8Array([OTS_MAJOR_VERSION, OP_SHA256]), hashBytes, calendarResponse);
}

export async function parseDetachedOTS(bytes: Uint8Array, expectedHashHex?: string): Promise<DetachedOTS> {
  try {
    return await parseStandardDetachedOTS(bytes);
  } catch (error) {
    const normalized = tryNormalizeLegacyVAIDOTS(bytes, expectedHashHex);
    if (!normalized) {
      throw error;
    }

    const detached = await parseStandardDetachedOTS(normalized);
    detached.normalized = true;
    return detached;
  }
}

function opKey(op: OTSOp): string {
  return `${op.tag}:${op.arg ? bytesToHex(op.arg) : ''}`;
}

function attestationKey(attestation: OTSAttestation): string {
  return `${attestation.tagHex}:${bytesToHex(attestation.payload)}`;
}

function mergeTimestamp(target: OTSTimestamp, source: OTSTimestamp): boolean {
  let changed = false;
  const existingAttestations = new Set(target.attestations.map(attestationKey));

  for (const attestation of source.attestations) {
    const key = attestationKey(attestation);
    if (!existingAttestations.has(key)) {
      target.attestations.push(attestation);
      existingAttestations.add(key);
      changed = true;
    }
  }

  const targetOps = new Map(target.ops.map((op) => [opKey(op), op]));
  for (const sourceOp of source.ops) {
    const key = opKey(sourceOp);
    const targetOp = targetOps.get(key);
    if (targetOp) {
      changed = mergeTimestamp(targetOp.stamp, sourceOp.stamp) || changed;
    } else {
      target.ops.push(sourceOp);
      targetOps.set(key, sourceOp);
      changed = true;
    }
  }

  return changed;
}

function collectPending(timestamp: OTSTimestamp, output: PendingStamp[] = []): PendingStamp[] {
  for (const attestation of timestamp.attestations) {
    if (attestation.tagHex === PENDING_ATTESTATION_TAG && attestation.uri) {
      output.push({ stamp: timestamp, uri: attestation.uri });
    }
  }

  for (const op of timestamp.ops) {
    collectPending(op.stamp, output);
  }

  return output;
}

function hasBitcoinAttestation(timestamp: OTSTimestamp): boolean {
  if (timestamp.attestations.some((attestation) => attestation.tagHex === BITCOIN_ATTESTATION_TAG)) {
    return true;
  }

  return timestamp.ops.some((op) => hasBitcoinAttestation(op.stamp));
}

async function fetchCalendarTimestamp(calendarUrl: string, commitment: Uint8Array): Promise<OTSTimestamp | null> {
  const response = await fetch(`${calendarUrl.replace(/\/$/, '')}/timestamp/${bytesToHex(commitment)}`, {
    method: 'GET',
    headers: { Accept: 'application/vnd.opentimestamps.v1' },
  });

  if (response.status === 404 || response.status === 409 || response.status === 425) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`OTS_CALENDAR_HTTP_${response.status}`);
  }

  const body = new Uint8Array(await response.arrayBuffer());
  const reader = new OTSReader(body);
  const timestamp = await readTimestamp(reader, commitment);
  reader.assertEof();
  return timestamp;
}

export async function upgradeDetachedOTS(
  otsBytes: Uint8Array,
  expectedHashHex?: string,
): Promise<{ confirmed: boolean; changed: boolean; upgradedBytes: Uint8Array }> {
  const detached = await parseDetachedOTS(otsBytes, expectedHashHex);
  let changed = detached.normalized;

  for (const pending of collectPending(detached.timestamp)) {
    try {
      const upgraded = await fetchCalendarTimestamp(pending.uri, pending.stamp.msg);
      if (upgraded) {
        changed = mergeTimestamp(pending.stamp, upgraded) || changed;
      }
    } catch (error) {
      console.error('[OTS] Calendar upgrade failed:', pending.uri, error);
    }
  }

  return {
    confirmed: hasBitcoinAttestation(detached.timestamp),
    changed,
    upgradedBytes: serializeDetachedOTS(detached),
  };
}

export async function submitHashToOTS(hashHex: string): Promise<Uint8Array> {
  const normalizedHash = hashHex.trim().toLowerCase();
  if (!isSha256Hash(normalizedHash)) {
    throw new Error('INVALID_SHA256_HASH');
  }

  const hashBytes = hexToBytes(normalizedHash);
  const errors: string[] = [];

  for (const calUrl of OTS_CALENDAR_URLS) {
    try {
      const response = await fetch(`${calUrl}/digest`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.opentimestamps.v1',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: hashBytes,
      });

      if (!response.ok) {
        errors.push(`${calUrl}: HTTP ${response.status}`);
        continue;
      }

      const timestampBytes = new Uint8Array(await response.arrayBuffer());
      return concatBytes(OTS_HEADER, new Uint8Array([OTS_MAJOR_VERSION, OP_SHA256]), hashBytes, timestampBytes);
    } catch (err) {
      errors.push(`${calUrl}: ${err}`);
    }
  }

  throw new Error(`All OTS calendars failed: ${errors.join('; ')}`);
}
