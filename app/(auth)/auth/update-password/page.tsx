import { Suspense } from 'react';
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';

export const metadata = {
  title: 'Update Password',
  description: 'Set your new Bleep That Sh*t! account password.',
};

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="text-center">Loading...</div>}>
      <UpdatePasswordForm />
    </Suspense>
  );
}
