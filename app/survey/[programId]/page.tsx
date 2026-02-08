import StakeholderSurvey from '../../../components/institution/StakeholderSurvey';

// @ts-ignore
export default function SurveyPage({ params }: { params: { programId: string } }) {
  return <StakeholderSurvey programId={params.programId} />;
}
