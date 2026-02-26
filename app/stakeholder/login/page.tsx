import { redirect } from 'next/navigation';

export default function StakeholderLoginPage() {
  redirect('/institution/login?type=stakeholder');
}
