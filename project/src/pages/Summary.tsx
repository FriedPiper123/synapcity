import { DailySummary } from '@/components/DailySummary';

const SummaryPage = () => {
  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Daily Summary</h1>
        <DailySummary />
      </div>
    </div>
  );
};

export default SummaryPage; 