import { getLatestPrompt } from '@/lib/prompts';
import { listRecords } from '@/lib/records';
import RunForm from '@/app/components/RunForm';
import RecordsList from '@/app/components/RecordsList';

export default async function Home() {
  // Fetch initial data server-side (direct lib calls, not HTTP)
  const [prompt, records] = await Promise.all([
    getLatestPrompt(),
    listRecords()
  ]);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          LLM Records
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generate structured records using AI prompts
        </p>
      </header>

      <div className="space-y-8">
        {/* Current Prompt Display & Run Form */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Generate Records
          </h2>
          <RunForm 
            initialPromptText={prompt?.text ?? ''} 
            currentPromptText={prompt?.text ?? ''}
          />
        </section>

        {/* Records List */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Records {records.length > 0 && `(${records.length})`}
          </h2>
          <RecordsList initialRecords={records} />
        </section>
      </div>
    </main>
  );
}