import InstitutionWorkspace from '@/components/institution/workspace/InstitutionWorkspace';
import VMPEOFeedbackDashboard from '@/components/institution/VMPEOFeedbackDashboard';

export default function FeedbackPage() {
  return (
    <InstitutionWorkspace
      activeStepKey="process-7"
      title="Vision, Mission and PEO feedback"
      subtitle="Configure timeline and review consolidated stakeholder feedback."
    >
      <VMPEOFeedbackDashboard />
    </InstitutionWorkspace>
  );
}
