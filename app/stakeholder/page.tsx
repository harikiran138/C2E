import { redirect } from 'next/navigation';

export default function StakeholderIndexPage() {
  redirect('/institution/login?type=stakeholder');
}
