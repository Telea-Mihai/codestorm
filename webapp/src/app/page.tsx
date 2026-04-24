
import SyllabusDiffClient from './components/SyllabusDiffClient';
import UsecaseToolkitClient from './components/UsecaseToolkitClient';

export default function Home() {
  return (
    <main className="page-frame">
      <SyllabusDiffClient />
      <UsecaseToolkitClient />
    </main>
  );
}
