import { DoctorsProvider } from '@/context/patient/DoctorsContext';
import { AppointmentsProvider } from '@/context/patient/AppointmentsContext';
import { ReviewsProvider } from '@/context/patient/ReviewsContext';
import Navbar from '@/components/patient/Navbar';
import WelcomeGuard from '@/components/ui/WelcomeGuard';
import AIAssistant from '@/components/patient/AIAssistant';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DoctorsProvider>
      <AppointmentsProvider>
        <ReviewsProvider>
          <Navbar />
          <main style={{ paddingTop: 'var(--navbar-height, 68px)' }}>{children}</main>
          <AIAssistant />
          <WelcomeGuard storageKey="patient_welcome" />
        </ReviewsProvider>
      </AppointmentsProvider>
    </DoctorsProvider>
  );
}
