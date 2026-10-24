import type { Member } from '../types';
import { getMemberPhoto } from '../memberPhotos';

interface Props {
  member: Pick<Member, 'name' | 'emoji'>;
  className?: string;
}

export default function MemberAvatar({ member, className = 'h-7 w-7' }: Props) {
  const photo = getMemberPhoto(member.name);

  if (!photo) {
    return <span className={className}>{member.emoji}</span>;
  }

  return (
    <img
      src={photo}
      alt=""
      className={`rounded-full object-cover ${className}`}
      title={member.name}
    />
  );
}
