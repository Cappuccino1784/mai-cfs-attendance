const MEMBER_PHOTOS: Record<string, string> = {
  'Nhat Mai': '/pics/mai.png',
  'Bao Ngoc': '/pics/bngoc.png',
};

export function getMemberPhoto(name: string): string | undefined {
  return MEMBER_PHOTOS[name];
}
