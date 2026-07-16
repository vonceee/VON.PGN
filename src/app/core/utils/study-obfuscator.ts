const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const multiplier = 2654435761n;
const inverse = 244002641n;
const mask = 0xFFFFFFFFn;

export class StudyObfuscator {
  /**
   * Obfuscate a numeric ID to an unguessable string.
   */
  public static encode(id: number): string {
    let hashVal = (BigInt(id) * multiplier) & mask;
    const base = BigInt(alphabet.length);
    let encoded = '';
    while (hashVal > 0n) {
      const remainder = Number(hashVal % base);
      encoded = alphabet[remainder] + encoded;
      hashVal = hashVal / base;
    }
    return encoded || alphabet[0];
  }

  /**
   * Decode an obfuscated string back to its numeric ID.
   */
  public static decode(str: string): number {
    const base = BigInt(alphabet.length);
    let hashVal = 0n;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const pos = alphabet.indexOf(char);
      if (pos === -1) return 0;
      hashVal = hashVal * base + BigInt(pos);
    }
    const decoded = (hashVal * inverse) & mask;
    return Number(decoded);
  }
}
