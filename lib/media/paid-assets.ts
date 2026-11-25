export function isStructurallyValidZip(bytes: Buffer) {
  if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  const start = Math.max(0, bytes.length - 65_557);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= start; index--)
    if (bytes.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  if (eocd < 0 || eocd + 22 + bytes.readUInt16LE(eocd + 20) !== bytes.length)
    return false;
  const entries = bytes.readUInt16LE(eocd + 10),
    size = bytes.readUInt32LE(eocd + 12),
    offset = bytes.readUInt32LE(eocd + 16);
  if (
    bytes.readUInt16LE(eocd + 4) ||
    bytes.readUInt16LE(eocd + 6) ||
    entries === 0xffff ||
    size === 0xffffffff ||
    offset === 0xffffffff ||
    offset + size > eocd
  )
    return false;
  if (!entries || entries !== bytes.readUInt16LE(eocd + 8)) return false;
  const end = offset + size;
  let position = offset;
  let hasFile = false;
  for (let index = 0; index < entries; index++) {
    if (position + 46 > end || bytes.readUInt32LE(position) !== 0x02014b50) return false;
    const nameLength = bytes.readUInt16LE(position + 28);
    const next = position + 46 + nameLength
      + bytes.readUInt16LE(position + 30) + bytes.readUInt16LE(position + 32);
    const local = bytes.readUInt32LE(position + 42);
    if (!nameLength || next > end || local + 30 > offset
      || bytes.readUInt32LE(local) !== 0x04034b50) return false;
    const dataStart = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    if (dataStart + bytes.readUInt32LE(position + 20) > offset) return false;
    const last = bytes[position + 45 + nameLength];
    const directory = last === 47 || last === 92 || Boolean(bytes.readUInt32LE(position + 38) & 0x10);
    if (!directory && bytes.readUInt32LE(position + 24) > 0) hasFile = true;
    position = next;
  }
  return hasFile && position === end;
}
