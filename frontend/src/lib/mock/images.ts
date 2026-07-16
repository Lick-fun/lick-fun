/**
 * Maps mock token addresses → locally generated meme artwork.
 * Only used in MOCK_MODE (no live indexer / image API configured) so the
 * preview shows real-looking token art instead of initial placeholders.
 */
const MOCK_TOKEN_IMAGES: Record<string, string> = {
  "0x1111222233334444555566667777888899990000": "/tokens/lick3k.png",
  "0x3333444455556666777788889999aaaabbbbcccc": "/tokens/meme.png",
  "0x55556666777788889999aaaabbbbccccddddeeee": "/tokens/tongue.png",
  "0x777788889999aaaabbbbccccddddeeeeffff1111": "/tokens/dgliz.png",
  "0x9999aaaabbbbccccddddeeeeffff111122223333": "/tokens/bonkad.png",
  "0xbbbbccccddddeeeeffff11112222333344445555": "/tokens/puppy.png",
  "0xddddeeeeffff1111222233334444555566667777": "/tokens/lrock.png",
  "0xffff111122223333444455556666777788889999": "/tokens/chonad.png",
};

export function getMockTokenImage(address: string | null | undefined): string | null {
  if (!address) return null;
  return MOCK_TOKEN_IMAGES[address.toLowerCase()] ?? null;
}
