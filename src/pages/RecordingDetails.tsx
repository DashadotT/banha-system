import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { RecordingDetailsPanel } from '../components/recordings/RecordingDetailsPanel';

export default function RecordingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <AppLayout title="Recording Details">
      <button
        onClick={() => navigate('/recordings')}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-secondary-700 hover:text-primary"
      >
        <ArrowLeft size={15} />
        Back to Recordings
      </button>
      <RecordingDetailsPanel key={id} recordingId={id as string} />
    </AppLayout>
  );
}
