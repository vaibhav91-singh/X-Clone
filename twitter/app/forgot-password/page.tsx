import React from 'react';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { AuthProvider } from '@/context/AuthContext';

export default function ForgotPasswordPage() {
  return (
    <AuthProvider>
      <ForgotPasswordForm />
    </AuthProvider>
  );
}
