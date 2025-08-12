import { getLatestPrompt } from '@/lib/prompts';
import { listRecords } from '@/lib/records';
import ClientPage from './components/ClientPage';

export default async function Home() {
  // Server-side initial data fetch (fast, SEO-friendly, direct DB access)
  const [prompt, records] = await Promise.all([
    getLatestPrompt(),
    listRecords()
  ]);

  // Pass initial server data to client component
  return (
    <ClientPage
      initialPrompt={prompt}
      initialRecords={records}
    />
  );
}